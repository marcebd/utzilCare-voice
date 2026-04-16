import { ApiError } from './api-error.js';
import type { Language, Speed } from '../types.js';

const BASE_URL = 'https://api.elevenlabs.io';
const TTS_MODEL = 'eleven_multilingual_v2';

function apiKey(): string {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) {
    throw new ApiError(
      503,
      'elevenlabs_unavailable',
      'Server is missing ELEVENLABS_API_KEY. Set it in the environment and restart.',
    );
  }
  return key;
}

interface ElevenLabsErrorBody {
  detail?: {
    status?: string;
    message?: string;
    code?: string;
  } | string;
}

function parseDetail(body: string): { status?: string; message?: string } {
  try {
    const parsed = JSON.parse(body) as ElevenLabsErrorBody;
    if (parsed.detail && typeof parsed.detail === 'object') {
      return { status: parsed.detail.status, message: parsed.detail.message };
    }
    if (typeof parsed.detail === 'string') {
      return { message: parsed.detail };
    }
  } catch {
    // ignore — body wasn't JSON
  }
  return {};
}

function mapElevenLabsError(status: number, body: string): ApiError {
  console.error(`[elevenlabs] ${status} response body:`, body);
  const detail = parseDetail(body);

  if (
    status === 402 ||
    detail.status === 'can_not_use_instant_voice_cloning' ||
    detail.status === 'paid_plan_required'
  ) {
    return new ApiError(
      402,
      'elevenlabs_plan_required',
      detail.message ??
        'Your ElevenLabs plan does not include this feature. Upgrade at https://elevenlabs.io/app/subscription.',
    );
  }
  if (status === 401 || status === 403) {
    return new ApiError(
      502,
      'elevenlabs_unauthorized',
      'ElevenLabs rejected the API key. Verify ELEVENLABS_API_KEY is correct and active.',
    );
  }
  if (status === 429) {
    return new ApiError(
      429,
      'elevenlabs_quota_exceeded',
      'ElevenLabs quota or rate limit reached. Try again shortly or check your plan.',
    );
  }
  if ((status === 404 || status === 400) && /voice/i.test(body)) {
    return new ApiError(
      400,
      'elevenlabs_invalid_voice',
      'That voice was not found. Clone the voice again and retry.',
    );
  }
  if (status >= 500) {
    return new ApiError(
      502,
      'elevenlabs_unavailable',
      'ElevenLabs is temporarily unavailable. Try again in a moment.',
    );
  }
  return new ApiError(
    502,
    'elevenlabs_unavailable',
    detail.message ?? `ElevenLabs request failed (${status}).`,
  );
}

async function readBodySafe(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return '';
  }
}

export async function cloneVoice(params: {
  name: string;
  audio: { buffer: Buffer; filename: string; mimeType: string };
}): Promise<{ voiceId: string }> {
  const form = new FormData();
  form.append('name', params.name);
  // Copy to a fresh Uint8Array so Blob gets a guaranteed ArrayBuffer backing
  // (Node Buffer.buffer can be SharedArrayBuffer under TS 5.7 strict typings).
  const bytes = Uint8Array.from(params.audio.buffer);
  form.append(
    'files',
    new Blob([bytes], { type: params.audio.mimeType }),
    params.audio.filename,
  );

  const res = await fetch(`${BASE_URL}/v1/voices/add`, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey() },
    body: form,
  });

  if (!res.ok) {
    const body = await readBodySafe(res);
    throw mapElevenLabsError(res.status, body);
  }

  const json = (await res.json()) as { voice_id?: string };
  if (!json.voice_id) {
    throw new ApiError(
      502,
      'elevenlabs_unavailable',
      'ElevenLabs returned no voice_id from the clone request.',
    );
  }
  return { voiceId: json.voice_id };
}

export async function generateSpeech(params: {
  voiceId: string;
  text: string;
  language: Language;
  speed: Speed;
}): Promise<Buffer> {
  const { voiceId, text, language, speed } = params;

  const voice_settings = {
    stability: 0.5,
    similarity_boost: 0.75,
    style: 0,
    use_speaker_boost: true,
  };

  const body = {
    text,
    model_id: TTS_MODEL,
    language_code: language,
    voice_settings,
  };

  const res = await fetch(`${BASE_URL}/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey(),
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await readBodySafe(res);
    throw mapElevenLabsError(res.status, errBody);
  }

  const arrayBuffer = await res.arrayBuffer();
  // `speed` is intentionally unused here — TTS speed is applied client-side
  // via the HTMLAudioElement playbackRate (0.85 for slow, 1.0 for normal).
  void speed;
  return Buffer.from(arrayBuffer);
}

export async function getConversationSignedUrl(agentId: string): Promise<string> {
  const url = `${BASE_URL}/v1/convai/conversation/get_signed_url?agent_id=${encodeURIComponent(agentId)}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: { 'xi-api-key': apiKey() },
  });

  if (!res.ok) {
    const errBody = await readBodySafe(res);
    throw mapElevenLabsError(res.status, errBody);
  }

  const json = (await res.json()) as { signed_url?: string };
  if (!json.signed_url) {
    throw new ApiError(
      502,
      'elevenlabs_unavailable',
      'ElevenLabs returned no signed URL for the conversation.',
    );
  }
  return json.signed_url;
}

export async function createConversationalAgent(params: {
  name: string;
  voiceId: string;
  systemPrompt: string;
}): Promise<{ agentId: string }> {
  const { name, voiceId, systemPrompt } = params;

  const body = {
    name,
    conversation_config: {
      agent: {
        prompt: { prompt: systemPrompt },
        first_message: '',
      },
      tts: {
        voice_id: voiceId,
        model_id: TTS_MODEL,
      },
    },
  };

  const res = await fetch(`${BASE_URL}/v1/convai/agents/create`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await readBodySafe(res);
    throw mapElevenLabsError(res.status, errBody);
  }

  const json = (await res.json()) as { agent_id?: string };
  if (!json.agent_id) {
    throw new ApiError(
      502,
      'elevenlabs_unavailable',
      'ElevenLabs returned no agent_id from the create request.',
    );
  }
  return { agentId: json.agent_id };
}
