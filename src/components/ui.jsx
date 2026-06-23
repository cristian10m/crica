import { useState } from "react";
import { X, Crown } from "lucide-react";
import { BLUE } from "../lib/constants";

export function Card({ children, className = "", style, ...rest }) {
  return <div className={"card " + className} style={style} {...rest}>{children}</div>;
}
export function Btn({ children, variant = "primary", className = "", ...rest }) {
  return <button className={`btn btn-${variant} ${className}`} {...rest}>{children}</button>;
}
export function IconBtn({ children, className = "", ...rest }) {
  return <button className={"icon-btn " + className} {...rest}>{children}</button>;
}
export function Segmented({ options, value, onChange }) {
  return (
    <div className="segmented">
      {options.map((o) => (
        <button key={o.value} className={"seg " + (value === o.value ? "seg-active" : "")} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
export function Modal({ open, onClose, title, children, wide }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={"modal " + (wide ? "modal-wide" : "")} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{title}</h3>
          <IconBtn onClick={onClose}><X size={18} /></IconBtn>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
export function Field({ label, children }) {
  return <label className="field"><span className="field-label">{label}</span>{children}</label>;
}
export function Ring({ value, size = 64, stroke = 7, color = BLUE, label, sub }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value));
  return (
    <div className="ring-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle className="ring-track" cx={size / 2} cy={size / 2} r={r} stroke="rgba(0,0,0,0.07)" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: "stroke-dashoffset .8s cubic-bezier(.2,.8,.2,1)" }} />
      </svg>
      <div className="ring-center">{label}{sub && <span className="ring-sub">{sub}</span>}</div>
    </div>
  );
}
export function Avatar({ user, size = 34 }) {
  if (!user) return null;
  if (user.avatar) {
    return <img className="avatar" src={user.avatar} alt={user.name} style={{ width: size, height: size, objectFit: "cover" }} />;
  }
  return (
    <div className="avatar" style={{ width: size, height: size, background: user.color, fontSize: size * 0.4 }}>
      {user.name.trim().charAt(0).toUpperCase()}
    </div>
  );
}
export function PageHead({ title, subtitle, children }) {
  return (
    <div className="page-head">
      <div><h2 className="page-title">{title}</h2>{subtitle && <div className="page-sub">{subtitle}</div>}</div>
      {children}
    </div>
  );
}

/* Wide brand logo (your 16:9 image with the name in it). Keeps aspect ratio. */
export function WideLogo({ height = 28 }) {
  const [err, setErr] = useState(false);
  if (err) return <IconMark size={height} radius={Math.round(height * 0.3)} />;
  return (
    <img src="/logo.png" alt="Crica" onError={() => setErr(true)}
      style={{ height, width: "auto", maxWidth: "100%", display: "block" }} />
  );
}

/* Square mark (favicon / loading / notifications). Falls back to a crown. */
export function IconMark({ size = 56, radius = 14 }) {
  const [err, setErr] = useState(false);
  if (err) {
    return (
      <div className="logo-fallback" style={{ width: size, height: size, borderRadius: radius }}>
        <Crown size={Math.round(size * 0.55)} />
      </div>
    );
  }
  return (
    <img src="/icon.png" alt="Crica" onError={() => setErr(true)}
      style={{ width: size, height: size, borderRadius: radius, objectFit: "cover", display: "block" }} />
  );
}
