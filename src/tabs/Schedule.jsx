import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2, Briefcase, Ban, Users, Check, Copy, CalendarPlus, Clock } from "lucide-react";
import { Card, Btn, IconBtn, Field, Modal, Avatar } from "../components/ui";
import { weekDates, todayStr, addDays, parseDate, prettyDate, MONTHS, tzOffsetMin, localTz } from "../lib/dates";
import { uid } from "../lib/format";
import {
  DAY_KEYS, DAY_LABELS, DAY_SHORT, busyFor, freeTogether, pct, fmtRange, fmtMin, weekdayKey, toMin, shiftIntervals,
} from "../lib/schedule";

const minToHHMM = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

export function Schedule({ users: allUsers, me, schedules, setSchedules, meetings = [], onPropose }) {
  const users = (allUsers || []).filter((u) => !u.hidden || u.id === me.id);
  const [anchor, setAnchor] = useState(todayStr());
  const [excOpen, setExcOpen] = useState(false);
  const [proposeFor, setProposeFor] = useState(null); // { date, start, end }
  const other = users.find((u) => u.id !== me.id);
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
      <div className="sched-intro"><Users size={15} /> Green is when you are both free to call and work together, shown in your own local time. Each week has its own shifts, set yours below.</div>

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
        const noon = parseDate(date); noon.setHours(12, 0, 0, 0);
        const viewerTz = me.tz || localTz();
        const viewerOff = tzOffsetMin(viewerTz, noon);
        const offFor = (u) => tzOffsetMin(u.tz || viewerTz, noon);
        const busies = users.map((u) => shiftIntervals(busyFor(schedules[u.id], date), viewerOff - offFor(u)));
        const free = freeTogether(busies);
        const dd = parseDate(date);
        const userById = (id) => users.find((u) => u.id === id);
        const meetMin = (hhmm, fromId) => { const m = toMin(hhmm); const fu = userById(fromId); return m == null ? null : m + (viewerOff - (fu ? offFor(fu) : viewerOff)); };
        const dayMeetings = (meetings || []).filter((m) => m.date === date && m.status !== "declined");
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
            {dayMeetings.map((m) => {
              const fromMe = m.fromId === me.id;
              const who = fromMe ? (other ? other.name : "them") : (userById(m.fromId)?.name || "them");
              const ms = meetMin(m.start, m.fromId), meEnd = meetMin(m.end, m.fromId);
              return (
                <div key={m.id} className={"sched-meeting " + m.status}>
                  <Clock size={13} /> {ms != null && meEnd != null ? fmtRange(ms, meEnd) : `${m.start} to ${m.end}`}
                  <span className="sched-meeting-status">{m.status === "accepted" ? "confirmed" : fromMe ? `sent to ${who}` : `${who} proposed`}</span>
                </div>
              );
            })}
            {free.length > 0 && onPropose && other && (
              <button className="sched-propose" onClick={() => setProposeFor({ date, start: minToHHMM(free[0][0]), end: minToHHMM(Math.min(free[0][1], free[0][0] + 60)) })}>
                <CalendarPlus size={14} /> Propose a meeting
              </button>
            )}
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
      <ProposeModal open={proposeFor !== null} init={proposeFor} other={other}
        onClose={() => setProposeFor(null)}
        onSend={(data) => { if (onPropose) onPropose(data); setProposeFor(null); }} />
    </div>
  );
}

function ProposeModal({ open, init, other, onClose, onSend }) {
  const [start, setStart] = useState("18:00");
  const [end, setEnd] = useState("19:00");
  const [note, setNote] = useState("");
  useEffect(() => { if (open) { setStart(init?.start || "18:00"); setEnd(init?.end || "19:00"); setNote(""); } }, [open, init]);
  return (
    <Modal open={open} onClose={onClose} title="Propose a meeting">
      {init && <p className="muted-small" style={{ marginBottom: 12 }}>{prettyDate(init.date)}, sent to {other ? other.name : "your partner"} to accept.</p>}
      <div className="rota-times">
        <span className="field-label" style={{ margin: 0 }}>From</span>
        <input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
        <span>to</span>
        <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
      </div>
      <Field label="Note (optional)"><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="What's it about?" maxLength={80} /></Field>
      <div className="modal-actions"><Btn onClick={() => onSend({ date: init.date, start, end, note: note.trim() })}><Check size={16} /> Send request</Btn></div>
    </Modal>
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
