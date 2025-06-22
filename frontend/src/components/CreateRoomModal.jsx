import React, { useState } from 'react';

export default function CreateRoomModal({ onCreate }) {
  const [adminName, setAdminName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!adminName.trim()) return;
    onCreate(adminName);
    setAdminName('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-4">
      <input
        type="text"
        className="p-3 rounded-lg w-64 bg-[#1c1c1c] text-white shadow-lg border border-green-500"
        placeholder="Enter your name"
        value={adminName}
        onChange={(e) => setAdminName(e.target.value)}
      />
      <button type="submit" className="bg-green-400 px-6 py-3 rounded-lg font-semibold hover:bg-green-300 text-black">
        Create Room
      </button>
    </form>
  );
}
