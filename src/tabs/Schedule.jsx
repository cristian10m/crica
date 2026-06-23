import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2, Briefcase, Ban, Users, Check, Copy } from "lucide-react";
import { Card, Btn, IconBtn, Field, Modal, Avatar } from "../components/ui";
import { weekDates, todayStr, addDays, parseDate, prettyDate, MONTHS } from "../lib/dates";
import { uid } from "../lib/format";
import {
  DAY_KEYS, DAY_LABELS, DAY_SHORT, busyFor, freeTogether, pct, fmtRange, weekdayKey, toMin,
} from "../lib/schedule";

export function Schedule({ users, me, schedules, setSchedules }) {
  const [anchor, setAnchor] = useState(todayStr());
  const [excOpen, setExcOpen] = useState(false);
  const week = weekDates(anchor);
  const weekStart = week[0];
  const mySched = schedules[me.id] || {};

  // The shift map for the week being viewed (new per-week data, legacy fallback).
  const myWeek = (mySched.weeks && mySched.weeks[weekStart]) || mySched.week || {};

  const writeWeek = (newWeekObj) => setSchedules({
    ...schedules,
    [me.id]: { exceptions: [], ...mySched, weeks: { ...(mySched.weeks || {}), [weekStart]: newWeekObj } },
  });
  const setDay = (key, val) => writeWeek({ ...myWeek, [key]: val });
  const cloneToWorking = (key) => {
    const src = myWeek[key];
    if (!src || !src.on) return;
    const next = { ...myWeek };
    DAY_KEYS.forEach((d) => { if (next[d] && next[d].on) next[d] = { on: true, start: src.start, end: src.end }; });
    writeWeek(next);
  };
  const prevWeekData = (mySched.weeks && mySched.weeks[addDays(weekStart, -7)]) || mySched.week || {};
  const hasPrev = Object.values(prevWeekData).some((d) => d && d.on);
  const copyLastWeek = () => writeWeek({ ...prevWeekData });

  const updateMine = (patch) => setSchedules({ ...schedules, [me.id]: { exceptions: [], weeks: {}, ...mySched, ...patch } });
  const addException = (ex) => { updateMine({ exceptions: [...(mySched.exceptions || []), { id: uid(), ...ex }] }); setExcOpen(false); };
  const removeException = (id) => updateMine({ exceptions: (mySched.exceptions || []).filter((e) => e.id !== id) });

  const w0 = parseDate(week[0]), w6 = parseDate(week[6]);
  const weekLabel = `${w0.getDate()} ${MONTHS[w0.getMonth()]} to ${w6.getDate()} ${MONTHS[w6.getMonth()]}`;
  const exceptions = (mySched.exceptions || []).slice().sort((a, b) => (a.date < b.date ? -1 : 1));

  return (
    <div>
      <div className="sched-intro"><Users size={15} /> Green is when you are both free to call and work together. Each week has its own shifts, set yours below.</div>

      <div className="sched-week-head">
        <IconBtn onClick={() => setAnchor(addDays(anchor, -7))}><ChevronLeft size={18} /></IconBtn>
        <span className="sched-week-label">{weekLabel}</span>
        <IconBtn onClick={() => setAnchor(addDays(anchor, 7))}><ChevronRight size={18} /></IconBtn>
      </div>

      <div className="sched-axis">
        <span className="sched-axis-spacer" />
        <div className="sched-axis-track">
          <span style={{ left: "0%" }}>6am</span>
          <span style={{ left: "33.3%" }}>12pm</span>
          <span style={{ left: "66.6%" }}>6pm</span>
          <span style={{ left: "100%" }}>12am</span>
        </div>
      </div>

      {week.map((date) => {
        const isToday = date === todayStr();
        const busies = users.map((u) => busyFor(schedules[u.id], date));
        const free = freeTogether(busies);
        const dd = parseDate(date);
        return (
          <Card key={date} className={"sched-day " + (isToday ? "sched-today" : "")}>
            <div className="sched-day-head">
              <span className="sched-day-name">{DAY_SHORT[weekdayKey(date)]} {dd.getDate()}{isToday ? " · today" : ""}</span>
              <span className={"sched-free-text " + (free.length ? "has-free" : "no-free")}>
                {free.length ? free.map(([s, e]) => fmtRange(s, e)).join(",  ") : "No shared free time"}
              </span>
            </div>
            <div className="sched-lanes">
              {users.map((u, i) => (
                <div key={u.id} className="sched-lane">
                  <span className="sched-lane-name"><Avatar user={u} size={16} /></span>
                  <div className="sched-track">
                    {busies[i].length === 0 && <span className="sched-allfree">free all day</span>}
                    {busies[i].map(([s, e], j) => (
                      <span key={j} className="sched-busy" style={{ left: pct(s) + "%", width: (pct(e) - pct(s)) + "%", background: u.color }} />
                    ))}
                  </div>
                </div>
              ))}
              <div className="sched-lane">
                <span className="sched-lane-name sched-free-ic"><Users size={13} /></span>
                <div className="sched-track sched-free-track">
                  {free.map(([s, e], j) => (
                    <span key={j} className="sched-free" style={{ left: pct(s) + "%", width: (pct(e) - pct(s)) + "%" }} />
                  ))}
                </div>
              </div>
            </div>
          </Card>
        );
      })}

      <div className="settings-divider">Your schedule</div>

      <Card>
        <div className="card-title"><Briefcase size={15} /> Work shifts <span className="muted-small" style={{ fontWeight: 500 }}>· {weekLabel}</span></div>
        <p className="muted-small" style={{ marginBottom: 12 }}>The days and hours you are at work this week. This shows as busy time.</p>
        {hasPrev && <div className="modal-actions" style={{ justifyContent: "flex-start", marginTop: 0, marginBottom: 6 }}><Btn variant="ghost" onClick={copyLastWeek}><Copy size={15} /> Copy last week</Btn></div>}
        {DAY_KEYS.map((key) => {
          const day = myWeek[key] || { on: false };
          return (
            <div key={key} className="rota-row">
              <button className={"rota-toggle " + (day.on ? "on" : "")}
                onClick={() => setDay(key, day.on ? { on: false } : { on: true, start: day.start || "09:00", end: day.end || "17:00" })}>
                <span className="rota-day">{DAY_LABELS[key]}</span>
                <span className={"rota-status " + (day.on ? "" : "off")}>{day.on ? "working" : "off"}</span>
              </button>
              {day.on && (
                <div className="rota-times">
                  <input type="time" value={day.start || "09:00"} onChange={(e) => setDay(key, { ...day, start: e.target.value })} />
                  <span>to</span>
                  <input type="time" value={day.end || "17:00"} onChange={(e) => setDay(key, { ...day, end: e.target.value })} />
                  <IconBtn className="rota-clone" title="Copy this time to all working days" onClick={() => cloneToWorking(key)}><Copy size={15} /></IconBtn>
                </div>
              )}
            </div>
          );
        })}
      </Card>

      <Card>
        <div className="card-title"><Ban size={15} /> Other plans</div>
        <p className="muted-small" style={{ marginBottom: 12 }}>Block off anything else going on, so it does not count as free.</p>
        {exceptions.length === 0 && <p className="muted-small">Nothing booked. Add a day or time you are busy.</p>}
        {exceptions.map((ex) => (
          <div key={ex.id} className="exc-row">
            <div>
              <div className="exc-date">{prettyDate(ex.date)}</div>
              <div className="exc-detail">{ex.allDay ? "All day" : fmtRange(toMin(ex.start), toMin(ex.end))}{ex.label ? "  ·  " + ex.label : ""}</div>
            </div>
            <IconBtn onClick={() => removeException(ex.id)}><Trash2 size={15} /></IconBtn>
          </div>
        ))}
        <div className="modal-actions"><Btn variant="ghost" onClick={() => setExcOpen(true)}><Plus size={16} /> Add time off</Btn></div>
      </Card>

      <ExceptionModal open={excOpen} onClose={() => setExcOpen(false)} onAdd={addException} />
    </div>
  );
}

function ExceptionModal({ open, onClose, onAdd }) {
  const [date, setDate] = useState(todayStr());
  const [allDay, setAllDay] = useState(false);
  const [start, setStart] = useState("18:00");
  const [end, setEnd] = useState("20:00");
  const [label, setLabel] = useState("");

  const add = () => onAdd({ date, allDay, start: allDay ? null : start, end: allDay ? null : end, label: label.trim() });

  return (
    <Modal open={open} onClose={onClose} title="Add time off">
      <Field label="Date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      <div className="seg-pills">
        <button className={"pill " + (!allDay ? "pill-on" : "")} onClick={() => setAllDay(false)}>A time range</button>
        <button className={"pill " + (allDay ? "pill-on" : "")} onClick={() => setAllDay(true)}>All day</button>
      </div>
      {!allDay && (
        <div className="rota-times" style={{ marginTop: 12 }}>
          <input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
          <span>to</span>
          <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
      )}
      <Field label="Label (optional)"><input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Dentist, family" maxLength={40} /></Field>
      <div className="modal-actions"><Btn variant="primary" onClick={add}><Check size={16} /> Add</Btn></div>
    </Modal>
  );
}
