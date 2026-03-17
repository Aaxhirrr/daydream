import admin from "firebase-admin"

const FIREBASE_ADMIN_CONFIG = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
}

let cachedFirestore: admin.firestore.Firestore | null = null
let firestoreSettingsApplied = false

export function getFirestore() {
  if (!admin.apps.length) {
    if (FIREBASE_ADMIN_CONFIG.projectId && FIREBASE_ADMIN_CONFIG.clientEmail && FIREBASE_ADMIN_CONFIG.privateKey) {
      admin.initializeApp({
        credential: admin.credential.cert(FIREBASE_ADMIN_CONFIG),
      })
    } else {
      // Fallback for local development or if environment variables are not yet set
      // This allows the app to stay "alive" even without Firebase configured
      console.warn("[daydream] Firebase environment variables missing. Firebase persistence will be disabled.")
      return null
    }
  }

  try {
    if (!cachedFirestore) {
      cachedFirestore = admin.firestore()
    }

    // Firestore rejects `undefined` values. We intentionally use `undefined` in a few places
    // to mean "unset this field" when we `set()` the full document.
    if (!firestoreSettingsApplied) {
      cachedFirestore.settings({ ignoreUndefinedProperties: true })
      firestoreSettingsApplied = true
    }

    return cachedFirestore
  } catch (e) {
    console.error("[daydream] Failed to initialize Firestore:", e)
    return null
  }
}

export const db = getFirestore()
