import { useEffect, useRef, useState } from "react";
import YouTube from "react-youtube";
import { toast } from "react-hot-toast";
import { Play, Trash2, Users, Clock } from "lucide-react";
import { useLazyQuery, useMutation, useSubscription } from "@apollo/client";
import { REMOVE_SONG_FROM_QUEUE, SET_CURRENT_SONG } from "../graphql/mutations";
import { GET_CURRENT_SONG, GET_SONG_QUEUE } from "../graphql/queries";
import {
  CURRENT_SONG_CHANGED,
  SONG_QUEUE_UPDATED,
} from "../graphql/subscriptions";
import { createSyncWS } from "../websocket/sync";

const extractVideoId = (url) => {
  const urlObj = new URL(url);
  return urlObj.searchParams.get("v");
};

export default function QueuePlayer({ roomAdminId }) {
  const roomCode = localStorage.getItem("roomCode");
  const participantId = localStorage.getItem("participantId");
  const isAdmin = participantId === roomAdminId;

  const [currentSong, setCurrentSong] = useState(null);
  const [songQueue, setSongQueue] = useState([]);
  const playerRef = useRef(null);
  const syncWSRef = useRef(null);
  const debounceRef = useRef(0);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const syncIntervalRef = useRef(null);
  const pendingSyncRef = useRef(null);

  const [getCurrentSong] = useLazyQuery(GET_CURRENT_SONG, {
    variables: { roomCode },
    fetchPolicy: "network-only",
    onCompleted: (data) => {
      if (data?.getCurrentSong) {
        setCurrentSong(data.getCurrentSong);
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

  const [removeSong] = useMutation(REMOVE_SONG_FROM_QUEUE);
  const [setCurrentSongMutation] = useMutation(SET_CURRENT_SONG);

  useSubscription(CURRENT_SONG_CHANGED, {
    variables: { roomCode },
    onData: ({ data }) => {
      const song = data.data?.currentSongChanged;
      if (song) {
        setCurrentSong(song);
        setIsPlayerReady(false); // Reset player ready state for new video
      }
    },
  });

  useSubscription(SONG_QUEUE_UPDATED, {
    variables: { roomCode },
    onData: ({ data }) => {
      const updatedQueue = data.data?.songQueueUpdated;
      if (updatedQueue) setSongQueue(updatedQueue);
    },
  });

  // --- WebSocket Connection ---
  useEffect(() => {
    const handleSyncReceived = async (syncData) => {
      const { action, currentTime } = syncData;

      // Only non-admin users should respond to sync messages
      if (isAdmin) {
        console.log(
          `[IGNORED - ADMIN] Action: ${action}, Time: ${currentTime}`
        );
        return;
      }

      if (!playerRef.current || !isPlayerReady) {
        console.log("[SYNC ERROR] Player not ready, storing pending sync");
        // Store pending sync for when player is ready
        pendingSyncRef.current = syncData;
        return;
      }

      const yt = playerRef.current;

      console.log(
        `[SYNCING - NON-ADMIN] Action: ${action}, Time: ${currentTime}`
      );

      // Temporarily disable state change events to prevent feedback loops
      debounceRef.current = Date.now();

      try {
        if (action === "PLAY") {
          await yt.seekTo(currentTime, true);
          await yt.playVideo();
          console.log(`[SYNCED] Video played at ${currentTime}s`);
        } else if (action === "PAUSE") {
          await yt.seekTo(currentTime, true);
          await yt.pauseVideo();
          console.log(`[SYNCED] Video paused at ${currentTime}s`);
        } else if (action === "SEEK") {
          await yt.seekTo(currentTime, true);
          console.log(`[SYNCED] Video seeked to ${currentTime}s`);
        }
      } catch (error) {
        console.error("[SYNC ERROR]", error);
      }

      // Re-enable state change events after a short delay
      setTimeout(() => {
        debounceRef.current = 0;
      }, 1000);
    };

    // Create WebSocket connection
    syncWSRef.current = createSyncWS(roomCode, participantId, handleSyncReceived);

    return () => {
      if (syncWSRef.current) {
        syncWSRef.current.close();
      }
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [roomCode, participantId, isAdmin, isPlayerReady]);

  // --- Send periodic sync for admin to keep everyone in sync ---
  useEffect(() => {
    if (isAdmin && isPlayerReady && playerRef.current && syncWSRef.current) {
      // Send periodic sync every 2 seconds to keep everyone in sync
      syncIntervalRef.current = setInterval(async () => {
        try {
          const currentTime = await playerRef.current.getCurrentTime();
          const playerState = playerRef.current.getPlayerState();
          
          // Only send sync if video is playing
          if (playerState === 1) {
            console.log("[ADMIN] Periodic sync - Playing at", currentTime);
            syncWSRef.current.sendSync("PLAY", currentTime);
          }
        } catch (error) {
          console.error("[ADMIN] Error in periodic sync:", error);
        }
      }, 2000);
      
      // Send initial sync
      setTimeout(async () => {
        try {
          const currentTime = await playerRef.current.getCurrentTime();
          const playerState = playerRef.current.getPlayerState();
          
          console.log("[ADMIN] Sending initial sync on ready", { currentTime, playerState });
          
          if (playerState === 1) {
            syncWSRef.current.sendSync("PLAY", currentTime);
          } else if (playerState === 2) {
            syncWSRef.current.sendSync("PAUSE", currentTime);
          } else {
            syncWSRef.current.sendSync("SEEK", currentTime);
          }
        } catch (error) {
          console.error("[ADMIN] Error sending initial sync:", error);
        }
      }, 1000);
    }

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [isAdmin, isPlayerReady, currentSong]);

  // --- Player Events ---
  const onPlayerReady = async (event) => {
    console.log("[PLAYER] Ready event fired");
    playerRef.current = event.target;
    setIsPlayerReady(true);

    if (!isAdmin) {
      console.log("[NON-ADMIN] Pausing video to wait for sync");
      event.target.pauseVideo();
      
      // Apply pending sync if any
      if (pendingSyncRef.current) {
        console.log("[NON-ADMIN] Applying pending sync:", pendingSyncRef.current);
        setTimeout(async () => {
          const { action, currentTime } = pendingSyncRef.current;
          try {
            if (action === "PLAY") {
              await event.target.seekTo(currentTime, true);
              await event.target.playVideo();
            } else if (action === "PAUSE") {
              await event.target.seekTo(currentTime, true);
              await event.target.pauseVideo();
            } else if (action === "SEEK") {
              await event.target.seekTo(currentTime, true);
            }
            pendingSyncRef.current = null;
          } catch (error) {
            console.error("[NON-ADMIN] Error applying pending sync:", error);
          }
        }, 500);
      }
    }
  };

  const onStateChange = async (event) => {
    const yt = event.target;
    
    console.log("[STATE CHANGE] Player state:", yt.getPlayerState(), "IsAdmin:", isAdmin, "Debounced:", debounceRef.current);
    
    if (!isAdmin || !syncWSRef.current) {
      return;
    }

    const playerState = yt.getPlayerState();
    
    // Skip buffering states (3) and unstarted (-1)
    if (playerState === 3 || playerState === -1) {
      return;
    }
    
    try {
      const currentTime = await yt.getCurrentTime();
      console.log("[ADMIN] State change - State:", playerState, "Time:", currentTime);

      // Use a state-specific debounce approach
      const now = Date.now();
      const lastSyncTime = debounceRef.current || 0;
      const timeSinceLastSync = now - lastSyncTime;
      
      // Only debounce if less than 200ms since last sync
      if (timeSinceLastSync < 200) {
        console.log("[ADMIN] Skipping due to recent sync (", timeSinceLastSync, "ms ago)");
        return;
      }

      if (playerState === 1) { // Playing
        console.log("[ADMIN] Sending PLAY sync");
        syncWSRef.current.sendSync("PLAY", currentTime);
        debounceRef.current = now;
        
      } else if (playerState === 2) { // Paused
        console.log("[ADMIN] Sending PAUSE sync");
        syncWSRef.current.sendSync("PAUSE", currentTime);
        debounceRef.current = now;
      }
    } catch (error) {
      console.error("[ADMIN] Error in state change:", error);
    }
  };

  const handleSeek = async () => {
    if (!isAdmin || !playerRef.current || !syncWSRef.current) return;
    
    try {
      const currentTime = await playerRef.current.getCurrentTime();
      console.log("[ADMIN] Manual seek to:", currentTime);
      syncWSRef.current.sendSync("SEEK", currentTime);
    } catch (error) {
      console.error("[ADMIN] Error in seek:", error);
    }
  };

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

  useEffect(() => {
    getCurrentSong();
    getQueue();
  }, []);

  const playerOptions = {
    width: "100%",
    height: "400",
    playerVars: {
      autoplay: isAdmin ? 1 : 0, // Only autoplay for admin
      rel: 0,
      modestbranding: 1,
      controls: isAdmin ? 1 : 0,
      enablejsapi: 1, // Important for API access
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
              onReady={onPlayerReady}
              onEnd={handleVideoEnd}
              onStateChange={onStateChange}
              onPlaybackRateChange={handleSeek}
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

      {/* Queue */}
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
                  <div className="min-w-[24px] h-[24px] bg-green-600 text-white text-xs rounded-full flex items-center justify-center font-bold mt-1">
                    {index + 1}
                  </div>
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
              <p className="text-green-500 text-xs">
                Add some songs to get started
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}