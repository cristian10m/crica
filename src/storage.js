// ============================================================
// Storage layer for Crica
// ------------------------------------------------------------
// Same three functions the app uses everywhere: loadKey, saveKey, subscribeKey.
// If Firebase is configured, data lives in Firestore and syncs live between
// both founders' computers. If not, it falls back to this browser's local
// storage so the app still works on a single machine while you set things up.
// ============================================================
import { db, firebaseConfigured } from "./firebase";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";

const COLLECTION = "crica";
const LS_PREFIX = "crica:";
const mem = {};

// Reject if a Firestore call stalls, so the app never hangs on a bad connection
function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("[Crica] timed out: " + label)), ms)),
  ]);
}

function lsGet(key, fallback) {
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    if (raw != null) return JSON.parse(raw);
  } catch (e) { /* ignore */ }
  return key in mem ? mem[key] : fallback;
}

function lsSet(key, data) {
  mem[key] = data;
  try { localStorage.setItem(LS_PREFIX + key, JSON.stringify(data)); } catch (e) { /* ignore */ }
}

export async function loadKey(key, fallback) {
  if (!firebaseConfigured) return lsGet(key, fallback);
  try {
    const snap = await withTimeout(getDoc(doc(db, COLLECTION, key)), 8000, "loadKey:" + key);
    if (snap.exists()) {
      const d = snap.data();
      if (d && "value" in d) return d.value;
    }
  } catch (e) { console.warn("[Crica] loadKey failed for", key, e); }
  return fallback;
}

export async function saveKey(key, data) {
  if (!firebaseConfigured) { lsSet(key, data); return; }
  try {
    await setDoc(doc(db, COLLECTION, key), { value: data, updatedAt: Date.now() });
  } catch (e) { console.warn("[Crica] saveKey failed for", key, e); }
}

export function subscribeKey(key, cb) {
  if (!firebaseConfigured) {
    // Sync across tabs on the same machine while in local-only mode
    const handler = (e) => {
      if (e.key === LS_PREFIX + key && e.newValue) {
        try { cb(JSON.parse(e.newValue)); } catch (err) { /* ignore */ }
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }
  try {
    return onSnapshot(
      doc(db, COLLECTION, key),
      (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          if (d && "value" in d) cb(d.value);
        }
      },
      (e) => console.warn("[Crica] subscribe failed for", key, e)
    );
  } catch (e) {
    console.warn("[Crica] subscribeKey failed for", key, e);
    return () => {};
  }
}