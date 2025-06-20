import { gql } from '@apollo/client';

export const PARTICIPANT_JOINED = gql`
  subscription participantJoined($roomCode: String!) {
    participantJoined(roomCode: $roomCode) {
      id
      name
      created_at
      
    }
  }
`;