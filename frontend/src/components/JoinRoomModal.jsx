import React, { useState } from "react";

export default function JoinRoomModal({ onClose, onSubmit, room }) {
  const [name, setName] = useState('');

  const handleJoin = () => {
    if (!name.trim()) return alert("Please enter your name");
    onSubmit(room.room_code, name);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black-10 bg-opacity-50 backdrop-blur-sm transition-opacity duration-300">
      <div className="bg-[#1a1a1a] p-8 rounded-xl shadow-lg w-[400px] text-white transform transition-transform duration-300 scale-100">
        <h2 className="text-2xl font-bold mb-4 text-green-400">Join Room</h2>
        <p className="mb-2">Room: <span className="font-semibold">{room.admin_id.name}'s Room</span></p>
        <p className="mb-4">Code: <span className="font-mono text-green-300">{room.room_code}</span></p>

        <input
          type="text"
          placeholder="Enter your name"
          className="p-3 w-full rounded-lg bg-green-700 text-white mb-4"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <div className="flex justify-end gap-3">
          <button 
            onClick={onClose} 
            className="px-4 py-2 bg-gray-600 rounded hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleJoin} 
            className="px-4 py-2 bg-green-500 rounded hover:bg-green-700 transition-colors"
          >
            Join
          </button>
        </div>
      </div>
    </div>
  );
}
