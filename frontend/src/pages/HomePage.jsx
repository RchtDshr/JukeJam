import React from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { useNavigate } from "react-router-dom";
import { GET_ROOMS } from '../graphql/queries';
import { CREATE_ROOM } from '../graphql/mutations';
import RoomList from '../components/RoomList';
import CreateRoomModal from '../components/CreateRoomModal';

export default function HomePage() {
  const { loading, error, data, refetch } = useQuery(GET_ROOMS);
  const [createRoom] = useMutation(CREATE_ROOM);
  const navigate = useNavigate();
  const handleCreateRoom = async (adminName) => {
    try {
      const res = await createRoom({
        variables: { adminName }
      });

      const roomCode = res.data.createRoom.room_code;
      alert(`Room created successfully! Room Code: ${res.data.createRoom.room_code}`);
      // Store participantId locally
      localStorage.setItem("participantId", res.data.createRoom.admin_id.id);
      localStorage.setItem("roomCode", roomCode);

      // Navigate directly into the newly created room
      navigate(`/room/${roomCode}`);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <p className="text-white">Loading...</p>;
  if (error) return <p className="text-red-500">Error: {error.message}</p>;

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-4xl font-bold mb-8 text-green-500">Available Rooms</h1>
      <CreateRoomModal onCreate={handleCreateRoom} />
      <div className="mt-8">
        <RoomList rooms={data.getRooms} />
      </div>
    </div>
  );
}
