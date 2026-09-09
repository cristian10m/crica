// Background reminders.
//
// This used to rely entirely on Notification Triggers (showTrigger +
// TimestampTrigger). That API never shipped in any browser, so the support check
// at the top always failed and the whole module returned before scheduling a
// single thing. Nothing ever fired, including the Sunday schedule nudge.
//
// Triggers are still used where a browser offers them, because they work with
// Crica closed. The reliable path is the sweep below: while Crica is open, in a
// background tab or as the installed app, it checks every half minute for
// anything that has come due and fires it. Each occurrence fires once, tracked in
// localStorage, so a refresh does not repeat it.
import { todayStr, parseDate, dateDiff, addDays } from "./dates";
import { nextInvoiceDate } from "./invoices";

const TAG = "crica-sched-";
const SWEEP_MS = 30000;
const GRACE_MS = 6 * 3600000;        // a 9am reminder is not worth firing at 9pm
const NUDGE_GRACE_MS = 14 * 3600000; // the Sunday nudge stays valid all of Sunday
const FIRED_KEY = "crica_fired_reminders";

export function triggersSupported() {
  try {
    return typeof window !== "undefined" && "Notification" in window &&
      "showTrigger" in Notification.prototype && typeof window.TimestampTrigger !== "undefined";
  } catch (e) { return false; }
}

let regCache;
async function getReg() {
  if (regCache !== undefined) return regCache;
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) { regCache = null; return null; }
  try {
    // serviceWorker.ready never settles when nothing is registered, so awaiting
    // it on its own hangs the sweep forever and no reminder is ever shown.
    regCache = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((res) => setTimeout(() => res(null), 1500)),
    ]);
  } catch (e) { regCache = null; }
  return regCache;
}

const loadFired = () => { try { return JSON.parse(localStorage.getItem(FIRED_KEY) || "{}") || {}; } catch (e) { return {}; } };
const saveFired = (map) => {
  try {
    const cutoff = Date.now() - 30 * 86400000;
    const kept = {};
    Object.keys(map).forEach((k) => { if (map[k] > cutoff) kept[k] = map[k]; });
    localStorage.setItem(FIRED_KEY, JSON.stringify(kept));
  } catch (e) { /* ignore */ }
};

let pending = [];
let sweepId = null;
let wired = false;
let sweeping = false;

async function show(item) {
  const opts = { icon: "/icon.png", badge: "/icon.png", body: item.body, tag: TAG + item.tag, data: { url: "/" } };
  try {
    // Through the service worker where possible, so it still appears when the
    // window is minimised or the tab is in the background.
    const reg = await getReg();
    if (reg && reg.showNotification) { await reg.showNotification(item.title, opts); return true; }
    new Notification(item.title, opts); // eslint-disable-line no-new
    return true;
  } catch (e) { return false; }
}

async function sweep() {
  if (sweeping) return; // two overlapping sweeps would each fire the same reminder
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  const now = Date.now();
  const fired = loadFired();
  const due = pending.filter((item) => item.when <= now
    && now - item.when <= (item.grace || GRACE_MS)
    && fired[item.tag] !== item.when);
  if (!due.length) return;
  sweeping = true;
  try {
    // Claim them before showing anything, so a sweep that starts while these are
    // still being displayed does not send them a second time.
    due.forEach((item) => { fired[item.tag] = item.when; });
    saveFired(fired);
    for (const item of due) await show(item); // eslint-disable-line no-await-in-loop
  } finally {
    sweeping = false;
  }
}

function wire() {
  if (wired || typeof document === "undefined") return;
  wired = true;
  sweepId = setInterval(sweep, SWEEP_MS);
  // A laptop waking up, or a tab coming back to the front, checks straight away
  // instead of waiting out the interval.
  const onWake = () => { if (!document.hidden) sweep(); };
  document.addEventListener("visibilitychange", onWake);
  window.addEventListener("focus", onWake);
}

export function stopReminders() {
  if (sweepId) { clearInterval(sweepId); sweepId = null; }
  pending = [];
}

// Build every reminder this person should get. Safe to call often: the list is
// rebuilt from scratch and each occurrence still only ever fires once.
function buildList({ tasks, clients, habits, me }) {
  const now = Date.now();
  const out = [];
  const at9 = (dateStr) => { const d = parseDate(dateStr); d.setHours(9, 0, 0, 0); return d.getTime(); };

  // Sunday at 10:00, to set next week's shifts.
  const sun = new Date();
  sun.setHours(10, 0, 0, 0);
  sun.setDate(sun.getDate() + ((7 - sun.getDay()) % 7));
  let nudge = sun.getTime();
  if (now - nudge > NUDGE_GRACE_MS) nudge += 7 * 86400000;
  out.push({ tag: "weekly-sched", when: nudge, grace: NUDGE_GRACE_MS, title: "Crica", body: "New week ahead. Update your work schedule." });

  (tasks || []).forEach((t) => {
    if (!t.dueDate || t.pool) return;
    if (!(t.assignees || []).includes(me.id)) return;
    if ((t.completed || {})[me.id]) return;
    if (dateDiff(t.dueDate, todayStr()) < 0) return; // already overdue, the in-app bar covers it
    out.push({ tag: "task-" + t.id, when: at9(t.dueDate), title: "Task due", body: `${t.title} is due today` });
  });

  (clients || []).filter((c) => c.active).forEach((c) => {
    out.push({ tag: "inv-" + c.id, when: at9(nextInvoiceDate(c)), title: "Invoice due", body: `Time to invoice ${c.name}` });
  });

  (habits || []).forEach((h) => {
    if (h.ownerId !== me.id || !h.remindAt) return;
    const [hh, mm] = h.remindAt.split(":").map(Number);
    if (Number.isNaN(hh)) return;
    for (let i = 0; i < 3; i++) {
      const dateStr = addDays(todayStr(), i);
      if (i === 0 && (h.completions || {})[dateStr]) continue; // already kept today
      const when = parseDate(dateStr); when.setHours(hh, mm || 0, 0, 0);
      out.push({ tag: "habit-" + h.id + "-" + dateStr, when: when.getTime(), title: "Habit reminder", body: `Time for ${h.name}` });
    }
  });

  return out;
}

export async function scheduleReminders({ tasks, clients, habits, me }) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  if (!me) return;
  pending = buildList({ tasks, clients, habits, me });

  if (triggersSupported()) {
    // Pre-schedule so they fire with Crica closed. Kept for browsers that grow
    // support; nothing ships this today.
    const reg = await getReg();
    if (reg && reg.showNotification) {
      try {
        const existing = await reg.getNotifications({ includeTriggered: true });
        existing.forEach((n) => { if (n.tag && n.tag.startsWith(TAG)) n.close(); });
      } catch (e) { /* ignore */ }
      const now = Date.now();
      pending.forEach((item) => {
        if (!(item.when > now + 5000)) return;
        try {
          reg.showNotification(item.title, {
            icon: "/icon.png", badge: "/icon.png", body: item.body,
            tag: TAG + item.tag, data: { url: "/" },
            showTrigger: new window.TimestampTrigger(item.when),
          });
        } catch (e) { /* ignore */ }
      });
      return;
    }
  }

  wire();
  sweep();
}
