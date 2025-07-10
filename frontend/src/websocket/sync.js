// Enhanced WebSocket sync with callback update support
export function createSyncWS(roomCode, userId, onSyncReceived) {
  let ws = null;
  let reconnectTimeout = null;
  let isConnected = false;
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 5;
  let currentCallback = onSyncReceived; // Store the current callback

  const wsUrl = 'ws://localhost:3000';

  function connect() {
    console.log('=== WebSocket Connection Attempt ===');
    console.log('URL:', wsUrl);
    console.log('Room Code:', roomCode);
    console.log('User ID:', userId);
    console.log('Attempt:', reconnectAttempts + 1);

    try {
      ws = new WebSocket(wsUrl);

      const connectionTimeout = setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          console.log('❌ Connection timeout after 10 seconds');
          ws.close();
        }
      }, 10000);

      ws.addEventListener('open', () => {
        console.log('✅ WebSocket OPENED successfully');
        clearTimeout(connectionTimeout);
        isConnected = true;
        reconnectAttempts = 0;

        const joinMessage = {
          type: 'JOIN_ROOM',
          roomCode,
          userId,
          timestamp: Date.now()
        };
        console.log('📤 Sending JOIN_ROOM message:', joinMessage);
        ws.send(JSON.stringify(joinMessage));

      });

      ws.addEventListener('message', (event) => {
        console.log('📨 Raw message received:', event.data);
        try {
          const message = JSON.parse(event.data);
          console.log('📨 Parsed message:', message);

          if (message.type === 'PLAYBACK_UPDATE' && message.roomCode === roomCode) {
            console.log('🎬 Playback sync received:', message.data || message);
            const syncData = message.data || {
              action: message.action,
              currentTime: message.currentTime
            };
            
            // Use the current callback reference
            if (currentCallback && typeof currentCallback === 'function') {
              console.log('🎬 Calling sync callback with:', syncData);
              currentCallback(syncData);
            } else {
              console.warn('❌ No valid callback function available');
            }
          } else if (message.type === 'ROOM_JOINED') {
            console.log('✅ Successfully joined room:', message.roomCode);
          } else if (message.type === 'ERROR') {
            console.error('❌ Server error:', message.message);
          } else {
            console.log('📨 Unknown message type:', message.type);
          }
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
          console.error('Raw data:', event.data);
        }
      });

      ws.addEventListener('close', (event) => {
        console.warn('=== WebSocket CLOSED ===');
        console.warn('Code:', event.code, 'Reason:', event.reason, 'Clean:', event.wasClean);
        clearTimeout(connectionTimeout);
        isConnected = false;


        if (event.code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
          const delay = Math.min(2000 * Math.pow(2, reconnectAttempts), 30000);
          console.log(`⏳ Reconnecting in ${delay}ms... (${reconnectAttempts + 1}/${maxReconnectAttempts})`);
          reconnectTimeout = setTimeout(() => {
            reconnectAttempts++;
            connect();
          }, delay);
        } else {
          console.warn('❌ Max reconnection attempts reached or closed normally');
        }
      });

      ws.addEventListener('error', (error) => {
        console.error('=== WebSocket ERROR ===');
        console.error(error);
        clearTimeout(connectionTimeout);
        isConnected = false;
      });

    } catch (error) {
      console.error('❌ WebSocket connection failed:', error);
    }
  }

  connect();

  return {
    sendSync: (action, currentTime) => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        const syncMessage = {
          type: 'PLAYBACK_UPDATE',
          roomCode,
          action,
          currentTime,
          timestamp: Date.now()
        };
        console.log('📤 Sending PLAYBACK_UPDATE:', syncMessage);
        ws.send(JSON.stringify(syncMessage));
      } else {
        console.warn('❌ Cannot send sync - WebSocket not connected');
      }
    },

    // Method to update the callback function
    updateCallback: (newCallback) => {
      console.log('🔄 Updating WebSocket callback');
      currentCallback = newCallback;
    },

    close: () => {
      console.log('🔌 Manually closing WebSocket');
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) ws.close(1000, 'Manual close');
    },

    isConnected: () => isConnected,

    getState: () => ({
      connected: isConnected,
      readyState: ws ? ws.readyState : null,
      url: ws ? ws.url : null
    }),
  };
}