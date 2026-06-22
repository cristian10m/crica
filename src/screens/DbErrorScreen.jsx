import { IconMark, Btn } from "../components/ui";

export function DbErrorScreen({ kind }) {
  const notConfigured = kind === "notconfigured";
  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="brand-wrap"><IconMark size={56} radius={17} /></div>
        <h1 className="auth-title">Cannot reach the database</h1>
        {notConfigured ? (
          <p className="auth-sub">Firebase is not set up in <b>src/firebase.js</b>, so there is nothing to sync to. Add the config and redeploy.</p>
        ) : (
          <p className="auth-sub">Crica connects to your Firebase Realtime Database to keep both of you in sync. It did not respond. This usually means the database has not been created yet, or its rules are blocking access.</p>
        )}
        {!notConfigured && (
          <div className="db-help">
            <div className="legend-line"><span>1. Realtime Database exists and is enabled</span></div>
            <div className="legend-line"><span>2. Rules allow read and write</span></div>
            <div className="legend-line"><span>3. The databaseURL in firebase.js is correct</span></div>
          </div>
        )}
        <Btn className="full" onClick={() => window.location.reload()}>Try again</Btn>
      </div>
    </div>
  );
}
