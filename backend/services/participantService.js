const pool = require('../db/postgres.js');
const { v4: uuidv4 } = require('uuid');
const { getRoomByCode } = require('./roomService.js');
const pubsub = require('../graphql/pubsub/pubsub.js');


async function joinRoom(roomCode, name) {
    const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Find room by room code
    const roomResult = await client.query('SELECT id FROM rooms WHERE room_code = $1', [roomCode]);
    if (roomResult.rows.length === 0) {
      throw new Error('Room not found');
    }
    const roomId = roomResult.rows[0].id;

    // Create new participant
    const participantId = uuidv4();
    const participantResult = await client.query(
      'INSERT INTO participants (id, name) VALUES ($1, $2) RETURNING id, name, created_at',
      [participantId, name]
    );
    const participant = participantResult.rows[0];

    // Add to room_members
    await client.query(
        'INSERT INTO room_members (participant_id, room_id, role) VALUES ($1, $2, $3)',
        [participant.id, roomId, 'member']
    );
    pubsub.publish('PARTICIPANT_JOINED', { participantJoined: participant });
    await client.query('COMMIT');
    return participant;
} catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
      client.release();
  }
}


async function getParticipantById(participantId) {
    const result = await pool.query('SELECT id, name, created_at FROM participants WHERE id = $1', [participantId]);
    return result.rows[0];
}
async function kickParticipant(roomId, participantId) {
  await pool.query(
    'DELETE FROM room_members WHERE room_id = $1 AND participant_id = $2',
    [roomId, participantId]
  );
  await pool.query('DELETE FROM participants WHERE id = $1', [participantId]);

  await notifyParticipantsUpdated(roomId);
  return true;
}

async function getParticipants(roomId) {
  const res = await pool.query(
    `SELECT p.* FROM participants p 
     JOIN room_members rm ON p.id = rm.participant_id 
     WHERE rm.room_id = $1`,
    [roomId]
  );
  return res.rows;
}

async function notifyParticipantsUpdated(roomId) {
  const participants = await getParticipants(roomId);
  pubsub.publish('PARTICIPANTS_UPDATED', { participantsUpdated: participants });
}

module.exports = {
    joinRoom,
    kickParticipant,
    getParticipants,
    getParticipantById,
    notifyParticipantsUpdated
}