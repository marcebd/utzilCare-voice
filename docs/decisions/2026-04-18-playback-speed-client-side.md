# Playback speed applied client-side via playbackRate

**Status:** accepted

## Context

The clinician can select "Normal" or "Slow" reading speed for elderly or anxious
patients. The question is where to apply the speed change: at TTS generation time
(server) or at playback time (client).

## Decision

Apply speed client-side via `HTMLAudioElement.playbackRate`. Normal = 1.0,
Slow = 0.85. The `preservesPitch` property (true by default in modern browsers)
keeps the voice natural at reduced speed. The speed selection is carried from the
clinician to the patient via a URL query parameter (`?speed=slow`).

## Alternatives considered

### 1. TTS-parameter regeneration on the server (rejected)
ElevenLabs' `/v1/text-to-speech` endpoint does not have a native speed parameter.
`voice_settings` controls stability, similarity_boost, and style, but not rate.
Options would be:
- SSML `<prosody rate="slow">` — `eleven_multilingual_v2` has limited/undocumented
  SSML support. Unreliable.
- Generate at normal speed, then post-process the audio buffer with ffmpeg or Web
  Audio API on the server to stretch it. Adds processing time, a dependency
  (ffmpeg), and doubles the cache footprint (normal + slow variants per language).
- Re-generate the same text at a different speed on every speed change. Each call
  costs ~100-500 characters against the ElevenLabs monthly quota and adds 2-5s
  of latency. Cache invalidation becomes complex (4 variants: ES-normal,
  ES-slow, EN-normal, EN-slow instead of 2).

All three add cost, latency, and complexity for a feature that `playbackRate`
handles in one line of client code.

### 2. No speed control at all (rejected)
The brief specified it. Post-op patients who are elderly or anxious benefit from
slower speech. Cutting it would remove a feature that directly serves the target
user population.

## Consequences

**Easier:**
- Zero server-side complexity. Two audio files per session (ES + EN), not four.
- No ElevenLabs quota cost for speed variants.
- Speed change is instant (no network round-trip, no regeneration wait).
- Cache stays simple (keyed by session + language, not session + language + speed).

**Harder:**
- `playbackRate` at 0.85x is perceptible but subtle. Very slow speeds (0.5x)
  would sound unnatural even with `preservesPitch`. If a future requirement
  demands extreme slowdown, server-side processing may be needed.
- The patient cannot change speed — it's set by the clinician at generation time
  and baked into the URL. Acceptable for this use case (clinician knows the
  patient).

## Key files

- `client/src/components/patient/AudioPlayer.tsx` — `rateFor()` function, applied
  in `useEffect` on speed prop change
- `client/src/components/clinician/InstructionComposer.tsx` — speed selector UI
- `client/src/components/clinician/ShareFlow.tsx` — encodes speed into patient URL
  query parameter
