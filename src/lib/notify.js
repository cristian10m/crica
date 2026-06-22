// Fire a browser notification. Uses the service worker in production, which is
// the reliable path on a deployed HTTPS site, and falls back to the basic API.
export async function notify(title, body) {
  try {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const opts = { body, icon: "/icon.png", badge: "/icon.png" };
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && reg.showNotification) { reg.showNotification(title, opts); return; }
    }
    new Notification(title, opts);
  } catch (e) { /* ignore */ }
}
