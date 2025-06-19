import React from 'react';
import { Routes, Route } from 'react-router-dom';
import HomePage from '../pages/HomePage';
import RoomPage from '../pages/RoomPage';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/room/:roomCode" element={<RoomPage />} />
    </Routes>
  );
}
