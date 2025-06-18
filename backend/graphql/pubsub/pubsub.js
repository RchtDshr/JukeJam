const Redis = require('ioredis');
const { RedisPubSub } = require('graphql-redis-subscriptions');

const options = {
  host: process.env.REDIS_HOST || 'redis',
  port: process.env.REDIS_PORT || 6379,
  retryStrategy: times => Math.min(times * 50, 2000),
};

const publisher = new Redis(options);
const subscriber = new Redis(options);

const pubsub = new RedisPubSub({
  publisher,
  subscriber,
});

module.exports = pubsub;
