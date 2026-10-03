import express from 'express';
import cors from 'cors';

import { apiRouter } from './routes.ts';

const app = express();

const frontendUrl = process.env.FRONTEND_URL;

app.use(
  cors({
    origin: frontendUrl || true,
    credentials: true,
  }),
);

app.use(express.json());

app.use('/api', apiRouter);

export default app;