// Small formatting and id helpers
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
export function hashPw(s) { let h = 5381; for (let i = 0; i < s.length; i++) { h = ((h << 5) + h) + s.charCodeAt(i); h = h >>> 0; } return h.toString(16); }
export const fmtMoney = (n) => "$" + Math.round(n).toLocaleString("en-US");
