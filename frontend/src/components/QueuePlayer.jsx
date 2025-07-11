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
import { useRoomStore } from "../store/useRoomStore";

const extractVideoId = (url) => {
  const urlObj = new URL(url);
  return urlObj.searchParams.get("v");
};

export default function QueuePlayer({ roomAdminId }) {
  const playerRef = useRef(null);
  const syncWSRef = useRef(null);
  const debounceRef = useRef(0);
  const syncIntervalRef = useRef(null);
  const pendingSyncRef = useRef(null);
  const isAdminRef = useRef(false);
  const playerReadyRef = useRef(false); // Add ref to track ready state

  // Get state from Zustand store
  const {
    currentSong,
    setCurrentSong,
    songQueue,
    setSongQueue,
    isPlayerReady,
    setIsPlayerReady,
    syncWS,
    setSyncWS,
    roomCode,
    participantId,
    getIsAdmin,
  } = useRoomStore();

  // Get isAdmin status and update ref
  const isAdmin = getIsAdmin();
  isAdminRef.current = isAdmin;

  console.log('[DEBUG] Current state:', {
    roomCode,
    participantId,
    isAdmin,
    roomAdminId,
    currentSong: currentSong?.title,
    queueLength: songQueue?.length,
    isPlayerReady,
    syncWSConnected: syncWS?.isConnected?.()
  });

  const [getCurrentSong] = useLazyQuery(GET_CURRENT_SONG, {
    variables: { roomCode },
    fetchPolicy: "network-only",
    onCompleted: (data) => {
      if (data?.getCurrentSong) {
        console.log('[GraphQL] Current song updated:', data.getCurrentSong.title);
        setCurrentSong(data.getCurrentSong);
      }
    },
  });

  const [getQueue] = useLazyQuery(GET_SONG_QUEUE, {
    variables: { roomCode },
    fetchPolicy: "network-only",
    onCompleted: (data) => {
      if (data?.getSongQueue) {
        console.log('[GraphQL] Queue updated:', data.getSongQueue.length, 'songs');
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
        console.log('[SUBSCRIPTION] Current song changed:', song.title);
        setCurrentSong(song);
        setIsPlayerReady(false);
        playerReadyRef.current = false; // Reset ready state
      }
    },
  });

  useSubscription(SONG_QUEUE_UPDATED, {
    variables: { roomCode },
    onData: ({ data }) => {
      const updatedQueue = data.data?.songQueueUpdated;
      if (updatedQueue) {
        console.log('[SUBSCRIPTION] Queue updated:', updatedQueue.length, 'songs');
        setSongQueue(updatedQueue);
      }
    },
  });

  // Apply pending sync helper function
  const applyPendingSync = useRef(async (player, syncData) => {
    if (!syncData || !player) return;
    
    console.log('[APPLYING PENDING SYNC]', syncData);
    const { action, currentTime } = syncData;
    
    try {
      if (action === "PLAY") {
        console.log(`[PENDING SYNC] Seeking to ${currentTime}s and playing`);
        player.seekTo(currentTime, true);
        
        setTimeout(async () => {
          try {
            await player.playVideo();
            console.log(`[PENDING SYNC] Video played at ${currentTime}s`);
          } catch (error) {
            console.error('[PENDING SYNC] Error playing:', error);
          }
        }, 500);
        
      } else if (action === "PAUSE") {
        console.log(`[PENDING SYNC] Seeking to ${currentTime}s and pausing`);
        player.seekTo(currentTime, true);
        
        setTimeout(async () => {
          try {
            await player.pauseVideo();
            console.log(`[PENDING SYNC] Video paused at ${currentTime}s`);
          } catch (error) {
            console.error('[PENDING SYNC] Error pausing:', error);
          }
        }, 500);
        
      } else if (action === "SEEK") {
        console.log(`[PENDING SYNC] Seeking to ${currentTime}s`);
        player.seekTo(currentTime, true);
        console.log(`[PENDING SYNC] Video seeked to ${currentTime}s`);
      }
    } catch (error) {
      console.error('[PENDING SYNC ERROR]', error);
    }
  });

  // Stable sync handler that uses the ref for admin status
  const handleSyncReceived = useRef((syncData) => {
    const { action, currentTime, timestamp } = syncData;
    const currentIsAdmin = isAdminRef.current;
    
    console.log('[SYNC RECEIVED] Data:', { action, currentTime, timestamp, isAdmin: currentIsAdmin });

    // CRITICAL: Admin should NEVER process sync messages
    if (currentIsAdmin) {
      console.log(`[IGNORED - ADMIN] Action: ${action}, Time: ${currentTime}`);
      return;
    }

    // Check if player is ready using both state and ref
    const playerReady = playerReadyRef.current && playerRef.current;
    
    if (!playerReady) {
      console.log("[SYNC ERROR] Player not ready, storing pending sync", {
        hasPlayer: !!playerRef.current,
        isPlayerReady: playerReadyRef.current,
        storeIsPlayerReady: isPlayerReady
      });
      pendingSyncRef.current = syncData;
      return;
    }

    const yt = playerRef.current;
    console.log(`[SYNCING - NON-ADMIN] Action: ${action}, Time: ${currentTime}`);

    debounceRef.current = Date.now();

    // Execute sync actions with improved error handling
    (async () => {
      try {
        // Get current player state to handle buffering issues
        const playerState = yt.getPlayerState();
        console.log(`[SYNC] Current player state: ${playerState}`);

        if (action === "PLAY") {
          console.log(`[SYNC] Seeking to ${currentTime}s and playing`);
          
          // For play actions, ensure video is loaded at the seek position
          yt.seekTo(currentTime, true);
          
          // Wait a bit for seek to complete before playing
          setTimeout(async () => {
            try {
              await yt.playVideo();
              console.log(`[SYNCED] Video played at ${currentTime}s`);
              
              // Verify we're actually at the right position after a short delay
              setTimeout(async () => {
                try {
                  const actualTime = await yt.getCurrentTime();
                  const timeDiff = Math.abs(actualTime - currentTime);
                  
                  if (timeDiff > 2) { // If more than 2 seconds off
                    console.log(`[SYNC CORRECTION] Time diff: ${timeDiff}s, re-seeking`);
                    yt.seekTo(currentTime, true);
                  }
                } catch (error) {
                  console.error("[SYNC] Error checking time position:", error);
                }
              }, 1000);
              
            } catch (error) {
              console.error("[SYNC] Error playing video:", error);
            }
          }, 300);
          
        } else if (action === "PAUSE") {
          console.log(`[SYNC] Seeking to ${currentTime}s and pausing`);
          yt.seekTo(currentTime, true);
          
          setTimeout(async () => {
            try {
              await yt.pauseVideo();
              console.log(`[SYNCED] Video paused at ${currentTime}s`);
            } catch (error) {
              console.error("[SYNC] Error pausing video:", error);
            }
          }, 300);
          
        } else if (action === "SEEK") {
          console.log(`[SYNC] Seeking to ${currentTime}s`);
          yt.seekTo(currentTime, true);
          
          // For seek, maintain current play state
          setTimeout(async () => {
            try {
              const currentState = yt.getPlayerState();
              if (currentState === 1) { // If was playing, continue playing
                await yt.playVideo();
              }
              console.log(`[SYNCED] Video seeked to ${currentTime}s`);
            } catch (error) {
              console.error("[SYNC] Error after seek:", error);
            }
          }, 300);
        }
      } catch (error) {
        console.error("[SYNC ERROR]", error);
      }

      setTimeout(() => {
        debounceRef.current = 0;
      }, 1000);
    })();
  });

  // WebSocket sync handling
  useEffect(() => {
    console.log('[WEBSOCKET EFFECT] Running with:', { 
      roomCode, 
      participantId, 
      isAdmin, 
      isPlayerReady,
      hasSyncWS: !!syncWS 
    });

    // Initialize WebSocket if not already connected
    if (!syncWS && roomCode && participantId) {
      console.log('[WEBSOCKET] Initializing sync WebSocket');
      const ws = createSyncWS(roomCode, participantId, handleSyncReceived.current);
      setSyncWS(ws);
    } else if (syncWS && roomCode && participantId) {
      console.log('[WEBSOCKET] WebSocket already exists, updating callback');
      if (syncWS.updateCallback) {
        syncWS.updateCallback(handleSyncReceived.current);
      }
    }

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [roomCode, participantId, syncWS, setSyncWS]);

  // Admin periodic sync
  useEffect(() => {
    console.log('[ADMIN SYNC] Effect triggered:', {
      isAdmin,
      isPlayerReady,
      hasPlayer: !!playerRef.current,
      hasSyncWS: !!syncWS,
      currentSong: currentSong?.title
    });

    if (isAdmin && isPlayerReady && playerRef.current && syncWS && currentSong) {
      console.log('[ADMIN SYNC] Starting periodic sync...');
      
      // Clear any existing interval
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
      
      // Send periodic sync every 2 seconds
      syncIntervalRef.current = setInterval(async () => {
        try {
          const currentTime = await playerRef.current.getCurrentTime();
          const playerState = playerRef.current.getPlayerState();
          
          // Only send sync if video is playing
          if (playerState === 1) {
            console.log("[ADMIN] Periodic sync - Playing at", currentTime);
            syncWS.sendSync("PLAY", currentTime);
          }
        } catch (error) {
          console.error("[ADMIN] Error in periodic sync:", error);
        }
      }, 2000);
      
      // Send initial sync after a delay
      setTimeout(async () => {
        try {
          const currentTime = await playerRef.current.getCurrentTime();
          const playerState = playerRef.current.getPlayerState();
          
          console.log("[ADMIN] Sending initial sync on ready", { currentTime, playerState });
          
          if (playerState === 1) {
            syncWS.sendSync("PLAY", currentTime);
          } else if (playerState === 2) {
            syncWS.sendSync("PAUSE", currentTime);
          } else {
            syncWS.sendSync("SEEK", currentTime);
          }
        } catch (error) {
          console.error("[ADMIN] Error sending initial sync:", error);
        }
      }, 1000);
    }

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    };
  }, [isAdmin, isPlayerReady, currentSong, syncWS]);

  // Player Events
  const onPlayerReady = async (event) => {
    console.log("[PLAYER] Ready event fired", { isAdmin });
    playerRef.current = event.target;
    
    // Set ready state in both store and ref
    setIsPlayerReady(true);
    playerReadyRef.current = true;

    if (!isAdmin) {
      console.log("[NON-ADMIN] Pausing video to wait for sync");
      event.target.pauseVideo();
      
      // Apply pending sync if any - with a longer delay to ensure player is truly ready
      if (pendingSyncRef.current) {
        console.log("[NON-ADMIN] Applying pending sync:", pendingSyncRef.current);
        setTimeout(async () => {
          await applyPendingSync.current(event.target, pendingSyncRef.current);
          pendingSyncRef.current = null;
        }, 1000); // Increased delay
      }
    }
  };

  const onStateChange = async (event) => {
    const yt = event.target;
    const playerState = yt.getPlayerState();
    
    console.log("[STATE CHANGE] Player state:", playerState, "IsAdmin:", isAdmin, "Debounced:", debounceRef.current);
    
    if (!isAdmin || !syncWS) {
      console.log("[STATE CHANGE] Skipping - not admin or no syncWS");
      return;
    }

    // Skip buffering states (3) and unstarted (-1)
    if (playerState === 3 || playerState === -1) {
      console.log("[STATE CHANGE] Skipping buffering/unstarted state");
      return;
    }
    
    try {
      const currentTime = await yt.getCurrentTime();
      console.log("[ADMIN] State change - State:", playerState, "Time:", currentTime);

      const now = Date.now();
      const lastSyncTime = debounceRef.current || 0;
      const timeSinceLastSync = now - lastSyncTime;
      
      // Only debounce if less than 300ms since last sync (increased from 200ms)
      if (timeSinceLastSync < 300) {
        console.log("[ADMIN] Skipping due to recent sync (", timeSinceLastSync, "ms ago)");
        return;
      }

      if (playerState === 1) { // Playing
        console.log("[ADMIN] Sending PLAY sync");
        syncWS.sendSync("PLAY", currentTime);
        debounceRef.current = now;
        
      } else if (playerState === 2) { // Paused
        console.log("[ADMIN] Sending PAUSE sync");
        syncWS.sendSync("PAUSE", currentTime);
        debounceRef.current = now;
      }
    } catch (error) {
      console.error("[ADMIN] Error in state change:", error);
    }
  };

  const handleSeek = async () => {
    if (!isAdmin || !playerRef.current || !syncWS) return;
    
    try {
      const currentTime = await playerRef.current.getCurrentTime();
      console.log("[ADMIN] Manual seek to:", currentTime);
      syncWS.sendSync("SEEK", currentTime);
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
    if (roomCode) {
      console.log('[EFFECT] Fetching current song and queue');
      getCurrentSong();
      getQueue();
    }
  }, [roomCode]);

  const playerOptions = {
    width: "100%",
    height: "400",
    playerVars: {
      autoplay: isAdmin ? 1 : 0,
      rel: 0,
      modestbranding: 1,
      controls: isAdmin ? 1 : 0,
      enablejsapi: 1,
    },
  };

  if (!roomCode) {
    return <div className="text-green-400">Loading room...</div>;
  }

  return (
    <div className="space-y-8">
     
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