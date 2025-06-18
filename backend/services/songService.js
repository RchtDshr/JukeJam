const pool = require('../db/postgres.js');
const pubsub = require('../graphql/pubsub/pubsub.js');
const { nanoid } = require('nanoid');


async function addSong(roomId, addedBy, youtubeUrl, title) {
  const songId = nanoid(10);

  // Insert the song into song_queue table
  await pool.query(
    `INSERT INTO song_queue (id, room_id, added_by, youtube_url, title) 
     VALUES ($1, $2, $3, $4, $5)`,
    [songId, roomId, addedBy, youtubeUrl, title]
  );

  // Check if current_song_id is null for the room
  const roomRes = await pool.query(
    `SELECT current_song_id FROM rooms WHERE id = $1`,
    [roomId]
  );

  const currentSongId = roomRes.rows[0]?.current_song_id;

  // If current_song_id is null, set it to this song
  if (!currentSongId) {
    await pool.query(
      `UPDATE rooms SET current_song_id = $1 WHERE id = $2`,
      [songId, roomId]
    );
  }

  await notifySongQueueUpdated(roomId);

  // Return inserted song row
  const res = await pool.query('SELECT * FROM song_queue WHERE id = $1', [songId]);
  return res.rows[0];
}

async function getSongQueue(roomId) {
    const res = await pool.query(
        `SELECT * FROM song_queue WHERE room_id = $1 ORDER BY added_at ASC`,
        [roomId]
    );
    return res.rows;
}

async function getSongById(songId) {
    const result = await pool.query('SELECT id, room_id, youtube_url, title, added_by, added_at FROM song_queue WHERE id = $1', [songId]);
    return result.rows[0];
}

async function notifySongQueueUpdated(roomId) {
  const queue = await getSongQueue(roomId);
  pubsub.publish('SONG_QUEUE_UPDATED', { songQueueUpdated: queue });
}

module.exports = {
  addSong,
  getSongQueue,
  getSongById,
  notifySongQueueUpdated
};