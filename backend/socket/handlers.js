import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

/**
 * Socket.io event handlers
 * Namespaces: posts (urgency+upvotes), status (state changes), verify (polls)
 */
export function setupSocketHandlers(io) {
  // Connection auth middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        socket.userId = decoded.id;
        socket.userRole = decoded.role;
        socket.pseudonym = decoded.pseudonym;
      } catch {
        // Allow connection without auth (read-only)
      }
    }
    next();
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id} (${socket.pseudonym || 'anonymous'})`);

    // Join channel rooms
    socket.on('join:channel', (channelId) => {
      socket.join(`channel:${channelId}`);
    });

    socket.on('leave:channel', (channelId) => {
      socket.leave(`channel:${channelId}`);
    });

    // Join post room (for real-time updates on a specific post)
    socket.on('join:post', (postId) => {
      socket.join(`post:${postId}`);
    });

    socket.on('leave:post', (postId) => {
      socket.leave(`post:${postId}`);
    });

    // Join/leave server channel rooms (for real-time chat)
    socket.on('join:server-channel', (channelId) => {
      socket.join(`server-channel:${channelId}`);
    });

    socket.on('leave:server-channel', (channelId) => {
      socket.leave(`server-channel:${channelId}`);
    });

    // Presence
    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });

  // Log connected client count periodically
  setInterval(() => {
    const count = io.engine?.clientsCount || 0;
    if (count > 0) {
      console.log(`📡 Active socket connections: ${count}`);
    }
  }, 60000);
}
