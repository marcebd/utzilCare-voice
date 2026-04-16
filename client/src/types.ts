export type Language = 'es' | 'en';

export type Speed = 'normal' | 'slow';

export interface CloneVoiceResponse {
  voiceId: string;
  previewText: string;
}

export interface GenerateInstructionsResponse {
  sessionId: string;
  audioUrlEs: string;
  audioUrlEn: string;
}

export interface CreateAgentResponse {
  agentId: string;
}

export interface SessionResponse {
  sessionId: string;
  doctorName: string;
  agentId: string | null;
  agentIdEs: string | null;
  agentIdEn: string | null;
  instructionEs: string;
  instructionEn: string;
  audioUrlEs: string;
  audioUrlEn: string;
  createdAt: string;
}

export type ApiErrorCode =
  | 'validation_failed'
  | 'session_not_found'
  | 'session_expired'
  | 'audio_not_ready'
  | 'elevenlabs_quota_exceeded'
  | 'elevenlabs_invalid_voice'
  | 'elevenlabs_unauthorized'
  | 'elevenlabs_plan_required'
  | 'elevenlabs_unavailable'
  | 'rate_limited'
  | 'internal_error'
  | 'network_error';

export interface ApiErrorShape {
  error: string;
  code: ApiErrorCode;
}
