import React from 'react';
import { Link } from 'react-router-dom';

export default function RoomCard({ room }) {
  return (
    <div className="bg-green-900 rounded-lg p-4 shadow-md hover:scale-105 transition">
      <h3 className="text-xl font-semibold text-white">Room Code: {room.code}</h3>
      <p className="text-green-200">Admin: {room.adminName}</p>
      <Link to={`/room/${room.code}`}>
        <button className="mt-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
          Join Room
        </button>
      </Link>
    </div>
  );
}
