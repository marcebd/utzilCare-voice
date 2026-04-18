# ElevenLabs Integration

Server-side wrapper around the ElevenLabs API suite. All API calls are made from
the Express backend — the ElevenLabs API key never reaches the client. The client
talks to our server, which talks to ElevenLabs.

## What this module is responsible for

- **Instant Voice Cloning** — `POST /v1/voices/add`. Accepts a 30-60s audio sample
  and a doctor name, returns a `voiceId`. Called via `cloneVoice()`.
- **Multilingual TTS** — `POST /v1/text-to-speech/{voice_id}` with
  `eleven_multilingual_v2`. Generates audio from text in any supported language
  using the cloned (or stock) voice. Called via `generateSpeech()`.
- **ConvAI agent creation** — `POST /v1/convai/agents/create`. Creates a
  conversational agent with a system prompt, voice config, and no locked language
  (STT auto-detects). Called via `createConversationalAgent()`.
- **ConvAI signed URL** — `GET /v1/convai/conversation/get_signed_url`. Returns a
  short-lived WebSocket URL that the patient's browser connects to directly.
  Called via `getConversationSignedUrl()`.
- **Error mapping** — every ElevenLabs HTTP error is parsed for its
  `detail.status` field and mapped to a typed `ApiErrorCode` with a
  human-readable message. The clinician UI surfaces these directly.

## What this module is NOT responsible for

- **Audio caching** — handled by `lib/audio-cache.ts`. This module returns raw
  Buffers; caching decisions live elsewhere.
- **Session persistence** — handled by `lib/sessions.ts`. This module doesn't know
  about sessions.
- **Client-side ConvAI interaction** — the `@elevenlabs/react` SDK handles the
  WebSocket session in the browser. This module only provides the signed URL.
- **Billing or quota management** — this module surfaces quota errors but doesn't
  track usage.

## Error mapping

| ElevenLabs response | Our code | Our message |
|---|---|---|
| 401 / 403 | `elevenlabs_unauthorized` | "Verify ELEVENLABS_API_KEY is correct and active." |
| 402 or `detail.status: paid_plan_required` | `elevenlabs_plan_required` | Upstream message (e.g., "Your subscription does not include...") |
| 429 | `elevenlabs_quota_exceeded` | "Quota or rate limit reached." |
| `detail.status: voice_limit_reached` | `elevenlabs_quota_exceeded` | Upstream message with link to voice lab |
| 400/404 with `voice.*not found` in body | `elevenlabs_invalid_voice` | "Clone the voice again and retry." |
| 5xx | `elevenlabs_unavailable` | "Temporarily unavailable." |
| Other | `elevenlabs_unavailable` | Upstream message or generic fallback |

Error codes are matched on the structured `detail.status` field first, then fall
through to status code + body regex. The regex is tightened to `/voice.*not found/i`
(not the broader `/voice/i`) after a bug where `voice_limit_reached` responses
were misidentified as "voice not found." See
[session log section 2](../session-log/2026-04-15-initial-build.md#2-elevenlabs-api-integration-and-plan-tier-discovery).

## Known constraints

- **Starter plan: 10 cloned voices, 30,000 chars/month TTS.** Both are easy to
  exhaust during development. Smoke tests, demo audio regeneration, and agent
  creation all consume quota. Avoid unnecessary regeneration. Delete test voices
  at https://elevenlabs.io/app/voice-lab when hitting the cap.
- **`eleven_multilingual_v2` is the only model used.** It handles both Spanish and
  English natively with the same cloned voice. Do not switch to `eleven_monolingual_v1`
  unless dropping multilingual support.
- **ConvAI agents don't expire** until explicitly deleted via the API or dashboard.
  Creating agents without cleanup will accumulate in the ElevenLabs account.
- **Signed URLs are short-lived** (~minutes). The client must fetch a fresh one
  each time a conversation starts.
- **No SSML support** confirmed for `eleven_multilingual_v2`. Do not rely on SSML
  tags (e.g., `<prosody rate="slow">`) for features. Playback speed is applied
  client-side.

## Integration points

| Caller | What it calls | Why |
|---|---|---|
| `routes/clone.ts` | `cloneVoice()` | Clinician uploads audio sample |
| `routes/preview.ts` | `generateSpeech()` | Clinician previews cloned voice |
| `routes/generate.ts` | `generateSpeech()` x2 (parallel ES + EN) | Generate patient audio |
| `routes/agent.ts` | `createConversationalAgent()` | Create bilingual ConvAI agent |
| `routes/agent.ts` | `getConversationSignedUrl()` | Patient starts conversation |

## Entry points

- `server/src/lib/elevenlabs.ts` — all ElevenLabs API calls
- `server/src/lib/api-error.ts` — `ApiError` class used by the mapper
