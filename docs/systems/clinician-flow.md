# Clinician Flow

Three-step wizard at `/clinician` where a doctor sets up voiced discharge
instructions for a patient. Each step completes before the next unlocks.
State is held in `ClinicianView.tsx` and passed down as props. No persistence
between page reloads — if the clinician refreshes, they start over.

## Flow (top to bottom)

### Step 1: Clone voice (`VoiceCloner`)

The clinician records 30-60 seconds of their voice or uploads an audio file.

- **Record tab:** uses `MediaRecorder` API via the `useRecorder` hook. Picks the
  best available codec (`audio/webm;codecs=opus` on Chromium/Firefox, `audio/mp4`
  on Safari). Shows a running timer during recording.
- **Upload tab:** file input accepting `audio/*`, shows filename and size.
- **Doctor name input:** 2-80 chars, validated by Zod on the server.
- **Submit:** calls `POST /api/clone-voice` with multipart form (audio blob +
  doctor name). Shows "Cloning your voice... this takes about 15 seconds"
  progress banner.
- **Verification:** on success, immediately calls `POST /api/preview-voice` to
  generate a test phrase ("Hola, soy su doctor. Estoy aqui para guiarle.") in the
  cloned voice. The clinician plays it back to verify the clone sounds right.
- **Post-stop recording confirmation:** a forest-bordered success card appears
  immediately after the clinician presses stop, showing "Recording saved — 0:12"
  with an audio player and a prominent Re-record button.
- **Output:** `voiceId` + `doctorName` passed to step 2.

### Step 2: Compose instructions (`InstructionComposer` + `PresetLibrary`)

The clinician writes or selects bilingual post-op instructions.

- **Preset library:** sidebar with 6 bilingual templates (wound care, medication
  schedule, diet restrictions, warning signs, follow-up appointment, physical
  activity). Clicking a preset fills both text areas. Presets are defined in
  `presets.ts`.
- **Two text areas:** Spanish and English, 3000 char limit each with a live
  counter (turns red past the cap). Editing clears the "selected preset" highlight.
- **Primary language selector:** segmented control (Español / English). Determines
  which language the ConvAI agent is optimized for and which audio plays first on
  the patient view.
- **Reading speed selector:** Normal / Slow. Carried to the patient view via URL
  query param, applied client-side via `playbackRate`. See
  [playback speed ADR](../decisions/2026-04-18-playback-speed-client-side.md).
- **Submit:** calls `POST /api/generate-instructions` (generates both ES + EN
  audio in parallel), then `POST /api/create-agent` (creates a single bilingual
  ConvAI agent). Agent creation is non-fatal — if it fails, audio still works and
  the clinician sees a warning, not a blocker.
- **Output:** `sessionId` + `agentId` + `primaryLanguage` + `speed` passed to
  step 3.

### Step 3: Share (`ShareFlow`)

The clinician sees the patient URL and hands it off.

- **Patient URL:** built from `window.location.origin/patient/{sessionId}` with
  optional `?lang=` and `?speed=slow` query params. Full URL displayed with
  `break-all` wrapping (not truncated).
- **Copy button:** writes to clipboard via `navigator.clipboard.writeText`.
  Shows transient "Copied" confirmation for 2 seconds.
- **QR code:** generated client-side with the `qrcode` library. Forest-green on
  white, 240px. Ready to print or scan from a phone.
- **Session summary:** shows session ID, primary language, reading speed, and
  assistant availability (green "Ready" if agent was created, amber warning if
  agent creation failed).
- **Open patient view:** link that opens `/patient/{sessionId}` in a new tab.
- **Start over:** resets all state and returns to step 1.

## Integration points

| Step | Server endpoint | What it does |
|---|---|---|
| 1 | `POST /api/clone-voice` | Sends audio to ElevenLabs, returns voiceId |
| 1 | `POST /api/preview-voice` | Generates preview phrase in cloned voice |
| 2 | `POST /api/generate-instructions` | TTS for both languages, creates session |
| 2 | `POST /api/create-agent` | Creates bilingual ConvAI agent, patches session |
| 3 | (none) | ShareFlow is client-only — URL + QR generated locally |

## Known constraints

- **No save/resume.** If the clinician refreshes at step 2, they lose the cloned
  voice and must start over. The voiceId is in component state, not persisted.
  Acceptable for portfolio scope. A production version would persist the voiceId
  to the session store after step 1.
- **10-voice ElevenLabs limit** on Starter plan. Each clone creates a new voice.
  Clinicians who clone repeatedly will hit the cap. The error is now mapped
  correctly (`voice_limit_reached`) with guidance to delete old voices.
- **Agent creation takes ~2s.** The UI shows a progress message ("Setting up the
  conversational assistant...") during this time. If it fails, the clinician sees
  a non-blocking warning and the patient still gets audio playback.

## Entry points

- `client/src/pages/ClinicianView.tsx` — orchestrator, step state, prop passing
- `client/src/components/clinician/VoiceCloner.tsx` — step 1
- `client/src/components/clinician/InstructionComposer.tsx` — step 2
- `client/src/components/clinician/PresetLibrary.tsx` — preset sidebar
- `client/src/components/clinician/presets.ts` — 6 bilingual instruction templates
- `client/src/components/clinician/ShareFlow.tsx` — step 3
- `client/src/hooks/useRecorder.ts` — MediaRecorder hook
