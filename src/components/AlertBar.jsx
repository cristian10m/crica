import { Bell } from "lucide-react";

export function AlertBar({ alerts }) {
  if (!alerts.length) return null;
  return (
    <div className="alert-bar">
      <Bell size={15} />
      <div className="alert-track">
        {alerts.map((a, i) => (
          <span key={i} className="alert-item">{a.icon}{a.text}</span>
        ))}
      </div>
    </div>
  );
}
