// src/graphql/queries.js

import { gql } from '@apollo/client';

export const GET_ROOMS = gql`
  query GetRooms {
    getRooms {
      id
      room_code
      admin_id {
        id
        name
      }
      members {
        id
        name
      }
      created_at
    }
  }
`;

export const GET_ROOM = gql`
  query GetRoom($roomCode: String!) {
    getRoom(roomCode: $roomCode) {
      id
      room_code
      admin_id { id name }
      members { id name }
    }
  }
`;

export const GET_SONG_QUEUE = gql`
  query GetSongQueue($roomCode: String!) {
    getSongQueue(roomCode: $roomCode) {
      id
      youtube_url
      title
      added_by {
        id
        name
      }
      added_at
    }
  }
`;

export const GET_CURRENT_SONG = gql`
  query GetCurrentSong($roomCode: String!) {
    getCurrentSong(roomCode: $roomCode) {
      id
      youtube_url
      title
      added_by {
        name
      }
    }
  }
`;