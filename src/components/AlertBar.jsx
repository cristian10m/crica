import { Bell, Swords, Check, X, CalendarClock } from "lucide-react";
import { prettyDate } from "../lib/dates";

export function AlertBar({ alerts = [], openCount = 0, onOpen, meetings = [], users = [], me, onRespondMeeting, onDismissMeeting }) {
  const myId = me?.id;
  const incoming = (meetings || []).filter((m) => m.toId === myId && m.status === "pending");
  const acceptedForMe = (meetings || []).filter((m) => m.fromId === myId && m.status === "accepted" && !m.seenByFrom);
  const declinedForMe = (meetings || []).filter((m) => m.fromId === myId && m.status === "declined" && !m.seenByFrom);
  const hasMeeting = incoming.length || acceptedForMe.length || declinedForMe.length;
  if (!alerts.length && !openCount && !hasMeeting) return null;
  const nameOf = (id) => users.find((u) => u.id === id)?.name || "Someone";

  return (
    <div className="alert-bar">
      {incoming.map((m) => (
        <div key={m.id} className="alert-meeting">
          <CalendarClock size={13} /> <span>{nameOf(m.fromId)} wants to meet {prettyDate(m.date)}, {m.start} to {m.end}{m.note ? ` · ${m.note}` : ""}</span>
          <button className="meet-yes" onClick={() => onRespondMeeting(m.id, "accepted")}><Check size={13} /> Accept</button>
          <button className="meet-no" onClick={() => onRespondMeeting(m.id, "declined")} aria-label="Decline"><X size={14} /></button>
        </div>
      ))}
      {acceptedForMe.map((m) => (
        <div key={m.id} className="alert-meeting ok">
          <Check size={13} /> <span>{nameOf(m.toId)} accepted, {prettyDate(m.date)} at {m.start}</span>
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
