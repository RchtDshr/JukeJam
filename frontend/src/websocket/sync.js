export function createSyncWS(roomId, onSyncReceived) {
  let ws = null;
  let reconnectTimeout = null;
  let isConnected = false;
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 3;

  async function testHttpConnection() {
    try {
      console.log('Testing HTTP connection to backend...');
      const response = await fetch('http://localhost:4000/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: '{ __typename }' })
      });
      console.log('✅ HTTP connection successful:', response.status);
      return true;
    } catch (error) {
      console.error('❌ HTTP connection failed:', error);
      return false;
    }
  }

  function connect() {
    const wsUrl = 'ws://localhost:4000/sync';
    
    console.log('=== WebSocket Connection Attempt ===');
    console.log('URL:', wsUrl);
    console.log('Attempt:', reconnectAttempts + 1);
    
    try {
      ws = new WebSocket(wsUrl);
      
      console.log('WebSocket created, readyState:', ws.readyState);
      console.log('0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED');

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
        
        const joinMessage = JSON.stringify({ type: 'join', roomId });
        console.log('Sending join message:', joinMessage);
        ws.send(joinMessage);
      });

      ws.addEventListener('message', (event) => {
        console.log('📨 Received message:', event.data);
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'sync') {
            onSyncReceived(data.payload);
          } else if (data.type === 'joined') {
            console.log(`✅ Successfully joined room: ${data.roomId}`);
          }
        } catch (error) {
          console.error('❌ Error parsing message:', error);
        }
      });

      ws.addEventListener('close', (event) => {
        console.log('=== WebSocket CLOSED ===');
        console.log('Code:', event.code);
        console.log('Reason:', event.reason);
        console.log('Was clean:', event.wasClean);
        
        // Common close codes:
        // 1000 = Normal closure
        // 1006 = Abnormal closure (no close frame received)
        // 1011 = Server error
        // 1012 = Service restart
        
        clearTimeout(connectionTimeout);
        isConnected = false;
        
        if (event.code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
          const delay = 2000; // Fixed 2 second delay for debugging
          console.log(`⏳ Reconnecting in ${delay}ms... (${reconnectAttempts + 1}/${maxReconnectAttempts})`);
          
          reconnectTimeout = setTimeout(() => {
            reconnectAttempts++;
            connect();
          }, delay);
        } else if (reconnectAttempts >= maxReconnectAttempts) {
          console.log('❌ Max reconnection attempts reached');
        }
      });

      ws.addEventListener('error', (error) => {
        console.log('=== WebSocket ERROR ===');
        console.log('Error event:', error);
        console.log('WebSocket state:', ws.readyState);
        clearTimeout(connectionTimeout);
        isConnected = false;
      });

    } catch (error) {
      console.error('❌ Failed to create WebSocket:', error);
    }
  }

  // Test HTTP connection first, then try WebSocket
  testHttpConnection().then((httpWorks) => {
    if (httpWorks) {
      console.log('HTTP works, attempting WebSocket...');
      connect();
    } else {
      console.log('❌ HTTP doesn\'t work, WebSocket will likely fail too');
      console.log('Check if backend is running and ports are correctly mapped');
    }
  });

  return {
    sendSync: (payload) => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        const message = JSON.stringify({ type: 'sync', payload });
        console.log('📤 Sending sync:', message);
        ws.send(message);
      } else {
        console.warn('❌ Cannot send sync - WebSocket not connected (state: ' + (ws ? ws.readyState : 'null') + ')');
      }
    },
    
    close: () => {
      console.log('🔌 Manually closing WebSocket');
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (ws) {
        ws.close(1000, 'Manual close');
      }
    },
    
    isConnected: () => isConnected,
    
    getState: () => ({
      connected: isConnected,
      readyState: ws ? ws.readyState : null,
      url: ws ? ws.url : null
    })
  };
}