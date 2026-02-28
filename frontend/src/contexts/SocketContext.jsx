import { createContext, useContext, useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

export function SocketProvider({ children }) {
  const { token } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  // Monotonically increasing counter — increments on EVERY (re)connection so
  // consumer useEffects always re-fire and re-join rooms / re-register handlers.
  const [connectionId, setConnectionId] = useState(0);

  useEffect(() => {
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('🔌 Socket connected, id:', socket.id);
      setConnected(true);
      setConnectionId(prev => prev + 1);
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      setConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.error('🔌 Socket connection error:', err.message);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [token]);

  // Stable helpers that always delegate to socketRef.current at call-time.
  // We wrap them in useCallback so their identity only changes when
  // connectionId changes — this makes consumer useEffects re-fire on every
  // (re)connection, ensuring rooms are re-joined and handlers re-registered.

  /* eslint-disable react-hooks/exhaustive-deps */
  const joinChannel       = useCallback((id) => socketRef.current?.emit('join:channel', id),        [connectionId]);
  const leaveChannel      = useCallback((id) => socketRef.current?.emit('leave:channel', id),       [connectionId]);
  const joinPost          = useCallback((id) => socketRef.current?.emit('join:post', id),           [connectionId]);
  const leavePost         = useCallback((id) => socketRef.current?.emit('leave:post', id),          [connectionId]);
  const joinServerChannel = useCallback((id) => socketRef.current?.emit('join:server-channel', id), [connectionId]);
  const leaveServerChannel= useCallback((id) => socketRef.current?.emit('leave:server-channel', id),[connectionId]);
  const joinServer        = useCallback((id) => socketRef.current?.emit('join:server', id),         [connectionId]);
  const leaveServer       = useCallback((id) => socketRef.current?.emit('leave:server', id),        [connectionId]);
  const joinServerPost    = useCallback((id) => socketRef.current?.emit('join:server-post', id),    [connectionId]);
  const leaveServerPost   = useCallback((id) => socketRef.current?.emit('leave:server-post', id),   [connectionId]);
  const emitTypingStart   = useCallback((channelId) => socketRef.current?.emit('typing:start', { channelId }),  [connectionId]);
  const emitTypingStop    = useCallback((channelId) => socketRef.current?.emit('typing:stop',  { channelId }),  [connectionId]);

  const on  = useCallback((event, handler) => {
    socketRef.current?.on(event, handler);
  }, [connectionId]);

  const off = useCallback((event, handler) => {
    socketRef.current?.off(event, handler);
  }, [connectionId]);
  /* eslint-enable react-hooks/exhaustive-deps */

  const value = useMemo(() => ({
    socket: socketRef.current,
    connected,
    connectionId,
    joinChannel, leaveChannel,
    joinPost, leavePost,
    joinServerChannel, leaveServerChannel,
    joinServer, leaveServer,
    joinServerPost, leaveServerPost,
    emitTypingStart, emitTypingStop,
    on, off,
  }), [
    connected, connectionId,
    joinChannel, leaveChannel,
    joinPost, leavePost,
    joinServerChannel, leaveServerChannel,
    joinServer, leaveServer,
    joinServerPost, leaveServerPost,
    emitTypingStart, emitTypingStop,
    on, off,
  ]);

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
