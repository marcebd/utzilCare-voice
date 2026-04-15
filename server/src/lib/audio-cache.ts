import type { Language } from '../types.js';

const TTL_MS = 60 * 60 * 24 * 1000; // 24h

interface AudioBundle {
  es: Buffer;
  en: Buffer;
  expiresAt: number;
}

const cache = new Map<string, AudioBundle>();

function sweep(): void {
  const now = Date.now();
  for (const [id, bundle] of cache) {
    if (bundle.expiresAt < now) cache.delete(id);
  }
}

export function setAudio(
  sessionId: string,
  audio: { es: Buffer; en: Buffer },
): void {
  sweep();
  cache.set(sessionId, {
    es: audio.es,
    en: audio.en,
    expiresAt: Date.now() + TTL_MS,
  });
}

export function getAudio(sessionId: string, language: Language): Buffer | null {
  const bundle = cache.get(sessionId);
  if (!bundle) return null;
  if (bundle.expiresAt < Date.now()) {
    cache.delete(sessionId);
    return null;
  }
  return bundle[language];
}

export function hasAudio(sessionId: string): boolean {
  const bundle = cache.get(sessionId);
  if (!bundle) return false;
  if (bundle.expiresAt < Date.now()) {
    cache.delete(sessionId);
    return false;
  }
  return true;
}
