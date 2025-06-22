// src/graphql/mutations.js

import { gql } from '@apollo/client';

export const CREATE_ROOM = gql`
  mutation CreateRoom($adminName: String!) {
    createRoom(adminName: $adminName) {
      id
      room_code
      admin_id { id name }
      members { id name }
      created_at
    }
  }
`;

export const JOIN_ROOM = gql`
mutation JoinRoom($roomCode: String!, $name: String!) {
  joinRoom(roomCode: $roomCode, name: $name) {
    name
    id
  }
}`

export const LEAVE_ROOM = gql`
  mutation LeaveRoom($roomCode: String!, $participantId: ID!) {
    leaveRoom(roomCode: $roomCode, participantId: $participantId) {
      id
      name
    }
  }
`;