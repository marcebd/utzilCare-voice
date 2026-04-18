# Single bilingual ConvAI agent per session

**Status:** accepted

## Context

Patients need to ask follow-up questions about their discharge instructions in
either Spanish or English, and hear the answer in the cloned doctor's voice. The
patient view has a language toggle that switches the audio player and instruction
text. The ConvAI agent must handle both languages.

## Decision

One ConvAI agent per session with a bilingual system prompt. The `language` field
in the ElevenLabs agent config is left unset so STT auto-detects the input
language. The language-matching instruction sits at the very top of the prompt
(highest priority position).

Prompt structure:
```
LANGUAGE RULE (highest priority):
You MUST respond in the SAME language the patient uses.
[...]

You are Dr. {name}. [...]

=== INSTRUCCIONES (ESPAÑOL) ===
{instructionEs}

=== INSTRUCTIONS (ENGLISH) ===
{instructionEn}

SAFETY RULES [...]
```

The patient's language toggle affects the audio player and displayed text only.
The ConvAI agent handles language independently based on what it hears or reads.

## Alternatives considered

### 1. Single agent with `sendContextualUpdate` on language toggle
Tried first. `sendContextualUpdate` injects text into the LLM context mid-conversation
("The patient has switched to Spanish. Respond only in Spanish."). Failed because
it only nudges the LLM's text generation. It does NOT change the STT pipeline language.
The STT kept transcribing in English, so the LLM saw English input and responded in
English regardless of the contextual update.

### 2. `startSession` with `overrides.agent.language`
Tried second. The `@elevenlabs/react` SDK types allow `overrides.agent.language` on
`startSession`, which should configure the STT pipeline at the WebSocket level.
Returned HTTP 400 on signed URL sessions. Likely not supported with signed URLs
(only with public agent IDs or conversation tokens).

### 3. Two agents per session (one ES, one EN)
Tried third. Created two separate agents at session creation, each with a
single-language system prompt and `language` field set in the agent config.
Language toggle disconnected and reconnected to the other agent.

Worked reliably but had real costs:
- Double agent creation time (~4s instead of ~2s)
- Double ElevenLabs agent quota usage
- Reconnect on toggle drops conversation context
- Jarring UX (re-requests mic permission on some browsers)
- More complex client code (reconnect state machine)

### 4. Single bilingual agent, language rule at top of prompt (chosen)
One agent per session. The system prompt leads with an explicit language-matching
rule at the highest priority position, includes both instruction texts (Spanish
and English), and leaves the `language` field unset in the ElevenLabs agent config
so STT auto-detects the input language.

Why this works: `eleven_multilingual_v2` speaks whatever text it receives. The
problem was never TTS. It was always upstream: the LLM defaulting to English
because the system prompt anchored it there, and locked STT configs transcribing
Spanish speech as English input. With the language rule at the top, the LLM mirrors
the patient's language. With `language` unset, STT auto-detects rather than forcing
English transcription.

## Consequences

**Easier:**
- One agent creation call per session (faster, simpler, cheaper)
- No reconnect on language toggle (conversation context preserved)
- Simpler client component (no reconnect state machine)
- Same session handles mixed-language conversations naturally

**Harder:**
- Auto-detect STT may occasionally pick the wrong language in noisy environments
  or with code-switching speakers. Acceptable for this portfolio scope.
- **Revisit trigger:** If pilot testing with Guatemalan clinicians surfaces STT
  mis-detection on Guatemalan Spanish in >10% of conversations, or if any
  clinician reports the agent responding in the wrong language, revisit by
  locking `language` in the agent config to the clinician's selected primary
  language and creating two agents per session (alternative 3 above, already
  proven to work).

## Key files

- `server/src/routes/agent.ts` — `buildBilingualPrompt()`, `POST /create-agent`
- `server/src/lib/elevenlabs.ts` — `createConversationalAgent()` (no `language` param)
- `client/src/components/patient/PatientConversation.tsx` — single session, no reconnect
