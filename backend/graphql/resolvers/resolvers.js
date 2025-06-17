const roomService = require('../../services/roomService.js');
const participantService = require('../../services/participantService.js');
const songService = require('../../services/songService.js');
const pubsub = require('../pubsub/pubsub.js');

const resolvers = {
    Query: {
        getRooms: () => roomService.getRooms(),
        getRoom: (_, { roomCode }) => roomService.getRoomByCode(roomCode),
        getParticipants: (_, { roomId }) => participantService.getParticipants(roomId),
        getSongQueue: (_, { roomId }) => songService.getSongQueue(roomId),
    },
    Mutation: {
        createRoom: (_, { adminName }) => roomService.createRoom(adminName),
        joinRoom: (_, { roomCode, name }) => participantService.joinRoom(roomCode, name),
        kickParticipant: (_, { roomId, participantId }) => participantService.kickParticipant(roomId, participantId),
        addSong: (_, { roomId, addedBy, youtubeUrl, title }) => songService.addSong(roomId, addedBy, youtubeUrl, title),
        setCurrentSong: (_, { roomId, songId }) => roomService.setCurrentSong(roomId, songId),
    },
    Subscription: {
        songQueueUpdated: {
            subscribe: (_, { roomId }) => pubsub.asyncIterator('SONG_QUEUE_UPDATED'),
        },
        participantJoined: {
            subscribe: (_, { roomId }) => pubsub.asyncIterator(['PARTICIPANT_JOINED'])
        },
        participantsUpdated: {
            subscribe: (_, { roomId }) => pubsub.asyncIterator('PARTICIPANTS_UPDATED'),
        },
        currentSongChanged: {
            subscribe: (_, { roomId }) => pubsub.asyncIterator('CURRENT_SONG_CHANGED'),
        }
    }
};

module.exports = resolvers;