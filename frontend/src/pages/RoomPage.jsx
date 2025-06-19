import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { GET_ROOM } from '../graphql/queries';

export default function RoomPage() {
  const { roomCode } = useParams();
  const { loading, error, data } = useQuery(GET_ROOM, { variables: { roomCode } });

  if (loading) return <p className="text-white">Loading room...</p>;
  if (error) return <p className="text-red-500">Error: {error.message}</p>;

  const room = data.getRoom;

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-3xl font-bold text-green-500 mb-4">{room.admin_id.name}'s Room</h1>
      <p>Room Code: <span className="font-mono">{room.room_code}</span></p>

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-2">Participants</h2>
        <ul className="list-disc list-inside">
          {room.members.map(member => (
            <li key={member.id}>{member.name}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
