import { useState, useEffect, useMemo } from "react";
import { Timer, Lock, SlidersHorizontal, RotateCcw } from "lucide-react";
import { Modal, Field, Btn, NumStep } from "./ui";
import { elapsedSecs, isPrivateTask, fmtHm } from "../lib/work";

const QUICK_CUTS = [5, 15, 30, 60]; // minutes to shave off, in one tap

export function StopModal({ open, task, me, onClose, onPost, onSkip }) {
  const [note, setNote] = useState("");
  const [markDone, setMarkDone] = useState(false);
  const [adjusting, setAdjusting] = useState(false);
  const [secs, setSecs] = useState(0);

  // Freeze the measured time the moment the popup opens. That is the ceiling:
  // you can log less than you actually sat there, never more.
  const measured = useMemo(() => (open && task ? elapsedSecs(task, me.id) : 0), [open, task && task.id]);

  useEffect(() => {
    if (!open) return;
    setNote(""); setMarkDone(false); setAdjusting(false); setSecs(measured);
  }, [open, task && task.id, measured]);

  const priv = isPrivateTask(task);
  const clamp = (s) => Math.max(0, Math.min(measured, Math.round(s)));
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const setHm = (hh, mm) => setSecs(clamp(hh * 3600 + mm * 60));
  const trimmed = measured - secs;

  const finish = (post) => {
    const payload = { note, markDone, seconds: secs };
    if (post) onPost(payload); else onSkip(payload);
  };

  return (
    <Modal open={open} onClose={onClose} title="Stop working">
      {task && (
        <>
          <p className="stop-task"><Timer size={14} /> {task.title}</p>

          <div className="stop-time">
            <div className="stop-time-head">
              <div>
                <div className="stop-time-val">{fmtHm(secs)}</div>
                <div className="stop-time-lab">
                  {trimmed > 0 ? <>logged · {fmtHm(measured)} tracked, {fmtHm(trimmed)} trimmed</> : "time to log"}
                </div>
              </div>
              <button type="button" className={"stop-adjust-btn " + (adjusting ? "on" : "")} onClick={() => setAdjusting((v) => !v)}>
                <SlidersHorizontal size={14} /> Adjust
              </button>
            </div>

            {adjusting && (
              <div className="stop-adjust">
                <div className="stop-hm">
                  <NumStep value={h} min={0} max={Math.floor(measured / 3600)} suffix="h" onChange={(v) => setHm(v === "" ? 0 : v, m)} />
                  <NumStep value={m} min={0} max={59} step={5} suffix="m" onChange={(v) => setHm(h, v === "" ? 0 : v)} />
                  {trimmed > 0 && (
                    <button type="button" className="stop-reset" onClick={() => setSecs(measured)} title="Back to tracked time">
                      <RotateCcw size={13} /> Reset
                    </button>
                  )}
                </div>
                <div className="stop-cuts">
                  {QUICK_CUTS.filter((c) => c * 60 <= measured).map((c) => (
                    <button type="button" key={c} className="stop-cut" onClick={() => setSecs((s) => clamp(s - c * 60))}>
                      −{c < 60 ? `${c}m` : `${c / 60}h`}
                    </button>
                  ))}
                  <button type="button" className="stop-cut" onClick={() => setSecs(0)}>Clear</button>
                </div>
                <p className="stop-hint">Forgot to stop the timer? Trim it down. You can only go below the {fmtHm(measured)} tracked, never above.</p>
              </div>
            )}
          </div>

          {priv ? (
            <p className="stop-private"><Lock size={14} /> Private task. Nothing is posted to Updates.</p>
          ) : (
            <Field label="What did you get done?">
              <textarea autoFocus value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="A quick note so the other knows the progress" />
            </Field>
          )}

          <label className="stop-done"><input type="checkbox" checked={markDone} onChange={(e) => setMarkDone(e.target.checked)} /> Mark this task complete</label>

          <div className="modal-actions">
            {priv ? (
              <Btn onClick={() => finish(false)}>Stop and save</Btn>
            ) : (
              <>
                <Btn variant="ghost" onClick={() => finish(false)}>Skip</Btn>
                <Btn onClick={() => finish(true)}>Post update</Btn>
              </>
            )}
          </div>
        </>
      )}
    </Modal>
  );
}
