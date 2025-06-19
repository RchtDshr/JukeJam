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
