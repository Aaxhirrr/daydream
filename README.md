# DayDream 🎬✨

I built **DayDream**, a gloomy, liminal cinematic editing engine: you type a vibe, and it generates a finished reel with fast, premium cuts. It’s built around **Gemini as an agentic creative director**, with image, video, and music generation orchestrated through **Google Cloud** ☁️.

## What It Does 🧠🎞️

1. **Login / Landing**
1. **Studio (Main Page)**
1. **Chat Bar Controls**
1. **Generation Pipeline**
1. **DreamBoard + Per-Reel Agent**

### 1) Login / Landing 🔐

- Dream Machine inspired split-screen: looping cinematic reel on the left, DayDream identity and sign-in on the right.
- Google sign-in UI plus a temporary hardcoded username/password gate for hackathon mode.

### 2) Studio (Main Page) 🧪

- Minimal, cinematic workspace that feels like a “dream lab” rather than a traditional editor.
- A “Dreaming” overlay shows real-time stages while the backend generates (storyboard, audio, hero frames, clips, stitch).

### 3) Chat Bar Controls ⌨️

- Prompt-to-edit workflow: the chat bar is the control surface.
- Duration modes: **12s**, **15s**, **30s**
- Velocity Edit (fast-cut mode): choose **4**, **8**, or **10** hero-frame cuts.
  - For 8/10 cuts, Veo generates short clips (2–3 seconds per shot) for a faster, more hype edit feel.

### 4) Generation Pipeline (Gemini Heavy) 🧬

DayDream orchestrates four generation phases:

1. **Gemini Director (Text)**
   - Produces a structured storyboard: synopsis, visual style, audio direction, and shot-by-shot prompts.
2. **Gemini Image (Hero Frames)**
   - Generates “hero frames” for each shot so the entire reel shares one coherent cinematic look.
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

Even in local dev, all core “intelligence” is executed through Google Cloud APIs:

- Vertex AI client + model calls: `lib/daydream-pipeline.ts`
  - Gemini (text + image), Veo (video), Lyria (audio)
- Agentic remix planning: `app/api/remix-agent/route.ts` + `lib/daydream-agent.ts`
- Threaded remix approval endpoint: `app/api/threads/[threadId]/approve/route.ts`

For “Proof of Google Cloud Deployment / API hits”, I include recordings (see links below), plus code pointers that show the exact Google Cloud services and APIs in use.

- A short screen recording showing backend logs from a GCP deployment (Cloud Run recommended) while a generation is triggered.
- Or a quick console walkthrough showing Vertex AI traffic/metrics for the project and the app calling it.

## Architecture Diagram 🗺️

```mermaid
flowchart TB
  U[User] -->|Prompt + Settings\n(12/15/30s, 4/8/10 cuts)| FE[Next.js Frontend\nStudio + DreamBoard]

  FE -->|POST /api/generate| API1[Next.js API Route\n/app/api/generate]
  FE -->|POST /api/remix-agent| API2[Next.js API Route\n/app/api/remix-agent]
  FE -->|GET/POST /api/threads/*| API3[Thread API Routes\n/app/api/threads/*]
  FE -->|poll GET /api/generate/:jobId| API4[Job Status Route\n/app/api/generate/[jobId]]

  API1 --> JOBS[Job Runner\nlib/daydream-jobs.ts]
  API4 --> JOBS
  API3 --> THREADS[Thread Store\nlib/daydream-threads.ts]

  JOBS --> PIPE[DayDream Pipeline\nlib/daydream-pipeline.ts]
  API2 --> AGENT[Gemini Director Agent\nlib/daydream-agent.ts]
  AGENT -->|proposes plan\n(approval required)| THREADS
  API3 -->|approve| JOBS

  subgraph GCP[Google Cloud / Vertex AI]
    GEMTXT[Gemini Text\nStoryboard + Director]
    GEMIMG[Gemini Image\nHero Frames]
    VEO[Veo\nImage to Video Clips]
    LYRIA[Lyria\nInstrumental Score]
  end

  PIPE --> GEMTXT
  PIPE --> GEMIMG
  PIPE --> VEO
  PIPE --> LYRIA

  PIPE --> FFMPEG[FFmpeg Stitching\nffmpeg-static]
  FFMPEG --> OUT[Final Reel + Assets\npublic/generated/*]

  THREADS -->|local JSON\n.daydream-threads/*| DISK[(Local FS)]
  JOBS -->|local JSON\n.daydream-jobs/*| DISK

  PIPE -. optional .-> GCS[Cloud Storage\n@google-cloud/storage]
  THREADS -. optional .-> FS[Firestore\n(firebase-admin)]
```

## Learnings (What I Found While Building) 📝

- **Quota is real**: Velocity Edit mode (8/10 cuts) makes many more generation calls (hero frames + Veo clips), so it can hit quota limits faster.
- **Agentic UX needs guardrails**: auto-generation from casual chat is expensive. A dedicated approval step keeps the creative conversation fluid without wasting compute.
- **Fast-cut pacing changes everything**: short 2–3 second clips per shot produce a more energetic edit, even with the same vibe prompt.

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

```text
Repo file: public/submission/Demo.mp4
Repo file: public/submission/GeminiDevpost_Hack.mp4 (Git LFS)
```

- Demo video (under 4 minutes, placeholder):

```text
TBD: add link to the 4-minute demo showing agentic + multimodal generation in real-time.
```
