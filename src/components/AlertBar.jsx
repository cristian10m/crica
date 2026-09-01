import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, Swords, Check, X, CalendarClock } from "lucide-react";
import { prettyDate, parseDate, tzOffsetMin, localTz, todayStr } from "../lib/dates";

const toMin = (hhmm) => { if (!hhmm) return null; const [h, m] = hhmm.split(":").map(Number); return h * 60 + (m || 0); };
const fmtMin = (min) => {
  if (min == null) return "";
  let h = Math.floor(((min % 1440) + 1440) % 1440 / 60); const m = (((min % 60) + 60) % 60);
  const ap = h >= 12 ? "pm" : "am"; let hh = h % 12; if (hh === 0) hh = 12;
  return m === 0 ? `${hh}${ap}` : `${hh}:${String(m).padStart(2, "0")}${ap}`;
};

export function AlertBar({ alerts = [], openCount = 0, onOpen, meetings = [], users = [], me, onRespondMeeting, onDismissMeeting }) {
  const myId = me?.id;

  // Anything you have not acknowledged yet lights the bar up until you hit the
  // check, so a new announcement can no longer slip past unnoticed.
  const seenKey = "crica_alerts_seen_" + (myId || "");
  const [seenVer, setSeenVer] = useState(0);
  const [day, setDay] = useState(todayStr());
  // Roll the acknowledgement over at midnight without needing a refresh.
  useEffect(() => {
    const id = setInterval(() => setDay((d) => (todayStr() === d ? d : todayStr())), 60000);
    return () => clearInterval(id);
  }, []);
  const seen = useMemo(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(seenKey) || "null");
      if (!raw || raw.date !== day) return new Set(); // yesterday's "got it" does not carry over
      return new Set(raw.texts || []);
    } catch (e) { return new Set(); }
  }, [seenKey, seenVer, day, alerts.length]);
  const unseen = alerts.filter((a) => !seen.has(a.text));
  const markRead = () => {
    try {
      const texts = [...new Set([...seen, ...alerts.map((a) => a.text)])].slice(-60);
      localStorage.setItem(seenKey, JSON.stringify({ date: day, texts }));
    } catch (e) { /* ignore */ }
    setSeenVer((v) => v + 1);
  };
  // A fresh announcement jumps to the front of the strip and the strip
  // scrolls back to the start, so it is never hidden off the right edge.
  const ordered = useMemo(
    () => [...alerts].sort((a, b) => (seen.has(a.text) ? 1 : 0) - (seen.has(b.text) ? 1 : 0)),
    [alerts, seen]
  );
  const trackRef = useRef(null);
  useEffect(() => { if (unseen.length && trackRef.current) trackRef.current.scrollLeft = 0; }, [unseen.length]);

  const incoming = (meetings || []).filter((m) => m.toId === myId && m.status === "pending");
  const acceptedForMe = (meetings || []).filter((m) => m.fromId === myId && m.status === "accepted" && !m.seenByFrom);
  const declinedForMe = (meetings || []).filter((m) => m.fromId === myId && m.status === "declined" && !m.seenByFrom);
  const hasMeeting = incoming.length || acceptedForMe.length || declinedForMe.length;
  if (!alerts.length && !openCount && !hasMeeting) return null;
  const nameOf = (id) => users.find((u) => u.id === id)?.name || "Someone";

  // Show a meeting's time in my own local time (it was entered in the proposer's local time).
  const localRange = (m) => {
    try {
      const noon = parseDate(m.date); noon.setHours(12, 0, 0, 0);
      const viewerTz = me?.tz || localTz();
      const fromU = users.find((u) => u.id === m.fromId);
      const delta = tzOffsetMin(viewerTz, noon) - tzOffsetMin((fromU && fromU.tz) || viewerTz, noon);
      const s = toMin(m.start), e = toMin(m.end);
      if (s == null || e == null) return `${m.start} to ${m.end}`;
      return `${fmtMin(s + delta)} to ${fmtMin(e + delta)}`;
    } catch (err) { return `${m.start} to ${m.end}`; }
  };

  return (
    <div className={"alert-bar" + (unseen.length ? " has-new" : "")}>
      {incoming.map((m) => (
        <div key={m.id} className="alert-meeting">
          <CalendarClock size={13} /> <span>{nameOf(m.fromId)} wants to meet {prettyDate(m.date)}, {localRange(m)}{m.note ? ` · ${m.note}` : ""}</span>
          <button className="meet-yes" onClick={() => onRespondMeeting(m.id, "accepted")}><Check size={13} /> Accept</button>
          <button className="meet-no" onClick={() => onRespondMeeting(m.id, "declined")} aria-label="Decline"><X size={14} /></button>
        </div>
      ))}
      {acceptedForMe.map((m) => (
        <div key={m.id} className="alert-meeting ok">
          <Check size={13} /> <span>{nameOf(m.toId)} accepted, {prettyDate(m.date)}, {localRange(m)}</span>
          <button className="meet-no" onClick={() => onDismissMeeting(m.id)} aria-label="Dismiss"><X size={14} /></button>
        </div>
      ))}
      {declinedForMe.map((m) => (
        <div key={m.id} className="alert-meeting no">
          <span>{nameOf(m.toId)} can't make {prettyDate(m.date)}</span>
          <button className="meet-no" onClick={() => onDismissMeeting(m.id)} aria-label="Dismiss"><X size={14} /></button>
        </div>
      ))}
      {openCount > 0 && (
        <button className="alert-open" onClick={onOpen} aria-label="View tasks up for grabs">
          <Swords size={13} /> {openCount} up for grabs
        </button>
      )}
      {alerts.length > 0 && (
        <span className="alert-bell">
          <Bell size={15} />
          {unseen.length > 0 && <span className="alert-bell-count">{unseen.length}</span>}
        </span>
      )}
      <div className="alert-track" ref={trackRef}>
        {ordered.map((a, i) => (
          <span key={a.text + i} className={"alert-item " + (a.kind || "") + (seen.has(a.text) ? "" : " new")}>{a.icon}{a.text}</span>
        ))}
      </div>
      {unseen.length > 0 && (
        <button className="alert-read-btn" onClick={markRead} title="Mark all as read">
          <Check size={13} /> Got it
        </button>
      )}
    </div>
  );
}
