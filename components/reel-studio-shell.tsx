"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import {
  ArrowLeft,
  ArrowUp,
  CircleHelp,
  Copy,
  ImageIcon,
  Infinity as InfinityIcon,
  LayoutGrid,
  Music4,
  PanelsTopLeft,
  PencilLine,
  Share2,
  Sparkles,
  UserRound,
  Video,
} from "lucide-react"
import DreamView from "@/components/dream-view"
import type {
  DaydreamGenerationResult,
  DaydreamRemixAgentPlan,
  DaydreamRemixAgentResponse,
} from "@/lib/daydream-types"

type RemixEntry = {
  id: string
  role: "user" | "assistant"
  label: string
  content: string
  tags?: string[]
  result?: DaydreamGenerationResult
}

type SidebarItemProps = {
  icon: LucideIcon
  label: string
  href: string
  active?: boolean
}

const promptActions = [
  "Push the pacing harder and give it more whip-pan energy.",
  "Restyle this into a colder black-and-white cinematic pass.",
  "Keep the same reel but rescore it with a more melancholic instrumental.",
  "Turn this into a softer dreamlike version with slower motion and haze.",
]

function buildFallbackModificationPrompt(result: DaydreamGenerationResult, request: string) {
  return [
    `Base reel prompt: ${result.prompt}`,
    `Current synopsis: ${result.storyboard.synopsis}`,
    `Current visual style: ${result.storyboard.visualStyle}`,
    `Current audio direction: ${result.storyboard.audioPrompt}`,
    `Modification request: ${request}`,
    "Create a modified version of the existing DayDream reel.",
    "Preserve the strongest identity, continuity, and emotional spine from the base reel while applying the requested change.",
    "Use Gemini as the creative director, Gemini image for references, Veo for motion, and Lyria for score direction when needed.",
    "Keep the finish premium. No text, no logos, no watermark.",
  ].join("\n")
}

function createFallbackAgentPlan(result: DaydreamGenerationResult, request: string): DaydreamRemixAgentPlan {
  return {
    assistantReply:
      "I understood the change and I am converting it into a cleaner DayDream remix instruction using the current reel as the reference source. I am sending it into the generation pipeline now.",
    generateNow: true,
    refinedRequest: request.trim(),
    productionPrompt: buildFallbackModificationPrompt(result, request),
    toolPlan: ["Gemini director", "Gemini image", "Veo", "Lyria"],
  }
}

function formatReelTitle(prompt: string) {
  return prompt
    .split(",")[0]
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 42)
}

function buildAssistantSummary(result: DaydreamGenerationResult, request?: string) {
  if (!request) {
    return `I loaded this saved DayDream and mapped the reel across Gemini direction, Gemini image references, Veo motion, and a Lyria score path. Tell me what to change and I'll keep the strongest cinematic identity while pushing the new direction harder.`
  }

  return `I pushed the reel toward "${request}" while keeping the core spine intact. The updated draft now leans into ${result.storyboard.visualStyle.toLowerCase()}, with ${result.storyboard.synopsis.toLowerCase()}.`
}

function createInitialEntries(result: DaydreamGenerationResult): RemixEntry[] {
  return [
    {
      id: "base-user",
      role: "user",
      label: "Describe",
      content: result.prompt,
    },
    {
      id: "base-assistant",
      role: "assistant",
      label: "Gemini director",
      content: buildAssistantSummary(result),
      tags: ["Draft", "Modify video", `${result.durationSeconds} sec reel`],
      result,
    },
  ]
}

function SidebarItem({ icon: Icon, label, href, active = false }: SidebarItemProps) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center gap-2 transition-colors ${
        active ? "text-white" : "text-white/55 hover:text-white/85"
      }`}
    >
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-full border transition-colors ${
          active
            ? "border-white/28 bg-white/18 text-white"
            : "border-white/10 bg-white/[0.03] text-white/70 hover:border-white/18 hover:bg-white/[0.06]"
        }`}
      >
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
      </span>
      <span className="text-[9px] uppercase tracking-[0.22em]">{label}</span>
    </Link>
  )
}

function MessageCard({
  entry,
  onAction,
}: {
  entry: RemixEntry
  onAction: (value: string) => void
}) {
  if (entry.role === "user") {
    return (
      <div className="pb-3">
        <p className="text-[11px] uppercase tracking-[0.28em] text-white/36">{entry.label}</p>
        <p className="mt-3 max-w-3xl text-[1.08rem] font-medium leading-8 tracking-[-0.03em] text-white md:text-[1.42rem] md:leading-9">
          {entry.content}
        </p>
      </div>
    )
  }

  return (
    <div className="pb-8">
      <div className="flex flex-wrap items-center gap-2">
        {(entry.tags || ["Gemini director"]).map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-white/12 bg-white/[0.06] px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-white/66"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <div className="flex h-9 min-w-9 items-center justify-center rounded-full border border-white/14 bg-white/[0.07] px-3">
          <span className="text-[13px] font-semibold uppercase tracking-[0.14em] text-white/86">Gem</span>
        </div>
        <p className="text-sm uppercase tracking-[0.26em] text-white/34">{entry.label}</p>
      </div>

      <p className="mt-4 max-w-3xl text-[1.08rem] leading-8 text-white/74">{entry.content}</p>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onAction("Show me two stronger variations of this direction.")}
          className="rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-sm text-white/84 transition-colors hover:bg-white/[0.1]"
        >
          Show More
        </button>
        <button
          type="button"
          onClick={() => onAction("Brainstorm three alternate cinematic directions for this reel.")}
          className="rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-sm text-white/84 transition-colors hover:bg-white/[0.1]"
        >
          Brainstorm
        </button>
        <button
          type="button"
          onClick={() => onAction("Reply by preserving the best parts but refining the mood and pacing.")}
          className="rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-sm text-white/84 transition-colors hover:bg-white/[0.1]"
        >
          Reply
        </button>
      </div>

      {entry.result ? <ResultGallery result={entry.result} /> : null}
    </div>
  )
}

function ApprovalBar({
  plan,
  pendingRequest,
  onApprove,
  onCancel,
}: {
  plan: DaydreamRemixAgentPlan
  pendingRequest: string
  onApprove: () => void
  onCancel: () => void
}) {
  const hint = plan.toolPlan[0] || "Gemini director"
  const tone = plan.generateNow ? "Ready to remix" : "Awaiting direction"
  const badges = plan.toolPlan.length ? plan.toolPlan.slice(0, 3) : ["Gemini"]

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white/80 shadow-[0_18px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl">
      <div className="flex flex-col gap-1">
        <span className="text-[9px] uppercase tracking-wider text-white/40">{tone}</span>
        <p className="max-w-lg truncate text-sm text-white">
          {plan.assistantReply} <span className="text-white/60">({hint})</span>
        </p>
        <p className="text-[11px] uppercase tracking-[0.3em] text-white/40">
          Proposed hint: {pendingRequest || plan.refinedRequest}
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          {badges.map((badge) => (
            <span
              key={badge}
              className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[9px] uppercase tracking-[0.3em] text-white/60"
            >
              {badge}
            </span>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onApprove}
          className="flex items-center gap-1 rounded-lg bg-[#d7df62] px-4 py-2 text-[0.62rem] font-bold uppercase tracking-[0.4em] text-black transition-all hover:scale-[1.04] active:scale-[0.98] shadow-[0_0_20px_rgba(215,223,98,0.35)]"
        >
          Approve & Generate
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-white/10 bg-transparent px-4 py-2 text-[0.65rem] uppercase tracking-[0.32em] text-white/70 transition-colors hover:border-white/20 hover:text-white"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

function ResultGallery({ result }: { result: DaydreamGenerationResult }) {
  return (
    <div className="mt-8 grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.95fr)]">
      <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.05]">
        <div className="relative aspect-[1.53/1] overflow-hidden bg-black">
          <video
            src={result.finalVideo.url}
            controls
            autoPlay
            loop
            muted
            playsInline
            className="h-full w-full object-cover"
          />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.06),rgba(0,0,0,0.24))]" />
          <div className="absolute left-4 top-4 rounded-full border border-white/14 bg-black/36 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-white/82">
            Draft · {result.durationSeconds}s
          </div>
          <div className="absolute right-4 top-4 rounded-full border border-white/14 bg-black/36 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-white/82">
            Veo reel
          </div>
        </div>
        <div className="flex items-start justify-between gap-4 p-5">
          <div>
            <p className="text-[11px] uppercase tracking-[0.26em] text-white/34">Saved reel</p>
            <p className="mt-2 text-lg font-medium tracking-[-0.03em] text-white">{formatReelTitle(result.prompt)}</p>
          </div>
          <a
            href={result.finalVideo.url}
            download
            className="rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-sm text-white/86 transition-colors hover:bg-white/[0.1]"
          >
            Download
          </a>
        </div>
      </div>

      <div className="grid gap-5">
        <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.05] p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.26em] text-white/34">Gemini image</p>
              <p className="mt-2 text-base font-medium text-white">Reference frames</p>
            </div>
            <span className="rounded-full border border-[#d7df62]/26 bg-[#d7df62]/14 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-[#eef6b5]">
              Active
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {result.heroFrames.slice(0, 4).map((frame) => (
              <div key={frame.url} className="overflow-hidden rounded-[20px] border border-white/10 bg-black/40">
                <img src={frame.url} alt={frame.label} className="aspect-video h-full w-full object-cover" />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.07] text-white/82">
              <Music4 className="h-4 w-4" strokeWidth={1.8} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.26em] text-white/34">Lyria score</p>
              <p className="mt-2 text-sm leading-6 text-white/74">{result.storyboard.audioPrompt}</p>
              <a
                href={result.soundtrack.url}
                download
                className="mt-4 inline-flex rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-sm text-white/86 transition-colors hover:bg-white/[0.1]"
              >
                Download audio
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ReelStudioShell({
  initialResult,
  threadId, // New: track thread context
}: {
  initialResult: DaydreamGenerationResult
  threadId?: string
}) {
  const [currentResult, setCurrentResult] = useState(initialResult)
  const [entries, setEntries] = useState<RemixEntry[]>(createInitialEntries(initialResult))
  const [pendingPlan, setPendingPlan] = useState<DaydreamRemixAgentPlan | null>(null) // New: store plan for approval
  const [pendingRequest, setPendingRequest] = useState("")
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isAgentThinking, setIsAgentThinking] = useState(false)
  const [showDreamView, setShowDreamView] = useState(false)
  const [generationPrompt, setGenerationPrompt] = useState("")
  const [displayPrompt, setDisplayPrompt] = useState("")
  const [pendingJobId, setPendingJobId] = useState<string | undefined>() // New: store approved job id
  const [activeGenerationEntryId, setActiveGenerationEntryId] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState("")
  const [draftEnabled, setDraftEnabled] = useState(true)
  const [shareState, setShareState] = useState<"idle" | "copied">("idle")
  const scrollAreaRef = useRef<HTMLDivElement | null>(null)

  const reelTitle = useMemo(() => formatReelTitle(currentResult.prompt), [currentResult.prompt])

  const queueScrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    if (typeof window === "undefined") return
    window.requestAnimationFrame(() => {
      const el = scrollAreaRef.current
      if (!el) return
      el.scrollTo({ top: el.scrollHeight, behavior })
    })
  }

  useEffect(() => {
    window.setTimeout(() => queueScrollToBottom("auto"), 0)
  }, [])

  // New: Load thread history on mount
  useEffect(() => {
    if (!threadId) return

    async function loadThread() {
      try {
        const response = await fetch(`/api/threads/${threadId}`)
         const payload = await response.json()
         if (payload.ok && payload.thread) {
           setEntries(payload.thread.entries)
           setCurrentResult(payload.thread.reel)
           window.setTimeout(() => queueScrollToBottom("auto"), 0)
         }
       } catch (e) {
         console.error("[daydream] Failed to load thread history:", e)
       }
     }

    loadThread()
  }, [threadId])

  const seedPrompt = (value: string) => {
    setInputValue(value)
  }

  const handleSubmit = async (value?: string) => {
    const request = (value ?? inputValue).trim()
    if (!request) return

    setEntries((current) => [
      ...current,
      {
        id: `user-${Date.now()}`,
        role: "user",
        label: "Modify",
        content: request,
      },
    ])
    queueScrollToBottom("auto")

    setInputValue("")
    setPendingRequest(request)
    setIsAgentThinking(true)

    let plan: DaydreamRemixAgentPlan

    try {
      const response = await fetch("/api/remix-agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          request,
          reel: currentResult,
          threadId, // Pass thread context
        }),
      })

      const payload = (await response.json()) as DaydreamRemixAgentResponse
      if (!response.ok || !payload.ok) {
        throw new Error(payload.ok ? "Gemini remix planning failed." : payload.error)
      }

      plan = payload.plan
    } catch {
      plan = createFallbackAgentPlan(currentResult, request)
    } finally {
      setIsAgentThinking(false)
    }

    setEntries((current) => [
      ...current,
      {
        id: `assistant-plan-${Date.now()}`,
        role: "assistant",
        label: "Gemini director",
        content: plan.assistantReply,
        tags: plan.generateNow ? ["Remix queued", ...plan.toolPlan.slice(0, 3)] : ["Discussing", ...plan.toolPlan.slice(0, 2)],
      },
    ])
    queueScrollToBottom("smooth")

    if (!plan.generateNow) {
      return
    }

    // New: Instead of auto-triggering, store the plan for approval
    setPendingPlan(plan)
  }

  const handleApprove = async () => {
    if (!pendingPlan || !threadId) return

    setIsTransitioning(true)

    try {
      const response = await fetch(`/api/threads/${threadId}/approve`, {
        method: "POST",
      })
      const payload = await response.json()
      if (!payload.ok) throw new Error(payload.error)

      const dreamingEntryId = `assistant-dreaming-${Date.now()}`
      setActiveGenerationEntryId(dreamingEntryId)
      setEntries((current) => [
        ...current,
        {
          id: dreamingEntryId,
          role: "assistant",
          label: "Dreaming",
          content: `Approved. I'm generating the remix now using this reel as the reference source.`,
          tags: ["Dreaming", ...pendingPlan.toolPlan.slice(0, 3)],
        },
      ])
      queueScrollToBottom("smooth")

      // Start the generation UI with the new Job ID
      setGenerationPrompt(pendingPlan.productionPrompt)
      setDisplayPrompt(pendingPlan.refinedRequest || pendingRequest)
      setPendingPlan(null)
      setPendingJobId(payload.jobId)
      setShowDreamView(true)
    } catch (e) {
      console.error("[daydream] Approval failed:", e)
      setIsTransitioning(false)
    }
  }

  const handleShare = async () => {
    const shareUrl =
      typeof window !== "undefined" ? new URL(currentResult.finalVideo.url, window.location.origin).toString() : currentResult.finalVideo.url

    try {
      await navigator.clipboard.writeText(shareUrl)
      setShareState("copied")
      window.setTimeout(() => setShareState("idle"), 1800)
    } catch {
      setShareState("idle")
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="relative h-dvh overflow-hidden bg-[#050607] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(54,73,96,0.22),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(55,82,69,0.2),transparent_24%),linear-gradient(180deg,#060709_0%,#040506_48%,#020303_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:140px_140px] opacity-[0.06]" />
      <div className="absolute inset-y-0 left-[74px] w-px bg-white/8" />

      <aside className="absolute inset-y-0 left-0 z-30 w-[74px] bg-black/82 backdrop-blur-xl">
        <div className="flex h-full flex-col items-center justify-between px-3 pb-5 pt-6">
          <div className="flex flex-col items-center gap-14">
            <Link href="/dreamboard" className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">
              <Image src="/logo-white.png" alt="DayDream icon" width={1038} height={782} className="h-[28px] w-auto object-contain" />
            </Link>

            <div className="flex flex-col items-center gap-7">
              <SidebarItem icon={PanelsTopLeft} label="Boards" href="/dreamboard" />
              <SidebarItem icon={LayoutGrid} label="Ideas" href="/dreamboard" />
              <SidebarItem icon={PencilLine} label="Editor" href={`/studio/${currentResult.jobId}`} active />
            </div>
          </div>

          <div className="flex flex-col items-center gap-7">
            <button
              type="button"
              className="flex flex-col items-center gap-2 text-white/55 transition-colors hover:text-white/85"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white/70">
                <CircleHelp className="h-[18px] w-[18px]" strokeWidth={1.8} />
              </span>
            </button>

            <button
              type="button"
              className="flex flex-col items-center gap-2 text-white/55 transition-colors hover:text-white/85"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white/70">
                <UserRound className="h-[18px] w-[18px]" strokeWidth={1.8} />
              </span>
            </button>
          </div>
        </div>
      </aside>

      <div className="relative z-20 flex h-dvh flex-col pl-[74px]">
        <header className="z-30 flex shrink-0 items-center justify-between gap-6 border-b border-white/8 bg-black/18 px-8 py-6 backdrop-blur-xl">
          <div className="flex items-center gap-5">
            <Link href="/dreamboard" className="flex items-center gap-2 text-sm text-white/64 transition-colors hover:text-white">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
            <div className="flex items-center gap-4">
              <Image src="/logo-white.png" alt="DayDream logo" width={1038} height={782} className="h-[30px] w-auto object-contain" />
              <div className="flex items-center gap-2 text-xl tracking-[-0.03em] text-white">
                <span className="text-white/64">MODIFY</span>
                <span className="font-semibold text-white">VIDEO</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleShare}
            className="flex h-12 items-center gap-2 rounded-full bg-white px-5 text-sm font-medium text-black transition-colors hover:bg-white/90"
          >
            {shareState === "copied" ? <Copy className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
            {shareState === "copied" ? "Copied" : "Share"}
          </button>
        </header>

        <main ref={scrollAreaRef} className="flex-1 overflow-y-auto">
          <div
            className={`mx-auto max-w-[1260px] px-8 pt-8 ${
              pendingPlan ? "pb-[520px]" : "pb-[420px]"
            }`}
          >
            <section className="relative overflow-hidden rounded-[34px] border border-white/8 bg-black/30 shadow-[0_30px_90px_rgba(0,0,0,0.36)]">
              <div className="relative h-[340px] overflow-hidden md:h-[430px]">
                <video
                  src={currentResult.finalVideo.url}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="absolute inset-0 h-full w-full object-cover opacity-45"
                />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(4,6,9,0.18)_26%,rgba(4,6,9,0.82)_70%,rgba(4,6,9,0.95)_100%)]" />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(13,15,20,0.08),rgba(4,5,7,0.54)_52%,rgba(4,5,7,0.94)_100%)]" />

                <div className="relative z-10 flex h-full flex-col justify-between p-6 md:p-10">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-white/12 bg-black/26 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-white/70">
                      Gemini director
                    </span>
                    <span className="rounded-full border border-white/12 bg-black/26 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-white/70">
                      Veo
                    </span>
                    <span className="rounded-full border border-white/12 bg-black/26 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-white/70">
                      Gemini image
                    </span>
                    <span className="rounded-full border border-white/12 bg-black/26 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-white/70">
                      Lyria
                    </span>
                  </div>

                  <div className="max-w-3xl">
                    <p className="text-[11px] uppercase tracking-[0.32em] text-white/36">Saved reel loaded</p>
                    <h1 className="mt-4 text-4xl font-medium tracking-[-0.06em] text-white md:text-[4.1rem]">{reelTitle}</h1>
                    <p className="mt-4 max-w-2xl text-base leading-7 text-white/62 md:text-lg">
                      Chat with DayDream&apos;s Gemini creative director to reshape the reel, push new motion language through Veo, restyle reference frames, and redirect the Lyria score.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="mx-auto mt-12 max-w-[860px]">
              <div className="space-y-10">
                {entries.map((entry) => (
                  <MessageCard key={entry.id} entry={entry} onAction={seedPrompt} />
                ))}
              </div>
            </section>
          </div>
        </main>
      </div>

      {showDreamView ? (
        <DreamView
          prompt={generationPrompt}
          displayPrompt={displayPrompt}
          jobId={pendingJobId} // New: pass the approved job
          referenceResult={currentResult}
          onComplete={async (result) => {
            setCurrentResult(result)
            setPendingJobId(undefined)
            
            // New: Signal thread completion to update persistence
            if (threadId) {
              try {
                await fetch(`/api/threads/${threadId}/complete`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ result })
                })
              } catch (e) {
                console.error("[daydream] Failed to signal thread completion:", e)
              }
            }

            setEntries((current) => {
              const next = [...current]
              if (activeGenerationEntryId) {
                const idx = next.findIndex((entry) => entry.id === activeGenerationEntryId)
                if (idx >= 0) {
                  next[idx] = {
                    ...next[idx],
                    role: "assistant",
                    label: "Gemini director",
                    content: buildAssistantSummary(result, pendingRequest || displayPrompt),
                    tags: ["Remix ready", "Modify video", `${result.durationSeconds} sec reel`],
                    result,
                  }
                  return next
                }
              }

              return [
                ...current,
                {
                  id: `assistant-${Date.now()}`,
                  role: "assistant",
                  label: "Gemini director",
                  content: buildAssistantSummary(result, pendingRequest || displayPrompt),
                  tags: ["Remix ready", "Modify video", `${result.durationSeconds} sec reel`],
                  result,
                },
              ]
            })
            setActiveGenerationEntryId(null)
            queueScrollToBottom("smooth")
          }}
          onBack={() => {
            setShowDreamView(false)
            setIsTransitioning(false)
            setGenerationPrompt("")
            setDisplayPrompt("")
            setPendingRequest("")
          }}
        />
      ) : null}

      <div className="fixed bottom-7 left-[74px] right-0 z-30 flex justify-center px-6">
        <div className="w-full max-w-[900px]">
          <div className={`transition-all duration-500 ${isTransitioning ? "opacity-90 scale-[0.99]" : "opacity-100 scale-100"}`}>
            <div className="mb-3 flex flex-wrap gap-2">
              <button className="rounded-full border border-white/18 bg-white/[0.08] px-4 py-1.5 text-xs uppercase tracking-[0.22em] text-white/86 transition-colors hover:bg-white/[0.12]">
                Keyframe
              </button>
              <button className="rounded-full border border-white/18 bg-white/[0.08] px-4 py-1.5 text-xs uppercase tracking-[0.22em] text-white/86 transition-colors hover:bg-white/[0.12]">
                Reference
              </button>
              <button className="rounded-full border border-white/18 bg-white/[0.15] px-4 py-1.5 text-xs uppercase tracking-[0.22em] text-white transition-colors hover:bg-white/[0.18]">
                Modify
              </button>
            </div>

            {pendingPlan ? (
              <div className="mb-3">
                <ApprovalBar
                  plan={pendingPlan}
                  pendingRequest={pendingRequest}
                  onApprove={handleApprove}
                  onCancel={() => setPendingPlan(null)}
                />
              </div>
            ) : null}

            <div className="rounded-[28px] border border-white/10 bg-[#17181c]/88 p-4 shadow-[0_26px_70px_rgba(0,0,0,0.42)] backdrop-blur-2xl">
              <input
                type="text"
                placeholder="Tell DayDream what to change in this reel..."
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full bg-transparent px-1 text-[1.05rem] text-white outline-none placeholder:text-white/42"
              />

                <div className="mt-4 flex flex-col gap-4 border-t border-white/8 pt-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-1">
                  <button className="rounded-xl p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white">
                    <ImageIcon className="h-5 w-5" />
                  </button>
                  <button className="rounded-xl p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white">
                    <Sparkles className="h-5 w-5" />
                  </button>
                  <div className="mx-1 h-5 w-px bg-white/14" />
                  <button className="rounded-xl p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white">
                    <Video className="h-5 w-5" />
                  </button>
                  <button className="rounded-xl p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white">
                    <InfinityIcon className="h-5 w-5" />
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase tracking-[0.22em] text-white/58">Draft</span>
                    <button
                      type="button"
                      onClick={() => setDraftEnabled((current) => !current)}
                      className={`relative h-7 w-12 rounded-full border transition-colors ${
                        draftEnabled ? "border-white/24 bg-white" : "border-white/12 bg-white/10"
                      }`}
                    >
                      <span
                        className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full transition-all ${
                          draftEnabled ? "left-[23px] bg-black" : "left-[3px] bg-white"
                        }`}
                      />
                    </button>
                  </div>

                  <div className="h-5 w-px bg-white/14" />

                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-white/58">
                    <span>{isAgentThinking ? "Gemini director is thinking..." : "Gemini director · Veo · Lyria"}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSubmit()}
                    disabled={isAgentThinking || isTransitioning}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-white/18 bg-white/[0.08] text-white transition-colors hover:bg-white/[0.14] disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {promptActions.map((action) => (
                <button
                  key={action}
                  type="button"
                  onClick={() => seedPrompt(action)}
                  className="rounded-full border border-white/10 bg-black/28 px-3 py-1.5 text-xs text-white/58 transition-colors hover:border-white/18 hover:bg-white/[0.08] hover:text-white/86"
                >
                  {action}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
