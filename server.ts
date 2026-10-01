import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import path from 'node:path';

import { initDatabase } from './server/db.ts';
import { apiRouter } from './server/routes.ts';
const app = express();
const PORT = Number(process.env.PORT) || 3000;

const isProduction = process.env.NODE_ENV === 'production';

/**
 * CORS configuration
 *
 * Allows the frontend to communicate with the LearnX backend.
 *
 * For production, set FRONTEND_URL in the backend environment:
 *
 * FRONTEND_URL=https://your-frontend-domain.com
 */
const frontendUrl = process.env.FRONTEND_URL;

app.use(
  cors({
    origin: frontendUrl || true,
    credentials: true,
  }),
);

/**
 * Parse JSON request bodies.
 */
app.use(express.json());

/**
 * LearnX REST API.
 */
app.use('/api', apiRouter);

/**
 * Start the application.
 */
async function startServer(): Promise<void> {
  try {
    /**
     * Connect to Supabase PostgreSQL before starting
     * the HTTP server.
     *
     * No schema creation.
     * No migrations.
     * No seed/demo data.
     */
    await initDatabase();

    if (!isProduction) {
      /**
       * Development mode
       *
       * Vite serves the React frontend through middleware.
       */
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
      /**
       * Production mode
       *
       * Serve the built React application.
       */
      const distPath = path.resolve(process.cwd(), 'dist');

      app.use(express.static(distPath));

      /**
       * SPA fallback.
       */
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }

    /**
     * Start HTTP server only after the database
     * connection has been successfully established.
     */
    app.listen(PORT, '0.0.0.0', () => {
      console.log(
        `[LearnX] Server listening on http://0.0.0.0:${PORT}`,
      );

      console.log(
        `[LearnX] Mode: ${
          isProduction ? 'production' : 'development'
        }`,
      );

      console.log('[LearnX] Database: Supabase PostgreSQL');
      console.log('[LearnX] API: /api');
    });
  } catch (error) {
    console.error('[LearnX] Failed to start server.');
    console.error(error);

    process.exit(1);
  }
}

/**
 * Graceful shutdown.
 *
 * Prisma shutdown handling is already registered in db.ts.
 */
startServer();
