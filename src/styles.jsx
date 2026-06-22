import { BLUE, BLUE_SOFT } from "./lib/constants";

export function GlobalStyle() {
  return (
    <style>{`
    * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    :root {
      --blue: ${BLUE}; --blue-soft: ${BLUE_SOFT};
      --ink: #1d1d1f; --ink-2: #6e6e73; --ink-3: #86868b;
      --bg: #f5f5f7; --surface: #ffffff; --line: rgba(0,0,0,0.08); --line-2: rgba(0,0,0,0.05);
      --radius: 18px; --shadow: 0 1px 3px rgba(0,0,0,0.06), 0 8px 30px rgba(0,0,0,0.05);
      --header-bg: rgba(245,245,247,0.8);
    }
    html.crica-dark {
      --ink: #f5f5f7; --ink-2: #aeaeb2; --ink-3: #8e8e93;
      --bg: #000000; --surface: #1c1c1e; --line: rgba(255,255,255,0.14); --line-2: rgba(255,255,255,0.08);
      --shadow: 0 1px 3px rgba(0,0,0,0.6), 0 10px 30px rgba(0,0,0,0.55);
      --header-bg: rgba(0,0,0,0.65);
    }
    /* Logo */
    .logo-fallback { background: var(--blue); color: #fff; display: grid; place-items: center; }
    .brand-wrap { display: flex; justify-content: center; margin: 0 auto 16px; }
    .db-help { text-align: left; background: var(--line-2); border-radius: 12px; padding: 12px 14px; margin: 4px 0 18px; }
    .db-help .legend-line span:last-child { color: var(--ink-2); }
    /* Dark surface remaps for elements that were hardcoded white */
    html.crica-dark .field input, html.crica-dark .field textarea, html.crica-dark .field select,
    html.crica-dark .icon-pick, html.crica-dark .pill, html.crica-dark .login-user,
    html.crica-dark .seg-active, html.crica-dark .habit-check, html.crica-dark .task-check { background: var(--surface); }
    html.crica-dark .btn-ghost, html.crica-dark .icon-btn, html.crica-dark .segmented,
    html.crica-dark .chip, html.crica-dark .locked-note, html.crica-dark .vault-pct-bar, html.crica-dark .month-bar { background: rgba(255,255,255,0.08); }
    html.crica-dark .icon-btn:hover, html.crica-dark .btn-ghost:hover, html.crica-dark .top-nav-item:hover { background: rgba(255,255,255,0.14); }
    html.crica-dark .habit-done { background: linear-gradient(0deg, rgba(0,113,227,0.14), rgba(0,113,227,0.14)), var(--surface); }
    html.crica-dark .swatch-on { box-shadow: 0 0 0 3px var(--surface), 0 0 0 5px var(--blue); }
    html.crica-dark .alert-bar { background: #2c2c2e; }
    html.crica-dark .ring-track { stroke: rgba(255,255,255,0.12); }
    html.crica-dark .recharts-cartesian-axis-tick text, html.crica-dark .recharts-text { fill: var(--ink-3); }
    html.crica-dark .recharts-cartesian-grid line { stroke: rgba(255,255,255,0.07); }
    .app-root, .auth-screen, .boot {
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: var(--ink); background: var(--bg); -webkit-font-smoothing: antialiased;
    }
    .app-root { min-height: 100vh; padding-bottom: 76px; }
    input, textarea, select, button { font-family: inherit; }
    @media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }

    /* Header */
    .topbar { position: sticky; top: 0; z-index: 40; }
    .app-header {
      position: static; z-index: 40; display: flex; align-items: center; justify-content: space-between;
      gap: 12px; padding: 12px 18px; background: var(--header-bg); backdrop-filter: saturate(180%) blur(20px);
      border-bottom: 1px solid var(--line);
    }
    .header-brand { display: flex; align-items: center; gap: 9px; font-weight: 700; font-size: 17px; letter-spacing: -0.02em; background: none; border: none; padding: 0; cursor: pointer; }
    .brand-dot { width: 28px; height: 28px; border-radius: 9px; background: var(--blue); color: #fff; display: grid; place-items: center; }
    .top-nav { display: none; gap: 4px; }
    .top-nav-item { display: flex; align-items: center; gap: 6px; padding: 8px 14px; border: none; background: transparent; color: var(--ink-2);
      border-radius: 11px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all .18s; }
    .top-nav-item:hover { background: rgba(0,0,0,0.04); color: var(--ink); }
    .top-nav-item.on { background: var(--blue); color: #fff; }
    .header-me { border: none; background: transparent; cursor: pointer; padding: 0; border-radius: 50%; }

    @media (min-width: 820px) {
      .top-nav { display: flex; }
      .bottom-nav { display: none !important; }
      .app-root { padding-bottom: 0; }
      .app-main { max-width: 980px; margin: 0 auto; }
    }

    /* Bottom nav */
    .bottom-nav {
      position: fixed; bottom: 0; left: 0; right: 0; z-index: 40; display: flex; justify-content: space-around;
      padding: 8px 6px calc(8px + env(safe-area-inset-bottom)); background: rgba(255,255,255,0.82);
      backdrop-filter: saturate(180%) blur(20px); border-top: 1px solid var(--line);
    }
    html.crica-dark .bottom-nav { background: rgba(0,0,0,0.7); }
    .bottom-nav-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; border: none; background: transparent;
      color: var(--ink-3); font-size: 10.5px; font-weight: 500; cursor: pointer; padding: 4px 0; transition: color .15s; }
    .bottom-nav-item.on { color: var(--blue); }

    .app-main { padding: 16px 16px 24px; }
    .page { display: flex; flex-direction: column; gap: 14px; animation: fade .35s ease; }
    @keyframes fade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }

    .page-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; margin-bottom: 2px; }
    .page-title { font-size: 26px; font-weight: 700; letter-spacing: -0.03em; margin: 0; }
    .page-sub { color: var(--ink-3); font-size: 13.5px; margin-top: 2px; }

    /* Cards */
    .card { background: var(--surface); border: 1px solid var(--line-2); border-radius: var(--radius); padding: 16px; box-shadow: var(--shadow); }
    .card-title { font-size: 15px; font-weight: 600; letter-spacing: -0.01em; margin-bottom: 12px; }
    .empty { display: flex; flex-direction: column; align-items: center; gap: 10px; text-align: center; color: var(--ink-3); padding: 34px 18px; }
    .empty svg { color: var(--blue); opacity: .65; }

    /* Buttons */
    .btn { display: inline-flex; align-items: center; justify-content: center; gap: 7px; border: none; cursor: pointer;
      font-size: 14px; font-weight: 600; padding: 10px 16px; border-radius: 13px; transition: transform .12s, background .15s, opacity .15s; letter-spacing: -0.01em; }
    .btn:active { transform: scale(0.96); }
    .btn-primary { background: var(--blue); color: #fff; }
    .btn-primary:hover { background: #0062c4; }
    .btn-soft { background: rgba(0,113,227,0.1); color: var(--blue); }
    .btn-ghost { background: rgba(0,0,0,0.05); color: var(--ink); }
    .btn-ghost-danger { background: rgba(255,59,48,0.1); color: #ff3b30; }
    .btn.full { width: 100%; padding: 13px; }
    .icon-btn { width: 34px; height: 34px; border-radius: 10px; border: none; background: rgba(0,0,0,0.05); color: var(--ink); display: grid; place-items: center; cursor: pointer; transition: background .15s; }
    .icon-btn:hover { background: rgba(0,0,0,0.09); }
    .icon-btn:disabled { opacity: .35; cursor: default; }

    /* Segmented + filters */
    .segmented { display: flex; background: rgba(0,0,0,0.05); border-radius: 12px; padding: 3px; gap: 3px; }
    .seg { flex: 1; border: none; background: transparent; padding: 8px; border-radius: 9px; font-size: 13.5px; font-weight: 600; color: var(--ink-2); cursor: pointer; transition: all .18s; }
    .seg-active { background: #fff; color: var(--ink); box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .filter-row { display: flex; align-items: center; gap: 8px; color: var(--ink-3); padding: 0 2px; }
    .text-pill { border: none; background: transparent; color: var(--ink-3); font-size: 13px; font-weight: 600; cursor: pointer; padding: 4px 8px; border-radius: 8px; }
    .text-pill.on { color: var(--blue); background: rgba(0,113,227,0.1); }
    .week-nav { display: flex; gap: 6px; }

    /* Fields */
    .field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
    .field-label { font-size: 12.5px; font-weight: 600; color: var(--ink-2); margin-bottom: 6px; display: block; }
    .field input, .field textarea, .field select, .field-inline input {
      width: 100%; border: 1px solid var(--line); background: #fff; border-radius: 12px; padding: 12px 13px; font-size: 15px; color: var(--ink); transition: border .15s, box-shadow .15s; }
    .field input:focus, .field textarea:focus, .field select:focus { outline: none; border-color: var(--blue); box-shadow: 0 0 0 3px rgba(0,113,227,0.15); }
    textarea { resize: vertical; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

    /* Avatar / rings */
    .avatar { border-radius: 50%; color: #fff; font-weight: 700; display: grid; place-items: center; flex-shrink: 0; }
    .ring-wrap { position: relative; }
    .ring-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; font-weight: 700; }
    .ring-pct { font-size: 19px; }
    .ring-sub { font-size: 10px; color: var(--ink-3); font-weight: 500; }

    /* Modal */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.35); backdrop-filter: blur(4px); z-index: 100; display: flex; align-items: flex-end; justify-content: center; padding: 0; animation: fade .2s; font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: var(--ink); }
    @media (min-width: 600px) { .modal-overlay { align-items: center; padding: 20px; } }
    .modal { background: var(--surface); width: 100%; max-width: 460px; border-radius: 22px 22px 0 0; max-height: 90vh; overflow-y: auto; animation: sheet .3s cubic-bezier(.2,.8,.2,1); }
    @media (min-width: 600px) { .modal { border-radius: 22px; } }
    .modal-wide { max-width: 640px; }
    @keyframes sheet { from { transform: translateY(40px); opacity: .6; } to { transform: none; opacity: 1; } }
    .modal-head { display: flex; align-items: center; justify-content: space-between; padding: 18px 18px 10px; position: sticky; top: 0; background: var(--surface); }
    .modal-head h3 { margin: 0; font-size: 18px; font-weight: 700; letter-spacing: -0.02em; }
    .modal-body { padding: 4px 18px 22px; }
    .modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 14px; }
    .modal-actions .btn { flex: 1; }

    /* Auth */
    .auth-screen { min-height: 100vh; display: grid; place-items: center; padding: 20px; }
    .auth-card { background: var(--surface); border-radius: 26px; padding: 30px 26px; width: 100%; max-width: 440px; box-shadow: var(--shadow); border: 1px solid var(--line-2); }
    .auth-card.wide, .modal-wide { max-width: 640px; }
    .brand-mark { width: 56px; height: 56px; border-radius: 17px; background: var(--blue); color: #fff; display: grid; place-items: center; margin: 0 auto 16px; }
    .auth-title { text-align: center; font-size: 25px; font-weight: 700; letter-spacing: -0.03em; margin: 0 0 6px; }
    .auth-sub { text-align: center; color: var(--ink-3); font-size: 14px; margin: 0 0 22px; }
    .auth-err { background: rgba(255,59,48,0.1); color: #ff3b30; padding: 10px 12px; border-radius: 11px; font-size: 13px; font-weight: 500; margin-bottom: 12px; text-align: center; }
    .setup-grid { display: grid; gap: 18px; margin-bottom: 16px; }
    @media (min-width: 520px) { .setup-grid { grid-template-columns: 1fr 1fr; } }
    .setup-tag { font-size: 12px; font-weight: 700; color: var(--blue); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px; }
    .color-row { display: flex; flex-wrap: wrap; gap: 9px; margin-bottom: 12px; }
    .swatch { width: 30px; height: 30px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; transition: transform .12s; }
    .swatch:active { transform: scale(.9); }
    .swatch-on { box-shadow: 0 0 0 3px #fff, 0 0 0 5px var(--blue); }
    .login-users { display: flex; gap: 12px; margin-bottom: 18px; }
    .login-user { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 9px; padding: 18px 10px; border: 1.5px solid var(--line); border-radius: 17px; background: #fff; cursor: pointer; font-weight: 600; transition: all .18s; }
    .login-user-on { border-color: var(--blue); box-shadow: 0 0 0 3px rgba(0,113,227,0.12); }

    /* Alert bar */
    .alert-bar { position: static; z-index: 30; display: flex; align-items: center; gap: 10px; background: var(--ink); color: #fff; padding: 9px 16px; font-size: 13px; overflow: hidden; }
    .alert-bar svg { flex-shrink: 0; color: #FF9500; }
    .alert-track { display: flex; gap: 18px; overflow-x: auto; scrollbar-width: none; }
    .alert-track::-webkit-scrollbar { display: none; }
    .alert-item { display: inline-flex; align-items: center; gap: 5px; white-space: nowrap; font-weight: 500; }
    

    /* Dashboard */
    .vs-card { display: flex; align-items: center; gap: 8px; padding: 20px 16px; }
    .vs-side { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; }
    .vs-name { font-weight: 600; font-size: 14px; }
    .vs-points { font-size: 38px; font-weight: 800; letter-spacing: -0.04em; line-height: 1; font-variant-numeric: tabular-nums; }
    .vs-lab { font-size: 11px; color: var(--ink-3); text-transform: uppercase; letter-spacing: 0.05em; }
    .vs-mid { display: flex; flex-direction: column; align-items: center; gap: 4px; }
    .vs-vs { font-size: 12px; font-weight: 800; color: var(--ink-3); }
    .vs-tie { font-size: 12px; font-weight: 800; color: var(--blue); }
    .stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    @media (min-width: 700px) { .stat-grid { grid-template-columns: repeat(4, 1fr); } }
    .stat-tile { padding: 14px; }
    .stat-ic { margin-bottom: 8px; }
    .stat-val { font-size: 23px; font-weight: 700; letter-spacing: -0.03em; font-variant-numeric: tabular-nums; }
    .stat-lab { font-size: 11.5px; color: var(--ink-3); margin-top: 2px; line-height: 1.3; }
    .two-col { display: grid; gap: 14px; }
    @media (min-width: 640px) { .two-col { grid-template-columns: 1fr 1fr; } }
    .legend { display: flex; flex-wrap: wrap; gap: 14px; justify-content: center; margin-top: 8px; }
    .legend-item { display: flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--ink-2); font-weight: 500; }
    .legend-item i { width: 10px; height: 10px; border-radius: 3px; }
    .rate-rings { display: flex; justify-content: space-around; }
    .rate-ring { display: flex; flex-direction: column; align-items: center; gap: 8px; }
    .rate-name { font-size: 13px; font-weight: 600; }
    .badge-row { display: flex; flex-wrap: wrap; gap: 8px; }
    .badge { display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; background: rgba(0,113,227,0.08); color: var(--blue); border-radius: 11px; font-size: 12.5px; font-weight: 600; }
    .badge-ic { display: grid; place-items: center; }

    /* Habits */
    .habit-card { display: flex; align-items: center; gap: 12px; padding: 13px 14px; transition: box-shadow .2s, transform .2s; }
    .habit-done { background: linear-gradient(0deg, rgba(0,113,227,0.04), rgba(0,113,227,0.04)), #fff; }
    .drag-handle { border: none; background: transparent; color: #c7c7cc; cursor: grab; padding: 4px; display: grid; place-items: center; touch-action: none; }
    .drag-handle:active { cursor: grabbing; }
    .habit-check, .task-check { width: 30px; height: 30px; border-radius: 50%; border: 2px solid var(--line); background: #fff; display: grid; place-items: center; color: #fff; cursor: pointer; flex-shrink: 0; transition: all .18s; }
    .task-check { width: 26px; height: 26px; border-radius: 8px; }
    .habit-main, .task-main { flex: 1; cursor: pointer; min-width: 0; }
    .habit-name { font-weight: 600; font-size: 15px; }
    .habit-meta, .task-meta { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
    .chip { display: inline-flex; align-items: center; gap: 4px; font-size: 11.5px; font-weight: 600; color: var(--ink-2); background: rgba(0,0,0,0.045); border: 1px solid transparent; padding: 3px 8px; border-radius: 8px; }
    .chip.warn { background: rgba(255,149,0,0.12); color: #c77700; }
    .chip.danger { background: rgba(255,59,48,0.1); color: #ff3b30; }
    .chip.danger-soft { background: rgba(255,59,48,0.07); color: #ff6259; }
    .partner-head { display: flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 600; color: var(--ink-2); margin-top: 8px; }
    .locked-note { font-size: 11px; color: var(--ink-3); font-weight: 500; background: rgba(0,0,0,0.05); padding: 2px 7px; border-radius: 7px; }
    .censored { display: flex; align-items: center; justify-content: space-between; opacity: .9; }
    .censored-name { flex: 1; min-width: 0; }
    .blurred { filter: blur(6px); user-select: none; font-weight: 600; font-size: 15px; color: var(--ink-2); }
    .censored-stats { display: flex; align-items: center; gap: 8px; }
    .dot { width: 11px; height: 11px; border-radius: 50%; background: rgba(0,0,0,0.12); }
    .icon-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; margin-bottom: 14px; }
    .icon-pick { aspect-ratio: 1; border: 1.5px solid var(--line); background: #fff; border-radius: 12px; font-size: 20px; cursor: pointer; transition: all .15s; }
    .icon-pick.on { border-color: var(--blue); background: rgba(0,113,227,0.08); }
    .seg-pills { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
    .pill { display: inline-flex; align-items: center; gap: 6px; border: 1.5px solid var(--line); background: #fff; padding: 8px 13px; border-radius: 11px; font-size: 13.5px; font-weight: 600; color: var(--ink-2); cursor: pointer; transition: all .15s; }
    .pill b { color: var(--blue); }
    .pill-on { border-color: var(--blue); color: var(--ink); background: rgba(0,113,227,0.06); }

    /* Tasks */
    .task-card { display: flex; align-items: center; gap: 11px; padding: 12px 13px; }
    .task-done .task-title { text-decoration: line-through; color: var(--ink-3); }
    .task-title { font-weight: 600; font-size: 14.5px; }
    .added-by { font-size: 11px; color: var(--blue); margin-top: 5px; font-weight: 500; }

    /* Vault */
    .vault-card { display: flex; flex-direction: column; align-items: center; }
    .vault-head { width: 100%; display: flex; align-items: flex-start; justify-content: space-between; }
    .vault-amount { font-size: 30px; font-weight: 800; letter-spacing: -0.04em; font-variant-numeric: tabular-nums; }
    .goal-edit { display: inline-flex; align-items: center; gap: 5px; border: none; background: transparent; color: var(--ink-3); font-size: 12.5px; font-weight: 500; cursor: pointer; padding: 2px 0; }
    .jar-wrap { width: 170px; margin: 6px 0; }
    .jar-svg { width: 100%; height: auto; display: block; }
    .wave { animation: wave 2.2s ease-in-out infinite alternate; }
    @keyframes wave { from { transform: translate(-12px,-6px); } to { transform: translate(12px,-6px); } }
    .vault-pct-bar { width: 100%; height: 8px; background: rgba(0,0,0,0.06); border-radius: 5px; overflow: hidden; margin-top: 4px; }
    .vault-pct-fill { height: 100%; background: linear-gradient(90deg, var(--blue-soft), var(--blue)); border-radius: 5px; transition: width 1s cubic-bezier(.2,.8,.2,1); }
    .vault-pct-label { font-size: 12.5px; color: var(--ink-3); margin-top: 8px; font-weight: 500; }
    .vault-actions { display: flex; gap: 10px; margin-top: 16px; width: 100%; }
    .vault-actions .btn { flex: 1; }
    .month-head { display: flex; align-items: center; justify-content: space-between; }
    .month-amount { font-size: 30px; font-weight: 800; letter-spacing: -0.04em; margin: 8px 0 12px; font-variant-numeric: tabular-nums; }
    .month-bar { height: 10px; background: rgba(0,0,0,0.06); border-radius: 6px; overflow: hidden; }
    .month-fill { height: 100%; background: #34C759; border-radius: 6px; transition: width 1s cubic-bezier(.2,.8,.2,1); }
    .month-sub { display: flex; justify-content: space-between; font-size: 12px; color: var(--ink-3); margin-top: 8px; font-weight: 500; }
    .per-mo { font-size: 16px; font-weight: 600; color: var(--ink-3); letter-spacing: 0; }
    .income-breakdown { margin-top: 6px; display: flex; flex-direction: column; gap: 2px; }
    .income-breakdown .legend-line span:last-child { color: var(--ink-2); font-variant-numeric: tabular-nums; }
    .tx-row { display: flex; align-items: center; gap: 12px; padding: 11px 14px; }
    .tx-ic { width: 32px; height: 32px; border-radius: 9px; display: grid; place-items: center; flex-shrink: 0; }
    .tx-ic.in { background: rgba(52,199,89,0.14); color: #34C759; }
    .tx-ic.out { background: rgba(255,59,48,0.14); color: #FF3B30; }
    .tx-main { flex: 1; min-width: 0; }
    .tx-note { font-weight: 600; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .tx-date { font-size: 12px; color: var(--ink-3); margin-top: 1px; }
    .tx-amt { font-weight: 700; font-variant-numeric: tabular-nums; flex-shrink: 0; }
    .tx-amt.in { color: #34C759; }
    .tx-amt.out { color: var(--ink-2); }
    .section-head { display: flex; align-items: center; justify-content: space-between; margin-top: 4px; }
    .section-head h3 { font-size: 19px; font-weight: 700; letter-spacing: -0.02em; margin: 0; }
    .client-card { display: flex; align-items: center; gap: 12px; padding: 13px 14px; }
    .client-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
    .client-main { flex: 1; cursor: pointer; min-width: 0; }
    .client-name { font-weight: 600; font-size: 14.5px; }
    .client-meta { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
    .paid-btn { padding: 8px 12px; font-size: 13px; flex-shrink: 0; }
    .toggle-row { display: flex; align-items: center; justify-content: space-between; font-size: 14px; font-weight: 500; margin: 6px 0 4px; }
    .toggle { width: 50px; height: 30px; border-radius: 16px; border: none; background: rgba(0,0,0,0.12); position: relative; cursor: pointer; transition: background .2s; }
    .toggle-on { background: #34C759; }
    .toggle-knob { position: absolute; top: 3px; left: 3px; width: 24px; height: 24px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.2); transition: transform .2s; }
    .toggle-on .toggle-knob { transform: translateX(20px); }

    /* Report */
    .report-banner { display: flex; align-items: center; gap: 10px; font-weight: 600; font-size: 14px; }
    .report-winner { margin-left: auto; display: inline-flex; align-items: center; gap: 6px; color: var(--blue); font-weight: 700; font-size: 13.5px; }
    .report-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .report-col { display: flex; flex-direction: column; gap: 8px; }
    .report-win { border-color: var(--blue); box-shadow: 0 0 0 2px rgba(0,113,227,0.2), var(--shadow); }
    .report-user { display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 14px; }
    .report-big { font-size: 34px; font-weight: 800; letter-spacing: -0.04em; line-height: 1; }
    .report-big span { font-size: 14px; font-weight: 600; color: var(--ink-3); margin-left: 4px; }
    .report-line { display: flex; align-items: center; gap: 7px; font-size: 13px; color: var(--ink-2); font-weight: 500; }
    .report-tasks { display: flex; flex-direction: column; gap: 5px; margin-top: 4px; border-top: 1px solid var(--line-2); padding-top: 8px; }
    .report-task { display: flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--ink-2); }
    .report-task svg { color: #34C759; flex-shrink: 0; }

    /* Settings */
    .points-legend { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .legend-block b { font-size: 13px; display: block; margin-bottom: 8px; }
    .legend-line { display: flex; justify-content: space-between; font-size: 13px; color: var(--ink-2); padding: 3px 0; }
    .legend-line span:last-child { color: var(--blue); font-weight: 700; }
    .muted-small { font-size: 12px; color: var(--ink-3); margin-top: 10px; line-height: 1.5; }

    /* Drag */
    .drag-list { display: flex; flex-direction: column; gap: 10px; }
    .drag-row { transition: transform .2s cubic-bezier(.2,.8,.2,1); }
    .drag-row.is-dragging { transform: scale(1.02); z-index: 5; position: relative; }
    .drag-row.is-dragging .card { box-shadow: 0 12px 40px rgba(0,0,0,0.18); border-color: var(--blue); }

    /* Boot */
    .boot { min-height: 100vh; display: grid; place-items: center; }
    .boot-mark { width: 56px; height: 56px; border-radius: 17px; background: var(--blue); color: #fff; display: grid; place-items: center; animation: pulse 1.2s ease-in-out infinite; }
    @keyframes pulse { 0%,100% { transform: scale(1); opacity: .9; } 50% { transform: scale(1.08); opacity: 1; } }
    `}</style>
  );
}
