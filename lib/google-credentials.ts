import { writeFileSync, existsSync } from "node:fs"
import os from "node:os"
import path from "node:path"

type ServiceAccountJson = {
  type?: string
  project_id?: string
  private_key?: string
  client_email?: string
  token_uri?: string
}

let didEnsure = false

function normalizePrivateKey(key: string) {
  // Vercel env vars often store newlines escaped.
  return key.includes("\\n") ? key.replace(/\\n/g, "\n") : key
}

function tryBuildFromFirebaseEnv(): ServiceAccountJson | null {
  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY

  if (!projectId || !clientEmail || !privateKeyRaw) return null

  return {
    type: "service_account",
    project_id: projectId,
    client_email: clientEmail,
    private_key: normalizePrivateKey(privateKeyRaw),
    token_uri: "https://oauth2.googleapis.com/token",
  }
}

export function ensureGoogleApplicationCredentials() {
  if (didEnsure) return
  didEnsure = true

  // If the user already set a file path (typical in GCP), keep it.
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) return

  const rawJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
  const jsonFromFirebase = !rawJson ? tryBuildFromFirebaseEnv() : null

  let credentials: ServiceAccountJson | null = null

  if (rawJson) {
    try {
      credentials = JSON.parse(rawJson) as ServiceAccountJson
      if (credentials?.private_key) credentials.private_key = normalizePrivateKey(credentials.private_key)
    } catch {
      // If the env var is present but invalid JSON, don't crash the whole app at import time.
      console.warn("[daydream] GOOGLE_APPLICATION_CREDENTIALS_JSON is set but could not be parsed as JSON.")
      return
    }
  } else if (jsonFromFirebase) {
    credentials = jsonFromFirebase
  }

  if (!credentials?.client_email || !credentials?.private_key) {
    // Leave auth resolution to ADC (local dev / gcloud) if no credentials are configured.
    return
  }

  const targetPath = path.join(os.tmpdir(), "daydream-gcp-sa.json")

  try {
    if (!existsSync(targetPath)) {
      writeFileSync(targetPath, JSON.stringify(credentials), { encoding: "utf8" })
    }
    process.env.GOOGLE_APPLICATION_CREDENTIALS = targetPath
  } catch (e) {
    console.warn("[daydream] Failed to write service account credentials to tmp dir.", e)
  }
}

