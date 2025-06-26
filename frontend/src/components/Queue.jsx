import { useEffect, useState } from "react";
import YouTube from "react-youtube";
import { useMutation, useLazyQuery, useSubscription } from "@apollo/client";
import { toast } from "react-hot-toast";
import { Play, Trash2, Music, Users, Clock } from "lucide-react";
import { REMOVE_SONG_FROM_QUEUE, SET_CURRENT_SONG } from "../graphql/mutations";
import { GET_CURRENT_SONG, GET_SONG_QUEUE } from "../graphql/queries";
import {
  CURRENT_SONG_CHANGED,
  SONG_QUEUE_UPDATED,
} from "../graphql/subscriptions";

const extractVideoId = (url) => {
  const urlObj = new URL(url);
  return urlObj.searchParams.get("v");
};

export default function Queue() {
  const roomCode = localStorage.getItem("roomCode");
  const [currentSong, setCurrentSongState] = useState(null);
  const [songQueue, setSongQueue] = useState([]);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  
  const [getCurrentSong] = useLazyQuery(GET_CURRENT_SONG, {
    variables: { roomCode },
    fetchPolicy: "network-only",
    onCompleted: (data) => {
      if (data?.getCurrentSong) {
        console.log("🎵 Current song fetched:", data.getCurrentSong);
        setCurrentSongState(data.getCurrentSong);
      }
    },
  });

  const [getQueue] = useLazyQuery(GET_SONG_QUEUE, {
    variables: { roomCode },
    fetchPolicy: "network-only",
    onCompleted: (data) => {
      if (data?.getSongQueue) {
        setSongQueue(data.getSongQueue);
      }
    },
  });

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

  useSubscription(SONG_QUEUE_UPDATED, {
    variables: { roomCode },
    onData: ({ data }) => {
      const updatedQueue = data.data?.songQueueUpdated;
      console.log("📡 songQueueUpdated fired:", updatedQueue);
      if (updatedQueue) {
        setSongQueue(updatedQueue);
      }
    },
  });

  useEffect(() => {
    getCurrentSong();
    getQueue();
  }, []);

  const handleVideoEnd = async () => {
    if (!currentSong) return;

    try {
      const currentIndex = songQueue.findIndex((s) => s.id === currentSong.id);
      const nextSong = songQueue[currentIndex + 1];

      if (nextSong) {
        await setCurrentSongMutation({
          variables: {
            roomCode,
            songId: nextSong.id,
          },
        });

        await removeSongMutation({
          variables: {
            roomCode,
            songId: currentSong.id,
          },
        });

        getQueue();
      } else {
        toast("Queue finished.");
      }
    } catch (error) {
      console.error("Error in handleVideoEnd:", error.message);
      toast.error("Failed to move to next song.");
    }
  };

  const playerOptions = {
    width: "100%",
    height: "400",
    playerVars: {
      autoplay: 1,
      rel: 0,
      modestbranding: 1,
    },
  };

  return (
    <div className="min-h-screen  p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center justify-center gap-3">
            <Music className="text-green-400" size={40} />
            Music Queue
          </h1>
          <p className="text-green-200">Room: {roomCode}</p>
        </div>

        <div className="">
          {/* YouTube Player Section */}
          <div className="">
            <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-6 border border-green-500/20">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <h2 className="text-xl font-bold text-white">Now Playing</h2>
              </div>
              
              {currentSong ? (
                <div>
                  <div className="rounded-xl overflow-hidden shadow-2xl mb-4">
                    <YouTube
                      key={currentSong.id}
                      videoId={extractVideoId(currentSong.youtube_url)}
                      opts={playerOptions}
                      onEnd={handleVideoEnd}
                      onReady={() => setIsPlayerReady(true)}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="bg-gradient-to-r from-green-600/20 to-pink-600/20 rounded-xl p-4 border border-green-400/30">
                    <h3 className="text-lg font-semibold text-white mb-2">{currentSong.title}</h3>
                    <div className="flex items-center text-green-200 text-sm">
                      <Users size={16} className="mr-1" />
                      Added by {currentSong.added_by?.name || "Unknown"}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-20">
                  <Music size={64} className="text-green-400/50 mx-auto mb-4" />
                  <p className="text-green-200 text-lg">No song playing</p>
                  <p className="text-green-300/70 text-sm">Add songs to get the party started!</p>
                </div>
              )}
            </div>
          </div>

          </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(147, 51, 234, 0.5);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(147, 51, 234, 0.7);
        }
      `}</style>
    </div>
  );
}