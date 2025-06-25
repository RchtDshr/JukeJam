import { useEffect, useState } from "react";
import YouTube from "react-youtube";
import { toast } from "react-hot-toast";
import { useMutation, useQuery, useSubscription } from "@apollo/client";
import { REMOVE_SONG_FROM_QUEUE } from "../graphql/mutations";
import { GET_SONG_QUEUE } from "../graphql/queries";
import { SONG_QUEUE_UPDATED } from "../graphql/subscriptions";

// Helper to extract video ID
const extractVideoId = (url) => {
  const urlObj = new URL(url);
  return urlObj.searchParams.get("v");
};

export default function Queue({ roomCode }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [removeSongMutation] = useMutation(REMOVE_SONG_FROM_QUEUE);

  const { data, loading, error, refetch } = useQuery(GET_SONG_QUEUE, {
    variables: { roomCode },
  });

  useSubscription(SONG_QUEUE_UPDATED, {
    variables: { roomCode },
    onSubscriptionData: () => {
      refetch();
    },
  });

  const songQueue = data?.getSongQueue || [];

  useEffect(() => {
    setCurrentIndex(0); // Reset when song queue updates
  }, [songQueue]);

  const handleRemoveSong = async (songId) => {
    try {
      await removeSongMutation({ variables: { roomCode, songId } });
      toast.success("Song removed from queue");
    } catch (err) {
      console.error(err);
      toast.error("Failed to remove song");
    }
  };

  const handleVideoEnd = () => {
    if (currentIndex + 1 < songQueue.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
      toast("Queue finished.");
    }
  };

  if (loading) return <p className="text-white">Loading queue...</p>;
  if (error) return <p className="text-red-500">Error loading queue: {error.message}</p>;

  return (
    <div>
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
              className={`flex justify-between items-center ${
                idx === currentIndex ? "text-green-400" : ""
              }`}
            >
              <span>
                {song.title}
                <span className="ml-12">added by</span>{" "}
                {song.added_by?.name || "Unknown"}
              </span>

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
