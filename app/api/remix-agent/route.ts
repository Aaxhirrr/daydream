import { NextResponse } from "next/server"
import { planDaydreamRemix } from "@/lib/daydream-agent"
import type {
  DaydreamGenerationResult,
  DaydreamRemixAgentResponse,
} from "@/lib/daydream-types"

export const runtime = "nodejs"
export const maxDuration = 120

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      request?: string
      reel?: DaydreamGenerationResult
      threadId?: string
    }

    const remixRequest = body?.request?.trim()
    const reel = body?.reel
    const threadId = body?.threadId // New: track thread context

    if (!remixRequest) {
      const payload: DaydreamRemixAgentResponse = {
        ok: false,
        error: "Please describe what you want to change.",
      }
      return NextResponse.json(payload, { status: 400 })
    }

    if (!reel) {
      const payload: DaydreamRemixAgentResponse = {
        ok: false,
        error: "The saved reel context is missing.",
      }
      return NextResponse.json(payload, { status: 400 })
    }

    const plan = await planDaydreamRemix(reel, remixRequest)
    
    // New: If we have a threadId, persist the plan to the thread
    if (threadId) {
      try {
        const { updateThreadWithPlan } = await import("@/lib/daydream-threads")
        await updateThreadWithPlan(threadId, remixRequest, plan)
      } catch (e) {
        console.error("[daydream] Failed to update thread with plan:", e)
      }
    }

    const payload: DaydreamRemixAgentResponse = {
      ok: true,
      plan,
    }

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    const payload: DaydreamRemixAgentResponse = {
      ok: false,
      error: error instanceof Error ? error.message : "The Gemini remix agent failed.",
    }

    return NextResponse.json(payload, { status: 500 })
  }
}
