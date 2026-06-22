import { useEffect, useRef, useState } from "react";
import { Timer, Pause, Play, Square, X, Check, Sparkles } from "lucide-react";
import { Btn } from "./ui";
import { fireConfetti } from "../lib/confetti";
import { earnedPoints, POINT_INTERVAL_MS, FOCUS_PRESETS, FOCUS_MAX_MIN, POINTS_PER_HOUR } from "../lib/focus";

const fmtClock = (ms) => {
  const s = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(s / 60), ss = s % 60;
  return `${m}:${String(ss).padStart(2, "0")}`;
};

export function FocusFab({ session, onOpen }) {
  const active = session && session.phase !== "done";
  const running = session && session.phase === "running";
  return (
    <button className={"focus-fab" + (active ? " active" : "") + (running ? " running" : "")} onClick={onOpen} aria-label="Focus session">
      {active ? (
        <span className="focus-fab-inner">
          <span className="focus-fab-time">{fmtClock(session.targetMs - session.focusedMs)}</span>
          <span className="focus-fab-pts">+{earnedPoints(session.focusedMs)} pts</span>
        </span>
      ) : <Timer size={24} />}
    </button>
  );
}

export function FocusOverlay({ open, onClose, engine }) {
  const { session, start, pause, resume, end, dismiss } = engine;
  const [custom, setCustom] = useState(60);
  const pts = session ? earnedPoints(session.focusedMs) : 0;
  const prevPts = useRef(pts);

  // A little burst each time a point lands, a bigger one when the session completes.
  useEffect(() => {
    if (!open) { prevPts.current = pts; return; }
    if (session && session.phase === "running" && pts > prevPts.current) {
      fireConfetti(window.innerWidth / 2, window.innerHeight * 0.4);
    }
    prevPts.current = pts;
  }, [pts, open]);
  useEffect(() => {
    if (open && session && session.phase === "done") fireConfetti(window.innerWidth / 2, window.innerHeight * 0.4);
  }, [session?.phase, open]);

  if (!open) return null;

  const phase = session?.phase;
  const target = session?.targetMs || 0;
  const focused = session?.focusedMs || 0;
  const progress = target ? Math.min(1, focused / target) : 0;
  const remaining = target - focused;
  const toNext = POINT_INTERVAL_MS - (focused % POINT_INTERVAL_MS);

  const size = 264, stroke = 14, r = (size - stroke) / 2, circ = 2 * Math.PI * r;

  return (
    <div className="focus-screen">
      <button className="focus-close" onClick={onClose} aria-label="Minimize"><X size={22} /></button>

      {!session && (
        <div className="focus-setup">
          <div className="focus-kicker"><Sparkles size={15} /> Focus</div>
          <h2 className="focus-h2">Lock in.</h2>
          <p className="focus-sub">Earn {POINTS_PER_HOUR} points for every hour of focused work. The timer only counts while this stays open and in front of you.</p>
          <div className="focus-presets">
            {FOCUS_PRESETS.map((m) => (
              <button key={m} className="focus-preset" onClick={() => start(m)}>
                <b>{m}</b><span>min</span><i>+{Math.floor((m / 60) * POINTS_PER_HOUR)} pts</i>
              </button>
            ))}
          </div>
          <div className="focus-custom">
            <span>Custom</span>
            <input type="number" min="1" max={FOCUS_MAX_MIN} value={custom}
              onChange={(e) => setCustom(Math.max(1, Math.min(FOCUS_MAX_MIN, parseInt(e.target.value) || 1)))} />
            <span>min</span>
            <Btn variant="primary" onClick={() => start(custom)}><Play size={15} /> Start</Btn>
          </div>
        </div>
      )}

      {session && phase !== "done" && (
        <div className="focus-live">
          <div className={"focus-ring-wrap" + (phase === "running" ? " is-running" : "")}>
            <svg width={size} height={size} className="focus-ring">
              <circle cx={size / 2} cy={size / 2} r={r} className="focus-ring-track" strokeWidth={stroke} fill="none" />
              <circle cx={size / 2} cy={size / 2} r={r} className="focus-ring-fill" strokeWidth={stroke} fill="none"
                strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - progress)}
                transform={`rotate(-90 ${size / 2} ${size / 2})`} />
            </svg>
            <div className="focus-center">
              <div className="focus-time">{fmtClock(remaining)}</div>
              <div className="focus-state">{phase === "paused" ? "Paused" : "left to focus"}</div>
            </div>
          </div>

          <div className="focus-pts-line">
            <span key={pts} className="focus-pts-big">+{pts}</span>
            <span className="focus-pts-lab">points earned</span>
          </div>
          <div className="focus-next">Next point in {fmtClock(toNext)}</div>

          <div className="focus-controls">
            {phase === "running"
              ? <Btn variant="ghost" onClick={pause}><Pause size={16} /> Pause</Btn>
              : <Btn variant="primary" onClick={resume}><Play size={16} /> Resume</Btn>}
            <Btn variant="ghost-danger" onClick={end}><Square size={16} /> End session</Btn>
          </div>
        </div>
      )}

      {session && phase === "done" && (
        <div className="focus-done">
          <div className="focus-done-check"><Check size={44} /></div>
          <h2 className="focus-h2">Nice work.</h2>
          <div className="focus-done-pts">+{earnedPoints(focused)} points banked</div>
          <p className="focus-sub">{Math.round(focused / 60000)} minutes of real focus. On the board now.</p>
          <div className="focus-controls">
            <Btn variant="ghost" onClick={() => { dismiss(); }}>Close</Btn>
            <Btn variant="primary" onClick={() => { dismiss(); }}>Done</Btn>
          </div>
        </div>
      )}
    </div>
  );
}
