import React, { useEffect } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { useLocation, useNavigate } from "react-router-dom";
import { GET_ROOMS } from "../graphql/queries";
import { CREATE_ROOM } from "../graphql/mutations";
import RoomList from "../components/RoomList";
import CreateRoomModal from "../components/CreateRoomModal";
import { Toaster, toast } from "react-hot-toast";
import { FaMusic } from "react-icons/fa";

export default function HomePage() {
  const { loading, error, data, refetch } = useQuery(GET_ROOMS);
  const [createRoom] = useMutation(CREATE_ROOM);
  const navigate = useNavigate();

  const location = useLocation();

  useEffect(() => {
    if (location.state?.refreshRooms) {
      refetch();
    }
  }, [location, refetch]);
  const handleCreateRoom = async (adminName) => {
    try {
      const res = await createRoom({
        variables: { adminName },
        update: (cache, { data: { createRoom } }) => {
          const existingRooms = cache.readQuery({ query: GET_ROOMS });
          cache.writeQuery({
            query: GET_ROOMS,
            data: { getRooms: [...existingRooms.getRooms, createRoom] },
          });
        },
      });

      const roomCode = res.data.createRoom.room_code;
      localStorage.setItem("participantId", res.data.createRoom.admin_id.id);
      localStorage.setItem("roomCode", roomCode);
      toast.success("Room created successfully!");
      navigate(`/room/${roomCode}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to create room.");
    }
  };

  if (loading) return <p className="text-white">Loading...</p>;
  if (error) return <p className="text-red-500">Error: {error.message}</p>;

  return (
    <div className="min-h-screen bg-[#121212] text-white p-8">
      <Toaster />
      {/* <Test/> */}
      <div className="flex flex-col items-center mb-12">
        <div className="flex items-center gap-3 mb-4">
          <FaMusic className="text-green-500 text-4xl" />
          <h1 className="text-5xl font-bold text-green-400">JukeJam</h1>
        </div>
        <h2 className="text-3xl mb-6">Create a New Room</h2>
        <CreateRoomModal onCreate={handleCreateRoom} />
      </div>

      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4 text-green-500">
          Available Rooms
        </h2>
        <RoomList rooms={data.getRooms} />
      </div>
    </div>
  );
}
