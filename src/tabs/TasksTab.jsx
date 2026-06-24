import { useState, useEffect } from "react";
import { Plus, Check, Trash2, GripVertical, CheckSquare, Users, Building2, Clock, Filter, Hand, Inbox, Play, Square, Timer, Lock, Repeat, ChevronDown, ChevronRight, CornerDownRight, Search, X } from "lucide-react";
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
const IMPORTANCE_RANK = { urgent: 0, high: 1, medium: 2, low: 3 };
const rankOf = (t) => IMPORTANCE_RANK[t.importance] ?? 2;
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
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState(() => new Set());
  const [addingSub, setAddingSub] = useState(null); // parentId currently adding a subtask to
  const [subText, setSubText] = useState("");
  const [editingSub, setEditingSub] = useState(null); // subtask id being renamed
  const [editText, setEditText] = useState("");
  const [, setTick] = useState(0);
  const isPool = board === "pool";
  const boardUser = users.find((u) => u.id === board);
  const isMyBoard = board === me.id;
  const q = query.trim().toLowerCase();

  // Tick once a second while something is being worked on, so elapsed time stays live.
  const anyWorking = tasks.some((t) => t.working && t.working[board] != null);
  useEffect(() => {
    if (!anyWorking) return;
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [anyWorking]);

  const subtasksOf = (id) => tasks.filter((t) => t.parentId === id).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const matchesQuery = (t) => {
    if (!q) return true;
    if ((t.title || "").toLowerCase().includes(q) || (t.notes || "").toLowerCase().includes(q)) return true;
    return subtasksOf(t.id).some((s) => (s.title || "").toLowerCase().includes(q));
  };

  // Top-level tasks only, grouped by urgency (urgent first), newest at the top of each group.
  const visible = tasks
    .filter((t) => !t.pool && !t.parentId && (t.assignees || []).includes(board))
    .filter((t) => {
      const done = !!(t.completed || {})[board];
      return filter === "all" ? true : filter === "done" ? done : !done;
    })
    .filter(matchesQuery)
    .sort((a, b) => rankOf(a) - rankOf(b) || (a.order ?? 0) - (b.order ?? 0));

  const pool = tasks.filter((t) => t.pool && matchesQuery(t)).sort((a, b) => rankOf(a) - rankOf(b) || (a.order ?? 0) - (b.order ?? 0));

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

  const topOrder = () => tasks.reduce((m, t) => Math.min(m, t.order ?? 0), 0) - 1;
  const saveTask = (data) => {
    if (data.id) setTasks(tasks.map((t) => t.id === data.id ? { ...t, ...data } : t));
    else setTasks([...tasks, { id: uid(), creatorId: me.id, createdDate: todayStr(), completed: {}, order: topOrder(), ...data }]);
    setTaskModal(null);
  };
  const savePool = (data) => {
    if (data.id) setTasks(tasks.map((t) => t.id === data.id ? { ...t, ...data } : t));
    else setTasks([...tasks, { id: uid(), creatorId: me.id, createdDate: todayStr(), completed: {}, order: topOrder(), pool: true, assignees: [], ...data }]);
    setPoolModal(null);
  };
  const removeTask = (id) => { setTasks(tasks.filter((t) => t.id !== id && t.parentId !== id)); setTaskModal(null); setPoolModal(null); };

  // Subtasks: a small checklist under a parent. No points, inherit the parent's board.
  const addSubtask = (parent, title) => {
    const t = title.trim(); if (!t) return;
    setTasks([...tasks, { id: uid(), parentId: parent.id, creatorId: me.id, createdDate: todayStr(), completed: {}, assignees: parent.assignees || [board], importance: "low", order: Date.now(), title: t }]);
  };
  const toggleSub = (sub) => {
    const comp = { ...(sub.completed || {}) };
    if (comp[board]) delete comp[board]; else comp[board] = todayStr();
    setTasks(tasks.map((t) => t.id === sub.id ? { ...t, completed: comp } : t));
  };
  const removeSub = (id) => setTasks(tasks.filter((t) => t.id !== id));
  const renameSub = (id, title) => { const v = title.trim(); if (v) setTasks(tasks.map((t) => t.id === id ? { ...t, title: v } : t)); setEditingSub(null); };
  const reorderSubs = (newList) => { const map = {}; newList.forEach((s, i) => { map[s.id] = i; }); setTasks(tasks.map((t) => t.id in map ? { ...t, order: map[t.id] } : t)); };
  const toggleCollapse = (id) => setCollapsed((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const submitSub = (parent) => { if (!subText.trim()) return; addSubtask(parent, subText); setSubText(""); };
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

      <div className="search-bar">
        <Search size={15} />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search tasks and subtasks" />
        {query && <button className="search-clear" onClick={() => setQuery("")} aria-label="Clear"><X size={15} /></button>}
      </div>


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

          {visible.length === 0 && <Card className="empty"><CheckSquare size={26} /><div>{q ? "No tasks match your search." : filter === "done" ? "No tasks completed yet." : "Nothing here. Add a task to get going."}</div></Card>}

          <DraggableList items={visible.filter((t) => !(isPriv(t) && t.creatorId !== me.id))} getKey={(t) => t.id} onReorder={reorder} renderItem={(t, ctx) => {
            const done = !!(t.completed || {})[board];
            const imp = TASK_IMPORTANCE[t.importance] || TASK_IMPORTANCE.medium;
            const client = clients.find((c) => c.id === t.clientId);
            const creator = users.find((u) => u.id === t.creatorId);
            const both = (t.assignees || []).length > 1;
            const dueSoon = t.dueDate && !done && dateDiff(t.dueDate, todayStr()) <= 1;
            const workingStart = t.working && t.working[board];
            const subs = subtasksOf(t.id);
            const subDone = subs.filter((s) => (s.completed || {})[board]).length;
            const isCollapsed = collapsed.has(t.id);
            const showKids = !done && (addingSub === t.id || (subs.length > 0 && (!isCollapsed || q.length > 0)));
            return (
              <Card className={"task-card " + (done ? "task-done " : "") + (workingStart ? "task-working" : "")}>
                <div className="task-row">
                  <button className="drag-handle" {...ctx.handle}><GripVertical size={18} /></button>
                  <button className={"task-check " + (done ? "on" : "")} onClick={(e) => completeTask(t, e)} style={done && boardUser ? { background: boardUser.color, borderColor: boardUser.color } : {}}>
                    {done && <Check size={16} />}
                  </button>
                  <div className="task-main" onClick={() => setTaskModal(t)}>
                    <div className="task-title">{t.title}</div>
                    <div className="task-meta">
                      <span className="chip" style={{ color: imp.color, borderColor: imp.color + "55" }}>{imp.label}{isPriv(t) ? "" : ` +${imp.points}`}</span>
                      {subs.length > 0 ? (
                        <button className="subtask-toggle" onClick={(e) => { e.stopPropagation(); toggleCollapse(t.id); }}>
                          {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />} {subDone}/{subs.length}
                        </button>
                      ) : (!done && (
                        <button className="subtask-add-chip" onClick={(e) => { e.stopPropagation(); setAddingSub(t.id); setSubText(""); }}><Plus size={12} /> Subtask</button>
                      ))}
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
                </div>

                {showKids && (
                  <div className="subtasks">
                    <DraggableList items={subs} getKey={(s) => s.id} onReorder={reorderSubs} renderItem={(s, sctx) => {
                      const sd = !!(s.completed || {})[board];
                      const editing = editingSub === s.id;
                      return (
                        <div className={"subtask-item " + (sd ? "done" : "")}>
                          <button {...sctx.handle} className="sub-handle"><GripVertical size={14} /></button>
                          <button className={"subtask-check " + (sd ? "on" : "")} onClick={() => toggleSub(s)} style={sd && boardUser ? { background: boardUser.color, borderColor: boardUser.color } : {}}>{sd && <Check size={13} />}</button>
                          {editing ? (
                            <input autoFocus className="subtask-input" value={editText} onChange={(e) => setEditText(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter") renameSub(s.id, editText); if (e.key === "Escape") setEditingSub(null); }}
                              onBlur={() => renameSub(s.id, editText)} />
                          ) : (
                            <span className="subtask-title" onClick={() => { setEditingSub(s.id); setEditText(s.title); }} title="Tap to edit">{s.title}</span>
                          )}
                          <button className="subtask-del" onClick={() => removeSub(s.id)} aria-label="Delete subtask"><X size={14} /></button>
                        </div>
                      );
                    }} />
                    {addingSub === t.id ? (
                      <div className="subtask-item subtask-adding">
                        <span className="subtask-check ghost"><CornerDownRight size={13} /></span>
                        <input autoFocus className="subtask-input" value={subText} onChange={(e) => setSubText(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") submitSub(t); if (e.key === "Escape") { setAddingSub(null); setSubText(""); } }}
                          onBlur={() => { if (!subText.trim()) setAddingSub(null); }} placeholder="Add a step, press Enter" />
                      </div>
                    ) : (
                      <button className="subtask-add" onClick={() => { setAddingSub(t.id); setSubText(""); }}><Plus size={13} /> Add subtask</button>
                    )}
                  </div>
                )}
              </Card>
            );
          }} />

          {visible.filter((t) => isPriv(t) && t.creatorId !== me.id).map((t) => {
            const done = !!(t.completed || {})[board];
            return (
              <Card key={t.id} className="task-private-row censored">
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

      <TaskModal open={taskModal !== null} task={taskModal === "new" ? null : taskModal} users={users} me={me} clients={clients} tasks={tasks} board={board}
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

function TaskModal({ open, task, users, me, clients, tasks = [], board, onClose, onSave, onDelete }) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [assignees, setAssignees] = useState([me.id]);
  const [clientId, setClientId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [importance, setImportance] = useState("medium");
  const [priv, setPriv] = useState(false);
  const [repeat, setRepeat] = useState("none");
  const [parentId, setParentId] = useState("");
  useEffect(() => {
    if (open) {
      setTitle(task?.title || ""); setNotes(task?.notes || "");
      setAssignees(task?.assignees || [me.id]); setClientId(task?.clientId || "");
      setDueDate(task?.dueDate || ""); setImportance(task?.importance || "medium");
      setPriv(!!(task?.isPrivate || task?.private));
      setRepeat(task?.repeat || "none");
      setParentId(task?.parentId || "");
    }
  }, [open, task]);
  const hasChildren = task && tasks.some((x) => x.parentId === task.id);
  const parentChoices = tasks.filter((x) => !x.parentId && !x.pool && (x.assignees || []).includes(board) && x.id !== task?.id && !x.isPrivate && !x.private);
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
      {!priv && !hasChildren && parentChoices.length > 0 && (
        <Field label="Part of (turn it into a subtask)">
          <select value={parentId} onChange={(e) => setParentId(e.target.value)}>
            <option value="">Nothing, it is its own task</option>
            {parentChoices.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </Field>
      )}
      {parentId && <p className="muted-small" style={{ marginTop: 6 }}>As a subtask it earns no points on its own. The points come from finishing the task it belongs to.</p>}
      <div className="modal-actions">
        {task && <Btn variant="ghost-danger" onClick={() => onDelete(task.id)}><Trash2 size={16} /> Delete</Btn>}
        <Btn onClick={() => title.trim() && onSave({ ...(task || {}), title: title.trim(), notes, assignees: priv ? [me.id] : assignees, clientId: clientId || null, dueDate: dueDate || null, importance, isPrivate: priv, repeat: repeat === "none" ? null : repeat, parentId: (!priv && !hasChildren && parentId) ? parentId : null })}>Save</Btn>
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
