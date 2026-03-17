import { GoogleGenAI } from "@google/genai"
import { ensureGoogleApplicationCredentials } from "@/lib/google-credentials"
import type { DaydreamGenerationResult, DaydreamRemixAgentPlan } from "@/lib/daydream-types"

type DaydreamAgentConfig = {
  project: string
  geminiLocation: string
  textModel: string
}

function getAgentConfig(): DaydreamAgentConfig {
  const project = process.env.GOOGLE_CLOUD_PROJECT
  if (!project) {
    throw new Error("Missing GOOGLE_CLOUD_PROJECT in the server environment.")
  }

  return {
    project,
    geminiLocation: process.env.DAYDREAM_GEMINI_LOCATION || "global",
    textModel: process.env.DAYDREAM_TEXT_MODEL || "gemini-2.5-flash",
  }
}

function createVertexClient() {
  ensureGoogleApplicationCredentials()
  const config = getAgentConfig()

  return new GoogleGenAI({
    vertexai: true,
    project: config.project,
    location: config.geminiLocation,
  })
}

function buildFallbackProductionPrompt(result: DaydreamGenerationResult, request: string) {
  return [
    `Reference reel prompt: ${result.prompt}`,
    `Reference reel synopsis: ${result.storyboard.synopsis}`,
    `Reference visual style: ${result.storyboard.visualStyle}`,
    `Reference audio direction: ${result.storyboard.audioPrompt}`,
    `User modification request: ${request}`,
    "Modify the existing saved DayDream reel while preserving its core identity and continuity.",
    "Use the current reel as the reference source for pacing, shot continuity, emotional arc, and cinematic finish.",
    "Let Gemini steer the edit, use Gemini image to restyle reference frames, use Veo to regenerate motion, and use Lyria only if the score direction changes.",
    "Keep the result premium, cinematic, coherent, and free of text, logos, captions, subtitles, or watermarks.",
  ].join("\n")
}

function normalizeToolPlan(items: string[]) {
  const normalized = new Set<string>()

  for (const item of items) {
    const lowered = item.toLowerCase()

    if (lowered.includes("gemini") && (lowered.includes("plan") || lowered.includes("director") || lowered.includes("interpret"))) {
      normalized.add("Gemini director")
    }

    if (lowered.includes("image")) {
      normalized.add("Gemini image")
    }

    if (lowered.includes("veo") || lowered.includes("motion")) {
      normalized.add("Veo")
    }

    if (lowered.includes("lyria") || lowered.includes("score") || lowered.includes("music") || lowered.includes("audio")) {
      normalized.add("Lyria")
    }
  }

  if (!normalized.size) {
    normalized.add("Gemini director")
  }

  return Array.from(normalized).slice(0, 4)
}

function createHeuristicPlan(result: DaydreamGenerationResult, request: string): DaydreamRemixAgentPlan {
  const normalized = request.trim().toLowerCase()
  const isSmallTalk = /^(hi|hello|hey|yo|sup|hii|hiii|hola|test)\b/.test(normalized) && normalized.length <= 12
  const looksLikeDiscussion =
    normalized.endsWith("?") ||
    normalized.startsWith("what if") ||
    normalized.startsWith("should ") ||
    normalized.startsWith("could ") ||
    normalized.startsWith("can you explain") ||
    normalized.startsWith("brainstorm") ||
    normalized.startsWith("give me ideas") ||
    normalized.startsWith("show me ideas") ||
    isSmallTalk

  const wantsBw = normalized.includes("black and white") || normalized.includes("b&w") || normalized.includes("monochrome")
  const wantsFaster = normalized.includes("faster") || normalized.includes("fast cuts") || normalized.includes("faster cuts") || normalized.includes("whip")
  const wantsSlower = normalized.includes("slower") || normalized.includes("slow") || normalized.includes("calm")
  const wantsMusicChange =
    normalized.includes("music") ||
    normalized.includes("score") ||
    normalized.includes("lyria") ||
    normalized.includes("instrumental") ||
    normalized.includes("no vocals") ||
    normalized.includes("sad") ||
    normalized.includes("melanch")

  const toolPlan: string[] = ["Gemini director"]
  if (wantsBw || normalized.includes("style") || normalized.includes("restyle") || normalized.includes("grade") || normalized.includes("color")) {
    toolPlan.push("Gemini image")
  }
  toolPlan.push("Veo")
  if (wantsMusicChange) {
    toolPlan.push("Lyria")
  }

  if (looksLikeDiscussion) {
    return {
      assistantReply: isSmallTalk
        ? `I'm here. Tell me what you want to change about this saved reel (pacing, style, camera motion, or music). I’ll keep the core identity intact and propose an edit plan you can approve.`
        : `We can explore this direction without generating yet. I can propose 2 to 3 concrete remix options (pacing, motion language, grade, and score direction) while keeping the reel’s continuity. Tell me the exact change you want and I’ll prepare an approval-ready remix plan.`,
      generateNow: false,
      refinedRequest: request.trim(),
      productionPrompt: buildFallbackProductionPrompt(result, request),
      toolPlan: ["Gemini director"],
    }
  }

  const changeSummary: string[] = []
  if (wantsBw) changeSummary.push("push it into a premium black-and-white pass")
  if (wantsFaster) changeSummary.push("tighten pacing with faster, beat-synced cuts and punchier camera moves")
  if (wantsSlower) changeSummary.push("slow the motion and soften transitions for a calmer drift")
  if (wantsMusicChange) changeSummary.push("reshape the score direction to match the mood")

  const summaryText = changeSummary.length
    ? changeSummary.join(", ")
    : "apply the requested change while preserving continuity and the reel’s emotional spine"

  return {
    assistantReply: `Got it. I’ll keep the existing reel as the reference anchor, then ${summaryText}. I’m preparing a clean production prompt now; hit Approve & Generate when it looks right.`,
    generateNow: true,
    refinedRequest: request.trim(),
    productionPrompt: buildFallbackProductionPrompt(result, request),
    toolPlan,
  }
}

export async function planDaydreamRemix(
  result: DaydreamGenerationResult,
  request: string,
): Promise<DaydreamRemixAgentPlan> {
  const trimmedRequest = request.trim()
  if (!trimmedRequest) {
    throw new Error("A modification request is required.")
  }

  const config = getAgentConfig()
  const ai = createVertexClient()

  try {
    const response = await ai.models.generateContent({
      model: config.textModel,
      contents: [
        "You are DayDream's Gemini creative director inside a saved-reel modify workspace.",
        "Your job is to understand casual human editing requests, even when they are messy or emotional, and translate them into a clean backend production prompt.",
        "You are not writing marketing copy. You are steering a real cinematic remix pipeline.",
        "assistantReply must be specific to THIS reel and THIS request. Do not use generic phrases like 'I understand the change'. Mention 1-2 concrete edits you will apply and 1 thing you will preserve.",
        "Decide whether the user is asking to discuss ideas or directly generate a modified reel right now.",
        "If the request is a direct change request, set generateNow to true.",
        "If the request is brainstorming, clarification, or asking for options, set generateNow to false.",
        "Always preserve the existing reel as the source reference and continuity anchor.",
        "The backend can use Gemini for planning, Gemini image for reference frames, Veo for motion, and Lyria for score direction.",
        "toolPlan must be a short list of simple tool labels like Gemini director, Gemini image, Veo, and Lyria. Do not write sentences in toolPlan.",
        "Never ask for text overlays, logos, captions, subtitles, or watermarks.",
        `Reference reel prompt: ${result.prompt}`,
        `Reference reel synopsis: ${result.storyboard.synopsis}`,
        `Reference reel visual style: ${result.storyboard.visualStyle}`,
        `Reference reel audio direction: ${result.storyboard.audioPrompt}`,
        `Reference shot titles: ${result.storyboard.shots.map((shot) => shot.title).join(", ")}`,
        `User request: ${trimmedRequest}`,
      ].join("\n"),
      config: {
        temperature: 0.75,
        responseMimeType: "application/json",
        responseJsonSchema: {
          type: "object",
          required: ["assistantReply", "generateNow", "refinedRequest", "productionPrompt", "toolPlan"],
          properties: {
            assistantReply: { type: "string" },
            generateNow: { type: "boolean" },
            refinedRequest: { type: "string" },
            productionPrompt: { type: "string" },
            toolPlan: {
              type: "array",
              items: { type: "string" },
              minItems: 1,
              maxItems: 4,
            },
          },
        },
      },
    })

    const parsed = JSON.parse(response.text || "{}") as Partial<DaydreamRemixAgentPlan>
    if (
      parsed.assistantReply &&
      typeof parsed.generateNow === "boolean" &&
      parsed.refinedRequest &&
      parsed.productionPrompt &&
      Array.isArray(parsed.toolPlan)
    ) {
      return {
        assistantReply: parsed.assistantReply,
        generateNow: parsed.generateNow,
        refinedRequest: parsed.refinedRequest,
        productionPrompt: parsed.productionPrompt,
        toolPlan: normalizeToolPlan(parsed.toolPlan),
      }
    }
  } catch {
    // Fall through to heuristic plan.
  }

  return createHeuristicPlan(result, trimmedRequest)
}
