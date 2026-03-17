import { randomUUID } from "node:crypto"
import { spawn } from "node:child_process"
import { existsSync } from "node:fs"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { GoogleGenAI } from "@google/genai"
import { Storage } from "@google-cloud/storage"
import { GoogleAuth } from "google-auth-library"
import { ensureGoogleApplicationCredentials } from "@/lib/google-credentials"
import type {
  DaydreamGenerationResult,
  DaydreamMediaAsset,
  DaydreamShot,
  DaydreamStoryboard,
} from "@/lib/daydream-types"

type StoredBinary = {
  filePath: string
  url: string
  mimeType: string
}

type InlineBinary = {
  base64: string
  mimeType: string
}

type DaydreamPipelineOptions = {
  jobId?: string
  referenceResult?: DaydreamGenerationResult
  durationSeconds?: number
  shotCount?: number
  onStage?: (stage: string) => void | Promise<void>
}

type DaydreamConfig = {
  project: string
  geminiLocation: string
  lyriaLocation: string
  veoLocation: string
  textModel: string
  imageModel: string
  lyriaModel: string
  veoModel: string
}

const SIGNED_URL_TTL_MS = 1000 * 60 * 60 * 24 * 7 // 7 days

function assetBucketName() {
  return process.env.DAYDREAM_ASSET_BUCKET || process.env.DAYDREAM_GCS_BUCKET || ""
}

function isServerlessRuntime() {
  return (
    Boolean(process.env.VERCEL) ||
    Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME) ||
    Boolean(process.env.LAMBDA_TASK_ROOT) ||
    Boolean(process.env.NOW_REGION) ||
    Boolean(process.env.VERCEL_REGION) ||
    Boolean(process.env.VERCEL_ENV)
  )
}

function resolveOutputDir(jobId: string) {
  const configuredRoot = process.env.DAYDREAM_OUTPUT_DIR
  if (configuredRoot) return path.join(configuredRoot, jobId)

  if (isServerlessRuntime()) {
    return path.join(os.tmpdir(), "daydream-output", jobId)
  }

  return path.join(process.cwd(), "public", "generated", jobId)
}

function isInsidePublicDir(filePath: string) {
  const publicRoot = path.resolve(path.join(process.cwd(), "public")) + path.sep
  const resolved = path.resolve(filePath)
  return resolved.startsWith(publicRoot)
}

let googleAuth: GoogleAuth | null = null
let storage: Storage | null = null

function getGoogleAuth() {
  ensureGoogleApplicationCredentials()
  if (!googleAuth) {
    googleAuth = new GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    })
  }
  return googleAuth
}

function getStorage() {
  ensureGoogleApplicationCredentials()
  if (!storage) {
    storage = new Storage()
  }
  return storage
}

function getConfig(): DaydreamConfig {
  const project = process.env.GOOGLE_CLOUD_PROJECT
  if (!project) {
    throw new Error("Missing GOOGLE_CLOUD_PROJECT in the server environment.")
  }

  return {
    project,
    geminiLocation: process.env.DAYDREAM_GEMINI_LOCATION || "global",
    lyriaLocation: process.env.DAYDREAM_LYRIA_LOCATION || "us-central1",
    veoLocation: process.env.DAYDREAM_VEO_LOCATION || "us-central1",
    textModel: process.env.DAYDREAM_TEXT_MODEL || "gemini-2.5-flash",
    imageModel: process.env.DAYDREAM_IMAGE_MODEL || "gemini-2.5-flash-image",
    lyriaModel: process.env.DAYDREAM_LYRIA_MODEL || "lyria-002",
    veoModel: process.env.DAYDREAM_VEO_MODEL || "veo-3.1-generate-preview",
  }
}

function createVertexClient(location: string) {
  const config = getConfig()

  return new GoogleGenAI({
    vertexai: true,
    project: config.project,
    location,
  })
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function errorText(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return String(error)
}

function isQuotaError(error: unknown) {
  const message = errorText(error).toLowerCase()
  return (
    message.includes("resource_exhausted") ||
    message.includes("resource has been exhausted") ||
    message.includes("\"code\":429") ||
    message.includes("quota")
  )
}

function isRecitationError(error: unknown) {
  const message = errorText(error).toLowerCase()
  return message.includes("recitation") || message.includes("all responses were blocked")
}

async function withQuotaRetry<T>(label: string, action: () => Promise<T>) {
  const delays = [4000, 10000, 20000]
  let lastError: unknown

  for (let attempt = 0; attempt <= delays.length; attempt += 1) {
    try {
      console.log(`[daydream] ${label} attempt ${attempt + 1}`)
      return await action()
    } catch (error) {
      lastError = error

      if (!isQuotaError(error) || attempt === delays.length) {
        throw error
      }

      const delay = delays[attempt]
      console.warn(`[daydream] ${label} quota-limited, retrying in ${delay}ms`)
      await sleep(delay)
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}

function normalizeGenerationError(error: unknown) {
  const message = errorText(error)

  if (isQuotaError(error)) {
    return "Google quota is exhausted for this project right now. Vertex accepted the request, but one of the generation APIs hit a 429 limit. Wait for quota to reset, raise quota/billing in Google Cloud, or reduce the generation load."
  }

  return message
}

function createSilentWav(durationSeconds: number): InlineBinary {
  const sampleRate = 44100
  const channels = 2
  const bitsPerSample = 16
  const bytesPerSample = bitsPerSample / 8
  const totalSamples = sampleRate * durationSeconds
  const dataSize = totalSamples * channels * bytesPerSample
  const buffer = Buffer.alloc(44 + dataSize)

  buffer.write("RIFF", 0)
  buffer.writeUInt32LE(36 + dataSize, 4)
  buffer.write("WAVE", 8)
  buffer.write("fmt ", 12)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20)
  buffer.writeUInt16LE(channels, 22)
  buffer.writeUInt32LE(sampleRate, 24)
  buffer.writeUInt32LE(sampleRate * channels * bytesPerSample, 28)
  buffer.writeUInt16LE(channels * bytesPerSample, 32)
  buffer.writeUInt16LE(bitsPerSample, 34)
  buffer.write("data", 36)
  buffer.writeUInt32LE(dataSize, 40)

  return {
    base64: buffer.toString("base64"),
    mimeType: "audio/wav",
  }
}

function publicUrlFor(filePath: string) {
  const publicRoot = path.join(process.cwd(), "public")
  const relativePath = path.relative(publicRoot, filePath).split(path.sep).join("/")
  return `/${relativePath}`
}

function filePathFromPublicUrl(url: string) {
  const normalized = url.startsWith("/") ? url.slice(1) : url
  return path.join(process.cwd(), "public", normalized)
}

function extensionFromMime(mimeType: string) {
  if (mimeType === "image/png") return "png"
  if (mimeType === "image/jpeg") return "jpg"
  if (mimeType === "video/mp4") return "mp4"
  if (mimeType === "audio/wav") return "wav"
  if (mimeType === "audio/mpeg") return "mp3"
  return "bin"
}

async function signedUrlForObject(bucketName: string, objectName: string) {
  const file = getStorage().bucket(bucketName).file(objectName)
  const [url] = await file.getSignedUrl({
    action: "read",
    expires: Date.now() + SIGNED_URL_TTL_MS,
  })

  return url
}

async function persistBufferAsAssetUrl({
  buffer,
  mimeType,
  filePath,
}: {
  buffer: Buffer
  mimeType: string
  filePath: string
}): Promise<string> {
  if (isInsidePublicDir(filePath)) {
    return publicUrlFor(filePath)
  }

  const bucketName = assetBucketName()
  if (!bucketName) {
    throw new Error(
      "DAYDREAM_ASSET_BUCKET is required to persist generated media in serverless deployments (Vercel).",
    )
  }

  const jobId = path.basename(path.dirname(filePath))
  const objectName = `daydream/${jobId}/${path.basename(filePath)}`

  await getStorage()
    .bucket(bucketName)
    .file(objectName)
    .save(buffer, { contentType: mimeType, resumable: false })

  return signedUrlForObject(bucketName, objectName)
}

async function persistDiskFileAsAssetUrl(filePath: string, mimeType: string): Promise<string> {
  if (isInsidePublicDir(filePath)) {
    return publicUrlFor(filePath)
  }

  const buffer = await readFile(filePath)
  return persistBufferAsAssetUrl({ buffer, mimeType, filePath })
}

async function storeBase64Asset({
  base64,
  mimeType,
  jobDir,
  fileName,
}: {
  base64: string
  mimeType: string
  jobDir: string
  fileName: string
}): Promise<StoredBinary> {
  const extension = extensionFromMime(mimeType)
  const filePath = path.join(jobDir, `${fileName}.${extension}`)
  const buffer = Buffer.from(base64, "base64")
  await writeFile(filePath, buffer)
  const url = await persistBufferAsAssetUrl({ buffer, mimeType, filePath })

  return {
    filePath,
    url,
    mimeType,
  }
}

async function storeFileAsset({
  sourcePath,
  mimeType,
}: {
  sourcePath: string
  mimeType: string
}): Promise<InlineBinary> {
  const buffer = await readFile(sourcePath)
  return {
    base64: buffer.toString("base64"),
    mimeType,
  }
}

async function downloadGeneratedVideoUri(uri: string, filePath: string): Promise<InlineBinary> {
  await mkdir(path.dirname(filePath), { recursive: true })
  if (uri.startsWith("gs://")) {
    const withoutScheme = uri.slice(5)
    const slashIndex = withoutScheme.indexOf("/")
    if (slashIndex === -1) {
      throw new Error(`Invalid Veo storage URI: ${uri}`)
    }

    const bucketName = withoutScheme.slice(0, slashIndex)
    const objectName = withoutScheme.slice(slashIndex + 1)
    await getStorage().bucket(bucketName).file(objectName).download({ destination: filePath })
    return storeFileAsset({ sourcePath: filePath, mimeType: "video/mp4" })
  }

  const response = await fetch(uri)
  if (!response.ok) {
    throw new Error(`Failed to download Veo output from ${uri}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  await writeFile(filePath, buffer)

  return {
    base64: buffer.toString("base64"),
    mimeType: response.headers.get("content-type") || "video/mp4",
  }
}

function findGeneratedImageData(response: any): InlineBinary {
  const parts = response?.candidates?.flatMap((candidate: any) => candidate?.content?.parts || []) || []
  const imagePart = parts.find((part: any) => part?.inlineData?.data && String(part?.inlineData?.mimeType || "").startsWith("image/"))

  if (!imagePart?.inlineData?.data) {
    throw new Error("Gemini image generation did not return any image bytes.")
  }

  return {
    base64: imagePart.inlineData.data,
    mimeType: imagePart.inlineData.mimeType || "image/png",
  }
}

function createFallbackStoryboard(prompt: string, durationSeconds: number, shotCount: number): DaydreamStoryboard {
  if (shotCount === 4) {
    return {
      synopsis: `A ${durationSeconds}-second cinematic edit shaped around "${prompt}" with escalating motion and emotional payoff.`,
      visualStyle: "Moody cinematic realism, teal shadows, silver highlights, anamorphic motion blur, no text or watermarks.",
      audioPrompt: `${prompt}, ${durationSeconds}-second instrumental cinematic soundtrack, emotional progression, strong beat changes, no vocals.`,
      negativeAudioPrompt: "vocals, speech, lyrics, harsh distortion, clipping",
      shots: [
        {
          title: "Opening Drift",
          imagePrompt: `${prompt}. Opening keyframe. Wide establishing shot, cinematic realism, 16:9, layered atmosphere, no text, no watermark.`,
          videoPrompt: `${prompt}. Opening sequence with slow cinematic movement, layered atmosphere, natural camera drift, no text, no watermark.`,
        },
        {
          title: "Rising Detail",
          imagePrompt: `${prompt}. Second keyframe. Medium shot with stronger contrast, more motion energy, cinematic realism, 16:9, no text, no watermark.`,
          videoPrompt: `${prompt}. Mid sequence with stronger motion and emotional escalation, cinematic realism, no text, no watermark.`,
        },
        {
          title: "Peak Motion",
          imagePrompt: `${prompt}. Third keyframe. Dynamic motion, dramatic lighting, charged atmosphere, cinematic realism, 16:9, no text, no watermark.`,
          videoPrompt: `${prompt}. Peak sequence with dynamic camera movement, dramatic lighting, and expressive momentum, no text, no watermark.`,
        },
        {
          title: "Final Resolve",
          imagePrompt: `${prompt}. Final keyframe. Emotional closing image, strong silhouette or payoff detail, cinematic realism, 16:9, no text, no watermark.`,
          videoPrompt: `${prompt}. Closing sequence with emotional resolve, graceful finish, cinematic realism, no text, no watermark.`,
        },
      ],
    }
  }

  const shots: DaydreamShot[] = Array.from({ length: shotCount }, (_, index) => {
    const number = index + 1
    const imagePrompt = `${prompt}. Velocity edit keyframe ${number}. Cinematic realism, 16:9, cohesive lighting, fast-cut energy, no text, no watermark.`
    const videoPrompt = `${prompt}. Velocity edit clip ${number}. Dynamic cinematic camera movement, strong parallax, quick pans, premium finish, no text, no watermark.`
    return {
      title: `Cut ${number}`,
      imagePrompt,
      videoPrompt,
    }
  })

  return {
    synopsis: `A ${durationSeconds}-second cinematic edit shaped around "${prompt}" with escalating motion and emotional payoff.`,
    visualStyle: "Moody cinematic realism, teal shadows, silver highlights, anamorphic motion blur, no text or watermarks.",
    audioPrompt: `${prompt}, ${durationSeconds}-second instrumental cinematic soundtrack, emotional progression, strong beat changes, no vocals.`,
    negativeAudioPrompt: "vocals, speech, lyrics, harsh distortion, clipping",
    shots,
  }
}

function createSaferVeoPrompt(prompt: string) {
  return prompt
    .replace(/\bmosh pit chaos\b/gi, "surging concert crowd")
    .replace(/\bscreaming fans\b/gi, "ecstatic fans")
    .replace(/\bexplosive\b/gi, "electrifying")
    .replace(/\baggressive\b/gi, "dynamic")
    .replace(/\bchaos\b/gi, "frenzy")
    .replace(/\bstrobe-lit\b/gi, "pulsing light")
    .replace(/\bbass-heavy\b/gi, "rhythmic live-show")
    .replace(/\bwhip pans\b/gi, "quick pans")
    .replace(/\bno text, no logos, no watermark\b/gi, "no text, no logos, no watermark")
    .replace(/\s+/g, " ")
    .trim()
}

async function buildStoryboard(
  prompt: string,
  durationSeconds: number,
  shotCount: number,
  referenceResult?: DaydreamGenerationResult,
): Promise<DaydreamStoryboard> {
  const config = getConfig()
  const ai = createVertexClient(config.geminiLocation)

  const referenceLines = referenceResult
    ? [
        "You are modifying an existing saved DayDream reel, not creating a brand-new unrelated piece.",
        `Reference reel prompt: ${referenceResult.prompt}`,
        `Reference reel synopsis: ${referenceResult.storyboard.synopsis}`,
        `Reference reel visual style: ${referenceResult.storyboard.visualStyle}`,
        `Reference reel audio direction: ${referenceResult.storyboard.audioPrompt}`,
        `Reference shot titles: ${referenceResult.storyboard.shots.map((shot) => shot.title).join(", ")}`,
        "Preserve continuity, emotional identity, and recognizability from the reference reel while applying the new request.",
      ]
    : []

  const response = await withQuotaRetry("storyboard", () =>
    ai.models.generateContent({
      model: config.textModel,
      contents: [
        "You are DayDream, a cinematic creative director.",
        `Turn the user's vibe into a ${shotCount}-shot ${durationSeconds}-second storyboard for a generated short film.`,
        "Make the output visually specific and production ready for image-to-video generation.",
        `Each shot must feel like one beat in a ${durationSeconds}-second edit.`,
        `Target duration: ${durationSeconds} seconds.`,
        "Keep the prompts free of any text, logos, watermarks, subtitles, or UI.",
        ...referenceLines,
        `User vibe: ${prompt}`,
      ].join("\n"),
      config: {
        temperature: 0.9,
        responseMimeType: "application/json",
        responseJsonSchema: {
          type: "object",
          required: ["synopsis", "visualStyle", "audioPrompt", "negativeAudioPrompt", "shots"],
          properties: {
            synopsis: { type: "string" },
            visualStyle: { type: "string" },
            audioPrompt: { type: "string" },
            negativeAudioPrompt: { type: "string" },
             shots: {
               type: "array",
               minItems: shotCount,
               maxItems: shotCount,
               items: {
                 type: "object",
                 required: ["title", "imagePrompt", "videoPrompt"],
                 properties: {
                  title: { type: "string" },
                  imagePrompt: { type: "string" },
                  videoPrompt: { type: "string" },
                },
              },
            },
          },
        },
      },
    })
  )

  try {
    const parsed = JSON.parse(response.text || "{}") as DaydreamStoryboard
    if (!parsed?.shots?.length) {
      return createFallbackStoryboard(prompt, durationSeconds, shotCount)
    }

    if (parsed.shots.length > shotCount) {
      parsed.shots = parsed.shots.slice(0, shotCount)
    } else if (parsed.shots.length < shotCount) {
      const fallback = createFallbackStoryboard(prompt, durationSeconds, shotCount)
      parsed.shots = [...parsed.shots, ...fallback.shots.slice(parsed.shots.length)]
    }

    return parsed
  } catch {
    // Fall through to the fallback storyboard.
  }

  return createFallbackStoryboard(prompt, durationSeconds, shotCount)
}

async function inlineBinaryFromAsset(reference: DaydreamMediaAsset): Promise<InlineBinary> {
  if (reference.url.startsWith("http://") || reference.url.startsWith("https://")) {
    const response = await fetch(reference.url)
    if (!response.ok) {
      throw new Error(`Failed to fetch reference asset: ${reference.url}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    return {
      base64: buffer.toString("base64"),
      mimeType: reference.mimeType || response.headers.get("content-type") || "application/octet-stream",
    }
  }

  if (reference.url.startsWith("gs://")) {
    const withoutScheme = reference.url.slice(5)
    const slashIndex = withoutScheme.indexOf("/")
    if (slashIndex === -1) {
      throw new Error(`Invalid storage URI: ${reference.url}`)
    }

    const bucketName = withoutScheme.slice(0, slashIndex)
    const objectName = withoutScheme.slice(slashIndex + 1)
    const extension = extensionFromMime(reference.mimeType || "application/octet-stream")
    const filePath = path.join(os.tmpdir(), "daydream-ref-cache", `${randomUUID()}.${extension}`)

    await mkdir(path.dirname(filePath), { recursive: true })
    await getStorage().bucket(bucketName).file(objectName).download({ destination: filePath })
    return storeFileAsset({ sourcePath: filePath, mimeType: reference.mimeType })
  }

  // Local dev: served from /public.
  return storeFileAsset({
    sourcePath: filePathFromPublicUrl(reference.url),
    mimeType: reference.mimeType,
  })
}

async function generateHeroFrame(shot: DaydreamShot, referenceFrame?: DaydreamMediaAsset): Promise<InlineBinary> {
  const config = getConfig()
  const ai = createVertexClient(config.geminiLocation)
  let referenceInlineData: InlineBinary | null = null

  if (referenceFrame?.url) {
    try {
      referenceInlineData = await inlineBinaryFromAsset(referenceFrame)
    } catch {
      referenceInlineData = null
    }
  }

  const contents = referenceInlineData
    ? [
        {
          role: "user",
          parts: [
            {
              text: [
                "Create a cinematic storyboard hero frame for DayDream.",
                "Use the provided image as the reference anchor from the existing saved reel.",
                "Preserve recognizability and continuity while applying the new shot direction.",
                "Output only a single polished 16:9 image.",
                "No text, no captions, no logos, no watermarks, no UI, no split panels.",
                shot.imagePrompt,
              ].join("\n"),
            },
            {
              inlineData: {
                data: referenceInlineData.base64,
                mimeType: referenceInlineData.mimeType,
              },
            },
          ],
        },
      ]
    : [
        "Create a cinematic storyboard hero frame for DayDream.",
        "Output only a single polished 16:9 image.",
        "No text, no captions, no logos, no watermarks, no UI, no split panels.",
        shot.imagePrompt,
      ].join("\n")

  const response = await withQuotaRetry(`hero frame: ${shot.title}`, () =>
    ai.models.generateContent({
      model: config.imageModel,
      contents,
      config: {
        responseModalities: ["IMAGE", "TEXT"],
        temperature: 0.8,
      },
    })
  )

  return findGeneratedImageData(response)
}

async function getAccessToken() {
  const client = await getGoogleAuth().getClient()
  const token = await client.getAccessToken()
  const resolved = typeof token === "string" ? token : token?.token

  if (!resolved) {
    throw new Error("Unable to resolve a Google Cloud access token for Vertex AI.")
  }

  return resolved
}

async function generateSoundtrack(storyboard: DaydreamStoryboard, durationSeconds: number): Promise<InlineBinary> {
  const config = getConfig()
  const accessToken = await getAccessToken()
  const endpoint = `https://${config.lyriaLocation}-aiplatform.googleapis.com/v1/projects/${config.project}/locations/${config.lyriaLocation}/publishers/google/models/${config.lyriaModel}:predict`

  const requestLyria = async (prompt: string, negativePrompt: string, label: string) => {
    const response = await withQuotaRetry(label, async () => {
      return fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          instances: [
            {
              prompt,
              negative_prompt: negativePrompt,
            },
          ],
          parameters: {
            sample_count: 1,
          },
        }),
      })
    })

    if (!response.ok) {
      const message = await response.text()
      throw new Error(`Lyria request failed: ${message}`)
    }

    const payload = (await response.json()) as any
    const prediction = payload?.predictions?.[0]
    const base64Audio = prediction?.bytesBase64Encoded || prediction?.audio?.bytesBase64Encoded

    if (!base64Audio) {
      throw new Error("Lyria did not return any audio bytes.")
    }

    return {
      base64: base64Audio,
      mimeType: "audio/wav",
    } satisfies InlineBinary
  }

  try {
    return await requestLyria(storyboard.audioPrompt, storyboard.negativeAudioPrompt, "lyria soundtrack")
  } catch (error) {
    if (isRecitationError(error)) {
      console.warn("[daydream] lyria recitation block, retrying with safer original-score prompt")

      try {
        return await requestLyria(
          "Original instrumental cinematic score, melancholic and calm, moody atmosphere, soft piano, distant strings, subtle analog pad, slow tempo, no vocals, no lyrics, entirely original composition.",
          "lyrics, vocals, speech, artist imitation, recognizable melody, copyrighted song, harsh distortion, clipping",
          "lyria safe soundtrack",
        )
      } catch (safeError) {
        console.warn(`[daydream] lyria safe retry failed, falling back to silent audio: ${errorText(safeError)}`)
        return createSilentWav(durationSeconds)
      }
    }

    console.warn(`[daydream] soundtrack generation failed, falling back to silent audio: ${errorText(error)}`)
      return createSilentWav(durationSeconds)
  }
}

async function generateClip(shot: DaydreamShot, image: InlineBinary, durationSeconds: number): Promise<InlineBinary> {
  const config = getConfig()
  const ai = createVertexClient(config.veoLocation)

  const runOperation = async (prompt: string, label: string) => {
    let operation = await withQuotaRetry(label, async () => {
      return ai.models.generateVideos({
        model: config.veoModel,
        prompt,
        image: {
          imageBytes: image.base64,
          mimeType: image.mimeType,
        },
        config: {
          numberOfVideos: 1,
          durationSeconds,
          aspectRatio: "16:9",
          resolution: "720p",
          personGeneration: "allow_adult",
          enhancePrompt: true,
          generateAudio: false,
          negativePrompt: "text, captions, subtitles, logos, watermark, low quality, low detail, distorted faces",
        },
      })
    })

    while (!operation.done) {
      await sleep(10000)
      operation = await ai.operations.getVideosOperation({ operation })
    }

    return operation
  }

  const extractVideo = async (operation: any) => {
    if (operation.error) {
      throw new Error(`Veo generation failed for "${shot.title}".`)
    }

    const generatedVideo = operation.response?.generatedVideos?.[0]?.video
    if (generatedVideo?.videoBytes) {
      return {
        base64: generatedVideo.videoBytes,
        mimeType: generatedVideo.mimeType || "video/mp4",
      } satisfies InlineBinary
    }

    if (generatedVideo?.uri) {
      const tempFilePath = path.join(os.tmpdir(), "daydream-veo-cache", `${randomUUID()}.mp4`)
      return downloadGeneratedVideoUri(generatedVideo.uri, tempFilePath)
    }

    return null
  }

  let operation = await runOperation(shot.videoPrompt, `veo clip: ${shot.title}`)
  let clip = await extractVideo(operation)
  if (clip) {
    return clip
  }

  const filteredCount = operation.response?.raiMediaFilteredCount || 0
  const filteredReasons = operation.response?.raiMediaFilteredReasons || []

  if (filteredCount > 0) {
    const saferPrompt = createSaferVeoPrompt(shot.videoPrompt)

    if (saferPrompt !== shot.videoPrompt) {
      console.warn(
        `[daydream] veo filtered "${shot.title}" (${filteredReasons.join(", ") || "unspecified"}), retrying with safer prompt`,
      )

      operation = await runOperation(saferPrompt, `veo safe clip: ${shot.title}`)
      clip = await extractVideo(operation)
      if (clip) {
        return clip
      }
    }

    const retryReasons = operation.response?.raiMediaFilteredReasons || filteredReasons
    throw new Error(
      `Veo filtered "${shot.title}" for safety${retryReasons.length ? `: ${retryReasons.join(", ")}` : "."}`,
    )
  }

  console.warn(
    `[daydream] veo response for "${shot.title}" had neither bytes nor uri`,
    JSON.stringify(operation.response ?? null),
  )
  throw new Error(`Veo did not return usable video output for "${shot.title}".`)
}

async function runFfmpeg(args: string[]) {
  const executableName = process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg"
  const executable = path.join(process.cwd(), "node_modules", "ffmpeg-static", executableName)

  if (!existsSync(executable)) {
    throw new Error(`ffmpeg binary not found at ${executable}`)
  }

  await new Promise<void>((resolve, reject) => {
    const proc = spawn(executable, args)

    let stderr = ""
    proc.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString()
    })

    proc.on("error", reject)
    proc.on("close", (code: number | null) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(stderr || `ffmpeg exited with code ${code}`))
    })
  })
}

async function stitchVideo({
  clipPaths,
  audioPath,
  outputPath,
  durationSeconds,
}: {
  clipPaths: string[]
  audioPath: string
  outputPath: string
  durationSeconds: number
}) {
  const stitchedSilentPath = outputPath.replace(/\.mp4$/, ".silent.mp4")
  const concatFilter = `${clipPaths.map((_, index) => `[${index}:v:0]`).join("")}concat=n=${clipPaths.length}:v=1:a=0[v]`
  const concatArgs = [
    "-y",
    ...clipPaths.flatMap((clipPath) => ["-i", clipPath]),
    "-filter_complex",
    concatFilter,
    "-map",
    "[v]",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    stitchedSilentPath,
  ]

  await runFfmpeg(concatArgs)

  const muxArgs = [
    "-y",
    "-i",
    stitchedSilentPath,
    "-i",
    audioPath,
    "-t",
    String(durationSeconds),
    "-map",
    "0:v:0",
    "-map",
    "1:a:0",
    "-c:v",
    "copy",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-shortest",
    outputPath,
  ]

  await runFfmpeg(muxArgs)
}

function asset(label: string, stored: StoredBinary): DaydreamMediaAsset {
  return {
    label,
    url: stored.url,
    mimeType: stored.mimeType,
  }
}

export async function runDaydreamPipeline(
  prompt: string,
  options: DaydreamPipelineOptions = {},
): Promise<DaydreamGenerationResult> {
  try {
    const trimmedPrompt = prompt.trim()
    if (!trimmedPrompt) {
      throw new Error("A prompt is required to generate a DayDream edit.")
    }

    const { jobId = randomUUID(), onStage, referenceResult } = options
    const requestedDurationSeconds = options.durationSeconds ?? 30
    const requestedShotCount = options.shotCount ?? referenceResult?.storyboard?.shots?.length ?? 4
    const shotCount = [4, 8, 10].includes(requestedShotCount) ? requestedShotCount : 4

    // Velocity edit mode: 8/10 cuts, with 2-3 seconds per cut.
    // Clamp overall duration so we can distribute 2s/3s clips without breaking the "fast cuts" constraint.
    const effectiveDurationSeconds =
      shotCount > 4
        ? Math.min(Math.max(requestedDurationSeconds, shotCount * 2), shotCount * 3)
        : requestedDurationSeconds

    const outputDir = resolveOutputDir(jobId)
    await mkdir(outputDir, { recursive: true })

    console.log(`[daydream] job ${jobId} starting`)
    await onStage?.("Writing your storyboard...")
    const storyboard = await buildStoryboard(trimmedPrompt, effectiveDurationSeconds, shotCount, referenceResult)

    await onStage?.("Scoring the vibe with Lyria...")
    const soundtrack = await generateSoundtrack(storyboard, effectiveDurationSeconds)

    await onStage?.("Painting hero frames with Gemini image...")
    const heroFrames: InlineBinary[] = []
    for (let index = 0; index < storyboard.shots.length; index += 1) {
      const shot = storyboard.shots[index]
      await onStage?.(`Painting hero frames with Gemini image... (${index + 1}/${storyboard.shots.length})`)
      const referenceFrame = referenceResult?.heroFrames?.[index]
      heroFrames.push(await generateHeroFrame(shot, referenceFrame))
    }

    const storedHeroFrames = await Promise.all(
      heroFrames.map((frame, index) =>
        storeBase64Asset({
          base64: frame.base64,
          mimeType: frame.mimeType,
          jobDir: outputDir,
          fileName: `hero-frame-${index + 1}`,
        }),
      ),
    )

    const storedSoundtrack = await storeBase64Asset({
      base64: soundtrack.base64,
      mimeType: soundtrack.mimeType,
      jobDir: outputDir,
      fileName: "soundtrack",
    })

    await onStage?.("Animating shots with Veo...")
    const generatedClips: InlineBinary[] = []
    if (shotCount > 4) {
      const baseSeconds = 2
      const extraSeconds = Math.max(0, Math.min(shotCount, effectiveDurationSeconds - baseSeconds * shotCount))
      for (let index = 0; index < storyboard.shots.length; index += 1) {
        await onStage?.(`Animating shots with Veo... (${index + 1}/${storyboard.shots.length})`)
        const clipSeconds = baseSeconds + (index < extraSeconds ? 1 : 0) // 2s or 3s
        generatedClips.push(await generateClip(storyboard.shots[index], heroFrames[index], clipSeconds))
      }
    } else {
      // Default cinematic pacing for four shots.
      const perShotSeconds = Math.min(8, Math.max(5, Math.round(effectiveDurationSeconds / 4)))
      for (let index = 0; index < storyboard.shots.length; index += 1) {
        await onStage?.(`Animating shots with Veo... (${index + 1}/${storyboard.shots.length})`)
        generatedClips.push(await generateClip(storyboard.shots[index], heroFrames[index], perShotSeconds))
      }
    }

    const storedClips = await Promise.all(
      generatedClips.map((clip, index) =>
        storeBase64Asset({
          base64: clip.base64,
          mimeType: clip.mimeType,
          jobDir: outputDir,
          fileName: `clip-${index + 1}`,
        }),
      ),
    )

    const finalVideoPath = path.join(outputDir, "daydream-final.mp4")
    await onStage?.("Stitching the dream into a final reel...")
    await stitchVideo({
      clipPaths: storedClips.map((clip) => clip.filePath),
      audioPath: storedSoundtrack.filePath,
      outputPath: finalVideoPath,
      durationSeconds: effectiveDurationSeconds,
    })

    const finalVideo: StoredBinary = {
      filePath: finalVideoPath,
      url: await persistDiskFileAsAssetUrl(finalVideoPath, "video/mp4"),
      mimeType: "video/mp4",
    }

    const result: DaydreamGenerationResult = {
      jobId,
      createdAt: new Date().toISOString(),
      prompt: trimmedPrompt,
      storyboard,
      heroFrames: storedHeroFrames.map((frame, index) => asset(storyboard.shots[index].title, frame)),
      clipVideos: storedClips.map((clip, index) => asset(storyboard.shots[index].title, clip)),
      soundtrack: asset("Soundtrack", storedSoundtrack),
      finalVideo: asset("DayDream edit", finalVideo),
      durationSeconds: effectiveDurationSeconds,
      shotCount,
    }

    await writeFile(path.join(outputDir, "result.json"), JSON.stringify(result, null, 2), "utf8")

    console.log(`[daydream] job ${jobId} completed`)

    return result
  } catch (error) {
    throw new Error(normalizeGenerationError(error))
  }
}
