import type { VercelRequest, VercelResponse } from '@vercel/node';

import app from '../server/app.ts';
import { initDatabase } from '../server/db.ts';
import { provisionDemoAccounts } from '../server/demoAccounts.ts';

let initializationPromise: Promise<void> | null = null;

function initializeBackend(): Promise<void> {
  if (!initializationPromise) {
    initializationPromise = (async () => {
      await initDatabase();
      await provisionDemoAccounts();
      console.log('[LearnX] Backend initialization completed.');
    })().catch((error) => {
      initializationPromise = null;
      throw error;
    });
  }

  return initializationPromise;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  try {
    await initializeBackend();
    return app(req, res);
  } catch (error) {
    console.error('[LearnX] Backend initialization failed.', error);

    return res.status(500).json({
      error: 'Backend initialization failed.',
    });
  }
}