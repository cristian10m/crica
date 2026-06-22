import { useState, useEffect } from "react";
import { Plus, Check, Trash2, GripVertical, CheckSquare, Users, Building2, Clock, Filter } from "lucide-react";
import { Card, Btn, Modal, Field, Segmented, Avatar, PageHead } from "../components/ui";
import { DraggableList } from "../components/DraggableList";
import { todayStr, dateDiff, prettyDate } from "../lib/dates";
import { fireConfetti } from "../lib/confetti";
import { uid } from "../lib/format";
import { TASK_IMPORTANCE } from "../lib/constants";

export function TasksTab({ users, me, tasks, setTasks, clients }) {
  const [board, setBoard] = useState(me.id);
  const [filter, setFilter] = useState("active");
  const [modal, setModal] = useState(null); // null | "new" | task
  const boardUser = users.find((u) => u.id === board);

  const visible = tasks
    .filter((t) => (t.assignees || []).includes(board))
    .filter((t) => {
      const done = !!(t.completed || {})[board];
      return filter === "all" ? true : filter === "done" ? done : !done;
    })
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const completeTask = (task, e) => {
    const done = !!(task.completed || {})[board];
    const comp = { ...(task.completed || {}) };
    if (done) delete comp[board]; else comp[board] = todayStr();
    setTasks(tasks.map((t) => t.id === task.id ? { ...t, completed: comp } : t));
    if (!done) { const r = e?.currentTarget?.getBoundingClientRect(); fireConfetti(r ? r.left + r.width / 2 : undefined, r ? r.top : undefined); }
  };
  const saveTask = (data) => {
    if (data.id) setTasks(tasks.map((t) => t.id === data.id ? { ...t, ...data } : t));
    else setTasks([...tasks, { id: uid(), creatorId: me.id, createdDate: todayStr(), completed: {}, order: tasks.length, ...data }]);
    setModal(null);
  };
  const removeTask = (id) => { setTasks(tasks.filter((t) => t.id !== id)); setModal(null); };
  const reorder = (newList) => {
    const map = {}; newList.forEach((t, i) => map[t.id] = i);
    setTasks(tasks.map((t) => t.id in map ? { ...t, order: map[t.id] } : t));
  };

  return (
    <div className="page">
      <PageHead title="Tasks" subtitle="Assign work, earn points, settle the score.">
        <Btn onClick={() => setModal("new")}><Plus size={16} /> Add task</Btn>
      </PageHead>

      <Segmented value={board} onChange={setBoard} options={users.map((u) => ({ value: u.id, label: u.id === me.id ? "My board" : u.name }))} />
      <div className="filter-row">
        <Filter size={14} />
        {["active", "done", "all"].map((f) => (
          <button key={f} className={"text-pill " + (filter === f ? "on" : "")} onClick={() => setFilter(f)}>{f[0].toUpperCase() + f.slice(1)}</button>
        ))}
      </div>

      {visible.length === 0 && <Card className="empty"><CheckSquare size={26} /><div>Nothing here. {filter === "done" ? "No tasks completed yet." : "Add a task to get going."}</div></Card>}

      <DraggableList items={visible} getKey={(t) => t.id} onReorder={reorder} renderItem={(t, ctx) => {
        const done = !!(t.completed || {})[board];
        const imp = TASK_IMPORTANCE[t.importance] || TASK_IMPORTANCE.medium;
        const client = clients.find((c) => c.id === t.clientId);
        const creator = users.find((u) => u.id === t.creatorId);
        const both = (t.assignees || []).length > 1;
        const dueSoon = t.dueDate && !done && dateDiff(t.dueDate, todayStr()) <= 1;
        return (
          <Card className={"task-card " + (done ? "task-done" : "")}>
            <button className="drag-handle" {...ctx.handle}><GripVertical size={18} /></button>
            <button className={"task-check " + (done ? "on" : "")} onClick={(e) => completeTask(t, e)} style={done ? { background: boardUser.color, borderColor: boardUser.color } : {}}>
              {done && <Check size={16} />}
            </button>
            <div className="task-main" onClick={() => setModal(t)}>
              <div className="task-title">{t.title}</div>
              <div className="task-meta">
                <span className="chip" style={{ color: imp.color, borderColor: imp.color + "55" }}>{imp.label} +{imp.points}</span>
                {client && <span className="chip"><Building2 size={11} /> {client.name}</span>}
                {both && <span className="chip"><Users size={11} /> Both</span>}
                {t.dueDate && <span className={"chip " + (dueSoon ? "warn" : "")}><Clock size={11} /> {prettyDate(t.dueDate)}</span>}
              </div>
              {t.creatorId !== board && creator && <div className="added-by">Added by {creator.name}</div>}
            </div>
          </Card>
        );
      }} />

      <TaskModal open={modal !== null} task={modal === "new" ? null : modal} users={users} me={me} clients={clients}
        onClose={() => setModal(null)} onSave={saveTask} onDelete={removeTask} />
    </div>
  );
}

function TaskModal({ open, task, users, me, clients, onClose, onSave, onDelete }) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [assignees, setAssignees] = useState([me.id]);
  const [clientId, setClientId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [importance, setImportance] = useState("medium");
  useEffect(() => {
    if (open) {
      setTitle(task?.title || ""); setNotes(task?.notes || "");
      setAssignees(task?.assignees || [me.id]); setClientId(task?.clientId || "");
      setDueDate(task?.dueDate || ""); setImportance(task?.importance || "medium");
    }
  }, [open, task]);
  const toggleAssignee = (id) => setAssignees((a) => a.includes(id) ? (a.length > 1 ? a.filter((x) => x !== id) : a) : [...a, id]);
  return (
    <Modal open={open} onClose={onClose} title={task ? "Edit task" : "New task"}>
      <Field label="Task"><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs doing?" autoFocus /></Field>
      <Field label="Notes (optional)"><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Details, links, context" /></Field>
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
      <div className="grid-2">
        <Field label="Client (optional)">
          <select value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">None / general</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Due date"><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></Field>
      </div>
      <span className="field-label">Importance (sets points)</span>
      <div className="seg-pills">
        {Object.entries(TASK_IMPORTANCE).map(([k, v]) => (
          <button key={k} className={"pill " + (importance === k ? "pill-on" : "")} onClick={() => setImportance(k)} style={importance === k ? { borderColor: v.color, color: v.color } : {}}>
            {v.label} <b>+{v.points}</b>
          </button>
        ))}
      </div>
      <div className="modal-actions">
        {task && <Btn variant="ghost-danger" onClick={() => onDelete(task.id)}><Trash2 size={16} /> Delete</Btn>}
        <Btn onClick={() => title.trim() && onSave({ ...(task || {}), title: title.trim(), notes, assignees, clientId: clientId || null, dueDate: dueDate || null, importance })}>Save</Btn>
      </div>
    </Modal>
  );
}
