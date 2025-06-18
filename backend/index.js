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

// Build schema manually
const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

// Set up Express app
const app = express();
const httpServer = http.createServer(app);

// Create WebSocket server
const wsServer = new WebSocketServer({
  server: httpServer,
  path: '/graphql',
});

// Integrate graphql-ws
useServer({ schema, context: () => ({ pubsub }) }, wsServer);

// Create Apollo Server instance
const server = new ApolloServer({
  schema,
  context: () => ({ pubsub }),
  introspection: true,
  plugins: [{
    async serverWillStart() {
      return {
        async drainServer() {
          await wsServer.close();
        },
      };
    },
  }],
});

// Start Apollo Server
(async () => {
  await server.start();
  server.applyMiddleware({ app });

  const PORT = process.env.PORT || 4000;
  httpServer.listen(PORT, async () => {
    console.log(`🚀 Server ready at http://localhost:${PORT}`);
    console.log(`🚀 Subscriptions ready at ws://localhost:${PORT}${server.graphqlPath}`);

    // Test Redis connection
    await redis.set('project', 'collab-music');
    const redisVal = await redis.get('project');
    console.log('✅ Redis Connected! Value:', redisVal);

    // Test PostgreSQL connection
    const res = await pg.query('SELECT NOW()');
    console.log('✅ PostgreSQL Connected! Time:', res.rows[0].now);
  });
})();
