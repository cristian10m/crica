import { useState, useEffect } from "react";
import { Timer } from "lucide-react";
import { Modal, Field, Btn } from "./ui";

const fmtElapsed = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
};

export function StopModal({ open, task, me, onClose, onPost, onSkip }) {
  const [note, setNote] = useState("");
  const [markDone, setMarkDone] = useState(false);
  useEffect(() => { if (open) { setNote(""); setMarkDone(false); } }, [open, task && task.id]);
  const start = task && task.working ? task.working[me.id] : null;
  const elapsed = start != null ? fmtElapsed(Date.now() - start) : "";
  return (
    <Modal open={open} onClose={onClose} title="Stop working">
      {task && (
        <>
          <p className="stop-task"><Timer size={14} /> {task.title}{elapsed ? ` · ${elapsed}` : ""}</p>
          <Field label="What did you get done?"><textarea autoFocus value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="A quick note so the other knows the progress" /></Field>
          <label className="stop-done"><input type="checkbox" checked={markDone} onChange={(e) => setMarkDone(e.target.checked)} /> Mark this task complete</label>
          <div className="modal-actions">
            <Btn variant="ghost" onClick={onSkip}>Skip</Btn>
            <Btn onClick={() => onPost(note, markDone)}>Post update</Btn>
          </div>
        </>
      )}
    </Modal>
  );
}
