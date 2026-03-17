import { NextResponse } from "next/server"
import { after } from "next/server"
import { createDaydreamJob, runDaydreamJob } from "@/lib/daydream-jobs"
import type { DaydreamCreateJobResponse, DaydreamGenerationResult } from "@/lib/daydream-types"

export const runtime = "nodejs"
// Vercel Hobby plan supports up to 300s per Serverless Function invocation.
export const maxDuration = 300

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      prompt?: string
      referenceResult?: DaydreamGenerationResult
      durationSeconds?: number
      shotCount?: number
    }
    const prompt = body?.prompt?.trim()

    if (!prompt) {
      const payload: DaydreamCreateJobResponse = {
        ok: false,
        error: "Please enter a prompt before generating.",
      }
      return NextResponse.json(payload, { status: 400 })
    }

    const job = await createDaydreamJob(prompt, body.referenceResult, body.durationSeconds, body.shotCount)

    try {
      after(() =>
        runDaydreamJob(job.jobId, prompt, body.referenceResult, body.durationSeconds, body.shotCount),
      )
    } catch {
      // Fallback for environments where `after()` is not available.
      void runDaydreamJob(job.jobId, prompt, body.referenceResult, body.durationSeconds, body.shotCount)
    }

    const payload: DaydreamCreateJobResponse = {
      ok: true,
      jobId: job.jobId,
    }

    return NextResponse.json(payload, { status: 202 })
  } catch (error) {
    const payload: DaydreamCreateJobResponse = {
      ok: false,
      error: error instanceof Error ? error.message : "DayDream generation failed.",
    }

    return NextResponse.json(payload, { status: 500 })
  }
}
