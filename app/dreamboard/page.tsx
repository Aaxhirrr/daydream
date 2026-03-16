import DreamboardShell, { type DreamboardEntry } from "@/components/dreamboard-shell"
import { listDaydreamJobs } from "@/lib/daydream-jobs"
import type { DaydreamJobRecord } from "@/lib/daydream-types"

export const dynamic = "force-dynamic"

const monthDayFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
})

function createBoardTitle(prompt: string) {
  const primarySegment = prompt.split(",")[0]?.trim() || "DayDream edit"
  return primarySegment.replace(/\.$/, "")
}

function createBoardMeta(createdAt: string, durationSeconds: number) {
  return `${monthDayFormatter.format(new Date(createdAt))} • ${durationSeconds} sec`
}

function isInternalBoardPrompt(prompt: string) {
  const normalized = prompt.trim().toLowerCase()
  return (
    normalized.startsWith("base reel prompt:") ||
    normalized.startsWith("reference reel prompt:") ||
    normalized.startsWith("current synopsis:") ||
    normalized.startsWith("current visual style:")
  )
}

function shouldShowOnDreamboard(job: DaydreamJobRecord) {
  if (job.status !== "completed" || !job.result?.finalVideo?.url) {
    return false
  }

  const prompt = job.result?.prompt || job.prompt
  return !isInternalBoardPrompt(prompt)
}

export default async function DreamboardPage() {
  const jobs = await listDaydreamJobs()

  const boards: DreamboardEntry[] = jobs
    .filter(shouldShowOnDreamboard)
    .map((job) => ({
      jobId: job.jobId,
      eyebrow: "GENERATED REEL",
      title: createBoardTitle(job.result?.prompt || job.prompt),
      meta: createBoardMeta(job.result?.createdAt || job.createdAt, job.result?.durationSeconds || 30),
      prompt: job.prompt,
      href: `/studio/${job.jobId}`,
      finalVideoUrl: job.result!.finalVideo.url,
      heroFrameUrls: job.result!.heroFrames.slice(0, 2).map((frame) => frame.url),
    }))

  const editorHref = boards[0]?.href || "/studio"

  return <DreamboardShell boards={boards} editorHref={editorHref} />
}
