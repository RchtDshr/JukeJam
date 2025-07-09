require('dotenv').config();
const express = require('express');
const http = require('http');
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
const httpServer = http.createServer(app);

// --- WebSocket Server for GraphQL Subscriptions ---
const graphqlWsServer = new WebSocketServer({
  server: httpServer,
  path: '/graphql',
});
useServer({ schema, context: () => ({ pubsub }) }, graphqlWsServer);

// --- Apollo Server Setup ---
const server = new ApolloServer({
  schema,
  context: () => ({ pubsub }),
  introspection: true,
  plugins: [{
    async serverWillStart() {
      return {
        async drainServer() {
          await graphqlWsServer.close();
        },
      };
    },
  }],
});
// --- Additional WebSocket Server for Sync (raw WS) ---
const syncWSS = new WebSocketServer({ port: 3000 }); // Could optionally use the same port with path routing
console.log('🎵 Sync Server running on ws://localhost:3000');

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

// --- Start Everything ---
(async () => {
  await server.start();
  server.applyMiddleware({ app });

  const PORT = process.env.PORT || 4000;
  httpServer.listen(PORT, async () => {
    console.log(`🚀 GraphQL: http://localhost:${PORT}${server.graphqlPath}`);
    console.log(`🚀 Subscriptions: ws://localhost:${PORT}/graphql`);

    // Redis + Postgres test
    await redis.set('project', 'collab-music');
    const redisVal = await redis.get('project');
    console.log('✅ Redis Connected:', redisVal);

    const res = await pg.query('SELECT NOW()');
    console.log('✅ PostgreSQL Connected:', res.rows[0].now);
  });
})();
