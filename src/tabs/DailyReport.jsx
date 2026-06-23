import { useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays, Crown, CheckSquare, Repeat, Check, Timer } from "lucide-react";
import { Card, IconBtn, Avatar, PageHead } from "../components/ui";
import { pointsOnDay, focusSecondsInRange } from "../lib/points";
import { addDays, todayStr, dateDiff, prettyDate } from "../lib/dates";
import { Schedule } from "./Schedule";

export function DailyReport({ users, me, habits, tasks, focus = [], schedules = {}, setSchedules }) {
  const [day, setDay] = useState(addDays(todayStr(), -1));
  const isYesterday = day === addDays(todayStr(), -1);
  const canForward = dateDiff(todayStr(), day) > 0;

  const data = users.map((u) => {
    const tasksDone = tasks.filter((t) => (t.completed || {})[u.id] === day);
    const habitsDone = habits.filter((h) => h.ownerId === u.id && (h.completions || {})[day]);
    const focusMin = Math.round(focusSecondsInRange(u.id, day, day, focus) / 60);
    const pts = pointsOnDay(u.id, day, habits, tasks, focus);
    return { user: u, tasksDone, habitsDone, focusMin, pts };
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
            {d.focusMin > 0 && <div className="report-line"><Timer size={14} /> {d.focusMin} min focused</div>}
            {d.tasksDone.length > 0 && (
              <div className="report-tasks">
                {d.tasksDone.slice(0, 6).map((t) => <div key={t.id} className="report-task"><Check size={12} /> {t.title}</div>)}
                {d.tasksDone.length > 6 && <div className="muted-small">and {d.tasksDone.length - 6} more</div>}
              </div>
            )}
          </Card>
        ))}
      </div>

      <div className="settings-divider">Availability</div>
      <Schedule users={users} me={me} schedules={schedules} setSchedules={setSchedules} />
    </div>
  );
}
