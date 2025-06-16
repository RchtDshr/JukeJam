require('dotenv').config();
const pg = require('./db/postgres');
const redis = require('./db/redis');

async function testConnections() {
  try {
    console.log('🚀 Starting JukeJam Backend...');
    // Add this line anywhere
    console.log('🔥 Hot reload test - version 4!');
    console.log('Environment:', {
      PG_HOST: process.env.PG_HOST,
      PG_DB: process.env.PG_DB,
      PG_USER: process.env.PG_USER,
      PG_PORT: process.env.PG_PORT,
      REDIS_URL: process.env.REDIS_URL
    });

    // Test Redis connection
    await redis.set('project', 'collab-music');
    const redisVal = await redis.get('project');
    console.log('✅ Redis Connected! Value:', redisVal);

    // Test PostgreSQL connection
    const res = await pg.query('SELECT NOW()');
    console.log('✅ PostgreSQL Connected! Time:', res.rows[0].now);
    
    console.log('🎵 JukeJam Backend is ready!');
    
  } catch (err) {
    console.error('❌ Connection error:', err.message);
    console.error('Error details:', err);
    process.exit(1); // Exit if connections fail
  }
}

testConnections();

// Keep the process running (add your actual server code here)
process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down gracefully...');
  await redis.disconnect();
  pg.pool.end();
  process.exit(0);
});