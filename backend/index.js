require('dotenv').config();
const pg = require('./db/postgres');
const redis = require('./db/redis');

async function testConnections() {
  try {
    console.log('🚀 Starting JukeJam Backend...');
    // Add this line anywhere
    console.log('🔥 Hot reload test - version 4!');

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