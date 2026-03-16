import { NextResponse } from "next/server"
import { completeThreadJob } from "@/lib/daydream-threads"
import type { DaydreamGenerationResult } from "@/lib/daydream-types"

export const runtime = "nodejs"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const { threadId } = await params
    const body = await request.json()
    const result = body.result as DaydreamGenerationResult

    if (!result) {
      return NextResponse.json({ ok: false, error: "Result missing." }, { status: 400 })
    }

    const thread = await completeThreadJob(threadId, result)

    return NextResponse.json({ ok: true, thread }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ 
      ok: false, 
      error: error instanceof Error ? error.message : "Completion failed." 
    }, { status: 500 })
  }
}
