import { useState, useMemo } from "react";
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  CheckSquare, Flame, TrendingUp, PiggyBank, ChevronLeft, ChevronRight, Crown, Star, Award, Zap, Trophy, Timer,
} from "lucide-react";
import { Card, IconBtn, Avatar, Ring, PageHead } from "../components/ui";
import { useCountUp } from "../lib/hooks";
import { pointsOnDay, pointsInRange, totalPoints, evalHabit, focusSecondsInRange } from "../lib/points";
import { nameStyle } from "../lib/shop";
import { weekDates, startOfWeek, todayStr, parseDate, WEEKDAY, addDays, dateDiff, monthKey, prettyDate } from "../lib/dates";
import { BLUE } from "../lib/constants";
import { fmtMoney } from "../lib/format";

export const tooltipStyle = { background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, fontSize: 12, color: "var(--ink)", boxShadow: "var(--shadow)" };

function StatTile({ icon, label, value, accent }) {
  return (
    <Card className="stat-tile">
      <div className="stat-ic" style={{ color: accent || BLUE }}>{icon}</div>
      <div className="stat-val">{value}</div>
      <div className="stat-lab">{label}</div>
    </Card>
  );
}

export function Dashboard({ users: allUsers, me, habits, tasks, finance, focus = [], work = [] }) {
  const users = (allUsers || []).filter((u) => !u.hidden || u.id === me.id);
  const [anchor, setAnchor] = useState(todayStr());
  const week = useMemo(() => weekDates(anchor), [anchor]);
  const isCurrentWeek = startOfWeek(anchor) === startOfWeek(todayStr());

  const chartData = week.map((d) => {
    const row = { day: WEEKDAY[parseDate(d).getDay()], date: d };
    users.forEach((u, i) => { row["u" + i] = pointsOnDay(u.id, d, habits, tasks, focus, work); });
    return row;
  });

  const weekFrom = week[0], weekTo = week[6];
  const weekPoints = users.map((u) => pointsInRange(u.id, weekFrom, weekTo, habits, tasks, focus, work));
  const allTime = users.map((u) => totalPoints(u.id, habits, tasks, focus, work));
  const myFocusSecWeek = focusSecondsInRange(me.id, weekFrom, weekTo, focus);

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

      <Card className="vs-card">
        <div className="vs-side">
          <Avatar user={users[0]} size={44} />
          <div className="vs-name" style={nameStyle(users[0]) || undefined}>{users[0].name}</div>
          <div className="vs-points" style={{ color: users[0].color }}>{Math.round(useCountUp(weekPoints[0]))}</div>
          <div className="vs-lab">points</div>
        </div>
        <div className="vs-mid">
          {leader === null ? <span className="vs-tie">TIED</span> : <Crown size={22} style={{ color: BLUE }} />}
          <span className="vs-vs">VS</span>
        </div>
        <div className="vs-side">
          <Avatar user={users[1]} size={44} />
          <div className="vs-name" style={nameStyle(users[1]) || undefined}>{users[1].name}</div>
          <div className="vs-points" style={{ color: users[1].color }}>{Math.round(useCountUp(weekPoints[1]))}</div>
          <div className="vs-lab">points</div>
        </div>
      </Card>

      <div className="stat-grid">
        <StatTile icon={<CheckSquare size={18} />} label="Your tasks this week" value={tasksDoneWeek[myIdx]} />
        <StatTile icon={<Flame size={18} />} label="Best streak" value={bestStreak} accent="#FF9500" />
        <StatTile icon={<TrendingUp size={18} />} label="Your points (all time)" value={allTime[myIdx]} />
        <StatTile icon={<Timer size={18} />} label="Your focus this week" value={(() => { const m = Math.round(myFocusSecWeek / 60); return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`; })()} accent="#AF52DE" />
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
