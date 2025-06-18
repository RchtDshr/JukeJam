const roomService = require('../../services/roomService.js');
const participantService = require('../../services/participantService.js');
const songService = require('../../services/songService.js');
const pubsub = require('../pubsub/pubsub.js');

async function getRoomIdByCode(roomCode) {
    const room = await roomService.getRoomByCode(roomCode);
    if (!room) {
        throw new Error("Invalid room code");
    }
    return room.id;
}

const resolvers = {
    // Nested resolvers:
    Room: {
        admin_id: (room) => participantService.getParticipantById(room.admin_id),
        current_song_id: (room) => songService.getSongById(room.current_song_id),
        members: async (room) => participantService.getParticipants(room.id)
    },

    Song: {
        room_id: (song) => roomService.getRoomById(song.room_id),
        added_by: (song) => participantService.getParticipantById(song.added_by)
    },

    Query: {
        getRooms: () => roomService.getRooms(),
        getRoom: (_, { roomCode }) => roomService.getRoomByCode(roomCode),
        getParticipants: async (_, { roomCode }) => {
            const roomId = await getRoomIdByCode(roomCode);
            return participantService.getParticipants(roomId);
        },
        getSongQueue: async (_, { roomCode }) => {
            const roomId = await getRoomIdByCode(roomCode);
            return songService.getSongQueue(roomId);
        },
    },
    Mutation: {
        createRoom: (_, { adminName }) => roomService.createRoom(adminName),
        joinRoom: (_, { roomCode, name }) => participantService.joinRoom(roomCode, name),  
        kickParticipant: async (_, { roomCode, participantId }) => {
            const roomId = await getRoomIdByCode(roomCode);
            return participantService.kickParticipant(roomId, participantId);
        },
        addSong: async (_, { roomCode, addedBy, youtubeUrl, title }) => {
            const roomId = await getRoomIdByCode(roomCode);
            return songService.addSong(roomId, addedBy, youtubeUrl, title);
        },
        setCurrentSong: async (_, { roomCode, songId }) => {
            const roomId = await getRoomIdByCode(roomCode);
            return roomService.setCurrentSong(roomId, songId);
        },
    },
    Subscription: {
        songQueueUpdated: {
            subscribe: async (_, { roomCode }) => {
                // You can similarly resolve roomId here if needed for Redis later
                return pubsub.asyncIterator('SONG_QUEUE_UPDATED');
            },
        },
        participantJoined: {
            subscribe: async (_, { roomCode }) => {
                return pubsub.asyncIterator('PARTICIPANT_JOINED');
            },
        },
        participantsUpdated: {
            subscribe: async (_, { roomCode }) => {
                return pubsub.asyncIterator('PARTICIPANTS_UPDATED');
            },
        },
        currentSongChanged: {
            subscribe: async (_, { roomCode }) => {
                return pubsub.asyncIterator('CURRENT_SONG_CHANGED');
            },
        }
    }
};

module.exports = resolvers;
