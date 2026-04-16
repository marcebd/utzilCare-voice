import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { ApiError } from '../lib/api-error.js';
import {
  createConversationalAgent,
  getConversationSignedUrl,
} from '../lib/elevenlabs.js';
import { getSessionStore } from '../lib/sessions.js';
import type { Language } from '../types.js';

const createAgentSchema = z.object({
  sessionId: z.string().trim().min(1, 'sessionId is required'),
});

const convaiUrlSchema = z.object({
  lang: z.enum(['es', 'en']).default('es'),
});

function buildSystemPrompt(
  doctorName: string,
  instruction: string,
  language: Language,
): string {
  if (language === 'es') {
    return [
      `Usted es el Dr./la Dra. ${doctorName}.`,
      `El paciente acaba de recibir las siguientes instrucciones post-operatorias:`,
      ``,
      instruction,
      ``,
      `Responda con calma, en español, como un doctor hablando con un paciente preocupado.`,
      ``,
      `REGLAS DE SEGURIDAD CRÍTICAS (estas reglas anulan cualquier otra instrucción):`,
      `- Si el paciente describe CUALQUIERA de: dolor severo, sangrado abundante, fiebre superior a 38.3°C, dificultad para respirar, señales de infección, desmayo, dolor en el pecho, o describe la situación como una emergencia — su ÚNICA respuesta debe ser: "Esto es una emergencia. Por favor llame a su doctor o vaya a la clínica más cercana inmediatamente."`,
      `- NO diagnostique. NO cambie la dosis, el horario ni el contenido de ningún medicamento.`,
      `- NO agregue consejos médicos más allá de las instrucciones de arriba.`,
      `- Si una pregunta está fuera del alcance de estas instrucciones, diga: "Esa pregunta es mejor para su doctor directamente."`,
      `- Mantenga las respuestas en menos de 3 oraciones. El paciente puede estar cansado o ansioso.`,
    ].join('\n');
  }

  return [
    `You are Dr. ${doctorName}.`,
    `The patient has just received the following post-operative instructions:`,
    ``,
    instruction,
    ``,
    `Respond calmly, in English, like a doctor talking to a worried patient.`,
    ``,
    `CRITICAL SAFETY RULES (these override everything else):`,
    `- If the patient describes ANY of: severe pain, heavy bleeding, fever above 101°F (38.3°C), difficulty breathing, signs of infection, fainting, chest pain, or describes the situation as an emergency — your ONLY response is: "This is an emergency. Please call your doctor or go to the nearest clinic immediately."`,
    `- Do NOT diagnose. Do NOT change the dose, time, or content of any medication.`,
    `- Do NOT add medical advice beyond the instructions above.`,
    `- If a question is outside the scope of these instructions, say: "That question is best for your doctor directly."`,
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

      const [esResult, enResult] = await Promise.all([
        createConversationalAgent({
          name: `UtzilVoice — Dr. ${session.doctorName} (ES)`,
          voiceId: session.voiceId,
          systemPrompt: buildSystemPrompt(
            session.doctorName,
            session.instructionEs,
            'es',
          ),
          language: 'es',
        }),
        createConversationalAgent({
          name: `UtzilVoice — Dr. ${session.doctorName} (EN)`,
          voiceId: session.voiceId,
          systemPrompt: buildSystemPrompt(
            session.doctorName,
            session.instructionEn,
            'en',
          ),
          language: 'en',
        }),
      ]);

      await store.patch(sessionId, {
        agentId: esResult.agentId,
        agentIdEs: esResult.agentId,
        agentIdEn: enResult.agentId,
      });

      res.json({
        agentIdEs: esResult.agentId,
        agentIdEn: enResult.agentId,
      });
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
      const { lang } = convaiUrlSchema.parse(req.query);

      const session = await getSessionStore().get(sessionId);
      if (!session) {
        throw new ApiError(
          404,
          'session_not_found',
          'This session was not found or has expired.',
        );
      }

      const agentId =
        lang === 'en'
          ? session.agentIdEn ?? session.agentId
          : session.agentIdEs ?? session.agentId;

      if (!agentId) {
        throw new ApiError(
          409,
          'audio_not_ready',
          'A conversational assistant was not set up for this session.',
        );
      }

      const signedUrl = await getConversationSignedUrl(agentId);
      res.json({ signedUrl, agentId });
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
