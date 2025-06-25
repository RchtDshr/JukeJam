import React, { useState } from "react";
import axios from "axios";
import { useMutation } from '@apollo/client';
import { ADD_SONG_TO_QUEUE } from '../graphql/mutations';

export default function YouTubeSearch({ roomCode }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);

  const participantId = localStorage.getItem('participantId');
  const [addSongToQueue] = useMutation(ADD_SONG_TO_QUEUE);

  const searchYouTube = async () => {
    const API_KEY = "AIzaSyCAJPMRAHeRR7QmI3H4aayTr_a4JMfUjRg"; // move to .env later
    const response = await axios.get(
      `https://www.googleapis.com/youtube/v3/search`, {
        params: {
          part: "snippet",
          q: query,
          maxResults: 5,
          key: API_KEY,
          type: "video"
        }
      }
    );
    setResults(response.data.items);
  };

  const handleAddToQueue = async (item) => {
    try {
        console.log("Adding song to queue", item.snippet.title, item.id.videoId);
      await addSongToQueue({
        variables: {
          roomCode,
          addedBy: participantId,
          youtubeUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
          title: item.snippet.title
        }
      });
      toast.success("Song added to queue!");
    } catch (err) {
      toast.error("Error adding song to queue", err);
    }
  };

  return (
    <div className="my-4">
      <input
        type="text"
        className="p-2 border rounded mr-2 text-black"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search YouTube"
      />
      <button onClick={searchYouTube} className="bg-green-600 p-2 rounded">Search</button>

      <div className="mt-4">
        {results.map((item) => (
          <div key={item.id.videoId} className="flex items-center justify-between mb-2">
            <div>{item.snippet.title}</div>
            <button
              className="bg-blue-500 p-1 rounded"
              onClick={() => handleAddToQueue(item)}
            >
              Add to Queue
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
