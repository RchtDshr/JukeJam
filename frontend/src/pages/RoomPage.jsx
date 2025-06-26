import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useSubscription, useMutation } from "@apollo/client";
import { GET_ROOM, GET_SONG_QUEUE } from "../graphql/queries";
import {
  CURRENT_SONG_CHANGED,
  SONG_QUEUE_UPDATED,
} from "../graphql/subscriptions";
import {
  LEAVE_ROOM,
  REMOVE_SONG_FROM_QUEUE,
  SET_CURRENT_SONG,
} from "../graphql/mutations";
import { toast, Toaster } from "react-hot-toast";
import {
  Music,
  Users,
  Clock,
  Search,
  X,
  Play,
  Trash2,
  LogOut,
  Home,
} from "lucide-react";
import YouTubeSearch from "../components/YoutubeSearch";
import Queue from "../components/Queue";
import Participants from "../components/Participants";

export default function RoomPage() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("queue");
  const [showSearch, setShowSearch] = useState(false);

  const {
    loading: roomLoading,
    error: roomError,
    data: roomData,
  } = useQuery(GET_ROOM, { variables: { roomCode } });

  const {
    loading: queueLoading,
    data: queueData,
    refetch,
  } = useQuery(GET_SONG_QUEUE, { variables: { roomCode } });

  const { data: subscriptionData } = useSubscription(SONG_QUEUE_UPDATED, {
    variables: { roomCode },
  });
const [songQueue, setSongQueue] = useState([]);
useEffect(() => {
  if (queueData?.getSongQueue) {
    setSongQueue(queueData.getSongQueue);
  }
}, [queueData]);

  const [leaveRoom] = useMutation(LEAVE_ROOM);
  const participantId = localStorage.getItem("participantId");

  const [currentSong, setCurrentSongState] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [removeSongMutation] = useMutation(REMOVE_SONG_FROM_QUEUE);
  const [setCurrentSongMutation] = useMutation(SET_CURRENT_SONG);

  useSubscription(CURRENT_SONG_CHANGED, {
    variables: { roomCode },
    onData: ({ data }) => {
      const song = data.data?.currentSongChanged;
      console.log("🎵 Subscription fired. New current song:", song);
      if (song) {
        setCurrentSongState(song);
      }
    },
  });
  const handleRemoveSong = async (songId) => {
    try {
      await removeSongMutation({
        variables: { roomCode, songId },
      });
      toast.success("Song removed from queue");
    } catch (err) {
      console.error(err);
      toast.error("Failed to remove song");
    }
  };

  const handlePlayNow = async (songId) => {
    try {
      await setCurrentSongMutation({
        variables: {
          roomCode,
          songId,
        },
      });
      toast.success("Playing song now for everyone!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to play song");
    }
  };

  // Initialize participants from room data
  useEffect(() => {
    if (roomData?.getRoom?.members) {
      setParticipants(roomData.getRoom.members);
    }
  }, [roomData]);

  useEffect(() => {
    if (subscriptionData) {
      refetch();
    }
  }, [subscriptionData, refetch]);

  const handleLeave = async () => {
    try {
      await leaveRoom({ variables: { roomCode, participantId } });
      localStorage.removeItem("participantId");
      localStorage.removeItem("roomCode");
      toast.success("Left room");
      navigate("/", { state: { refreshRooms: true } });
    } catch (err) {
      console.error(err);
      toast.error("Error leaving room");
    }
  };

  if (roomLoading || queueLoading)
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <Music
            className="text-emerald-400 animate-spin mx-auto mb-4"
            size={48}
          />
          <p className="text-white text-lg">Loading room...</p>
        </div>
      </div>
    );

  if (roomError)
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-lg">Error: {roomError.message}</p>
        </div>
      </div>
    );

  const room = roomData.getRoom;
  // const songQueue = queueData.getSongQueue;

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
          {/* Left Panel */}
          <div className="lg:col-span-2">
            <Queue songQueue={songQueue} />
          </div>

          {/* Right Panel */}
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
                  Queue ({songQueue?.length || 0})
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
                    {/* Search Toggle */}
                    <button
                      onClick={() => setShowSearch(!showSearch)}
                      className="w-full bg-green-700 hover:bg-green-800 text-white py-3 px-4 rounded-md font-semibold flex items-center justify-center gap-2"
                    >
                      {showSearch ? <X size={18} /> : <Search size={18} />}
                      {showSearch ? "Close Search" : "Add Songs"}
                    </button>

                    {/* Search Box */}
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

                    {/* Mini Queue */}
                    <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
                      {songQueue && songQueue.length > 0 ? (
                        songQueue.map((song, index) => (
                          <div
                            key={song.id}
                            className="group p-3 rounded-md bg-zinc-800 border border-green-700 hover:border-green-500 transition-all"
                          >
                            <div className="mb-2 flex items-start gap-2">
                              {/* Queue Number */}
                              <div className="min-w-[24px] h-[24px] bg-green-600 text-white text-xs rounded-full flex items-center justify-center font-bold mt-1">
                                {index + 1}
                              </div>

                              {/* Song Info */}
                              <div className="flex-1">
                                <h4 className="font-medium text-sm text-white mb-1 line-clamp-2">
                                  {song.title}
                                </h4>
                                <p className="text-xs text-green-400 flex items-center">
                                  <Users size={10} className="mr-1" />
                                  {song.added_by?.name || "Unknown"}
                                </p>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-1">
                              <button
                                onClick={() => handlePlayNow?.(song.id)}
                                className="flex-1 bg-green-700 hover:bg-green-800 text-white text-xs py-1.5 px-2 rounded-md flex items-center justify-center gap-1"
                              >
                                <Play size={10} />
                                Play
                              </button>
                              <button
                                onClick={() => handleRemoveSong?.(song.id)}
                                className="w-8 bg-red-700 hover:bg-red-800 text-white text-xs py-1.5 px-2 rounded-md flex items-center justify-center"
                              >
                                <Trash2 size={10} />
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <Clock
                            size={40}
                            className="text-green-600 mx-auto mb-3"
                          />
                          <p className="text-green-400 text-sm">
                            Queue is empty
                          </p>
                          <p className="text-green-500 text-xs">
                            Add some songs to get started
                          </p>
                        </div>
                      )}
                    </div>
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

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(22, 163, 74, 0.6); /* Tailwind green-600 */
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(22, 163, 74, 0.8);
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}
