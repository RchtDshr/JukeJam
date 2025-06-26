import { useState } from "react";
import { toast } from "react-hot-toast";
import { Search, X } from "lucide-react";
import YouTubeSearch from "../components/YouTubeSearch";

export default function QueueTab({ roomCode }) {
  const [showSearch, setShowSearch] = useState(false);

  return (
    <div className="space-y-4">
      <button
        onClick={() => setShowSearch(!showSearch)}
        className="w-full bg-green-700 hover:bg-green-800 text-white py-3 px-4 rounded-md font-semibold flex items-center justify-center gap-2"
      >
        {showSearch ? <X size={18} /> : <Search size={18} />}
        {showSearch ? "Close Search" : "Find Songs"}
      </button>

      {showSearch && (
        // <div className="bg-zinc-800 border border-green-700 rounded-md p-4">
          <YouTubeSearch
            roomCode={roomCode}
            onSongAdded={() => {
              setShowSearch(false);
              toast.success("Song added to queue!");
            }}
          />
        // </div>
      )}
    </div>
  );
}