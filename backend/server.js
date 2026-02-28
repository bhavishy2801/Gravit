import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { connectPostgres, getPool, initSchema } from './config/database.js';
import { connectMongo } from './config/mongodb.js';
import { setupSocketHandlers } from './socket/handlers.js';
import { startCronJobs } from './cron/index.js';

import authRoutes from './routes/auth.js';
import postRoutes from './routes/posts.js';
import commentRoutes from './routes/comments.js';
import channelRoutes from './routes/channels.js';
import dashboardRoutes from './routes/dashboard.js';
import userRoutes from './routes/users.js';
import notificationRoutes from './routes/notifications.js';
import serverRoutes from './routes/servers.js';
import authorityRoutes from './routes/authorities.js';

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
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting (relaxed in development)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: process.env.NODE_ENV === 'production' ? 200 : 10000,
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
app.use('/api/notifications', notificationRoutes);
app.use('/api/servers', serverRoutes);
app.use('/api/authorities', authorityRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Serve Frontend in Production ───────────────────
if (process.env.NODE_ENV === 'production') {
  const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
  app.use(express.static(frontendDist));

  // SPA fallback — serve index.html for any non-API route
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

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

    // Ensure tables exist (safe — uses CREATE IF NOT EXISTS)
    await initSchema();

    // Seed institution & channels if missing
    const { seedIfEmpty } = await import('./db/seed.js');
    await seedIfEmpty(getPool());

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
