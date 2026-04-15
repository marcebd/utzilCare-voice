import { Router, type Request, type Response, type NextFunction } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { ApiError } from '../lib/api-error.js';
import { cloneVoice } from '../lib/elevenlabs.js';
import { heavyLimiter } from '../middleware/rate-limit.js';

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_MIME = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/webm',
  'audio/ogg',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1 },
});

const bodySchema = z.object({
  doctorName: z
    .string()
    .trim()
    .min(2, 'Doctor name must be at least 2 characters')
    .max(80, 'Doctor name must be 80 characters or fewer'),
});

export const cloneRouter = Router();

cloneRouter.post(
  '/clone-voice',
  heavyLimiter,
  upload.single('audio'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { doctorName } = bodySchema.parse(req.body);

      if (!req.file) {
        throw new ApiError(
          400,
          'validation_failed',
          'Missing audio file. Upload a 30–60 second sample as the "audio" field.',
        );
      }
      if (!ACCEPTED_MIME.has(req.file.mimetype)) {
        throw new ApiError(
          400,
          'validation_failed',
          `Unsupported audio format "${req.file.mimetype}". Use MP3, WAV, WebM, or OGG.`,
        );
      }

      const { voiceId } = await cloneVoice({
        name: doctorName,
        audio: {
          buffer: req.file.buffer,
          filename: req.file.originalname || 'sample',
          mimeType: req.file.mimetype,
        },
      });

      res.json({
        voiceId,
        previewText: 'Hola, soy su doctor. Estoy aquí para guiarle.',
      });
    } catch (err) {
      next(err);
    }
  },
);
