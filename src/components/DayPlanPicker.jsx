import { useState, useEffect, useMemo } from "react";
import { Check, Swords } from "lucide-react";
import { Modal, Btn } from "./ui";
import { isPrivateTask } from "../lib/work";
import { prettyDate, todayStr, addDays, dateDiff } from "../lib/dates";

// A day plan is a note plus the tasks that person committed to. Plans written
// before tasks existed were a bare string, so those read back as a note with
// nothing picked.
export function planOf(plans, date, userId) {
  const raw = plans && plans[date] && plans[date][userId];
  if (!raw) return { note: "", tasks: [] };
  if (typeof raw === "string") return { note: raw, tasks: [] };
  return { note: raw.note || "", tasks: Array.isArray(raw.tasks) ? raw.tasks : [] };
}

export const planIsEmpty = (p) => !p.note && !p.tasks.length;

// Returns a new plans object. Days older than 60 are dropped on the way through
// so this can never grow without bound.
export function writePlan(plans, date, userId, { note, tasks }) {
  const next = { ...(plans || {}) };
  const day = { ...(next[date] || {}) };
  const n = (note || "").trim();
  const t = (tasks || []).filter(Boolean);
  if (n || t.length) day[userId] = { note: n, tasks: t }; else delete day[userId];
  if (Object.keys(day).length) next[date] = day; else delete next[date];
  const cutoff = addDays(todayStr(), -60);
  Object.keys(next).forEach((d) => { if (d < cutoff) delete next[d]; });
  return next;
}

// The tasks a person can commit to: their own open ones, plus anything sitting
// in the pool. Sub-tasks and anything already done are left out.
export function pickableTasks(tasks, userId) {
  const list = (tasks || []).filter((t) => t && !t.parentId);
  return {
    mine: list.filter((t) => !t.pool && (t.assignees || []).includes(userId) && !(t.completed || {})[userId]),
    pool: list.filter((t) => t.pool && !isPrivateTask(t)),
  };
}

function TaskRow({ task, on, onToggle, pool }) {
  const due = task.dueDate ? dateDiff(task.dueDate, todayStr()) : null;
  return (
    <button type="button" className={"pick-row" + (on ? " on" : "")} onClick={() => onToggle(task.id)} aria-pressed={on}>
      <span className="pick-box">{on && <Check size={13} />}</span>
      <span className="pick-title">{task.title || "Untitled task"}</span>
      {pool && <span className="pick-tag"><Swords size={11} /> up for grabs</span>}
      {due != null && due <= 1 && (
        <span className={"pick-due" + (due < 0 ? " late" : "")}>{due < 0 ? "overdue" : due === 0 ? "due today" : "due tomorrow"}</span>
      )}
    </button>
  );
}

// Used twice: as the morning prompt, and from a day panel to plan any day.
export function TaskPickModal({ open, date, tasks = [], me, selected = [], onSave, onClose, morning }) {
  const [picked, setPicked] = useState([]);
  // Deliberately keyed on open/date only: re-syncing on every `selected`
  // identity change would wipe ticks while the person is still choosing.
  useEffect(() => { if (open) setPicked(selected || []); }, [open, date]);

  const { mine, pool } = useMemo(() => pickableTasks(tasks, me.id), [tasks, me.id]);
  const toggle = (id) => setPicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  if (!open) return null;

  const nothing = mine.length === 0 && pool.length === 0;
  return (
    <Modal open onClose={morning ? undefined : onClose} locked={!!morning}
      title={morning ? "What are you doing today?" : `Plan for ${prettyDate(date)}`}>
      <p className="muted-small" style={{ marginBottom: 14 }}>
        {nothing
          ? "Nothing on your board to pick from yet. Add a task and this fills up."
          : "Tick what you are taking on. Nothing is claimed or moved, this is just the plan."}
      </p>

      {mine.length > 0 && (
        <>
          <div className="pick-group">Your tasks</div>
          <div className="pick-list">
            {mine.map((t) => <TaskRow key={t.id} task={t} on={picked.includes(t.id)} onToggle={toggle} />)}
          </div>
        </>
      )}

      {pool.length > 0 && (
        <>
          <div className="pick-group">Up for grabs</div>
          <div className="pick-list">
            {pool.map((t) => <TaskRow key={t.id} task={t} on={picked.includes(t.id)} onToggle={toggle} pool />)}
          </div>
        </>
      )}

      <div className="modal-actions">
        {morning
          ? <Btn variant="ghost" onClick={() => onSave([])}>Not today</Btn>
          : <Btn variant="ghost" onClick={onClose}>Cancel</Btn>}
        <Btn onClick={() => onSave(picked)}>
          <Check size={16} /> {picked.length ? `Save ${picked.length}` : "Save"}
        </Btn>
      </div>
    </Modal>
  );
}
