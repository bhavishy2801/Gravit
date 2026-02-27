import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { connectPostgres, getPool } from './config/database.js';
import { connectMongo } from './config/mongodb.js';
import { setupSocketHandlers } from './socket/handlers.js';
import { startCronJobs } from './cron/index.js';

import authRoutes from './routes/auth.js';
import postRoutes from './routes/posts.js';
import commentRoutes from './routes/comments.js';
import channelRoutes from './routes/channels.js';
import dashboardRoutes from './routes/dashboard.js';
import userRoutes from './routes/users.js';

const app = express();
const httpServer = createServer(app);

// ─── Socket.io ──────────────────────────────────────
const io = new SocketServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Make io accessible to routes
app.set('io', io);

// ─── Middleware ──────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 200,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// ─── API Routes ─────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', userRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  });
});

// ─── Start Server ───────────────────────────────────
const PORT = process.env.PORT || 5000;

async function start() {
  try {
    // Connect databases
    await connectPostgres();
    console.log('✅ PostgreSQL connected');

    await connectMongo();
    console.log('✅ MongoDB connected');

    // Setup socket handlers
    setupSocketHandlers(io);
    console.log('✅ Socket.io handlers ready');

    // Start cron jobs
    startCronJobs(getPool(), io);
    console.log('✅ Cron jobs started');

    httpServer.listen(PORT, () => {
      console.log(`\n🚀 Gravit API running on http://localhost:${PORT}`);
      console.log(`📡 Socket.io ready on ws://localhost:${PORT}`);
      console.log(`🏛️  Institution: ${process.env.INSTITUTION_NAME || 'IIT Jodhpur'}`);
      console.log(`📧  Domain: @${process.env.ALLOWED_DOMAIN || 'iitj.ac.in'}\n`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

start();
