import { Router, type Request, type Response, type NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { ApiError } from '../lib/api-error.js';
import { generateSpeech } from '../lib/elevenlabs.js';
import { getSessionStore } from '../lib/sessions.js';
import { setAudio, getAudio } from '../lib/audio-cache.js';
import { heavyLimiter } from '../middleware/rate-limit.js';
import type { SessionRecord } from '../types.js';

const generateSchema = z.object({
  doctorName: z.string().trim().min(2).max(80),
  voiceId: z.string().trim().min(1, 'voiceId is required'),
  instructionEs: z
    .string()
    .trim()
    .min(1, 'Spanish instruction text is required')
    .max(3000, 'Instruction text must be 3000 characters or fewer'),
  instructionEn: z
    .string()
    .trim()
    .min(1, 'English instruction text is required')
    .max(3000, 'Instruction text must be 3000 characters or fewer'),
});

const audioQuerySchema = z.object({
  lang: z.enum(['es', 'en']),
});

export const generateRouter = Router();

generateRouter.post(
  '/generate-instructions',
  heavyLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { doctorName, voiceId, instructionEs, instructionEn } =
        generateSchema.parse(req.body);

      const [audioEs, audioEn] = await Promise.all([
        generateSpeech({
          voiceId,
          text: instructionEs,
          language: 'es',
          speed: 'normal',
        }),
        generateSpeech({
          voiceId,
          text: instructionEn,
          language: 'en',
          speed: 'normal',
        }),
      ]);

      const sessionId = randomUUID();
      const record: SessionRecord = {
        doctorName,
        voiceId,
        agentId: null,
        instructionEs,
        instructionEn,
        createdAt: new Date().toISOString(),
      };

      await getSessionStore().set(sessionId, record);
      setAudio(sessionId, { es: audioEs, en: audioEn });

      res.json({
        sessionId,
        audioUrlEs: `/api/sessions/${sessionId}/audio?lang=es`,
        audioUrlEn: `/api/sessions/${sessionId}/audio?lang=en`,
      });
    } catch (err) {
      next(err);
    }
  },
);

generateRouter.get(
  '/sessions/:id/audio',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { lang } = audioQuerySchema.parse(req.query);
      const sessionId = String(req.params.id);

      const session = await getSessionStore().get(sessionId);
      if (!session) {
        throw new ApiError(
          404,
          'session_not_found',
          'This session was not found or has expired. Ask your clinician to generate a new link.',
        );
      }

      let audio = getAudio(sessionId, lang);
      if (!audio) {
        // Audio cache lost (server restart). Regenerate from session metadata
        // so the patient link keeps working.
        const text = lang === 'es' ? session.instructionEs : session.instructionEn;
        audio = await generateSpeech({
          voiceId: session.voiceId,
          text,
          language: lang,
          speed: 'normal',
        });

        const otherLang = lang === 'es' ? 'en' : 'es';
        const otherCached = getAudio(sessionId, otherLang);
        if (otherCached) {
          setAudio(sessionId, {
            es: lang === 'es' ? audio : otherCached,
            en: lang === 'en' ? audio : otherCached,
          });
        }
      }

      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Cache-Control', 'private, max-age=300');
      res.setHeader('Content-Length', String(audio.length));
      res.send(audio);
    } catch (err) {
      next(err);
    }
  },
);

