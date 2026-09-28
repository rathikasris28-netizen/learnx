import express from 'express';
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config();

import { initDatabase } from './server/db.ts';
import { apiRouter } from './server/routes.ts';

// Initialize SQLite schema and system seeds
initDatabase();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// RESTful API Router
app.use('/api', apiRouter);

// Vite middleware integration for SPA in development
const isProduction = process.env.NODE_ENV === 'production';

async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0', port: PORT },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[LearnX] Production server listening at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[LearnX] Fatal server error:', err);
  process.exit(1);
});
