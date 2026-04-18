# Upstash Redis over in-memory session store

**Status:** accepted

## Context

Sessions map a UUID to a bundle of data (doctor name, voice ID, agent ID,
instruction text in both languages). The original brief called for an in-memory
Map with 24h TTL. Railway and Render free tiers restart containers, which would
kill all active sessions. A patient discharged at 5pm whose backend restarts at
7pm would get a 404 on their link.

## Decision

Use Upstash Redis (REST API) for session metadata. Free tier, two env vars
(`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`), 24h TTL per key. When
env vars are missing (local dev), fall back to an in-memory Map with a boot-time
warning. Same `SessionStore` interface either way.

Audio bytes stay in an in-memory cache (separate from the session store). If the
cache is empty on audio request (e.g., server restarted), the audio stream handler
regenerates TTS from the session's stored text + voiceId and re-caches.

## Alternatives considered

### 1. In-memory Map only (rejected)
The original brief's approach. Works for local dev and short demos. Fails on any
backend restart in production. Railway free tier restarts containers for inactivity.
A portfolio demo that 404s during an interview is worse than not having a demo.

### 2. SQLite or Postgres (rejected)
Overkill for stateless session data with a 24h TTL. Adds a migration system,
connection pooling, and a schema for what is fundamentally a key-value store with
expiry. The brief explicitly said "no database."

### 3. Redis (self-hosted) (rejected)
Would work but adds infrastructure to manage. Upstash's REST API means no
persistent connection, no Redis client library, no connection pool. Two env vars
and an HTTP call.

## Consequences

**Easier:**
- Sessions survive backend restarts and deploys
- $0 on Upstash free tier (10,000 requests/day, 256MB)
- Local dev works without any external setup (in-memory fallback)
- Audio regenerate-on-read means even audio survives restarts (with a small
  latency hit on first access)

**Harder:**
- Two env vars to configure for production deploy
- Upstash REST has ~50ms latency per call (acceptable for session reads)
- Free tier has a 1MB request body limit which constrains what can be stored
  per key (audio bytes must stay in the in-memory cache, not in Redis)

## Key files

- `server/src/lib/sessions.ts` — `UpstashSessionStore`, `InMemorySessionStore`,
  `getSessionStore()` factory
- `server/src/lib/audio-cache.ts` — in-memory audio bundle cache with TTL
- `server/src/routes/generate.ts` — regenerate-on-read in the audio stream handler
