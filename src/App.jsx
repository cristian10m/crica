import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { loadKey, saveKey, subscribeKey, savePath } from "./storage";
import { firebaseConfigured } from "./firebase";
import { Home, Repeat, CheckSquare, PiggyBank, CalendarDays, Clock, Receipt, User, Coins, FileText, Wrench, MoreHorizontal } from "lucide-react";

import { GlobalStyle } from "./styles";
import { Avatar, Modal, Btn, WideLogo, IconMark } from "./components/ui";
import { AlertBar } from "./components/AlertBar";
import { FocusFab, FocusOverlay } from "./components/Focus";
import { usePipWindow, PipMini } from "./components/PipMini";
import { StopModal } from "./components/StopModal";
import { createPortal } from "react-dom";
import { LoginScreen } from "./screens/LoginScreen";
import { DbErrorScreen } from "./screens/DbErrorScreen";
import { Dashboard } from "./tabs/Dashboard";
import { HabitsTab } from "./tabs/HabitsTab";
import { TasksTab } from "./tabs/TasksTab";
import { CompanyTab } from "./tabs/CompanyTab";
import { DailyReport } from "./tabs/DailyReport";
import { ProfileTab } from "./tabs/ProfileTab";
import { DocsTab } from "./tabs/DocsTab";
import { ToolsTab } from "./tabs/ToolsTab";

import { todayStr, dateDiff, localTz, parseDate, toDateStr } from "./lib/dates";
import { nextInvoiceDate } from "./lib/invoices";
import { notify } from "./lib/notify";
import { scheduleReminders } from "./lib/reminders";
import { useFocusEngine } from "./lib/focus";
import { uid, hashPw } from "./lib/format";
import { totalPoints } from "./lib/points";
import { earnedBalance } from "./lib/shop";
import { DEFAULT_USERS, DEFAULT_FINANCE } from "./lib/constants";

const TABS = [
  { id: "dashboard", label: "Home", icon: Home },
  { id: "habits", label: "Habits", icon: Repeat },
  { id: "tasks", label: "Tasks", icon: CheckSquare },
  { id: "vault", label: "Company", icon: PiggyBank },
  { id: "report", label: "Report", icon: CalendarDays },
  { id: "docs", label: "Docs", icon: FileText },
  { id: "tools", label: "Tools", icon: Wrench },
];
// Tabs grouped under the mobile "More" button to keep the bottom bar uncluttered.
const MORE_IDS = ["docs", "tools"];

const readView = () => { try { return localStorage.getItem("crica_view") || "dashboard"; } catch (e) { return "dashboard"; } };

export default function App() {
  const [users, setUsersState] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(() => { try { return localStorage.getItem("crica_user") || null; } catch (e) { return null; } });
  const [tab, setTab] = useState(() => { const v = readView(); return v !== "settings" ? v : "dashboard"; });
  const [showSettings, setShowSettings] = useState(() => readView() === "settings");
  const [showMore, setShowMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(null);

  const [habits, setHabitsState] = useState([]);
  const [tasks, setTasksState] = useState([]);
  const [docs, setDocsState] = useState([]);
  const [clients, setClientsState] = useState([]);
  const [finance, setFinanceState] = useState(DEFAULT_FINANCE);
  const [focus, setFocusState] = useState([]);
  const [work, setWorkState] = useState([]);
  const [presence, setPresence] = useState(null);
  const [updates, setUpdatesState] = useState([]);
  const [meetings, setMeetingsState] = useState([]);
  const [schedules, setSchedulesState] = useState({});

  const [dark, setDark] = useState(() => { try { return localStorage.getItem("crica_theme") === "dark"; } catch (e) { return false; } });
  const [notifOn, setNotifOn] = useState(() => typeof Notification !== "undefined" && Notification.permission === "granted");
  const [dailyPrompt, setDailyPrompt] = useState(false);
  const [tasksBoard, setTasksBoard] = useState(null);
  const [focusOpen, setFocusOpen] = useState(false);
  const notifiedRef = useRef(new Set());

  const bankFocus = useCallback(({ seconds, points }) => {
    const rec = { id: uid(), userId: currentUserId, date: todayStr(), seconds, points, endedAt: Date.now() };
    setFocusState((prev) => { const next = [...(prev || []), rec]; saveKey("focus", next); return next; });
  }, [currentUserId]);

  const logWork = useCallback(({ userId, taskId, seconds }) => {
    if (!seconds || seconds <= 0) return;
    const rec = { id: uid(), userId, taskId, date: todayStr(), seconds, endedAt: Date.now() };
    setWorkState((prev) => { const next = [...(prev || []), rec]; saveKey("work", next); return next; });
  }, []);

  const logUpdate = useCallback(({ taskId, taskTitle, note, done }) => {
    const rec = { id: uid(), userId: currentUserId, taskId, taskTitle, note: note || "", done: !!done, createdAt: Date.now() };
    setUpdatesState((prev) => { const next = [...(prev || []), rec]; saveKey("updates", next); return next; });
  }, [currentUserId]);
  const editUpdate = useCallback((id, patch) => {
    setUpdatesState((prev) => { const next = (prev || []).map((u) => u.id === id ? { ...u, ...patch, edited: true } : u); saveKey("updates", next); return next; });
  }, []);
  const deleteUpdate = useCallback((id) => {
    setUpdatesState((prev) => { const next = (prev || []).filter((u) => u.id !== id); saveKey("updates", next); return next; });
  }, []);

  const proposeMeeting = useCallback(({ date, start, end, note }) => {
    setUsersState((curUsers) => {
      const other = (curUsers || []).find((u) => u.id !== currentUserId);
      if (!other) return curUsers;
      const rec = { id: uid(), fromId: currentUserId, toId: other.id, date, start, end, note: note || "", status: "pending", createdAt: Date.now() };
      setMeetingsState((prev) => { const next = [...(prev || []), rec]; saveKey("meetings", next); return next; });
      return curUsers;
    });
  }, [currentUserId]);
  const respondMeeting = useCallback((id, status) => {
    setMeetingsState((prev) => { const next = (prev || []).map((m) => m.id === id ? { ...m, status, respondedAt: Date.now(), seenByFrom: false } : m); saveKey("meetings", next); return next; });
  }, []);
  const dismissMeeting = useCallback((id) => {
    setMeetingsState((prev) => { const next = (prev || []).map((m) => m.id === id ? { ...m, seenByFrom: true } : m); saveKey("meetings", next); return next; });
  }, []);

  const focusEngine = useFocusEngine({ onBank: bankFocus });
  const pip = usePipWindow();

  const stopMyWork = () => setTasksState((prev) => {
    const next = (prev || []).map((t) => {
      if (!(t.working && t.working[currentUserId] != null)) return t;
      const secs = Math.round((Date.now() - t.working[currentUserId]) / 1000);
      logWork({ userId: currentUserId, taskId: t.id, seconds: secs });
      const w = { ...t.working }; delete w[currentUserId]; return { ...t, working: w };
    });
    saveKey("tasks", next); return next;
  });

  // Stopping from the popup opens the same "what did you get done" prompt as the list.
  const [stopPromptTask, setStopPromptTask] = useState(null);
  const promptStopWork = () => {
    const t = (tasks || []).find((x) => x.working && x.working[currentUserId] != null);
    if (t) { setStopPromptTask(t); try { window.focus(); } catch (e) { /* ignore */ } }
  };
  const advanceRepeat = (dateStr, repeat) => {
    const d = parseDate(dateStr || todayStr());
    if (repeat === "daily") d.setDate(d.getDate() + 1);
    else if (repeat === "weekly") d.setDate(d.getDate() + 7);
    else if (repeat === "monthly") d.setMonth(d.getMonth() + 1);
    return toDateStr(d);
  };
  const finishMyStop = (task, { note = "", markDone = false, post = false }) => {
    const startMs = (task.working || {})[currentUserId];
    const secs = startMs != null ? Math.round((Date.now() - startMs) / 1000) : 0;
    if (secs > 0) logWork({ userId: currentUserId, taskId: task.id, seconds: secs });
    const alreadyDone = !!(task.completed || {})[currentUserId];
    const willDone = markDone && !alreadyDone;
    setTasks((prev) => {
      const cur = prev.find((t) => t.id === task.id) || task;
      let spawnedNext = cur.spawnedNext; let nextInstance = null;
      if (willDone && cur.repeat && !cur.spawnedNext) {
        spawnedNext = true;
        nextInstance = { ...cur, id: uid(), completed: {}, working: {}, spawnedNext: false, createdDate: todayStr(), dueDate: cur.dueDate ? advanceRepeat(cur.dueDate, cur.repeat) : null, order: prev.length + 1 };
      }
      let next = prev.map((t) => {
        if (t.id !== cur.id) return t;
        const w = { ...(t.working || {}) }; delete w[currentUserId];
        const comp = { ...(t.completed || {}) }; if (willDone) comp[currentUserId] = todayStr();
        return { ...t, working: w, completed: comp, spawnedNext };
      });
      if (nextInstance) next = [...next, nextInstance];
      return next;
    });
    if (post) logUpdate({ taskId: task.id, taskTitle: task.title, note, done: willDone || alreadyDone });
    setStopPromptTask(null);
  };

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
        setLoading(false);
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
      subscribeKey("accounts", (acc) => { if (acc && acc.users) setUsersState(acc.users); }),
      subscribeKey("habits", (h) => setHabitsState(h || [])),
      subscribeKey("tasks", (t) => setTasksState(t || [])),
      subscribeKey("docs", (d) => setDocsState(d || [])),
      subscribeKey("clients", (c) => setClientsState(c || [])),
      subscribeKey("finance", (f) => { if (f) setFinanceState(f); }),
      subscribeKey("focus", (f) => setFocusState(f || [])),
      subscribeKey("work", (w) => setWorkState(w || [])),
      subscribeKey("presence", (p) => setPresence(p || null)),
      subscribeKey("updates", (u) => setUpdatesState(u || [])),
      subscribeKey("meetings", (m) => setMeetingsState(m || [])),
      subscribeKey("schedules", (s) => setSchedulesState(s || {})),
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

  // Remember which page you were on, so a refresh keeps you there
  useEffect(() => {
    try { localStorage.setItem("crica_view", showSettings ? "settings" : tab); } catch (e) { /* ignore */ }
  }, [tab, showSettings]);

  const enableNotifs = useCallback(async () => {
    try {
      if (typeof Notification === "undefined") return;
      const p = await Notification.requestPermission();
      setNotifOn(p === "granted");
      if (p === "granted") notify("Crica", "Notifications are on. We will nudge you about what is due.");
    } catch (e) { /* ignore */ }
  }, []);

  const setUsers = (u) => { setUsersState(u); saveKey("accounts", { users: u, setupComplete: true }); };
  const markUpdatesSeen = useCallback(() => {
    setUsersState((prev) => { const next = (prev || []).map((u) => u.id === currentUserId ? { ...u, lastSeenUpdates: Date.now() } : u); saveKey("accounts", { users: next, setupComplete: true }); return next; });
  }, [currentUserId]);
  const setHabits = (h) => setHabitsState((prev) => { const next = typeof h === "function" ? h(prev || []) : h; saveKey("habits", next); return next; });
  const setTasks = (u) => setTasksState((prev) => { const next = typeof u === "function" ? u(prev || []) : u; saveKey("tasks", next); return next; });
  const setDocs = (u) => setDocsState((prev) => { const next = typeof u === "function" ? u(prev || []) : u; saveKey("docs", next); return next; });
  const setClients = (c) => { setClientsState(c); saveKey("clients", c); };
  const setFinance = (f) => { setFinanceState(f); saveKey("finance", f); };
  const setSchedules = (s) => { setSchedulesState(s); saveKey("schedules", s); };

  const loginAs = (id) => { setCurrentUserId(id); try { localStorage.setItem("crica_user", id); } catch (e) { /* ignore */ } };
  const logout = () => { setCurrentUserId(null); setShowSettings(false); try { localStorage.removeItem("crica_user"); } catch (e) { /* ignore */ } };
  const goHome = () => { setTab("dashboard"); setShowSettings(false); };

  const me = users?.find((u) => u.id === currentUserId);

  // Presence: I'm online, and "working" when a task timer or focus session is live.
  // Defined here, after `me` exists, so it can safely reference it.
  const iAmWorking = (tasks || []).some((t) => t.working && t.working[currentUserId] != null)
    || (focusEngine.session && focusEngine.session.phase === "running");
  const workingRef = useRef(iAmWorking);
  workingRef.current = iAmWorking;
  useEffect(() => {
    if (!me) return;
    const beat = () => savePath(`presence/${currentUserId}`, { lastSeen: Date.now(), working: !!workingRef.current, name: me.name });
    beat();
    const id = setInterval(beat, 40000);
    const onVis = () => { if (document.visibilityState === "visible") beat(); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", beat);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onVis); window.removeEventListener("focus", beat); };
  }, [me?.id, currentUserId]);
  useEffect(() => { if (me) savePath(`presence/${currentUserId}`, { lastSeen: Date.now(), working: !!iAmWorking, name: me.name }); }, [iAmWorking]);

  // Re-render every 30s so presence dots and "last seen" text stay current.
  const [, setPresenceTick] = useState(0);
  useEffect(() => { const id = setInterval(() => setPresenceTick((t) => t + 1), 30000); return () => clearInterval(id); }, []);
  const presenceOf = (uid) => {
    const p = presence && presence[uid];
    if (!p || !p.lastSeen) return { state: "offline", lastSeen: null, working: false };
    const age = Date.now() - p.lastSeen;
    if (p.working && age < 140000) return { state: "working", lastSeen: p.lastSeen, working: true };
    if (age < 100000) return { state: "online", lastSeen: p.lastSeen, working: false };
    return { state: "offline", lastSeen: p.lastSeen, working: false };
  };

  const unreadUpdates = (updates || []).filter((u) => u.userId !== currentUserId && (u.createdAt || 0) > (me?.lastSeenUpdates || 0)).length;
  const myBalance = me ? earnedBalance(totalPoints(me.id, habits, tasks, focus, work), me) : 0;

  // Dev helper for testing the shop from the browser console: cricaDev.give(5000) / cricaDev.reset()
  useEffect(() => {
    if (typeof window === "undefined" || !me) return;
    window.cricaDev = {
      give: (n = 1000) => { setUsers(users.map((u) => u.id === currentUserId ? { ...u, spent: (u.spent || 0) - n } : u)); return `Added ${n} test points. Balance now about ${myBalance + n}.`; },
      reset: () => { setUsers(users.map((u) => u.id === currentUserId ? { ...u, spent: 0, owned: [], equip: {} } : u)); return "Reset done: purchases cleared and balance back to your real earned points."; },
      balance: () => myBalance,
      loginAs: (id) => { loginAs(id); return `Switched to ${id}. Reloading view.`; },
      logout: () => { logout(); return "Logged out."; },
      who: () => currentUserId,
    };
  }, [users, currentUserId, me, myBalance]);

  // One-time: make sure a hidden test account exists, so you can log in from the other side.
  const testerAddedRef = useRef(false);
  useEffect(() => {
    if (testerAddedRef.current || !users || users.length === 0) return;
    if (users.some((u) => u.id === "tester")) { testerAddedRef.current = true; return; }
    testerAddedRef.current = true;
    setUsers([...users, { id: "tester", name: "Tester", color: "#8E8E93", pw: hashPw("test"), hidden: true }]);
  }, [users]);

  // Keep my timezone on record so the other person sees my schedule in their own local time.
  useEffect(() => {
    if (!me) return;
    const tz = localTz();
    if (tz && me.tz !== tz) {
      setUsersState((prev) => { const next = (prev || []).map((u) => u.id === currentUserId ? { ...u, tz } : u); saveKey("accounts", { users: next, setupComplete: true }); return next; });
    }
  }, [me?.id, me?.tz, currentUserId]);

  // Alerts shown in the bar, only when something is due soon
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

  const openCount = useMemo(() => tasks.filter((t) => t.pool).length, [tasks]);

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

  // Bring up the focus overlay to celebrate when a session finishes
  useEffect(() => {
    if (focusEngine.session && focusEngine.session.phase === "done") setFocusOpen(true);
  }, [focusEngine.session?.phase]);

  // Pre-schedule background reminders (Chrome and Edge); harmless elsewhere
  useEffect(() => {
    if (!notifOn || !me) return;
    scheduleReminders({ tasks, clients, habits, me });
  }, [tasks, clients, habits, me, notifOn]);

  // Mini floating window (desktop): live while focusing or working a task
  const myWorkingTask = currentUserId ? tasks.find((t) => t.working && t.working[currentUserId] != null) : null;
  const focusActive = focusEngine.session && focusEngine.session.phase !== "done";
  const pipShouldShow = !!(focusActive || myWorkingTask);
  useEffect(() => {
    if (pip.pipWindow && !pipShouldShow) pip.closePip();
  }, [pipShouldShow, pip.pipWindow]);

  if (dbError) return <><GlobalStyle /><DbErrorScreen kind={dbError} /></>;
  if (loading || !users) return <><GlobalStyle /><div className="boot"><div className="boot-mark"><IconMark size={56} radius={14} /></div></div></>;
  if (!currentUserId || !me) return <><GlobalStyle /><LoginScreen users={users} onLogin={loginAs} /></>;

  const renderTab = () => {
    if (showSettings) return <ProfileTab users={users} me={me} setUsers={setUsers} onLogout={logout} dark={dark} setDark={setDark} notifOn={notifOn} enableNotifs={enableNotifs} habits={habits} tasks={tasks} focus={focus} work={work} presenceOf={presenceOf} />;
    switch (tab) {
      case "dashboard": return <Dashboard users={users} me={me} habits={habits} tasks={tasks} finance={finance} focus={focus} work={work} presenceOf={presenceOf} />;
      case "habits": return <HabitsTab users={users} me={me} habits={habits} setHabits={setHabits} />;
      case "tasks": return <TasksTab users={users} me={me} tasks={tasks} setTasks={setTasks} clients={clients} board={tasksBoard} setBoard={setTasksBoard} onWorkStart={() => pip.openPip()} onWorkEnd={logWork} updates={updates} onUpdate={logUpdate} onEditUpdate={editUpdate} onDeleteUpdate={deleteUpdate} onSeenUpdates={markUpdatesSeen} unreadUpdates={unreadUpdates} />;
      case "vault": return <CompanyTab finance={finance} setFinance={setFinance} clients={clients} setClients={setClients} />;
      case "report": return <DailyReport users={users} me={me} habits={habits} tasks={tasks} focus={focus} work={work} schedules={schedules} setSchedules={setSchedules} meetings={meetings} onPropose={proposeMeeting} />;
      case "docs": return <DocsTab docs={docs} setDocs={setDocs} me={me} users={users} />;
      case "tools": return <ToolsTab />;
      default: return null;
    }
  };

  return (
    <>
      <GlobalStyle />
      <div className="app-root">
        <div className="topbar">
          <header className="app-header">
            <button className="header-brand" onClick={goHome} aria-label="Go to home"><WideLogo height={48} /></button>
            <nav className="top-nav">
              {TABS.map((tb) => (
                <button key={tb.id} className={"top-nav-item " + (!showSettings && tab === tb.id ? "on" : "")} onClick={() => { setTab(tb.id); setShowSettings(false); }}>
                  <span className="nav-ic-wrap"><tb.icon size={16} />{tb.id === "tasks" && unreadUpdates > 0 && <span className="nav-badge">{unreadUpdates}</span>}</span> {tb.label}
                </button>
              ))}
            </nav>
            <button className="header-me" onClick={() => setShowSettings(true)}>
              <span className="coin-pill" title="Points you can spend in the shop"><Coins size={13} /> {myBalance.toLocaleString()}</span>
              <Avatar user={me} size={30} />
            </button>
          </header>
          <AlertBar alerts={alerts} openCount={openCount} onOpen={() => { setTasksBoard("pool"); setShowSettings(false); setTab("tasks"); }} meetings={meetings} users={users} me={me} onRespondMeeting={respondMeeting} onDismissMeeting={dismissMeeting} />
        </div>

        <main className="app-main">{renderTab()}</main>

        <nav className="bottom-nav">
          {TABS.filter((tb) => !MORE_IDS.includes(tb.id)).map((tb) => (
            <button key={tb.id} className={"bottom-nav-item " + (!showSettings && tab === tb.id ? "on" : "")} onClick={() => { setTab(tb.id); setShowSettings(false); }}>
              <span className="nav-ic-wrap"><tb.icon size={20} />{tb.id === "tasks" && unreadUpdates > 0 && <span className="nav-badge">{unreadUpdates}</span>}</span><span>{tb.label}</span>
            </button>
          ))}
          <button className={"bottom-nav-item " + (!showSettings && MORE_IDS.includes(tab) ? "on" : "")} onClick={() => setShowMore(true)}>
            <MoreHorizontal size={20} /><span>More</span>
          </button>
          <button className={"bottom-nav-item " + (showSettings ? "on" : "")} onClick={() => setShowSettings(true)}>
            <User size={20} /><span>Profile</span>
          </button>
        </nav>

        {showMore && (
          <div className="more-scrim" onClick={() => setShowMore(false)}>
            <div className="more-sheet" onClick={(e) => e.stopPropagation()}>
              <div className="more-grip" />
              <div className="more-title">More</div>
              {TABS.filter((tb) => MORE_IDS.includes(tb.id)).map((tb) => (
                <button key={tb.id} className={"more-item " + (!showSettings && tab === tb.id ? "on" : "")} onClick={() => { setTab(tb.id); setShowSettings(false); setShowMore(false); }}>
                  <tb.icon size={20} /> <span>{tb.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <FocusFab session={focusEngine.session} onOpen={() => setFocusOpen(true)} />
      <FocusOverlay open={focusOpen} engine={focusEngine} onStart={(m) => { focusEngine.start(m); pip.openPip(); }}
        onClose={() => { setFocusOpen(false); if (focusEngine.session?.phase === "done") focusEngine.dismiss(); }} />

      {pip.pipWindow && pipShouldShow && createPortal(
        <PipMini
          focus={focusEngine.session}
          workingTitle={myWorkingTask ? myWorkingTask.title : ""}
          workingStart={myWorkingTask ? myWorkingTask.working[currentUserId] : null}
          onPause={focusEngine.pause} onResume={focusEngine.resume} onEnd={focusEngine.end}
          onStopWork={promptStopWork}
        />, pip.pipWindow.document.body)}

      <Modal open={dailyPrompt} onClose={() => dismissDaily(false)} title={`Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}, ${me?.name || ""}`}>
        <p style={{ margin: "0 0 16px", color: "var(--ink-2)", fontSize: 15, lineHeight: 1.5 }}>
          A fresh day on the board. Take a quick look at how yesterday went before you dive in.
        </p>
        <div className="modal-actions">
          <Btn variant="ghost" onClick={() => dismissDaily(false)}>Later</Btn>
          <Btn variant="primary" onClick={() => dismissDaily(true)}><CalendarDays size={16} /> Open report</Btn>
        </div>
      </Modal>

      <StopModal open={stopPromptTask !== null} task={stopPromptTask} me={me || { id: currentUserId }}
        onClose={() => setStopPromptTask(null)}
        onPost={(note, markDone) => finishMyStop(stopPromptTask, { note, markDone, post: true })}
        onSkip={() => finishMyStop(stopPromptTask, { post: false })} />
    </>
  );
}
