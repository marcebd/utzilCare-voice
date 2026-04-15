import express, { type Request, type Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { apiLimiter } from './middleware/rate-limit.js';
import { errorHandler } from './middleware/error-handler.js';
import { getSessionStore } from './lib/sessions.js';
import { cloneRouter } from './routes/clone.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../../.env') });

const app = express();
const PORT = Number(process.env.PORT) || 4000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json({ limit: '1mb' }));
app.use('/api', apiLimiter);

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'utzilcare-voice-server',
    timestamp: new Date().toISOString(),
  });
});

// Initialize session store at boot so the in-memory fallback warning fires once.
getSessionStore();

app.use('/api', cloneRouter);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`utzilcare-voice server listening on http://localhost:${PORT}`);
});
