// Work timer state for a task, per user.
//
// A task carries two maps keyed by user id:
//   working[uid] -> timestamp the current running segment started, or absent
//   acc[uid]     -> milliseconds banked from earlier segments of this session
//
// Running  = working[uid] is set.
// Paused   = working[uid] is absent but acc[uid] is set (session still open).
// Idle     = neither is set.
// Time is only written to the work log when the session is stopped, so pausing
// and switching tasks never double counts.

export const isPrivateTask = (t) => !!(t && (t.isPrivate || t.private));

export const isRunning = (t, uid) => !!(t && t.working && t.working[uid] != null);
export const accOf = (t, uid) => (t && t.acc && t.acc[uid]) || 0;
export const isPaused = (t, uid) => !isRunning(t, uid) && accOf(t, uid) > 0;
export const isActive = (t, uid) => isRunning(t, uid) || isPaused(t, uid);

export function elapsedMs(t, uid, now) {
  if (!t) return 0;
  const live = isRunning(t, uid) ? Math.max(0, (now || Date.now()) - t.working[uid]) : 0;
  return accOf(t, uid) + live;
}
export const elapsedSecs = (t, uid, now) => Math.round(elapsedMs(t, uid, now) / 1000);

// Immutable patches. Each returns a new task object.
export function startWork(t, uid, now) {
  return { ...t, working: { ...(t.working || {}), [uid]: now || Date.now() }, acc: { ...(t.acc || {}) } };
}
export function pauseWork(t, uid, now) {
  if (!isRunning(t, uid)) return t;
  const ms = elapsedMs(t, uid, now);
  const w = { ...(t.working || {}) }; delete w[uid];
  // Keep at least 1ms so a pause straight after a start still reads as "paused".
  return { ...t, working: w, acc: { ...(t.acc || {}), [uid]: Math.max(1, ms) } };
}
export function resumeWork(t, uid, now) {
  if (isRunning(t, uid)) return t;
  return { ...t, working: { ...(t.working || {}), [uid]: now || Date.now() } };
}
export function clearWork(t, uid) {
  const w = { ...(t.working || {}) }; delete w[uid];
  const a = { ...(t.acc || {}) }; delete a[uid];
  return { ...t, working: w, acc: a };
}

export function fmtElapsed(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${ss}s`;
  return `${ss}s`;
}
// Long form used in the stop popup, where precision matters.
export function fmtHm(secs) {
  const s = Math.max(0, Math.round(secs));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}
