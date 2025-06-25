import { useEffect, useState } from "react";
import YouTube from "react-youtube";
import { useMutation, useLazyQuery, useSubscription } from "@apollo/client";
import { toast } from "react-hot-toast";
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

  // ✅ Add this to update queue in real-time
  useSubscription(SONG_QUEUE_UPDATED, {
    variables: { roomCode },
    onData: ({ data }) => {
      const updatedQueue = data.data?.songQueueUpdated;
      if (updatedQueue) {
        setSongQueue(updatedQueue);
      }
    },
  });

  useEffect(() => {
    getCurrentSong();
    getQueue();
  }, []);

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

  const handleVideoEnd = async () => {
    if (!currentSong) return;

    try {
      const currentIndex = songQueue.findIndex((s) => s.id === currentSong.id);
      const nextSong = songQueue[currentIndex + 1];
      console.log("Next song:", nextSong);

      if (nextSong) {
        await setCurrentSongMutation({
          variables: {
            roomCode,
            songId: nextSong.id,
          },
        });
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
    height: "500",
    playerVars: {
      autoplay: 1,
    },
  };
  return (
    <div>
      <h2 className="text-xl font-bold mb-4 text-green-400">YouTube Player</h2>
      {currentSong ? (
        <>
          <YouTube
            key={currentSong.id} // ✅ Force remount on song change
            videoId={extractVideoId(currentSong.youtube_url)}
            opts={playerOptions}
            onEnd={handleVideoEnd}
          />

          <p className="mt-2 text-lg">{currentSong.title}</p>
        </>
      ) : (
        <p>No video playing. Search and add videos!</p>
      )}

      <div className="mt-6">
        <h3 className="text-lg font-bold">Queue</h3>
        <ul className="list-disc ml-6">
          {songQueue.map((song) => (
            <li
              key={song.id}
              className={song.id === currentSong?.id ? "text-green-400" : ""}
            >
              {song.title} <span className="ml-12">added by</span>{" "}
              {song.added_by?.name || "Unknown"}
              <button
                onClick={() => handleRemoveSong(song.id)}
                className="ml-4 text-red-400 hover:text-red-600"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
