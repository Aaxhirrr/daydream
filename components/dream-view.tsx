"use client"

import { useEffect, useState } from "react"
import { ArrowLeft, Download, Loader2, Music4, RefreshCw } from "lucide-react"
import type { DaydreamCreateJobResponse, DaydreamGenerationResult, DaydreamJobApiResponse } from "@/lib/daydream-types"

interface DreamViewProps {
  prompt: string
  onBack: () => void
  onComplete?: (result: DaydreamGenerationResult) => void
  displayPrompt?: string
  referenceResult?: DaydreamGenerationResult
  jobId?: string // New: allow passing an already created job
  durationSeconds?: number
  shotCount?: number
}

const phaseMessages = [
  "Writing your storyboard...",
  "Scoring the vibe with Lyria...",
  "Painting hero frames with Gemini image...",
  "Animating shots with Veo...",
  "Stitching the dream into a final reel...",
]

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function progressForStage(stage: string, status: string) {
  if (status === "completed") return 100

  const normalized = stage.toLowerCase()
  const match = normalized.match(/\((\d+)\s*\/\s*(\d+)\)/)
  const frac = match ? Math.max(0, Math.min(1, Number(match[1]) / Math.max(1, Number(match[2])))) : null
  if (normalized.includes("storyboard")) return 16
  if (normalized.includes("lyria")) return 34
  if (normalized.includes("hero frame")) {
    if (frac != null) return Math.round(34 + (54 - 34) * frac)
    return 54
  }
  if (normalized.includes("animating") || normalized.includes("veo")) {
    if (frac != null) return Math.round(54 + (78 - 54) * frac)
    return 78
  }
  if (normalized.includes("stitching")) {
    if (frac != null) return Math.round(78 + (92 - 78) * frac)
    return 92
  }
  if (normalized.includes("ready")) return 100
  return 8
}

export default function DreamView({
  prompt,
  onBack,
  onComplete,
  displayPrompt,
  referenceResult,
  jobId: jobIdFromProps, // Destructure with a different name
  durationSeconds,
  shotCount,
}: DreamViewProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [progress, setProgress] = useState(0)
  const [phaseMessage, setPhaseMessage] = useState(phaseMessages[0])
  const [jobId, setJobId] = useState("")
  const [result, setResult] = useState<DaydreamGenerationResult | null>(null)
  const [error, setError] = useState("")
  const [retryTick, setRetryTick] = useState(0)

  useEffect(() => {
    const targetDuration = durationSeconds ?? 30
    const fadeTimer = setTimeout(() => setIsVisible(true), 100)
    const controller = new AbortController()
    let isDisposed = false

    setProgress(8)
    setPhaseMessage(phaseMessages[0])
    setJobId("")
    setResult(null)
    setError("")

    async function generateDream() {
      try {
        let activeJobId = jobIdFromProps

        if (!activeJobId) {
          const response = await fetch("/api/generate", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ prompt, referenceResult, durationSeconds: targetDuration, shotCount }),
            signal: controller.signal,
          })

          const payload = (await response.json()) as DaydreamCreateJobResponse
          if (!response.ok || !payload.ok) {
            throw new Error(payload.ok ? "DayDream generation failed." : payload.error)
          }
          activeJobId = payload.jobId
        }

        if (isDisposed) {
          return
        }

        setJobId(activeJobId)
        setProgress(12)

        while (!isDisposed) {
          await wait(2500)

          const statusResponse = await fetch(`/api/generate/${activeJobId}`, {
            method: "GET",
            cache: "no-store",
            signal: controller.signal,
          })

          const statusPayload = (await statusResponse.json()) as DaydreamJobApiResponse
          if (!statusResponse.ok || !statusPayload.ok) {
            throw new Error(statusPayload.ok ? "Unable to load the DayDream job." : statusPayload.error)
          }

          if (isDisposed) {
            return
          }

          setPhaseMessage(statusPayload.job.stage || phaseMessages[0])
          setProgress((current) => Math.max(current, progressForStage(statusPayload.job.stage, statusPayload.job.status)))

          if (statusPayload.job.status === "completed" && statusPayload.job.result) {
            setPhaseMessage(`Your ${statusPayload.job.result.durationSeconds}-second edit is ready.`)
            setProgress(100)
            setResult(statusPayload.job.result)
            onComplete?.(statusPayload.job.result)
            return
          }

          if (statusPayload.job.status === "failed") {
            throw new Error(statusPayload.job.error || "DayDream generation failed.")
          }
        }
      } catch (generationError) {
        if (controller.signal.aborted || isDisposed) {
          return
        }

        setError(generationError instanceof Error ? generationError.message : "DayDream generation failed.")
      }
    }

    generateDream()

    return () => {
      isDisposed = true
      controller.abort()
      clearTimeout(fadeTimer)
    }
  }, [durationSeconds, jobIdFromProps, onComplete, prompt, referenceResult, retryTick, shotCount])

  const handleBack = () => {
    setIsVisible(false)
    setTimeout(onBack, 350)
  }

  return (
    <div
      className={`absolute inset-0 z-40 overflow-y-auto bg-black/72 backdrop-blur-2xl transition-all duration-500 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
    >
      <button
        onClick={handleBack}
        className="absolute left-6 top-6 z-20 flex items-center gap-2 text-white/70 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-5 w-5" />
        <span className="text-sm">Back</span>
      </button>

      {!result && !error ? (
        <div className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
          <div className="mb-32 max-w-xl text-center">
            <div className="mb-6 flex items-center justify-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-white/70" />
              <span className="text-sm uppercase tracking-widest text-white/50">Dreaming</span>
            </div>

            <h2 className="mb-4 text-3xl font-light text-white md:text-4xl">Creating your cinematic vision</h2>
            <p className="mb-8 text-sm italic text-white/50">{`"${displayPrompt || prompt}"`}</p>

            <div className="mx-auto w-full max-w-md">
              <div className="h-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-white/30 to-white/60 transition-all duration-700 ease-out"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
              <p className="mt-3 text-sm text-white/42">{phaseMessage}</p>
              {jobId ? <p className="mt-2 text-[11px] uppercase tracking-[0.24em] text-white/28">{jobId}</p> : null}
            </div>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
          <div className="w-full max-w-xl rounded-[28px] border border-white/10 bg-white/[0.03] p-8 text-center">
            <p className="text-xs uppercase tracking-[0.32em] text-white/45">Generation failed</p>
            <h2 className="mt-3 text-3xl font-light text-white">DayDream hit a wall</h2>
            <p className="mt-4 text-sm leading-6 text-white/60">{error}</p>

            <div className="mt-8 flex items-center justify-center gap-3">
              <button
                onClick={() => setRetryTick((value) => value + 1)}
                className="flex h-11 items-center justify-center gap-2 rounded-full border border-white/14 bg-white/[0.06] px-5 text-sm text-white transition-colors hover:bg-white/[0.1]"
              >
                <RefreshCw className="h-4 w-4" />
                Retry
              </button>
              <button
                onClick={handleBack}
                className="flex h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-medium text-black transition-colors hover:bg-white/90"
              >
                Go back
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {result ? (
        <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-6 py-16">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.85fr)]">
            <div className="overflow-hidden rounded-[30px] border border-white/10 bg-black/35 shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
              <video
                src={result.finalVideo.url}
                controls
                autoPlay
                loop
                className="aspect-video h-full w-full bg-black object-cover"
              />
            </div>

            <div className="flex flex-col gap-4 rounded-[30px] border border-white/10 bg-white/[0.03] p-6">
              <div>
                <p className="text-xs uppercase tracking-[0.32em] text-white/45">Dream complete</p>
                <h2 className="mt-3 text-3xl font-light text-white">
                  Your {result.durationSeconds}-second edit is ready
                </h2>
                <p className="mt-4 text-sm leading-6 text-white/60">{result.storyboard.synopsis}</p>
              </div>

              <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                <p className="text-[11px] uppercase tracking-[0.28em] text-white/38">Visual style</p>
                <p className="mt-2 text-sm leading-6 text-white/68">{result.storyboard.visualStyle}</p>
              </div>

              <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                <div className="flex items-center gap-2 text-white/70">
                  <Music4 className="h-4 w-4" />
                  <p className="text-[11px] uppercase tracking-[0.28em] text-white/38">Lyria prompt</p>
                </div>
                <p className="mt-2 text-sm leading-6 text-white/68">{result.storyboard.audioPrompt}</p>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <a
                  href={result.finalVideo.url}
                  download
                  className="flex h-11 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-medium text-black transition-colors hover:bg-white/90"
                >
                  <Download className="h-4 w-4" />
                  Download video
                </a>
                <a
                  href={result.soundtrack.url}
                  download
                  className="flex h-11 items-center justify-center gap-2 rounded-full border border-white/14 bg-white/[0.05] px-5 text-sm text-white transition-colors hover:bg-white/[0.09]"
                >
                  Download audio
                </a>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {result.heroFrames.map((frame, index) => (
              <div key={frame.url} className="overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.03]">
                <img src={frame.url} alt={frame.label} className="aspect-video h-full w-full object-cover" />
                <div className="p-4">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-white/38">{`Shot ${index + 1}`}</p>
                  <p className="mt-2 text-sm text-white/80">{frame.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
