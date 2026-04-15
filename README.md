# UtzilCare Voice

> ElevenLabs + UtzilCare = Voice interface for post-operative care instructions.

A standalone web application that generates multilingual voice playback of post-operative care instructions for patients in low-resource healthcare settings, delivered in the cloned voice of their own doctor.

**Status:** in active development. README and demo link will be updated as features land.

## Why this exists

Patients undergoing reconstructive surgery in Guatemala frequently cannot read or fully understand written post-op instructions, and often never hear from their doctor again after discharge. This project is built in response to two peer-reviewed publications documenting that gap (American Cleft Palate-Craniofacial Association, 2023 and 2024).

UtzilCare Voice closes the loop by generating personalized, doctor-voiced, multilingual audio instructions and a follow-up conversational agent the patient can ask questions of after discharge.

## Stack

- **Frontend:** React + TypeScript + Tailwind CSS v4 (Vite)
- **Backend:** Node.js + Express + TypeScript
- **APIs:** ElevenLabs TTS, Voice Cloning, Conversational Agents
- **Session store:** Upstash Redis
- **Deploy:** Vercel (frontend) + Railway (backend)

## Repository layout

```
utzilCare-voice/
├── client/          React + Vite app (clinician + patient views)
├── server/          Express API (clone, generate, agent endpoints)
├── .env.example     Copy to .env and fill in ElevenLabs + Upstash credentials
└── README.md
```

## Setup

```bash
git clone https://github.com/marcebd/utzilCare-voice.git
cd utzilCare-voice
npm install
cp .env.example .env   # fill in ELEVENLABS_API_KEY and UPSTASH_* values
```

Run client and server in two terminals:

```bash
npm run dev:server     # http://localhost:4000
npm run dev:client     # http://localhost:5173
```

## Deployment

- **Frontend:** Vercel reads `vercel.json` at the repo root, builds the `client`
  workspace, serves `client/dist`, and falls through to `index.html` for SPA routes.
  Set `VITE_API_URL` to the deployed server URL.
- **Backend:** Railway reads `railway.json` at the repo root, builds the `server`
  workspace, and runs `node dist/index.js`. Set `ELEVENLABS_API_KEY`,
  `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, and `CORS_ORIGIN` (the Vercel
  frontend URL) in the Railway environment.

## License

MIT
