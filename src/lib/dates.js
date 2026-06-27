// Date helpers (local time, YYYY-MM-DD)
const pad = (n) => String(n).padStart(2, "0");
export const toDateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseDate = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
export const todayStr = () => toDateStr(new Date());
export const addDays = (s, n) => { const d = parseDate(s); d.setDate(d.getDate() + n); return toDateStr(d); };
export const dateDiff = (a, b) => Math.round((parseDate(a) - parseDate(b)) / 86400000);
export const monthKey = (s) => s.slice(0, 7);
export const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const prettyDate = (s) => { const d = parseDate(s); return `${WEEKDAY[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`; };
export const startOfWeek = (s) => { const d = parseDate(s); const day = (d.getDay() + 6) % 7; return addDays(s, -day); }; // Monday start
export const weekDates = (anchor) => { const start = startOfWeek(anchor); return Array.from({ length: 7 }, (_, i) => addDays(start, i)); };

// Minutes east of UTC for an IANA timezone at a given instant (DST-aware).
// Used to show each person's schedule in the viewer's own local time.
export function tzOffsetMin(tz, dateObj) {
  try {
    const dtf = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour12: false, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const p = {}; for (const part of dtf.formatToParts(dateObj)) p[part.type] = part.value;
    let hour = +p.hour; if (hour === 24) hour = 0;
    const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, hour, +p.minute, +p.second);
    return Math.round((asUTC - dateObj.getTime()) / 60000);
  } catch (e) { return -dateObj.getTimezoneOffset(); }
}
export const localTz = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) { return null; } };
