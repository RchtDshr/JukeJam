// sync.js

require('dotenv').config();
const WebSocket = require('ws');
const redis = require('./db/redis'); // 👈 Use your shared Redis instance

const PLAYBACK_CHANNEL = 'PLAYBACK_UPDATED';

// In-memory map to track connected clients
const clients = new Map(); // Map<WebSocket, { roomCode, userId }>

// Redis Subscriber (for listening to playback updates)
const Redis = require('ioredis');
const redisSub = new Redis(process.env.REDIS_URL || {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  retryStrategy: times => Math.min(times * 50, 2000),
});

// Setup WebSocket Server
const rawWSServer = new WebSocket.Server({ port: 3000 });
console.log('🧪 Real-time Sync Server running on ws://localhost:3000');

rawWSServer.on('connection', socket => {
  console.log('🧠 [WS3000] Client connected');

  socket.on('message', async message => {
    try {
      const parsed = JSON.parse(message.toString());

      // Handle user joining a room
      if (parsed.type === 'JOIN_ROOM') {
        const { roomCode, userId } = parsed;

        // Save connection info in memory
        clients.set(socket, { roomCode, userId });

        // Save participant in Redis set
        await redis.sadd(`room:${roomCode}:users`, userId);
        console.log(`👥 User ${userId} joined room ${roomCode}`);

        // Ensure subscriber is subscribed
        await redisSub.subscribe(PLAYBACK_CHANNEL);
      }

      // Handle playback updates from host
      if (parsed.type === 'PLAYBACK_UPDATE') {
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

        // Publish the update to Redis
        await redis.publish(PLAYBACK_CHANNEL, payload);
        console.log(`🎬 Host emitted "${action}" at ${currentTime}s for room ${roomCode}`);
      }

    } catch (err) {
      console.error('❌ Invalid message received over WS:', err);
    }
  });

  socket.on('close', async () => {
    const meta = clients.get(socket);
    if (meta) {
      const { roomCode, userId } = meta;
      await redis.srem(`room:${roomCode}:users`, userId);
      console.log(`🔌 User ${userId} disconnected from room ${roomCode}`);
      clients.delete(socket);
    }
  });
});

// Redis Subscriber to broadcast playback to relevant sockets
redisSub.on('message', (channel, message) => {
  if (channel !== PLAYBACK_CHANNEL) return;

  try {
    const parsed = JSON.parse(message);
    const { roomCode } = parsed;

    // Send to all users in the same room
    for (const [client, meta] of clients.entries()) {
      if (
        client.readyState === WebSocket.OPEN &&
        meta.roomCode === roomCode
      ) {
        client.send(JSON.stringify(parsed));
      }
    }
  } catch (err) {
    console.error('❌ Failed to parse playback message from Redis:', err);
  }
});
