import { useEffect, useState } from "react";
import { Target, Check } from "lucide-react";
import { startOfWeek, todayStr, addDays } from "../lib/dates";
import { isRunning, elapsedMs } from "../lib/work";
import { fireConfetti } from "../lib/confetti";

// Hours worked this week: banked work-log time plus whatever an open (running or
// paused) session on a task has accumulated but not logged yet.
export function weekWorkedMs(userId, tasks, work) {
  const from = startOfWeek(todayStr()), to = addDays(from, 6);
  let ms = 0;
  (work || []).forEach((w) => { if (w.userId === userId && w.date >= from && w.date <= to) ms += (w.seconds || 0) * 1000; });
  (tasks || []).forEach((t) => { ms += elapsedMs(t, userId); });
  return ms;
}

const fmtH = (ms) => {
  const h = ms / 3600000;
  const whole = Math.floor(h), m = Math.round((h - whole) * 60);
  if (whole === 0) return `${m}m`;
  if (whole >= 10 || m === 0) return `${Math.round(h * 10) / 10}h`.replace(".0", "");
  return `${whole}h ${m}m`;
};

// The weekly hours goal bar. Variants: default (sidebar card), compact (collapsed
// sidebar), slim (one-line strip under the mobile header). Click always opens
// settings, where the goal is set.
export function WeekGoal({ me, other, tasks, work, onSetGoal, compact, slim }) {
  // Refresh every 30s while my timer runs so the bar creeps forward live.
  const [, setTick] = useState(0);
  const running = (tasks || []).some((t) => isRunning(t, me.id));
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setTick((n) => n + 1), 30000);
    return () => clearInterval(id);
  }, [running]);

  const goal = me.weekGoalHours || 0;
  const mine = weekWorkedMs(me.id, tasks, work);
  const pct = goal > 0 ? Math.min(1, mine / (goal * 3600000)) : 0;
  const hit = goal > 0 && pct >= 1;

  // One small celebration per person per week, the first time the bar fills.
  useEffect(() => {
    if (!hit || slim) return;
    const key = "crica_goalhit_" + me.id + "_" + startOfWeek(todayStr());
    try { if (!localStorage.getItem(key)) { localStorage.setItem(key, "1"); fireConfetti(); } } catch (e) { /* ignore */ }
  }, [hit, me.id, slim]);

  if (slim) {
    if (!goal) return null;
    return (
      <button type="button" className={"weekgoal-slim" + (hit ? " hit" : "")} onClick={onSetGoal} title="Weekly hours goal">
        {hit ? <Check size={13} /> : <Target size={13} />}
        <span className="weekgoal-track slim"><span className="weekgoal-fill" style={{ width: (pct * 100).toFixed(1) + "%" }} /></span>
        <span className="weekgoal-slim-val">{fmtH(mine)} <i>/ {goal}h</i></span>
      </button>
    );
  }

  if (!goal) {
    return (
      <button type="button" className={"weekgoal empty" + (compact ? " compact" : "")} onClick={onSetGoal} title="Set a weekly hours goal">
        <Target size={15} />{!compact && <span>Set a weekly goal</span>}
      </button>
    );
  }

  if (compact) {
    return (
      <button type="button" className={"weekgoal compact" + (hit ? " hit" : "")} onClick={onSetGoal} title={`${fmtH(mine)} of ${goal}h this week`}>
        <span className="weekgoal-track mini"><span className="weekgoal-fill" style={{ width: (pct * 100).toFixed(1) + "%" }} /></span>
        <span className="weekgoal-pct">{Math.round(pct * 100)}%</span>
      </button>
    );
  }

  const oGoal = other ? other.weekGoalHours || 0 : 0;
  const oMs = oGoal > 0 ? weekWorkedMs(other.id, tasks, work) : 0;
  const oPct = oGoal > 0 ? Math.min(1, oMs / (oGoal * 3600000)) : 0;

  return (
    <button type="button" className={"weekgoal" + (hit ? " hit" : "")} onClick={onSetGoal} title="Weekly hours goal. Click to adjust it in settings.">
      <span className="weekgoal-head">
        <span className="weekgoal-lab">{hit ? <><Check size={13} /> Goal hit</> : <><Target size={13} /> This week</>}</span>
        <span className="weekgoal-val">{fmtH(mine)} <i>/ {goal}h</i></span>
      </span>
      <span className="weekgoal-track"><span className="weekgoal-fill" style={{ width: (pct * 100).toFixed(1) + "%" }} /></span>
      {oGoal > 0 && (
        <span className="weekgoal-other">
          <span className="weekgoal-other-name">{other.name}</span>
          <span className="weekgoal-track mini"><span className="weekgoal-fill flat" style={{ width: (oPct * 100).toFixed(1) + "%", background: other.color }} /></span>
          <span className="weekgoal-other-val">{fmtH(oMs)}</span>
        </span>
      )}
    </button>
  );
}
