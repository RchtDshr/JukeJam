require('dotenv').config();
const express = require('express');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const { ApolloServer } = require('apollo-server-express');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const { WebSocketServer, WebSocket } = require('ws');
const { useServer } = require('graphql-ws/lib/use/ws');
const Redis = require('ioredis');

const pg = require('./db/postgres');
const redis = require('./db/redis');
const pubsub = require('./graphql/pubsub/pubsub.js');
const typeDefs = require('./graphql/schema/typeDefs');
const resolvers = require('./graphql/resolvers/resolvers');

// --- Redis Constants ---
const PLAYBACK_CHANNEL = 'PLAYBACK_UPDATED';
const redisSub = new Redis(process.env.REDIS_URL || {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  retryStrategy: times => Math.min(times * 50, 2000),
});


// --- Build GraphQL Schema ---
const schema = makeExecutableSchema({ typeDefs, resolvers });
const app = express();

// --- CORS Configuration for Production ---
app.use((req, res, next) => {
  const allowedOrigins = [
    'http://localhost:5173',
    process.env.FRONTEND_URL, // Will be set to your Render frontend URL
  ].filter(Boolean);
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const httpServer = http.createServer(app);

// --- WebSocket Server for GraphQL Subscriptions ---
const graphqlWsServer = new WebSocketServer({
  noServer: true
});

const graphqlWsServerCleanup = useServer({ schema, context: () => ({ pubsub }) }, graphqlWsServer);

// --- Apollo Server Setup ---
const server = new ApolloServer({
  schema,
  context: () => ({ pubsub }),
  introspection: true,
  cors: {
    origin: [
      'http://localhost:5173',
      process.env.FRONTEND_URL
    ].filter(Boolean),
    credentials: true
  },
  plugins: [{
    async serverWillStart() {
      return {
        async drainServer() {
          graphqlWsServerCleanup.dispose();
        },
      };
    },
  }],
});

// --- Additional WebSocket Server for Sync (raw WS) ---
const syncWSS = new WebSocketServer({ 
  noServer: true
});
console.log('🎵 Sync WebSocket server created');

// Handle WebSocket upgrade manually for both paths
httpServer.on('upgrade', (request, socket, head) => {
  try {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    
    console.log('🔄 WebSocket upgrade request for:', pathname);
    
    if (pathname === '/graphql') {
      graphqlWsServer.handleUpgrade(request, socket, head, (ws) => {
        graphqlWsServer.emit('connection', ws, request);
        console.log('✅ GraphQL WebSocket connection established');
      });
    } else if (pathname === '/sync') {
      syncWSS.handleUpgrade(request, socket, head, (ws) => {
        syncWSS.emit('connection', ws, request);
        console.log('✅ Sync WebSocket connection established');
      });
    } else {
      console.log('⚠️ Unknown WebSocket path:', pathname);
      socket.destroy();
    }
  } catch (error) {
    console.error('❌ WebSocket upgrade error:', error);
    socket.destroy();
  }
});

// Map to track connected sync clients and their metadata
const syncClients = new Map(); // socket -> { roomCode, userId }

syncWSS.on('connection', socket => {
  console.log('🧠 [SYNC WS] Client connected');

  socket.on('message', async msg => {
    try {
      const parsed = JSON.parse(msg.toString());

      switch (parsed.type) {
        case 'JOIN_ROOM': {
          const { roomCode, userId } = parsed;
          syncClients.set(socket, { roomCode, userId });

          await redis.sadd(`room:${roomCode}:participants`, userId);
          console.log(`👥 User ${userId} joined room ${roomCode}`);

          await redisSub.subscribe(PLAYBACK_CHANNEL);
          break;
        }

        case 'PLAYBACK_UPDATE': {
          const { roomCode, action, currentTime } = parsed;

          const payload = JSON.stringify({
            type: 'PLAYBACK_UPDATE',
            roomCode,
            data: {
              action,
              currentTime,
              timestamp: Date.now(),
            },
          });

          await redis.publish(PLAYBACK_CHANNEL, payload);
          console.log(`🎬 Playback: "${action}" at ${currentTime}s in ${roomCode}`);
          break;
        }

        default:
          console.warn('⚠️ Unknown message type:', parsed.type);
      }
    } catch (err) {
      console.error('❌ Invalid message on sync socket:', err);
    }
  });

  socket.on('close', async () => {
    const meta = syncClients.get(socket);
    if (meta) {
      const { roomCode, userId } = meta;
      await redis.srem(`room:${roomCode}:participants`, userId);
      syncClients.delete(socket);
      console.log(`🔌 Disconnected user ${userId} from room ${roomCode}`);
    }
  });
});

// --- Redis Subscriber to broadcast playback sync updates to all clients in the room ---
redisSub.on('message', (channel, message) => {
  if (channel !== PLAYBACK_CHANNEL) return;

  try {
    const parsed = JSON.parse(message);
    const { roomCode } = parsed;

    for (const [client, meta] of syncClients.entries()) {
      if (
        client.readyState === WebSocket.OPEN &&
        meta.roomCode === roomCode
      ) {
        client.send(JSON.stringify(parsed));
      }
    }
  } catch (err) {
    console.error('❌ Redis message parse error:', err);
  }
});

// --- Database Initialization ---
async function initializeDatabase() {
  try {
    console.log('🔄 Checking database tables...');
    
    // Check if tables exist
    const tableCheck = await pg.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'participants'
    `);
    
    if (tableCheck.rows.length === 0) {
      console.log('📋 Tables not found. Initializing database schema...');
      const fs = require('fs');
      const path = require('path');
      const initSQL = fs.readFileSync(path.join(__dirname, 'db', 'init.sql'), 'utf8');
      
      await pg.query(initSQL);
      console.log('✅ Database schema initialized successfully!');
    } else {
      console.log('✅ Database tables already exist');
    }
  } catch (error) {
    console.error('❌ Database initialization error:', error.message);
    // Don't crash the app, just log the error
  }
}

// --- Start Everything ---
(async () => {
  await server.start();
  server.applyMiddleware({ app });

  const PORT = process.env.PORT || 4000;
  httpServer.listen(PORT, async () => {
    console.log(`🚀 GraphQL: http://localhost:${PORT}${server.graphqlPath}`);
    console.log(`🚀 Subscriptions: ws://localhost:${PORT}/graphql`);

    // Initialize database schema if needed
    await initializeDatabase();

    // Redis + Postgres test
    await redis.set('project', 'collab-music');
    const redisVal = await redis.get('project');
    console.log('✅ Redis Connected:', redisVal);

    const res = await pg.query('SELECT NOW()');
    console.log('✅ PostgreSQL Connected:', res.rows[0].now);
  });
})();
