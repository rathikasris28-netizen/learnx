
import 'dotenv/config';

import express from 'express';
import path from 'node:path';

import { initDatabase } from './server/db.ts';
import app from './server/app.ts';

const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

/**
 * Start the LearnX application.
 */
async function startServer(): Promise<void> {
  try {
    /**
     * Connect to Supabase PostgreSQL before starting
     * the HTTP server.
     *
     * No schema creation.
     * No migrations.
     * No demo or mock accounts.
     *
     * Only real user accounts are used.
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
     * Start the HTTP server only after the database
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

startServer();
