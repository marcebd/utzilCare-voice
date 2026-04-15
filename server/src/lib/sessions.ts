import { Redis } from '@upstash/redis';
import type { SessionRecord } from '../types.js';

const SESSION_TTL_SECONDS = 60 * 60 * 24; // 24h
const KEY_PREFIX = 'utzilvoice:session:';

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
