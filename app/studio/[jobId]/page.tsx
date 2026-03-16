import { notFound } from "next/navigation"
import ReelStudioShell from "@/components/reel-studio-shell"
import { readDaydreamJob } from "@/lib/daydream-jobs"

export const dynamic = "force-dynamic"

export default async function SavedReelStudioPage({
  params,
}: {
  params: Promise<{ jobId: string }>
}) {
  const { jobId } = await params
  const job = await readDaydreamJob(jobId)

  if (!job || job.status !== "completed" || !job.result) {
    notFound()
  }

  return <ReelStudioShell initialResult={job.result} threadId={jobId} />
}
