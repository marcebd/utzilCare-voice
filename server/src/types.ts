export type Language = 'es' | 'en';

export type Speed = 'normal' | 'slow';

export interface SessionRecord {
  doctorName: string;
  voiceId: string;
  agentId: string | null;
  agentIdEs: string | null;
  agentIdEn: string | null;
  instructionEs: string;
  instructionEn: string;
  createdAt: string;
}

export interface ApiErrorBody {
  error: string;
  code: ApiErrorCode;
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
  | 'internal_error';
