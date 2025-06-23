const pool = require('../db/postgres.js');
const { v4: uuidv4 } = require('uuid');
const pubsub = require('../graphql/pubsub/pubsub.js');

async function joinRoom(roomId, name) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Find room by room code
    const roomResult = await client.query('SELECT room_code FROM rooms WHERE id = $1', [roomId]);
    if (roomResult.rows.length === 0) {
      throw new Error('Room not found');
    }
    const roomCode = roomResult.rows[0].room_code;
    
    // Create new participant
    const participantId = uuidv4();

    const participantResult = await client.query(
      'INSERT INTO participants (id, name) VALUES ($1, $2) RETURNING id, name, created_at',
      [participantId, name]
    );
    const participant = participantResult.rows[0];

    // Add to room_members
    const roomMemberResult = await client.query(
      'INSERT INTO room_members (participant_id, room_id, role) VALUES ($1, $2, $3)',
      [participant.id, roomId, 'member']
    );

    // Publish the event with proper payload structure
    const payload = {
      participantJoined: {
        id: participant.id,
        name: participant.name,
        created_at: participant.created_at,
        roomCode: roomCode
      }
    };

    console.log("🔍 Publishing PARTICIPANT_JOINED event:", payload);

    // Publish the event
    await pubsub.publish('PARTICIPANT_JOINED', payload);

    await notifyParticipantsUpdated(roomId, client);

    await client.query('COMMIT');

    return participant;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('🔥 Error in joinRoom:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function leaveRoom(roomId, participantId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Find room by room code
    const roomResult = await client.query('SELECT room_code FROM rooms WHERE id = $1', [roomId]);
    if (roomResult.rows.length === 0) {
      throw new Error('Room not found');
    }
    const roomCode = roomResult.rows[0].room_code;

    // 2️⃣ Get participant details before deleting
    const participantRes = await client.query(
      'SELECT id, name FROM participants WHERE id = $1',
      [participantId]
    );
    if (participantRes.rows.length === 0) {
      await client.query('ROLLBACK');
      throw new Error("Participant not found");
    }
    const participant = participantRes.rows[0];

    // 3️⃣ Get role before deleting
    const memberRes = await client.query(
      'SELECT role FROM room_members WHERE room_id = $1 AND participant_id = $2',
      [roomId, participantId]
    );
    if (memberRes.rows.length === 0) {
      await client.query('ROLLBACK');
      throw new Error("Participant not in room");
    }
    const wasAdmin = memberRes.rows[0].role === 'admin';

    // 4️⃣ Delete participant from room
    console.log("🔍 Deleting from room_members...");
    const deleteResult = await client.query(
      'DELETE FROM room_members WHERE room_id = $1 AND participant_id = $2',
      [roomId, participantId]
    );

    // ALSO DELETE FROM PARTICIPANTS TABLE
    console.log("🔍 Deleting from participants table...");
    const deleteParticipantResult = await client.query(
      'DELETE FROM participants WHERE id = $1',
      [participantId]
    );

    // 5️⃣ Check if room is now empty
    const countRes = await client.query(
      'SELECT COUNT(*) FROM room_members WHERE room_id = $1',
      [roomId]
    );
    const remainingCount = parseInt(countRes.rows[0].count);

    if (remainingCount === 0) {
      // Room is empty: cleanup
      await client.query('DELETE FROM song_queue WHERE room_id = $1', [roomId]);
      await client.query('DELETE FROM rooms WHERE id = $1', [roomId]);
    } else if (wasAdmin) {
      // Admin left: reassign admin
      const newAdminRes = await client.query(
        'SELECT participant_id FROM room_members WHERE room_id = $1 LIMIT 1',
        [roomId]
      );
      const newAdminId = newAdminRes.rows[0].participant_id;

      await client.query(
        'UPDATE room_members SET role = $1 WHERE participant_id = $2',
        ['admin', newAdminId]
      );

      await client.query(
        'UPDATE rooms SET admin_id = $1 WHERE id = $2',
        [newAdminId, roomId]
      );
    }

    // ✅ Publish participantLeft event
    pubsub.publish('PARTICIPANT_LEFT', {
      participantLeft: {
        id: participant.id,
        name: participant.name,
        roomCode: roomCode
      }
    });

    await notifyParticipantsUpdated(roomId, client);

    await client.query('COMMIT');

    //  Now directly return the participant who left
    return participant

  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Transaction error:", err);
    throw new Error("Failed to leave room");
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


async function notifyParticipantsUpdated(roomId, client = null) {
  try {

    // Use the passed client (same transaction) or get a new connection
    const dbClient = client || await pool.connect();

    try {
      // Get all participants in the room
      const participantsResult = await dbClient.query(`
                SELECT p.*
                FROM participants p
                JOIN room_members rm ON p.id = rm.participant_id
                WHERE rm.room_id = $1
            `, [roomId]);

      const participants = participantsResult.rows;

      // Get room code for filtering
      const roomResult = await dbClient.query('SELECT room_code FROM rooms WHERE id = $1', [roomId]);
      const roomCode = roomResult.rows[0]?.room_code;

      // Publish with structure that matches frontend expectations
      const payload = {
        participantsUpdated: participants, 
        roomCode: roomCode 
      };

      console.log('🔍 Publishing PARTICIPANTS_UPDATED with payload:', payload);

      await pubsub.publish('PARTICIPANTS_UPDATED', payload);

    } finally {
      // Only release if we created a new connection
      if (!client && dbClient) {
        dbClient.release();
      }
    }
  } catch (error) {
    console.error('❌ Error in notifyParticipantsUpdated:', error);
    throw error;
  }
}
module.exports = {
  joinRoom,
  leaveRoom,
  kickParticipant,
  getParticipants,
  getParticipantById,
  notifyParticipantsUpdated
}