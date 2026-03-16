import { randomUUID } from "node:crypto"
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { runDaydreamPipeline } from "@/lib/daydream-pipeline"
import type { DaydreamGenerationResult, DaydreamJobRecord } from "@/lib/daydream-types"

const DEFAULT_STAGE = "Writing your storyboard..."

function jobsRoot() {
  return path.join(process.cwd(), ".daydream-jobs")
}

function jobFilePath(jobId: string) {
  return path.join(jobsRoot(), `${jobId}.json`)
}

async function writeJob(job: DaydreamJobRecord) {
  await mkdir(jobsRoot(), { recursive: true })
  await writeFile(jobFilePath(job.jobId), JSON.stringify(job, null, 2), "utf8")
}

export async function readDaydreamJob(jobId: string) {
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
  await mkdir(jobsRoot(), { recursive: true })
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

async function executeDaydreamJob(
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
  void executeDaydreamJob(job.jobId, prompt, referenceResult, durationSeconds, shotCount)
  return job
}
