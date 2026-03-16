import { NextResponse } from "next/server"
import { getDaydreamThread, saveDaydreamThread } from "@/lib/daydream-threads"
import { createDaydreamJob } from "@/lib/daydream-jobs"
import type { DaydreamCreateJobResponse } from "@/lib/daydream-types"

export const runtime = "nodejs"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const { threadId } = await params
    const thread = await getDaydreamThread(threadId)

    if (!thread || !thread.pendingRemix) {
      return NextResponse.json({ ok: false, error: "No pending remix to approve." }, { status: 400 })
    }

    const { plan } = thread.pendingRemix
    
    // Trigger the actual generation job using the production prompt from the plan
    // Preserve the current reel's pacing mode when remixing from a board thread.
    const job = await createDaydreamJob(
      plan.productionPrompt,
      thread.reel,
      thread.reel.durationSeconds,
      thread.reel.shotCount ?? thread.reel.storyboard.shots.length,
    )

    // Clear the pending remix in the thread as it's now running
    await saveDaydreamThread({
      ...thread,
      pendingRemix: undefined,
      updatedAt: new Date().toISOString()
    })

    const payload: DaydreamCreateJobResponse = {
      ok: true,
      jobId: job.jobId,
    }

    return NextResponse.json(payload, { status: 202 })
  } catch (error) {
    return NextResponse.json({ 
      ok: false, 
      error: error instanceof Error ? error.message : "Approval failed." 
    }, { status: 500 })
  }
}
