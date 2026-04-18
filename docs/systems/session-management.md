# Session Management

Manages the lifecycle of patient sessions from creation through expiry. A session
is the bundle of data that connects a clinician's generated instructions to a
patient's playback and conversation experience.

## Data lifecycle

### Created (clinician generates instructions)
`POST /api/generate-instructions` creates a `SessionRecord` keyed by a UUID:
```
SessionRecord {
  doctorName: string
  voiceId: string
  agentId: string | null       (null until create-agent is called)
  agentIdEs: string | null     (same as agentId — single bilingual agent)
  agentIdEn: string | null     (same as agentId — single bilingual agent)
  instructionEs: string
  instructionEn: string
  createdAt: string (ISO 8601)
}
```
Stored in Upstash Redis with a 24h TTL. Audio (two MP3 buffers, ES + EN) is
cached separately in the in-memory audio cache.

### Accessed (patient opens the link)
1. `GET /api/sessions/:id` — returns metadata (doctor name, instruction text,
   audio URLs, agent availability). No voiceId in the response (clinician-private).
2. `GET /api/sessions/:id/audio?lang=es|en` — streams audio from the in-memory
   cache. If the cache is empty (server restarted), regenerates TTS from the
   session's stored `voiceId` + instruction text, re-caches, then serves. This
   costs one ElevenLabs TTS call but keeps the patient link working across
   restarts.
3. `POST /api/sessions/:id/convai-url` — returns a short-lived signed WebSocket
   URL for the ConvAI agent.

### Patched (agent creation)
`POST /api/create-agent` creates a ConvAI agent and patches the session with the
agent ID. This happens after audio generation, as a separate step that can fail
without blocking audio playback.

### Expired
Upstash Redis evicts the key after 24h. The in-memory audio cache runs a lazy
sweep (checks TTL on access, deletes if expired). After expiry, the patient sees
a localized error: "This session was not found or has expired. Ask your clinician
to generate a new link."

## The demo session

The session ID `"demo"` is special. Both store implementations intercept
`get('demo')` and return a hardcoded `SessionRecord` constant. It uses a stock
ElevenLabs voice (Rachel, `21m00Tcm4TlvDq8ikWAM`) and a persistent bilingual
ConvAI agent. It never expires, never touches Redis, and doesn't count toward
any TTL.

See [stock voice demo ADR](../decisions/2026-04-18-stock-voice-demo-session.md).

## Two storage layers

| Layer | What it stores | Persistence | TTL |
|---|---|---|---|
| Upstash Redis | Session metadata (JSON) | Survives restarts | 24h |
| In-memory Map | Audio buffers (ES + EN MP3) | Lost on restart | 24h |

This split exists because Upstash REST has a 1MB request body limit on the free
tier. A full bilingual instruction set's audio can be 500KB-1MB. Storing audio
bytes in Redis would push against the limit. The regenerate-on-read pattern makes
the audio cache loss transparent to the patient (small latency hit on first access
after restart).

See [Upstash ADR](../decisions/2026-04-18-upstash-over-in-memory.md).

## Known constraints

- **24h TTL is not configurable per session.** Every session gets the same TTL.
  For a production version, clinicians might want 48h or 72h for patients in
  remote areas.
- **No session listing or admin API.** There's no way to list active sessions,
  delete a specific session, or extend a TTL. Acceptable for portfolio scope.
- **Audio regeneration costs quota.** Every cache miss triggers a TTS call. If
  the server restarts frequently (Railway free tier idles), the same session's
  audio might regenerate multiple times. Each regeneration costs characters against
  the ElevenLabs monthly quota.
- **No session ownership verification.** Anyone with a session UUID can access it.
  There's no auth check. The UUID is unguessable (v4), but there's no mechanism
  to revoke a link short of waiting for TTL expiry.

## Entry points

- `server/src/lib/sessions.ts` — `UpstashSessionStore`, `InMemorySessionStore`,
  `getSessionStore()`, `DEMO_SESSION` constant
- `server/src/lib/audio-cache.ts` — `setAudio()`, `getAudio()`, `hasAudio()`
- `server/src/routes/generate.ts` — session creation + audio stream handler
- `server/src/routes/agent.ts` — session patch (agent ID) + session GET
