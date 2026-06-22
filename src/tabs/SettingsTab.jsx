import { useState } from "react";
import { Check, LogOut } from "lucide-react";
import { Card, Btn, Field, PageHead } from "../components/ui";
import { hashPw } from "../lib/format";
import { BLUE, HABIT_POINTS, TASK_IMPORTANCE } from "../lib/constants";

export function SettingsTab({ users, me, setUsers, onLogout, dark, setDark, notifOn, enableNotifs }) {
  const [name, setName] = useState(me.name);
  const [color, setColor] = useState(me.color);
  const [newPw, setNewPw] = useState("");
  const colors = [BLUE, "#1d1d1f", "#0a5fb8", "#34C759", "#FF9500", "#AF52DE", "#FF2D55", "#5AC8FA"];
  const [saved, setSaved] = useState(false);
  const save = () => {
    setUsers(users.map((u) => u.id === me.id ? { ...u, name: name.trim() || u.name, color, ...(newPw.length >= 3 ? { pw: hashPw(newPw) } : {}) } : u));
    setNewPw(""); setSaved(true); setTimeout(() => setSaved(false), 1500);
  };
  return (
    <div className="page">
      <PageHead title="Settings" subtitle="Your profile, the look, and how points work." />
      <Card>
        <div className="card-title">Your profile</div>
        <Field label="Name"><input value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <span className="field-label">Your color</span>
        <div className="color-row">{colors.map((c) => <button key={c} className={"swatch " + (color === c ? "swatch-on" : "")} style={{ background: c }} onClick={() => setColor(c)} />)}</div>
        <Field label="New password (leave blank to keep)"><input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} /></Field>
        <div className="modal-actions"><Btn onClick={save}>{saved ? <><Check size={16} /> Saved</> : "Save profile"}</Btn></div>
      </Card>

      <Card>
        <div className="card-title">Appearance and alerts</div>
        <div className="toggle-row">
          <span>Dark mode</span>
          <button className={"toggle " + (dark ? "toggle-on" : "")} onClick={() => setDark(!dark)} aria-label="Toggle dark mode"><span className="toggle-knob" /></button>
        </div>
        <div className="toggle-row">
          <span>Desktop notifications</span>
          <button className={"toggle " + (notifOn ? "toggle-on" : "")} onClick={enableNotifs} aria-label="Enable notifications"><span className="toggle-knob" /></button>
        </div>
        <p className="muted-small">Notifications fire for tasks and invoices due soon, plus a daily nudge to check yesterday's report. They show while Crica is open in a tab.</p>
      </Card>

      <Card>
        <div className="card-title">How points work</div>
        <div className="points-legend">
          <div className="legend-block"><b>Habits (per day kept)</b>
            <div className="legend-line"><span>Any habit</span><span>+{HABIT_POINTS}</span></div>
          </div>
          <div className="legend-block"><b>Tasks (when completed)</b>
            {Object.values(TASK_IMPORTANCE).map((d) => <div key={d.label} className="legend-line"><span>{d.label}</span><span>+{d.points}</span></div>)}
          </div>
        </div>
        <p className="muted-small">Miss a habit one day and you get a warning. Miss two days in a row and the streak resets. A habit missed once is a slip, missed twice is a new habit.</p>
      </Card>

      <Card>
        <div className="card-title">Session</div>
        <Btn variant="ghost-danger" onClick={onLogout}><LogOut size={16} /> Log out</Btn>
      </Card>
    </div>
  );
}
