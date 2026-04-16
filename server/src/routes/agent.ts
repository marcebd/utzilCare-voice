import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { ApiError } from '../lib/api-error.js';
import {
  createConversationalAgent,
  getConversationSignedUrl,
} from '../lib/elevenlabs.js';
import { getSessionStore } from '../lib/sessions.js';

const createAgentSchema = z.object({
  sessionId: z.string().trim().min(1, 'sessionId is required'),
});

function buildBilingualPrompt(
  doctorName: string,
  instructionEs: string,
  instructionEn: string,
): string {
  return [
    `LANGUAGE RULE (highest priority):`,
    `You MUST respond in the SAME language the patient uses.`,
    `If the patient speaks Spanish, respond ONLY in Spanish.`,
    `If the patient speaks English, respond ONLY in English.`,
    `Never mix languages. Never switch unless the patient switches first.`,
    ``,
    `You are Dr. ${doctorName}. You are a calm, caring doctor answering`,
    `follow-up questions about the discharge instructions below.`,
    ``,
    `=== INSTRUCCIONES (ESPAÑOL) ===`,
    instructionEs,
    ``,
    `=== INSTRUCTIONS (ENGLISH) ===`,
    instructionEn,
    ``,
    `SAFETY RULES (override everything except the language rule):`,
    `- If the patient describes: severe pain, heavy bleeding, fever above`,
    `  38.3°C / 101°F, difficulty breathing, signs of infection, fainting,`,
    `  chest pain, or any emergency:`,
    `  Spanish: "Esto es una emergencia. Por favor llame a su doctor o`,
    `  vaya a la clínica más cercana inmediatamente."`,
    `  English: "This is an emergency. Please call your doctor or go to`,
    `  the nearest clinic immediately."`,
    `- Do NOT diagnose. Do NOT change medication doses or timing.`,
    `- Do NOT add medical advice beyond the instructions above.`,
    `- Out-of-scope questions:`,
    `  Spanish: "Esa pregunta es mejor para su doctor directamente."`,
    `  English: "That question is best for your doctor directly."`,
    `- Keep answers under 3 sentences.`,
  ].join('\n');
}

export const agentRouter = Router();

agentRouter.post(
  '/create-agent',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId } = createAgentSchema.parse(req.body);

      const store = getSessionStore();
      const session = await store.get(sessionId);
      if (!session) {
        throw new ApiError(
          404,
          'session_not_found',
          'Session not found or expired. Generate instructions first.',
        );
      }

      const { agentId } = await createConversationalAgent({
        name: `UtzilVoice — Dr. ${session.doctorName}`,
        voiceId: session.voiceId,
        systemPrompt: buildBilingualPrompt(
          session.doctorName,
          session.instructionEs,
          session.instructionEn,
        ),
      });

      await store.patch(sessionId, {
        agentId,
        agentIdEs: agentId,
        agentIdEn: agentId,
      });

      res.json({ agentId });
    } catch (err) {
      next(err);
    }
  },
);

agentRouter.post(
  '/sessions/:id/convai-url',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionId = String(req.params.id);
      const session = await getSessionStore().get(sessionId);
      if (!session) {
        throw new ApiError(
          404,
          'session_not_found',
          'This session was not found or has expired.',
        );
      }

      if (!session.agentId) {
        throw new ApiError(
          409,
          'audio_not_ready',
          'A conversational assistant was not set up for this session.',
        );
      }

      const signedUrl = await getConversationSignedUrl(session.agentId);
      res.json({ signedUrl, agentId: session.agentId });
    } catch (err) {
      next(err);
    }
  },
);

agentRouter.get(
  '/sessions/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionId = String(req.params.id);
      const session = await getSessionStore().get(sessionId);
      if (!session) {
        throw new ApiError(
          404,
          'session_not_found',
          'This session was not found or has expired.',
        );
      }

      res.json({
        sessionId,
        doctorName: session.doctorName,
        agentId: session.agentId,
        agentIdEs: session.agentIdEs,
        agentIdEn: session.agentIdEn,
        instructionEs: session.instructionEs,
        instructionEn: session.instructionEn,
        audioUrlEs: `/api/sessions/${sessionId}/audio?lang=es`,
        audioUrlEn: `/api/sessions/${sessionId}/audio?lang=en`,
        createdAt: session.createdAt,
      });
    } catch (err) {
      next(err);
    }
  },
);
