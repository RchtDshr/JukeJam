const roomService = require('../../services/roomService.js');
const participantService = require('../../services/participantService.js');
const songService = require('../../services/songService.js');
const pubsub = require('../pubsub/pubsub.js');
const { withFilter } = require('graphql-subscriptions');

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
        leaveRoom: async (_, { roomCode, participantId }) => {
            const roomId = await getRoomIdByCode(roomCode);
            return participantService.leaveRoom(roomId, participantId);
        },
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
            subscribe: withFilter(
                () => pubsub.asyncIterator('SONG_QUEUE_UPDATED'),
                (payload, variables) => {
                    return payload.songQueueUpdated.roomCode === variables.roomCode;
                }
            ),
        },
        participantJoined: {
            subscribe: withFilter(
                () => pubsub.asyncIterator('PARTICIPANT_JOINED'),
                (payload, variables) => {
                    console.log('Filtering participant joined:', payload.participantJoined.roomCode, 'vs', variables.roomCode);
                    return payload.participantJoined.roomCode === variables.roomCode;
                }
            ),
        },
        participantLeft: {
            subscribe: withFilter(
                () => pubsub.asyncIterator('PARTICIPANT_LEFT'),
                (payload, variables) => {
                    console.log('Filtering participant left:', payload.participantLeft.roomCode, 'vs', variables.roomCode);
                    return payload.participantLeft.roomCode === variables.roomCode;
                }
            ),
        },
        participantsUpdated: {
            subscribe: withFilter(
                () => pubsub.asyncIterator('PARTICIPANTS_UPDATED'),
                (payload, variables) => {
                    return payload.participantsUpdated.roomCode === variables.roomCode;
                }
            ),
        },
        currentSongChanged: {
            subscribe: withFilter(
                () => pubsub.asyncIterator('CURRENT_SONG_CHANGED'),
                (payload, variables) => {
                    return payload.currentSongChanged.roomCode === variables.roomCode;
                }
            ),
        }
    }
};

module.exports = resolvers;
