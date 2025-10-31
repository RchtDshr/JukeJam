import { useEffect, useState } from "react";
import { useSubscription } from "@apollo/client";
import { toast } from "react-hot-toast";
import {
  Users,
  Crown,
} from "lucide-react";
import {
  PARTICIPANT_JOINED,
  PARTICIPANT_LEFT,
  PARTICIPANTS_UPDATED,
} from "../graphql/subscriptions";
import { useRoomStore } from "../store/useRoomStore";

export default function Participants({
  roomCode,
  participantId,
  initialParticipants,
  roomAdminId = null,
}) {
  const {
    participants,
    setParticipants,
    addParticipant,
    removeParticipant,
    getSortedParticipants,
  } = useRoomStore();

  const sortedParticipants = getSortedParticipants();

  // Initialize participants on mount
  useEffect(() => {
    console.log('Initializing participants:', { initialParticipants, participantId });
    if (initialParticipants) {
      setParticipants(initialParticipants);
    }
  }, [initialParticipants, setParticipants]);

  // Debug effect to log current state
  useEffect(() => {
    console.log('Current participants state:', {
      participants,
      participantId,
      sortedParticipants,
      currentUserExists: participants.some(p => p.id === participantId)
    });
  }, [participants, participantId, sortedParticipants]);

  // Ensure current user is always in the participants list
  useEffect(() => {
    if (participantId && participants.length > 0) {
      const currentUserExists = participants.some(
        (p) => p.id === participantId
      );
      
      // If current user is not in the list, add them
      if (!currentUserExists) {
        // Try to find current user in initialParticipants
        const currentUserFromInitial = initialParticipants?.find(
          (p) => p.id === participantId
        );
        
        if (currentUserFromInitial) {
          addParticipant(currentUserFromInitial);
        } else {
          // If not found in initial, create a basic entry
          // This is a fallback - ideally the backend should include current user
          console.warn("Current user not found in participants list");
        }
      }
    }
  }, [participants, participantId, initialParticipants, addParticipant]);

  // New participant joined
  useSubscription(PARTICIPANT_JOINED, {
    variables: { roomCode },
    onSubscriptionData: ({ subscriptionData }) => {
      console.log('PARTICIPANT_JOINED received:', subscriptionData.data);
      const newParticipant = subscriptionData.data?.participantJoined;
      if (newParticipant) {
        // Use setParticipants to ensure proper update
        setParticipants(prev => {
          // Check if participant already exists
          const exists = prev.some(p => p.id === newParticipant.id);
          if (!exists) {
            console.log('Adding new participant:', newParticipant);
            return [...prev, newParticipant];
          } else {
            console.log('Participant already exists, updating:', newParticipant);
            return prev.map(p => p.id === newParticipant.id ? newParticipant : p);
          }
        });

        // Only show toast for other participants, not yourself
        if (newParticipant.id !== participantId) {
          toast.success(`${newParticipant.name} joined!`, {
            icon: "👋",
            style: {
              background: "#065f46",
              color: "#ffffff",
              border: "1px solid #10b981",
            },
          });
        }
      }
    },
    onError: (error) => {
      console.error('PARTICIPANT_JOINED subscription error:', error);
    },
  });

  // Participant left - FIXED: Handle participantLeft data correctly
  useSubscription(PARTICIPANT_LEFT, {
    variables: { roomCode },
    onSubscriptionData: ({ subscriptionData }) => {
      console.log('PARTICIPANT_LEFT received:', subscriptionData.data);
      const leftParticipant = subscriptionData.data?.participantLeft;
      if (leftParticipant) {
        setParticipants(prev => prev.filter(p => p.id !== leftParticipant.id));

        // Only show toast for other participants, not yourself
        if (leftParticipant.id !== participantId) {
          toast.success(`${leftParticipant.name} left the room.`, {
            icon: "👋",
            style: {
              background: "#7f1d1d",
              color: "#ffffff",
              border: "1px solid #ef4444",
            },
          });
        }
      }
    },
    onError: (error) => {
      console.error('PARTICIPANT_LEFT subscription error:', error);
    },
  });

  // Participant list updated - FIXED: Handle updated participants list
  useSubscription(PARTICIPANTS_UPDATED, {
    variables: { roomCode },
    onSubscriptionData: ({ subscriptionData }) => {
      console.log('PARTICIPANTS_UPDATED received:', subscriptionData.data);
      const updatedParticipants = subscriptionData.data?.participantsUpdated;
      if (updatedParticipants) {
        console.log('Updating participants with:', updatedParticipants);
        setParticipants(updatedParticipants);
      }
    },
    onError: (error) => {
      console.error('PARTICIPANTS_UPDATED subscription error:', error);
    },
  });

  const getInitials = (name) => {
    return name
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase())
      .join("")
      .substring(0, 2);
  };

  const getAvatarColor = (id) => {
    const colors = [
      "from-green-500 to-emerald-500",
      "from-blue-500 to-cyan-500",
      "from-purple-500 to-violet-500",
      "from-pink-500 to-rose-500",
      "from-orange-500 to-amber-500",
      "from-teal-500 to-cyan-500",
    ];
    const index = parseInt(id.slice(-1)) % colors.length;
    return colors[index];
  };

  return (
    <div className="h-full bg-black/40 backdrop-blur-sm rounded-2xl border border-green-500/20 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-b border-green-500/20 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
              <Users size={16} className="text-white" />
            </div>
            <h3 className="text-lg font-bold text-white">Participants</h3>
          </div>
          {/* Debug button - remove this in production */}
          <button 
            onClick={() => {
              console.log('Force refresh participants');
              if (initialParticipants) {
                setParticipants(initialParticipants);
              }
            }}
            className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Participants List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-4 space-y-3">
          {sortedParticipants.length > 0 ? (
            sortedParticipants.map((participant) => {
              const isCurrentUser = participant.id === participantId;
              const isAdmin = roomAdminId && participant.id === roomAdminId;

              const avatarColor = getAvatarColor(participant.id);

              return (
                <div
                  key={participant.id}
                  className={`group relative bg-gray-800/30 hover:bg-gray-800/50 border rounded-xl p-4 transition-all duration-200 ${
                    isCurrentUser
                      ? "border-green-500/50 bg-green-500/10"
                      : "border-green-500/10 hover:border-green-500/30"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="relative">
                      <div
                        className={`w-12 h-12 bg-gradient-to-r ${avatarColor} rounded-full flex items-center justify-center font-bold text-white text-sm shadow-lg`}
                      >
                        {getInitials(participant.name)}
                      </div>
                    </div>

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4
                          className={`font-medium text-sm ${
                            isCurrentUser ? "text-green-300" : "text-white"
                          } truncate`}
                        >
                          {participant.name}
                        </h4>

                        {/* Role Badges */}
                        <div className="flex items-center gap-1">
                          {isAdmin && (
                            <div className="bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1">
                              <Crown size={10} />
                              Admin
                            </div>
                          )}
                          {isCurrentUser && (
                            <div className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full text-xs font-medium">
                              You
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Admin Actions Overlay */}
                  {isAdmin && (
                    <div className="absolute top-2 left-2">
                      <div className="w-6 h-6 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center">
                        <Crown size={12} className="text-white" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center py-8">
              <Users size={48} className="text-green-400/30 mx-auto mb-3" />
              <p className="text-green-200/70">No participants</p>
              <p className="text-green-300/50 text-sm">
                Waiting for people to join
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer Stats */}
      <div className="border-t border-green-500/20 p-4 bg-black/20">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span className="text-gray-400">{participants.length} total</span>
          </div>
          <div className="text-xs text-gray-500">Room: {roomCode}</div>
        </div>
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
      `}</style>
    </div>
  );
}