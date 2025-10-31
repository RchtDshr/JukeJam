import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export const useRoomStore = create(
  subscribeWithSelector((set, get) => ({
    // Room state
    currentRoom: null,
    participants: [],
    roomCode: null,
    participantId: null,
    isAdmin: false,
    
    // Player state
    currentSong: null,
    songQueue: [],
    isPlayerReady: false,
    syncWS: null,
    
    // UI state
    activeTab: 'participants',
    
    // Actions
    setRoom: (room) => set((state) => ({
      currentRoom: room,
      // Update isAdmin when room changes
      isAdmin: state.participantId ? room?.admin_id?.id === state.participantId : false
    })),
    
    setParticipants: (participants) => set({ participants }),
    
    addParticipant: (participant) => set((state) => ({
      participants: [...state.participants.filter(p => p.id !== participant.id), participant]
    })),
    
    removeParticipant: (participantId) => set((state) => ({
      participants: state.participants.filter(p => p.id !== participantId)
    })),
    
    setRoomCode: (roomCode) => set({ roomCode }),
    
    setParticipantId: (participantId) => set((state) => ({
      participantId,
      // Update isAdmin when participant ID changes
      isAdmin: state.currentRoom?.admin_id?.id === participantId
    })),
    
    setCurrentSong: (song) => set({ currentSong: song }),
    
    setSongQueue: (queue) => set({ songQueue: queue }),
    
    setIsPlayerReady: (ready) => set({ isPlayerReady: ready }),
    
    setSyncWS: (ws) => set({ syncWS: ws }),
    
    setActiveTab: (tab) => set({ activeTab: tab }),
    
    // Explicitly set admin status
    setIsAdmin: (isAdmin) => set({ isAdmin }),
    
    // Helper actions
    initializeRoom: (room, participantId) => set({
      currentRoom: room,
      participants: room.members || [],
      roomCode: room.room_code,
      participantId,
      isAdmin: room.admin_id?.id === participantId
    }),
    
    clearRoom: () => set({
      currentRoom: null,
      participants: [],
      roomCode: null,
      participantId: null,
      isAdmin: false,
      currentSong: null,
      songQueue: [],
      isPlayerReady: false,
      syncWS: null
    }),
    
    // Update admin status based on current state
    updateAdminStatus: () => set((state) => ({
      isAdmin: state.currentRoom?.admin_id?.id === state.participantId
    })),
    
    // Getters
    getIsAdmin: () => {
      const state = get();
      return state.currentRoom?.admin_id?.id === state.participantId;
    },
    
    getSortedParticipants: () => {
      const state = get();
      // Check if participants exists and is an array
      if (!state.participants || !Array.isArray(state.participants)) {
        return [];
      }
      return [...state.participants].sort((a, b) => {
        // Admin first
        if (state.currentRoom?.admin_id?.id && a.id === state.currentRoom.admin_id.id) return -1;
        if (state.currentRoom?.admin_id?.id && b.id === state.currentRoom.admin_id.id) return 1;
        
        // Current user second
        if (a.id === state.participantId) return -1;
        if (b.id === state.participantId) return 1;
        
        // Alphabetical by name
        return a.name.localeCompare(b.name);
      });
    },

    // Debug helper
    getDebugInfo: () => {
      const state = get();
      return {
        roomCode: state.roomCode,
        participantId: state.participantId,
        isAdmin: state.isAdmin,
        computedIsAdmin: state.currentRoom?.admin_id?.id === state.participantId,
        adminId: state.currentRoom?.admin_id?.id,
        currentSong: state.currentSong?.title,
        queueLength: state.songQueue?.length,
        isPlayerReady: state.isPlayerReady,
        syncWSConnected: state.syncWS?.isConnected?.()
      };
    }
  }))
);