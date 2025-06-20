const { gql } = require('apollo-server');

const typeDefs = gql`
  type Participant {
    id: ID!
    name: String!
    created_at: String!
  }

  type Room {
    id: ID!
    room_code: String!
    admin_id: Participant!
    members: [Participant!]!
    current_song_id: Song
    created_at: String!
  }

  type Song {
    id: ID!
    room_id: Room!
    added_by: Participant!
    youtube_url: String!
    title: String!
    added_at: String!
  }

  type Query {
    getRooms: [Room]
    getRoom(roomCode: String!): Room
    getParticipants(roomCode: String!): [Participant]
    getSongQueue(roomCode: String!): [Song]
  }

  type LeaveRoomResponse {
    success: Boolean!
    message: String!
  }

  type Mutation {
    createRoom(adminName: String!): Room
    joinRoom(roomCode: String!, name: String!): Participant
    leaveRoom(roomCode: String!, participantId: ID!): LeaveRoomResponse!
    addSong(roomCode: String!, addedBy: ID!, youtubeUrl: String!, title: String!): Song
    kickParticipant(roomCode: String!, participantId: ID!): Boolean
    setCurrentSong(roomCode: String!, songId: ID!): Boolean
  }

  type Subscription {
    songQueueUpdated(roomCode: String!): [Song]
    participantJoined(roomCode: String!): Participant
    participantsUpdated(roomCode: String!): [Participant]
    currentSongChanged(roomCode: String!): Song
  }
`;

module.exports = typeDefs;