import React, { useState } from "react";
import axios from "axios";
import { useMutation } from '@apollo/client';
import { toast } from "react-hot-toast";
import { Search, Plus, X, Music, Clock, Loader2, Youtube } from "lucide-react";
import { ADD_SONG_TO_QUEUE } from '../graphql/mutations';

export default function YouTubeSearch({ roomCode, onClose = null }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAddingToQueue, setIsAddingToQueue] = useState({});

  const participantId = localStorage.getItem('participantId');
  const [addSongToQueue] = useMutation(ADD_SONG_TO_QUEUE);

  const searchYouTube = async () => {
    if (!query.trim()) {
      toast.error("Please enter a search term");
      return;
    }

    setIsSearching(true);
    try {
      const API_KEY = "AIzaSyCAJPMRAHeRR7QmI3H4aayTr_a4JMfUjRg"; // move to .env later
      const response = await axios.get(
        `https://www.googleapis.com/youtube/v3/search`, {
          params: {
            part: "snippet",
            q: query,
            maxResults: 8,
            key: API_KEY,
            type: "video"
          }
        }
      );
      setResults(response.data.items);
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Failed to search YouTube");
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddToQueue = async (item) => {
    const videoId = item.id.videoId;
    setIsAddingToQueue(prev => ({ ...prev, [videoId]: true }));
    
    try {
      console.log("Adding song to queue", item.snippet.title, videoId);
      await addSongToQueue({
        variables: {
          roomCode,
          addedBy: participantId,
          youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
          title: item.snippet.title
        }
      });
      toast.success("Song added to queue!");
      
      // Remove the added song from results
      setResults(prev => prev.filter(result => result.id.videoId !== videoId));
    } catch (err) {
      console.error("Error adding song:", err);
      toast.error("Failed to add song to queue");
    } finally {
      setIsAddingToQueue(prev => ({ ...prev, [videoId]: false }));
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      searchYouTube();
    }
  };

  const clearSearch = () => {
    setQuery("");
    setResults([]);
  };

  const formatDuration = (duration) => {
    // This would need to be implemented with actual duration data from YouTube API
    return "3:45"; // Placeholder
  };

  const formatViewCount = (viewCount) => {
    if (viewCount >= 1000000) {
      return `${(viewCount / 1000000).toFixed(1)}M views`;
    } else if (viewCount >= 1000) {
      return `${(viewCount / 1000).toFixed(1)}K views`;
    }
    return `${viewCount} views`;
  };

  return (
    <div className="bg-black/40 backdrop-blur-sm rounded-2xl border border-green-500/20 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-b border-green-500/20 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
              <Youtube size={16} className="text-white" />
            </div>
            <h3 className="text-lg font-bold text-white">Search YouTube</h3>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="w-8 h-8 bg-gray-700/50 hover:bg-gray-600 rounded-lg flex items-center justify-center transition-colors"
            >
              <X size={16} className="text-gray-300" />
            </button>
          )}
        </div>
      </div>

      {/* Search Input */}
      <div className="p-4 border-b border-green-500/10">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Search for songs, artists, or albums..."
              className="w-full bg-gray-800/50 border border-green-500/30 rounded-xl px-4 py-3 pl-12 text-white placeholder-gray-400 focus:outline-none focus:border-green-500 focus:bg-gray-800/70 transition-all"
            />
            <Search size={18} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
            {query && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </div>
          <button
            onClick={searchYouTube}
            disabled={isSearching || !query.trim()}
            className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:from-gray-600 disabled:to-gray-600 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center gap-2 min-w-[100px]"
          >
            {isSearching ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Searching
              </>
            ) : (
              <>
                <Search size={16} />
                Search
              </>
            )}
          </button>
        </div>
      </div>

      {/* Search Results */}
      <div className="max-h-96 overflow-y-auto custom-scrollbar">
        {results.length > 0 ? (
          <div className="p-4 space-y-3">
            {results.map((item) => {
              const videoId = item.id.videoId;
              const isAdding = isAddingToQueue[videoId];
              
              return (
                <div
                  key={videoId}
                  className="group bg-gray-800/30 hover:bg-gray-800/50 border border-green-500/10 hover:border-green-500/30 rounded-xl p-4 transition-all duration-200"
                >
                  <div className="flex gap-4">
                    {/* Thumbnail */}
                    <div className="flex-shrink-0">
                      <div className="w-20 h-14 bg-gray-700 rounded-lg overflow-hidden relative">
                        <img
                          src={item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url}
                          alt={item.snippet.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                        <div className="absolute inset-0 bg-gray-700 hidden items-center justify-center">
                          <Music size={16} className="text-gray-400" />
                        </div>
                        {/* Duration overlay */}
                        <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 py-0.5 rounded">
                          {formatDuration()}
                        </div>
                      </div>
                    </div>

                    {/* Song Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-white text-sm leading-tight mb-1 line-clamp-2 group-hover:text-green-300 transition-colors">
                        {item.snippet.title}
                      </h4>
                      <p className="text-xs text-gray-400 mb-2 line-clamp-1">
                        {item.snippet.channelTitle}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock size={10} />
                          {formatDuration()}
                        </span>
                        {/* View count would be available with additional API call */}
                      </div>
                    </div>

                    {/* Add Button */}
                    <div className="flex-shrink-0 flex items-center">
                      <button
                        onClick={() => handleAddToQueue(item)}
                        disabled={isAdding}
                        className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:from-gray-600 disabled:to-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 min-w-[80px]"
                      >
                        {isAdding ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <>
                            <Plus size={14} />
                            Add
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : query && !isSearching ? (
          <div className="p-8 text-center">
            <Music size={48} className="text-gray-500 mx-auto mb-3" />
            <p className="text-gray-400">No results found</p>
            <p className="text-gray-500 text-sm">Try different keywords</p>
          </div>
        ) : !query ? (
          <div className="p-8 text-center">
            <Search size={48} className="text-green-400/30 mx-auto mb-3" />
            <p className="text-green-200/70">Search for music</p>
            <p className="text-green-300/50 text-sm">Enter a song name, artist, or album</p>
          </div>
        ) : null}
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
          background: rgba(34, 197, 94, 0.5);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(34, 197, 94, 0.7);
        }
        .line-clamp-1 {
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
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