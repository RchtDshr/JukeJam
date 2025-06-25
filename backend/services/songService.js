const pool = require('../db/postgres.js');
const pubsub = require('../graphql/pubsub/pubsub.js');
const { v4: uuidv4 } = require('uuid');

async function addSong(roomId, addedBy, youtubeUrl, title) {
  const songId = uuidv4();

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

async function removeSong(roomId, songId) {
  try {
    // Check if the song exists in the room
    const result = await pool.query(
      `SELECT id FROM song_queue WHERE id = $1 AND room_id = $2`,
      [songId, roomId]
    );

    if (result.rowCount === 0) {
      return false; // Song not found in queue
    }

    // Delete the song from the queue
    await pool.query(`DELETE FROM song_queue WHERE id = $1`, [songId]);

    // Notify clients about the updated queue
    await notifySongQueueUpdated(roomId);

    return true;
  } catch (err) {
    console.error("Error in removeSong:", err);
    return false;
  }
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

async function setCurrentSong(roomId, songId) {
    // Update the current song for the room
    await pool.query(
        `UPDATE rooms SET current_song_id = $1 WHERE id = $2`,
        [songId, roomId]
    );

    // Notify clients via subscription
    const song = await getSongById(songId);
    const roomRes = await pool.query('SELECT room_code FROM rooms WHERE id = $1', [roomId]);
    const roomCode = roomRes.rows[0].room_code;

    pubsub.publish('CURRENT_SONG_CHANGED', {
        currentSongChanged: {
            roomCode,
            song
        }
    });

    return song;
}

async function notifySongQueueUpdated(roomId) {
  const queue = await getSongQueue(roomId);
  const roomRes = await pool.query('SELECT room_code FROM rooms WHERE id = $1', [roomId]);
  const roomCode = roomRes.rows[0].room_code;

  pubsub.publish('SONG_QUEUE_UPDATED', { 
    songQueueUpdated: { roomCode, queue } 
  });
}

module.exports = {
  addSong,
  removeSong,
  getSongQueue,
  getSongById,
  notifySongQueueUpdated,
  setCurrentSong
};