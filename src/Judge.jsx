import { useEffect, useRef, useState } from "react";
import { rpc } from "./api.js";
import { CR, has, full, total, cleanScore } from "./constants.js";

export default function Judge({ cred, toast }) {
  const [teams, setTeams] = useState([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [openId, setOpenId] = useState(null);

  const load = async () => {
    try { setTeams(await rpc("portal_get_teams", cred)); } catch (e) { toast(e.message); }
  };
  useEffect(() => { load(); }, []);

  const patch = (id, fields) => setTeams((ts) => ts.map((t) => (t.id === id ? { ...t, ...fields } : t)));

  const mine = teams.filter(has).length;
  const taken = teams.filter((t) => t.taken_by).length;
  const open = teams.length - mine - taken;
  const pct = teams.length ? ((mine + taken) / teams.length) * 100 : 0;

  const f = q.toLowerCase();
  const list = teams.filter(
    (t) =>
      (!f || (t.name + " " + t.members).toLowerCase().includes(f)) &&
      (filter === "all" || (filter === "done" ? has(t) : !has(t) && !t.taken_by))
  );

  return (
    <>
      <section className="hero">
        <div className="heroTxt">
          <h1>Idea Pitching <span className="hl">Scorecard</span></h1>
          <p>Round 2 · 100 marks per team. Type each score — it saves automatically.</p>
        </div>
        <div className="heroStats">
          <div className="stat"><b>{mine}</b><span>scored by you</span></div>
          <div className="stat"><b>{taken}</b><span>with other judges</span></div>
          <div className="stat"><b>{open}</b><span>still open</span></div>
          <div className="pbar"><i style={{ width: pct + "%" }} /></div>
        </div>
      </section>

      <div className="tools">
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search team or member…" />
        <div className="chips">
          {[["all", "All"], ["todo", "Pending"], ["done", "Scored"]].map(([k, l]) => (
            <button key={k} className={"chip" + (filter === k ? " on" : "")} onClick={() => setFilter(k)}>{l}</button>
          ))}
        </div>
      </div>

      {list.length ? (
        list.map((t) => (
          <TeamCard
            key={t.id}
            t={t}
            cred={cred}
            open={openId === t.id}
            onToggle={() => setOpenId(openId === t.id ? null : t.id)}
            onSaved={(fields) => patch(t.id, fields)}
            toast={toast}
            reload={load}
          />
        ))
      ) : (
        <div className="panel empty">No teams match.</div>
      )}
    </>
  );
}

const strVals = (t) => CR.map((_, i) => (t["c" + (i + 1)] ?? "") + "");

function TeamCard({ t, cred, open, onToggle, onSaved, toast, reload }) {
  const [vals, setVals] = useState(() => strVals(t));
  const [note, setNote] = useState(t.remarks || "");
  const [status, setStatus] = useState({ text: has(t) ? "Saved" : "Not scored yet", kind: "" });
  const latest = useRef({ vals, note });
  const timer = useRef();
  latest.current = { vals, note };

  useEffect(() => () => clearTimeout(timer.current), []);

  if (t.taken_by) {
    return (
      <div className="team locked">
        <div className="thead" style={{ cursor: "default" }}>
          <div className="num">{t.id}</div>
          <div className="tinfo"><b>{t.name}</b><span>{t.members}</span></div>
          <span className="pill lock">🔒 Judged by {t.taken_by}</span>
        </div>
      </div>
    );
  }

  const nums = vals.map((v) => (v === "" || v === "." ? null : +v));
  const draft = Object.fromEntries(nums.map((n, i) => ["c" + (i + 1), n]));
  const sum = Math.round(nums.reduce((a, n) => a + (n || 0), 0) * 100) / 100;

  async function save() {
    const { vals: vs, note: nt } = latest.current;
    const v = vs.map((x) => (x === "" || x === "." ? null : +x));
    try {
      await rpc("portal_save_score", { u: cred.u, p: cred.p, team: t.id, v1: v[0], v2: v[1], v3: v[2], v4: v[3], v5: v[4], v6: v[5], note: nt });
      onSaved({ ...Object.fromEntries(v.map((x, i) => ["c" + (i + 1), x])), remarks: nt });
      setStatus({ text: "Saved successfully ✓", kind: "ok" });
      toast("Saved successfully ✓ — " + t.name);
    } catch (err) {
      setStatus({ text: "Not saved: " + err.message, kind: "bad" });
      if (/already being judged/.test(err.message)) { toast(err.message); reload(); }
    }
  }

  const queue = () => {
    setStatus({ text: "Saving…", kind: "" });
    clearTimeout(timer.current);
    timer.current = setTimeout(save, 900);
  };

  const setScore = (i, raw) => {
    setVals((vs) => vs.map((x, k) => (k === i ? cleanScore(raw, CR[i][1]) : x)));
    queue();
  };

  const shown = has(draft) ? sum + " / 100" + (full(draft) ? "" : " · partial") : "Pending";

  return (
    <div className={"team" + (open ? " open" : "")}>
      <div className="thead" onClick={onToggle}>
        <div className="num">{t.id}</div>
        <div className="tinfo"><b>{t.name}</b><span>{t.members}</span></div>
        <span className={"pill" + (has(draft) ? " done" : "")}>{shown}</span>
        <svg className="arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6" /></svg>
      </div>
      {open && (
        <div className="body">
          <div className="mem">Team members: {t.members}</div>
          <div className="crits">
            {CR.map((c, i) => (
              <div className="crit" key={i}>
                <div className="critTxt">
                  <b>{c[0]}</b>
                  <span>{c[2]}</span>
                </div>
                <label className="scoreBox">
                  <input
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    value={vals[i]}
                    placeholder="–"
                    aria-label={c[0] + " score"}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setScore(i, e.target.value)}
                  />
                  <em>/ {c[1]}</em>
                </label>
              </div>
            ))}
          </div>
          <div className="sum">
            <div className="big"><span>{sum}</span> <small>/ 100</small></div>
            <div className="meter"><i style={{ width: Math.min(100, sum) + "%" }} /></div>
          </div>
          <textarea
            rows={2}
            placeholder="Remarks (optional)"
            value={note}
            onChange={(e) => { setNote(e.target.value); queue(); }}
          />
          <div className="saveRow">
            <span className={"st " + status.kind}>{status.text}</span>
            <button className="btn dark sm" onClick={() => { clearTimeout(timer.current); setStatus({ text: "Saving…", kind: "" }); save(); }}>Save</button>
          </div>
        </div>
      )}
    </div>
  );
}
