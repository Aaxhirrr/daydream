import { NextResponse } from "next/server"
import { readDaydreamJob } from "@/lib/daydream-jobs"
import type { DaydreamJobApiResponse } from "@/lib/daydream-types"

export const runtime = "nodejs"

export async function GET(_request: Request, context: { params: Promise<{ jobId: string }> }) {
  try {
    const { jobId } = await context.params
    const job = await readDaydreamJob(jobId)

    if (!job) {
      const payload: DaydreamJobApiResponse = {
        ok: false,
        error: "DayDream job not found.",
      }
      return NextResponse.json(payload, { status: 404 })
    }

    const payload: DaydreamJobApiResponse = {
      ok: true,
      job,
    }

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    const payload: DaydreamJobApiResponse = {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to load the DayDream job.",
    }

    return NextResponse.json(payload, { status: 500 })
  }
}
