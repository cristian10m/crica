import { Bell, Swords } from "lucide-react";

export function AlertBar({ alerts, openCount = 0, onOpen }) {
  if (!alerts.length && !openCount) return null;
  return (
    <div className="alert-bar">
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
