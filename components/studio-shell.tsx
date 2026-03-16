"use client"

import { useState } from "react"
import ChatBar from "@/components/chat-bar"
import Header from "@/components/header"
import HeroContent from "@/components/hero-content"
import PulsingCircle from "@/components/pulsing-circle"
import ShaderBackground from "@/components/shader-background"
import DreamView from "@/components/dream-view"

export default function StudioShell() {
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [showDreamView, setShowDreamView] = useState(false)
  const [prompt, setPrompt] = useState("")
  const [durationSeconds, setDurationSeconds] = useState(30)
  const [shotCount, setShotCount] = useState(4)

  const handleSubmit = (inputValue: string) => {
    if (!inputValue.trim()) return
    setPrompt(inputValue)
    setIsTransitioning(true)

    setTimeout(() => {
      setShowDreamView(true)
    }, 600)
  }

  return (
    <ShaderBackground>
      <div
        className={`transition-all duration-600 ease-out ${
          isTransitioning ? "opacity-0 scale-95 pointer-events-none" : "opacity-100 scale-100"
        }`}
      >
        <Header />
        <HeroContent />
      </div>

      <PulsingCircle />

      {showDreamView && (
        <DreamView
          prompt={prompt}
          durationSeconds={durationSeconds}
          shotCount={shotCount}
          onBack={() => {
            setShowDreamView(false)
            setIsTransitioning(false)
            setPrompt("")
          }}
        />
      )}

      <ChatBar
        onSubmit={handleSubmit}
        isTransitioning={isTransitioning}
        onDurationChange={setDurationSeconds}
        onShotCountChange={setShotCount}
      />
    </ShaderBackground>
  )
}
