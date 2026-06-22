// ============================================================
// Firebase setup for Crica
// ------------------------------------------------------------
// This is what makes the data sync between both PCs.
//
// One-time setup (takes about 5 minutes):
//  1. Go to https://console.firebase.google.com and click "Add project".
//     Give it a name (e.g. "crica"), you can skip Google Analytics.
//  2. Inside the project, open "Build" > "Firestore Database" > "Create database".
//     Choose "Start in test mode" while you are building, pick the closest region.
//  3. Back on the project overview, click the web icon "</>" to register a web app.
//     Name it "crica", do NOT enable Hosting yet, click "Register app".
//  4. Firebase shows you a config object. Copy those values into the object below.
//
// Until you fill this in, Crica still runs: it just keeps data on this one
// computer (no sync). Once the values are in, both PCs share the same data live.
// ============================================================
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDrVTA4cVamz7TU9DE63YLVctVgryks8iI",
  authDomain: "crica-b8859.firebaseapp.com",
  databaseURL: "https://crica-b8859-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "crica-b8859",
  storageBucket: "crica-b8859.firebasestorage.app",
  messagingSenderId: "892951368395",
  appId: "1:892951368395:web:5d02cd71f36d663aad414e"
};

export const firebaseConfigured =
  !!firebaseConfig.projectId && firebaseConfig.projectId !== "REPLACE_ME";

let db = null;
if (firebaseConfigured) {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
} else {
  console.warn(
    "[Crica] Firebase is not configured yet, so data stays on this computer only. " +
    "Add your config in src/firebase.js to sync across both PCs."
  );
}

export { db };
