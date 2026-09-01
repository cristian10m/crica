import { useEffect, useState } from "react";
import { Target, Check, Coins } from "lucide-react";
import { startOfWeek, todayStr, addDays } from "../lib/dates";
import { isRunning, elapsedMs } from "../lib/work";
import { fireConfetti } from "../lib/confetti";

export const GOAL_REWARD = 50; // spendable coins for hitting the weekly goal
const REWARD_START = "2026-08-31"; // weeks before the feature existed pay nothing

// Hours worked in a given week: banked work-log time, plus (for the current
// week only) whatever an open session on a task has accumulated but not logged.
export function weekWorkedMs(userId, tasks, work, weekStart) {
  const from = weekStart || startOfWeek(todayStr());
  const to = addDays(from, 6);
  let ms = 0;
  (work || []).forEach((w) => { if (w.userId === userId && w.date >= from && w.date <= to) ms += (w.seconds || 0) * 1000; });
  if (from === startOfWeek(todayStr())) (tasks || []).forEach((t) => { ms += elapsedMs(t, userId); });
  return ms;
}

// Weeks whose goal was hit but whose reward has not been collected yet. The
// current week is checked alongside the past few, so an uncollected reward
// simply waits: the new week's bar starts from zero and counts on regardless.
export function pendingRewardWeeks(user, tasks, work) {
  const goal = user.weekGoalHours || 0;
  if (!goal) return [];
  const claimed = user.goalClaimed || [];
  const cur = startOfWeek(todayStr());
  const out = [];
  for (let i = 0; i < 5; i++) {
    const ws = addDays(cur, -7 * i);
    if (ws < REWARD_START) break;
    if (claimed.includes(ws)) continue;
    if (weekWorkedMs(user.id, tasks, work, ws) >= goal * 3600000) out.push(ws);
  }
  return out;
}

const fmtH = (ms) => {
  const h = ms / 3600000;
  const whole = Math.floor(h), m = Math.round((h - whole) * 60);
  if (whole === 0) return `${m}m`;
  if (whole >= 10 || m === 0) return `${Math.round(h * 10) / 10}h`.replace(".0", "");
  return `${whole}h ${m}m`;
};

function CollectBtn({ pending, onCollect, mini }) {
  if (!pending.length || !onCollect) return null;
  const amount = GOAL_REWARD * pending.length;
  return (
    <span
      role="button" tabIndex={0}
      className={"goal-collect" + (mini ? " mini" : "")}
      title={`Weekly goal hit. Collect ${amount} coins.`}
      onClick={(e) => { e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); fireConfetti(r.left + r.width / 2, r.top); onCollect(pending); }}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onCollect(pending); } }}
    >
      <Coins size={mini ? 11 : 13} /> {amount}
    </span>
  );
}

// The weekly hours goal bar. Variants: default (sidebar card), compact
// (collapsed sidebar), slim (one-line strip under the mobile header).
// Clicking the bar opens settings, where the goal is set.
export function WeekGoal({ me, other, tasks, work, onSetGoal, onCollect, compact, slim }) {
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
  const pending = pendingRewardWeeks(me, tasks, work);

  // One small celebration per person per week, the first time the bar fills.
  useEffect(() => {
    if (!hit || slim) return;
    const key = "crica_goalhit_" + me.id + "_" + startOfWeek(todayStr());
    try { if (!localStorage.getItem(key)) { localStorage.setItem(key, "1"); fireConfetti(); } } catch (e) { /* ignore */ }
  }, [hit, me.id, slim]);

  if (slim) {
    if (!goal) return null;
    return (
      <div role="button" tabIndex={0} className={"weekgoal-slim" + (hit ? " hit" : "")} onClick={onSetGoal} title="Weekly hours goal">
        {hit ? <Check size={13} /> : <Target size={13} />}
        <span className="weekgoal-track slim"><span className="weekgoal-fill" style={{ width: (pct * 100).toFixed(1) + "%" }} /></span>
        <CollectBtn pending={pending} onCollect={onCollect} mini />
        <span className="weekgoal-slim-val">{fmtH(mine)} <i>/ {goal}h</i></span>
      </div>
    );
  }

  if (!goal) {
    return (
      <div role="button" tabIndex={0} className={"weekgoal empty" + (compact ? " compact" : "")} onClick={onSetGoal} title="Set a weekly hours goal">
        <Target size={15} />{!compact && <span>Set a weekly goal</span>}
      </div>
    );
  }

  if (compact) {
    return (
      <div role="button" tabIndex={0} className={"weekgoal compact" + (hit ? " hit" : "")} onClick={onSetGoal} title={`${fmtH(mine)} of ${goal}h this week`}>
        <span className="weekgoal-track mini"><span className="weekgoal-fill" style={{ width: (pct * 100).toFixed(1) + "%" }} /></span>
        {pending.length ? <CollectBtn pending={pending} onCollect={onCollect} mini /> : <span className="weekgoal-pct">{Math.round(pct * 100)}%</span>}
      </div>
    );
  }

  const oGoal = other ? other.weekGoalHours || 0 : 0;
  const oMs = oGoal > 0 ? weekWorkedMs(other.id, tasks, work) : 0;
  const oPct = oGoal > 0 ? Math.min(1, oMs / (oGoal * 3600000)) : 0;

  return (
    <div role="button" tabIndex={0} className={"weekgoal" + (hit ? " hit" : "")} onClick={onSetGoal} title="Weekly hours goal. Click to adjust it in settings.">
      <span className="weekgoal-head">
        <span className="weekgoal-lab">{hit ? <><Check size={13} /> Goal hit</> : <><Target size={13} /> This week</>}</span>
        <CollectBtn pending={pending} onCollect={onCollect} />
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
    </div>
  );
}
