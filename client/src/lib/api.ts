import type {
  ApiErrorCode,
  ApiErrorShape,
  CloneVoiceResponse,
  CreateAgentResponse,
  GenerateInstructionsResponse,
  Language,
  SessionResponse,
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;

  constructor(status: number, code: ApiErrorCode, message: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.name = 'ApiClientError';
  }
}

async function throwIfError(res: Response): Promise<void> {
  if (res.ok) return;
  let shape: ApiErrorShape | null = null;
  try {
    shape = (await res.json()) as ApiErrorShape;
  } catch {
    // ignore
  }
  throw new ApiClientError(
    res.status,
    shape?.code ?? 'internal_error',
    shape?.error ?? `Request failed with status ${res.status}`,
  );
}

function networkError(err: unknown): never {
  const message =
    err instanceof Error ? err.message : 'Network error. Check your connection.';
  throw new ApiClientError(0, 'network_error', message);
}

export async function cloneVoice(params: {
  doctorName: string;
  audio: Blob;
  filename: string;
}): Promise<CloneVoiceResponse> {
  const form = new FormData();
  form.append('doctorName', params.doctorName);
  form.append('audio', params.audio, params.filename);

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/clone-voice`, {
      method: 'POST',
      body: form,
    });
  } catch (err) {
    networkError(err);
  }
  await throwIfError(res);
  return (await res.json()) as CloneVoiceResponse;
}

export async function previewVoice(params: {
  voiceId: string;
  text: string;
  language: Language;
}): Promise<Blob> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/preview-voice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
  } catch (err) {
    networkError(err);
  }
  await throwIfError(res);
  return await res.blob();
}

export async function generateInstructions(params: {
  doctorName: string;
  voiceId: string;
  instructionEs: string;
  instructionEn: string;
}): Promise<GenerateInstructionsResponse> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/generate-instructions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
  } catch (err) {
    networkError(err);
  }
  await throwIfError(res);
  return (await res.json()) as GenerateInstructionsResponse;
}

export async function getConvaiSignedUrl(
  sessionId: string,
  language: Language,
): Promise<{ signedUrl: string; agentId: string }> {
  let res: Response;
  try {
    res = await fetch(
      `${API_BASE}/api/sessions/${sessionId}/convai-url?lang=${language}`,
      { method: 'POST' },
    );
  } catch (err) {
    networkError(err);
  }
  await throwIfError(res);
  return (await res.json()) as { signedUrl: string; agentId: string };
}

export async function createAgent(params: {
  sessionId: string;
  language: Language;
}): Promise<CreateAgentResponse> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/create-agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
  } catch (err) {
    networkError(err);
  }
  await throwIfError(res);
  return (await res.json()) as CreateAgentResponse;
}

export async function getSession(sessionId: string): Promise<SessionResponse> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/sessions/${sessionId}`);
  } catch (err) {
    networkError(err);
  }
  await throwIfError(res);
  return (await res.json()) as SessionResponse;
}

export function audioUrl(sessionId: string, language: Language): string {
  return `${API_BASE}/api/sessions/${sessionId}/audio?lang=${language}`;
}
