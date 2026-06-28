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
      position: relative; z-index: 40; display: flex; align-items: center; justify-content: space-between;
      gap: 12px; padding: 12px 18px; background: var(--header-bg); backdrop-filter: saturate(180%) blur(20px);
      border-bottom: 1px solid var(--line);
    }
    .header-brand { position: absolute; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 9px; font-weight: 700; font-size: 17px; letter-spacing: -0.02em; background: none; border: none; padding: 0; cursor: pointer; }
    .brand-dot { width: 28px; height: 28px; border-radius: 9px; background: var(--blue); color: #fff; display: grid; place-items: center; }
    .top-nav { display: none; gap: 4px; }
    .top-nav-item { display: flex; align-items: center; gap: 6px; padding: 8px 14px; border: none; background: transparent; color: var(--ink-2);
      border-radius: 11px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all .18s; }
    .top-nav-item:hover { background: rgba(0,0,0,0.04); color: var(--ink); }
    .top-nav-item.on { background: var(--blue); color: #fff; }
    .header-me { border: none; background: transparent; cursor: pointer; padding: 0; border-radius: 50%; margin-left: auto; }

    @media (min-width: 820px) {
      .top-nav { display: flex; }
      .header-brand { position: static; transform: none; }
      .header-me { margin-left: 0; }
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
    b, strong { font-weight: 500; }
    .focus-ring-wrap.is-over .focus-ring-fill { stroke: #34C759; }
    .focus-ring-wrap.is-over .focus-time { color: #34C759; }
    /* Hours worked this week */
    .hours-rows { display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px; }
    .hours-row { display: flex; align-items: center; gap: 11px; }
    .hours-bar-track { flex: 1; height: 18px; border-radius: 999px; background: var(--line-2); overflow: hidden; }
    .hours-bar-fill { height: 100%; border-radius: 999px; min-width: 4px; transition: width .6s cubic-bezier(.2,.8,.2,1); }
    .hours-val { font-size: 14px; font-weight: 500; color: var(--ink); min-width: 56px; text-align: right; font-variant-numeric: tabular-nums; }
    .hours-days { display: flex; gap: 6px; padding-top: 14px; border-top: 1px solid var(--line-2); }
    .hours-day { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; }
    .hours-day-bars { display: flex; align-items: flex-end; justify-content: center; gap: 3px; height: 54px; width: 100%; }
    .hours-day-bar { width: 7px; border-radius: 4px 4px 2px 2px; min-height: 0; transition: height .5s cubic-bezier(.2,.8,.2,1); }
    .hours-day-lab { font-size: 11px; color: var(--ink-3); }

    /* Docs */
    .docs-search { display: flex; align-items: center; gap: 9px; background: var(--surface); border: 1.5px solid var(--line); border-radius: 12px; padding: 9px 13px; margin-bottom: 14px; color: var(--ink-3); }
    .docs-search input { flex: 1; border: none; background: none; outline: none; color: var(--ink); font-size: 14px; }
    .docs-grid { display: grid; grid-template-columns: 1fr; gap: 10px; }
    @media (min-width: 640px) { .docs-grid { grid-template-columns: 1fr 1fr; } }
    @media (min-width: 980px) { .docs-grid { grid-template-columns: 1fr 1fr 1fr; } }
    .doc-card { text-align: left; display: flex; flex-direction: column; gap: 8px; background: var(--surface); border: 1px solid var(--line-2); border-radius: var(--radius); padding: 15px; cursor: pointer; box-shadow: var(--shadow); transition: border-color .15s, transform .1s; }
    .doc-card:hover { border-color: var(--blue); }
    .doc-card:active { transform: scale(0.99); }
    .doc-card-top { display: flex; align-items: center; gap: 8px; min-width: 0; }
    .doc-card-ic { color: var(--blue); flex: none; }
    .doc-card-title { font-size: 15px; font-weight: 500; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .doc-card-snip { font-size: 13px; color: var(--ink-3); line-height: 1.5; height: 39px; overflow: hidden; }
    .doc-card-foot { display: flex; align-items: center; gap: 8px; margin-top: 2px; }
    .doc-pill { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; color: var(--blue); background: rgba(0,113,227,0.1); padding: 2px 8px; border-radius: 999px; }
    .doc-owner { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; color: var(--ink-3); }
    .doc-time { margin-left: auto; font-size: 11.5px; color: var(--ink-3); }

    .doc-edit-page { display: flex; flex-direction: column; }
    .doc-edit-bar { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
    .doc-title-input { flex: 1; min-width: 0; border: none; background: none; outline: none; color: var(--ink); font-size: 21px; font-weight: 700; letter-spacing: -0.02em; padding: 4px 2px; }
    .doc-share-btn { display: inline-flex; align-items: center; gap: 6px; border: 1.5px solid var(--line); background: var(--surface); color: var(--ink-2); font-size: 13px; font-weight: 500; padding: 7px 12px; border-radius: 999px; cursor: pointer; flex: none; }
    .doc-share-btn.on { border-color: var(--blue); color: var(--blue); background: rgba(0,113,227,0.06); }
    .doc-shared-tag { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: var(--ink-2); flex: none; }
    .doc-del-confirm { display: inline-flex; gap: 6px; }
    .doc-del-confirm button { border: 1.5px solid var(--line); background: var(--surface); border-radius: 9px; padding: 6px 10px; font-size: 12.5px; cursor: pointer; color: var(--ink); }
    .doc-del-confirm button:first-child { border-color: #ff3b3055; color: #ff3b30; }

    .doc-toolbar { display: flex; align-items: center; gap: 3px; flex-wrap: wrap; background: var(--surface); border: 1px solid var(--line-2); border-radius: 12px; padding: 6px; margin-bottom: 14px; position: sticky; top: 8px; z-index: 5; }
    .doc-tool { display: grid; place-items: center; width: 34px; height: 34px; border: none; background: none; color: var(--ink-2); border-radius: 8px; cursor: pointer; }
    .doc-tool:hover { background: var(--line-2); color: var(--ink); }
    .doc-color-wrap { position: relative; display: inline-flex; }
    .doc-color-pop { position: absolute; top: 40px; left: 0; z-index: 20; display: grid; grid-template-columns: repeat(6, 22px); gap: 6px; padding: 9px; background: var(--surface); border: 1px solid var(--line); border-radius: 12px; box-shadow: 0 12px 30px rgba(0,0,0,0.2); }
    .doc-swatch { width: 22px; height: 22px; border-radius: 6px; border: 1px solid rgba(0,0,0,0.12); cursor: pointer; padding: 0; }
    .doc-swatch:hover { transform: scale(1.12); }
    .doc-swatch-default { background: var(--surface); color: var(--ink); font-size: 12px; font-weight: 500; display: grid; place-items: center; border: 1px solid var(--line); }
    .doc-live { display: inline-flex; align-items: center; gap: 6px; margin-left: auto; font-size: 12px; color: var(--ink-3); padding-right: 6px; }
    .doc-live-dot { width: 7px; height: 7px; border-radius: 50%; background: #34C759; box-shadow: 0 0 0 0 rgba(52,199,89,0.5); animation: pulseGreen 2s ease-out infinite; }
    @keyframes pulseGreen { 0% { box-shadow: 0 0 0 0 rgba(52,199,89,0.5); } 70% { box-shadow: 0 0 0 6px rgba(52,199,89,0); } 100% { box-shadow: 0 0 0 0 rgba(52,199,89,0); } }

    .doc-page-wrap { display: flex; justify-content: center; }
    .doc-body { width: 100%; max-width: 740px; min-height: 60vh; background: var(--surface); border: 1px solid var(--line-2); border-radius: 14px; box-shadow: var(--shadow); padding: 32px 36px; outline: none; color: var(--ink); font-size: 15.5px; line-height: 1.7; }
    .doc-body:empty:before { content: attr(data-placeholder); color: var(--ink-3); }
    .doc-body:focus { border-color: var(--line); }
    .doc-body h1 { font-size: 26px; font-weight: 700; letter-spacing: -0.02em; margin: 18px 0 8px; }
    .doc-body h2 { font-size: 20px; font-weight: 700; letter-spacing: -0.01em; margin: 16px 0 6px; }
    .doc-body p { margin: 0 0 10px; }
    .doc-body ul, .doc-body ol { margin: 0 0 10px; padding-left: 24px; }
    .doc-body li { margin: 2px 0; }
    .doc-body blockquote { margin: 12px 0; padding: 4px 0 4px 16px; border-left: 3px solid var(--blue); color: var(--ink-2); }
    .doc-body a { color: var(--blue); }
    @media (max-width: 560px) { .doc-body { padding: 22px 18px; border-radius: 12px; } .doc-title-input { font-size: 18px; } }
    /* Avatar cosmetics */
    .avatar-wrap { position: relative; display: inline-grid; place-items: center; vertical-align: middle; }
    .avatar-deco { position: absolute; pointer-events: none; object-fit: contain; }
    /* Header coin balance */
    .coin-pill { display: inline-flex; align-items: center; gap: 5px; background: rgba(0,113,227,0.1); color: var(--blue); font-size: 12.5px; font-weight: 500; padding: 4px 9px; border-radius: 999px; font-variant-numeric: tabular-nums; }
    .coin-pill svg { color: #f5b301; }
    .header-me { display: inline-flex; align-items: center; gap: 9px; }
    /* Profile balance + shop */
    .profile-balance { display: inline-flex; align-items: center; gap: 6px; margin-top: 8px; font-size: 13px; color: var(--ink-2); }
    .profile-balance svg { color: #f5b301; }
    .shop-balance { display: inline-flex; align-items: center; gap: 7px; font-size: 15px; color: var(--ink); margin-bottom: 6px; }
    .shop-balance svg { color: #f5b301; }
    .shop-group { margin-top: 14px; }
    .shop-group-title { font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--ink-3); margin-bottom: 9px; }
    .shop-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 9px; }
    .shop-item { display: flex; flex-direction: column; align-items: center; gap: 7px; padding: 12px 8px 9px; border: 1.5px solid var(--line-2); border-radius: 14px; background: var(--surface); }
    .shop-item.equipped { border-color: var(--blue); background: rgba(0,113,227,0.05); }
    .shop-prev { height: 40px; display: grid; place-items: center; }
    .shop-deco-prev { position: relative; display: inline-grid; place-items: center; width: 40px; height: 40px; }
    .shop-name-prev { font-size: 16px; font-weight: 700; letter-spacing: -0.01em; }
    .shop-name { font-size: 12px; color: var(--ink-2); text-align: center; }
    .shop-btn { width: 100%; display: inline-flex; align-items: center; justify-content: center; gap: 5px; border: 1.5px solid var(--line); background: var(--surface); color: var(--ink); font-size: 12.5px; font-weight: 500; padding: 6px; border-radius: 9px; cursor: pointer; font-variant-numeric: tabular-nums; }
    .shop-btn.buy { border-color: var(--blue); color: var(--blue); }
    .shop-btn.buy:disabled { border-color: var(--line); color: var(--ink-3); cursor: not-allowed; }
    .shop-btn.on { border-color: var(--blue); color: var(--blue); background: rgba(0,113,227,0.08); }
    .nav-ic-wrap { position: relative; display: inline-grid; place-items: center; }
    .nav-badge { position: absolute; top: -7px; right: -9px; min-width: 16px; height: 16px; padding: 0 4px; border-radius: 999px; background: #ff3b30; color: #fff; font-size: 10px; font-weight: 500; display: grid; place-items: center; line-height: 1; }
    .tasks-switch { display: flex; gap: 6px; margin-bottom: 14px; }
    .tasks-switch-btn { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 7px; padding: 9px; border-radius: 12px; border: 1.5px solid var(--line); background: var(--surface); color: var(--ink-2); font-size: 14px; font-weight: 500; cursor: pointer; transition: all .15s; }
    .tasks-switch-btn.on { border-color: var(--blue); color: var(--ink); background: rgba(0,113,227,0.06); }
    .tasks-switch-btn .nav-badge { position: static; margin-left: 2px; }
    .update-card { display: flex; flex-direction: column; gap: 7px; margin-bottom: 9px; }
    .update-card.unread { border-color: var(--blue); box-shadow: inset 3px 0 0 var(--blue), var(--shadow); }
    .update-head { display: flex; align-items: center; gap: 8px; }
    .update-author { font-size: 13px; color: var(--ink-2); }
    .update-time { margin-left: auto; font-size: 12px; color: var(--ink-3); }
    .update-task { font-size: 15px; color: var(--ink); }
    .update-note { font-size: 13.5px; color: var(--ink-2); line-height: 1.5; white-space: pre-wrap; }
    .update-actions { display: flex; gap: 14px; margin-top: 2px; }
    .update-act { display: inline-flex; align-items: center; gap: 5px; border: none; background: none; color: var(--ink-3); font-size: 12.5px; cursor: pointer; padding: 2px 0; }
    .update-act:hover { color: var(--ink); }
    .update-act.danger:hover { color: #ff3b30; }
    .update-edit textarea { width: 100%; border: 1.5px solid var(--line); background: var(--surface); color: var(--ink); border-radius: 10px; padding: 9px 11px; font-size: 13.5px; resize: vertical; outline: none; box-sizing: border-box; }
    .chip.done-chip { color: #2ba84a; border-color: #34c75955; }
    .stop-task { display: flex; align-items: center; gap: 7px; font-size: 14px; color: var(--ink-2); margin: 0 0 12px; }
    .stop-done { display: flex; align-items: center; gap: 9px; font-size: 14px; color: var(--ink); margin: 4px 0 4px; cursor: pointer; }
    .stop-done input { width: 17px; height: 17px; }
    .card { background: var(--surface); border: 1px solid var(--line-2); border-radius: var(--radius); padding: 16px; box-shadow: var(--shadow); }
    .card-title { display: flex; align-items: center; gap: 7px; font-size: 15px; font-weight: 600; letter-spacing: -0.01em; margin-bottom: 12px; }
    .empty { display: flex; flex-direction: column; align-items: center; gap: 10px; text-align: center; color: var(--ink-3); padding: 34px 18px; }
    .empty svg { color: var(--blue); opacity: .65; }

    /* Buttons */
    .btn { display: inline-flex; align-items: center; justify-content: center; gap: 7px; border: none; cursor: pointer;
      font-size: 14px; font-weight: 500; padding: 10px 16px; border-radius: 13px; transition: transform .12s, background .15s, opacity .15s; letter-spacing: -0.01em; }
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
    .seg { flex: 1; min-width: 0; border: none; background: transparent; padding: 8px 6px; border-radius: 9px; font-size: 13px; font-weight: 500; color: var(--ink-2); cursor: pointer; transition: all .18s; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .seg-active { background: #fff; color: var(--ink); box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .filter-row { display: flex; align-items: center; gap: 8px; color: var(--ink-3); padding: 0 2px; }
    .text-pill { border: none; background: transparent; color: var(--ink-3); font-size: 13px; font-weight: 500; cursor: pointer; padding: 4px 8px; border-radius: 8px; }
    .text-pill.on { color: var(--blue); background: rgba(0,113,227,0.1); }
    .week-nav { display: flex; gap: 6px; }

    /* Fields */
    .field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
    .field-label { font-size: 12.5px; font-weight: 500; color: var(--ink-2); margin-bottom: 6px; display: block; }
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
    .setup-tag { font-size: 12px; font-weight: 500; color: var(--blue); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px; }
    .color-row { display: flex; flex-wrap: wrap; gap: 9px; margin-bottom: 12px; }
    .swatch { width: 30px; height: 30px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; transition: transform .12s; }
    .swatch:active { transform: scale(.9); }
    .swatch-on { box-shadow: 0 0 0 3px #fff, 0 0 0 5px var(--blue); }
    .login-users { display: flex; gap: 12px; margin-bottom: 18px; }
    .login-user { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 9px; padding: 18px 10px; border: 1.5px solid var(--line); border-radius: 17px; background: #fff; cursor: pointer; font-weight: 500; transition: all .18s; }
    .login-user-on { border-color: var(--blue); box-shadow: 0 0 0 3px rgba(0,113,227,0.12); }

    /* Alert bar */
    .alert-bar { position: static; z-index: 30; display: flex; align-items: center; gap: 10px; background: var(--ink); color: #fff; padding: 9px 16px; font-size: 13px; overflow: hidden; }
    .alert-bar svg { flex-shrink: 0; color: #FF9500; }
    .alert-track { display: flex; gap: 18px; overflow-x: auto; scrollbar-width: none; }
    .alert-track::-webkit-scrollbar { display: none; }
    .alert-item { display: inline-flex; align-items: center; gap: 5px; white-space: nowrap; font-weight: 500; }
    .alert-open { display: inline-flex; align-items: center; gap: 5px; flex-shrink: 0; border: none; cursor: pointer;
      background: #ff3b30; color: #fff; font-weight: 500; font-size: 12.5px; padding: 4px 10px; border-radius: 999px;
      box-shadow: 0 0 0 0 rgba(255,59,48,0.5); animation: pulseRed 2s ease-out infinite; }
    .alert-open svg { color: #fff; }
    @keyframes pulseRed { 0% { box-shadow: 0 0 0 0 rgba(255,59,48,0.5); } 70% { box-shadow: 0 0 0 7px rgba(255,59,48,0); } 100% { box-shadow: 0 0 0 0 rgba(255,59,48,0); } }

    .alert-meeting { display: inline-flex; align-items: center; gap: 8px; flex-shrink: 0; background: rgba(255,255,255,0.14); color: #fff; padding: 5px 6px 5px 11px; border-radius: 999px; font-size: 12.5px; font-weight: 500; white-space: nowrap; }
    .alert-meeting svg { color: #fff; }
    .alert-meeting.ok { background: rgba(52,199,89,0.28); }
    .alert-meeting.no { background: rgba(255,255,255,0.1); }
    .meet-yes { display: inline-flex; align-items: center; gap: 4px; border: none; cursor: pointer; background: #34C759; color: #fff; font-weight: 500; font-size: 12px; padding: 4px 10px; border-radius: 999px; }
    .meet-no { display: grid; place-items: center; border: none; cursor: pointer; background: rgba(255,255,255,0.2); color: #fff; padding: 4px; border-radius: 999px; }
    .meet-no svg { color: #fff; }
    .sched-meeting { display: flex; align-items: center; gap: 7px; margin-top: 9px; padding: 7px 11px; border-radius: 10px; font-size: 12.5px; font-weight: 500; background: rgba(0,113,227,0.1); color: var(--blue); }
    .sched-meeting svg { color: inherit; }
    .sched-meeting.accepted { background: rgba(52,199,89,0.14); color: #2ba84a; }
    html.crica-dark .sched-meeting.accepted { color: #45d869; }
    .sched-meeting-status { margin-left: auto; opacity: 0.85; text-transform: lowercase; }
    .sched-propose { display: inline-flex; align-items: center; gap: 6px; margin-top: 9px; border: 1px dashed var(--line); background: transparent; color: var(--ink-3); font-size: 12.5px; font-weight: 500; padding: 6px 11px; border-radius: 10px; cursor: pointer; transition: all .15s; }
    .sched-propose:hover { color: var(--blue); border-color: var(--blue); }
    

    /* Dashboard */
    .vs-card { display: flex; align-items: center; gap: 8px; padding: 20px 16px; }
    .vs-side { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; }
    .vs-name { font-weight: 500; font-size: 14px; }
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
    .rate-name { font-size: 13px; font-weight: 500; }
    .badge-row { display: flex; flex-wrap: wrap; gap: 8px; }
    .badge { display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; background: rgba(0,113,227,0.08); color: var(--blue); border-radius: 11px; font-size: 12.5px; font-weight: 500; }
    .badge-ic { display: grid; place-items: center; }

    /* Profile */
    .profile-switch { display: flex; gap: 8px; margin-bottom: 14px; }
    .profile-switch-btn { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 10px; border-radius: 13px;
      border: 1.5px solid var(--line); background: var(--surface); color: var(--ink-2); font-weight: 500; font-size: 14px; cursor: pointer; transition: all .15s; }
    .profile-switch-btn.on { border-color: var(--blue); color: var(--ink); background: rgba(0,113,227,0.06); }
    .profile-hero { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 22px 18px; }
    .profile-avatar-wrap { position: relative; width: 92px; height: 92px; margin-bottom: 12px; }
    .profile-cam { position: absolute; right: -2px; bottom: -2px; width: 32px; height: 32px; border-radius: 50%; border: 3px solid var(--surface);
      background: var(--blue); color: #fff; display: grid; place-items: center; cursor: pointer; }
    .profile-name { font-size: 24px; font-weight: 800; letter-spacing: -0.03em; }
    .profile-rank { display: inline-block; margin-top: 7px; padding: 4px 12px; border: 1.5px solid; border-radius: 999px; font-size: 12.5px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.06em; }
    .profile-bio { margin-top: 10px; font-size: 14px; color: var(--ink-2); max-width: 340px; line-height: 1.45; }
    .profile-h2h { display: inline-flex; align-items: center; gap: 6px; margin-top: 14px; padding: 7px 13px; border-radius: 11px; background: rgba(0,113,227,0.08); color: var(--blue); font-size: 13px; font-weight: 500; }
    .profile-h2h svg { color: var(--blue); }
    .settings-divider { margin: 22px 2px 12px; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--ink-3); }

    /* Schedule / availability */
    .sched-intro { display: flex; align-items: flex-start; gap: 7px; font-size: 13px; color: var(--ink-2); line-height: 1.45; margin: 4px 2px 14px; }
    .sched-intro svg { color: #34C759; flex-shrink: 0; margin-top: 2px; }
    .sched-week-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
    .sched-week-label { font-weight: 700; font-size: 15px; letter-spacing: -0.01em; }
    .sched-axis { display: flex; gap: 8px; margin-bottom: 4px; }
    .sched-axis-spacer { width: 22px; flex: none; }
    .sched-axis-track { position: relative; flex: 1; height: 14px; }
    .sched-axis-track span { position: absolute; top: 0; font-size: 10px; color: var(--ink-3); transform: translateX(-50%); white-space: nowrap; }
    .sched-axis-track span:first-child { transform: none; }
    .sched-axis-track span:last-child { transform: translateX(-100%); }
    .sched-day { padding: 11px 13px; margin-bottom: 8px; }
    .sched-today { border-color: var(--blue); }
    .sched-day-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; margin-bottom: 9px; }
    .sched-day-name { font-weight: 700; font-size: 13.5px; flex-shrink: 0; }
    .sched-free-text { font-size: 12.5px; font-weight: 500; text-align: right; line-height: 1.35; }
    .sched-free-text.has-free { color: #2ba84a; }
    html.crica-dark .sched-free-text.has-free { color: #45d869; }
    .sched-free-text.no-free { color: var(--ink-3); font-weight: 500; }
    .sched-lanes { display: flex; flex-direction: column; gap: 5px; }
    .sched-lane { display: flex; align-items: center; gap: 8px; }
    .sched-lane-name { width: 22px; flex: none; display: grid; place-items: center; color: var(--ink-3); }
    .sched-free-ic { color: #34C759; }
    .sched-track { position: relative; flex: 1; height: 14px; background: var(--line-2); border-radius: 5px; overflow: hidden; }
    .sched-busy { position: absolute; top: 0; bottom: 0; border-radius: 4px; opacity: 0.92; }
    .sched-free-track { background: var(--line-2); }
    .sched-free { position: absolute; top: 0; bottom: 0; background: #34C759; border-radius: 4px; }
    .sched-allfree { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 9px; color: var(--ink-3); letter-spacing: 0.02em; }

    .rota-row { display: flex; flex-direction: column; gap: 9px; padding: 11px 0; border-bottom: 1px solid var(--line-2); }
    .rota-row:last-child { border-bottom: none; padding-bottom: 0; }
    .rota-toggle { display: flex; align-items: center; justify-content: space-between; width: 100%; background: none; border: none; padding: 0; cursor: pointer; }
    .rota-day { font-weight: 500; font-size: 14.5px; color: var(--ink); }
    .rota-status { font-size: 12px; font-weight: 500; color: var(--blue); padding: 3px 10px; border-radius: 999px; background: rgba(0,113,227,0.1); }
    .rota-status.off { color: var(--ink-3); background: var(--line-2); }
    .rota-times { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--ink-2); }
    .rota-times input { border: 1.5px solid var(--line); background: var(--surface); color: var(--ink); border-radius: 9px; padding: 8px 10px; font-size: 14px; font-weight: 500; }
    .rota-clone { margin-left: auto; color: var(--blue); }
    .exc-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 11px 0; border-bottom: 1px solid var(--line-2); }
    .exc-row:last-of-type { border-bottom: none; }
    .exc-date { font-weight: 500; font-size: 14px; }
    .exc-detail { font-size: 12.5px; color: var(--ink-3); margin-top: 2px; }

    /* Habits */
    .habit-card { display: flex; align-items: center; gap: 12px; padding: 13px 14px; transition: box-shadow .2s, transform .2s; }
    .habit-done { background: linear-gradient(0deg, rgba(0,113,227,0.04), rgba(0,113,227,0.04)), #fff; }
    .drag-handle { border: none; background: transparent; color: #c7c7cc; cursor: grab; padding: 4px; display: grid; place-items: center; touch-action: none; }
    .drag-handle:active { cursor: grabbing; }
    .habit-check, .task-check { width: 30px; height: 30px; border-radius: 50%; border: 2px solid var(--line); background: #fff; display: grid; place-items: center; color: #fff; cursor: pointer; flex-shrink: 0; transition: all .18s; }
    .task-check { width: 26px; height: 26px; border-radius: 8px; }
    .habit-main, .task-main { flex: 1; cursor: pointer; min-width: 0; }
    .habit-name { font-weight: 500; font-size: 15px; }
    .habit-meta, .task-meta { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
    .chip { display: inline-flex; align-items: center; gap: 4px; font-size: 11.5px; font-weight: 500; color: var(--ink-2); background: rgba(0,0,0,0.045); border: 1px solid transparent; padding: 3px 8px; border-radius: 8px; }
    .chip.warn { background: rgba(255,149,0,0.12); color: #c77700; }
    .chip.danger { background: rgba(255,59,48,0.1); color: #ff3b30; }
    .chip.danger-soft { background: rgba(255,59,48,0.07); color: #ff6259; }
    .chip.gold { background: rgba(255,159,10,0.14); color: #b46a00; border-color: rgba(255,159,10,0.35); }
    .chip.gold svg { color: #ff9f0a; }
    .chip.gold-soft { background: rgba(255,159,10,0.1); color: #c77700; }
    html.crica-dark .chip.gold { background: rgba(255,159,10,0.18); color: #ffca6a; }
    html.crica-dark .chip.gold-soft { background: rgba(255,159,10,0.12); color: #ffce78; }
    .partner-head { display: flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 500; color: var(--ink-2); margin-top: 8px; }
    .locked-note { font-size: 11px; color: var(--ink-3); font-weight: 500; background: rgba(0,0,0,0.05); padding: 2px 7px; border-radius: 7px; }
    .censored { display: flex; align-items: center; justify-content: space-between; opacity: .9; }
    .censored-name { flex: 1; min-width: 0; }
    .blurred { filter: blur(6px); user-select: none; font-weight: 500; font-size: 15px; color: var(--ink-2); }
    .censored-stats { display: flex; align-items: center; gap: 8px; }
    .dot { width: 11px; height: 11px; border-radius: 50%; background: rgba(0,0,0,0.12); }
    .private-chip { color: var(--ink-3); }
    .priv-lock { display: grid; place-items: center; color: var(--ink-3); width: 24px; flex: none; }

    /* Task search */
    .search-bar { display: flex; align-items: center; gap: 8px; padding: 9px 13px; margin-bottom: 12px; background: var(--surface); border: 1.5px solid var(--line); border-radius: 13px; color: var(--ink-3); }
    .search-bar input { flex: 1; border: none; background: none; color: var(--ink); font-size: 14.5px; outline: none; padding: 0; }
    .search-clear { border: none; background: none; color: var(--ink-3); cursor: pointer; display: grid; place-items: center; padding: 2px; border-radius: 6px; }
    .search-clear:hover { color: var(--ink); background: var(--line-2); }

    /* Subtasks */
    .subtask-toggle { display: inline-flex; align-items: center; gap: 3px; border: none; background: var(--line-2); color: var(--ink-2); font-size: 11px; font-weight: 500; padding: 3px 9px 3px 6px; border-radius: 999px; cursor: pointer; }
    .subtask-toggle:hover { color: var(--ink); }
    .subtask-add-chip { display: inline-flex; align-items: center; gap: 4px; border: 1px dashed var(--line); background: transparent; color: var(--ink-3); font-size: 11px; font-weight: 500; padding: 2px 9px 2px 6px; border-radius: 999px; cursor: pointer; transition: all .15s; }
    .subtask-add-chip:hover { color: var(--blue); border-color: var(--blue); }
    .subtasks { display: flex; flex-direction: column; gap: 5px; padding: 2px 13px 12px 47px; }
    .subtask-item { display: flex; align-items: center; gap: 10px; padding: 8px 11px; border-radius: 11px; background: var(--line-2); transition: background .25s ease; }
    .subtask-item.done { background: rgba(52,199,89,0.12); animation: subFlash .55s ease; }
    html.crica-dark .subtask-item.done { background: rgba(52,199,89,0.16); }
    .subtask-check { width: 20px; height: 20px; flex: none; border-radius: 7px; border: 1.7px solid var(--line); background: var(--surface); display: grid; place-items: center; color: #fff; cursor: pointer; padding: 0; transition: border-color .15s; }
    .subtask-check.on { animation: subPop .32s ease; }
    .subtask-check.ghost { border: none; background: none; color: var(--ink-3); cursor: default; }
    .subtask-title { flex: 1; font-size: 13.5px; color: var(--ink); transition: color .25s ease; min-width: 0; }
    .subtask-item.done .subtask-title { text-decoration: line-through; color: var(--ink-3); }
    .subtask-del { border: none; background: none; color: var(--ink-3); cursor: pointer; opacity: 0.5; display: grid; place-items: center; padding: 2px; flex: none; transition: opacity .15s, color .15s; }
    .subtask-item:hover .subtask-del { opacity: 1; }
    .subtask-del:hover { color: #ff3b30; }
    .sub-handle { border: none; background: none; color: #c7c7cc; cursor: grab; padding: 0 2px; display: grid; place-items: center; touch-action: none; flex: none; }
    .sub-handle:active { cursor: grabbing; }
    .subtasks .drag-list { gap: 5px; }
    .subtasks .drag-row.is-dragging { transform: scale(1.015); }
    .subtasks .drag-row.is-dragging .subtask-item { box-shadow: 0 8px 22px rgba(0,0,0,0.16); }
    .subtask-input { flex: 1; border: none; background: none; color: var(--ink); font-size: 13.5px; outline: none; padding: 0; min-width: 0; }
    .subtask-add { display: inline-flex; align-items: center; gap: 6px; align-self: flex-start; border: none; background: none; color: var(--ink-3); font-size: 12.5px; font-weight: 500; cursor: pointer; padding: 3px 2px; }
    .subtask-add:hover { color: var(--blue); }
    @keyframes subPop { 0% { transform: scale(0.55); } 55% { transform: scale(1.28); } 100% { transform: scale(1); } }
    @keyframes subFlash { 0% { background: rgba(52,199,89,0.4); } 100% { } }
    .icon-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; margin-bottom: 14px; }
    .icon-pick { aspect-ratio: 1; border: 1.5px solid var(--line); background: #fff; border-radius: 12px; font-size: 20px; cursor: pointer; transition: all .15s; }
    .icon-pick.on { border-color: var(--blue); background: rgba(0,113,227,0.08); }
    .seg-pills { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
    .pill { display: inline-flex; align-items: center; gap: 6px; border: 1.5px solid var(--line); background: #fff; padding: 8px 13px; border-radius: 11px; font-size: 13.5px; font-weight: 500; color: var(--ink-2); cursor: pointer; transition: all .15s; }
    .pill b { color: var(--blue); }
    .pill-on { border-color: var(--blue); color: var(--ink); background: rgba(0,113,227,0.06); }

    /* Tasks */
    .task-card { display: flex; flex-direction: column; align-items: stretch; gap: 0; padding: 0; }
    .task-row { display: flex; align-items: center; gap: 11px; padding: 12px 13px; }
    .task-private-row { display: flex; align-items: center; justify-content: space-between; padding: 12px 13px; }
    .task-done .task-title { text-decoration: line-through; color: var(--ink-3); }
    .task-title { font-weight: 500; font-size: 14.5px; }
    .added-by { font-size: 11px; color: var(--blue); margin-top: 5px; font-weight: 500; }
    .pool-intro { display: flex; align-items: flex-start; gap: 7px; font-size: 13px; color: var(--ink-2); line-height: 1.45; margin: 2px 2px 14px; }
    .pool-intro svg { color: var(--blue); flex-shrink: 0; margin-top: 2px; }
    .pool-card { display: flex; align-items: center; gap: 11px; padding: 13px 14px; }
    .pool-card .task-main { flex: 1; min-width: 0; cursor: pointer; }
    .pool-notes { font-size: 12.5px; color: var(--ink-3); margin: 3px 0 2px; }
    .claim-btn { flex-shrink: 0; }

    /* Working-on timer */
    .task-working { border-color: var(--blue); box-shadow: inset 3px 0 0 var(--blue), var(--shadow); }
    .work-ctrl { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
    .work-start { width: 34px; height: 34px; border-radius: 50%; border: 1.5px solid var(--line); background: var(--surface); color: var(--blue); cursor: pointer; display: grid; place-items: center; transition: all .15s; }
    .work-start:hover { border-color: var(--blue); background: rgba(0,113,227,0.08); transform: scale(1.05); }
    .work-time { display: inline-flex; align-items: center; gap: 5px; font-size: 12.5px; font-weight: 500; color: var(--blue); background: rgba(0,113,227,0.1); padding: 5px 9px; border-radius: 9px; font-variant-numeric: tabular-nums; white-space: nowrap; animation: workPulse 2s ease-in-out infinite; }
    @keyframes workPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.6; } }
    .work-stop { color: #ff3b30; }
    html.crica-dark .work-time { background: rgba(0,113,227,0.18); }

    /* Habit extras */
    .habit-last { font-size: 11.5px; color: var(--ink-3); margin-top: 6px; font-weight: 500; }
    .freq-week { margin-top: 2px; }

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
    .per-mo { font-size: 16px; font-weight: 500; color: var(--ink-3); letter-spacing: 0; }
    .income-breakdown { margin-top: 6px; display: flex; flex-direction: column; gap: 2px; }
    .income-breakdown .legend-line span:last-child { color: var(--ink-2); font-variant-numeric: tabular-nums; }
    .tx-row { display: flex; align-items: center; gap: 12px; padding: 11px 14px; }
    .tx-ic { width: 32px; height: 32px; border-radius: 9px; display: grid; place-items: center; flex-shrink: 0; }
    .tx-ic.in { background: rgba(52,199,89,0.14); color: #34C759; }
    .tx-ic.out { background: rgba(255,59,48,0.14); color: #FF3B30; }
    .tx-main { flex: 1; min-width: 0; }
    .tx-note { font-weight: 500; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .tx-date { font-size: 12px; color: var(--ink-3); margin-top: 1px; }
    .tx-amt { font-weight: 500; font-variant-numeric: tabular-nums; flex-shrink: 0; }
    .tx-amt.in { color: #34C759; }
    .tx-amt.out { color: var(--ink-2); }
    .section-head { display: flex; align-items: center; justify-content: space-between; margin-top: 4px; }
    .section-head h3 { font-size: 19px; font-weight: 700; letter-spacing: -0.02em; margin: 0; }
    .client-card { display: flex; align-items: center; gap: 12px; padding: 13px 14px; }
    .client-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
    .client-main { flex: 1; cursor: pointer; min-width: 0; }
    .client-name { font-weight: 500; font-size: 14.5px; }
    .client-meta { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
    .paid-btn { padding: 8px 12px; font-size: 13px; flex-shrink: 0; }
    .toggle-row { display: flex; align-items: center; justify-content: space-between; font-size: 14px; font-weight: 500; margin: 6px 0 4px; }
    .toggle { width: 50px; height: 30px; border-radius: 16px; border: none; background: rgba(0,0,0,0.12); position: relative; cursor: pointer; transition: background .2s; }
    .toggle-on { background: #34C759; }
    .toggle-knob { position: absolute; top: 3px; left: 3px; width: 24px; height: 24px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.2); transition: transform .2s; }
    .toggle-on .toggle-knob { transform: translateX(20px); }

    /* Report */
    .report-banner { display: flex; align-items: center; gap: 10px; font-weight: 500; font-size: 14px; }
    .report-winner { margin-left: auto; display: inline-flex; align-items: center; gap: 6px; color: var(--blue); font-weight: 500; font-size: 13.5px; }
    .report-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .report-col { display: flex; flex-direction: column; gap: 8px; }
    .report-win { border-color: var(--blue); box-shadow: 0 0 0 2px rgba(0,113,227,0.2), var(--shadow); }
    .report-user { display: flex; align-items: center; gap: 8px; font-weight: 500; font-size: 14px; }
    .report-big { font-size: 34px; font-weight: 800; letter-spacing: -0.04em; line-height: 1; }
    .report-big span { font-size: 14px; font-weight: 500; color: var(--ink-3); margin-left: 4px; }
    .report-line { display: flex; align-items: center; gap: 7px; font-size: 13px; color: var(--ink-2); font-weight: 500; }
    .report-tasks { display: flex; flex-direction: column; gap: 5px; margin-top: 4px; border-top: 1px solid var(--line-2); padding-top: 8px; }
    .report-task { display: flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--ink-2); }
    .report-task svg { color: #34C759; flex-shrink: 0; }

    /* Settings */
    .points-legend { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .legend-block b { font-size: 13px; display: block; margin-bottom: 8px; }
    .legend-line { display: flex; justify-content: space-between; font-size: 13px; color: var(--ink-2); padding: 3px 0; }
    .legend-line span:last-child { color: var(--blue); font-weight: 500; }
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

    /* Focus: floating button */
    .focus-fab { position: fixed; right: 18px; bottom: 92px; z-index: 45; min-width: 56px; height: 56px; padding: 0 16px;
      border: none; border-radius: 28px; background: var(--blue); color: #fff; cursor: pointer; display: grid; place-items: center;
      box-shadow: 0 8px 24px rgba(0,113,227,0.45); transition: transform .15s, box-shadow .15s; }
    .focus-fab:hover { transform: translateY(-2px); }
    .focus-fab.active { background: linear-gradient(135deg, #AF52DE, var(--blue)); }
    .focus-fab.running { animation: focusGlow 2.4s ease-in-out infinite; }
    @keyframes focusGlow { 0%,100% { box-shadow: 0 8px 24px rgba(175,82,222,0.4); } 50% { box-shadow: 0 8px 34px rgba(175,82,222,0.7); } }
    .focus-fab-inner { display: flex; flex-direction: column; align-items: center; line-height: 1.05; }
    .focus-fab-time { font-size: 15px; font-weight: 800; font-variant-numeric: tabular-nums; }
    .focus-fab-pts { font-size: 10.5px; font-weight: 500; opacity: .9; }
    @media (min-width: 820px) { .focus-fab { bottom: 26px; right: 26px; } }

    /* Focus: full overlay */
    .focus-screen { position: fixed; inset: 0; z-index: 80; display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 28px; text-align: center; color: var(--ink);
      background: radial-gradient(120% 120% at 50% 0%, rgba(175,82,222,0.16), var(--bg) 55%);
      backdrop-filter: blur(8px); animation: focusIn .25s ease; }
    @keyframes focusIn { from { opacity: 0; } to { opacity: 1; } }
    .focus-close { position: absolute; top: 18px; right: 18px; width: 40px; height: 40px; border-radius: 50%; border: none;
      background: var(--surface); color: var(--ink-2); cursor: pointer; display: grid; place-items: center; box-shadow: var(--shadow); }
    .focus-kicker { display: inline-flex; align-items: center; gap: 6px; color: #AF52DE; font-weight: 500; font-size: 13px; text-transform: uppercase; letter-spacing: 0.08em; }
    .focus-kicker svg { color: #AF52DE; }
    .focus-h2 { font-size: 30px; font-weight: 800; letter-spacing: -0.03em; margin: 10px 0 6px; }
    .focus-sub { font-size: 14.5px; color: var(--ink-2); max-width: 360px; line-height: 1.5; margin: 0 auto; }
    .focus-presets { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin: 26px auto 18px; max-width: 360px; }
    .focus-preset { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 16px; border-radius: 16px; cursor: pointer;
      border: 1.5px solid var(--line); background: var(--surface); transition: all .15s; }
    .focus-preset:hover { border-color: #AF52DE; transform: translateY(-2px); }
    .focus-preset b { font-size: 26px; font-weight: 800; letter-spacing: -0.03em; }
    .focus-preset span { font-size: 12px; color: var(--ink-3); }
    .focus-preset i { font-size: 12px; font-style: normal; font-weight: 500; color: #AF52DE; margin-top: 4px; }
    .focus-custom { display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 14px; color: var(--ink-2); flex-wrap: wrap; }
    .focus-custom input { width: 76px; text-align: center; border: 1.5px solid var(--line); background: var(--surface); color: var(--ink); border-radius: 10px; padding: 9px; font-size: 15px; font-weight: 500; }

    .focus-live, .focus-done, .focus-setup { display: flex; flex-direction: column; align-items: center; }
    .focus-ring-wrap { position: relative; width: 264px; height: 264px; }
    .focus-ring-wrap.is-running { animation: breathe 4s ease-in-out infinite; }
    @keyframes breathe { 0%,100% { transform: scale(1); } 50% { transform: scale(1.025); } }
    .focus-ring-track { stroke: var(--line); }
    html.crica-dark .focus-ring-track { stroke: rgba(255,255,255,0.12); }
    .focus-ring-fill { stroke: #AF52DE; transition: stroke-dashoffset 1s linear; filter: drop-shadow(0 0 6px rgba(175,82,222,0.5)); }
    .focus-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .focus-time { font-size: 52px; font-weight: 800; letter-spacing: -0.04em; font-variant-numeric: tabular-nums; }
    .focus-state { font-size: 13px; color: var(--ink-3); font-weight: 500; margin-top: 2px; }
    .focus-pts-line { display: flex; align-items: baseline; gap: 8px; margin-top: 22px; }
    .focus-pts-big { font-size: 32px; font-weight: 800; color: #AF52DE; letter-spacing: -0.03em; display: inline-block; animation: ptsPop .5s cubic-bezier(.2,.9,.3,1.4); }
    @keyframes ptsPop { 0% { transform: scale(1.5); } 60% { transform: scale(0.92); } 100% { transform: scale(1); } }
    .focus-pts-lab { font-size: 14px; color: var(--ink-2); font-weight: 500; }
    .focus-next { font-size: 12.5px; color: var(--ink-3); margin-top: 6px; font-variant-numeric: tabular-nums; }
    .focus-controls { display: flex; gap: 10px; margin-top: 26px; }
    .focus-done-check { width: 84px; height: 84px; border-radius: 50%; background: #34C759; color: #fff; display: grid; place-items: center; margin-bottom: 8px; animation: ptsPop .5s cubic-bezier(.2,.9,.3,1.4); }
    .focus-done-pts { font-size: 26px; font-weight: 800; color: #AF52DE; margin: 2px 0 6px; }
    `}</style>
  );
}
