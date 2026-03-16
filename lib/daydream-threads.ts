import { getFirestore } from "@/lib/firebase-admin"
import { readDaydreamJob } from "@/lib/daydream-jobs"
import type {
  DaydreamThreadRecord,
  DaydreamGenerationResult,
  DaydreamThreadMessage,
  DaydreamRemixAgentPlan,
} from "@/lib/daydream-types"
import { randomUUID } from "node:crypto"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"

const COLLECTION_NAME = "daydream-threads"

function threadsRoot() {
  return path.join(process.cwd(), ".daydream-threads")
}

function threadFilePath(threadId: string) {
  return path.join(threadsRoot(), `${threadId}.json`)
}

async function readThreadFromDisk(threadId: string): Promise<DaydreamThreadRecord | null> {
  try {
    const raw = await readFile(threadFilePath(threadId), "utf8")
    return JSON.parse(raw) as DaydreamThreadRecord
  } catch (error: any) {
    if (error?.code === "ENOENT") return null
    throw error
  }
}

async function writeThreadToDisk(thread: DaydreamThreadRecord): Promise<void> {
  await mkdir(threadsRoot(), { recursive: true })
  await writeFile(threadFilePath(thread.threadId), JSON.stringify(thread, null, 2), "utf8")
}

export async function getDaydreamThread(threadId: string): Promise<DaydreamThreadRecord | null> {
  const db = getFirestore()
  if (!db) {
    // File-backed persistence so local dev still has real threads.
    const existing = await readThreadFromDisk(threadId)
    if (existing) return existing

    // Last-resort: reconstruct a thread from a completed job.
    const job = await readDaydreamJob(threadId)
    if (!job?.result) return null

    return {
      threadId: job.jobId,
      rootJobId: job.jobId,
      currentJobId: job.jobId,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      reel: job.result,
      entries: [
        {
          id: "initial-user",
          role: "user",
          label: "Describe",
          content: job.prompt,
          createdAt: job.createdAt,
        },
        {
          id: "initial-assistant",
          role: "assistant",
          label: "Gemini director",
          content:
            "I loaded this saved DayDream. Tell me what to change (pacing, style, motion, or music) and I’ll keep the strongest identity while pushing the new direction hard.",
          result: job.result,
          createdAt: job.createdAt,
        },
      ],
    }
  }

  const doc = await db.collection(COLLECTION_NAME).doc(threadId).get()
  if (!doc.exists) return null

  return doc.data() as DaydreamThreadRecord
}

export async function saveDaydreamThread(thread: DaydreamThreadRecord): Promise<void> {
  const db = getFirestore()
  if (!db) {
    await writeThreadToDisk({
      ...thread,
      updatedAt: new Date().toISOString(),
    })
    return
  }

  await db.collection(COLLECTION_NAME).doc(thread.threadId).set({
    ...thread,
    updatedAt: new Date().toISOString(),
  })
}

export async function updateThreadWithPlan(threadId: string, request: string, plan: DaydreamRemixAgentPlan): Promise<DaydreamThreadRecord> {
  const thread = await getDaydreamThread(threadId)
  if (!thread) throw new Error("Thread not found")

  const now = new Date().toISOString()
  
  const userMessage: DaydreamThreadMessage = {
    id: randomUUID(),
    role: "user",
    label: "Modify",
    content: request,
    createdAt: now,
  }

  const assistantMessage: DaydreamThreadMessage = {
    id: randomUUID(),
    role: "assistant",
    label: "Gemini director",
    content: plan.assistantReply,
    tags: plan.generateNow ? ["Remix proposed"] : ["Discussing"],
    createdAt: now,
  }

  const updatedThread: DaydreamThreadRecord = {
    ...thread,
    entries: [...thread.entries, userMessage, assistantMessage],
    pendingRemix: {
      request,
      plan,
      createdAt: now,
    },
    updatedAt: now,
  }

  await saveDaydreamThread(updatedThread)
  return updatedThread
}

export async function completeThreadJob(threadId: string, result: DaydreamGenerationResult): Promise<DaydreamThreadRecord> {
  const thread = await getDaydreamThread(threadId)
  if (!thread) throw new Error("Thread not found")

  const now = new Date().toISOString()
  
  const updatedThread: DaydreamThreadRecord = {
    ...thread,
    currentJobId: result.jobId,
    reel: result,
    pendingRemix: undefined,
    entries: [
      ...thread.entries,
      {
        id: randomUUID(),
        role: "assistant",
        label: "Gemini director",
        content: `I pushed the reel toward "${thread.pendingRemix?.request || 'your request'}" while keeping the core spine intact.`,
        tags: ["Remix ready"],
        result,
        createdAt: now,
      }
    ],
    updatedAt: now,
  }

  await saveDaydreamThread(updatedThread)
  return updatedThread
}
