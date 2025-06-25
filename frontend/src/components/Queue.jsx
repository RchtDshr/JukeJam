// components/Queue.js

import { useState, useEffect } from "react";
import YouTube from "react-youtube";
import { toast } from "react-hot-toast";
import { useMutation } from "@apollo/client";
import { REMOVE_SONG_FROM_QUEUE } from "../graphql/mutations";
// Helper to extract video ID
const extractVideoId = (url) => {
  const urlObj = new URL(url);
  return urlObj.searchParams.get("v");
};

export default function Queue({ songQueue }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [removeSongMutation] = useMutation(REMOVE_SONG_FROM_QUEUE);
const roomCode = localStorage.getItem("roomCode");
  const handleRemoveSong = async (songId) => {
    try {
      await removeSongMutation({
        variables: { roomCode, songId },
      });
      toast.success("Song removed from queue");
    //   refetchQueue(); // Optional: Refetch queue if not using subscriptions
    } catch (err) {
      console.error(err);
      toast.error("Failed to remove song");
    }
  };
  useEffect(() => {
    // Reset index when queue updates
    setCurrentIndex(0);
  }, [songQueue]);

  const handleVideoEnd = () => {
    if (currentIndex + 1 < songQueue.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
      toast("Queue finished.");
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4 text-green-400">YouTube Player</h2>
      {songQueue.length > 0 ? (
        <>
          <YouTube
            videoId={extractVideoId(songQueue[currentIndex].youtube_url)}
            opts={{ width: "100%", height: "500" }}
            onEnd={handleVideoEnd}
          />
          <p className="mt-2 text-lg">{songQueue[currentIndex].title}</p>
        </>
      ) : (
        <p>No video playing. Search and add videos!</p>
      )}

      <div className="mt-6">
        <h3 className="text-lg font-bold">Queue</h3>
        <ul className="list-disc ml-6">
          {songQueue.map((song, idx) => (
            <li
              key={song.id}
              className={idx === currentIndex ? "text-green-400" : ""}
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
