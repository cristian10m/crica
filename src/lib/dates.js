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
