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

export const PARTICIPANT_LEFT = gql`
  subscription ParticipantLeft($roomCode: String!) {
    participantLeft(roomCode: $roomCode) {
      id
      name
    }
  }
`;

export const PARTICIPANTS_UPDATED = gql`
  subscription ParticipantsUpdated($roomCode: String!) {
    participantsUpdated(roomCode: $roomCode) {
      id
      name
    }
  }
`;