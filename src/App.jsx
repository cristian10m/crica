import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { loadKey, saveKey, subscribeKey } from "./storage";
import { firebaseConfigured } from "./firebase";
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  RadialBarChart, RadialBar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  Home, Repeat, CheckSquare, PiggyBank, CalendarDays, Settings, Trophy,
  Plus, X, Check, Trash2, Pencil, GripVertical, Flame, Target, TrendingUp,
  Users, User, LogOut, Lock, Eye, ChevronLeft, ChevronRight, Bell, AlertTriangle,
  Clock, Minus, Building2, Receipt, Crown, Sparkles, Star, Award, Zap, ArrowUp,
  ArrowDown, Filter, Calendar,
} from "lucide-react";

/* ============================================================
   Theme + constants
   ============================================================ */
const BLUE = "#0071E3";
const BLUE_SOFT = "#4DA3FF";

const HABIT_POINTS = 10; // every habit is worth the same, they are all hard to keep
const TASK_IMPORTANCE = {
  low: { label: "Low", points: 5, color: "#86868b" },
  medium: { label: "Medium", points: 10, color: BLUE },
  high: { label: "High", points: 20, color: "#0a5fb8" },
  urgent: { label: "Urgent", points: 35, color: "#1d1d1f" },
};
const HABIT_ICONS = ["dumbbell", "book", "water", "sun", "moon", "run", "code", "phone", "leaf", "coffee", "money", "heart"];
const ICON_GLYPH = {
  dumbbell: "\u{1F3CB}\uFE0F", book: "\u{1F4D6}", water: "\u{1F4A7}", sun: "\u2600\uFE0F",
  moon: "\u{1F319}", run: "\u{1F3C3}", code: "\u{1F4BB}", phone: "\u{1F4DE}",
  leaf: "\u{1F343}", coffee: "\u2615", money: "\u{1F4B0}", heart: "\u2764\uFE0F",
};

/* ============================================================
   Date helpers (local time, YYYY-MM-DD)
   ============================================================ */
const pad = (n) => String(n).padStart(2, "0");
const toDateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseDate = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const todayStr = () => toDateStr(new Date());
const addDays = (s, n) => { const d = parseDate(s); d.setDate(d.getDate() + n); return toDateStr(d); };
const dateDiff = (a, b) => Math.round((parseDate(a) - parseDate(b)) / 86400000);
const monthKey = (s) => s.slice(0, 7);
const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const prettyDate = (s) => { const d = parseDate(s); return `${WEEKDAY[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`; };
const startOfWeek = (s) => { const d = parseDate(s); const day = (d.getDay() + 6) % 7; return addDays(s, -day); }; // Monday start
const weekDates = (anchor) => { const start = startOfWeek(anchor); return Array.from({ length: 7 }, (_, i) => addDays(start, i)); };

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
function hashPw(s) { let h = 5381; for (let i = 0; i < s.length; i++) { h = ((h << 5) + h) + s.charCodeAt(i); h = h >>> 0; } return h.toString(16); }
const fmtMoney = (n) => "$" + Math.round(n).toLocaleString("en-US");

/* ============================================================
   Persistent storage lives in ./storage.js (Firebase + local fallback)
   ============================================================ */

/* ============================================================
   Habit evaluation: 2 chance rule
   miss one day = warning (streak frozen), miss two in a row = reset
   ============================================================ */
function evalHabit(habit, today) {
  const comp = habit.completions || {};
  const created = habit.createdDate || today;
  const completedToday = !!comp[today];
  let streak = 0, misses = 0;
  let cursor = completedToday ? (streak++, addDays(today, -1)) : addDays(today, -1);
  while (dateDiff(cursor, created) >= 0) {
    if (comp[cursor]) { streak++; misses = 0; }
    else { misses++; if (misses >= 2) break; }
    cursor = addDays(cursor, -1);
  }
  let status = "active";
  if (!completedToday) {
    const y = addDays(today, -1), db = addDays(today, -2);
    const missedY = dateDiff(y, created) >= 0 && !comp[y];
    const missedDB = dateDiff(db, created) >= 0 && !comp[db];
    if (missedY && missedDB) status = "broken";
    else if (missedY) status = "warning";
    else status = "pending";
  }
  const everMissed = (() => {
    const days = Object.keys(comp).sort();
    if (!days.length) return false;
    let d = days[0];
    while (dateDiff(today, d) >= 0) { if (!comp[d]) return true; d = addDays(d, 1); }
    return false;
  })();
  return { streak, status, completedToday, everMissed };
}

/* ============================================================
   Points helpers (derived, single source of truth)
   ============================================================ */
function habitPoints(h) { return HABIT_POINTS; }
function taskPoints(t) { return (TASK_IMPORTANCE[t.importance] || TASK_IMPORTANCE.medium).points; }

function pointsInRange(userId, from, to, habits, tasks) {
  let pts = 0;
  habits.filter((h) => h.ownerId === userId).forEach((h) => {
    Object.keys(h.completions || {}).forEach((d) => { if (d >= from && d <= to && h.completions[d]) pts += habitPoints(h); });
  });
  tasks.forEach((t) => { const c = (t.completed || {})[userId]; if (c && c >= from && c <= to) pts += taskPoints(t); });
  return pts;
}
function pointsOnDay(userId, day, habits, tasks) { return pointsInRange(userId, day, day, habits, tasks); }
function totalPoints(userId, habits, tasks) { return pointsInRange(userId, "0000-00-00", "9999-99-99", habits, tasks); }

/* ============================================================
   Confetti (canvas, no deps)
   ============================================================ */
function fireConfetti(x, y) {
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

/* ============================================================
   Animated number
   ============================================================ */
function useCountUp(value, duration = 700) {
  const [display, setDisplay] = useState(value);
  const ref = useRef(value);
  useEffect(() => {
    const start = ref.current, end = value, t0 = performance.now();
    let raf;
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / duration), e = 1 - Math.pow(1 - p, 3);
      setDisplay(start + (end - start) * e);
      if (p < 1) raf = requestAnimationFrame(tick); else ref.current = end;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return display;
}

/* ============================================================
   UI primitives
   ============================================================ */
function Card({ children, className = "", style, ...rest }) {
  return <div className={"card " + className} style={style} {...rest}>{children}</div>;
}
function Btn({ children, variant = "primary", className = "", ...rest }) {
  return <button className={`btn btn-${variant} ${className}`} {...rest}>{children}</button>;
}
function IconBtn({ children, className = "", ...rest }) {
  return <button className={"icon-btn " + className} {...rest}>{children}</button>;
}
function Segmented({ options, value, onChange }) {
  return (
    <div className="segmented">
      {options.map((o) => (
        <button key={o.value} className={"seg " + (value === o.value ? "seg-active" : "")} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
function Modal({ open, onClose, title, children, wide }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={"modal " + (wide ? "modal-wide" : "")} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{title}</h3>
          <IconBtn onClick={onClose}><X size={18} /></IconBtn>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
function Field({ label, children }) {
  return <label className="field"><span className="field-label">{label}</span>{children}</label>;
}
function Ring({ value, size = 64, stroke = 7, color = BLUE, label, sub }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value));
  return (
    <div className="ring-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle className="ring-track" cx={size / 2} cy={size / 2} r={r} stroke="rgba(0,0,0,0.07)" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: "stroke-dashoffset .8s cubic-bezier(.2,.8,.2,1)" }} />
      </svg>
      <div className="ring-center">{label}{sub && <span className="ring-sub">{sub}</span>}</div>
    </div>
  );
}
function Avatar({ user, size = 34 }) {
  if (!user) return null;
  return (
    <div className="avatar" style={{ width: size, height: size, background: user.color, fontSize: size * 0.4 }}>
      {user.name.trim().charAt(0).toUpperCase()}
    </div>
  );
}

/* Wide brand logo (your 16:9 image with the name in it). Keeps aspect ratio. */
function WideLogo({ height = 28 }) {
  const [err, setErr] = useState(false);
  if (err) return <IconMark size={height} radius={Math.round(height * 0.3)} />;
  return (
    <img src="/logo.png" alt="Crica" onError={() => setErr(true)}
      style={{ height, width: "auto", maxWidth: "100%", display: "block" }} />
  );
}

/* Square mark (favicon / loading / notifications). Falls back to a crown. */
function IconMark({ size = 56, radius = 14 }) {
  const [err, setErr] = useState(false);
  if (err) {
    return (
      <div className="logo-fallback" style={{ width: size, height: size, borderRadius: radius }}>
        <Crown size={Math.round(size * 0.55)} />
      </div>
    );
  }
  return (
    <img src="/icon.png" alt="Crica" onError={() => setErr(true)}
      style={{ width: size, height: size, borderRadius: radius, objectFit: "cover", display: "block" }} />
  );
}

/* Fire a browser notification. Uses the service worker in production, which is
   the reliable path on a deployed HTTPS site, and falls back to the basic API. */
async function notify(title, body) {
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

/* ============================================================
   Drag to reorder (pointer events, works on touch + mouse)
   ============================================================ */
function DraggableList({ items, getKey, onReorder, renderItem }) {
  const [list, setList] = useState(items);
  const dragging = useRef(false);
  const [dragKey, setDragKey] = useState(null);
  const containerRef = useRef(null);
  useEffect(() => { if (!dragging.current) setList(items); }, [items]);

  const down = (e, key) => {
    dragging.current = true; setDragKey(key);
    try { containerRef.current.setPointerCapture(e.pointerId); } catch (er) {}
  };
  const move = (e) => {
    if (!dragging.current || dragKey == null || !containerRef.current) return;
    const rows = Array.from(containerRef.current.children);
    const y = e.clientY;
    let target = list.findIndex((i) => getKey(i) === dragKey);
    for (let i = 0; i < rows.length; i++) {
      const rect = rows[i].getBoundingClientRect();
      if (y >= rect.top && y <= rect.bottom) { target = i; break; }
      if (i === 0 && y < rect.top) target = 0;
      if (i === rows.length - 1 && y > rect.bottom) target = rows.length - 1;
    }
    const cur = list.findIndex((i) => getKey(i) === dragKey);
    if (target >= 0 && target !== cur) {
      const next = list.slice(); const [m] = next.splice(cur, 1); next.splice(target, 0, m); setList(next);
    }
  };
  const up = () => { if (!dragging.current) return; dragging.current = false; setDragKey(null); onReorder(list); };

  return (
    <div ref={containerRef} className="drag-list" onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
      {list.map((item) => (
        <div key={getKey(item)} className={"drag-row " + (dragKey === getKey(item) ? "is-dragging" : "")}>
          {renderItem(item, { handle: { onPointerDown: (e) => down(e, getKey(item)), style: { touchAction: "none" }, className: "drag-handle" } })}
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   Setup + Login
   ============================================================ */
function SetupScreen({ onComplete }) {
  const [u1, setU1] = useState({ name: "", password: "", color: BLUE });
  const [u2, setU2] = useState({ name: "", password: "", color: "#1d1d1f" });
  const [err, setErr] = useState("");
  const colors = [BLUE, "#1d1d1f", "#0a5fb8", "#34C759", "#FF9500", "#AF52DE", "#FF2D55", "#5AC8FA"];
  const submit = () => {
    if (!u1.name.trim() || !u2.name.trim()) return setErr("Both founders need a name.");
    if (u1.password.length < 3 || u2.password.length < 3) return setErr("Passwords need at least 3 characters.");
    onComplete([
      { id: uid(), name: u1.name.trim(), color: u1.color, pw: hashPw(u1.password) },
      { id: uid(), name: u2.name.trim(), color: u2.color, pw: hashPw(u2.password) },
    ]);
  };
  const picker = (u, setU) => (
    <div className="color-row">
      {colors.map((c) => (
        <button key={c} className={"swatch " + (u.color === c ? "swatch-on" : "")} style={{ background: c }} onClick={() => setU({ ...u, color: c })} />
      ))}
    </div>
  );
  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="brand-wrap"><WideLogo height={46} /></div>
        <h1 className="auth-title">Set up Crica</h1>
        <p className="auth-sub">Two founders, one scoreboard. Create both accounts to begin.</p>
        <div className="setup-grid">
          <div className="setup-col">
            <div className="setup-tag">Founder 1</div>
            <Field label="Name"><input value={u1.name} onChange={(e) => setU1({ ...u1, name: e.target.value })} placeholder="e.g. Alex" /></Field>
            <Field label="Password"><input type="password" value={u1.password} onChange={(e) => setU1({ ...u1, password: e.target.value })} /></Field>
            <span className="field-label">Color</span>{picker(u1, setU1)}
          </div>
          <div className="setup-col">
            <div className="setup-tag">Founder 2</div>
            <Field label="Name"><input value={u2.name} onChange={(e) => setU2({ ...u2, name: e.target.value })} placeholder="e.g. Sam" /></Field>
            <Field label="Password"><input type="password" value={u2.password} onChange={(e) => setU2({ ...u2, password: e.target.value })} /></Field>
            <span className="field-label">Color</span>{picker(u2, setU2)}
          </div>
        </div>
        {err && <div className="auth-err">{err}</div>}
        <Btn className="full" onClick={submit}>Create accounts</Btn>
      </div>
    </div>
  );
}

function LoginScreen({ users, onLogin }) {
  const [selected, setSelected] = useState(null);
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const go = () => {
    if (!selected) return;
    if (hashPw(pw) === selected.pw) onLogin(selected.id);
    else setErr("Wrong password.");
  };
  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="brand-wrap"><WideLogo height={46} /></div>
        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-sub">Pick your account to log in.</p>
        <div className="login-users">
          {users.map((u) => (
            <button key={u.id} className={"login-user " + (selected?.id === u.id ? "login-user-on" : "")} onClick={() => { setSelected(u); setErr(""); setPw(""); }}>
              <Avatar user={u} size={48} /><span>{u.name}</span>
            </button>
          ))}
        </div>
        {selected && (
          <>
            <Field label={`Password for ${selected.name}`}>
              <input type="password" autoFocus value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()} />
            </Field>
            {err && <div className="auth-err">{err}</div>}
            <Btn className="full" onClick={go}><Lock size={16} /> Log in</Btn>
          </>
        )}
      </div>
    </div>
  );
}

function DbErrorScreen({ kind }) {
  const notConfigured = kind === "notconfigured";
  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="brand-wrap"><IconMark size={56} radius={17} /></div>
        <h1 className="auth-title">Cannot reach the database</h1>
        {notConfigured ? (
          <p className="auth-sub">Firebase is not set up in <b>src/firebase.js</b>, so there is nothing to sync to. Add the config and redeploy.</p>
        ) : (
          <p className="auth-sub">Crica connects to your Firebase Realtime Database to keep both of you in sync. It did not respond. This usually means the database has not been created yet, or its rules are blocking access.</p>
        )}
        {!notConfigured && (
          <div className="db-help">
            <div className="legend-line"><span>1. Realtime Database exists and is enabled</span></div>
            <div className="legend-line"><span>2. Rules allow read and write</span></div>
            <div className="legend-line"><span>3. The databaseURL in firebase.js is correct</span></div>
          </div>
        )}
        <Btn className="full" onClick={() => window.location.reload()}>Try again</Btn>
      </div>
    </div>
  );
}
function AlertBar({ alerts }) {
  if (!alerts.length) return null;
  return (
    <div className="alert-bar">
      <Bell size={15} />
      <div className="alert-track">
        {alerts.map((a, i) => (
          <span key={i} className="alert-item">{a.icon}{a.text}</span>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   Dashboard
   ============================================================ */
function StatTile({ icon, label, value, accent }) {
  return (
    <Card className="stat-tile">
      <div className="stat-ic" style={{ color: accent || BLUE }}>{icon}</div>
      <div className="stat-val">{value}</div>
      <div className="stat-lab">{label}</div>
    </Card>
  );
}

function Dashboard({ users, me, habits, tasks, finance }) {
  const [anchor, setAnchor] = useState(todayStr());
  const week = useMemo(() => weekDates(anchor), [anchor]);
  const isCurrentWeek = startOfWeek(anchor) === startOfWeek(todayStr());

  const chartData = week.map((d) => {
    const row = { day: WEEKDAY[parseDate(d).getDay()], date: d };
    users.forEach((u, i) => { row["u" + i] = pointsOnDay(u.id, d, habits, tasks); });
    return row;
  });

  const weekFrom = week[0], weekTo = week[6];
  const weekPoints = users.map((u) => pointsInRange(u.id, weekFrom, weekTo, habits, tasks));
  const allTime = users.map((u) => totalPoints(u.id, habits, tasks));

  const tasksDoneWeek = users.map((u) => tasks.filter((t) => { const c = (t.completed || {})[u.id]; return c && c >= weekFrom && c <= weekTo; }).length);

  const habitDoneWeek = users.map((u) => {
    let total = 0, done = 0;
    habits.filter((h) => h.ownerId === u.id).forEach((h) => {
      week.forEach((d) => { if (dateDiff(d, todayStr()) <= 0 && dateDiff(d, h.createdDate || d) >= 0) { total++; if ((h.completions || {})[d]) done++; } });
    });
    return total ? done / total : 0;
  });

  const myStreaks = habits.filter((h) => h.ownerId === me.id).map((h) => evalHabit(h, todayStr()).streak);
  const bestStreak = myStreaks.length ? Math.max(...myStreaks) : 0;

  const month = monthKey(todayStr());
  const monthIncome = (finance.transactions || []).filter((t) => t.type === "in" && monthKey(t.date) === month).reduce((s, t) => s + t.amount, 0);

  const leader = weekPoints[0] === weekPoints[1] ? null : (weekPoints[0] > weekPoints[1] ? 0 : 1);
  const myIdx = users.findIndex((u) => u.id === me.id);

  const splitData = users.map((u, i) => ({ name: u.name, value: Math.max(weekPoints[i], 0.001), color: u.color }));

  const achievements = useMemo(() => {
    const list = [];
    if (bestStreak >= 7) list.push({ icon: <Flame size={16} />, t: "7 day streak" });
    if (bestStreak >= 30) list.push({ icon: <Crown size={16} />, t: "30 day streak" });
    if (allTime[myIdx] >= 100) list.push({ icon: <Star size={16} />, t: "100 points" });
    if (allTime[myIdx] >= 500) list.push({ icon: <Award size={16} />, t: "500 points" });
    if (tasksDoneWeek[myIdx] >= 10) list.push({ icon: <Zap size={16} />, t: "10 tasks this week" });
    if (leader === myIdx) list.push({ icon: <Trophy size={16} />, t: "Leading this week" });
    return list;
  }, [bestStreak, allTime, tasksDoneWeek, leader, myIdx]);

  return (
    <div className="page">
      <PageHead title="Dashboard" subtitle={isCurrentWeek ? "This week" : `${prettyDate(weekFrom)} to ${prettyDate(weekTo)}`}>
        <div className="week-nav">
          <IconBtn onClick={() => setAnchor(addDays(anchor, -7))}><ChevronLeft size={18} /></IconBtn>
          <IconBtn disabled={isCurrentWeek} onClick={() => setAnchor(addDays(anchor, 7))}><ChevronRight size={18} /></IconBtn>
        </div>
      </PageHead>

      {/* Head to head */}
      <Card className="vs-card">
        <div className="vs-side">
          <Avatar user={users[0]} size={44} />
          <div className="vs-name">{users[0].name}</div>
          <div className="vs-points" style={{ color: users[0].color }}>{Math.round(useCountUp(weekPoints[0]))}</div>
          <div className="vs-lab">points</div>
        </div>
        <div className="vs-mid">
          {leader === null ? <span className="vs-tie">TIED</span> : <Crown size={22} style={{ color: BLUE }} />}
          <span className="vs-vs">VS</span>
        </div>
        <div className="vs-side">
          <Avatar user={users[1]} size={44} />
          <div className="vs-name">{users[1].name}</div>
          <div className="vs-points" style={{ color: users[1].color }}>{Math.round(useCountUp(weekPoints[1]))}</div>
          <div className="vs-lab">points</div>
        </div>
      </Card>

      <div className="stat-grid">
        <StatTile icon={<CheckSquare size={18} />} label="Your tasks this week" value={tasksDoneWeek[myIdx]} />
        <StatTile icon={<Flame size={18} />} label="Best streak" value={bestStreak} accent="#FF9500" />
        <StatTile icon={<TrendingUp size={18} />} label="Your points (all time)" value={allTime[myIdx]} />
        <StatTile icon={<PiggyBank size={18} />} label="Income this month" value={fmtMoney(monthIncome)} accent="#34C759" />
      </div>

      <Card>
        <div className="card-title">Points per day</div>
        <div style={{ width: "100%", height: 220 }}>
          <ResponsiveContainer>
            <BarChart data={chartData} barGap={4}>
              <CartesianGrid vertical={false} stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#86868b" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#86868b" }} axisLine={false} tickLine={false} width={28} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(0,113,227,0.06)" }} />
              <Bar dataKey="u0" name={users[0].name} fill={users[0].color} radius={[5, 5, 0, 0]} />
              <Bar dataKey="u1" name={users[1].name} fill={users[1].color} radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="two-col">
        <Card>
          <div className="card-title">Points split</div>
          <div style={{ width: "100%", height: 180 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={splitData} dataKey="value" innerRadius={45} outerRadius={70} paddingAngle={3} stroke="none">
                  {splitData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="legend">
            {users.map((u, i) => <span key={u.id} className="legend-item"><i style={{ background: u.color }} />{u.name} {weekPoints[i]}</span>)}
          </div>
        </Card>
        <Card className="habit-rate-card">
          <div className="card-title">Habit consistency</div>
          <div className="rate-rings">
            {users.map((u, i) => (
              <div key={u.id} className="rate-ring">
                <Ring value={habitDoneWeek[i]} size={92} stroke={9} color={u.color}
                  label={<span className="ring-pct">{Math.round(habitDoneWeek[i] * 100)}%</span>} />
                <span className="rate-name">{u.name}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {achievements.length > 0 && (
        <Card>
          <div className="card-title">Your badges</div>
          <div className="badge-row">
            {achievements.map((a, i) => <span key={i} className="badge"><span className="badge-ic">{a.icon}</span>{a.t}</span>)}
          </div>
        </Card>
      )}
    </div>
  );
}

const tooltipStyle = { background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, fontSize: 12, color: "var(--ink)", boxShadow: "var(--shadow)" };

function PageHead({ title, subtitle, children }) {
  return (
    <div className="page-head">
      <div><h2 className="page-title">{title}</h2>{subtitle && <div className="page-sub">{subtitle}</div>}</div>
      {children}
    </div>
  );
}

/* ============================================================
   Habits
   ============================================================ */
function HabitsTab({ users, me, habits, setHabits }) {
  const partner = users.find((u) => u.id !== me.id);
  const [modal, setModal] = useState(null); // null | "new" | habit object
  const myHabits = habits.filter((h) => h.ownerId === me.id).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const partnerHabits = habits.filter((h) => h.ownerId === partner.id).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const toggleToday = (habit, e) => {
    const t = todayStr();
    const comp = { ...(habit.completions || {}) };
    const wasDone = !!comp[t];
    if (wasDone) delete comp[t]; else comp[t] = true;
    setHabits(habits.map((h) => h.id === habit.id ? { ...h, completions: comp } : h));
    if (!wasDone) {
      const rect = e?.currentTarget?.getBoundingClientRect();
      fireConfetti(rect ? rect.left + rect.width / 2 : undefined, rect ? rect.top : undefined);
    }
  };
  const saveHabit = (data) => {
    if (data.id) setHabits(habits.map((h) => h.id === data.id ? { ...h, ...data } : h));
    else setHabits([...habits, { id: uid(), ownerId: me.id, createdDate: todayStr(), completions: {}, order: myHabits.length, ...data }]);
    setModal(null);
  };
  const removeHabit = (id) => { setHabits(habits.filter((h) => h.id !== id)); setModal(null); };
  const reorder = (newList) => {
    const map = {}; newList.forEach((h, i) => map[h.id] = i);
    setHabits(habits.map((h) => h.id in map ? { ...h, order: map[h.id] } : h));
  };

  return (
    <div className="page">
      <PageHead title="Habits" subtitle="Two strikes and it resets. Keep the chain alive.">
        <Btn onClick={() => setModal("new")}><Plus size={16} /> New habit</Btn>
      </PageHead>

      {myHabits.length === 0 && (
        <Card className="empty"><Repeat size={26} /><div>No habits yet. Add your first one to start a streak.</div></Card>
      )}

      <DraggableList items={myHabits} getKey={(h) => h.id} onReorder={reorder} renderItem={(h, ctx) => {
        const ev = evalHabit(h, todayStr());
        return (
          <Card className={"habit-card " + (ev.completedToday ? "habit-done" : "")}>
            <button className="drag-handle" {...ctx.handle}><GripVertical size={18} /></button>
            <button className={"habit-check " + (ev.completedToday ? "on" : "")} onClick={(e) => toggleToday(h, e)} style={ev.completedToday ? { background: me.color, borderColor: me.color } : {}}>
              {ev.completedToday && <Check size={18} />}
            </button>
            <div className="habit-main" onClick={() => setModal(h)}>
              <div className="habit-name">{ICON_GLYPH[h.icon] || "\u2B50"} {h.name}</div>
              <div className="habit-meta">
                <span className="chip"><Flame size={12} /> {ev.streak} day{ev.streak === 1 ? "" : "s"}</span>
                <span className="chip">+{habitPoints(h)} pts</span>
                {ev.status === "warning" && <span className="chip warn"><AlertTriangle size={12} /> 1 chance left today</span>}
                {ev.status === "broken" && !ev.completedToday && <span className="chip danger">Streak reset</span>}
              </div>
            </div>
          </Card>
        );
      }} />

      {/* Partner, censored */}
      <div className="partner-head"><Eye size={15} /> {partner.name}'s habits <span className="locked-note">names hidden</span></div>
      {partnerHabits.length === 0 && <div className="muted-small">No habits to compare yet.</div>}
      {partnerHabits.map((h) => {
        const ev = evalHabit(h, todayStr());
        return (
          <Card key={h.id} className="habit-card censored">
            <div className="censored-name"><span className="blurred">{h.name}</span></div>
            <div className="censored-stats">
              <span className="chip"><Flame size={12} /> {ev.streak}</span>
              <span className={"dot " + (ev.completedToday ? "dot-on" : "")} title={ev.completedToday ? "Done today" : "Not done today"} style={ev.completedToday ? { background: partner.color } : {}} />
              {ev.everMissed && <span className="chip danger-soft">missed before</span>}
            </div>
          </Card>
        );
      })}

      <HabitModal open={modal !== null} habit={modal === "new" ? null : modal} onClose={() => setModal(null)} onSave={saveHabit} onDelete={removeHabit} />
    </div>
  );
}

function HabitModal({ open, habit, onClose, onSave, onDelete }) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("dumbbell");
  useEffect(() => {
    if (open) { setName(habit?.name || ""); setIcon(habit?.icon || "dumbbell"); }
  }, [open, habit]);
  return (
    <Modal open={open} onClose={onClose} title={habit ? "Edit habit" : "New habit"}>
      <Field label="Habit name"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Gym, Read 20 min" autoFocus /></Field>
      <span className="field-label">Icon</span>
      <div className="icon-grid">
        {HABIT_ICONS.map((ic) => (
          <button key={ic} className={"icon-pick " + (icon === ic ? "on" : "")} onClick={() => setIcon(ic)}>{ICON_GLYPH[ic]}</button>
        ))}
      </div>
      <p className="muted-small" style={{ marginTop: 10 }}>Every habit kept is worth <b>+{HABIT_POINTS}</b> points for the day. They are all hard to keep, so they all count the same.</p>
      <div className="modal-actions">
        {habit && <Btn variant="ghost-danger" onClick={() => onDelete(habit.id)}><Trash2 size={16} /> Delete</Btn>}
        <Btn variant="primary" onClick={() => name.trim() && onSave({ ...(habit || {}), name: name.trim(), icon })}>Save</Btn>
      </div>
    </Modal>
  );
}

/* ============================================================
   Tasks
   ============================================================ */
function TasksTab({ users, me, tasks, setTasks, clients }) {
  const [board, setBoard] = useState(me.id);
  const [filter, setFilter] = useState("active");
  const [modal, setModal] = useState(null); // null | "new" | task
  const boardUser = users.find((u) => u.id === board);
  const isMine = board === me.id;

  const visible = tasks
    .filter((t) => (t.assignees || []).includes(board))
    .filter((t) => {
      const done = !!(t.completed || {})[board];
      return filter === "all" ? true : filter === "done" ? done : !done;
    })
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const completeTask = (task, e) => {
    const done = !!(task.completed || {})[board];
    const comp = { ...(task.completed || {}) };
    if (done) delete comp[board]; else comp[board] = todayStr();
    setTasks(tasks.map((t) => t.id === task.id ? { ...t, completed: comp } : t));
    if (!done) { const r = e?.currentTarget?.getBoundingClientRect(); fireConfetti(r ? r.left + r.width / 2 : undefined, r ? r.top : undefined); }
  };
  const saveTask = (data) => {
    if (data.id) setTasks(tasks.map((t) => t.id === data.id ? { ...t, ...data } : t));
    else setTasks([...tasks, { id: uid(), creatorId: me.id, createdDate: todayStr(), completed: {}, order: tasks.length, ...data }]);
    setModal(null);
  };
  const removeTask = (id) => { setTasks(tasks.filter((t) => t.id !== id)); setModal(null); };
  const reorder = (newList) => {
    const map = {}; newList.forEach((t, i) => map[t.id] = i);
    setTasks(tasks.map((t) => t.id in map ? { ...t, order: map[t.id] } : t));
  };

  return (
    <div className="page">
      <PageHead title="Tasks" subtitle="Assign work, earn points, settle the score.">
        <Btn onClick={() => setModal("new")}><Plus size={16} /> Add task</Btn>
      </PageHead>

      <Segmented value={board} onChange={setBoard} options={users.map((u) => ({ value: u.id, label: u.id === me.id ? "My board" : u.name }))} />
      <div className="filter-row">
        <Filter size={14} />
        {["active", "done", "all"].map((f) => (
          <button key={f} className={"text-pill " + (filter === f ? "on" : "")} onClick={() => setFilter(f)}>{f[0].toUpperCase() + f.slice(1)}</button>
        ))}
      </div>

      {visible.length === 0 && <Card className="empty"><CheckSquare size={26} /><div>Nothing here. {filter === "done" ? "No tasks completed yet." : "Add a task to get going."}</div></Card>}

      <DraggableList items={visible} getKey={(t) => t.id} onReorder={reorder} renderItem={(t, ctx) => {
        const done = !!(t.completed || {})[board];
        const imp = TASK_IMPORTANCE[t.importance] || TASK_IMPORTANCE.medium;
        const client = clients.find((c) => c.id === t.clientId);
        const creator = users.find((u) => u.id === t.creatorId);
        const both = (t.assignees || []).length > 1;
        const dueSoon = t.dueDate && !done && dateDiff(t.dueDate, todayStr()) <= 1;
        return (
          <Card className={"task-card " + (done ? "task-done" : "")}>
            <button className="drag-handle" {...ctx.handle}><GripVertical size={18} /></button>
            <button className={"task-check " + (done ? "on" : "")} onClick={(e) => completeTask(t, e)} style={done ? { background: boardUser.color, borderColor: boardUser.color } : {}}>
              {done && <Check size={16} />}
            </button>
            <div className="task-main" onClick={() => setModal(t)}>
              <div className="task-title">{t.title}</div>
              <div className="task-meta">
                <span className="chip" style={{ color: imp.color, borderColor: imp.color + "55" }}>{imp.label} +{imp.points}</span>
                {client && <span className="chip"><Building2 size={11} /> {client.name}</span>}
                {both && <span className="chip"><Users size={11} /> Both</span>}
                {t.dueDate && <span className={"chip " + (dueSoon ? "warn" : "")}><Clock size={11} /> {prettyDate(t.dueDate)}</span>}
              </div>
              {t.creatorId !== board && creator && <div className="added-by">Added by {creator.name}</div>}
            </div>
          </Card>
        );
      }} />

      <TaskModal open={modal !== null} task={modal === "new" ? null : modal} users={users} me={me} clients={clients}
        onClose={() => setModal(null)} onSave={saveTask} onDelete={removeTask} />
    </div>
  );
}

function TaskModal({ open, task, users, me, clients, onClose, onSave, onDelete }) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [assignees, setAssignees] = useState([me.id]);
  const [clientId, setClientId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [importance, setImportance] = useState("medium");
  useEffect(() => {
    if (open) {
      setTitle(task?.title || ""); setNotes(task?.notes || "");
      setAssignees(task?.assignees || [me.id]); setClientId(task?.clientId || "");
      setDueDate(task?.dueDate || ""); setImportance(task?.importance || "medium");
    }
  }, [open, task]);
  const toggleAssignee = (id) => setAssignees((a) => a.includes(id) ? (a.length > 1 ? a.filter((x) => x !== id) : a) : [...a, id]);
  return (
    <Modal open={open} onClose={onClose} title={task ? "Edit task" : "New task"}>
      <Field label="Task"><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs doing?" autoFocus /></Field>
      <Field label="Notes (optional)"><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Details, links, context" /></Field>
      <span className="field-label">Assign to</span>
      <div className="seg-pills">
        {users.map((u) => (
          <button key={u.id} className={"pill " + (assignees.includes(u.id) ? "pill-on" : "")} onClick={() => toggleAssignee(u.id)}>
            <Avatar user={u} size={18} /> {u.name}
          </button>
        ))}
        <button className={"pill " + (assignees.length === users.length ? "pill-on" : "")} onClick={() => setAssignees(users.map((u) => u.id))}>
          <Users size={14} /> Both
        </button>
      </div>
      <div className="grid-2">
        <Field label="Client (optional)">
          <select value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">None / general</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Due date"><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></Field>
      </div>
      <span className="field-label">Importance (sets points)</span>
      <div className="seg-pills">
        {Object.entries(TASK_IMPORTANCE).map(([k, v]) => (
          <button key={k} className={"pill " + (importance === k ? "pill-on" : "")} onClick={() => setImportance(k)} style={importance === k ? { borderColor: v.color, color: v.color } : {}}>
            {v.label} <b>+{v.points}</b>
          </button>
        ))}
      </div>
      <div className="modal-actions">
        {task && <Btn variant="ghost-danger" onClick={() => onDelete(task.id)}><Trash2 size={16} /> Delete</Btn>}
        <Btn onClick={() => title.trim() && onSave({ ...(task || {}), title: title.trim(), notes, assignees, clientId: clientId || null, dueDate: dueDate || null, importance })}>Save</Btn>
      </div>
    </Modal>
  );
}

/* ============================================================
   Shared / Vault
   ============================================================ */
function VaultJar({ pct }) {
  const fillH = Math.max(0, Math.min(1, pct)) * 150;
  return (
    <div className="jar-wrap">
      <svg viewBox="0 0 200 220" className="jar-svg">
        <defs>
          <clipPath id="jarClip"><path d="M40 40 Q40 30 50 30 L150 30 Q160 30 160 40 L156 190 Q156 200 146 200 L54 200 Q44 200 44 190 Z" /></clipPath>
          <linearGradient id="liquid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={BLUE_SOFT} /><stop offset="100%" stopColor={BLUE} />
          </linearGradient>
        </defs>
        <g clipPath="url(#jarClip)">
          <rect x="30" y="30" width="140" height="180" fill="#f0f3f8" />
          <g style={{ transform: `translateY(${190 - fillH}px)`, transition: "transform 1s cubic-bezier(.2,.8,.2,1)" }}>
            <path className="wave" d="M20 12 Q50 0 80 12 T140 12 T200 12 V120 H20 Z" fill="url(#liquid)" transform="translate(0,-6)" />
            <rect x="20" y="12" width="180" height="200" fill="url(#liquid)" />
          </g>
        </g>
        <path d="M40 40 Q40 30 50 30 L150 30 Q160 30 160 40 L156 190 Q156 200 146 200 L54 200 Q44 200 44 190 Z" fill="none" stroke="#1d1d1f" strokeWidth="3.5" />
        <rect x="62" y="20" width="76" height="14" rx="6" fill="#1d1d1f" />
      </svg>
    </div>
  );
}

function VaultTab({ finance, setFinance, clients, setClients }) {
  const [moneyModal, setMoneyModal] = useState(null); // null | "in" | "out"
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [goalModal, setGoalModal] = useState(null); // null | "vault" | "month"
  const [goalVal, setGoalVal] = useState("");
  const [clientModal, setClientModal] = useState(null); // null | "new" | client

  const vault = finance.vault || { current: 0, target: 50000 };
  const monthTarget = finance.monthTarget || 10000;
  const month = monthKey(todayStr());
  const monthIncome = (finance.transactions || []).filter((t) => t.type === "in" && monthKey(t.date) === month).reduce((s, t) => s + t.amount, 0);
  const pct = vault.target > 0 ? vault.current / vault.target : 0;
  const displayVault = Math.round(useCountUp(vault.current));
  const displayMonth = Math.round(useCountUp(monthIncome));

  const applyMoney = () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;
    const type = moneyModal;
    const tx = { id: uid(), date: todayStr(), amount: amt, type, note: note.trim() };
    const newCurrent = type === "in" ? vault.current + amt : Math.max(0, vault.current - amt);
    setFinance({ ...finance, vault: { ...vault, current: newCurrent }, transactions: [tx, ...(finance.transactions || [])] });
    if (type === "in") setTimeout(() => fireConfetti(window.innerWidth / 2, window.innerHeight / 2.5), 120);
    setMoneyModal(null); setAmount(""); setNote("");
  };
  const saveGoal = () => {
    const v = parseFloat(goalVal); if (!v || v <= 0) return;
    if (goalModal === "vault") setFinance({ ...finance, vault: { ...vault, target: v } });
    else setFinance({ ...finance, monthTarget: v });
    setGoalModal(null); setGoalVal("");
  };

  const saveClient = (data) => {
    if (data.id) setClients(clients.map((c) => c.id === data.id ? { ...c, ...data } : c));
    else setClients([...clients, { id: uid(), active: true, lastInvoiced: null, ...data }]);
    setClientModal(null);
  };
  const removeClient = (id) => { setClients(clients.filter((c) => c.id !== id)); setClientModal(null); };
  const markPaid = (c) => {
    const tx = { id: uid(), date: todayStr(), amount: c.monthlyAmount, type: "in", note: `${c.name} payment`, clientId: c.id };
    setFinance({ ...finance, vault: { ...vault, current: vault.current + c.monthlyAmount }, transactions: [tx, ...(finance.transactions || [])] });
    setClients(clients.map((x) => x.id === c.id ? { ...x, lastInvoiced: todayStr() } : x));
    setTimeout(() => fireConfetti(window.innerWidth / 2, window.innerHeight / 2.5), 100);
  };

  const recurring = clients.filter((c) => c.active).reduce((s, c) => s + (c.monthlyAmount || 0), 0);

  return (
    <div className="page">
      <PageHead title="Company" subtitle="The company pot, the income, the clients." />

      {/* Vault */}
      <Card className="vault-card">
        <div className="vault-head">
          <div>
            <div className="card-title" style={{ marginBottom: 2 }}>Company vault</div>
            <button className="goal-edit" onClick={() => { setGoalVal(String(vault.target)); setGoalModal("vault"); }}>
              Goal {fmtMoney(vault.target)} <Pencil size={12} />
            </button>
          </div>
          <div className="vault-amount">{fmtMoney(displayVault)}</div>
        </div>
        <VaultJar pct={pct} />
        <div className="vault-pct-bar"><div className="vault-pct-fill" style={{ width: `${Math.min(100, pct * 100)}%` }} /></div>
        <div className="vault-pct-label">{Math.round(pct * 100)}% of {fmtMoney(vault.target)}</div>
        <div className="vault-actions">
          <Btn variant="soft" onClick={() => setMoneyModal("in")}><Plus size={16} /> Add money</Btn>
          <Btn variant="ghost" onClick={() => setMoneyModal("out")}><Minus size={16} /> Remove</Btn>
        </div>
      </Card>

      {/* Monthly income */}
      <Card>
        <div className="month-head">
          <div className="card-title">Income this month</div>
          <button className="goal-edit" onClick={() => { setGoalVal(String(monthTarget)); setGoalModal("month"); }}>
            Target {fmtMoney(monthTarget)} <Pencil size={12} />
          </button>
        </div>
        <div className="month-amount">{fmtMoney(displayMonth)}</div>
        <div className="month-bar"><div className="month-fill" style={{ width: `${Math.min(100, monthTarget ? monthIncome / monthTarget * 100 : 0)}%` }} /></div>
        <div className="month-sub">
          <span>{Math.round(monthTarget ? monthIncome / monthTarget * 100 : 0)}% of target</span>
          <span>{fmtMoney(recurring)}/mo recurring</span>
        </div>
      </Card>

      {/* Clients */}
      <div className="section-head">
        <h3>Clients</h3>
        <Btn variant="soft" onClick={() => setClientModal("new")}><Plus size={16} /> Add client</Btn>
      </div>
      {clients.length === 0 && <Card className="empty"><Building2 size={26} /><div>No clients yet. Add one to track retainers and invoice days.</div></Card>}
      {clients.map((c) => {
        const next = nextInvoiceDate(c);
        const dueIn = next ? dateDiff(next, todayStr()) : null;
        return (
          <Card key={c.id} className="client-card">
            <div className="client-dot" style={{ background: c.active ? BLUE : "#c7c7cc" }} />
            <div className="client-main" onClick={() => setClientModal(c)}>
              <div className="client-name">{c.name}{!c.active && <span className="muted-small"> (paused)</span>}</div>
              <div className="client-meta">
                <span className="chip"><PiggyBank size={11} /> {fmtMoney(c.monthlyAmount)}/mo</span>
                <span className="chip"><Receipt size={11} /> Invoice day {c.invoiceDay}</span>
                {dueIn != null && c.active && <span className={"chip " + (dueIn <= 2 ? "warn" : "")}>{dueIn <= 0 ? "Invoice due" : `Invoice in ${dueIn}d`}</span>}
              </div>
            </div>
            {c.active && <Btn variant="soft" className="paid-btn" onClick={() => markPaid(c)}>Mark paid</Btn>}
          </Card>
        );
      })}

      {/* Money modal */}
      <Modal open={moneyModal !== null} onClose={() => setMoneyModal(null)} title={moneyModal === "in" ? "Add money to vault" : "Remove money"}>
        <Field label="Amount"><input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" autoFocus /></Field>
        <Field label="Note (optional)"><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Client retainer" /></Field>
        <div className="modal-actions"><Btn onClick={applyMoney}>{moneyModal === "in" ? "Add" : "Remove"}</Btn></div>
      </Modal>

      {/* Goal modal */}
      <Modal open={goalModal !== null} onClose={() => setGoalModal(null)} title={goalModal === "vault" ? "Vault goal" : "Monthly target"}>
        <Field label="Amount"><input type="number" inputMode="decimal" value={goalVal} onChange={(e) => setGoalVal(e.target.value)} autoFocus /></Field>
        <div className="modal-actions"><Btn onClick={saveGoal}>Save goal</Btn></div>
      </Modal>

      <ClientModal open={clientModal !== null} client={clientModal === "new" ? null : clientModal} onClose={() => setClientModal(null)} onSave={saveClient} onDelete={removeClient} />
    </div>
  );
}

function nextInvoiceDate(c) {
  if (!c.active) return null;
  const today = todayStr(), d = parseDate(today);
  let cand = new Date(d.getFullYear(), d.getMonth(), Math.min(c.invoiceDay, 28));
  if (toDateStr(cand) < today) cand = new Date(d.getFullYear(), d.getMonth() + 1, Math.min(c.invoiceDay, 28));
  return toDateStr(cand);
}

function ClientModal({ open, client, onClose, onSave, onDelete }) {
  const [name, setName] = useState("");
  const [monthlyAmount, setMonthlyAmount] = useState("");
  const [invoiceDay, setInvoiceDay] = useState("1");
  const [active, setActive] = useState(true);
  useEffect(() => {
    if (open) { setName(client?.name || ""); setMonthlyAmount(client ? String(client.monthlyAmount) : ""); setInvoiceDay(String(client?.invoiceDay || 1)); setActive(client ? client.active : true); }
  }, [open, client]);
  return (
    <Modal open={open} onClose={onClose} title={client ? "Edit client" : "Add client"}>
      <Field label="Client name"><input value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="e.g. Northwind Co" /></Field>
      <div className="grid-2">
        <Field label="Monthly pay"><input type="number" inputMode="decimal" value={monthlyAmount} onChange={(e) => setMonthlyAmount(e.target.value)} placeholder="0" /></Field>
        <Field label="Invoice day"><input type="number" min="1" max="28" value={invoiceDay} onChange={(e) => setInvoiceDay(e.target.value)} /></Field>
      </div>
      <label className="toggle-row"><span>Active client</span>
        <button className={"toggle " + (active ? "toggle-on" : "")} onClick={() => setActive(!active)}><span className="toggle-knob" /></button>
      </label>
      <div className="modal-actions">
        {client && <Btn variant="ghost-danger" onClick={() => onDelete(client.id)}><Trash2 size={16} /> Delete</Btn>}
        <Btn onClick={() => name.trim() && onSave({ ...(client || {}), name: name.trim(), monthlyAmount: parseFloat(monthlyAmount) || 0, invoiceDay: Math.max(1, Math.min(28, parseInt(invoiceDay) || 1)), active })}>Save</Btn>
      </div>
    </Modal>
  );
}

/* ============================================================
   Daily report
   ============================================================ */
function DailyReport({ users, habits, tasks }) {
  const [day, setDay] = useState(addDays(todayStr(), -1));
  const isYesterday = day === addDays(todayStr(), -1);
  const canForward = dateDiff(todayStr(), day) > 0;

  const data = users.map((u) => {
    const tasksDone = tasks.filter((t) => (t.completed || {})[u.id] === day);
    const habitsDone = habits.filter((h) => h.ownerId === u.id && (h.completions || {})[day]);
    const pts = pointsOnDay(u.id, day, habits, tasks);
    return { user: u, tasksDone, habitsDone, pts };
  });
  const winner = data[0].pts === data[1].pts ? null : (data[0].pts > data[1].pts ? 0 : 1);

  return (
    <div className="page">
      <PageHead title="Daily report" subtitle={isYesterday ? "Yesterday" : prettyDate(day)}>
        <div className="week-nav">
          <IconBtn onClick={() => setDay(addDays(day, -1))}><ChevronLeft size={18} /></IconBtn>
          <IconBtn disabled={!canForward} onClick={() => setDay(addDays(day, 1))}><ChevronRight size={18} /></IconBtn>
        </div>
      </PageHead>

      <Card className="report-banner">
        <CalendarDays size={18} />
        <span>{prettyDate(day)}</span>
        {winner !== null ? <span className="report-winner"><Crown size={15} /> {data[winner].user.name} won the day</span> : <span className="report-winner">Even day</span>}
      </Card>

      <div className="report-grid">
        {data.map((d, i) => (
          <Card key={d.user.id} className={"report-col " + (winner === i ? "report-win" : "")}>
            <div className="report-user"><Avatar user={d.user} size={36} /><span>{d.user.name}</span></div>
            <div className="report-big" style={{ color: d.user.color }}>{d.pts}<span>pts</span></div>
            <div className="report-line"><CheckSquare size={14} /> {d.tasksDone.length} task{d.tasksDone.length === 1 ? "" : "s"} done</div>
            <div className="report-line"><Repeat size={14} /> {d.habitsDone.length} habit{d.habitsDone.length === 1 ? "" : "s"} kept</div>
            {d.tasksDone.length > 0 && (
              <div className="report-tasks">
                {d.tasksDone.slice(0, 6).map((t) => <div key={t.id} className="report-task"><Check size={12} /> {t.title}</div>)}
                {d.tasksDone.length > 6 && <div className="muted-small">and {d.tasksDone.length - 6} more</div>}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   Settings
   ============================================================ */
function SettingsTab({ users, me, setUsers, onLogout, dark, setDark, notifOn, enableNotifs }) {
  const [name, setName] = useState(me.name);
  const [color, setColor] = useState(me.color);
  const [newPw, setNewPw] = useState("");
  const colors = [BLUE, "#1d1d1f", "#0a5fb8", "#34C759", "#FF9500", "#AF52DE", "#FF2D55", "#5AC8FA"];
  const [saved, setSaved] = useState(false);
  const save = () => {
    setUsers(users.map((u) => u.id === me.id ? { ...u, name: name.trim() || u.name, color, ...(newPw.length >= 3 ? { pw: hashPw(newPw) } : {}) } : u));
    setNewPw(""); setSaved(true); setTimeout(() => setSaved(false), 1500);
  };
  return (
    <div className="page">
      <PageHead title="Settings" subtitle="Your profile, the look, and how points work." />
      <Card>
        <div className="card-title">Your profile</div>
        <Field label="Name"><input value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <span className="field-label">Your color</span>
        <div className="color-row">{colors.map((c) => <button key={c} className={"swatch " + (color === c ? "swatch-on" : "")} style={{ background: c }} onClick={() => setColor(c)} />)}</div>
        <Field label="New password (leave blank to keep)"><input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} /></Field>
        <div className="modal-actions"><Btn onClick={save}>{saved ? <><Check size={16} /> Saved</> : "Save profile"}</Btn></div>
      </Card>

      <Card>
        <div className="card-title">Appearance and alerts</div>
        <div className="toggle-row">
          <span>Dark mode</span>
          <button className={"toggle " + (dark ? "toggle-on" : "")} onClick={() => setDark(!dark)} aria-label="Toggle dark mode"><span className="toggle-knob" /></button>
        </div>
        <div className="toggle-row">
          <span>Desktop notifications</span>
          <button className={"toggle " + (notifOn ? "toggle-on" : "")} onClick={enableNotifs} aria-label="Enable notifications"><span className="toggle-knob" /></button>
        </div>
        <p className="muted-small">Notifications fire for tasks and invoices due soon, plus a daily nudge to check yesterday's report. They show while Crica is open in a tab.</p>
      </Card>

      <Card>
        <div className="card-title">How points work</div>
        <div className="points-legend">
          <div className="legend-block"><b>Habits (per day kept)</b>
            <div className="legend-line"><span>Any habit</span><span>+{HABIT_POINTS}</span></div>
          </div>
          <div className="legend-block"><b>Tasks (when completed)</b>
            {Object.values(TASK_IMPORTANCE).map((d) => <div key={d.label} className="legend-line"><span>{d.label}</span><span>+{d.points}</span></div>)}
          </div>
        </div>
        <p className="muted-small">Miss a habit one day and you get a warning. Miss two days in a row and the streak resets. A habit missed once is a slip, missed twice is a new habit.</p>
      </Card>

      <Card>
        <div className="card-title">Session</div>
        <Btn variant="ghost-danger" onClick={onLogout}><LogOut size={16} /> Log out</Btn>
      </Card>
    </div>
  );
}

/* ============================================================
   Navigation
   ============================================================ */
const TABS = [
  { id: "dashboard", label: "Home", icon: Home },
  { id: "habits", label: "Habits", icon: Repeat },
  { id: "tasks", label: "Tasks", icon: CheckSquare },
  { id: "vault", label: "Company", icon: PiggyBank },
  { id: "report", label: "Report", icon: CalendarDays },
];

const DEFAULT_FINANCE = { vault: { current: 0, target: 50000 }, monthTarget: 10000, transactions: [] };
const DEFAULT_USERS = [
  { id: "cristian", name: "Cristian", color: "#0071E3", pw: hashPw("12345") },
  { id: "catalin", name: "Catalin", color: "#34C759", pw: hashPw("12345") },
];

function App() {
  const [users, setUsersState] = useState(null);
  const [setupDone, setSetupDone] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(() => { try { return localStorage.getItem("crica_user") || null; } catch (e) { return null; } });
  const [tab, setTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  const [habits, setHabitsState] = useState([]);
  const [tasks, setTasksState] = useState([]);
  const [clients, setClientsState] = useState([]);
  const [finance, setFinanceState] = useState(DEFAULT_FINANCE);

  const [dark, setDark] = useState(() => { try { return localStorage.getItem("crica_theme") === "dark"; } catch (e) { return false; } });
  const [notifOn, setNotifOn] = useState(() => typeof Notification !== "undefined" && Notification.permission === "granted");
  const [dailyPrompt, setDailyPrompt] = useState(false);
  const notifiedRef = useRef(new Set());

  // Bootstrap: require Firebase. If it is missing or unreachable, fail loudly.
  useEffect(() => {
    if (!firebaseConfigured) { setDbError("notconfigured"); setLoading(false); return; }
    let alive = true;
    const hardStop = setTimeout(() => { if (alive) { setDbError("timeout"); setLoading(false); } }, 11000);
    (async () => {
      try {
        let acc = await loadKey("accounts", null);
        if (!alive) return;
        if (!acc || !acc.users || !acc.users.length) {
          await saveKey("accounts", { users: DEFAULT_USERS, setupComplete: true });
          acc = { users: DEFAULT_USERS };
        }
        setUsersState(acc.users);
        setSetupDone(true); setLoading(false);
        clearTimeout(hardStop);
      } catch (e) {
        if (alive) { setDbError("error"); setLoading(false); clearTimeout(hardStop); }
      }
    })();
    return () => { alive = false; clearTimeout(hardStop); };
  }, []);

  // Real-time sync: the other founder's changes arrive live
  useEffect(() => {
    if (!firebaseConfigured) return;
    const unsubs = [
      subscribeKey("accounts", (acc) => { if (acc && acc.users) { setUsersState(acc.users); setSetupDone(true); } }),
      subscribeKey("habits", (h) => setHabitsState(h || [])),
      subscribeKey("tasks", (t) => setTasksState(t || [])),
      subscribeKey("clients", (c) => setClientsState(c || [])),
      subscribeKey("finance", (f) => { if (f) setFinanceState(f); }),
    ];
    return () => unsubs.forEach((u) => { try { u && u(); } catch (e) { /* ignore */ } });
  }, []);

  // Theme: reflect dark mode on the document and remember the choice
  useEffect(() => {
    try {
      const root = document.documentElement;
      if (dark) root.classList.add("crica-dark"); else root.classList.remove("crica-dark");
      localStorage.setItem("crica_theme", dark ? "dark" : "light");
    } catch (e) { /* ignore */ }
  }, [dark]);

  const enableNotifs = useCallback(async () => {
    try {
      if (typeof Notification === "undefined") return;
      const p = await Notification.requestPermission();
      setNotifOn(p === "granted");
      if (p === "granted") notify("Crica", "Notifications are on. We will nudge you about what is due.");
    } catch (e) { /* ignore */ }
  }, []);

  const setUsers = (u) => { setUsersState(u); saveKey("accounts", { users: u, setupComplete: true }); };
  const setHabits = (h) => { setHabitsState(h); saveKey("habits", h); };
  const setTasks = (t) => { setTasksState(t); saveKey("tasks", t); };
  const setClients = (c) => { setClientsState(c); saveKey("clients", c); };
  const setFinance = (f) => { setFinanceState(f); saveKey("finance", f); };

  const loginAs = (id) => { setCurrentUserId(id); try { localStorage.setItem("crica_user", id); } catch (e) { /* ignore */ } };
  const logout = () => { setCurrentUserId(null); setShowSettings(false); try { localStorage.removeItem("crica_user"); } catch (e) { /* ignore */ } };

  const me = users?.find((u) => u.id === currentUserId);

  // Alerts
  const alerts = useMemo(() => {
    if (!me) return [];
    const out = [];
    tasks.forEach((t) => {
      if (!t.dueDate) return;
      (t.assignees || []).forEach((aid) => {
        if ((t.completed || {})[aid]) return;
        const diff = dateDiff(t.dueDate, todayStr());
        if (diff <= 1) {
          const u = users.find((x) => x.id === aid);
          out.push({ icon: <Clock size={13} />, text: `${t.title}${u && aid !== me.id ? " (" + u.name + ")" : ""} ${diff < 0 ? "overdue" : diff === 0 ? "due today" : "due tomorrow"}` });
        }
      });
    });
    clients.filter((c) => c.active).forEach((c) => {
      const next = nextInvoiceDate(c); const diff = dateDiff(next, todayStr());
      if (diff <= 2) out.push({ icon: <Receipt size={13} />, text: `Invoice ${c.name} ${diff <= 0 ? "now" : `in ${diff}d`}` });
    });
    const seen = new Set();
    return out.filter((a) => { if (seen.has(a.text)) return false; seen.add(a.text); return true; }).slice(0, 8);
  }, [tasks, clients, me, users]);

  // Once a day, after login, prompt to review yesterday's report
  useEffect(() => {
    if (!currentUserId) return;
    try {
      const last = localStorage.getItem("crica_dailyseen_" + currentUserId);
      if (last !== todayStr()) { setDailyPrompt(true); notify("Crica", "New day. Take a look at yesterday's results."); }
    } catch (e) { /* ignore */ }
  }, [currentUserId]);

  const dismissDaily = (goReport) => {
    try { localStorage.setItem("crica_dailyseen_" + currentUserId, todayStr()); } catch (e) { /* ignore */ }
    setDailyPrompt(false);
    if (goReport) { setShowSettings(false); setTab("report"); }
  };

  // Fire desktop notifications for newly surfaced alerts (once per text per session)
  useEffect(() => {
    if (!notifOn || !currentUserId) return;
    alerts.forEach((a) => {
      if (!notifiedRef.current.has(a.text)) { notifiedRef.current.add(a.text); notify("Crica reminder", a.text); }
    });
  }, [alerts, notifOn, currentUserId]);

  if (dbError) return <><GlobalStyle /><DbErrorScreen kind={dbError} /></>;
  if (loading) return <><GlobalStyle /><div className="boot"><div className="boot-mark"><IconMark size={56} radius={14} /></div></div></>;
  if (!users) return <><GlobalStyle /><div className="boot"><div className="boot-mark"><IconMark size={56} radius={14} /></div></div></>;
  if (!currentUserId || !me) return <><GlobalStyle /><LoginScreen users={users} onLogin={loginAs} /></>;

  const renderTab = () => {
    if (showSettings) return <SettingsTab users={users} me={me} setUsers={setUsers} onLogout={logout} dark={dark} setDark={setDark} notifOn={notifOn} enableNotifs={enableNotifs} />;
    switch (tab) {
      case "dashboard": return <Dashboard users={users} me={me} habits={habits} tasks={tasks} finance={finance} />;
      case "habits": return <HabitsTab users={users} me={me} habits={habits} setHabits={setHabits} />;
      case "tasks": return <TasksTab users={users} me={me} tasks={tasks} setTasks={setTasks} clients={clients} />;
      case "vault": return <VaultTab finance={finance} setFinance={setFinance} clients={clients} setClients={setClients} />;
      case "report": return <DailyReport users={users} habits={habits} tasks={tasks} />;
      default: return null;
    }
  };

  return (
    <>
      <GlobalStyle />
      <div className="app-root">
        <header className="app-header">
          <div className="header-brand"><WideLogo height={26} /></div>
          <nav className="top-nav">
            {TABS.map((tb) => (
              <button key={tb.id} className={"top-nav-item " + (!showSettings && tab === tb.id ? "on" : "")} onClick={() => { setTab(tb.id); setShowSettings(false); }}>
                <tb.icon size={16} /> {tb.label}
              </button>
            ))}
          </nav>
          <button className="header-me" onClick={() => setShowSettings(true)}><Avatar user={me} size={30} /></button>
        </header>

        <AlertBar alerts={alerts} />

        <main className="app-main">{renderTab()}</main>

        <nav className="bottom-nav">
          {TABS.map((tb) => (
            <button key={tb.id} className={"bottom-nav-item " + (!showSettings && tab === tb.id ? "on" : "")} onClick={() => { setTab(tb.id); setShowSettings(false); }}>
              <tb.icon size={20} /><span>{tb.label}</span>
            </button>
          ))}
          <button className={"bottom-nav-item " + (showSettings ? "on" : "")} onClick={() => setShowSettings(true)}>
            <Settings size={20} /><span>You</span>
          </button>
        </nav>
      </div>

      <Modal open={dailyPrompt} onClose={() => dismissDaily(false)} title={`Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}, ${me?.name || ""}`}>
        <p style={{ margin: "0 0 16px", color: "var(--ink-2)", fontSize: 15, lineHeight: 1.5 }}>
          A fresh day on the board. Take a quick look at how yesterday went before you dive in.
        </p>
        <div className="modal-actions">
          <Btn variant="ghost" onClick={() => dismissDaily(false)}>Later</Btn>
          <Btn variant="primary" onClick={() => dismissDaily(true)}><CalendarDays size={16} /> Open report</Btn>
        </div>
      </Modal>
    </>
  );
}

/* ============================================================
   Styles
   ============================================================ */
function GlobalStyle() {
  return (
    <style>{`
    * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    :root {
      --blue: ${BLUE}; --blue-soft: ${BLUE_SOFT};
      --ink: #1d1d1f; --ink-2: #6e6e73; --ink-3: #86868b;
      --bg: #f5f5f7; --surface: #ffffff; --line: rgba(0,0,0,0.08); --line-2: rgba(0,0,0,0.05);
      --radius: 18px; --shadow: 0 1px 3px rgba(0,0,0,0.06), 0 8px 30px rgba(0,0,0,0.05);
      --header-bg: rgba(245,245,247,0.8);
    }
    html.crica-dark {
      --ink: #f5f5f7; --ink-2: #aeaeb2; --ink-3: #8e8e93;
      --bg: #000000; --surface: #1c1c1e; --line: rgba(255,255,255,0.14); --line-2: rgba(255,255,255,0.08);
      --shadow: 0 1px 3px rgba(0,0,0,0.6), 0 10px 30px rgba(0,0,0,0.55);
      --header-bg: rgba(0,0,0,0.65);
    }
    /* Logo */
    .logo-fallback { background: var(--blue); color: #fff; display: grid; place-items: center; }
    .brand-wrap { display: flex; justify-content: center; margin: 0 auto 16px; }
    .db-help { text-align: left; background: var(--line-2); border-radius: 12px; padding: 12px 14px; margin: 4px 0 18px; }
    .db-help .legend-line span:last-child { color: var(--ink-2); }
    /* Dark surface remaps for elements that were hardcoded white */
    html.crica-dark .field input, html.crica-dark .field textarea, html.crica-dark .field select,
    html.crica-dark .icon-pick, html.crica-dark .pill, html.crica-dark .login-user,
    html.crica-dark .seg-active, html.crica-dark .habit-check, html.crica-dark .task-check { background: var(--surface); }
    html.crica-dark .btn-ghost, html.crica-dark .icon-btn, html.crica-dark .segmented,
    html.crica-dark .chip, html.crica-dark .locked-note, html.crica-dark .vault-pct-bar, html.crica-dark .month-bar { background: rgba(255,255,255,0.08); }
    html.crica-dark .icon-btn:hover, html.crica-dark .btn-ghost:hover, html.crica-dark .top-nav-item:hover { background: rgba(255,255,255,0.14); }
    html.crica-dark .habit-done { background: linear-gradient(0deg, rgba(0,113,227,0.14), rgba(0,113,227,0.14)), var(--surface); }
    html.crica-dark .swatch-on { box-shadow: 0 0 0 3px var(--surface), 0 0 0 5px var(--blue); }
    html.crica-dark .alert-bar { background: #2c2c2e; }
    html.crica-dark .ring-track { stroke: rgba(255,255,255,0.12); }
    html.crica-dark .recharts-cartesian-axis-tick text, html.crica-dark .recharts-text { fill: var(--ink-3); }
    html.crica-dark .recharts-cartesian-grid line { stroke: rgba(255,255,255,0.07); }
    .app-root, .auth-screen, .boot {
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: var(--ink); background: var(--bg); -webkit-font-smoothing: antialiased;
    }
    .app-root { min-height: 100vh; padding-bottom: 76px; }
    input, textarea, select, button { font-family: inherit; }
    @media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }

    /* Header */
    .app-header {
      position: sticky; top: 0; z-index: 40; display: flex; align-items: center; justify-content: space-between;
      gap: 12px; padding: 12px 18px; background: var(--header-bg); backdrop-filter: saturate(180%) blur(20px);
      border-bottom: 1px solid var(--line);
    }
    .header-brand { display: flex; align-items: center; gap: 9px; font-weight: 700; font-size: 17px; letter-spacing: -0.02em; }
    .brand-dot { width: 28px; height: 28px; border-radius: 9px; background: var(--blue); color: #fff; display: grid; place-items: center; }
    .top-nav { display: none; gap: 4px; }
    .top-nav-item { display: flex; align-items: center; gap: 6px; padding: 8px 14px; border: none; background: transparent; color: var(--ink-2);
      border-radius: 11px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all .18s; }
    .top-nav-item:hover { background: rgba(0,0,0,0.04); color: var(--ink); }
    .top-nav-item.on { background: var(--blue); color: #fff; }
    .header-me { border: none; background: transparent; cursor: pointer; padding: 0; border-radius: 50%; }

    @media (min-width: 820px) {
      .top-nav { display: flex; }
      .bottom-nav { display: none !important; }
      .app-root { padding-bottom: 0; }
      .app-main { max-width: 980px; margin: 0 auto; }
    }

    /* Bottom nav */
    .bottom-nav {
      position: fixed; bottom: 0; left: 0; right: 0; z-index: 40; display: flex; justify-content: space-around;
      padding: 8px 6px calc(8px + env(safe-area-inset-bottom)); background: rgba(255,255,255,0.82);
      backdrop-filter: saturate(180%) blur(20px); border-top: 1px solid var(--line);
    }
    .bottom-nav-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; border: none; background: transparent;
      color: var(--ink-3); font-size: 10.5px; font-weight: 500; cursor: pointer; padding: 4px 0; transition: color .15s; }
    .bottom-nav-item.on { color: var(--blue); }

    .app-main { padding: 16px 16px 24px; }
    .page { display: flex; flex-direction: column; gap: 14px; animation: fade .35s ease; }
    @keyframes fade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }

    .page-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; margin-bottom: 2px; }
    .page-title { font-size: 26px; font-weight: 700; letter-spacing: -0.03em; margin: 0; }
    .page-sub { color: var(--ink-3); font-size: 13.5px; margin-top: 2px; }

    /* Cards */
    .card { background: var(--surface); border: 1px solid var(--line-2); border-radius: var(--radius); padding: 16px; box-shadow: var(--shadow); }
    .card-title { font-size: 15px; font-weight: 600; letter-spacing: -0.01em; margin-bottom: 12px; }
    .empty { display: flex; flex-direction: column; align-items: center; gap: 10px; text-align: center; color: var(--ink-3); padding: 34px 18px; }
    .empty svg { color: var(--blue); opacity: .65; }

    /* Buttons */
    .btn { display: inline-flex; align-items: center; justify-content: center; gap: 7px; border: none; cursor: pointer;
      font-size: 14px; font-weight: 600; padding: 10px 16px; border-radius: 13px; transition: transform .12s, background .15s, opacity .15s; letter-spacing: -0.01em; }
    .btn:active { transform: scale(0.96); }
    .btn-primary { background: var(--blue); color: #fff; }
    .btn-primary:hover { background: #0062c4; }
    .btn-soft { background: rgba(0,113,227,0.1); color: var(--blue); }
    .btn-ghost { background: rgba(0,0,0,0.05); color: var(--ink); }
    .btn-ghost-danger { background: rgba(255,59,48,0.1); color: #ff3b30; }
    .btn.full { width: 100%; padding: 13px; }
    .icon-btn { width: 34px; height: 34px; border-radius: 10px; border: none; background: rgba(0,0,0,0.05); color: var(--ink); display: grid; place-items: center; cursor: pointer; transition: background .15s; }
    .icon-btn:hover { background: rgba(0,0,0,0.09); }
    .icon-btn:disabled { opacity: .35; cursor: default; }

    /* Segmented + filters */
    .segmented { display: flex; background: rgba(0,0,0,0.05); border-radius: 12px; padding: 3px; gap: 3px; }
    .seg { flex: 1; border: none; background: transparent; padding: 8px; border-radius: 9px; font-size: 13.5px; font-weight: 600; color: var(--ink-2); cursor: pointer; transition: all .18s; }
    .seg-active { background: #fff; color: var(--ink); box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .filter-row { display: flex; align-items: center; gap: 8px; color: var(--ink-3); padding: 0 2px; }
    .text-pill { border: none; background: transparent; color: var(--ink-3); font-size: 13px; font-weight: 600; cursor: pointer; padding: 4px 8px; border-radius: 8px; }
    .text-pill.on { color: var(--blue); background: rgba(0,113,227,0.1); }
    .week-nav { display: flex; gap: 6px; }

    /* Fields */
    .field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
    .field-label { font-size: 12.5px; font-weight: 600; color: var(--ink-2); margin-bottom: 6px; display: block; }
    .field input, .field textarea, .field select, .field-inline input {
      width: 100%; border: 1px solid var(--line); background: #fff; border-radius: 12px; padding: 12px 13px; font-size: 15px; color: var(--ink); transition: border .15s, box-shadow .15s; }
    .field input:focus, .field textarea:focus, .field select:focus { outline: none; border-color: var(--blue); box-shadow: 0 0 0 3px rgba(0,113,227,0.15); }
    textarea { resize: vertical; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

    /* Avatar / rings */
    .avatar { border-radius: 50%; color: #fff; font-weight: 700; display: grid; place-items: center; flex-shrink: 0; }
    .ring-wrap { position: relative; }
    .ring-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; font-weight: 700; }
    .ring-pct { font-size: 19px; }
    .ring-sub { font-size: 10px; color: var(--ink-3); font-weight: 500; }

    /* Modal */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.35); backdrop-filter: blur(4px); z-index: 100; display: flex; align-items: flex-end; justify-content: center; padding: 0; animation: fade .2s; font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: var(--ink); }
    @media (min-width: 600px) { .modal-overlay { align-items: center; padding: 20px; } }
    .modal { background: var(--surface); width: 100%; max-width: 460px; border-radius: 22px 22px 0 0; max-height: 90vh; overflow-y: auto; animation: sheet .3s cubic-bezier(.2,.8,.2,1); }
    @media (min-width: 600px) { .modal { border-radius: 22px; } }
    .modal-wide { max-width: 640px; }
    @keyframes sheet { from { transform: translateY(40px); opacity: .6; } to { transform: none; opacity: 1; } }
    .modal-head { display: flex; align-items: center; justify-content: space-between; padding: 18px 18px 10px; position: sticky; top: 0; background: var(--surface); }
    .modal-head h3 { margin: 0; font-size: 18px; font-weight: 700; letter-spacing: -0.02em; }
    .modal-body { padding: 4px 18px 22px; }
    .modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 14px; }
    .modal-actions .btn { flex: 1; }

    /* Auth */
    .auth-screen { min-height: 100vh; display: grid; place-items: center; padding: 20px; }
    .auth-card { background: var(--surface); border-radius: 26px; padding: 30px 26px; width: 100%; max-width: 440px; box-shadow: var(--shadow); border: 1px solid var(--line-2); }
    .auth-card.wide, .modal-wide { max-width: 640px; }
    .brand-mark { width: 56px; height: 56px; border-radius: 17px; background: var(--blue); color: #fff; display: grid; place-items: center; margin: 0 auto 16px; }
    .auth-title { text-align: center; font-size: 25px; font-weight: 700; letter-spacing: -0.03em; margin: 0 0 6px; }
    .auth-sub { text-align: center; color: var(--ink-3); font-size: 14px; margin: 0 0 22px; }
    .auth-err { background: rgba(255,59,48,0.1); color: #ff3b30; padding: 10px 12px; border-radius: 11px; font-size: 13px; font-weight: 500; margin-bottom: 12px; text-align: center; }
    .setup-grid { display: grid; gap: 18px; margin-bottom: 16px; }
    @media (min-width: 520px) { .setup-grid { grid-template-columns: 1fr 1fr; } }
    .setup-tag { font-size: 12px; font-weight: 700; color: var(--blue); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px; }
    .color-row { display: flex; flex-wrap: wrap; gap: 9px; margin-bottom: 12px; }
    .swatch { width: 30px; height: 30px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; transition: transform .12s; }
    .swatch:active { transform: scale(.9); }
    .swatch-on { box-shadow: 0 0 0 3px #fff, 0 0 0 5px var(--blue); }
    .login-users { display: flex; gap: 12px; margin-bottom: 18px; }
    .login-user { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 9px; padding: 18px 10px; border: 1.5px solid var(--line); border-radius: 17px; background: #fff; cursor: pointer; font-weight: 600; transition: all .18s; }
    .login-user-on { border-color: var(--blue); box-shadow: 0 0 0 3px rgba(0,113,227,0.12); }

    /* Alert bar */
    .alert-bar { position: sticky; top: 57px; z-index: 30; display: flex; align-items: center; gap: 10px; background: var(--ink); color: #fff; padding: 9px 16px; font-size: 13px; overflow: hidden; }
    .alert-bar svg { flex-shrink: 0; color: #FF9500; }
    .alert-track { display: flex; gap: 18px; overflow-x: auto; scrollbar-width: none; }
    .alert-track::-webkit-scrollbar { display: none; }
    .alert-item { display: inline-flex; align-items: center; gap: 5px; white-space: nowrap; font-weight: 500; }
    @media (min-width: 820px) { .alert-bar { top: 57px; } }

    /* Dashboard */
    .vs-card { display: flex; align-items: center; gap: 8px; padding: 20px 16px; }
    .vs-side { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; }
    .vs-name { font-weight: 600; font-size: 14px; }
    .vs-points { font-size: 38px; font-weight: 800; letter-spacing: -0.04em; line-height: 1; font-variant-numeric: tabular-nums; }
    .vs-lab { font-size: 11px; color: var(--ink-3); text-transform: uppercase; letter-spacing: 0.05em; }
    .vs-mid { display: flex; flex-direction: column; align-items: center; gap: 4px; }
    .vs-vs { font-size: 12px; font-weight: 800; color: var(--ink-3); }
    .vs-tie { font-size: 12px; font-weight: 800; color: var(--blue); }
    .stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    @media (min-width: 700px) { .stat-grid { grid-template-columns: repeat(4, 1fr); } }
    .stat-tile { padding: 14px; }
    .stat-ic { margin-bottom: 8px; }
    .stat-val { font-size: 23px; font-weight: 700; letter-spacing: -0.03em; font-variant-numeric: tabular-nums; }
    .stat-lab { font-size: 11.5px; color: var(--ink-3); margin-top: 2px; line-height: 1.3; }
    .two-col { display: grid; gap: 14px; }
    @media (min-width: 640px) { .two-col { grid-template-columns: 1fr 1fr; } }
    .legend { display: flex; flex-wrap: wrap; gap: 14px; justify-content: center; margin-top: 8px; }
    .legend-item { display: flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--ink-2); font-weight: 500; }
    .legend-item i { width: 10px; height: 10px; border-radius: 3px; }
    .rate-rings { display: flex; justify-content: space-around; }
    .rate-ring { display: flex; flex-direction: column; align-items: center; gap: 8px; }
    .rate-name { font-size: 13px; font-weight: 600; }
    .badge-row { display: flex; flex-wrap: wrap; gap: 8px; }
    .badge { display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; background: rgba(0,113,227,0.08); color: var(--blue); border-radius: 11px; font-size: 12.5px; font-weight: 600; }
    .badge-ic { display: grid; place-items: center; }

    /* Habits */
    .habit-card { display: flex; align-items: center; gap: 12px; padding: 13px 14px; transition: box-shadow .2s, transform .2s; }
    .habit-done { background: linear-gradient(0deg, rgba(0,113,227,0.04), rgba(0,113,227,0.04)), #fff; }
    .drag-handle { border: none; background: transparent; color: #c7c7cc; cursor: grab; padding: 4px; display: grid; place-items: center; touch-action: none; }
    .drag-handle:active { cursor: grabbing; }
    .habit-check, .task-check { width: 30px; height: 30px; border-radius: 50%; border: 2px solid var(--line); background: #fff; display: grid; place-items: center; color: #fff; cursor: pointer; flex-shrink: 0; transition: all .18s; }
    .task-check { width: 26px; height: 26px; border-radius: 8px; }
    .habit-main, .task-main { flex: 1; cursor: pointer; min-width: 0; }
    .habit-name { font-weight: 600; font-size: 15px; }
    .habit-meta, .task-meta { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
    .chip { display: inline-flex; align-items: center; gap: 4px; font-size: 11.5px; font-weight: 600; color: var(--ink-2); background: rgba(0,0,0,0.045); border: 1px solid transparent; padding: 3px 8px; border-radius: 8px; }
    .chip.warn { background: rgba(255,149,0,0.12); color: #c77700; }
    .chip.danger { background: rgba(255,59,48,0.1); color: #ff3b30; }
    .chip.danger-soft { background: rgba(255,59,48,0.07); color: #ff6259; }
    .partner-head { display: flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 600; color: var(--ink-2); margin-top: 8px; }
    .locked-note { font-size: 11px; color: var(--ink-3); font-weight: 500; background: rgba(0,0,0,0.05); padding: 2px 7px; border-radius: 7px; }
    .censored { display: flex; align-items: center; justify-content: space-between; opacity: .9; }
    .censored-name { flex: 1; min-width: 0; }
    .blurred { filter: blur(6px); user-select: none; font-weight: 600; font-size: 15px; color: var(--ink-2); }
    .censored-stats { display: flex; align-items: center; gap: 8px; }
    .dot { width: 11px; height: 11px; border-radius: 50%; background: rgba(0,0,0,0.12); }
    .icon-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; margin-bottom: 14px; }
    .icon-pick { aspect-ratio: 1; border: 1.5px solid var(--line); background: #fff; border-radius: 12px; font-size: 20px; cursor: pointer; transition: all .15s; }
    .icon-pick.on { border-color: var(--blue); background: rgba(0,113,227,0.08); }
    .seg-pills { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
    .pill { display: inline-flex; align-items: center; gap: 6px; border: 1.5px solid var(--line); background: #fff; padding: 8px 13px; border-radius: 11px; font-size: 13.5px; font-weight: 600; color: var(--ink-2); cursor: pointer; transition: all .15s; }
    .pill b { color: var(--blue); }
    .pill-on { border-color: var(--blue); color: var(--ink); background: rgba(0,113,227,0.06); }

    /* Tasks */
    .task-card { display: flex; align-items: center; gap: 11px; padding: 12px 13px; }
    .task-done .task-title { text-decoration: line-through; color: var(--ink-3); }
    .task-title { font-weight: 600; font-size: 14.5px; }
    .added-by { font-size: 11px; color: var(--blue); margin-top: 5px; font-weight: 500; }

    /* Vault */
    .vault-card { display: flex; flex-direction: column; align-items: center; }
    .vault-head { width: 100%; display: flex; align-items: flex-start; justify-content: space-between; }
    .vault-amount { font-size: 30px; font-weight: 800; letter-spacing: -0.04em; font-variant-numeric: tabular-nums; }
    .goal-edit { display: inline-flex; align-items: center; gap: 5px; border: none; background: transparent; color: var(--ink-3); font-size: 12.5px; font-weight: 500; cursor: pointer; padding: 2px 0; }
    .jar-wrap { width: 170px; margin: 6px 0; }
    .jar-svg { width: 100%; height: auto; display: block; }
    .wave { animation: wave 2.2s ease-in-out infinite alternate; }
    @keyframes wave { from { transform: translate(-12px,-6px); } to { transform: translate(12px,-6px); } }
    .vault-pct-bar { width: 100%; height: 8px; background: rgba(0,0,0,0.06); border-radius: 5px; overflow: hidden; margin-top: 4px; }
    .vault-pct-fill { height: 100%; background: linear-gradient(90deg, var(--blue-soft), var(--blue)); border-radius: 5px; transition: width 1s cubic-bezier(.2,.8,.2,1); }
    .vault-pct-label { font-size: 12.5px; color: var(--ink-3); margin-top: 8px; font-weight: 500; }
    .vault-actions { display: flex; gap: 10px; margin-top: 16px; width: 100%; }
    .vault-actions .btn { flex: 1; }
    .month-head { display: flex; align-items: center; justify-content: space-between; }
    .month-amount { font-size: 30px; font-weight: 800; letter-spacing: -0.04em; margin: 8px 0 12px; font-variant-numeric: tabular-nums; }
    .month-bar { height: 10px; background: rgba(0,0,0,0.06); border-radius: 6px; overflow: hidden; }
    .month-fill { height: 100%; background: #34C759; border-radius: 6px; transition: width 1s cubic-bezier(.2,.8,.2,1); }
    .month-sub { display: flex; justify-content: space-between; font-size: 12px; color: var(--ink-3); margin-top: 8px; font-weight: 500; }
    .section-head { display: flex; align-items: center; justify-content: space-between; margin-top: 4px; }
    .section-head h3 { font-size: 19px; font-weight: 700; letter-spacing: -0.02em; margin: 0; }
    .client-card { display: flex; align-items: center; gap: 12px; padding: 13px 14px; }
    .client-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
    .client-main { flex: 1; cursor: pointer; min-width: 0; }
    .client-name { font-weight: 600; font-size: 14.5px; }
    .client-meta { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
    .paid-btn { padding: 8px 12px; font-size: 13px; flex-shrink: 0; }
    .toggle-row { display: flex; align-items: center; justify-content: space-between; font-size: 14px; font-weight: 500; margin: 6px 0 4px; }
    .toggle { width: 50px; height: 30px; border-radius: 16px; border: none; background: rgba(0,0,0,0.12); position: relative; cursor: pointer; transition: background .2s; }
    .toggle-on { background: #34C759; }
    .toggle-knob { position: absolute; top: 3px; left: 3px; width: 24px; height: 24px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.2); transition: transform .2s; }
    .toggle-on .toggle-knob { transform: translateX(20px); }

    /* Report */
    .report-banner { display: flex; align-items: center; gap: 10px; font-weight: 600; font-size: 14px; }
    .report-winner { margin-left: auto; display: inline-flex; align-items: center; gap: 6px; color: var(--blue); font-weight: 700; font-size: 13.5px; }
    .report-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .report-col { display: flex; flex-direction: column; gap: 8px; }
    .report-win { border-color: var(--blue); box-shadow: 0 0 0 2px rgba(0,113,227,0.2), var(--shadow); }
    .report-user { display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 14px; }
    .report-big { font-size: 34px; font-weight: 800; letter-spacing: -0.04em; line-height: 1; }
    .report-big span { font-size: 14px; font-weight: 600; color: var(--ink-3); margin-left: 4px; }
    .report-line { display: flex; align-items: center; gap: 7px; font-size: 13px; color: var(--ink-2); font-weight: 500; }
    .report-tasks { display: flex; flex-direction: column; gap: 5px; margin-top: 4px; border-top: 1px solid var(--line-2); padding-top: 8px; }
    .report-task { display: flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--ink-2); }
    .report-task svg { color: #34C759; flex-shrink: 0; }

    /* Settings */
    .points-legend { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .legend-block b { font-size: 13px; display: block; margin-bottom: 8px; }
    .legend-line { display: flex; justify-content: space-between; font-size: 13px; color: var(--ink-2); padding: 3px 0; }
    .legend-line span:last-child { color: var(--blue); font-weight: 700; }
    .muted-small { font-size: 12px; color: var(--ink-3); margin-top: 10px; line-height: 1.5; }

    /* Drag */
    .drag-list { display: flex; flex-direction: column; gap: 10px; }
    .drag-row { transition: transform .2s cubic-bezier(.2,.8,.2,1); }
    .drag-row.is-dragging { transform: scale(1.02); z-index: 5; position: relative; }
    .drag-row.is-dragging .card { box-shadow: 0 12px 40px rgba(0,0,0,0.18); border-color: var(--blue); }

    /* Boot */
    .boot { min-height: 100vh; display: grid; place-items: center; }
    .boot-mark { width: 56px; height: 56px; border-radius: 17px; background: var(--blue); color: #fff; display: grid; place-items: center; animation: pulse 1.2s ease-in-out infinite; }
    @keyframes pulse { 0%,100% { transform: scale(1); opacity: .9; } 50% { transform: scale(1.08); opacity: 1; } }
    `}</style>
  );
}

export default App;
