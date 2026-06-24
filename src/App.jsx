import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { loadKey, saveKey, subscribeKey } from "./storage";
import { firebaseConfigured } from "./firebase";
import { Home, Repeat, CheckSquare, PiggyBank, CalendarDays, Clock, Receipt, User } from "lucide-react";

import { GlobalStyle } from "./styles";
import { Avatar, Modal, Btn, WideLogo, IconMark } from "./components/ui";
import { AlertBar } from "./components/AlertBar";
import { FocusFab, FocusOverlay } from "./components/Focus";
import { usePipWindow, PipMini } from "./components/PipMini";
import { createPortal } from "react-dom";
import { LoginScreen } from "./screens/LoginScreen";
import { DbErrorScreen } from "./screens/DbErrorScreen";
import { Dashboard } from "./tabs/Dashboard";
import { HabitsTab } from "./tabs/HabitsTab";
import { TasksTab } from "./tabs/TasksTab";
import { CompanyTab } from "./tabs/CompanyTab";
import { DailyReport } from "./tabs/DailyReport";
import { ProfileTab } from "./tabs/ProfileTab";

import { todayStr, dateDiff } from "./lib/dates";
import { nextInvoiceDate } from "./lib/invoices";
import { notify } from "./lib/notify";
import { scheduleReminders } from "./lib/reminders";
import { useFocusEngine } from "./lib/focus";
import { uid } from "./lib/format";
import { DEFAULT_USERS, DEFAULT_FINANCE } from "./lib/constants";

const TABS = [
  { id: "dashboard", label: "Home", icon: Home },
  { id: "habits", label: "Habits", icon: Repeat },
  { id: "tasks", label: "Tasks", icon: CheckSquare },
  { id: "vault", label: "Company", icon: PiggyBank },
  { id: "report", label: "Report", icon: CalendarDays },
];

const readView = () => { try { return localStorage.getItem("crica_view") || "dashboard"; } catch (e) { return "dashboard"; } };

export default function App() {
  const [users, setUsersState] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(() => { try { return localStorage.getItem("crica_user") || null; } catch (e) { return null; } });
  const [tab, setTab] = useState(() => { const v = readView(); return v !== "settings" ? v : "dashboard"; });
  const [showSettings, setShowSettings] = useState(() => readView() === "settings");
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(null);

  const [habits, setHabitsState] = useState([]);
  const [tasks, setTasksState] = useState([]);
  const [clients, setClientsState] = useState([]);
  const [finance, setFinanceState] = useState(DEFAULT_FINANCE);
  const [focus, setFocusState] = useState([]);
  const [work, setWorkState] = useState([]);
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
      subscribeKey("clients", (c) => setClientsState(c || [])),
      subscribeKey("finance", (f) => { if (f) setFinanceState(f); }),
      subscribeKey("focus", (f) => setFocusState(f || [])),
      subscribeKey("work", (w) => setWorkState(w || [])),
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
  const setHabits = (h) => { setHabitsState(h); saveKey("habits", h); };
  const setTasks = (t) => { setTasksState(t); saveKey("tasks", t); };
  const setClients = (c) => { setClientsState(c); saveKey("clients", c); };
  const setFinance = (f) => { setFinanceState(f); saveKey("finance", f); };
  const setSchedules = (s) => { setSchedulesState(s); saveKey("schedules", s); };

  const loginAs = (id) => { setCurrentUserId(id); try { localStorage.setItem("crica_user", id); } catch (e) { /* ignore */ } };
  const logout = () => { setCurrentUserId(null); setShowSettings(false); try { localStorage.removeItem("crica_user"); } catch (e) { /* ignore */ } };
  const goHome = () => { setTab("dashboard"); setShowSettings(false); };

  const me = users?.find((u) => u.id === currentUserId);

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
    if (showSettings) return <ProfileTab users={users} me={me} setUsers={setUsers} onLogout={logout} dark={dark} setDark={setDark} notifOn={notifOn} enableNotifs={enableNotifs} habits={habits} tasks={tasks} focus={focus} work={work} />;
    switch (tab) {
      case "dashboard": return <Dashboard users={users} me={me} habits={habits} tasks={tasks} finance={finance} focus={focus} />;
      case "habits": return <HabitsTab users={users} me={me} habits={habits} setHabits={setHabits} />;
      case "tasks": return <TasksTab users={users} me={me} tasks={tasks} setTasks={setTasks} clients={clients} board={tasksBoard} setBoard={setTasksBoard} onWorkStart={() => pip.openPip()} onWorkEnd={logWork} />;
      case "vault": return <CompanyTab finance={finance} setFinance={setFinance} clients={clients} setClients={setClients} />;
      case "report": return <DailyReport users={users} me={me} habits={habits} tasks={tasks} focus={focus} schedules={schedules} setSchedules={setSchedules} />;
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
                  <tb.icon size={16} /> {tb.label}
                </button>
              ))}
            </nav>
            <button className="header-me" onClick={() => setShowSettings(true)}><Avatar user={me} size={30} /></button>
          </header>
          <AlertBar alerts={alerts} openCount={openCount} onOpen={() => { setTasksBoard("pool"); setShowSettings(false); setTab("tasks"); }} />
        </div>

        <main className="app-main">{renderTab()}</main>

        <nav className="bottom-nav">
          {TABS.map((tb) => (
            <button key={tb.id} className={"bottom-nav-item " + (!showSettings && tab === tb.id ? "on" : "")} onClick={() => { setTab(tb.id); setShowSettings(false); }}>
              <tb.icon size={20} /><span>{tb.label}</span>
            </button>
          ))}
          <button className={"bottom-nav-item " + (showSettings ? "on" : "")} onClick={() => setShowSettings(true)}>
            <User size={20} /><span>Profile</span>
          </button>
        </nav>
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
          onStopWork={stopMyWork}
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
    </>
  );
}
