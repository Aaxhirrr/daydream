"use client"

import { useState } from "react"
import { Image, Sparkles, Video, Infinity, ChevronDown, ArrowUp } from "lucide-react"
import { Switch } from "@/components/ui/switch"

interface ChatBarProps {
  onSubmit?: (value: string) => void
  isTransitioning?: boolean
  onDurationChange?: (seconds: number) => void
  onShotCountChange?: (count: number) => void
}

const durationOptions = [
  { label: ">10s mode", value: 12 },
  { label: "15s mode", value: 15 },
  { label: "30s mode", value: 30 },
]

const shotCountOptions = [
  { label: "4 images", value: 4 },
  { label: "8 images", value: 8 },
  { label: "10 images", value: 10 },
]

export default function ChatBar({ onSubmit, isTransitioning, onDurationChange, onShotCountChange }: ChatBarProps) {
  const [draftEnabled, setDraftEnabled] = useState(true)
  const [inputValue, setInputValue] = useState("")
  const [durationSeconds, setDurationSeconds] = useState(30)
  const [isDurationMenuOpen, setIsDurationMenuOpen] = useState(false)
  const [shotCount, setShotCount] = useState(4)
  const [isShotMenuOpen, setIsShotMenuOpen] = useState(false)

  const handleSubmit = () => {
    if (inputValue.trim() && onSubmit) {
      onSubmit(inputValue)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleDurationSelect = (value: number) => {
    setDurationSeconds(value)
    setIsDurationMenuOpen(false)
    onDurationChange?.(value)
  }

  const handleShotCountSelect = (value: number) => {
    setShotCount(value)
    setIsShotMenuOpen(false)
    onShotCountChange?.(value)
  }

  return (
    <div
      className={`fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-50 transition-all duration-500 ${
        isTransitioning ? "opacity-90 scale-[0.98]" : "opacity-100 scale-100"
      }`}
    >
      {/* Pill buttons */}
      <div className="flex gap-2 mb-3">
        <button className="px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-white/90 bg-white/10 rounded-full border border-white/20 hover:bg-white/15 transition-colors">
          Keyframe
        </button>
        <button className="px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-white/90 bg-white/10 rounded-full border border-white/20 hover:bg-white/15 transition-colors">
          Reference
        </button>
        <button className="px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-white/90 bg-white/10 rounded-full border border-white/20 hover:bg-white/15 transition-colors">
          Modify
        </button>
      </div>

      {/* Main input container */}
      <div className="bg-neutral-900/90 backdrop-blur-xl rounded-2xl border border-white/10 p-3">
        {/* Input field */}
        <input
          type="text"
          placeholder="What do you want to see..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full bg-transparent text-white placeholder-white/50 text-sm outline-none mb-3 px-1"
        />

        {/* Bottom toolbar */}
        <div className="flex items-center justify-between">
          {/* Left icons */}
          <div className="flex items-center gap-1">
            <button className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
              <Image className="w-5 h-5" />
            </button>
            <button className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
              <Sparkles className="w-5 h-5" />
            </button>
            <div className="w-px h-5 bg-white/20 mx-1" />
            <button className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
              <Video className="w-5 h-5" />
            </button>
            <button className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
              <Infinity className="w-5 h-5" />
            </button>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-3">
            {/* Draft toggle */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-white/70 uppercase tracking-wide">Draft</span>
              <Switch
                checked={draftEnabled}
                onCheckedChange={setDraftEnabled}
                className="data-[state=checked]:bg-white data-[state=unchecked]:bg-white/20"
              />
            </div>

            <div className="w-px h-5 bg-white/20" />

            {/* Duration dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsDurationMenuOpen((prev) => !prev)}
                className="flex items-center gap-1 text-xs text-white/70 hover:text-white transition-colors"
              >
                <span className="uppercase tracking-wide">
                  Video · Gemini director · 16:9 · {durationSeconds}s
                </span>
                <ChevronDown className="w-4 h-4" />
              </button>

              {isDurationMenuOpen && (
                <div className="absolute right-0 bottom-full mb-3 w-40 rounded-2xl border border-white/10 bg-neutral-900/95 backdrop-blur-xl p-2 shadow-xl z-50">
                  {durationOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleDurationSelect(option.value)}
                      className={`w-full text-left px-3 py-2 text-xs transition-colors rounded-xl ${
                        durationSeconds === option.value
                          ? "bg-white/10 text-white"
                          : "text-white/60 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Velocity edit (shot count) dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsShotMenuOpen((prev) => !prev)}
                className="flex items-center gap-1 text-xs text-white/70 hover:text-white transition-colors"
                title="Velocity edit mode"
              >
                <span className="uppercase tracking-wide">
                  Cuts · {shotCount}
                </span>
                <ChevronDown className="w-4 h-4" />
              </button>

              {isShotMenuOpen && (
                <div className="absolute right-0 bottom-full mb-3 w-36 rounded-2xl border border-white/10 bg-neutral-900/95 backdrop-blur-xl p-2 shadow-xl z-50">
                  {shotCountOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleShotCountSelect(option.value)}
                      className={`w-full text-left px-3 py-2 text-xs transition-colors rounded-xl ${
                        shotCount === option.value
                          ? "bg-white/10 text-white"
                          : "text-white/60 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Submit button */}
            <button
              onClick={handleSubmit}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-full border border-white/20 transition-colors"
            >
              <ArrowUp className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
