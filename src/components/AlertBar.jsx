import { Bell, Swords, Check, X, CalendarClock } from "lucide-react";
import { prettyDate, parseDate, tzOffsetMin, localTz } from "../lib/dates";

const toMin = (hhmm) => { if (!hhmm) return null; const [h, m] = hhmm.split(":").map(Number); return h * 60 + (m || 0); };
const fmtMin = (min) => {
  if (min == null) return "";
  let h = Math.floor(((min % 1440) + 1440) % 1440 / 60); const m = (((min % 60) + 60) % 60);
  const ap = h >= 12 ? "pm" : "am"; let hh = h % 12; if (hh === 0) hh = 12;
  return m === 0 ? `${hh}${ap}` : `${hh}:${String(m).padStart(2, "0")}${ap}`;
};

export function AlertBar({ alerts = [], openCount = 0, onOpen, meetings = [], users = [], me, onRespondMeeting, onDismissMeeting }) {
  const myId = me?.id;
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
    <div className="alert-bar">
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
      {alerts.length > 0 && <Bell size={15} />}
      <div className="alert-track">
        {alerts.map((a, i) => (
          <span key={i} className="alert-item">{a.icon}{a.text}</span>
        ))}
      </div>
    </div>
  );
}
