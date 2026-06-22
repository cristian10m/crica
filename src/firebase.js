// ============================================================
// Firebase setup for Crica  (Realtime Database)
// ------------------------------------------------------------
// This connects Crica to your Firebase Realtime Database so both
// founders share the same live data across different computers.
//
// Your config is already filled in below. If you ever regenerate the
// project, replace these values with the new ones from:
//   Firebase console > Project settings > Your apps > SDK setup and config
//
// IMPORTANT: the database needs rules that allow access. In the Firebase
// console open Realtime Database > Rules and set them to:
//   { "rules": { ".read": true, ".write": true } }
// then click Publish. (This is open access, fine for a private two-person
// tool while you build. Lock it down later when you want.)
// ============================================================
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDrVTA4cVamz7TU9DE63YLVctVgryks8iI",
  authDomain: "crica-b8859.firebaseapp.com",
  databaseURL: "https://crica-b8859-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "crica-b8859",
  storageBucket: "crica-b8859.firebasestorage.app",
  messagingSenderId: "892951368395",
  appId: "1:892951368395:web:5d02cd71f36d663aad414e",
};

export const firebaseConfigured =
  !!firebaseConfig.databaseURL && !firebaseConfig.databaseURL.includes("REPLACE_ME");

let db = null;
if (firebaseConfigured) {
  const app = initializeApp(firebaseConfig);
  db = getDatabase(app);
}

export { db };
