import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { generateSpeech } from '../lib/elevenlabs.js';
import { heavyLimiter } from '../middleware/rate-limit.js';

const previewSchema = z.object({
  voiceId: z.string().trim().min(1, 'voiceId is required'),
  text: z.string().trim().min(1).max(500, 'Preview text must be 500 chars or fewer'),
  language: z.enum(['es', 'en']).default('es'),
});

export const previewRouter = Router();

previewRouter.post(
  '/preview-voice',
  heavyLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { voiceId, text, language } = previewSchema.parse(req.body);

      const audio = await generateSpeech({
        voiceId,
        text,
        language,
        speed: 'normal',
      });

      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Content-Length', String(audio.length));
      res.send(audio);
    } catch (err) {
      next(err);
    }
  },
);
