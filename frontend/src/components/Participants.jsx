import { useEffect, useState } from "react";
import { useSubscription } from "@apollo/client";
import { toast } from "react-hot-toast";
import { Users, UserCheck, Crown, Mic, MicOff, Volume2, VolumeX, MoreVertical } from "lucide-react";
import {
  PARTICIPANT_JOINED,
  PARTICIPANT_LEFT,
  PARTICIPANTS_UPDATED,
} from "../graphql/subscriptions";

export default function Participants({
  roomCode,
  participantId,
  initialParticipants,
  participants,
  setParticipants,
  roomAdminId = null
}) {

  // Initialize participants on mount
  useEffect(() => {
    if (initialParticipants) {
      setParticipants(initialParticipants);
      
    }
  }, [initialParticipants, setParticipants]);

  // New participant joined
  useSubscription(PARTICIPANT_JOINED, {
    variables: { roomCode },
    onSubscriptionData: ({ subscriptionData }) => {
      const newParticipant = subscriptionData.data?.participantJoined;
      if (newParticipant) {
        toast.success(`${newParticipant.name} joined!`, {
          icon: '👋',
          style: {
            background: '#065f46',
            color: '#ffffff',
            border: '1px solid #10b981'
          }
        });
       
      }
    },
  });

  // Participant left
  useSubscription(PARTICIPANT_LEFT, {
    variables: { roomCode },
    onSubscriptionData: ({ subscriptionData }) => {
      const leftParticipant = subscriptionData.data?.participantLeft;
      if (leftParticipant?.id !== participantId) {
        toast.success(`${leftParticipant.name} left the room.`, {
          icon: '👋',
          style: {
            background: '#7f1d1d',
            color: '#ffffff',
            border: '1px solid #ef4444'
          }
        });
       
      }
    },
  });

  // Participant list updated
  useSubscription(PARTICIPANTS_UPDATED, {
    variables: { roomCode },
    onSubscriptionData: ({ subscriptionData }) => {
      const updated = subscriptionData.data?.participantsUpdated;
      if (updated) {
        console.log("👥 Participants updated:", updated);
        setParticipants(updated);
        
       
      }
    },
  });

  
  const getInitials = (name) => {
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .substring(0, 2);
  };

  const getAvatarColor = (id) => {
    const colors = [
      'from-green-500 to-emerald-500',
      'from-blue-500 to-cyan-500', 
      'from-purple-500 to-violet-500',
      'from-pink-500 to-rose-500',
      'from-orange-500 to-amber-500',
      'from-teal-500 to-cyan-500'
    ];
    const index = parseInt(id.slice(-1)) % colors.length;
    return colors[index];
  };

  const sortedParticipants = [...participants].sort((a, b) => {
    // Admin first
    if (roomAdminId && a.id === roomAdminId) return -1;
    if (roomAdminId && b.id === roomAdminId) return 1;
    
    // Current user second
    if (a.id === participantId) return -1;
    if (b.id === participantId) return 1;
   
    
    // Alphabetical by name
    return a.name.localeCompare(b.name);
  });

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
                      ? 'border-green-500/50 bg-green-500/10' 
                      : 'border-green-500/10 hover:border-green-500/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="relative">
                      <div className={`w-12 h-12 bg-gradient-to-r ${avatarColor} rounded-full flex items-center justify-center font-bold text-white text-sm shadow-lg`}>
                        {getInitials(participant.name)}
                      </div>
                      
                   
                    </div>

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className={`font-medium text-sm ${
                          isCurrentUser ? 'text-green-300' : 'text-white'
                        } truncate`}>
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

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* Voice Status (placeholder for future voice chat) */}
                      <button className="w-8 h-8 bg-gray-700/50 hover:bg-gray-600 rounded-lg flex items-center justify-center transition-colors">
                        <Mic size={14} className="text-gray-400" />
                      </button>
                      
                      {/* More Options */}
                      {!isCurrentUser && (
                        <button className="w-8 h-8 bg-gray-700/50 hover:bg-gray-600 rounded-lg flex items-center justify-center transition-colors">
                          <MoreVertical size={14} className="text-gray-400" />
                        </button>
                      )}
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
              <p className="text-green-300/50 text-sm">Waiting for people to join</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer Stats */}
      <div className="border-t border-green-500/20 p-4 bg-black/20">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
          
            <span className="text-gray-400">
              {participants.length} total
            </span>
          </div>
          <div className="text-xs text-gray-500">
            Room: {roomCode}
          </div>
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