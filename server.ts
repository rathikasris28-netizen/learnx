import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import path from 'node:path';

import { initDatabase } from './server/db.ts';
import { apiRouter } from './server/routes.ts';

// Initialize database schema and system seeds
initDatabase();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// CORS configuration
// Allows the Vercel frontend to communicate with the Render backend.
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// Parse JSON request bodies
app.use(express.json());

// RESTful API Router
app.use('/api', apiRouter);

// Vite middleware integration for development
const isProduction = process.env.NODE_ENV === 'production';

async function startServer() {
  if (!isProduction) {
    // Development mode
    const { createServer: createViteServer } = await import('vite');

    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT,
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);
  } else {
    // Production mode
    app.use(express.static(path.resolve(process.cwd(), 'dist')));

    // SPA fallback
    app.get('*', (_req, res) => {
      res.sendFile(
        path.resolve(process.cwd(), 'dist', 'index.html')
      );
    });
  }

  // Start server
  app.listen(PORT, '0.0.0.0', () => {
    console.log(
      `[LearnX] Production server listening at http://0.0.0.0:${PORT}`
    );
  });
}

// Start application
startServer().catch((err) => {
  console.error('[LearnX] Fatal server error:', err);
  process.exit(1);
});