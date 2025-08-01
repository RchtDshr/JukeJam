const pool = require('../db/postgres.js');
const pubsub = require('../graphql/pubsub/pubsub.js');
const { v4: uuidv4 } = require('uuid');

function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function createRoom(adminName) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const adminId = uuidv4();
    await client.query(
      'INSERT INTO participants (id, name) VALUES ($1, $2)',
      [adminId, adminName]
    );

    let roomCode;
    while (true) {
      roomCode = generateRoomCode();
      const res = await client.query('SELECT * FROM rooms WHERE room_code = $1', [roomCode]);
      if (res.rowCount === 0) break;
    }

    const roomId = uuidv4();
    await client.query(
      'INSERT INTO rooms (id, room_code, admin_id) VALUES ($1, $2, $3)',
      [roomId, roomCode, adminId]
    );

    await client.query(
      'INSERT INTO room_members (participant_id, room_id, role) VALUES ($1, $2, $3)',
      [adminId, roomId, 'admin']
    );

    await client.query('COMMIT');

    return { id: roomId, room_code: roomCode, admin_id: adminId, created_at: new Date().toISOString() };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function getRooms() {
  const res = await pool.query('SELECT * FROM rooms');
  // console.log('getRooms res:', res.rows);
  return res.rows;
}

async function getRoomByCode(roomCode) {
  const res = await pool.query('SELECT * FROM rooms WHERE room_code = $1', [roomCode]);
//   console.log('getRoomByCode res:', res.rows);
  return res.rows[0];
}

async function getRoomById(roomId) {
  const res = await pool.query('SELECT * FROM rooms WHERE id = $1', [roomId]);
  return res.rows[0];
}

module.exports = {
    createRoom,
    getRooms,
    getRoomById,
    getRoomByCode,
    
}