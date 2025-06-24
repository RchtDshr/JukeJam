import React, { useState } from "react";
import axios from "axios";

export default function YouTubeSearch({ onAddVideo }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);

  const searchYouTube = async () => {
    const API_KEY = "AIzaSyCAJPMRAHeRR7QmI3H4aayTr_a4JMfUjRg"; // store securely in env file
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
              onClick={() => onAddVideo(item)}
            >
              Add to Queue
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
