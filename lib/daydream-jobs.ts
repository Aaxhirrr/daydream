import { randomUUID } from "node:crypto"
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { getFirestore } from "@/lib/firebase-admin"
import { runDaydreamPipeline } from "@/lib/daydream-pipeline"
import type { DaydreamGenerationResult, DaydreamJobRecord } from "@/lib/daydream-types"

const DEFAULT_STAGE = "Writing your storyboard..."
const COLLECTION_NAME = "daydream-jobs"

function jobsRoot() {
  // Vercel serverless has a read-only filesystem except for /tmp.
  const isServerless =
    Boolean(process.env.VERCEL) ||
    Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME) ||
    Boolean(process.env.LAMBDA_TASK_ROOT) ||
    Boolean(process.env.NOW_REGION) ||
    Boolean(process.env.VERCEL_REGION) ||
    Boolean(process.env.VERCEL_ENV)

  const runtimeRoot = process.env.DAYDREAM_STATE_DIR || (isServerless ? os.tmpdir() : process.cwd())
  return path.join(runtimeRoot, ".daydream-jobs")
}

function jobFilePath(jobId: string) {
  return path.join(jobsRoot(), `${jobId}.json`)
}

async function writeJob(job: DaydreamJobRecord) {
  const db = getFirestore()
  if (db) {
    await db.collection(COLLECTION_NAME).doc(job.jobId).set(job)
    return
  }

  await mkdir(jobsRoot(), { recursive: true })
  await writeFile(jobFilePath(job.jobId), JSON.stringify(job, null, 2), "utf8")
}

export async function readDaydreamJob(jobId: string) {
  const db = getFirestore()
  if (db) {
    const doc = await db.collection(COLLECTION_NAME).doc(jobId).get()
    if (!doc.exists) return null
    return doc.data() as DaydreamJobRecord
  }

  try {
    const raw = await readFile(jobFilePath(jobId), "utf8")
    return JSON.parse(raw) as DaydreamJobRecord
  } catch (error: any) {
    if (error?.code === "ENOENT") {
      return null
    }

    throw error
  }
}

async function updateDaydreamJob(jobId: string, patch: Partial<DaydreamJobRecord>) {
  const current = await readDaydreamJob(jobId)
  if (!current) {
    throw new Error(`DayDream job ${jobId} was not found.`)
  }

  const next: DaydreamJobRecord = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  }

  await writeJob(next)
  return next
}

export async function listDaydreamJobs() {
  const db = getFirestore()
  if (db) {
    const snapshot = await db
      .collection(COLLECTION_NAME)
      .orderBy("updatedAt", "desc")
      .limit(100)
      .get()

    return snapshot.docs.map((doc) => doc.data() as DaydreamJobRecord)
  }

  try {
    await mkdir(jobsRoot(), { recursive: true })
  } catch (error: any) {
    // If we can't write state (rare), keep the app alive by treating it as empty.
    if (error?.code === "EPERM" || error?.code === "EROFS") {
      return []
    }

    throw error
  }

  const files = await readdir(jobsRoot())
  const jobFiles = files.filter((file) => file.endsWith(".json"))

  const jobs = await Promise.all(
    jobFiles.map(async (file) => {
      const raw = await readFile(path.join(jobsRoot(), file), "utf8")
      return JSON.parse(raw) as DaydreamJobRecord
    }),
  )

  return jobs.sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
}

export async function runDaydreamJob(
  jobId: string,
  prompt: string,
  referenceResult?: DaydreamGenerationResult,
  durationSeconds: number = 30,
  shotCount?: number,
) {
  try {
    await updateDaydreamJob(jobId, {
      status: "running",
      stage: DEFAULT_STAGE,
      error: undefined,
    })

    const result = await runDaydreamPipeline(prompt, {
      jobId,
      referenceResult,
      durationSeconds,
      shotCount,
      onStage: async (stage) => {
        await updateDaydreamJob(jobId, { stage })
      },
    })

    await updateDaydreamJob(jobId, {
      status: "completed",
      stage: `Your ${result.durationSeconds}-second edit is ready.`,
      result,
      durationSeconds: result.durationSeconds,
      shotCount: result.shotCount,
      error: undefined,
    })
  } catch (error) {
    await updateDaydreamJob(jobId, {
      status: "failed",
      stage: "Generation failed.",
      error: error instanceof Error ? error.message : "DayDream generation failed.",
    })
  }
}

export async function createDaydreamJob(
  prompt: string,
  referenceResult?: DaydreamGenerationResult,
  durationSeconds: number = 30,
  shotCount?: number,
) {
  const now = new Date().toISOString()
  const job: DaydreamJobRecord = {
    jobId: randomUUID(),
    prompt,
    referenceJobId: referenceResult?.jobId,
    status: "queued",
    stage: DEFAULT_STAGE,
    createdAt: now,
    updatedAt: now,
    durationSeconds,
    shotCount,
  }

  await writeJob(job)
  return job
}
