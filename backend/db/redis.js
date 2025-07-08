require('dotenv').config();
const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL);

redis.on('connect', () => {
  console.log('✅ ioredis connected');
});

redis.on('error', (err) => {
  console.error('❌ ioredis error:', err);
});

module.exports = redis;
