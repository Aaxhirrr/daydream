import Image from "next/image"
import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import {
  CircleHelp,
  LayoutGrid,
  PanelsTopLeft,
  PencilLine,
  Plus,
  Sparkles,
  UserRound,
} from "lucide-react"

export type DreamboardEntry = {
  jobId: string
  eyebrow: string
  title: string
  meta: string
  prompt: string
  href: string
  finalVideoUrl: string
  heroFrameUrls: string[]
}

type NavItemProps = {
  icon: LucideIcon
  label: string
  href: string
  active?: boolean
}

const gradients = [
  "from-[#4b3529] via-[#322722] to-[#1f2327]",
  "from-[#39464d] via-[#232e35] to-[#171c20]",
  "from-[#33475b] via-[#1f2937] to-[#171b22]",
  "from-[#6f7271] via-[#505a5f] to-[#273436]",
]

function SidebarItem({ icon: Icon, label, href, active = false }: NavItemProps) {
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
            ? "border-white/30 bg-white/18 text-white"
            : "border-white/10 bg-white/[0.03] text-white/70 hover:border-white/18 hover:bg-white/[0.06]"
        }`}
      >
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
      </span>
      <span className="text-[9px] uppercase tracking-[0.22em]">{label}</span>
    </Link>
  )
}

function BoardTile({ board, index }: { board: DreamboardEntry; index: number }) {
  const gradient = gradients[index % gradients.length]
  const [firstFrame, secondFrame] = board.heroFrameUrls

  return (
    <Link
      href={board.href}
      className="group relative block h-[198px] w-[356px] flex-none overflow-hidden rounded-[24px] border border-white/8 bg-black/30 transition-transform duration-300 hover:-translate-y-1"
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(0,0,0,0.28))]" />

      <div className="relative z-10 p-5">
        <p className="text-[12px] font-medium leading-none tracking-[-0.02em] text-white/82">{board.eyebrow}</p>
        <h2 className="mt-1 max-w-[220px] text-[17px] font-semibold uppercase leading-[1.02] tracking-[-0.04em] text-white">
          {board.title}
        </h2>
        <p className="mt-3 text-[12px] text-white/68">{board.meta}</p>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[140px]">
        {firstFrame ? (
          <div className="absolute left-[50px] bottom-[-10px] h-[118px] w-[84px] rotate-[-8deg] overflow-hidden rounded-[18px] border border-white/12 bg-black/30 shadow-[0_26px_44px_rgba(0,0,0,0.42)]">
            <img src={firstFrame} alt={`${board.title} frame one`} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(0,0,0,0.18))]" />
          </div>
        ) : null}

        {secondFrame ? (
          <div className="absolute left-[106px] bottom-[-4px] h-[126px] w-[92px] rotate-[1deg] overflow-hidden rounded-[18px] border border-white/12 bg-black/30 shadow-[0_26px_44px_rgba(0,0,0,0.42)]">
            <img src={secondFrame} alt={`${board.title} frame two`} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(0,0,0,0.18))]" />
          </div>
        ) : null}

        <div className="absolute left-[172px] bottom-[-10px] h-[128px] w-[96px] rotate-[7deg] overflow-hidden rounded-[18px] border border-white/12 bg-black/30 shadow-[0_26px_44px_rgba(0,0,0,0.42)]">
          <video autoPlay loop muted playsInline preload="metadata" className="h-full w-full object-cover">
            <source src={board.finalVideoUrl} type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(0,0,0,0.18))]" />
        </div>
      </div>

      <div className="absolute bottom-4 right-4 rounded-full border border-white/12 bg-black/35 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-white/72">
        saved reel
      </div>
    </Link>
  )
}

function EmptyBoardTile({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="group relative block h-[198px] w-[356px] flex-none overflow-hidden rounded-[24px] border border-white/8 bg-black/30 transition-transform duration-300 hover:-translate-y-1"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#233039] via-[#162028] to-[#0b0f12]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(0,0,0,0.28))]" />

      <div className="relative z-10 flex h-full flex-col justify-between p-5">
        <div>
          <p className="text-[12px] font-medium leading-none tracking-[-0.02em] text-white/82">FIRST DREAM</p>
          <h2 className="mt-1 max-w-[220px] text-[17px] font-semibold uppercase leading-[1.02] tracking-[-0.04em] text-white">
            your next reel lands here
          </h2>
          <p className="mt-3 max-w-[240px] text-[12px] leading-5 text-white/62">
            Generate from the studio and every completed DayDream edit will appear here automatically.
          </p>
        </div>

        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-white/66">
          <Sparkles className="h-4 w-4" strokeWidth={1.8} />
          start in studio
        </div>
      </div>
    </Link>
  )
}

export default function DreamboardShell({
  boards,
  editorHref,
}: {
  boards: DreamboardEntry[]
  editorHref: string
}) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020303] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(70,102,122,0.22),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(40,96,72,0.22),transparent_28%),linear-gradient(180deg,rgba(2,7,11,0.6),rgba(0,0,0,0.1)_18%,rgba(0,0,0,0.85)_68%)]" />
      <div className="absolute inset-y-0 left-[74px] w-px bg-white/8" />

      <aside className="absolute inset-y-0 left-0 z-20 w-[74px] bg-black/86 backdrop-blur-xl">
        <div className="flex h-full flex-col items-center justify-between px-3 pb-5 pt-6">
          <div className="flex flex-col items-center gap-14">
            <Link href="/dreamboard" className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">
              <Image src="/logo-white.png" alt="DayDream icon" width={1038} height={782} className="h-[28px] w-auto object-contain" />
            </Link>

            <div className="flex flex-col items-center gap-7">
              <SidebarItem icon={PanelsTopLeft} label="Boards" href="/dreamboard" active />
              <SidebarItem icon={LayoutGrid} label="Ideas" href="/dreamboard" />
              <SidebarItem icon={PencilLine} label="Editor" href={editorHref} />
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

      <div className="relative z-10 min-h-screen pl-[74px]">
        <section className="px-8 pb-24 pt-6">
          <div className="pl-4">
            <div className="flex items-start gap-4">
              <Image src="/logo-white.png" alt="DayDream logo" width={1038} height={782} className="mt-2 h-[34px] w-auto object-contain" />
              <div className="pt-1">
                <p className="instrument text-[2.7rem] leading-[0.84] text-white">daydream</p>
                <p className="text-[2rem] font-semibold leading-[0.9] tracking-[-0.05em] text-white">DREAMBOARD</p>
              </div>
            </div>
          </div>

          <div className="mt-12 flex items-start gap-4 overflow-x-auto pb-6 pl-4 pr-10">
            {boards.length ? boards.map((board, index) => <BoardTile key={board.jobId} board={board} index={index} />) : <EmptyBoardTile href={editorHref} />}

            <Link
              href={editorHref}
              className="mt-1 hidden h-12 w-12 flex-none items-center justify-center rounded-[14px] border border-[#d5df5c]/35 bg-[#d5df5c]/90 text-black shadow-[0_18px_36px_rgba(188,214,63,0.22)] transition-transform duration-200 hover:scale-[1.03] xl:flex"
            >
              <Sparkles className="h-5 w-5" strokeWidth={2} />
            </Link>
          </div>
        </section>

        <div className="absolute inset-x-0 bottom-9 flex justify-center">
          <Link
            href="/studio"
            className="flex h-[50px] w-[132px] items-center justify-center rounded-full bg-white text-black shadow-[0_14px_40px_rgba(255,255,255,0.12)] transition-transform duration-200 hover:scale-[1.02]"
          >
            <Plus className="h-6 w-6" strokeWidth={2.4} />
          </Link>
        </div>
      </div>
    </main>
  )
}
