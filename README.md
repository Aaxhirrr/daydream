# DayDream 🎬✨

I built **DayDream**, a gloomy, liminal cinematic editing engine: you type a vibe, and it generates a finished reel with fast, premium cuts. It's built around **Gemini as an agentic creative director**, with image, video, and music generation orchestrated through **Google Cloud** ☁️.

## What It Does 🧠🎞️

1. **Login / Landing**
2. **Studio (Main Page)**
3. **Chat Bar Controls**
4. **Generation Pipeline**
5. **DreamBoard + Per-Reel Agent**

### 1) Login / Landing 🔐

- Dream Machine inspired split-screen: looping cinematic reel on the left, DayDream identity and sign-in on the right.
- Google sign-in UI plus a temporary hardcoded username/password gate for hackathon mode.

### 2) Studio (Main Page) 🧪

- Minimal, cinematic workspace that feels like a "dream lab" rather than a traditional editor.
- A "Dreaming" overlay shows real-time stages while the backend generates (storyboard, audio, hero frames, clips, stitch).

### 3) Chat Bar Controls ⌨️

- Prompt-to-edit workflow: the chat bar is the control surface.
- Duration modes: **12s**, **15s**, **30s**
- Velocity Edit (fast-cut mode): choose **4**, **8**, or **10** hero-frame cuts.
  - For 8/10 cuts, Veo generates short clips (2-3 seconds per shot) for a faster, more hype edit feel.

### 4) Generation Pipeline (Gemini Heavy) 🧬

DayDream orchestrates four generation phases:

1. **Gemini Director (Text)**
   - Produces a structured storyboard: synopsis, visual style, audio direction, and shot-by-shot prompts.
2. **Gemini Image (Hero Frames)**
   - Generates "hero frames" for each shot so the entire reel shares one coherent cinematic look.
3. **Veo (Video)**
   - Animates each hero frame into a short clip (fast cuts for Velocity Edit).
4. **Lyria (Music)**
   - Generates an instrumental soundtrack matching the mood.

Finally, I stitch the clip sequence and soundtrack into a single final reel using **FFmpeg**.

### 5) DreamBoard + Per-Reel Agent 🗂️

- Every completed generation is saved and displayed on DreamBoard.
- Clicking a reel opens a dedicated modify view where you can chat with a Gemini agent about changes.
- The agent proposes a remix plan and requires approval before triggering a new generation (to avoid accidental compute burn).

## Technologies Used 🛠️

- Frontend: Next.js (App Router), React, Tailwind
- Backend: Next.js API routes (Node runtime)
- Google Cloud:
  - Vertex AI (Gemini text, Gemini image, Veo, Lyria)
  - Google Auth Library
  - Cloud Storage (optional when configured; local filesystem works for dev)
- Media: `ffmpeg-static` for stitching
- Persistence:
  - Local filesystem persistence for jobs and threads
  - Optional Firestore support if configured

## Proof of Google Cloud Usage ☁️✅

Even in local dev, all core "intelligence" is executed through Google Cloud APIs:

- Vertex AI client + model calls: `lib/daydream-pipeline.ts`
  - Gemini (text + image), Veo (video), Lyria (audio)
- Agentic remix planning: `app/api/remix-agent/route.ts` + `lib/daydream-agent.ts`
- Threaded remix approval endpoint: `app/api/threads/[threadId]/approve/route.ts`

For "Proof of Google Cloud Deployment / API hits", I include recordings (see links below), plus code pointers that show the exact Google Cloud services and APIs in use.

- A short screen recording showing backend logs from a GCP deployment (Cloud Run recommended) while a generation is triggered.
- Or a quick console walkthrough showing Vertex AI traffic/metrics for the project and the app calling it.

Here are screenshots as well:

## Proof of Work: Live Vertex AI Orchestration ⚡

![Vertex API Calls](./docs/VertexCall.png)
![Vertex Dashboard](./docs/VertexDashboard.png)

## Architecture Diagram 🗺️

![DayDream Architecture](docs/architecture.svg)

## UI Screenshots 🎛️🖼️

These are a few UI/asset snapshots I used while iterating on the DayDream vibe.

![DayDream Logo](docs/ui/logo.png)

![DayDream Alt Logo (Black)](docs/ui/black.png)

![DayDream Alt Logo (White)](docs/ui/white.png)

![DayDream Architecture (PNG)](docs/ui/daydream-architecture.png)

## Learnings (What I Found While Building) 📝

- **Quota is real**: Velocity Edit mode (8/10 cuts) makes many more generation calls (hero frames + Veo clips), so it can hit quota limits faster.
- **Agentic UX needs guardrails**: auto-generation from casual chat is expensive. A dedicated approval step keeps the creative conversation fluid without wasting compute.
- **Fast-cut pacing changes everything**: short 2-3 second clips per shot produce a more energetic edit, even with the same vibe prompt.

## Spin-Up Instructions (Judges) 🚀

### Prereqs

- Node 20+

### 1) Install

```bash
cd UI_ideas/landing
npm install
```

### 2) Configure Environment

Create a local env file:

```bash
cp .env.local.example .env.local
```

Set at minimum:

- `GOOGLE_CLOUD_PROJECT`
- `DAYDREAM_GEMINI_LOCATION`
- `DAYDREAM_VEO_LOCATION`
- `DAYDREAM_LYRIA_LOCATION`

Optional (if using Firestore / Firebase Admin):

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

### Deploying On Vercel (Auth Note) ⚡

Local dev can use `gcloud` ADC, but Vercel can't. For Vercel, set either:

- `GOOGLE_APPLICATION_CREDENTIALS_JSON` to a Service Account JSON (recommended), or
- `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` for a Service Account that also has Vertex AI permissions.

### 3) Run

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Submission Links 📦

- Public repository:

```text
https://github.com/Aaxhirrr/daydream
```

- Proof of Google Cloud Deployment / API Hits (recordings):
  - GitHub README doesn't support inline video playback (it strips `<video>`), so I'm committing the videos and linking them with click-to-open thumbnails.

### Proof Recording 1: VertexCalls.mp4 🎥

[![Proof Recording 1: VertexCalls.mp4](docs/VertexDashboard.png)](docs/submission/VertexCalls.mp4)

Click the thumbnail to open: `docs/submission/VertexCalls.mp4`.

### Proof Recording 2: GeminiDevpost_Hack.mp4 🎥

[![Proof Recording 2: GeminiDevpost_Hack.mp4](docs/VertexCall.png)](docs/submission/GeminiDevpost_Hack.mp4)

Click the thumbnail to open: `docs/submission/GeminiDevpost_Hack.mp4`.

- Demo video (under 4 minutes, placeholder):

```text
TBD: add link to the 4-minute demo showing agentic + multimodal generation in real-time.
```
