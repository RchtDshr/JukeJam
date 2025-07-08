export function createSyncWS(roomCode, userId, onSyncReceived) {
  let ws = null;
  let reconnectTimeout = null;
  let isConnected = false;
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 3;

  const wsUrl = 'ws://localhost:3000';

  function connect() {
    console.log('=== WebSocket Connection Attempt ===');
    console.log('URL:', wsUrl);
    console.log('Attempt:', reconnectAttempts + 1);

    try {
      ws = new WebSocket(wsUrl);

      const connectionTimeout = setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          console.log('❌ Connection timeout after 5 seconds');
          ws.close();
        }
      }, 5000);

      ws.addEventListener('open', () => {
        console.log('✅ WebSocket OPENED successfully');
        clearTimeout(connectionTimeout);
        isConnected = true;
        reconnectAttempts = 0;

        // Send JOIN_ROOM message to backend
        const joinMessage = {
          type: 'JOIN_ROOM',
          roomCode,
          userId,
        };
        console.log('📤 Sending JOIN_ROOM message:', joinMessage);
        ws.send(JSON.stringify(joinMessage));
      });

      ws.addEventListener('message', (event) => {
        console.log('📨 Received message:', event.data);
        try {
          const message = JSON.parse(event.data);

          if (message.type === 'PLAYBACK_UPDATE' && message.roomCode === roomCode) {
            console.log('🎬 Playback sync received:', message.data);
            onSyncReceived(message.data); // { action, currentTime }
          }
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      });

      ws.addEventListener('close', (event) => {
        console.warn('=== WebSocket CLOSED ===');
        console.warn('Code:', event.code, 'Reason:', event.reason, 'Clean:', event.wasClean);
        clearTimeout(connectionTimeout);
        isConnected = false;

        if (event.code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
          const delay = 2000;
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

  // Directly connect without HTTP test (optional: remove HTTP check)
  connect();

  return {
    sendSync: (action, currentTime) => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        const syncMessage = {
          type: 'PLAYBACK_UPDATE',
          roomCode,
          action,
          currentTime,
        };
        console.log('📤 Sending PLAYBACK_UPDATE:', syncMessage);
        ws.send(JSON.stringify(syncMessage));
      } else {
        console.warn('❌ Cannot send sync - WebSocket not connected');
      }
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
