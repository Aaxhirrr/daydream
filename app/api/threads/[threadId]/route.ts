import { NextResponse } from "next/server"
import { getDaydreamThread } from "@/lib/daydream-threads"

export const runtime = "nodejs"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const { threadId } = await params
    const thread = await getDaydreamThread(threadId)

    if (!thread) {
      return NextResponse.json({ ok: false, error: "Thread not found." }, { status: 404 })
    }

    return NextResponse.json({ ok: true, thread }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ 
      ok: false, 
      error: error instanceof Error ? error.message : "Failed to load thread." 
    }, { status: 500 })
  }
}
