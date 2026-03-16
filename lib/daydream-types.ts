export type DaydreamShot = {
  title: string
  imagePrompt: string
  videoPrompt: string
}

export type DaydreamStoryboard = {
  synopsis: string
  visualStyle: string
  audioPrompt: string
  negativeAudioPrompt: string
  shots: DaydreamShot[]
}

export type DaydreamMediaAsset = {
  url: string
  mimeType: string
  label: string
}

export type DaydreamGenerationResult = {
  jobId: string
  createdAt: string
  prompt: string
  storyboard: DaydreamStoryboard
  heroFrames: DaydreamMediaAsset[]
  clipVideos: DaydreamMediaAsset[]
  soundtrack: DaydreamMediaAsset
  finalVideo: DaydreamMediaAsset
  durationSeconds: number
  shotCount?: number
}

export type DaydreamApiResponse =
  | {
      ok: true
      result: DaydreamGenerationResult
    }
  | {
      ok: false
      error: string
    }

export type DaydreamJobStatus = "queued" | "running" | "completed" | "failed"

export type DaydreamJobRecord = {
  jobId: string
  prompt: string
  referenceJobId?: string
  status: DaydreamJobStatus
  stage: string
  createdAt: string
  updatedAt: string
  error?: string
  durationSeconds?: number
  shotCount?: number
  result?: DaydreamGenerationResult
}

export type DaydreamCreateJobResponse =
  | {
      ok: true
      jobId: string
    }
  | {
      ok: false
      error: string
    }

export type DaydreamJobApiResponse =
  | {
      ok: true
      job: DaydreamJobRecord
    }
  | {
      ok: false
      error: string
    }

export type DaydreamRemixAgentPlan = {
  assistantReply: string
  generateNow: boolean
  refinedRequest: string
  productionPrompt: string
  toolPlan: string[]
}

export type DaydreamThreadMessage = {
  id: string
  role: "user" | "assistant"
  label: string
  content: string
  tags?: string[]
  result?: DaydreamGenerationResult
  createdAt: string
}

export type DaydreamPendingRemix = {
  request: string
  plan: DaydreamRemixAgentPlan
  createdAt: string
}

export type DaydreamThreadRecord = {
  threadId: string
  rootJobId: string
  currentJobId: string
  createdAt: string
  updatedAt: string
  reel: DaydreamGenerationResult
  entries: DaydreamThreadMessage[]
  pendingRemix?: DaydreamPendingRemix
}

export type DaydreamRemixAgentResponse =
  | {
      ok: true
      plan: DaydreamRemixAgentPlan
    }
  | {
      ok: false
      error: string
    }

export type DaydreamThreadResponse =
  | {
      ok: true
      thread: DaydreamThreadRecord
    }
  | {
      ok: false
      error: string
    }
