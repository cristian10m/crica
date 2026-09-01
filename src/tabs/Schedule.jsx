import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2, Briefcase, Ban, Users, Check, Copy, CalendarPlus, Clock } from "lucide-react";
import { Card, Btn, IconBtn, Field, Modal, Avatar } from "../components/ui";
import { weekDates, todayStr, addDays, parseDate, prettyDate, MONTHS, tzOffsetMin, localTz } from "../lib/dates";
import { uid } from "../lib/format";
import {
  DAY_KEYS, DAY_LABELS, DAY_SHORT, busyFor, freeTogether, pct, fmtRange, fmtMin, weekdayKey, toMin, shiftIntervals,
  excEnd, excCovers, excDayCount,
} from "../lib/schedule";

const fmtDur = (mins) => {
  const h = Math.floor(mins / 60), m = mins % 60;
  if (!h) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
};

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
  // Only what is still ahead of you. Once the last day of a booking has passed it
  // leaves the list on its own, but stays in the data so past weeks still read right.
  const today = todayStr();
  const exceptions = (mySched.exceptions || [])
    .filter((ex) => excEnd(ex) >= today)
    .slice().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  // Work shifts, summarised for the compact editor below.
  const onKeys = DAY_KEYS.filter((k) => myWeek[k] && myWeek[k].on);
  const dayMins = (d) => { const st = toMin((d && d.start) || "09:00"), en = toMin((d && d.end) || "17:00"); return en > st ? en - st : 0; };
  const weekMins = onKeys.reduce((sum, k) => sum + dayMins(myWeek[k]), 0);
  // A new day copies the hours of the last day you set, so a normal week is a few taps.
  const defaultTimes = () => {
    const last = onKeys.length ? myWeek[onKeys[onKeys.length - 1]] : null;
    return { start: (last && last.start) || "09:00", end: (last && last.end) || "17:00" };
  };

  return (
    <div>
      <Card className="avail-card">
        <div className="avail-head">
          <div className="avail-title"><Users size={16} /> Free together</div>
          <div className="avail-nav">
            <IconBtn onClick={() => setAnchor(addDays(anchor, -7))}><ChevronLeft size={17} /></IconBtn>
            <span className="avail-week">{weekLabel}</span>
            <IconBtn onClick={() => setAnchor(addDays(anchor, 7))}><ChevronRight size={17} /></IconBtn>
          </div>
        </div>

        <div className="avail-legend">
          {users.map((u) => (
            <span key={u.id} className="avail-key"><i style={{ background: u.color }} />{u.name} busy</span>
          ))}
          <span className="avail-key"><i className="free" />Both free</span>
          <span className="avail-key-note">your local time</span>
        </div>

        <div className="avail-axis">
          <span className="avail-rowlab" />
          <div className="avail-axis-track">
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
            <div key={date} className={"avail-day" + (isToday ? " today" : "")}>
              <div className="avail-row">
                <span className="avail-rowlab">
                  <b>{DAY_SHORT[weekdayKey(date)]}</b> {dd.getDate()}
                </span>
                {/* One lane per day. The green block is the answer to the question
                    (when can we both talk); each person's busy time rides the top
                    and bottom edge, so identity is position as well as colour. */}
                <div className="avail-track">
                  <span className="avail-gridline" style={{ left: "33.3%" }} />
                  <span className="avail-gridline" style={{ left: "66.6%" }} />
                  {free.map(([st, en], j) => (
                    <span key={"f" + j} className="avail-free" style={{ left: pct(st) + "%", width: (pct(en) - pct(st)) + "%" }}
                      title={`Both free ${fmtRange(st, en)}`} />
                  ))}
                  {users.map((u, i) => busies[i].map(([st, en], j) => (
                    <span key={u.id + j} className={"avail-busy lane" + i} title={`${u.name} busy ${fmtRange(st, en)}`}
                      style={{ left: pct(st) + "%", width: (pct(en) - pct(st)) + "%", background: u.color }} />
                  )))}
                  {dayMeetings.map((m) => {
                    const ms = meetMin(m.start, m.fromId), me2 = meetMin(m.end, m.fromId);
                    if (ms == null || me2 == null) return null;
                    return <span key={m.id} className={"avail-meet " + m.status} style={{ left: pct(ms) + "%", width: Math.max(1.2, pct(me2) - pct(ms)) + "%" }} />;
                  })}
                </div>
                <span className={"avail-when" + (free.length ? "" : " none")}>
                  {free.length ? free.map(([st, en]) => fmtRange(st, en)).join(", ") : "nothing shared"}
                </span>
                {free.length > 0 && onPropose && other ? (
                  <button className="avail-add" title="Propose a meeting"
                    onClick={() => setProposeFor({ date, start: minToHHMM(free[0][0]), end: minToHHMM(Math.min(free[0][1], free[0][0] + 60)) })}>
                    <CalendarPlus size={15} />
                  </button>
                ) : <span className="avail-add-gap" />}
              </div>

              {dayMeetings.length > 0 && (
                <div className="avail-meets">
                  {dayMeetings.map((m) => {
                    const fromMe = m.fromId === me.id;
                    const who = fromMe ? (other ? other.name : "them") : (userById(m.fromId)?.name || "them");
                    const ms = meetMin(m.start, m.fromId), meEnd = meetMin(m.end, m.fromId);
                    return (
                      <span key={m.id} className={"avail-meet-chip " + m.status}>
                        <Clock size={12} /> {ms != null && meEnd != null ? fmtRange(ms, meEnd) : `${m.start} to ${m.end}`}
                        <i>{m.status === "accepted" ? "confirmed" : fromMe ? `sent to ${who}` : `${who} proposed`}</i>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </Card>

      <div className="settings-divider">Your schedule</div>

      <div className="sched-setup">
        <Card>
          <div className="card-title"><Briefcase size={15} /> Work shifts <span className="muted-small" style={{ fontWeight: 500 }}>· {weekLabel}</span></div>
          <p className="muted-small" style={{ marginBottom: 12 }}>Tap the days you are at work, then set the hours. This shows as busy time.</p>

          <div className="rota-picker">
            {DAY_KEYS.map((key) => {
              const on = !!(myWeek[key] && myWeek[key].on);
              return (
                <button key={key} type="button" className={"rota-pip" + (on ? " on" : "")} aria-pressed={on} title={DAY_LABELS[key]}
                  onClick={() => setDay(key, on ? { on: false } : { on: true, ...defaultTimes() })}>
                  {DAY_SHORT[key].charAt(0)}
                </button>
              );
            })}
          </div>

          <div className="rota-summary">
            <span className="rota-total">
              {onKeys.length
                ? <><b>{onKeys.length}</b> day{onKeys.length === 1 ? "" : "s"} · <b>{fmtDur(weekMins)}</b> this week</>
                : "No working days set"}
            </span>
            {hasPrev && <button type="button" className="rota-link" onClick={copyLastWeek}><Copy size={13} /> Copy last week</button>}
          </div>

          {onKeys.length > 0 && (
            <div className="rota-list">
              {onKeys.map((key) => {
                const day = myWeek[key];
                return (
                  <div key={key} className="rota-line">
                    <span className="rota-line-day">{DAY_SHORT[key]}</span>
                    <input type="time" value={day.start || "09:00"} onChange={(e) => setDay(key, { ...day, start: e.target.value })} />
                    <span className="rota-dash">to</span>
                    <input type="time" value={day.end || "17:00"} onChange={(e) => setDay(key, { ...day, end: e.target.value })} />
                    <span className="rota-line-len">{fmtDur(dayMins(day))}</span>
                    <button type="button" className="rota-copy" title="Use these hours on every working day" onClick={() => cloneToWorking(key)}>
                      <Copy size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card>
          <div className="card-title"><Ban size={15} /> Other plans</div>
          <p className="muted-small" style={{ marginBottom: 12 }}>Block off anything else going on, so it does not count as free. Past bookings clear themselves.</p>
          {exceptions.length === 0 && <p className="muted-small">Nothing booked. Add a day, or a run of days, you are busy.</p>}
          {exceptions.map((ex) => {
            const end = excEnd(ex);
            const span = end !== ex.date;
            const live = excCovers(ex, today);
            return (
              <div key={ex.id} className="exc-row">
                <div className="exc-main">
                  <div className="exc-date">
                    {span ? `${prettyDate(ex.date)} to ${prettyDate(end)}` : prettyDate(ex.date)}
                    {span && <span className="exc-tag">{excDayCount(ex)} days</span>}
                    {live && <span className="exc-tag now">on now</span>}
                  </div>
                  <div className="exc-detail">
                    {ex.allDay ? "All day" : fmtRange(toMin(ex.start), toMin(ex.end))}
                    {!ex.allDay && span ? ", each day" : ""}
                    {ex.label ? "  ·  " + ex.label : ""}
                  </div>
                </div>
                <IconBtn onClick={() => removeException(ex.id)}><Trash2 size={15} /></IconBtn>
              </div>
            );
          })}
          <div className="modal-actions"><Btn variant="ghost" onClick={() => setExcOpen(true)}><Plus size={16} /> Add time off</Btn></div>
        </Card>
      </div>

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
  const [endDate, setEndDate] = useState(todayStr());
  const [multi, setMulti] = useState(false);
  const [allDay, setAllDay] = useState(true);
  const [start, setStart] = useState("18:00");
  const [end, setEnd] = useState("20:00");
  const [label, setLabel] = useState("");

  useEffect(() => {
    if (!open) return;
    const t = todayStr();
    setDate(t); setEndDate(t); setMulti(false); setAllDay(true); setStart("18:00"); setEnd("20:00"); setLabel("");
  }, [open]);

  const last = multi && endDate > date ? endDate : date;
  const days = excDayCount({ date, endDate: last });
  const badTimes = !allDay && (toMin(start) == null || toMin(end) == null || toMin(end) <= toMin(start));

  // Moving the first day past the last one drags the last one along with it.
  const setFrom = (v) => { setDate(v); if (endDate < v) setEndDate(v); };

  const add = () => {
    if (badTimes) return;
    onAdd({
      date,
      endDate: last > date ? last : null,
      allDay,
      start: allDay ? null : start,
      end: allDay ? null : end,
      label: label.trim(),
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="Add time off">
      <div className="seg-pills">
        <button className={"pill " + (!multi ? "pill-on" : "")} onClick={() => { setMulti(false); setEndDate(date); }}>One day</button>
        <button className={"pill " + (multi ? "pill-on" : "")} onClick={() => setMulti(true)}>Several days</button>
      </div>

      {multi ? (
        <div className="grid-2">
          <Field label="First day"><input type="date" value={date} onChange={(e) => setFrom(e.target.value)} /></Field>
          <Field label="Last day"><input type="date" min={date} value={endDate} onChange={(e) => setEndDate(e.target.value < date ? date : e.target.value)} /></Field>
        </div>
      ) : (
        <Field label="Date"><input type="date" value={date} onChange={(e) => setFrom(e.target.value)} /></Field>
      )}
      {multi && <p className="muted-small" style={{ margin: "-4px 0 12px" }}>{days} day{days === 1 ? "" : "s"} blocked off.</p>}

      <div className="seg-pills">
        <button className={"pill " + (allDay ? "pill-on" : "")} onClick={() => setAllDay(true)}>All day</button>
        <button className={"pill " + (!allDay ? "pill-on" : "")} onClick={() => setAllDay(false)}>A time range</button>
      </div>
      {!allDay && (
        <>
          <div className="rota-times" style={{ marginTop: 12 }}>
            <input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
            <span>to</span>
            <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
          <p className={"muted-small" + (badTimes ? " field-warn" : "")} style={{ marginTop: 8 }}>
            {badTimes ? "The end time has to be after the start time." : days > 1 ? `These hours are blocked on each of the ${days} days.` : "Blocked on that day only."}
          </p>
        </>
      )}

      <Field label="Label (optional)"><input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Dentist, holiday" maxLength={40} /></Field>
      <div className="modal-actions"><Btn variant="primary" disabled={badTimes} onClick={add}><Check size={16} /> Add</Btn></div>
    </Modal>
  );
}
