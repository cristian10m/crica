import { addDays, dateDiff, startOfWeek } from "./dates";
import { HABIT_POINTS, TASK_IMPORTANCE } from "./constants";

// Habit evaluation. Daily habits use the 2 chance rule (miss one day = warning,
// miss two in a row = reset). Weekly habits are judged by the week: hit your target
// number of days and the week counts, and the streak is built from kept weeks.
export function evalHabit(habit, today) {
  if (habit.freqType === "weekly") {
    const target = Math.max(1, Math.min(7, habit.perWeek || 3));
    return evalWeekly(habit, today, target);
  }
  const comp = habit.completions || {};
  const created = habit.createdDate || today;
  const completedToday = !!comp[today];
  let streak = 0, misses = 0;
  let cursor = completedToday ? (streak++, addDays(today, -1)) : addDays(today, -1);
  while (dateDiff(cursor, created) >= 0) {
    if (comp[cursor]) { streak++; misses = 0; }
    else { misses++; if (misses >= 2) break; }
    cursor = addDays(cursor, -1);
  }
  let status = "active";
  if (!completedToday) {
    const y = addDays(today, -1), db = addDays(today, -2);
    const missedY = dateDiff(y, created) >= 0 && !comp[y];
    const missedDB = dateDiff(db, created) >= 0 && !comp[db];
    if (missedY && missedDB) status = "broken";
    else if (missedY) status = "warning";
    else status = "pending";
  }
  const everMissed = (() => {
    const days = Object.keys(comp).sort();
    if (!days.length) return false;
    let d = days[0];
    while (dateDiff(today, d) >= 0) { if (!comp[d]) return true; d = addDays(d, 1); }
    return false;
  })();
  return { streak, status, completedToday, everMissed, weekly: false };
}

function evalWeekly(habit, today, target) {
  const comp = habit.completions || {};
  const created = habit.createdDate || today;
  const createdWeek = startOfWeek(created);
  const completedToday = !!comp[today];

  const weekCount = (ws) => {
    let c = 0;
    for (let i = 0; i < 7; i++) {
      const d = addDays(ws, i);
      if (dateDiff(d, today) > 0) break;       // future
      if (dateDiff(d, created) < 0) continue;   // before this habit existed
      if (comp[d]) c++;
    }
    return c;
  };

  const thisWeek = startOfWeek(today);
  const thisCount = weekCount(thisWeek);
  let remaining = 0;
  for (let i = 0; i < 7; i++) { if (dateDiff(addDays(thisWeek, i), today) >= 0) remaining++; }

  // Streak of kept weeks. The current week counts only once it is met.
  let streak = 0;
  let ws = thisWeek;
  if (thisCount >= target) streak++;
  ws = addDays(ws, -7);
  while (dateDiff(ws, createdWeek) > 0) {
    if (weekCount(ws) >= target) { streak++; ws = addDays(ws, -7); } else break;
  }

  let status;
  if (thisCount >= target) status = "active";
  else if (thisCount + remaining >= target) status = "pending";
  else status = "warning";

  let everMissed = false;
  let pw = addDays(thisWeek, -7);
  while (dateDiff(pw, createdWeek) > 0) {
    if (weekCount(pw) < target) { everMissed = true; break; }
    pw = addDays(pw, -7);
  }

  return { streak, status, completedToday, everMissed, weekly: true, weekCount: thisCount, weekTarget: target };
}

// The most recent day a habit was checked done, with a timestamp when available.
export function lastDone(habit) {
  const comp = habit.completions || {};
  const days = Object.keys(comp).filter((d) => comp[d]).sort();
  if (!days.length) return null;
  const date = days[days.length - 1];
  const val = comp[date];
  return { date, ts: typeof val === "number" ? val : null };
}

export function habitPoints(h) { return HABIT_POINTS; }

// A checked habit unlocks again 12 hours later, rather than staying locked for the
// whole calendar day. Streaks and points stay day-based (one per calendar day).
export const HABIT_RESET_HOURS = 12;
export function lastCompletionMs(habit) {
  const comp = habit.completions || {};
  let max = null;
  for (const k in comp) { const v = comp[k]; if (typeof v === "number" && (max == null || v > max)) max = v; }
  return max;
}
export function habitCooldown(habit, now = Date.now()) {
  const last = lastCompletionMs(habit);
  if (last == null) return { onCooldown: false, last: null, remainingMs: 0 };
  const remainingMs = last + HABIT_RESET_HOURS * 3600000 - now;
  return { onCooldown: remainingMs > 0, last, remainingMs: Math.max(0, remainingMs) };
}
export function taskPoints(t) {
  if (t.parentId) return 0; // subtasks are just a checklist, the parent carries the points
  if (t.isPrivate || t.private) return 0; // personal tasks do not score
  if (typeof t.points === "number") return t.points; // bounty tasks carry their own value
  return (TASK_IMPORTANCE[t.importance] || TASK_IMPORTANCE.medium).points;
}

// Points a specific person earns from a task. For a task shared by both people the
// importance value is split by how much work time each logged on it (equal split if
// none was logged). Solo tasks pay the full value to the assignee.
export function taskPointsFor(t, userId, work = []) {
  const base = taskPoints(t);
  if (base === 0) return 0;
  const assignees = t.assignees || [];
  if (assignees.length <= 1) return base;
  const by = {};
  (work || []).forEach((w) => { if (w.taskId === t.id && assignees.includes(w.userId)) by[w.userId] = (by[w.userId] || 0) + (w.seconds || 0); });
  const total = assignees.reduce((s, id) => s + (by[id] || 0), 0);
  if (total <= 0) return Math.round(base / assignees.length);
  return Math.round(base * ((by[userId] || 0) / total));
}

export function pointsInRange(userId, from, to, habits, tasks, focus = [], work = []) {
  let pts = 0;
  habits.filter((h) => h.ownerId === userId).forEach((h) => {
    Object.keys(h.completions || {}).forEach((d) => { if (d >= from && d <= to && h.completions[d]) pts += habitPoints(h); });
  });
  tasks.forEach((t) => { const c = (t.completed || {})[userId]; if (c && c >= from && c <= to) pts += taskPointsFor(t, userId, work); });
  (focus || []).forEach((f) => { if (f.userId === userId && f.date >= from && f.date <= to) pts += (f.points || 0); });
  return pts;
}
export function pointsOnDay(userId, day, habits, tasks, focus = [], work = []) { return pointsInRange(userId, day, day, habits, tasks, focus, work); }
export function totalPoints(userId, habits, tasks, focus = [], work = []) { return pointsInRange(userId, "0000-00-00", "9999-99-99", habits, tasks, focus, work); }

export function focusSecondsInRange(userId, from, to, focus = []) {
  return (focus || []).reduce((s, f) => (f.userId === userId && f.date >= from && f.date <= to ? s + (f.seconds || 0) : s), 0);
}

// Longest streak a habit ever reached (daily: consecutive days; weekly: consecutive kept weeks).
export function bestStreakEver(habit) {
  const comp = habit.completions || {};
  const days = Object.keys(comp).filter((d) => comp[d]).sort();
  if (!days.length) return 0;
  if (habit.freqType === "weekly") {
    const target = Math.max(1, Math.min(7, habit.perWeek || 3));
    const counts = {};
    days.forEach((d) => { const ws = startOfWeek(d); counts[ws] = (counts[ws] || 0) + 1; });
    const metWeeks = Object.keys(counts).filter((ws) => counts[ws] >= target).sort();
    let best = 0, run = 0, prev = null;
    metWeeks.forEach((ws) => { run = (prev && dateDiff(ws, prev) === 7) ? run + 1 : 1; prev = ws; if (run > best) best = run; });
    return best;
  }
  let best = 0, run = 0, prev = null;
  days.forEach((d) => { run = (prev && dateDiff(d, prev) === 1) ? run + 1 : 1; prev = d; if (run > best) best = run; });
  return best;
}

// A playful rank derived from total points.
export function rankFor(points) {
  if (points >= 5000) return { title: "Legend", color: "#AF52DE" };
  if (points >= 2000) return { title: "Machine", color: "#0071E3" };
  if (points >= 750) return { title: "Grinder", color: "#34C759" };
  if (points >= 200) return { title: "Regular", color: "#FF9500" };
  return { title: "Rookie", color: "#8e8e93" };
}

// All-time profile numbers for one person, including the head to head record vs the other.
export function profileStats(user, other, habits, tasks, focus, work = []) {
  const points = totalPoints(user.id, habits, tasks, focus, work);
  const tasksDone = tasks.filter((t) => !t.parentId && (t.completed || {})[user.id]).length;
  const myHabits = habits.filter((h) => h.ownerId === user.id);
  const habitsKept = myHabits.reduce((s, h) => s + Object.values(h.completions || {}).filter(Boolean).length, 0);
  const bestStreak = myHabits.length ? Math.max(...myHabits.map(bestStreakEver)) : 0;
  const focusSec = focusSecondsInRange(user.id, "0000-00-00", "9999-99-99", focus);
  const workedSec = (work || []).reduce((s, w) => (w.userId === user.id ? s + (w.seconds || 0) : s), 0);

  const dates = new Set();
  habits.forEach((h) => Object.keys(h.completions || {}).forEach((d) => { if (h.completions[d]) dates.add(d); }));
  tasks.forEach((t) => Object.values(t.completed || {}).forEach((d) => { if (d) dates.add(d); }));
  (focus || []).forEach((f) => { if (f.date) dates.add(f.date); });

  let daysWon = 0, daysLost = 0;
  dates.forEach((d) => {
    const mine = pointsOnDay(user.id, d, habits, tasks, focus, work);
    const theirs = other ? pointsOnDay(other.id, d, habits, tasks, focus, work) : 0;
    if (mine > theirs && mine > 0) daysWon++;
    else if (other && theirs > mine && theirs > 0) daysLost++;
  });

  return { points, tasksDone, habitsKept, bestStreak, focusSec, workedSec, daysWon, daysLost, rank: rankFor(points) };
}
