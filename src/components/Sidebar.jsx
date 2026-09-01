import { ChevronsLeft, ChevronsRight, Coins, Settings } from "lucide-react";
import { Avatar, WideLogo, IconMark } from "./ui";
import { WeekGoal } from "./WeekGoal";

// Desktop navigation: a collapsible rail on the left. Mobile keeps the bottom bar.
export function Sidebar({ tabs, tab, showSettings, onTab, onSettings, me, other, balance, unreadUpdates, tasks, work, collapsed, onToggle, onCollect }) {
  return (
    <aside className={"sidebar" + (collapsed ? " is-collapsed" : "")}>
      <div className="sidebar-head">
        <button className="sidebar-brand" onClick={() => onTab("dashboard")} aria-label="Go to home">
          {collapsed ? <IconMark size={32} radius={9} /> : <WideLogo height={38} />}
        </button>
        <button className="sidebar-collapse" onClick={onToggle} title={collapsed ? "Expand menu" : "Collapse menu"} aria-label={collapsed ? "Expand menu" : "Collapse menu"}>
          {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
        </button>
      </div>
      <nav className="sidebar-nav">
        {tabs.map((tb) => (
          <button key={tb.id} className={"sidebar-item " + (!showSettings && tab === tb.id ? "on" : "")} onClick={() => onTab(tb.id)} title={tb.label}>
            <span className="nav-ic-wrap"><tb.icon size={18} />{tb.id === "tasks" && unreadUpdates > 0 && <span className="nav-badge">{unreadUpdates}</span>}</span>
            <span className="sidebar-item-lab">{tb.label}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-foot">
        <WeekGoal me={me} other={other} tasks={tasks} work={work} onSetGoal={onSettings} onCollect={onCollect} compact={collapsed} />
        <div className={"sidebar-me-row " + (showSettings ? "on" : "")}>
          <button className="sidebar-me" onClick={onSettings} title="Profile and settings">
            <Avatar user={me} size={30} />
            <span className="sidebar-me-main">
              <span className="sidebar-me-name">{me.name}</span>
              <span className="coin-pill" title="Points you can spend in the shop"><Coins size={12} /> {balance.toLocaleString()}</span>
            </span>
          </button>
          <button className={"sidebar-gear " + (showSettings ? "on" : "")} onClick={onSettings} title="Settings" aria-label="Settings">
            <Settings size={17} />
          </button>
        </div>
      </div>
    </aside>
  );
}
