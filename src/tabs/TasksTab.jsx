import { useState, useEffect } from "react";
import { Plus, Check, Trash2, GripVertical, CheckSquare, Users, Building2, Clock, Filter, Hand, Inbox, Play, Square, Timer, Lock, Repeat } from "lucide-react";
import { Card, Btn, IconBtn, Modal, Field, Segmented, Avatar, PageHead } from "../components/ui";
import { DraggableList } from "../components/DraggableList";
import { todayStr, dateDiff, prettyDate, parseDate, toDateStr, addDays } from "../lib/dates";
import { fireConfetti } from "../lib/confetti";
import { uid } from "../lib/format";
import { TASK_IMPORTANCE } from "../lib/constants";

const fmtElapsed = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${ss}s`;
  return `${ss}s`;
};
const isPriv = (t) => !!(t.isPrivate || t.private);
const REPEAT_LABEL = { daily: "Daily", weekly: "Weekly", monthly: "Monthly" };
const advanceDate = (dateStr, repeat) => {
  const base = parseDate(dateStr || todayStr());
  if (repeat === "daily") base.setDate(base.getDate() + 1);
  else if (repeat === "weekly") base.setDate(base.getDate() + 7);
  else if (repeat === "monthly") base.setMonth(base.getMonth() + 1);
  return toDateStr(base);
};

export function TasksTab({ users, me, tasks, setTasks, clients, board: propBoard, setBoard, onWorkStart, onWorkEnd }) {
  const board = propBoard || "pool"; // unclaimed tasks are the default view
  const [filter, setFilter] = useState("active");
  const [taskModal, setTaskModal] = useState(null); // null | "new" | task
  const [poolModal, setPoolModal] = useState(null); // null | "new" | task
  const [, setTick] = useState(0);
  const isPool = board === "pool";
  const boardUser = users.find((u) => u.id === board);
  const isMyBoard = board === me.id;

  // Tick once a second while something is being worked on, so elapsed time stays live.
  const anyWorking = tasks.some((t) => t.working && t.working[board] != null);
  useEffect(() => {
    if (!anyWorking) return;
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [anyWorking]);

  const visible = tasks
    .filter((t) => !t.pool && (t.assignees || []).includes(board))
    .filter((t) => {
      const done = !!(t.completed || {})[board];
      return filter === "all" ? true : filter === "done" ? done : !done;
    })
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const pool = tasks.filter((t) => t.pool).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const completeTask = (task, e) => {
    const done = !!(task.completed || {})[board];
    const comp = { ...(task.completed || {}) };
    const work = { ...(task.working || {}) };
    let logSecs = 0;
    if (done) { delete comp[board]; }
    else {
      comp[board] = todayStr();
      if (work[board] != null) { logSecs = Math.round((Date.now() - work[board]) / 1000); delete work[board]; }
    }
    let spawnedNext = task.spawnedNext;
    let nextInstance = null;
    if (!done && task.repeat && !task.spawnedNext) {
      spawnedNext = true;
      nextInstance = { ...task, id: uid(), completed: {}, working: {}, spawnedNext: false, createdDate: todayStr(), dueDate: advanceDate(task.dueDate, task.repeat), order: tasks.length + 1 };
    }
    let next = tasks.map((t) => t.id === task.id ? { ...t, completed: comp, working: work, spawnedNext } : t);
    if (nextInstance) next = [...next, nextInstance];
    setTasks(next);
    if (!done) { const r = e?.currentTarget?.getBoundingClientRect(); fireConfetti(r ? r.left + r.width / 2 : undefined, r ? r.top : undefined); }
    if (logSecs > 0 && onWorkEnd) onWorkEnd({ userId: board, taskId: task.id, seconds: logSecs });
  };

  const claim = (task, e) => {
    setTasks(tasks.map((t) => t.id === task.id
      ? { ...t, pool: false, assignees: [me.id], claimedBy: me.id, claimedDate: todayStr(), order: tasks.length }
      : t));
    const r = e?.currentTarget?.getBoundingClientRect();
    fireConfetti(r ? r.left + r.width / 2 : undefined, r ? r.top : undefined);
  };

  // Pick the one task you are working on right now. Starting one stops any other.
  const startWorking = (task) => {
    const now = Date.now();
    const prev = tasks.find((t) => t.id !== task.id && t.working && t.working[me.id] != null);
    if (prev) { const secs = Math.round((now - prev.working[me.id]) / 1000); if (secs > 0 && onWorkEnd) onWorkEnd({ userId: me.id, taskId: prev.id, seconds: secs }); }
    setTasks(tasks.map((t) => {
      if (t.id === task.id) return { ...t, working: { ...(t.working || {}), [me.id]: now } };
      if (t.working && t.working[me.id] != null) { const w = { ...t.working }; delete w[me.id]; return { ...t, working: w }; }
      return t;
    }));
    if (onWorkStart) onWorkStart();
  };
  const stopWorking = (task) => {
    const start = task.working && task.working[me.id];
    if (start != null) { const secs = Math.round((Date.now() - start) / 1000); if (secs > 0 && onWorkEnd) onWorkEnd({ userId: me.id, taskId: task.id, seconds: secs }); }
    setTasks(tasks.map((t) => {
      if (t.id !== task.id) return t;
      const w = { ...(t.working || {}) }; delete w[me.id];
      return { ...t, working: w };
    }));
  };

  const saveTask = (data) => {
    if (data.id) setTasks(tasks.map((t) => t.id === data.id ? { ...t, ...data } : t));
    else setTasks([...tasks, { id: uid(), creatorId: me.id, createdDate: todayStr(), completed: {}, order: tasks.length, ...data }]);
    setTaskModal(null);
  };
  const savePool = (data) => {
    if (data.id) setTasks(tasks.map((t) => t.id === data.id ? { ...t, ...data } : t));
    else setTasks([...tasks, { id: uid(), creatorId: me.id, createdDate: todayStr(), completed: {}, order: tasks.length, pool: true, assignees: [], ...data }]);
    setPoolModal(null);
  };
  const removeTask = (id) => { setTasks(tasks.filter((t) => t.id !== id)); setTaskModal(null); setPoolModal(null); };
  const reorder = (newList) => {
    const map = {}; newList.forEach((t, i) => map[t.id] = i);
    setTasks(tasks.map((t) => t.id in map ? { ...t, order: map[t.id] } : t));
  };

  const options = [
    ...users.map((u) => ({ value: u.id, label: u.id === me.id ? "My board" : u.name })),
    { value: "pool", label: "Unclaimed" },
  ];

  return (
    <div className="page">
      <PageHead title="Tasks" subtitle="Assign work, earn points, settle the score.">
        <Btn onClick={() => isPool ? setPoolModal("new") : setTaskModal("new")}><Plus size={16} /> Add task</Btn>
      </PageHead>

      <Segmented value={board} onChange={setBoard} options={options} />

      {isPool ? (
        <>
          <p className="pool-intro"><Inbox size={14} /> Unclaimed tasks anyone can pick up. Claim one when you start it, and it moves onto your board.</p>
          {pool.length === 0 && <Card className="empty"><Inbox size={26} /><div>No unclaimed tasks. Add one for either of you to grab.</div></Card>}
          {pool.map((t) => {
            const imp = TASK_IMPORTANCE[t.importance] || TASK_IMPORTANCE.medium;
            const client = clients.find((c) => c.id === t.clientId);
            const creator = users.find((u) => u.id === t.creatorId);
            const dueSoon = t.dueDate && dateDiff(t.dueDate, todayStr()) <= 1;
            return (
              <Card key={t.id} className="pool-card">
                <div className="task-main" onClick={() => setPoolModal(t)}>
                  <div className="task-title">{t.title}</div>
                  {t.notes && <div className="pool-notes">{t.notes}</div>}
                  <div className="task-meta">
                    <span className="chip" style={{ color: imp.color, borderColor: imp.color + "55" }}>{imp.label} +{imp.points}</span>
                    {client && <span className="chip"><Building2 size={11} /> {client.name}</span>}
                    {t.dueDate && <span className={"chip " + (dueSoon ? "warn" : "")}><Clock size={11} /> {prettyDate(t.dueDate)}</span>}
                  </div>
                  {creator && <div className="added-by">Added by {creator.name}</div>}
                </div>
                <Btn variant="primary" className="claim-btn" onClick={(e) => claim(t, e)}><Hand size={15} /> Claim</Btn>
              </Card>
            );
          })}
        </>
      ) : (
        <>
          <div className="filter-row">
            <Filter size={14} />
            {["active", "done", "all"].map((f) => (
              <button key={f} className={"text-pill " + (filter === f ? "on" : "")} onClick={() => setFilter(f)}>{f[0].toUpperCase() + f.slice(1)}</button>
            ))}
          </div>

          {visible.length === 0 && <Card className="empty"><CheckSquare size={26} /><div>Nothing here. {filter === "done" ? "No tasks completed yet." : "Add a task to get going."}</div></Card>}

          <DraggableList items={visible.filter((t) => !(isPriv(t) && t.creatorId !== me.id))} getKey={(t) => t.id} onReorder={reorder} renderItem={(t, ctx) => {
            const done = !!(t.completed || {})[board];
            const imp = TASK_IMPORTANCE[t.importance] || TASK_IMPORTANCE.medium;
            const client = clients.find((c) => c.id === t.clientId);
            const creator = users.find((u) => u.id === t.creatorId);
            const both = (t.assignees || []).length > 1;
            const dueSoon = t.dueDate && !done && dateDiff(t.dueDate, todayStr()) <= 1;
            const workingStart = t.working && t.working[board];
            return (
              <Card className={"task-card " + (done ? "task-done " : "") + (workingStart ? "task-working" : "")}>
                <button className="drag-handle" {...ctx.handle}><GripVertical size={18} /></button>
                <button className={"task-check " + (done ? "on" : "")} onClick={(e) => completeTask(t, e)} style={done && boardUser ? { background: boardUser.color, borderColor: boardUser.color } : {}}>
                  {done && <Check size={16} />}
                </button>
                <div className="task-main" onClick={() => setTaskModal(t)}>
                  <div className="task-title">{t.title}</div>
                  <div className="task-meta">
                    <span className="chip" style={{ color: imp.color, borderColor: imp.color + "55" }}>{imp.label}{isPriv(t) ? "" : ` +${imp.points}`}</span>
                    {isPriv(t) && <span className="chip private-chip"><Lock size={11} /> Private</span>}
                    {t.repeat && <span className="chip"><Repeat size={11} /> {REPEAT_LABEL[t.repeat]}</span>}
                    {client && <span className="chip"><Building2 size={11} /> {client.name}</span>}
                    {both && <span className="chip"><Users size={11} /> Both</span>}
                    {t.dueDate && <span className={"chip " + (dueSoon ? "warn" : "")}><Clock size={11} /> {prettyDate(t.dueDate)}</span>}
                  </div>
                  {t.creatorId !== board && creator && <div className="added-by">Added by {creator.name}</div>}
                </div>
                {!done && (
                  <div className="work-ctrl">
                    {workingStart ? (
                      <>
                        <span className="work-time" title="Time on this task"><Timer size={13} /> {fmtElapsed(Date.now() - workingStart)}</span>
                        {isMyBoard && <IconBtn className="work-stop" onClick={() => stopWorking(t)} title="Stop"><Square size={15} /></IconBtn>}
                      </>
                    ) : (isMyBoard && (
                      <button className="work-start" onClick={() => startWorking(t)} title="Start working on this"><Play size={15} /></button>
                    ))}
                  </div>
                )}
              </Card>
            );
          }} />

          {visible.filter((t) => isPriv(t) && t.creatorId !== me.id).map((t) => {
            const done = !!(t.completed || {})[board];
            return (
              <Card key={t.id} className="task-card censored">
                <span className="priv-lock"><Lock size={16} /></span>
                <div className="censored-name"><span className="blurred">Private task</span></div>
                <div className="censored-stats">
                  <span className={"dot " + (done ? "dot-on" : "")} style={done && boardUser ? { background: boardUser.color } : {}} title={done ? "Done" : "Not done"} />
                </div>
              </Card>
            );
          })}
        </>
      )}

      <TaskModal open={taskModal !== null} task={taskModal === "new" ? null : taskModal} users={users} me={me} clients={clients}
        onClose={() => setTaskModal(null)} onSave={saveTask} onDelete={removeTask} />
      <PoolModal open={poolModal !== null} task={poolModal === "new" ? null : poolModal} clients={clients}
        onClose={() => setPoolModal(null)} onSave={savePool} onDelete={removeTask} />
    </div>
  );
}

function ImportancePills({ importance, setImportance }) {
  return (
    <>
      <span className="field-label">Importance (sets points)</span>
      <div className="seg-pills">
        {Object.entries(TASK_IMPORTANCE).map(([k, v]) => (
          <button key={k} className={"pill " + (importance === k ? "pill-on" : "")} onClick={() => setImportance(k)} style={importance === k ? { borderColor: v.color, color: v.color } : {}}>
            {v.label} <b>+{v.points}</b>
          </button>
        ))}
      </div>
    </>
  );
}

function TaskModal({ open, task, users, me, clients, onClose, onSave, onDelete }) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [assignees, setAssignees] = useState([me.id]);
  const [clientId, setClientId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [importance, setImportance] = useState("medium");
  const [priv, setPriv] = useState(false);
  const [repeat, setRepeat] = useState("none");
  useEffect(() => {
    if (open) {
      setTitle(task?.title || ""); setNotes(task?.notes || "");
      setAssignees(task?.assignees || [me.id]); setClientId(task?.clientId || "");
      setDueDate(task?.dueDate || ""); setImportance(task?.importance || "medium");
      setPriv(!!(task?.isPrivate || task?.private));
      setRepeat(task?.repeat || "none");
    }
  }, [open, task]);
  const toggleAssignee = (id) => setAssignees((a) => a.includes(id) ? (a.length > 1 ? a.filter((x) => x !== id) : a) : [...a, id]);
  return (
    <Modal open={open} onClose={onClose} title={task ? "Edit task" : "New task"}>
      <Field label="Task"><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs doing?" autoFocus /></Field>
      <Field label="Notes (optional)"><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Details, links, context" /></Field>
      <div className="toggle-row">
        <span><Lock size={14} style={{ verticalAlign: "-2px", marginRight: 6 }} />Private, only you can see it</span>
        <button className={"toggle " + (priv ? "toggle-on" : "")} onClick={() => setPriv(!priv)} aria-label="Toggle private"><span className="toggle-knob" /></button>
      </div>
      {!priv && (
        <>
          <span className="field-label">Assign to</span>
          <div className="seg-pills">
            {users.map((u) => (
              <button key={u.id} className={"pill " + (assignees.includes(u.id) ? "pill-on" : "")} onClick={() => toggleAssignee(u.id)}>
                <Avatar user={u} size={18} /> {u.name}
              </button>
            ))}
            <button className={"pill " + (assignees.length === users.length ? "pill-on" : "")} onClick={() => setAssignees(users.map((u) => u.id))}>
              <Users size={14} /> Both
            </button>
          </div>
        </>
      )}
      <div className="grid-2">
        <Field label="Client (optional)">
          <select value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">None / general</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Due date"><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></Field>
      </div>
      <ImportancePills importance={importance} setImportance={setImportance} />
      <span className="field-label">Repeats</span>
      <div className="seg-pills">
        {[["none", "Never"], ["daily", "Daily"], ["weekly", "Weekly"], ["monthly", "Monthly"]].map(([k, lbl]) => (
          <button key={k} className={"pill " + (repeat === k ? "pill-on" : "")} onClick={() => setRepeat(k)}>{lbl}</button>
        ))}
      </div>
      {repeat !== "none" && <p className="muted-small" style={{ marginTop: 6 }}>When you finish it, the next one is created automatically{dueDate ? ", with the due date moved forward" : ""}.</p>}
      <div className="modal-actions">
        {task && <Btn variant="ghost-danger" onClick={() => onDelete(task.id)}><Trash2 size={16} /> Delete</Btn>}
        <Btn onClick={() => title.trim() && onSave({ ...(task || {}), title: title.trim(), notes, assignees: priv ? [me.id] : assignees, clientId: clientId || null, dueDate: dueDate || null, importance, isPrivate: priv, repeat: repeat === "none" ? null : repeat })}>Save</Btn>
      </div>
    </Modal>
  );
}

function PoolModal({ open, task, clients, onClose, onSave, onDelete }) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [clientId, setClientId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [importance, setImportance] = useState("medium");
  useEffect(() => {
    if (open) {
      setTitle(task?.title || ""); setNotes(task?.notes || "");
      setClientId(task?.clientId || ""); setDueDate(task?.dueDate || "");
      setImportance(task?.importance || "medium");
    }
  }, [open, task]);
  return (
    <Modal open={open} onClose={onClose} title={task ? "Edit unclaimed task" : "New unclaimed task"}>
      <Field label="Task"><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs doing?" autoFocus /></Field>
      <Field label="Notes (optional)"><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Details, links, context" /></Field>
      <div className="grid-2">
        <Field label="Client (optional)">
          <select value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">None / general</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Due date (optional)"><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></Field>
      </div>
      <ImportancePills importance={importance} setImportance={setImportance} />
      <div className="modal-actions">
        {task && <Btn variant="ghost-danger" onClick={() => onDelete(task.id)}><Trash2 size={16} /> Delete</Btn>}
        <Btn onClick={() => title.trim() && onSave({ ...(task || {}), title: title.trim(), notes, clientId: clientId || null, dueDate: dueDate || null, importance })}>Save</Btn>
      </div>
    </Modal>
  );
}
