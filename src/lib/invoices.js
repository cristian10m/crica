import { todayStr, parseDate, toDateStr } from "./dates";

// Next invoice date for an active client (clamped to day 28)
export function nextInvoiceDate(c) {
  if (!c.active) return null;
  const today = todayStr(), d = parseDate(today);
  let cand = new Date(d.getFullYear(), d.getMonth(), Math.min(c.invoiceDay, 28));
  if (toDateStr(cand) < today) cand = new Date(d.getFullYear(), d.getMonth() + 1, Math.min(c.invoiceDay, 28));
  return toDateStr(cand);
}
