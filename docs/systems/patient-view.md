# Patient View

The page a patient opens after discharge (`/patient/:sessionId`). Renders the
doctor's voice instructions with audio playback, text display, a conversational
Q&A agent, and accessibility controls. Designed for low-literacy users who may
be anxious, on a phone, and encountering the interface exactly once.

## What the patient sees (top to bottom)

1. **Accessibility controls** — top-right. Two toggles: "A+ Large text" (scales
   root font to 120%) and a contrast icon for high-contrast mode (swaps Ceiba
   palette tokens to max-contrast values). Session-only, no persistence.

2. **Safety disclaimer** — always visible amber banner. Non-dismissible.
   Bilingual text swaps with the language toggle. Tells the patient this is for
   discharge instructions only and to call their doctor for emergencies.

3. **Doctor attribution** — "De parte de Dr. {name}" in Fraunces serif. Warmth
   signal, not just a label.

4. **Language toggle** — pill-shaped radio group (Español / English). Swaps the
   audio source URL, the displayed instruction text, and the UI copy (button
   labels, status messages, placeholders) in one action. Does NOT affect the
   ConvAI session, which auto-detects language independently.

5. **Audio player** — custom component (no native `<audio controls>`). Big
   forest-green play/pause button, a waveform scrubber, time display, Replay
   and Download MP3 buttons. "Slow playback" badge shown when the URL carries
   `?speed=slow` (applied via `HTMLAudioElement.playbackRate = 0.85`).

6. **Waveform scrubber** — replaces a traditional range slider. Decodes the full
   audio file via `AudioContext.decodeAudioData`, samples 96 peak-amplitude
   bars, draws on canvas at devicePixelRatio. Played portion fills forest-800,
   unplayed is stone-300. Click to seek, keyboard arrows (±2s), Page Up/Down
   (±10s), Home/End. `role="slider"` with `aria-valuenow` for screen readers.
   Falls back to "Waveform unavailable" text if Web Audio API is missing.

7. **Instruction text** — large body text (text-lg, ~1.125rem) at relaxed
   leading. `whitespace-pre-line` preserves paragraph breaks from the clinician's
   input. Swaps language with the toggle.

8. **Conversational agent** — ConvAI card below the instructions. Idle state
   shows a "Start conversation" button with mic icon. Connected state shows a
   status pill (forest = listening, amber pulse = doctor speaking), a scrollable
   transcript (role="log", aria-live="polite"), and a text input for typed
   questions. End button disconnects the WebSocket. Component cleans up the
   session on unmount.

## Integration points

| Dependency | How it connects | Failure mode |
|---|---|---|
| `GET /api/sessions/:id` | Loads session metadata on mount | Shows localized error card, patient asked to get a new link |
| `GET /api/sessions/:id/audio?lang=es\|en` | Audio source URL for the player | Player shows "This audio could not be loaded" |
| `POST /api/sessions/:id/convai-url` | Gets a signed WebSocket URL for the ConvAI agent | Error in the conversation card, audio playback still works |
| ElevenLabs ConvAI WebSocket | `@elevenlabs/react` `useConversation` opens the signed URL | Mic-denied error shown with guidance to use text input instead |
| `../DESIGN.md` Ceiba tokens | Tailwind v4 theme in `client/src/index.css` | Visual mismatch if tokens drift |

## Key constraints

- **No autoplay.** Patient must press play. This is an accessibility rule, not a
  default that can be overridden.
- **No localStorage.** Accessibility prefs (large text, high contrast) reset on
  every visit. See [no-client-persistence ADR](../decisions/2026-04-18-no-client-persistence.md).
- **Safety disclaimer is not closeable.** Hardcoded into the page layout, not a
  dismissible toast or banner.
- **ConvAI is non-blocking.** If agent creation failed during the clinician flow,
  or if the signed URL endpoint errors, the audio player and instruction text
  still work. The conversation card shows the error; the rest of the page is
  unaffected.
- **Audio regenerates on cache miss.** If the server restarted and the in-memory
  audio cache is empty, the first `GET /api/sessions/:id/audio` call regenerates
  the TTS from the session's stored text + voiceId. Takes a few seconds, then
  caches. See [session management](session-management.md).

## Known gaps

- **No offline mode.** If the patient loses connectivity after opening the page,
  they can replay audio already loaded in the browser but cannot start a new
  conversation or switch languages (both require network). Offline is a named
  future-work item in the README.
- **No visual indicator for audio loading.** The waveform shows "Loading audio"
  while decoding, but the player's play button is enabled before the audio is
  fully buffered. Pressing play on a slow connection may cause a delay before
  sound starts. Not a bug, but could confuse a patient.
- **Transcript does not persist across page reloads.** If the patient refreshes,
  the conversation history is gone. Acceptable for portfolio scope. In production,
  would persist via session store.
- **High-contrast mode is aggressive.** Stone-200 (borders) maps to pure black,
  which makes every card border heavy. Functional but not beautiful. A production
  version would need a tuned high-contrast palette rather than a blanket swap.

## Entry points

- `client/src/pages/PatientView.tsx` — page component, session loading, layout
- `client/src/components/patient/AudioPlayer.tsx` — custom player with waveform
- `client/src/components/patient/WaveformScrubber.tsx` — Web Audio decode + canvas
- `client/src/components/patient/LanguageToggle.tsx` — ES/EN pill toggle
- `client/src/components/patient/PatientConversation.tsx` — ConvAI session
- `client/src/components/patient/AccessibilityControls.tsx` — large text + contrast
- `client/src/index.css` — `.large-text` and `.high-contrast` CSS rules
