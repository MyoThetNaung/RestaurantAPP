import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import { getAnalytics, isSupported } from "firebase/analytics"

const firebaseConfig = {
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ??
    "AIzaSyC9Q-M_GsQrrG8dKAWGVsnX3XkZO2LlUkU",
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ??
    "restaurant-f01ac.firebaseapp.com",
  projectId:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "restaurant-f01ac",
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ??
    "restaurant-f01ac.firebasestorage.app",
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "864105851973",
  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ??
    "1:864105851973:web:99c47746f7b8381091472c",
  measurementId:
    process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? "G-891LLM9S84",
}

const app = getApps().length ? getApp() : initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)

let analytics: Awaited<ReturnType<typeof getAnalytics>> | undefined

export const getFirebaseAnalytics = async () => {
  if (typeof window === "undefined") return undefined
  if (!analytics && (await isSupported())) {
    analytics = getAnalytics(app)
  }
  return analytics
}

export default app

