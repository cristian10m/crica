import { useState, useEffect } from "react";
import { Plus, Check, Trash2, GripVertical, Flame, Repeat, Eye, AlertTriangle } from "lucide-react";
import { Card, Btn, Modal, Field, PageHead } from "../components/ui";
import { DraggableList } from "../components/DraggableList";
import { evalHabit, habitPoints } from "../lib/points";
import { todayStr } from "../lib/dates";
import { fireConfetti } from "../lib/confetti";
import { uid } from "../lib/format";
import { HABIT_ICONS, ICON_GLYPH, HABIT_POINTS } from "../lib/constants";

export function HabitsTab({ users, me, habits, setHabits }) {
  const partner = users.find((u) => u.id !== me.id);
  const [modal, setModal] = useState(null); // null | "new" | habit object
  const myHabits = habits.filter((h) => h.ownerId === me.id).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const partnerHabits = habits.filter((h) => h.ownerId === partner.id).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const toggleToday = (habit, e) => {
    const t = todayStr();
    const comp = { ...(habit.completions || {}) };
    const wasDone = !!comp[t];
    if (wasDone) delete comp[t]; else comp[t] = true;
    setHabits(habits.map((h) => h.id === habit.id ? { ...h, completions: comp } : h));
    if (!wasDone) {
      const rect = e?.currentTarget?.getBoundingClientRect();
      fireConfetti(rect ? rect.left + rect.width / 2 : undefined, rect ? rect.top : undefined);
    }
  };
  const saveHabit = (data) => {
    if (data.id) setHabits(habits.map((h) => h.id === data.id ? { ...h, ...data } : h));
    else setHabits([...habits, { id: uid(), ownerId: me.id, createdDate: todayStr(), completions: {}, order: myHabits.length, ...data }]);
    setModal(null);
  };
  const removeHabit = (id) => { setHabits(habits.filter((h) => h.id !== id)); setModal(null); };
  const reorder = (newList) => {
    const map = {}; newList.forEach((h, i) => map[h.id] = i);
    setHabits(habits.map((h) => h.id in map ? { ...h, order: map[h.id] } : h));
  };

  return (
    <div className="page">
      <PageHead title="Habits" subtitle="Two strikes and it resets. Keep the chain alive.">
        <Btn onClick={() => setModal("new")}><Plus size={16} /> New habit</Btn>
      </PageHead>

      {myHabits.length === 0 && (
        <Card className="empty"><Repeat size={26} /><div>No habits yet. Add your first one to start a streak.</div></Card>
      )}

      <DraggableList items={myHabits} getKey={(h) => h.id} onReorder={reorder} renderItem={(h, ctx) => {
        const ev = evalHabit(h, todayStr());
        return (
          <Card className={"habit-card " + (ev.completedToday ? "habit-done" : "")}>
            <button className="drag-handle" {...ctx.handle}><GripVertical size={18} /></button>
            <button className={"habit-check " + (ev.completedToday ? "on" : "")} onClick={(e) => toggleToday(h, e)} style={ev.completedToday ? { background: me.color, borderColor: me.color } : {}}>
              {ev.completedToday && <Check size={18} />}
            </button>
            <div className="habit-main" onClick={() => setModal(h)}>
              <div className="habit-name">{ICON_GLYPH[h.icon] || "\u2B50"} {h.name}</div>
              <div className="habit-meta">
                <span className="chip"><Flame size={12} /> {ev.streak} day{ev.streak === 1 ? "" : "s"}</span>
                <span className="chip">+{habitPoints(h)} pts</span>
                {ev.status === "warning" && <span className="chip warn"><AlertTriangle size={12} /> 1 chance left today</span>}
                {ev.status === "broken" && !ev.completedToday && <span className="chip danger">Streak reset</span>}
              </div>
            </div>
          </Card>
        );
      }} />

      <div className="partner-head"><Eye size={15} /> {partner.name}'s habits <span className="locked-note">names hidden</span></div>
      {partnerHabits.length === 0 && <div className="muted-small">No habits to compare yet.</div>}
      {partnerHabits.map((h) => {
        const ev = evalHabit(h, todayStr());
        return (
          <Card key={h.id} className="habit-card censored">
            <div className="censored-name"><span className="blurred">{h.name}</span></div>
            <div className="censored-stats">
              <span className="chip"><Flame size={12} /> {ev.streak}</span>
              <span className={"dot " + (ev.completedToday ? "dot-on" : "")} title={ev.completedToday ? "Done today" : "Not done today"} style={ev.completedToday ? { background: partner.color } : {}} />
              {ev.everMissed && <span className="chip danger-soft">missed before</span>}
            </div>
          </Card>
        );
      })}

      <HabitModal open={modal !== null} habit={modal === "new" ? null : modal} onClose={() => setModal(null)} onSave={saveHabit} onDelete={removeHabit} />
    </div>
  );
}

function HabitModal({ open, habit, onClose, onSave, onDelete }) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("dumbbell");
  useEffect(() => {
    if (open) { setName(habit?.name || ""); setIcon(habit?.icon || "dumbbell"); }
  }, [open, habit]);
  return (
    <Modal open={open} onClose={onClose} title={habit ? "Edit habit" : "New habit"}>
      <Field label="Habit name"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Gym, Read 20 min" autoFocus /></Field>
      <span className="field-label">Icon</span>
      <div className="icon-grid">
        {HABIT_ICONS.map((ic) => (
          <button key={ic} className={"icon-pick " + (icon === ic ? "on" : "")} onClick={() => setIcon(ic)}>{ICON_GLYPH[ic]}</button>
        ))}
      </div>
      <p className="muted-small" style={{ marginTop: 10 }}>Every habit kept is worth <b>+{HABIT_POINTS}</b> points for the day. They are all hard to keep, so they all count the same.</p>
      <div className="modal-actions">
        {habit && <Btn variant="ghost-danger" onClick={() => onDelete(habit.id)}><Trash2 size={16} /> Delete</Btn>}
        <Btn variant="primary" onClick={() => name.trim() && onSave({ ...(habit || {}), name: name.trim(), icon })}>Save</Btn>
      </div>
    </Modal>
  );
}
