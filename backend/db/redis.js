require('dotenv').config();
const { createClient } = require('redis');

const redis = createClient({
  url: process.env.REDIS_URL
});
redis.on('connect', () => console.log('✅ Redis connected'));
redis.on('error', (err) => console.error('❌ Redis error:', err));

(async () => {
  await redis.connect();
})();

module.exports = redis;
