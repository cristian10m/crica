import { useState, useRef } from "react";
import { Camera, Check, LogOut, Trophy, Flame, CheckSquare, Repeat, Timer, Crown, Swords, TrendingUp, Zap, Trash2, Briefcase, Coins, Lock, Sparkles } from "lucide-react";
import { Card, Btn, Field, Avatar, PageHead } from "../components/ui";
import { hashPw } from "../lib/format";
import { BLUE } from "../lib/constants";
import { profileStats } from "../lib/points";
import { SHOP_ITEMS, KIND_LABEL, nameStyle, earnedBalance, decoSrc } from "../lib/shop";

const fmtFocus = (sec) => {
  const m = Math.round(sec / 60);
  if (m >= 60) return `${Math.floor(m / 60)}h ${m % 60}m`;
  return `${m}m`;
};

function computeBadges(s) {
  const b = [];
  if (s.bestStreak >= 7) b.push({ icon: <Flame size={16} />, t: "7 day streak" });
  if (s.bestStreak >= 30) b.push({ icon: <Crown size={16} />, t: "30 day streak" });
  if (s.bestStreak >= 100) b.push({ icon: <Crown size={16} />, t: "100 day streak" });
  if (s.points >= 500) b.push({ icon: <TrendingUp size={16} />, t: "500 points" });
  if (s.points >= 2000) b.push({ icon: <TrendingUp size={16} />, t: "2000 points" });
  if (s.tasksDone >= 50) b.push({ icon: <CheckSquare size={16} />, t: "50 tasks done" });
  if (s.tasksDone >= 250) b.push({ icon: <Zap size={16} />, t: "250 tasks done" });
  if (s.daysWon >= 10) b.push({ icon: <Trophy size={16} />, t: "10 days won" });
  if (s.daysWon >= 50) b.push({ icon: <Trophy size={16} />, t: "50 days won" });
  if (s.focusSec >= 36000) b.push({ icon: <Timer size={16} />, t: "10 hours focused" });
  return b;
}

export function ProfileTab({ users, me, setUsers, onLogout, dark, setDark, notifOn, enableNotifs, habits, tasks, focus, work = [] }) {
  const [viewId, setViewId] = useState(me.id);
  const viewed = users.find((u) => u.id === viewId) || me;
  const other = users.find((u) => u.id !== viewed.id);
  const isSelf = viewed.id === me.id;
  const stats = profileStats(viewed, other, habits, tasks, focus, work);
  const badges = computeBadges(stats);
  const balance = earnedBalance(stats.points, viewed);
  const owned = new Set(viewed.owned || []);
  const equip = viewed.equip || {};
  const buy = (item) => {
    if (owned.has(item.id) || balance < item.cost) return;
    setUsers(users.map((u) => u.id === me.id ? { ...u, owned: [...(u.owned || []), item.id], spent: (u.spent || 0) + item.cost, equip: { ...(u.equip || {}), [item.kind]: item.id } } : u));
  };
  const toggleEquip = (item) => {
    const cur = (me.equip || {})[item.kind];
    const next = cur === item.id ? null : item.id;
    setUsers(users.map((u) => u.id === me.id ? { ...u, equip: { ...(u.equip || {}), [item.kind]: next } } : u));
  };

  const h2h = !other ? null
    : stats.daysWon === stats.daysLost ? `Even with ${other.name}, ${stats.daysWon} each`
    : stats.daysWon > stats.daysLost ? `Leading ${other.name} ${stats.daysWon} to ${stats.daysLost}`
    : `Behind ${other.name} ${stats.daysWon} to ${stats.daysLost}`;

  const fileRef = useRef(null);
  const onPickImage = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const S = 256;
        const canvas = document.createElement("canvas");
        canvas.width = S; canvas.height = S;
        const ctx = canvas.getContext("2d");
        const scale = Math.max(S / img.width, S / img.height);
        const w = img.width * scale, h = img.height * scale;
        ctx.drawImage(img, (S - w) / 2, (S - h) / 2, w, h);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        setUsers(users.map((u) => u.id === me.id ? { ...u, avatar: dataUrl } : u));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="page">
      <PageHead title="Profile" subtitle="Your record, all time." />

      <div className="profile-switch">
        {users.filter((u) => !u.hidden || u.id === me.id).map((u) => (
          <button key={u.id} className={"profile-switch-btn " + (viewId === u.id ? "on" : "")} onClick={() => setViewId(u.id)}>
            <Avatar user={u} size={22} /> {u.id === me.id ? "You" : u.name}
          </button>
        ))}
      </div>

      <Card className="profile-hero">
        <div className="profile-avatar-wrap">
          <Avatar user={viewed} size={92} />
          {isSelf && (
            <button className="profile-cam" onClick={() => fileRef.current && fileRef.current.click()} aria-label="Change photo"><Camera size={16} /></button>
          )}
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { onPickImage(e.target.files[0]); e.target.value = ""; }} />
        </div>
        <div className="profile-name" style={nameStyle(viewed) || undefined}>{viewed.name}</div>
        <div className="profile-rank" style={{ color: stats.rank.color, borderColor: stats.rank.color + "55" }}>{stats.rank.title}</div>
        <div className="profile-balance"><Coins size={14} /> {balance.toLocaleString()} points to spend</div>
        {viewed.bio ? <div className="profile-bio">{viewed.bio}</div> : (isSelf && <div className="profile-bio muted-small">Add a motto in settings below.</div>)}
        {h2h && <div className="profile-h2h"><Swords size={14} /> {h2h}</div>}
      </Card>

      <div className="stat-grid">
        <StatBox icon={<TrendingUp size={18} />} label="Points all time" value={stats.points} accent={BLUE} />
        <StatBox icon={<Trophy size={18} />} label="Days won" value={stats.daysWon} accent="#FF9500" />
        <StatBox icon={<CheckSquare size={18} />} label="Tasks done" value={stats.tasksDone} accent="#34C759" />
        <StatBox icon={<Flame size={18} />} label="Best streak" value={stats.bestStreak} accent="#FF3B30" />
        <StatBox icon={<Repeat size={18} />} label="Habit days kept" value={stats.habitsKept} accent="#5AC8FA" />
        <StatBox icon={<Timer size={18} />} label="Focus time" value={fmtFocus(stats.focusSec)} accent="#AF52DE" />
        <StatBox icon={<Briefcase size={18} />} label="Hours worked" value={fmtFocus(stats.workedSec)} accent="#0a8a6e" />
      </div>

      <Card>
        <div className="card-title">Badges</div>
        {badges.length > 0
          ? <div className="badge-row">{badges.map((a, i) => <span key={i} className="badge"><span className="badge-ic">{a.icon}</span>{a.t}</span>)}</div>
          : <p className="muted-small">No badges yet. Keep streaks alive, finish tasks, and win days to earn them.</p>}
      </Card>

      {isSelf && (
        <Card className="shop">
          <div className="card-title"><Sparkles size={15} /> Shop</div>
          <p className="muted-small" style={{ marginBottom: 6 }}>Spend points on cosmetics. This never touches your rank, only your spendable balance.</p>
          <div className="shop-balance"><Coins size={16} /> {balance.toLocaleString()} points</div>
          {["name", "deco"].map((kind) => {
            const items = SHOP_ITEMS.filter((it) => it.kind === kind);
            return (
              <div key={kind} className="shop-group">
                <div className="shop-group-title">{KIND_LABEL[kind]}</div>
                {kind === "deco" && items.length === 0 && (
                  <p className="muted-small">No decorations yet. Design PNGs and add them in src/lib/decorations.js to make them appear here.</p>
                )}
                <div className="shop-grid">
                  {items.map((it) => {
                    const have = owned.has(it.id);
                    const on = equip[it.kind] === it.id;
                    return (
                      <div key={it.id} className={"shop-item " + (on ? "equipped" : "")}>
                        <div className="shop-prev">
                          {kind === "deco"
                            ? <span className="shop-deco-prev"><Avatar user={me} size={34} /><img className="avatar-deco" src={decoSrc(it.file)} alt="" style={{ width: 46, height: 46, top: -6, left: -6 }} /></span>
                            : <span className="shop-name-prev" style={{ background: it.css, WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: "transparent" }}>{me.name}</span>}
                        </div>
                        <div className="shop-name">{it.name}</div>
                        {have ? (
                          <button className={"shop-btn " + (on ? "on" : "")} onClick={() => toggleEquip(it)}>{on ? <><Check size={13} /> Equipped</> : "Equip"}</button>
                        ) : (
                          <button className="shop-btn buy" disabled={balance < it.cost} onClick={() => buy(it)}>
                            {balance < it.cost ? <><Lock size={12} /> {it.cost}</> : <><Coins size={12} /> {it.cost}</>}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </Card>
      )}

      {isSelf && <SelfSettings users={users} me={me} setUsers={setUsers} onLogout={onLogout} dark={dark} setDark={setDark} notifOn={notifOn} enableNotifs={enableNotifs} hasAvatar={!!me.avatar} />}
    </div>
  );
}

function StatBox({ icon, label, value, accent }) {
  return (
    <Card className="stat-tile">
      <div className="stat-ic" style={{ color: accent }}>{icon}</div>
      <div className="stat-val">{value}</div>
      <div className="stat-lab">{label}</div>
    </Card>
  );
}

function SelfSettings({ users, me, setUsers, onLogout, dark, setDark, notifOn, enableNotifs, hasAvatar }) {
  const [name, setName] = useState(me.name);
  const [color, setColor] = useState(me.color);
  const [bio, setBio] = useState(me.bio || "");
  const [newPw, setNewPw] = useState("");
  const [saved, setSaved] = useState(false);
  const colors = [BLUE, "#1d1d1f", "#0a5fb8", "#34C759", "#FF9500", "#AF52DE", "#FF2D55", "#5AC8FA"];
  const save = () => {
    setUsers(users.map((u) => u.id === me.id ? { ...u, name: name.trim() || u.name, color, bio: bio.trim(), ...(newPw.length >= 3 ? { pw: hashPw(newPw) } : {}) } : u));
    setNewPw(""); setSaved(true); setTimeout(() => setSaved(false), 1500);
  };
  const removePhoto = () => setUsers(users.map((u) => u.id === me.id ? { ...u, avatar: null } : u));

  return (
    <>
      <div className="settings-divider">Settings</div>

      <Card>
        <div className="card-title">Account</div>
        <Field label="Name"><input value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Motto (optional)"><input value={bio} onChange={(e) => setBio(e.target.value)} placeholder="A short line under your name" maxLength={80} /></Field>
        <span className="field-label">Your color</span>
        <div className="color-row">{colors.map((c) => <button key={c} className={"swatch " + (color === c ? "swatch-on" : "")} style={{ background: c }} onClick={() => setColor(c)} />)}</div>
        <Field label="New password (leave blank to keep)"><input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} /></Field>
        <div className="modal-actions" style={{ justifyContent: "space-between" }}>
          {hasAvatar ? <Btn variant="ghost" onClick={removePhoto}><Trash2 size={15} /> Remove photo</Btn> : <span />}
          <Btn onClick={save}>{saved ? <><Check size={16} /> Saved</> : "Save"}</Btn>
        </div>
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
        <p className="muted-small">Reminders fire for tasks and invoices due soon, plus a daily nudge. On Chrome and Edge they can arrive even when Crica is closed.</p>
      </Card>

      <Card>
        <div className="card-title">Session</div>
        <Btn variant="ghost-danger" onClick={onLogout}><LogOut size={16} /> Log out</Btn>
      </Card>
    </>
  );
}
