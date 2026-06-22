import { BLUE, BLUE_SOFT } from "./constants";

// Confetti burst on a canvas, no dependencies
export function fireConfetti(x, y) {
  if (typeof document === "undefined") return;
  const canvas = document.createElement("canvas");
  Object.assign(canvas.style, { position: "fixed", inset: "0", width: "100%", height: "100%", pointerEvents: "none", zIndex: "9999" });
  canvas.width = window.innerWidth; canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  const colors = [BLUE, BLUE_SOFT, "#FFFFFF", "#1d1d1f", "#FFD60A"];
  const ox = x ?? window.innerWidth / 2, oy = y ?? window.innerHeight / 3;
  const parts = Array.from({ length: 110 }, () => {
    const a = Math.random() * Math.PI * 2, sp = 4 + Math.random() * 9;
    return { x: ox, y: oy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 6, g: 0.22 + Math.random() * 0.1,
      s: 5 + Math.random() * 7, r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.4,
      c: colors[(Math.random() * colors.length) | 0], life: 1 };
  });
  let raf;
  const tick = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    parts.forEach((p) => {
      p.vy += p.g; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.life -= 0.009;
      if (p.life > 0 && p.y < canvas.height + 40) {
        alive = true;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6); ctx.restore();
      }
    });
    if (alive) raf = requestAnimationFrame(tick);
    else canvas.remove();
  };
  raf = requestAnimationFrame(tick);
  setTimeout(() => { cancelAnimationFrame(raf); canvas.remove(); }, 4000);
}
