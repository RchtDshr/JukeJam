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
    admin_id: ID!
    current_song_id: ID
    created_at: String!
  }

  type Song {
    id: ID!
    room_id: ID!
    added_by: ID!
    youtube_url: String!
    title: String!
    added_at: String!
  }

  type Query {
    getRooms: [Room]
    getRoom(roomCode: String!): Room
    getParticipants(roomId: ID!): [Participant]
    getSongQueue(roomId: ID!): [Song]
  }

  type Mutation {
    createRoom(adminName: String!): Room
    joinRoom(roomCode: String!, name: String!): Participant
    addSong(roomId: ID!, addedBy: ID!, youtubeUrl: String!, title: String!): Song
    kickParticipant(roomId: ID!, participantId: ID!): Boolean
    setCurrentSong(roomId: ID!, songId: ID!): Boolean
  }

  type Subscription {
    songQueueUpdated(roomId: ID!): [Song]
    participantJoined(roomId: ID!): [Participant]
    participantsUpdated(roomId: ID!): [Participant]
    currentSongChanged(roomId: ID!): Song
  }
`;
module.exports = typeDefs;
