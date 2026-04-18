# Stock voice for demo session

**Status:** accepted

## Context

The landing page links to `/patient/demo` so anyone can try the patient view
without going through the clinician flow. This demo session needs a voice for
TTS and a ConvAI agent. Using a cloned voice would tie the demo to the user's
ElevenLabs account state (cloned voices can be deleted, accounts can change).

## Decision

The demo session uses Rachel (`21m00Tcm4TlvDq8ikWAM`), a stock ElevenLabs
library voice. The session record is a hardcoded constant in
`server/src/lib/sessions.ts` — both `UpstashSessionStore` and
`InMemorySessionStore` intercept `id === 'demo'` and return it. No TTL, never
expires.

Audio is not pre-baked. On first access, the regenerate-on-read path generates
TTS from the demo text + stock voiceId, then caches in memory.

The ConvAI agent is a persistent bilingual agent created once via the ElevenLabs
API, with its ID hardcoded in the demo constant. ElevenLabs agents don't expire
until deleted.

## Alternatives considered

### 1. Use a cloned voice from the developer's account (rejected)
Ties the demo to one person's ElevenLabs account. If the voice is deleted (e.g.,
hitting the 10-voice Starter plan limit during development), the demo breaks.
Stock voices are always available on Starter+.

### 2. Pre-bake audio files and commit them (rejected)
Would make the demo work without any ElevenLabs API call. But committed audio
from a cloned voice would be biometric data in a public repo. Even with a stock
voice, pre-baked audio drifts from the actual TTS output over time as ElevenLabs
updates models. The regenerate-on-read path keeps the demo fresh.

### 3. Redirect `/patient/demo` to the clinician flow (rejected)
Forces every visitor to clone a voice and generate instructions before seeing the
patient view. A hiring reviewer scanning the repo won't do this. The demo must be
one click from the landing page.

## Consequences

**Easier:**
- Demo always works regardless of account voice state
- No biometric data committed to the repo
- Audio stays current with ElevenLabs' model updates
- One click from landing to patient experience

**Harder:**
- First visit to `/patient/demo` after a server restart has a ~3-5s delay while
  TTS generates. Subsequent visits hit the cache.
- The stock voice (Rachel) doesn't sound like a specific doctor. The demo
  demonstrates the technology, not the personalization. Clinician flow
  demonstrates the real cloned-voice experience.
- The hardcoded agent ID will break if the agent is deleted from the ElevenLabs
  dashboard. Would need to be recreated and the constant updated.

## Key files

- `server/src/lib/sessions.ts` — `DEMO_SESSION` constant, intercepted in both
  store implementations' `get()` method
