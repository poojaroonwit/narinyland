import 'dotenv/config';
import express from 'express';
import cors from 'cors'; // Restored cors package
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
   ✅ CORS (Standard Package)
========================= */
// origin: true matches the request origin (reflects it), effectively allowing all with credentials
const corsConfigs = { 
  origin: true, 
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsConfigs));
app.options('*', cors(corsConfigs));

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
   Router Setup
========================= */
const router = express.Router();

// Apply AntiBot to all API routes
router.use(antibotMiddleware);

// Define routes on the router (without /api prefix)
router.use('/config', configRoutes);
router.use('/memories', memoriesRoutes);
router.use('/timeline', timelineRoutes);
router.use('/letters', lettersRoutes);
router.use('/coupons', couponsRoutes);
router.use('/stats', statsRoutes);
router.use('/upload', uploadRoutes);
router.use('/instagram', instagramRoutes);

// Mount the router at both /api and root / to handle Vercel path rewriting behavior
// consistent with whether it strips the prefix or not.
app.use('/api', router);
app.use('/', router);

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

const PORT = parseInt(process.env.PORT || '4000', 10);

if (process.env.NODE_ENV !== 'production') {
  const startServer = async () => {
    try {
      await prisma.$connect();
      console.log('✅ Database connected');
      app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
      });
    } catch (error) {
      console.error('❌ Failed to start server:', error);
    }
  };
  startServer();
}

export default app;