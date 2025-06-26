import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@apollo/client";
import { toast, Toaster } from "react-hot-toast";
import {
  Music,
  Users,
  Clock,
  Search,
  X,
  LogOut,
  Home,
} from "lucide-react";

import { GET_ROOM } from "../graphql/queries";
import { LEAVE_ROOM } from "../graphql/mutations";
import Queue from "../components/Queue";
import Participants from "../components/Participants";
import YouTubeSearch from "../components/YoutubeSearch";

export default function RoomPage() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("queue");
  const [showSearch, setShowSearch] = useState(false);
  const participantId = localStorage.getItem("participantId");

  const { loading, error, data } = useQuery(GET_ROOM, {
    variables: { roomCode },
  });

  const [leaveRoom] = useMutation(LEAVE_ROOM);

  const [participants, setParticipants] = useState([]);

  useEffect(() => {
    if (data?.getRoom?.members) {
      setParticipants(data.getRoom.members);
    }
  }, [data]);

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
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Queue Column */}
          <div className="lg:col-span-2">
            <Queue />
          </div>

          {/* Side Panel */}
          <div className="lg:col-span-1">
            <div className="bg-zinc-900 border border-green-800 rounded-xl overflow-hidden">
              {/* Tabs */}
              <div className="flex border-b border-green-800">
                <button
                  onClick={() => setActiveTab("queue")}
                  className={`flex-1 px-6 py-4 font-semibold flex items-center justify-center gap-2 ${
                    activeTab === "queue"
                      ? "bg-zinc-800 text-green-300 border-b-2 border-green-500"
                      : "hover:bg-zinc-800 text-green-400"
                  }`}
                >
                  <Clock size={18} />
                  Add Songs
                </button>
                <button
                  onClick={() => setActiveTab("participants")}
                  className={`flex-1 px-6 py-4 font-semibold flex items-center justify-center gap-2 ${
                    activeTab === "participants"
                      ? "bg-zinc-800 text-green-300 border-b-2 border-green-500"
                      : "hover:bg-zinc-800 text-green-400"
                  }`}
                >
                  <Users size={18} />
                  People ({participants?.length || 0})
                </button>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === "queue" && (
                  <div className="space-y-4">
                    <button
                      onClick={() => setShowSearch(!showSearch)}
                      className="w-full bg-green-700 hover:bg-green-800 text-white py-3 px-4 rounded-md font-semibold flex items-center justify-center gap-2"
                    >
                      {showSearch ? <X size={18} /> : <Search size={18} />}
                      {showSearch ? "Close Search" : "Add Songs"}
                    </button>

                    {showSearch && (
                      <div className="bg-zinc-800 border border-green-700 rounded-md p-4">
                        <YouTubeSearch
                          roomCode={roomCode}
                          onSongAdded={() => {
                            setShowSearch(false);
                            toast.success("Song added to queue!");
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "participants" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white">
                        Room Members
                      </h3>
                      <span className="bg-zinc-800 text-green-300 px-3 py-1 rounded-full text-sm border border-green-600">
                        {participants?.length || 0} online
                      </span>
                    </div>
                    <Participants
                      roomCode={roomCode}
                      participantId={participantId}
                      initialParticipants={room.members}
                      participants={participants}
                      setParticipants={setParticipants}
                      roomAdminId={room.admin_id.id}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
