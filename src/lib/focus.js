import { useState, useEffect, useRef } from "react";
import { uid } from "./format";

// 5 points per hour of focused work = 1 point every 12 minutes.
export const POINT_INTERVAL_MS = 12 * 60 * 1000;
export const POINTS_PER_HOUR = 5;
// Reject any tick gap bigger than this. Stops sleep, clock changes, and
// background-throttled time from being credited, so the timer cannot be gamed.
const MAX_DELTA_MS = 5000;
const STORE_KEY = "crica_focus";

export const FOCUS_PRESETS = [25, 45, 60, 90];
export const FOCUS_MAX_MIN = 120; // a single session is capped, so it cannot run forever

export function earnedPoints(focusedMs) { return Math.floor(focusedMs / POINT_INTERVAL_MS); }

// Engine lives high up (App) so the timer keeps running while you move around the app.
export function useFocusEngine({ onBank }) {
  const [session, setSession] = useState(() => {
    // A refresh restores the session paused, and never credits the time the page was closed.
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s && s.targetMs) return { id: uid(), targetMs: s.targetMs, focusedMs: s.focusedMs || 0, phase: "paused" };
      }
    } catch (e) { /* ignore */ }
    return null;
  });

  const lastTickRef = useRef(0);
  const bankedRef = useRef(null);

  // Tick: only while running and the tab is actually visible, only crediting real, small deltas.
  useEffect(() => {
    if (!session || session.phase !== "running") return;
    lastTickRef.current = Date.now();
    const onVis = () => { lastTickRef.current = Date.now(); };
    document.addEventListener("visibilitychange", onVis);
    const id = setInterval(() => {
      const now = Date.now();
      const delta = now - lastTickRef.current;
      lastTickRef.current = now;
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      if (delta <= 0 || delta > MAX_DELTA_MS) return;
      setSession((s) => {
        if (!s || s.phase !== "running") return s;
        const focusedMs = Math.min(s.focusedMs + delta, s.targetMs);
        if (focusedMs >= s.targetMs) return { ...s, focusedMs, phase: "done" };
        return { ...s, focusedMs };
      });
    }, 1000);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onVis); };
  }, [session?.phase, session?.id]);

  // Bank points exactly once when a session ends (completed or stopped early).
  useEffect(() => {
    if (!session || session.phase !== "done") return;
    if (bankedRef.current === session.id) return;
    bankedRef.current = session.id;
    const points = earnedPoints(session.focusedMs);
    const seconds = Math.round(session.focusedMs / 1000);
    if (seconds > 0 && onBank) onBank({ seconds, points }); // log the time even if it was too short to earn a point
  }, [session?.phase, session?.id]);

  // Persist an in-progress session so a refresh does not lose it.
  useEffect(() => {
    try {
      if (session && session.phase !== "done") {
        localStorage.setItem(STORE_KEY, JSON.stringify({ targetMs: session.targetMs, focusedMs: session.focusedMs }));
      } else {
        localStorage.removeItem(STORE_KEY);
      }
    } catch (e) { /* ignore */ }
  }, [session?.focusedMs, session?.phase]);

  const start = (minutes) => {
    const m = Math.max(1, Math.min(FOCUS_MAX_MIN, Math.round(minutes || 25)));
    setSession({ id: uid(), targetMs: m * 60000, focusedMs: 0, phase: "running" });
  };
  const pause = () => setSession((s) => (s && s.phase === "running" ? { ...s, phase: "paused" } : s));
  const resume = () => setSession((s) => (s && s.phase === "paused" ? { ...s, phase: "running" } : s));
  const end = () => setSession((s) => (s && s.phase !== "done" ? { ...s, phase: "done" } : s)); // stop early, bank what you earned
  const dismiss = () => setSession(null);

  return { session, start, pause, resume, end, dismiss };
}
