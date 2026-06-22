import { addDays, dateDiff } from "./dates";
import { HABIT_POINTS, TASK_IMPORTANCE } from "./constants";

// Habit evaluation: 2 chance rule.
// miss one day = warning (streak frozen), miss two in a row = reset
export function evalHabit(habit, today) {
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
  return { streak, status, completedToday, everMissed };
}

export function habitPoints(h) { return HABIT_POINTS; }
export function taskPoints(t) { return (TASK_IMPORTANCE[t.importance] || TASK_IMPORTANCE.medium).points; }

export function pointsInRange(userId, from, to, habits, tasks) {
  let pts = 0;
  habits.filter((h) => h.ownerId === userId).forEach((h) => {
    Object.keys(h.completions || {}).forEach((d) => { if (d >= from && d <= to && h.completions[d]) pts += habitPoints(h); });
  });
  tasks.forEach((t) => { const c = (t.completed || {})[userId]; if (c && c >= from && c <= to) pts += taskPoints(t); });
  return pts;
}
export function pointsOnDay(userId, day, habits, tasks) { return pointsInRange(userId, day, day, habits, tasks); }
export function totalPoints(userId, habits, tasks) { return pointsInRange(userId, "0000-00-00", "9999-99-99", habits, tasks); }
