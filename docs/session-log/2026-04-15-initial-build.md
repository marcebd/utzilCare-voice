# 2026-04-15 Initial build

Work started: 2026-04-15
Fixes continued through: 2026-04-16
Documented: 2026-04-18

## Headlines

- **Shipped:** voice cloning, bilingual audio generation, ConvAI Q&A, waveform
  scrubber, accessibility controls, deploy to prod (Vercel + Railway)
- **Biggest investigation:** ConvAI language switching — 4 attempts before landing
  on prompt anchoring as the real fix (see section 5)
- **Biggest near-miss:** real ElevenLabs API key pasted into `.env.example`
  (tracked file), caught before commit (see section 7)
- **Biggest pattern to remember:** broad regex over error response bodies caught
  unrelated errors — match on ElevenLabs error codes/statuses, not string content
  (see section 2)

---

## What got built

- GitHub repo `marcebd/utzilCare-voice` (public, MIT)
- Monorepo: `client/` (React 19 + Vite 6 + Tailwind v4) and `server/` (Express + TS)
- Server endpoints: clone-voice, preview-voice, generate-instructions, create-agent,
  sessions/:id, sessions/:id/audio, sessions/:id/convai-url, /health
- Clinician flow: VoiceCloner (MediaRecorder + upload), InstructionComposer (6
  bilingual presets), ShareFlow (QR code + copy link)
- Patient flow: AudioPlayer with WaveformScrubber (Web Audio API + canvas),
  LanguageToggle, PatientConversation (ConvAI via @elevenlabs/react),
  AccessibilityControls (large text + high contrast)
- Session store: Upstash Redis with in-memory fallback for local dev
- Audio cache with regenerate-on-read for server restarts
- Persistent demo session with stock voice (Rachel) and bilingual ConvAI agent
- Deploy: Vercel (frontend) + Railway (backend)
- Polished README with clinical narrative, Mermaid architecture diagram, embedded
  demo video, live URLs

---

## Path taken (dead ends included)

### 1. Repo creation and monorepo scaffolding

- Created `marcebd/utzilCare-voice` on GitHub (public, MIT). Brief originally
  said `utzilvoice`; chose `utzilCare-voice` to match workspace naming convention
  (`utzilCare-backend`, `utzilCare-www`, `utzilcare-iOS`).
- npm workspaces with `client/` and `server/`. Root `package.json` with workspace
  scripts (`dev:client`, `dev:server`).
- Port 3001 was occupied by `utzilCare-backend`. Switched to 4000 for this project.
- Vercel and Railway deploy configs (`vercel.json`, `railway.json`) committed from
  the start.
- This section was clean. No significant dead ends.

### 2. ElevenLabs API integration and plan-tier discovery

- Built typed wrapper in `server/src/lib/elevenlabs.ts` covering 5 ElevenLabs
  endpoints (clone, TTS, ConvAI create, ConvAI signed URL, preview).
- **Discovery: free tier blocks ALL API usage**, not just cloning. Even stock
  library voices return 403 via API on the free plan. User upgraded to Starter
  ($5/mo) which unblocked everything.
- **Voice limit hit (10/10):** during smoke testing, accumulated test clones and
  hit the Starter plan's 10-voice cap. The error mapper initially returned "That
  voice was not found" because the regex `/voice/i` matched the word "voice" in
  the `voice_limit_reached` response body.
- **Dead end and pattern:** The broad regex `(status === 400) && /voice/i.test(body)`
  was catching unrelated ElevenLabs errors that happened to contain the word
  "voice" anywhere in the response. Lesson: don't match error content with broad
  regex. Match on ElevenLabs' structured error codes (`detail.status` field)
  first, fall through to generic handling. This is a recurring pattern with
  LLM-written error mappers — they reach for regex over strings instead of
  parsing the structured error response.
- Fixed by checking `detail.status === 'voice_limit_reached'` before the regex
  fallback, and tightening the regex to `/voice.*not found/i`.

### 3. Clinician flow UI

- **VoiceCloner verification card never appeared after recording.** Used `useRef`
  for the recorded audio Object URL. Writing to a ref doesn't trigger a re-render,
  so the conditional `status === 'stopped' && recordedAudioUrl` stayed false
  forever. The user saw a blank space between the tabs and the Clone button.
  Dead end: should have been `useState` from the start. This is a React gotcha
  that comes up whenever you store derived state in a ref and render from it.
- **ShareFlow QR code pushed outside card boundary.** The grid column
  `grid-cols-[1fr_240px]` didn't constrain overflow. Long patient URL with
  `truncate` class (which uses `white-space: nowrap`) prevented the left column
  from shrinking. Fixed with `minmax(0, 1fr)` + `min-w-0` + replaced `truncate`
  with `break-all`.
- **Recording-saved verification UX.** User flagged that after pressing stop,
  there was no confirmation the recording was saved. Added a forest-bordered
  success card with checkmark icon, "Recording saved — 0:12" label, audio
  player for playback, and a prominent Re-record button (replacing a tiny
  underline link).

### 4. Patient view and waveform

- Custom AudioPlayer with play/pause, seekable progress, Replay, Download MP3.
  No native `<audio controls>` — portfolio quality demanded custom UI.
- WaveformScrubber: fetches audio as ArrayBuffer, decodes with
  `AudioContext.decodeAudioData`, samples 96 peak-amplitude bars, renders on
  canvas at devicePixelRatio. Played portion fills forest-800, unplayed stone-300.
  Click to seek, keyboard arrows for accessibility. Falls back gracefully if Web
  Audio API is missing.
- **Dead end: transcript `scrollIntoView` scrolled the whole page.** The
  `scrollIntoView({ behavior: 'smooth', block: 'end' })` method walks up the DOM
  and scrolls the nearest scrollable ancestor. With the transcript container at
  `max-h-72 overflow-y-auto` inside a page that also scrolls, it scrolled the
  page, yanking the patient away from the conversation card on every new message.
  Fixed with `container.scrollTo({ top: scrollHeight })` on a ref to the
  transcript div. Small bug, but it would bite any future session adding
  auto-scroll to a contained overflow region.

### 5. ConvAI language switching (the big investigation)

- **Attempt 1: `sendContextualUpdate` on language toggle.** Sent "The patient has
  switched to Spanish. Respond only in Spanish." when the toggle changed. Failed.
  `sendContextualUpdate` injects text into the LLM's conversation context but
  does NOT change the STT (speech-to-text) pipeline. STT kept transcribing
  Spanish speech as English, so the LLM saw English input and responded in
  English regardless of the contextual nudge.

- **Attempt 2: `startSession` with `overrides.agent.language`.** The
  `@elevenlabs/react` SDK types allow `overrides.agent.language` on `startSession`,
  which should configure the STT pipeline at the WebSocket level. Returned HTTP
  400 on signed URL sessions. Likely not supported with signed URLs (only with
  public agent IDs or conversation tokens). Dead end confirmed by testing.

- **Attempt 3: Two agents per session (one ES, one EN).** Created two separate
  ElevenLabs agents at session creation, each with a single-language system prompt
  and `language` set in the agent config. Language toggle disconnected from one
  agent and reconnected to the other. This worked reliably but had real costs:
  double agent creation time, double quota usage, reconnect dropped conversation
  context, re-requested mic permission on some browsers, and added a reconnect
  state machine to the client component. Shipped briefly but was the wrong
  architecture.

- **Attempt 4 (landed): Single bilingual agent, language rule at top of prompt.**
  One agent per session. System prompt leads with an explicit language-matching
  instruction at the highest priority position. Both instruction texts included
  (Spanish and English). `language` field left unset in agent config so STT
  auto-detects. See [ADR](../decisions/2026-04-18-single-bilingual-agent.md).

- **How we got to the right answer:** Marcela flagged the correct diagnosis before
  I did. The insight: `eleven_multilingual_v2` speaks whatever text it receives.
  If the response is in English, the text being sent to TTS is already in English.
  The bug was upstream of TTS — in the system prompt anchoring the LLM's language
  and in STT config defaulting to English transcription. This reframing eliminated
  three wrong approaches and pointed directly at prompt structure as the fix.

### 6. Deploy and demo session

- **Railway CLI refused non-interactive login.** Both `railway login` and
  `railway login --browserless` require a TTY. Claude Code's bash runner is
  non-interactive. Workaround: user opened Railway web UI
  (https://railway.com), connected GitHub repo, configured env vars and domain
  through the dashboard. Future sessions should not attempt Railway CLI login —
  go straight to the web UI.
- **Vercel CLI worked** but needed a lowercase project name (`utzilcare-voice`
  instead of `utzilCare-voice`). Deployed via `vercel --prod --yes` from the
  repo root.
- **Demo session:** initially had `agentId: null` which disabled the ConvAI
  button on `/patient/demo`. Created a persistent bilingual agent via direct
  ElevenLabs API call and hardcoded its ID in the demo session constant.
- **CORS:** initially set to `*` during setup. Locked to the Vercel origin
  (`https://utzilcare-voice.vercel.app`) after both deploys confirmed working.

---

## Decisions ratified as ADRs

- [Single bilingual ConvAI agent](../decisions/2026-04-18-single-bilingual-agent.md)
- [Upstash over in-memory sessions](../decisions/2026-04-18-upstash-over-in-memory.md)
- [Client-side playback speed](../decisions/2026-04-18-playback-speed-client-side.md)
- [Stock voice for demo session](../decisions/2026-04-18-stock-voice-demo-session.md)
- [No client persistence](../decisions/2026-04-18-no-client-persistence.md)

---

## TODOs surfaced but not completed

- **ACPCA paper citations:** README has placeholder text for the two peer-reviewed
  publications. User needs to paste exact titles, authors, and DOIs.
- **Indigenous language support (Mam, Kaqchikel, Q'eqchi'):** noted in README as
  planned future work pending ElevenLabs multilingual model expansion.
- **WhatsApp delivery (Twilio):** noted in README as future work. No code written.
- **Doctor consent flow for voice cloning:** needed for any real clinical deployment.
  Not in portfolio scope.
- **Audit logging:** needed for HIPAA-grade production deployment. Not in portfolio
  scope.
- **Offline mode:** noted in README. Would require local TTS model.
- **Delete test voices from ElevenLabs account:** 10/10 voice limit hit during
  development. Old test voices (e.g., "Dr. Smith Test") should be cleaned up at
  https://elevenlabs.io/app/voice-lab.

---

## Things that felt important but didn't fit

- **API key near-miss.** Real ElevenLabs API key was pasted into `.env.example`
  (a git-tracked file) instead of `.env` (gitignored). Caught before any commit
  exposed it. The key was moved to `.env` and `.env.example` restored to empty
  values. This is the kind of incident that becomes a post-mortem if it goes
  wrong. Added explicit warning to CLAUDE.md DO NOT section: "Never paste keys
  into `.env.example`."

- **ElevenLabs Starter plan quota.** 10 cloned voices max, 30,000 characters/month
  TTS. Both are easy to hit during development — smoke tests, demo audio
  generation, and ConvAI agent creation all consume quota. Future sessions should
  be aware and avoid unnecessary regeneration. Cross-referenced in
  [elevenlabs-integration.md](../systems/elevenlabs-integration.md) known
  constraints.

- **User's product instinct on UX.** Marcela caught three non-obvious UX issues
  before I surfaced them: the recording-saved verification need (section 3), the
  language toggle behavioral scope (section 5), and the `eleven_multilingual_v2`
  diagnosis that the bug was in prompt anchoring not TTS (section 5). Pattern:
  when Marcela pushes back on interaction design or ElevenLabs API behavior, the
  pushback has usually identified something real. Future sessions should
  investigate her feedback before proposing alternatives.

---

## Scope note

This session covered only `utzilCare-voice`. The rebrand, queue system, and
WhatsApp agent decisions made in prior sessions live in the parent workspace
(`utzilCare-backend`, `utzilCare-www`) and need a separate documentation pass.
The only link between this session and the rebrand is the Ceiba design system
(`../DESIGN.md`), which utzilCare-voice adopts for visual consistency.
