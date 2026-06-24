import { useState } from "react";
import { Lock } from "lucide-react";
import { WideLogo, Avatar, Field, Btn } from "../components/ui";
import { hashPw } from "../lib/format";

export function LoginScreen({ users, onLogin }) {
  const [selected, setSelected] = useState(null);
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [taps, setTaps] = useState(0);
  const revealed = taps >= 5;
  const shown = (users || []).filter((u) => !u.hidden || revealed);
  const go = () => {
    if (!selected) return;
    if (hashPw(pw) === selected.pw) onLogin(selected.id);
    else setErr("Wrong password.");
  };
  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="brand-wrap" onClick={() => setTaps((t) => t + 1)}><WideLogo height={46} /></div>
        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-sub">Pick your account to log in.</p>
        <div className="login-users">
          {shown.map((u) => (
            <button key={u.id} className={"login-user " + (selected?.id === u.id ? "login-user-on" : "")} onClick={() => { setSelected(u); setErr(""); setPw(""); }}>
              <Avatar user={u} size={48} /><span>{u.name}</span>
            </button>
          ))}
        </div>
        {revealed && users.some((u) => u.hidden) && <p className="auth-sub" style={{ marginTop: 6 }}>Test account unlocked.</p>}
        {selected && (
          <>
            <Field label={`Password for ${selected.name}`}>
              <input type="password" autoFocus value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()} />
            </Field>
            {err && <div className="auth-err">{err}</div>}
            <Btn className="full" onClick={go}><Lock size={16} /> Log in</Btn>
          </>
        )}
      </div>
    </div>
  );
}
