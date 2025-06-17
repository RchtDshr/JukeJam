const pool = require('../db/postgres.js');
const { v4: uuidv4 } = require('uuid');
const pubsub = require('../graphql/pubsub/pubsub.js');

async function addSong(roomId, addedBy, youtubeUrl, title) {
  const songId = uuidv4();
  await pool.query(
    `INSERT INTO songs (id, room_id, added_by, youtube_url, title) 
     VALUES ($1, $2, $3, $4, $5)`,
    [songId, roomId, addedBy, youtubeUrl, title]
  );

  await notifySongQueueUpdated(roomId);

  const res = await pool.query('SELECT * FROM songs WHERE id = $1', [songId]);
  return res.rows[0];
}

async function getSongQueue(roomId) {
  const res = await pool.query(
    `SELECT * FROM songs WHERE room_id = $1 ORDER BY added_at ASC`,
    [roomId]
  );
  return res.rows;
}

async function notifySongQueueUpdated(roomId) {
  const queue = await getSongQueue(roomId);
  pubsub.publish('SONG_QUEUE_UPDATED', { songQueueUpdated: queue });
}

module.exports = {
  addSong,
  getSongQueue,
  notifySongQueueUpdated
};