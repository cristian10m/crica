// Scheduling math. Each person has a recurring weekly ROTA (work shifts) plus
// one-off commitments. Both count as "busy". The thing we surface is the free
// overlap, the windows where neither person is busy, inside a sensible day window.
import { parseDate, startOfWeek } from "./dates";

export const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
export const DAY_LABELS = { mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday" };
export const DAY_SHORT = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" };

export const WINDOW_START = 6 * 60;   // 6:00 am
export const WINDOW_END = 24 * 60;    // midnight
export const WINDOW_LEN = WINDOW_END - WINDOW_START;
export const MIN_FREE = 30;           // ignore free slivers shorter than 30 min

export const toMin = (hhmm) => { if (!hhmm) return null; const [h, m] = hhmm.split(":").map(Number); return h * 60 + (m || 0); };
export const fmtMin = (min) => {
  let h = Math.floor(min / 60); const m = min % 60;
  if (h >= 24) { h = 24; }
  const ap = h >= 12 && h < 24 ? "pm" : "am";
  let hh = h % 12; if (hh === 0) hh = 12;
  if (min >= WINDOW_END) return "midnight";
  return m === 0 ? `${hh}${ap}` : `${hh}:${String(m).padStart(2, "0")}${ap}`;
};

export const weekdayKey = (dateStr) => { const d = parseDate(dateStr); return DAY_KEYS[(d.getDay() + 6) % 7]; };

function clampMerge(intervals) {
  const xs = intervals
    .map(([s, e]) => [Math.max(WINDOW_START, Math.min(s, WINDOW_END)), Math.max(WINDOW_START, Math.min(e, WINDOW_END))])
    .filter(([s, e]) => e > s)
    .sort((a, b) => a[0] - b[0]);
  const out = [];
  for (const iv of xs) {
    if (out.length && iv[0] <= out[out.length - 1][1]) out[out.length - 1][1] = Math.max(out[out.length - 1][1], iv[1]);
    else out.push([iv[0], iv[1]]);
  }
  return out;
}

// The shift map for the calendar week that contains this date. New data lives
// under weeks[mondayDate]; the old single recurring "week" is used as a fallback
// so existing schedules keep working until a week is edited.
export function weekData(schedule, dateStr) {
  if (!schedule) return {};
  const ws = startOfWeek(dateStr);
  return (schedule.weeks && schedule.weeks[ws]) || schedule.week || {};
}

// Busy intervals for one person's schedule on a specific date.
export function busyFor(schedule, dateStr) {
  if (!schedule) return [];
  const out = [];
  const wk = weekData(schedule, dateStr)[weekdayKey(dateStr)];
  if (wk && wk.on && wk.start && wk.end) {
    const s = toMin(wk.start), e = toMin(wk.end);
    if (s != null && e != null) out.push([s, e]);
  }
  (schedule.exceptions || []).forEach((ex) => {
    if (ex.date !== dateStr) return;
    if (ex.allDay) out.push([WINDOW_START, WINDOW_END]);
    else { const s = toMin(ex.start), e = toMin(ex.end); if (s != null && e != null) out.push([s, e]); }
  });
  return clampMerge(out);
}

// Free windows shared by everyone (complement of all busy, inside the day window).
export function freeTogether(busyLists) {
  const combined = clampMerge([].concat(...busyLists));
  const free = [];
  let cursor = WINDOW_START;
  for (const [s, e] of combined) {
    if (s > cursor) free.push([cursor, s]);
    cursor = Math.max(cursor, e);
  }
  if (cursor < WINDOW_END) free.push([cursor, WINDOW_END]);
  return free.filter(([s, e]) => e - s >= MIN_FREE);
}

export const pct = (min) => ((min - WINDOW_START) / WINDOW_LEN) * 100;
export const fmtRange = (s, e) => `${fmtMin(s)} to ${fmtMin(e)}`;
