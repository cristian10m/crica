import { useState, useEffect, useRef } from "react";
import { uid } from "./format";

// 5 points per hour of focused work = 1 point every 12 minutes.
export const POINT_INTERVAL_MS = 12 * 60 * 1000;
export const POINTS_PER_HOUR = 5;
const STORE_KEY = "crica_focus";

export const FOCUS_PRESETS = [25, 45, 60, 90];
export const FOCUS_MAX_MIN = 120; // a single session is capped, so it cannot run forever

export function earnedPoints(focusedMs) { return Math.floor(focusedMs / POINT_INTERVAL_MS); }

// A short triple beep + vibrate when the timer finishes.
function playAlarm(ctxRef) {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    let ctx = ctxRef && ctxRef.current;
    if (!ctx) { ctx = new Ctx(); if (ctxRef) ctxRef.current = ctx; }
    if (ctx.state === "suspended") ctx.resume();
    const beep = (t, freq) => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = "sine"; o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
      o.start(t); o.stop(t + 0.5);
    };
    const t0 = ctx.currentTime;
    [0, 0.55, 1.1].forEach((d) => beep(t0 + d, 880));
  } catch (e) { /* ignore */ }
  try { if (navigator.vibrate) navigator.vibrate([250, 120, 250, 120, 400]); } catch (e) { /* ignore */ }
}

// Elapsed focused time, derived from wall clock so it keeps counting while the
// tab is hidden or showing in a picture-in-picture window.
function elapsedOf(s) {
  if (!s) return 0;
  const live = s.phase === "running" && s.segStart ? Date.now() - s.segStart : 0;
  return Math.min(s.targetMs, (s.accMs || 0) + live);
}

// Engine lives high up (App) so the timer keeps running while you move around the app.
export function useFocusEngine({ onBank }) {
  const [session, setSession] = useState(() => {
    // A refresh restores the session paused, and never credits the time the page was closed.
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s && s.targetMs) return { id: uid(), targetMs: s.targetMs, accMs: s.accMs || 0, segStart: null, focusedMs: s.accMs || 0, phase: "paused" };
      }
    } catch (e) { /* ignore */ }
    return null;
  });

  const bankedRef = useRef(null);
  const audioRef = useRef(null);

  // Tick on wall clock: keep updating the displayed time and finish when the target is hit.
  useEffect(() => {
    if (!session || session.phase !== "running") return;
    const tick = () => {
      setSession((s) => {
        if (!s || s.phase !== "running") return s;
        const focusedMs = elapsedOf(s);
        if (focusedMs >= s.targetMs) return { ...s, focusedMs: s.targetMs, accMs: s.targetMs, segStart: null, phase: "done", completed: true };
        return { ...s, focusedMs };
      });
    };
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [session?.phase, session?.id]);

  // Sound the alarm once when the countdown reaches zero on its own.
  useEffect(() => {
    if (session && session.phase === "done" && session.completed) playAlarm(audioRef);
  }, [session?.phase, session?.completed, session?.id]);

  // Bank points/time exactly once when a session ends (completed or stopped early).
  useEffect(() => {
    if (!session || session.phase !== "done") return;
    if (bankedRef.current === session.id) return;
    bankedRef.current = session.id;
    const focusedMs = elapsedOf(session);
    const points = earnedPoints(focusedMs);
    const seconds = Math.round(focusedMs / 1000);
    if (seconds > 0 && onBank) onBank({ seconds, points });
  }, [session?.phase, session?.id]);

  // Persist an in-progress session so a refresh does not lose the accumulated time.
  useEffect(() => {
    try {
      if (session && session.phase !== "done") {
        localStorage.setItem(STORE_KEY, JSON.stringify({ targetMs: session.targetMs, accMs: elapsedOf(session) }));
      } else {
        localStorage.removeItem(STORE_KEY);
      }
    } catch (e) { /* ignore */ }
  }, [session?.focusedMs, session?.phase]);

  const start = (minutes) => {
    const m = Math.max(1, Math.min(FOCUS_MAX_MIN, Math.round(minutes || 25)));
    // Unlock audio on this user gesture so the alarm can play later even if the tab is hidden.
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!audioRef.current) audioRef.current = new Ctx();
      if (audioRef.current.state === "suspended") audioRef.current.resume();
    } catch (e) { /* ignore */ }
    setSession({ id: uid(), targetMs: m * 60000, accMs: 0, segStart: Date.now(), focusedMs: 0, phase: "running" });
  };
  const pause = () => setSession((s) => (s && s.phase === "running" ? { ...s, accMs: elapsedOf(s), segStart: null, focusedMs: elapsedOf(s), phase: "paused" } : s));
  const resume = () => setSession((s) => (s && s.phase === "paused" ? { ...s, segStart: Date.now(), phase: "running" } : s));
  const end = () => setSession((s) => (s && s.phase !== "done" ? { ...s, accMs: elapsedOf(s), focusedMs: elapsedOf(s), segStart: null, phase: "done", completed: false } : s));
  const dismiss = () => setSession(null);

  return { session, start, pause, resume, end, dismiss };
}
