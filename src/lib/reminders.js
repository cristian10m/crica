// Background reminders.
// Where the browser supports Notification Triggers (Chrome and Edge, desktop and
// Android), we pre-schedule notifications through the service worker so they fire
// at the right time even when Crica is closed. Where it is not supported (Safari,
// Firefox), this quietly does nothing and the in-app notifications still work while
// a tab is open.
import { todayStr, parseDate, dateDiff } from "./dates";
import { nextInvoiceDate } from "./invoices";

const TAG = "crica-sched-";

export function triggersSupported() {
  try {
    return typeof window !== "undefined" && "Notification" in window &&
      "showTrigger" in Notification.prototype && typeof TimestampTrigger !== "undefined";
  } catch (e) { return false; }
}

async function getReg() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  try { return await navigator.serviceWorker.ready; } catch (e) { return null; }
}

// Reschedule everything from the current data. Safe to call often: matching tags
// replace earlier ones, so reminders never pile up or duplicate.
export async function scheduleReminders({ tasks, clients, me }) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  if (!triggersSupported()) return;
  const reg = await getReg();
  if (!reg || !reg.showNotification) return;

  try {
    const existing = await reg.getNotifications({ includeTriggered: true });
    existing.forEach((n) => { if (n.tag && n.tag.startsWith(TAG)) n.close(); });
  } catch (e) { /* ignore */ }

  const now = Date.now();
  const at9 = (dateStr) => { const d = parseDate(dateStr); d.setHours(9, 0, 0, 0); return d.getTime(); };
  const opts = { icon: "/icon.png", badge: "/icon.png" };

  const put = (tag, when, title, body) => {
    if (!(when > now + 5000)) return; // past or near-now is handled in-app, skip it here
    try {
      reg.showNotification(title, { ...opts, body, tag: TAG + tag, data: { url: "/" }, showTrigger: new TimestampTrigger(when) });
    } catch (e) { /* ignore */ }
  };

  // Daily nudge to review yesterday, at the next 9:00 AM
  const d = new Date(); d.setHours(9, 0, 0, 0);
  let nudge = d.getTime(); if (nudge <= now) nudge += 86400000;
  put("daily", nudge, "Crica", "New day. Take a look at yesterday's results.");

  // Your unfinished tasks, on their due day at 9:00 AM
  (tasks || []).forEach((t) => {
    if (!t.dueDate || t.pool) return;
    if (!(t.assignees || []).includes(me.id)) return;
    if ((t.completed || {})[me.id]) return;
    if (dateDiff(t.dueDate, todayStr()) < 0) return; // already overdue, handled in-app
    put("task-" + t.id, at9(t.dueDate), "Task due", `${t.title} is due ${dateDiff(t.dueDate, todayStr()) === 0 ? "today" : "today"}`);
  });

  // Upcoming invoices, on the invoice day at 9:00 AM
  (clients || []).filter((c) => c.active).forEach((c) => {
    put("inv-" + c.id, at9(nextInvoiceDate(c)), "Invoice due", `Time to invoice ${c.name}`);
  });
}
