import React, { useState } from 'react';

export default function CreateRoomModal({ onCreate }) {
  const [adminName, setAdminName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!adminName.trim()) return alert('Please enter your name');
    onCreate(adminName);
    setAdminName('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-4">
      <input
        type="text"
        className="p-3 rounded-xl text-white w-64 shadow-2xl bg-green-600"
        placeholder="Enter your name"
        value={adminName}
        onChange={(e) => setAdminName(e.target.value)}
      />
      <button
        type="submit"
        className="bg-green-600 px-6 py-3 rounded-xl font-semibold hover:bg-green-800"
      >
        Create Room
      </button>
    </form>
  );
}
