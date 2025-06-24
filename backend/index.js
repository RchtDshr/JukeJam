require('dotenv').config();
const pg = require('./db/postgres');
const redis = require('./db/redis');
const { ApolloServer } = require('apollo-server-express');
const express = require('express');
const http = require('http');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const { useServer } = require('graphql-ws/lib/use/ws');
const { WebSocketServer } = require('ws');
const typeDefs = require('./graphql/schema/typeDefs');
const resolvers = require('./graphql/resolvers/resolvers');
const pubsub = require('./graphql/pubsub/pubsub.js');

// Build GraphQL schema
const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

// --- GraphQL Server Setup ---
const app = express();
const httpServer = http.createServer(app);

// Create WebSocketServer for GraphQL subscriptions (port 4000)
const graphqlWsServer = new WebSocketServer({
  server: httpServer,
  path: '/graphql',
});
useServer({ schema, context: () => ({ pubsub }) }, graphqlWsServer);

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

// Start servers
(async () => {
  await server.start();
  server.applyMiddleware({ app });

  const PORT = process.env.PORT || 4000;
  httpServer.listen(PORT, async () => {
    console.log(`🚀 GraphQL Server ready at http://localhost:${PORT}`);
    console.log(`🚀 Subscriptions ready at ws://localhost:${PORT}/graphql`);

    // Redis Test
    await redis.set('project', 'collab-music');
    const redisVal = await redis.get('project');
    console.log('✅ Redis Connected! Value:', redisVal);

    // Postgres Test
    const res = await pg.query('SELECT NOW()');
    console.log('✅ PostgreSQL Connected! Time:', res.rows[0].now);
  });
})();
// --- Custom WebSocket Server on Port 3000 ---
const rawWSServer = new WebSocketServer({ port: 3000 });
console.log('🧪 Raw WebSocket server running on ws://localhost:3000');

// Keep track of connected clients
const clients = new Set();

rawWSServer.on('connection', socket => {
  console.log('🧠 [WS3000] New client connected');
  clients.add(socket);

  socket.on('message', msg => {
    console.log('💬 [WS3000] Received:', msg.toString());

    // Broadcast message to all other clients
    clients.forEach(client => {
      if (client !== socket && client.readyState === client.OPEN) {
        client.send(msg.toString());
      }
    });
  });

  socket.on('close', () => {
    console.log('🔌 [WS3000] Client disconnected');
    clients.delete(socket);
  });
});
