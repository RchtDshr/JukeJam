import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@apollo/client";
import { toast, Toaster } from "react-hot-toast";
import {
  Music,
  LogOut,
  Home,
} from "lucide-react";

import { GET_ROOM } from "../graphql/queries";
import { LEAVE_ROOM } from "../graphql/mutations";
import QueuePlayer from "../components/QueuePlayer";
import SidePanel from "./SidePanel";

export default function RoomPage() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const participantId = localStorage.getItem("participantId");

  const { loading, error, data, refetch } = useQuery(GET_ROOM, {
    variables: { roomCode },
  });

  const [leaveRoom] = useMutation(LEAVE_ROOM);
  const [participants, setParticipants] = useState([]);

  useEffect(() => {
    if (data?.getRoom?.members) {
      console.log("🔵 Room members from GET_ROOM:", data.getRoom.members);
      console.log("🔍 Current user in room members:", data.getRoom.members.some(m => m.id === participantId));
      setParticipants(data.getRoom.members);
    }
  }, [data, participantId]);

  // Refetch room data after a short delay to ensure we're included
  useEffect(() => {
    if (data?.getRoom && participantId) {
      const currentUserInRoom = data.getRoom.members.some(m => m.id === participantId);
      if (!currentUserInRoom) {
        console.log("⚠️ Current user not in room members, refetching...");
        // Refetch after a short delay to allow backend to process
        setTimeout(() => {
          refetch();
        }, 1000);
      }
    }
  }, [data, participantId, refetch]);

  const handleLeave = async () => {
    try {
      await leaveRoom({ variables: { roomCode, participantId } });
      localStorage.removeItem("participantId");
      localStorage.removeItem("roomCode");
      toast.success("Left room");
      navigate("/", { state: { refreshRooms: true } });
    } catch (err) {
      toast.error("Error leaving room");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white">
        <Music className="animate-spin text-green-400" size={40} />
        <p className="ml-4">Loading room...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-red-400">
        <p>Error: {error.message}</p>
      </div>
    );
  }

  const room = data.getRoom;

  return (
    <div className="min-h-screen bg-black/90 text-green-200">
      <Toaster />

      {/* Header */}
      <div className="border-b border-green-800 bg-zinc-900">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-700 rounded-xl flex items-center justify-center">
                <Music className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  {room.admin_id.name}'s Room
                </h1>
                <div className="flex items-center gap-2 text-green-400">
                  <Home size={16} />
                  <span className="text-sm">Room Code:</span>
                  <span className="font-mono bg-zinc-800 px-2 py-1 rounded text-sm text-green-300 border border-green-600">
                    {room.room_code}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleLeave}
              className="bg-red-700 hover:bg-red-800 text-white px-6 py-3 rounded-md font-semibold transition-all duration-200 flex items-center gap-2"
            >
              <LogOut size={18} />
              Leave Room
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid lg:grid-cols-5 gap-6">
          {/* Queue Column */}
          <div className="lg:col-span-3">
            <QueuePlayer roomAdminId={room.admin_id.id}/>
          </div>

          {/* Side Panel */}
          <div className="lg:col-span-2">
            <SidePanel
              roomCode={roomCode}
              participantId={participantId}
              participants={participants}
              setParticipants={setParticipants}
              roomAdminId={room.admin_id.id}
              initialParticipants={room.members}
            />
          </div>
        </div>
      </div>
    </div>
  );
}