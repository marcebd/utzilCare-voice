# UtzilCare Voice

ElevenLabs-powered voice interface for post-operative care instructions.
Standalone portfolio project for an ElevenLabs job application. Functions
independently but designed for future integration into UtzilCare (clinic management
platform for Latin America, beachhead market Guatemala; built to HIPAA-grade
standards as the strictest applicable baseline).

## Product principles

- **Portfolio-first:** This exists to demonstrate ElevenLabs API mastery (TTS,
  Voice Cloning, ConvAI) to their hiring team. Code quality, README storytelling,
  and live demo polish matter more than production hardening.
- **Scope isolation:** All work stays inside `utzilCare-voice/`. Never modify
  `utzilCare-backend`, `utzilCare-www`, `utzilcare-iOS`, or the workspace root.
- **Ceiba design system:** Visual decisions follow `../DESIGN.md` (the workspace-root
  design system shared across UtzilCare). Forest greens, amber accents, warm cream,
  Fraunces/DM Sans/JetBrains Mono. This is the link between utzilCare-voice and
  the parent product's rebrand.
- **Privacy by construction:** Engineered to HIPAA-grade standards as the strictest
  applicable baseline, even though the beachhead market (Guatemala) operates under
  different regulations. This means encryption at rest and in transit, audit logging,
  role-based access, minimum necessary data exposure, and vendor BAAs where
  applicable. This is a design principle, not a legal compliance claim. We are not
  a HIPAA-covered entity and do not assert formal HIPAA compliance.
- **Safety by construction:** ConvAI agent prompts hard-code emergency escalation
  scripts. The always-visible patient disclaimer is non-dismissible. No medical
  advice beyond the stated instructions.
- **No Claude co-author:** Commits authored as `marcebd <marcebd@umich.edu>` only.
  No `Co-Authored-By: Claude` trailer on any commit in this repo.

## Architecture overview

**Server** (`server/src/`): Express 4 + TypeScript on Node 20+. Six API routes
behind express-rate-limit (30/min default, 5/min for expensive operations). Zod
validates every request body. ElevenLabs errors are mapped to typed codes
(`elevenlabs_plan_required`, `elevenlabs_quota_exceeded`, etc.) with human-readable
messages. See [ElevenLabs integration](docs/systems/elevenlabs-integration.md).

**Client** (`client/src/`): React 19 + Vite 6 + Tailwind CSS v4. Two route-level
code-split pages (ClinicianView, PatientView) plus a static LandingView. The
ElevenLabs ConvAI SDK (~140 KB gzip) only loads on the patient route.
Preferred component library is shadcn/ui (Radix + Tailwind), matching the parent
utzilCare-www project — not yet added to this repo but use it if adding complex
UI components. See [clinician flow](docs/systems/clinician-flow.md) and
[patient view](docs/systems/patient-view.md).

**Session store**: Upstash Redis (REST) with 24h TTL. Falls back to an in-memory
Map when Upstash env vars are missing (local dev). A hardcoded "demo" session
always exists and never expires. See [session management](docs/systems/session-management.md).

**Deploy**: Vercel (frontend) + Railway (backend). Configs at repo root
(`vercel.json`, `railway.json`). Vercel needs `VITE_API_URL` pointed at the
Railway URL. Railway needs `ELEVENLABS_API_KEY`, `UPSTASH_REDIS_REST_URL`,
`UPSTASH_REDIS_REST_TOKEN`, and `CORS_ORIGIN`.

## Conventions

### TypeScript
- Strict mode, `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`.
- No `any` types. Use `unknown` and narrow.
- All files `.ts` or `.tsx`, no `.js`.

### Request validation
- Zod schemas on every server endpoint. Client-side types mirror server shapes
  but are maintained separately (no shared package).

### Design system
- Always read `../DESIGN.md` before visual decisions.
- Tailwind v4 theme tokens defined in `client/src/index.css` via `@theme`.

### Ports
- `4000` — utzilCare-voice server (avoids collision with utzilCare-backend on 3001)
- `5173` — utzilCare-voice client (Vite default)
- `3001` — utzilCare-backend (do not use for this project)

### Commits
- Author: `marcebd <marcebd@umich.edu>`, no co-author trailers.
- Conventional commits: `feat(scope):`, `fix(scope):`, `chore:`, `docs:`.

### Documentation dates
- ADRs in `docs/decisions/`: dated by documentation date (when written), not when
  the work happened. Filename: `YYYY-MM-DD-short-slug.md`.
- Session logs in `docs/session-log/`: dated by when the work happened.

## DO NOT

- **No localStorage or client-side persistence.** Brief constraint for portfolio
  scope. Revisit when embedding into UtzilCare clinic dashboard where user prefs
  persist server-side. See [ADR](docs/decisions/2026-04-18-no-client-persistence.md).
- **No database.** Sessions use Upstash Redis with TTL. No Postgres, no SQLite.
- **No autoplay on audio.** Patient must press play intentionally (accessibility).
- **No touching sibling repos.** `utzilCare-backend`, `utzilCare-www`, `utzilcare-iOS`
  are off limits. Scope isolation is a hard constraint.
- **No unbounded ElevenLabs calls in demo loops.** The demo session uses a stock
  voice and caches audio after first generation. Never put TTS or clone calls
  inside loops, retries, or polling. Each call costs characters against the plan.
- **No committing cloned voice audio.** Voice clones are biometric data. Audio
  files generated from cloned voices must not be committed to the repo. The demo
  uses a stock ElevenLabs voice (Rachel, `21m00Tcm4TlvDq8ikWAM`).
- **No hardcoded API keys anywhere.** `.env` is gitignored. `.env.example` has
  empty values only. Server reads keys from `process.env` at runtime. **Never
  paste real keys into `.env.example`** — that file is tracked by git. Keys go
  in `.env` only. (Near-miss in initial build: real ElevenLabs key was pasted
  into `.env.example`, caught before commit.)
- **No dismissible safety disclaimer.** The patient-view amber banner is always
  visible, not closeable. Non-negotiable for medical context.
