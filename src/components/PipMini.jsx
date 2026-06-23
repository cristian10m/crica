import { useState, useEffect, useCallback } from "react";
import { Pause, Play, Square, Clock } from "lucide-react";
import { earnedPoints } from "../lib/focus";

// Document Picture-in-Picture: a real floating, always-on-top window (Chrome and
// Edge on desktop), like a music mini player. Unsupported elsewhere, where it just
// does nothing and the in-page overlay stays.
export function pipSupported() {
  return typeof window !== "undefined" && "documentPictureInPicture" in window;
}

const PIP_CSS = `
* { box-sizing: border-box; }
body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #f5f5f7; color: #1d1d1f; -webkit-font-smoothing: antialiased; }
html.crica-dark body { background: #1c1c1e; color: #f5f5f7; }
.pip { height: 100vh; display: flex; flex-direction: column; padding: 12px; gap: 8px; }
.pip-task { display: flex; align-items: center; gap: 6px; font-size: 11.5px; font-weight: 600; color: #0071E3; background: rgba(0,113,227,0.1); padding: 6px 9px; border-radius: 9px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
html.crica-dark .pip-task { background: rgba(0,113,227,0.2); }
.pip-main { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; }
.pip-time { font-size: 42px; font-weight: 800; letter-spacing: -0.03em; font-variant-numeric: tabular-nums; line-height: 1; }
.pip-accent { color: #AF52DE; }
.pip-sub { font-size: 12.5px; color: #86868b; font-weight: 600; }
.pip-controls { display: flex; gap: 8px; justify-content: center; padding-top: 6px; }
.pip-btn { display: inline-flex; align-items: center; gap: 5px; border: none; border-radius: 10px; padding: 9px 14px; font-size: 13px; font-weight: 600; cursor: pointer; background: rgba(0,0,0,0.06); color: inherit; }
html.crica-dark .pip-btn { background: rgba(255,255,255,0.1); }
.pip-btn.primary { background: #0071E3; color: #fff; }
.pip-btn.danger { background: rgba(255,59,48,0.13); color: #ff3b30; }
`;

export function usePipWindow() {
  const [pipWindow, setPipWindow] = useState(null);

  const openPip = useCallback(async (w = 320, h = 210) => {
    if (!pipSupported()) return null;
    try {
      if (window.documentPictureInPicture.window) { setPipWindow(window.documentPictureInPicture.window); return window.documentPictureInPicture.window; }
      const pw = await window.documentPictureInPicture.requestWindow({ width: w, height: h });
      const style = pw.document.createElement("style");
      style.textContent = PIP_CSS;
      pw.document.head.appendChild(style);
      if (document.documentElement.classList.contains("crica-dark")) pw.document.documentElement.classList.add("crica-dark");
      pw.addEventListener("pagehide", () => setPipWindow(null));
      setPipWindow(pw);
      return pw;
    } catch (e) { return null; }
  }, []);

  const closePip = useCallback(() => {
    try { if (pipWindow) pipWindow.close(); } catch (e) { /* ignore */ }
    setPipWindow(null);
  }, [pipWindow]);

  // Keep the mini window's light/dark in sync with the app.
  useEffect(() => {
    if (!pipWindow) return;
    const dark = document.documentElement.classList.contains("crica-dark");
    pipWindow.document.documentElement.classList.toggle("crica-dark", dark);
  });

  return { supported: pipSupported(), pipWindow, openPip, closePip };
}

const fmtClock = (ms) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};
const fmtElapsed = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${ss}s`;
  return `${ss}s`;
};

export function PipMini({ focus, workingTitle, workingStart, onPause, onResume, onEnd, onStopWork }) {
  const [, setT] = useState(0);
  useEffect(() => { const id = setInterval(() => setT((n) => n + 1), 1000); return () => clearInterval(id); }, []);
  const focusActive = focus && focus.phase !== "done";
  const running = focus && focus.phase === "running";

  return (
    <div className="pip">
      {focusActive && workingStart != null && (
        <div className="pip-task"><Clock size={13} /> {workingTitle} · {fmtElapsed(Date.now() - workingStart)}</div>
      )}
      {focusActive ? (
        <div className="pip-main">
          <div className="pip-time pip-accent">{fmtClock(focus.targetMs - focus.focusedMs)}</div>
          <div className="pip-sub">+{earnedPoints(focus.focusedMs)} pts · {running ? "focusing" : "paused"}</div>
          <div className="pip-controls">
            {running
              ? <button className="pip-btn" onClick={onPause}><Pause size={14} /> Pause</button>
              : <button className="pip-btn primary" onClick={onResume}><Play size={14} /> Resume</button>}
            <button className="pip-btn danger" onClick={onEnd}><Square size={14} /> End</button>
          </div>
        </div>
      ) : workingStart != null ? (
        <div className="pip-main">
          <div className="pip-time">{fmtElapsed(Date.now() - workingStart)}</div>
          <div className="pip-sub">on {workingTitle}</div>
          <div className="pip-controls"><button className="pip-btn danger" onClick={onStopWork}><Square size={14} /> Stop</button></div>
        </div>
      ) : null}
    </div>
  );
}
