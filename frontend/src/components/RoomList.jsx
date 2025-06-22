import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from '@apollo/client';
import { JOIN_ROOM } from "../graphql/mutations";
import JoinRoomModal from "./JoinRoomModal";
import { toast, Toaster } from "react-hot-toast";

export default function RoomList({ rooms }) {
  const navigate = useNavigate();
  const [joinRoom] = useMutation(JOIN_ROOM);
  const [selectedRoom, setSelectedRoom] = useState(null);

  const handleJoinRoom = async (roomCode, name) => {
    try {
      const { data } = await joinRoom({ variables: { roomCode, name } });
      const participantId = data.joinRoom.id;
      localStorage.setItem("participantId", participantId);
      localStorage.setItem("roomCode", roomCode);
      toast.success("Joined Room Successfully!");
      navigate(`/room/${roomCode}`);
    } catch (error) {
      toast.error("Failed to join room.");
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Toaster />
        
        {rooms.map(room => {
          const storedRoomCode = localStorage.getItem("roomCode");
          const alreadyJoined = storedRoomCode === room.room_code;
          return (
            <div key={room.id} className="bg-[#1c1c1c] rounded-xl p-6 shadow-xl transition transform hover:scale-105 border border-green-500">
              <h2 className="text-2xl font-semibold text-green-300">{room.admin_id.name}'s Room</h2>
              <p className="mt-2 text-sm text-white">Code: <span className="font-mono">{room.room_code}</span></p>
              <p className="mt-1 text-sm text-white">Members: {room.members.length}</p>
              <button
                onClick={() => {
                  if (alreadyJoined) {
                    navigate(`/room/${room.room_code}`);
                  } else {
                    setSelectedRoom(room);
                  }
                }}
                className="mt-4 bg-green-400 text-black py-2 px-4 rounded-lg font-semibold hover:bg-green-300"
              >
                {alreadyJoined ? "Rejoin Room" : "Join Room"}
              </button>
            </div>
          );
        })}
      </div>

      {selectedRoom && (
        <JoinRoomModal 
          room={selectedRoom}
          onClose={() => setSelectedRoom(null)}
          onSubmit={handleJoinRoom}
        />
      )}
    </>
  );
}
