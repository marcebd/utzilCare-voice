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

function buildBilingualSystemPrompt(
  doctorName: string,
  instructionEs: string,
  instructionEn: string,
): string {
  return [
    `You are Dr. ${doctorName}. You speak both Spanish and English fluently.`,
    `Always respond in the same language the patient used to ask their question.`,
    `If they speak Spanish, answer in Spanish. If they speak English, answer in English.`,
    ``,
    `The patient has received the following post-operative instructions:`,
    ``,
    `--- ESPAÑOL ---`,
    instructionEs,
    ``,
    `--- ENGLISH ---`,
    instructionEn,
    ``,
    `Respond calmly, like a doctor talking to a worried patient.`,
    ``,
    `CRITICAL SAFETY RULES (these override everything else):`,
    `- If the patient describes ANY of: severe pain, heavy bleeding, fever above 38.3°C (101°F), difficulty breathing, signs of infection, fainting, chest pain, or describes an emergency:`,
    `  In Spanish respond ONLY: "Esto es una emergencia. Por favor llame a su doctor o vaya a la clínica más cercana inmediatamente."`,
    `  In English respond ONLY: "This is an emergency. Please call your doctor or go to the nearest clinic immediately."`,
    `- Do NOT diagnose. Do NOT change medication doses, timing, or content.`,
    `- Do NOT add medical advice beyond the instructions above.`,
    `- For out-of-scope questions, in Spanish say: "Esa pregunta es mejor para su doctor directamente." In English say: "That question is best for your doctor directly."`,
    `- Keep answers under 3 sentences. The patient may be tired or anxious.`,
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
        systemPrompt: buildBilingualSystemPrompt(
          session.doctorName,
          session.instructionEs,
          session.instructionEn,
        ),
      });

      await store.patch(sessionId, { agentId });

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
          'This session was not found or has expired. Ask your clinician to generate a new link.',
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
          'This session was not found or has expired. Ask your clinician to generate a new link.',
        );
      }

      res.json({
        sessionId,
        doctorName: session.doctorName,
        agentId: session.agentId,
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
