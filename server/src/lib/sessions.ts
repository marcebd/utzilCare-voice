import { Redis } from '@upstash/redis';
import type { SessionRecord } from '../types.js';

const SESSION_TTL_SECONDS = 60 * 60 * 24; // 24h
const KEY_PREFIX = 'utzilvoice:session:';

const DEMO_SESSION: SessionRecord = {
  doctorName: 'Dr. García',
  voiceId: '21m00Tcm4TlvDq8ikWAM',
  agentId: null,
  instructionEs:
    'Mantenga la herida limpia y seca. Cambie el vendaje una vez al día, o cada vez que se moje o ensucie. Lávese las manos antes y después de tocar la herida. No aplique ninguna crema ni ungüento a menos que yo se lo haya indicado.\n\nTome el medicamento para el dolor cada ocho horas, con comida. Tome el antibiótico tres veces al día hasta terminarlo, aunque se sienta mejor. No se salte dosis.\n\nDurante los primeros tres días, coma solo alimentos blandos y fríos. Beba mucha agua. Evite alimentos picantes, duros o muy calientes.\n\nVaya a la clínica o llámeme inmediatamente si tiene: fiebre mayor a 38.3°C, sangrado abundante, dolor que empeora, pus o mal olor de la herida, o dificultad para respirar.\n\nSu próxima cita es en siete días.',
  instructionEn:
    'Keep the wound clean and dry. Change the bandage once a day, or any time it becomes wet or dirty. Wash your hands before and after touching the wound. Do not apply any cream or ointment unless I told you to.\n\nTake the pain medication every eight hours, with food. Take the antibiotic three times a day until it is finished, even if you feel better. Do not skip doses.\n\nFor the first three days, eat only soft, cool foods. Drink plenty of water. Avoid spicy, hard, or very hot foods.\n\nGo to the clinic or call me immediately if you have: a fever above 101°F, heavy bleeding, increasing pain, pus or a bad smell from the wound, or any trouble breathing.\n\nYour next appointment is in seven days.',
  createdAt: '2026-04-15T00:00:00.000Z',
};

interface SessionStore {
  get(id: string): Promise<SessionRecord | null>;
  set(id: string, record: SessionRecord): Promise<void>;
  patch(id: string, partial: Partial<SessionRecord>): Promise<SessionRecord | null>;
}

class UpstashSessionStore implements SessionStore {
  private redis: Redis;

  constructor(url: string, token: string) {
    this.redis = new Redis({ url, token });
  }

  async get(id: string): Promise<SessionRecord | null> {
    if (id === 'demo') return DEMO_SESSION;
    const raw = await this.redis.get<SessionRecord>(KEY_PREFIX + id);
    return raw ?? null;
  }

  async set(id: string, record: SessionRecord): Promise<void> {
    await this.redis.set(KEY_PREFIX + id, record, { ex: SESSION_TTL_SECONDS });
  }

  async patch(
    id: string,
    partial: Partial<SessionRecord>,
  ): Promise<SessionRecord | null> {
    const existing = await this.get(id);
    if (!existing) return null;
    const merged: SessionRecord = { ...existing, ...partial };
    await this.set(id, merged);
    return merged;
  }
}

class InMemorySessionStore implements SessionStore {
  private store = new Map<string, { record: SessionRecord; expiresAt: number }>();

  async get(id: string): Promise<SessionRecord | null> {
    if (id === 'demo') return DEMO_SESSION;
    const entry = this.store.get(id);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      this.store.delete(id);
      return null;
    }
    return entry.record;
  }

  async set(id: string, record: SessionRecord): Promise<void> {
    this.store.set(id, {
      record,
      expiresAt: Date.now() + SESSION_TTL_SECONDS * 1000,
    });
  }

  async patch(
    id: string,
    partial: Partial<SessionRecord>,
  ): Promise<SessionRecord | null> {
    const existing = await this.get(id);
    if (!existing) return null;
    const merged: SessionRecord = { ...existing, ...partial };
    await this.set(id, merged);
    return merged;
  }
}

let cached: SessionStore | null = null;

export function getSessionStore(): SessionStore {
  if (cached) return cached;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    cached = new UpstashSessionStore(url, token);
    console.log('[sessions] using Upstash Redis');
  } else {
    cached = new InMemorySessionStore();
    console.warn(
      '[sessions] UPSTASH_REDIS_REST_URL/TOKEN not set — falling back to in-memory store. Sessions will not survive a server restart.',
    );
  }
  return cached;
}
