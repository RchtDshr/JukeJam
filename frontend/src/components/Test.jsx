import React, { useEffect, useRef, useState } from 'react';

const Test = () => {
  const socketRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    const socket = new WebSocket('ws://localhost:3000');
    socketRef.current = socket;

    socket.onopen = () => {
      console.log('✅ Connected to WS 3000');
    };

    socket.onmessage = (event) => {
      console.log('📩 Message received:', event.data);
      setMessages(prev => [...prev, event.data]);
    };

    socket.onclose = () => {
      console.log('❌ WebSocket closed');
    };

    socket.onerror = (err) => {
      console.error('💥 WebSocket error:', err);
    };

    return () => {
      socket.close();
    };
  }, []);

  const handleSend = () => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(inputValue);
      setMessages(prev => [...prev, `You: ${inputValue}`]);  // Local echo
      setInputValue('');
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>🧪 WebSocket Broadcast Test</h2>

      <div style={{ marginBottom: '10px' }}>
        <input
          type="text"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          placeholder="Type message..."
        />
        <button onClick={handleSend}>Send</button>
      </div>

      <div style={{ border: '1px solid #ccc', padding: '10px' }}>
        <h4>Messages:</h4>
        {messages.map((msg, idx) => (
          <div key={idx}>{msg}</div>
        ))}
      </div>
    </div>
  );
};

export default Test;
