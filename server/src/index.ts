import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import prisma from './lib/prisma.js';

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

/* =========================
   ✅ CORS (FIX จริง)
========================= */
const corsOptions = {
  origin: 'https://narinyland.vercel.app',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // ⭐ สำคัญมาก (preflight)

/* =========================
   Body
========================= */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/* =========================
   Logger
========================= */
app.use((req, _res, next) => {
  console.log(req.method, req.path);
  next();
});

/* =========================
   AntiBot (หลัง CORS เท่านั้น)
========================= */
app.use('/api', antibotMiddleware);

/* =========================
   Routes
========================= */
app.use('/api/config', configRoutes);
app.use('/api/memories', memoriesRoutes);
app.use('/api/timeline', timelineRoutes);
app.use('/api/letters', lettersRoutes);
app.use('/api/coupons', couponsRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/instagram', instagramRoutes);

/* =========================
   Health
========================= */
app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok' });
  } catch {
    res.status(503).json({ status: 'db error' });
  }
});

/* =========================
   404
========================= */
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

export default app;