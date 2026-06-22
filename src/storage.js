// ============================================================
// Storage layer for Crica  (Realtime Database)
// ------------------------------------------------------------
// Three functions the app uses everywhere: loadKey, saveKey, subscribeKey.
// Everything lives in the Firebase Realtime Database under /crica, so both
// founders see the same live data. There is no local fallback on purpose:
// if the database cannot be reached, the app shows an error instead of
// pretending to work, so data is never silently trapped on one machine.
// ============================================================
import { db } from "./firebase";
import { ref, get, set, onValue } from "firebase/database";

const ROOT = "crica";

// Reject if a call stalls, so the app can detect a dead connection
function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("[Crica] timed out: " + label)), ms)),
  ]);
}

// Throws on a real connection error. Returns fallback only when the path is
// genuinely empty (which is normal on first run).
export async function loadKey(key, fallback) {
  const snap = await withTimeout(get(ref(db, ROOT + "/" + key)), 9000, "loadKey:" + key);
  if (snap.exists()) {
    const v = snap.val();
    if (v != null) return v;
  }
  return fallback;
}

export async function saveKey(key, data) {
  await set(ref(db, ROOT + "/" + key), data);
}

export function subscribeKey(key, cb) {
  return onValue(
    ref(db, ROOT + "/" + key),
    (snap) => { cb(snap.exists() ? snap.val() : null); },
    (e) => console.warn("[Crica] subscribe failed for", key, e)
  );
}
