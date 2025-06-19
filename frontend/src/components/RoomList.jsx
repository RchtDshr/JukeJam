import React from "react";
import { useNavigate } from "react-router-dom";
import { JOIN_ROOM } from "../graphql/mutations";
import { useMutation } from '@apollo/client';

export default function RoomList({ rooms }) {
  const navigate = useNavigate();
  const [joinRoom] = useMutation(JOIN_ROOM);

const handleJoinRoom = async (roomCode) => {
    const name = prompt('Enter your name to join this room:');
    if (!name) return;

    try {
      const { data } = await joinRoom({
        variables: { roomCode, name },
      });
      
      console.log('Joined Room as: ', data.joinRoom);
      // You can also store participantId if you want later for advanced features
      navigate(`/room/${roomCode}`);
    } catch (error) {
      console.error('Error joining room:', error);
      alert('Failed to join room. Please try again.');
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {rooms.map(room => (
        <div key={room.id} className="bg-green-700 rounded-xl p-6 shadow-lg transition hover:scale-105">
          <h2 className="text-2xl font-semibold mb-2">{room.admin_id.name}'s Room</h2>
          <p className="text-sm">Room Code: <span className="font-mono">{room.room_code}</span></p>
          <p className="text-sm mt-2">Members: {room.members.length}</p>
          <button
            onClick={() => handleJoinRoom(room.room_code)}
            className="mt-4 bg-black text-green-400 py-2 px-4 rounded-lg hover:bg-green-900 transition"
          >
            Join Room
          </button>
        </div>
      ))}
    </div>
  );
}
