import { useState, useEffect, useRef } from "react";
import { uid } from "./format";

// 5 points per hour of focused work = 1 point every 12 minutes.
export const POINT_INTERVAL_MS = 12 * 60 * 1000;
export const POINTS_PER_HOUR = 5;
const STORE_KEY = "crica_focus";
const HARD_CAP_MS = 6 * 60 * 60 * 1000; // safety cap so a forgotten session cannot run forever

export const FOCUS_PRESETS = [25, 45, 60, 90];
export const FOCUS_MAX_MIN = 120;

export function earnedPoints(focusedMs) { return Math.floor(focusedMs / POINT_INTERVAL_MS); }

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

// Elapsed focused time from wall clock, so it keeps counting while the tab is
// hidden or showing in a picture-in-picture window. Allowed to run past the
// target (overtime) until you stop it, capped only by a safety limit.
function elapsedOf(s) {
  if (!s) return 0;
  const live = s.phase === "running" && s.segStart ? Date.now() - s.segStart : 0;
  return Math.min(HARD_CAP_MS, (s.accMs || 0) + live);
}

export function useFocusEngine({ onBank }) {
  const [session, setSession] = useState(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s && s.targetMs) return { id: uid(), targetMs: s.targetMs, accMs: s.accMs || 0, segStart: null, focusedMs: s.accMs || 0, alarmed: !!s.alarmed, phase: "paused" };
      }
    } catch (e) { /* ignore */ }
    return null;
  });

  const bankedRef = useRef(null);
  const alarmedRef = useRef(null);
  const audioRef = useRef(null);

  // Tick on wall clock. When the target is reached we mark it alarmed but keep
  // running, so the timer carries on counting until you choose to stop.
  useEffect(() => {
    if (!session || session.phase !== "running") return;
    const tick = () => {
      setSession((s) => {
        if (!s || s.phase !== "running") return s;
        const focusedMs = elapsedOf(s);
        if (focusedMs >= s.targetMs && !s.alarmed) return { ...s, focusedMs, alarmed: true };
        return { ...s, focusedMs };
      });
    };
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [session?.phase, session?.id]);

  // Sound the alarm once, the moment the countdown hits zero.
  useEffect(() => {
    if (session && session.alarmed && alarmedRef.current !== session.id) {
      alarmedRef.current = session.id;
      playAlarm(audioRef);
    }
  }, [session?.alarmed, session?.id]);

  // Bank points/time once, when you actually end the session.
  useEffect(() => {
    if (!session || session.phase !== "done") return;
    if (bankedRef.current === session.id) return;
    bankedRef.current = session.id;
    const focusedMs = elapsedOf(session);
    const points = earnedPoints(focusedMs);
    const seconds = Math.round(focusedMs / 1000);
    if (seconds > 0 && onBank) onBank({ seconds, points });
  }, [session?.phase, session?.id]);

  // Persist an in-progress session so a refresh keeps the accumulated time.
  useEffect(() => {
    try {
      if (session && session.phase !== "done") {
        localStorage.setItem(STORE_KEY, JSON.stringify({ targetMs: session.targetMs, accMs: elapsedOf(session), alarmed: !!session.alarmed }));
      } else {
        localStorage.removeItem(STORE_KEY);
      }
    } catch (e) { /* ignore */ }
  }, [session?.focusedMs, session?.phase]);

  const start = (minutes) => {
    const m = Math.max(1, Math.min(FOCUS_MAX_MIN, Math.round(minutes || 25)));
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!audioRef.current) audioRef.current = new Ctx();
      if (audioRef.current.state === "suspended") audioRef.current.resume();
    } catch (e) { /* ignore */ }
    setSession({ id: uid(), targetMs: m * 60000, accMs: 0, segStart: Date.now(), focusedMs: 0, alarmed: false, phase: "running" });
  };
  const pause = () => setSession((s) => (s && s.phase === "running" ? { ...s, accMs: elapsedOf(s), focusedMs: elapsedOf(s), segStart: null, phase: "paused" } : s));
  const resume = () => setSession((s) => (s && s.phase === "paused" ? { ...s, segStart: Date.now(), phase: "running" } : s));
  const end = () => setSession((s) => (s && s.phase !== "done" ? { ...s, accMs: elapsedOf(s), focusedMs: elapsedOf(s), segStart: null, phase: "done" } : s));
  const dismiss = () => setSession(null);

  return { session, start, pause, resume, end, dismiss };
}
