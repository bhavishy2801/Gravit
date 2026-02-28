import { createContext, useContext, useEffect, useRef, useState, useMemo } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

export function SocketProvider({ children }) {
  const { token } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      setConnected(true);
      console.log('🔌 Socket connected');
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [token]);

  // Memoize the context value so helpers have STABLE references.
  // They only get new identities when 'connected' changes (connect / reconnect),
  // which correctly re-triggers consumer useEffects that depend on them.
  const value = useMemo(() => {
    const s = socketRef.current;
    return {
      socket: s,
      connected,
      joinChannel:       (id) => s?.emit('join:channel', id),
      leaveChannel:      (id) => s?.emit('leave:channel', id),
      joinPost:          (id) => s?.emit('join:post', id),
      leavePost:         (id) => s?.emit('leave:post', id),
      joinServerChannel: (id) => s?.emit('join:server-channel', id),
      leaveServerChannel:(id) => s?.emit('leave:server-channel', id),
      joinServer:        (id) => s?.emit('join:server', id),
      leaveServer:       (id) => s?.emit('leave:server', id),
      joinServerPost:    (id) => s?.emit('join:server-post', id),
      leaveServerPost:   (id) => s?.emit('leave:server-post', id),
      emitTypingStart:   (channelId) => s?.emit('typing:start', { channelId }),
      emitTypingStop:    (channelId) => s?.emit('typing:stop', { channelId }),
      on:  (event, handler) => s?.on(event, handler),
      off: (event, handler) => s?.off(event, handler),
    };
  }, [connected]);

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used within SocketProvider');
  return context;
}
