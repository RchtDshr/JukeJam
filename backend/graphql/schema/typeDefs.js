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
    getParticipants(roomCode: ID!): [Participant]
    getSongQueue(roomCode: ID!): [Song]
  }

  type LeaveRoomResponse {
  success: Boolean!
  message: String!
  }

  type Mutation {
    createRoom(adminName: String!): Room
    joinRoom(roomCode: String!, name: String!): Participant
    leaveRoom(roomCode: ID!, participantId: ID!): LeaveRoomResponse!
    addSong(roomCode: ID!, addedBy: ID!, youtubeUrl: String!, title: String!): Song
    kickParticipant(roomCode: ID!, participantId: ID!): Boolean
    setCurrentSong(roomCode: ID!, songId: ID!): Boolean
  }

  type Subscription {
    songQueueUpdated(roomCode: ID!): [Song]
    participantJoined(roomCode: ID!): [Participant]
    participantsUpdated(roomCode: ID!): [Participant]
    currentSongChanged(roomCode: ID!): Song
  }
`;
module.exports = typeDefs;
