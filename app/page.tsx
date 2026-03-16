"use client"

import Image from "next/image"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight } from "lucide-react"

const DEMO_USERNAME = "Aashir28"
const DEMO_PASSWORD = "Aashir"
const LOGIN_REEL_SRC = "/videos/daydream-login-reel.mp4"

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5">
      <path
        fill="#EA4335"
        d="M12.24 10.286v3.942h5.484c-.222 1.273-1.484 3.735-5.484 3.735-3.302 0-5.992-2.734-5.992-6.106s2.69-6.106 5.992-6.106c1.882 0 3.145.801 3.866 1.492l2.637-2.541C17.055 3.13 14.877 2 12.24 2 6.912 2 2.594 6.318 2.594 11.857s4.318 9.857 9.646 9.857c5.57 0 9.266-3.915 9.266-9.435 0-.635-.07-1.118-.156-1.593H12.24Z"
      />
      <path fill="#FBBC05" d="M3.706 7.365 6.77 9.61c.83-2.468 3.175-4.236 5.47-4.236 1.883 0 3.146.8 3.867 1.49l2.637-2.54C17.056 3.13 14.878 2 12.24 2 8.467 2 5.19 4.15 3.706 7.365Z" />
      <path fill="#34A853" d="M12.24 21.714c2.565 0 4.72-.842 6.293-2.286l-2.91-2.391c-.777.546-1.824.926-3.383.926-3.984 0-5.252-2.69-5.47-3.96l-3.09 2.38c1.47 3.273 4.863 5.331 8.56 5.331Z" />
      <path fill="#4285F4" d="M21.506 12.279c0-.635-.07-1.118-.156-1.593H12.24v3.942h5.484c-.267 1.53-1.708 3.335-4.605 3.335-3.984 0-5.252-2.69-5.47-3.96l-3.09 2.38c1.47 3.273 4.863 5.331 8.56 5.331 5.57 0 9.267-3.915 9.267-9.435Z" />
    </svg>
  )
}

function HeadingBlock({
  className,
  overlay = false,
}: {
  className?: string
  overlay?: boolean
}) {
  return (
    <div className={className}>
      <div className="mb-4 flex justify-center">
        <Image
          src="/logo-white.png"
          alt="DayDream logo"
          width={1040}
          height={782}
          className={overlay ? "h-[44px] w-auto object-contain" : "h-[50px] w-auto object-contain"}
        />
      </div>
      <p className={`mb-3 text-[11px] uppercase tracking-[0.34em] ${overlay ? "text-white/62" : "text-white/45"}`}>
        cinematic engine
      </p>
      <h1
        className={`font-semibold leading-none tracking-tight text-white ${
          overlay ? "text-[3.25rem] sm:text-[3.8rem]" : "text-[3.05rem] sm:text-[3.35rem]"
        }`}
      >
        <span className="inline-flex items-baseline">
          <span>Re</span>
          <span className="instrument font-normal italic">live</span>
        </span>
        <span className="ml-3 inline-block">it with</span>
        <span
          className={`mt-1 block instrument font-normal italic text-white ${
            overlay ? "text-[3.35rem] sm:text-[4rem]" : "text-[3.2rem] sm:text-[3.5rem]"
          }`}
        >
          daydream
        </span>
      </h1>
      {overlay ? null : (
        <p className="mt-5 mx-auto max-w-[260px] text-[14px] leading-[1.55] text-white/58">
          Gemini-shaped edits for raw memories, launch drops, and cinematic reels. Bring the mood. We will score,
          style, and stitch the dream.
        </p>
      )}
    </div>
  )
}

export default function HomePage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [username, setUsername] = useState(DEMO_USERNAME)
  const [password, setPassword] = useState(DEMO_PASSWORD)
  const [authError, setAuthError] = useState("")

  const enterDreamboard = () => {
    startTransition(() => {
      router.push("/dreamboard")
    })
  }

  const handleCredentialLogin = () => {
    if (username === DEMO_USERNAME && password === DEMO_PASSWORD) {
      setAuthError("")
      enterDreamboard()
      return
    }

    setAuthError("Use the current hackathon credentials to enter DayDream.")
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="relative min-h-screen">
        <div className="hidden min-[1400px]:grid min-h-screen min-[1400px]:grid-cols-[65%_35%]">
          <section className="relative min-h-screen overflow-hidden bg-black">
            <video
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              className="absolute inset-0 h-full w-full object-cover"
            >
              <source src={LOGIN_REEL_SRC} type="video/mp4" />
            </video>

            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(4,10,18,0.18)_0%,rgba(4,10,18,0.08)_50%,rgba(0,0,0,0.72)_100%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(110,166,182,0.16),transparent_32%),radial-gradient(circle_at_bottom,rgba(13,84,96,0.24),transparent_40%)]" />
          </section>

          <section className="relative flex min-h-screen items-center justify-center bg-black px-5 py-6 sm:px-8">
            <div className="absolute inset-y-0 left-0 w-px bg-white/10" />

            <div className="absolute right-6 top-5 z-20 text-[9px] font-medium tracking-[0.3em] text-white/80">
              <span className="instrument text-[1.9rem] italic tracking-normal text-white">daydream</span>
            </div>

            <div className="w-full max-w-[402px] pb-[80px]">
              <HeadingBlock className="mb-12 text-center" />

              <div className="mx-auto w-full max-w-[346px]">
                <form
                  className="space-y-4 text-left"
                  onSubmit={(event) => {
                    event.preventDefault()
                    handleCredentialLogin()
                  }}
                >
                  <label className="block">
                    <span className="mb-2 block text-[11px] uppercase tracking-[0.32em] text-white/42">Username</span>
                    <div className="flex h-[46px] items-center rounded-full border border-white/12 bg-transparent px-5 transition-colors focus-within:border-white/24">
                      <input
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                        className="w-full bg-transparent text-[16px] text-white outline-none placeholder:text-white/25"
                        placeholder="Username"
                        autoCapitalize="none"
                        autoCorrect="off"
                      />
                    </div>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-[11px] uppercase tracking-[0.32em] text-white/42">Password</span>
                    <div className="flex h-[46px] items-center rounded-full border border-white/12 bg-transparent px-5 transition-colors focus-within:border-white/24">
                      <input
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        className="w-full bg-transparent text-[16px] text-white outline-none placeholder:text-white/25"
                        placeholder="Password"
                      />
                    </div>
                  </label>

                  <button
                    type="submit"
                    className="mt-5 flex h-[46px] w-full items-center justify-center gap-2.5 rounded-full bg-white text-[16px] font-medium text-black transition-transform duration-200 hover:scale-[1.01] hover:bg-white/92"
                  >
                    <span>{isPending ? "Opening dreamboard..." : "Log in"}</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>

                  {authError ? <p className="px-1 text-[13px] text-red-300">{authError}</p> : null}
                </form>

                <div className="my-6 h-px bg-white/10" />

                <button
                  onClick={enterDreamboard}
                  className="flex h-[46px] w-full items-center justify-center gap-2.5 rounded-full bg-white text-[16px] font-medium text-black transition-transform duration-200 hover:scale-[1.01] hover:bg-white/92"
                >
                  <GoogleMark />
                  <span>{isPending ? "Opening dreamboard..." : "Sign in with Google"}</span>
                </button>
              </div>

              <p className="absolute inset-x-6 bottom-5 text-center text-[12px] leading-6 text-white/24">
                By continuing, you are stepping into the DayDream preview build. Temporary access is enabled for the
                current hackathon sprint.
              </p>
            </div>
          </section>
        </div>

        <div className="min-[1400px]:hidden min-h-screen">
          <div className="absolute left-1/2 top-7 z-20 -translate-x-1/2 text-[9px] font-medium tracking-[0.3em] text-white/80">
            <span className="instrument text-[1.72rem] italic tracking-normal text-white">daydream</span>
          </div>

          <section className="relative mx-auto mt-24 aspect-[4/5] w-[min(78vw,42rem)] overflow-hidden rounded-[28px] bg-black">
            <video
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              className="absolute inset-0 h-full w-full object-cover"
            >
              <source src={LOGIN_REEL_SRC} type="video/mp4" />
            </video>

            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(4,10,18,0.18)_0%,rgba(4,10,18,0.08)_50%,rgba(0,0,0,0.72)_100%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(110,166,182,0.16),transparent_32%),radial-gradient(circle_at_bottom,rgba(13,84,96,0.24),transparent_40%)]" />
            <div className="absolute inset-0 flex items-center justify-center px-8 text-center">
              <HeadingBlock className="max-w-[22rem]" overlay />
            </div>
          </section>

          <section className="relative flex items-start justify-center bg-black px-5 pb-10 pt-8 sm:px-8">
            <div className="w-full max-w-[402px] pb-[72px]">
              <div className="mx-auto w-full max-w-[346px]">
                <form
                  className="space-y-4 text-left"
                  onSubmit={(event) => {
                    event.preventDefault()
                    handleCredentialLogin()
                  }}
                >
                  <label className="block">
                    <span className="mb-2 block text-[11px] uppercase tracking-[0.32em] text-white/42">Username</span>
                    <div className="flex h-[46px] items-center rounded-full border border-white/12 bg-transparent px-5 transition-colors focus-within:border-white/24">
                      <input
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                        className="w-full bg-transparent text-[16px] text-white outline-none placeholder:text-white/25"
                        placeholder="Username"
                        autoCapitalize="none"
                        autoCorrect="off"
                      />
                    </div>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-[11px] uppercase tracking-[0.32em] text-white/42">Password</span>
                    <div className="flex h-[46px] items-center rounded-full border border-white/12 bg-transparent px-5 transition-colors focus-within:border-white/24">
                      <input
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        className="w-full bg-transparent text-[16px] text-white outline-none placeholder:text-white/25"
                        placeholder="Password"
                      />
                    </div>
                  </label>

                  <button
                    type="submit"
                    className="mt-5 flex h-[46px] w-full items-center justify-center gap-2.5 rounded-full bg-white text-[16px] font-medium text-black transition-transform duration-200 hover:scale-[1.01] hover:bg-white/92"
                  >
                    <span>{isPending ? "Opening dreamboard..." : "Log in"}</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>

                  {authError ? <p className="px-1 text-[13px] text-red-300">{authError}</p> : null}
                </form>

                <div className="my-6 h-px bg-white/10" />

                <button
                  onClick={enterDreamboard}
                  className="flex h-[46px] w-full items-center justify-center gap-2.5 rounded-full bg-white text-[16px] font-medium text-black transition-transform duration-200 hover:scale-[1.01] hover:bg-white/92"
                >
                  <GoogleMark />
                  <span>{isPending ? "Opening dreamboard..." : "Sign in with Google"}</span>
                </button>
              </div>

              <p className="mt-11 text-center text-[12px] leading-6 text-white/24">
                By continuing, you are stepping into the DayDream preview build. Temporary access is enabled for the
                current hackathon sprint.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
