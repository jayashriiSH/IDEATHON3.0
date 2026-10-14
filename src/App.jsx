import { useEffect, useState, useCallback, useRef } from "react";
import { rpc } from "./api.js";
import Judge from "./Judge.jsx";
import Admin from "./Admin.jsx";
import { Logo } from "./ui.jsx";

export default function App() {
  const [me, setMe] = useState(null);
  const [cred, setCred] = useState(null);
  const [ready, setReady] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const th = useRef();

  const toast = useCallback((m) => {
    setToastMsg(m);
    clearTimeout(th.current);
    th.current = setTimeout(() => setToastMsg(""), 2600);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const c = JSON.parse(sessionStorage.getItem("ide_cred") || "null");
        if (c) { setMe(await rpc("portal_login", c)); setCred(c); }
      } catch { sessionStorage.removeItem("ide_cred"); }
      setReady(true);
    })();
  }, []);

  const signOut = () => { sessionStorage.removeItem("ide_cred"); setMe(null); setCred(null); };

  if (!ready) return null;
  return (
    <>
      {!me ? (
        <Login onDone={(m, c) => { sessionStorage.setItem("ide_cred", JSON.stringify(c)); setMe(m); setCred(c); }} />
      ) : (
        <>
          <header className="top">
            <div className="topIn">
              <Logo />
              <div className="brandTxt"><b>IDEATHON 3.0</b><small>{me.name}{me.is_admin ? " · Admin" : ""}</small></div>
              <button className="btn dark sm" onClick={signOut}>Sign out</button>
            </div>
          </header>
          <main>{me.is_admin ? <Admin cred={cred} toast={toast} /> : <Judge cred={cred} toast={toast} />}</main>
        </>
      )}
      <div className={"toast" + (toastMsg ? " show" : "")}>{toastMsg}</div>
    </>
  );
}

function Login({ onDone }) {
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const pRef = useRef();

  async function go() {
    setErr(""); setBusy(true);
    try {
      const cu = u.trim().toLowerCase();
      onDone(await rpc("portal_login", { u: cu, p }), { u: cu, p });
    } catch (e) {
      setErr(e.message === "Failed to fetch" ? "Cannot reach the server. Check your connection." : e.message);
    }
    setBusy(false);
  }

  return (
    <section className="auth">
      <div className="authSide">
        <Logo size={120} />
        <span className="hl">IDEATHON 3.0</span>
        <h1>Judge portal for bold ideas.</h1>
        <p>Score every pitch on six criteria, add your remarks, and watch the leaderboard take shape. CINTEL Student Association.</p>
        <div className="blob"><span /><span /><span /></div>
      </div>
      <div className="authCard">
        <h2>Sign in</h2>
        <label htmlFor="u">Username</label>
        <input id="u" value={u} autoComplete="username" autoCapitalize="none" placeholder="judge1"
          onChange={(e) => setU(e.target.value)} onKeyDown={(e) => e.key === "Enter" && pRef.current.focus()} />
        <label htmlFor="p">Passcode</label>
        <input id="p" ref={pRef} type="password" value={p} autoComplete="current-password" placeholder="••••••"
          onChange={(e) => setP(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()} />
        <div className="err">{err}</div>
        <button className="btn dark block" disabled={busy} onClick={go}>{busy ? "Signing in…" : "Sign in"}</button>
      </div>
    </section>
  );
}
