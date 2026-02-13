import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import prisma from './lib/prisma.js';

// Routes
import configRoutes from './routes/config.js';
import memoriesRoutes from './routes/memories.js';
import timelineRoutes from './routes/timeline.js';
import lettersRoutes from './routes/letters.js';
import couponsRoutes from './routes/coupons.js';
import statsRoutes from './routes/stats.js';
import uploadRoutes from './routes/upload.js';
import instagramRoutes from './routes/instagram.js';
import { antibotMiddleware } from './middleware/antibot.js';

const app = express();

// ─── CORS (สำคัญที่สุด) ────────────────────────────────────────────
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://narinyland.vercel.app',
    'https://narinyland-server.vercel.app',
  ],
  credentials: true,
}));

// ─── Body Parser ────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Logger ─────────────────────────────────────────────────────────
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ─── IMPORTANT: allow preflight ก่อน antibot ───────────────────────
app.use('/api', (req, res, next) => {
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// ─── AntiBot ────────────────────────────────────────────────────────
app.use('/api', antibotMiddleware);

// ─── API Routes ─────────────────────────────────────────────────────
app.use('/api/config', configRoutes);
app.use('/api/memories', memoriesRoutes);
app.use('/api/timeline', timelineRoutes);
app.use('/api/letters', lettersRoutes);
app.use('/api/coupons', couponsRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/instagram', instagramRoutes);

// ─── Health Check ───────────────────────────────────────────────────
app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      database: 'disconnected',
    });
  }
});

// ─── 404 ────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ❌ ห้าม app.listen บน Vercel
// ✅ export app อย่างเดียว
export default app;