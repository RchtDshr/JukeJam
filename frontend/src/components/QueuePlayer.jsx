import { useEffect, useState } from "react";
import YouTube from "react-youtube";
import { toast } from "react-hot-toast";
import { Play, Trash2, Users, Clock } from "lucide-react";
import { useLazyQuery, useMutation, useSubscription } from "@apollo/client";
import { REMOVE_SONG_FROM_QUEUE, SET_CURRENT_SONG } from "../graphql/mutations";
import { GET_CURRENT_SONG, GET_SONG_QUEUE } from "../graphql/queries";
import { CURRENT_SONG_CHANGED, SONG_QUEUE_UPDATED } from "../graphql/subscriptions";

const extractVideoId = (url) => {
  const urlObj = new URL(url);
  return urlObj.searchParams.get("v");
};

export default function QueuePlayer({roomAdminId}) {
  const roomCode = localStorage.getItem("roomCode");
  const [currentSong, setCurrentSong] = useState(null);
  const [songQueue, setSongQueue] = useState([]);

  const [getCurrentSong] = useLazyQuery(GET_CURRENT_SONG, {
    variables: { roomCode },
    fetchPolicy: "network-only",
    onCompleted: (data) => {
      if (data?.getCurrentSong) {
        setCurrentSong(data.getCurrentSong);
      }
    },
  });
  const participantId = localStorage.getItem("participantId");
  const isAdmin = participantId === roomAdminId;
 
  const [getQueue] = useLazyQuery(GET_SONG_QUEUE, {
    variables: { roomCode },
    fetchPolicy: "network-only",
    onCompleted: (data) => {
      if (data?.getSongQueue) {
        setSongQueue(data.getSongQueue);
      }
    },
  });

  const [removeSong] = useMutation(REMOVE_SONG_FROM_QUEUE);
  const [setCurrentSongMutation] = useMutation(SET_CURRENT_SONG);

  useSubscription(CURRENT_SONG_CHANGED, {
    variables: { roomCode },
    onData: ({ data }) => {
      const song = data.data?.currentSongChanged;
      if (song) setCurrentSong(song);
    },
  });

  useSubscription(SONG_QUEUE_UPDATED, {
    variables: { roomCode },
    onData: ({ data }) => {
      const updatedQueue = data.data?.songQueueUpdated;
      if (updatedQueue) setSongQueue(updatedQueue);
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
          variables: { roomCode, songId: nextSong.id },
        });
        await removeSong({
          variables: { roomCode, songId: currentSong.id },
        });
      } else {
        toast("Queue finished.");
      }
    } catch (err) {
      toast.error("Failed to go to next song.");
    }
  };

  const handlePlayNow = async (songId) => {
    try {
      await setCurrentSongMutation({ variables: { roomCode, songId } });
      toast.success("Now playing");
    } catch (err) {
      toast.error("Error playing song");
    }
  };

  const handleRemoveSong = async (songId) => {
    try {
      await removeSong({ variables: { roomCode, songId } });
      toast.success("Removed from queue");
    } catch (err) {
      toast.error("Error removing song");
    }
  };

  const playerOptions = {
    width: "100%",
    height: "400",
    playerVars: {
      autoplay: 1,
      rel: 0,
      modestbranding: 1,
      controls: isAdmin ? 1 : 0,
    },
  };

  return (
    <div className="space-y-8">
      {/* Now Playing */}
      <div>
        <h2 className="text-xl font-bold mb-4 text-green-400">Now Playing</h2>
        {currentSong ? (
          <>
            <YouTube
              key={currentSong.id}
              videoId={extractVideoId(currentSong.youtube_url)}
              opts={playerOptions}
              onEnd={handleVideoEnd}
            />
            <div className="mt-2 text-green-200">
              <h3 className="text-lg font-semibold">{currentSong.title}</h3>
              <p className="text-sm text-green-400">
                Added by {currentSong.added_by?.name || "Unknown"}
              </p>
            </div>
          </>
        ) : (
          <p className="text-green-300">No song playing</p>
        )}
      </div>

      {/* Mini Queue */}
      <div>
        <h3 className="text-lg font-bold text-green-400 mb-3">Queue</h3>
        <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
          {songQueue && songQueue.length > 0 ? (
            songQueue.map((song, index) => (
              <div
                key={song.id}
                className="group p-4 rounded-lg py-6 bg-zinc-800 border border-green-700 hover:border-green-500 transition-all"
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
                    onClick={() => handlePlayNow(song.id)}
                    className="flex-1 bg-green-700 hover:bg-green-800 text-white text-xs py-1.5 px-2 rounded-md flex items-center justify-center gap-1"
                  >
                    <Play size={10} />
                    Play
                  </button>
                  <button
                    onClick={() => handleRemoveSong(song.id)}
                    className="w-8 bg-red-700 hover:bg-red-800 text-white text-xs py-1.5 px-2 rounded-md flex items-center justify-center"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <Clock size={40} className="text-green-600 mx-auto mb-3" />
              <p className="text-green-400 text-sm">Queue is empty</p>
              <p className="text-green-500 text-xs">Add some songs to get started</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
