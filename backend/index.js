require('dotenv').config();
const pg = require('./db/postgres');
const redis = require('./db/redis');
const { ApolloServer } = require('apollo-server');
const typeDefs = require('./graphql/schema/typeDefs');
const resolvers = require('./graphql/resolvers/resolvers');

const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: true,
  playground: true,
});

server.listen().then(async ({ url }) => {
  console.log(`🚀 Server ready at ${url}`);
  
    // Test Redis connection
    await redis.set('project', 'collab-music');
    const redisVal = await redis.get('project');
    console.log('✅ Redis Connected! Value:', redisVal);
    
    // Test PostgreSQL connection
    const res = await pg.query('SELECT NOW()');
    console.log('✅ PostgreSQL Connected! Time:', res.rows[0].now);
});