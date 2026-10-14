import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { rpc } from "./api.js";
import { CR, val, has, total, r2 } from "./constants.js";

const f1 = (x) => (x === null ? "–" : r2(x));
const byTeamJudge = (a, b) =>
  a.team_id - b.team_id || a.judge_username.localeCompare(b.judge_username, undefined, { numeric: true });

export default function Admin({ cred, toast }) {
  const [res, setRes] = useState([]);
  const [tmap, setTmap] = useState({});
  const [tab, setTab] = useState("board");

  const load = async () => {
    try {
      const t = await rpc("portal_get_teams", cred);
      const m = {};
      t.forEach((x) => (m[x.id] = x));
      setTmap(m);
      setRes(await rpc("portal_admin_results", cred));
    } catch (e) { toast(e.message); }
  };
  useEffect(() => { load(); }, []);

  const rows = Object.values(tmap).map((t) => {
    const rs = res.filter((r) => r.team_id == t.id && has(r));
    const n = rs.length;
    const av = CR.map((_, i) => (n ? rs.reduce((a, r) => a + (+val(r, i) || 0), 0) / n : null));
    return { t, n, av, total: n ? av.reduce((a, b) => a + b, 0) : null };
  });
  const ranked = rows.slice().sort((a, b) => (b.total ?? -1) - (a.total ?? -1));
  const scored = ranked.filter((r) => r.n).length;
  const judges = new Set(res.map((r) => r.judge_username)).size;
  const top = ranked[0] && ranked[0].n ? ranked[0] : null;
  const sorted = res.slice().sort(byTeamJudge);

  function download() {
    const all = [["Team", "Members", "Judge", ...CR.map((c) => `${c[0]} (Max ${c[1]})`), "Total (Max 100)", "Remarks"]];
    sorted.forEach((r) =>
      all.push([tmap[r.team_id]?.name, tmap[r.team_id]?.members, r.judge, ...CR.map((_, i) => val(r, i)), total(r), r.remarks])
    );
    const av = [["Team", "Judges scored", ...CR.map((c) => `${c[0]} (Avg, Max ${c[1]})`), "Average Total (Max 100)"]];
    rows.slice().sort((a, b) => a.t.id - b.t.id).forEach((r) =>
      av.push([r.t.name, r.n, ...r.av.map((x) => (x === null ? "" : r2(x))), r.total === null ? "" : r2(r.total)])
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(all), "All Scores");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(av), "Team Averages");
    XLSX.writeFile(wb, "IDEATHON_3.0_Judging_Results.xlsx");
  }

  const head = CR.map((c) => <th key={c[0]}>{c[0]}<br />({c[1]})</th>);

  return (
    <>
      <section className="hero">
        <div className="heroTxt">
          <h1>Results <span className="hl">Dashboard</span></h1>
          <p>Live scores from every judge, averaged per team.</p>
        </div>
      </section>

      <div className="tiles">
        <div className="tile"><small>Judges active</small><div>{judges}</div></div>
        <div className="tile green"><small>Teams scored</small><div>{scored}<span> / {ranked.length}</span></div></div>
        <div className="tile"><small>Total entries</small><div>{res.length}</div></div>
        <div className="tile dark"><small>Top team</small><div className="sm">{top ? top.t.name : "–"}</div></div>
      </div>

      <div className="tabs">
        {[["board", "Leaderboard"], ["avg", "Criteria averages"], ["all", "All judge scores"]].map(([k, l]) => (
          <button key={k} className={"chip" + (tab === k ? " on" : "")} onClick={() => setTab(k)}>{l}</button>
        ))}
        <span style={{ flex: 1 }} />
        <button className="btn ghost sm" onClick={async () => { await load(); toast("Updated"); }}>Refresh</button>
        <button className="btn dark sm" onClick={download}>Download Excel</button>
      </div>

      {tab === "board" && (
        <div className="panel">
          <h3><span className="hl">Leaderboard</span> <small>average of all judges, out of 100</small></h3>
          {ranked.map((r, k) => (
            <div className="lrow" key={r.t.id}>
              <div className={"rk" + (k < 3 && r.n ? " top" : "")}>{k + 1}</div>
              <div>
                <b>{r.t.name}</b><small>{r.n} judge{r.n === 1 ? "" : "s"}</small>
                <div className="lbar"><i style={{ width: (r.total || 0) + "%" }} /></div>
              </div>
              <div className="sc">{f1(r.total)}</div>
            </div>
          ))}
        </div>
      )}

      {tab === "avg" && (
        <div className="panel tw">
          <h3><span className="hl">Average</span> per criterion</h3>
          <table>
            <thead><tr><th className="l">Team</th><th>Judges</th>{head}<th>Total</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.t.id}>
                  <td className="l"><b>{r.t.name}</b></td><td>{r.n}</td>
                  {r.av.map((x, i) => <td key={i}>{f1(x)}</td>)}
                  <td><b>{f1(r.total)}</b></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "all" && (
        <div className="panel tw">
          <h3><span className="hl">All</span> judge scores</h3>
          <table>
            <thead><tr><th className="l">Team</th><th className="l">Judge</th>{head}<th>Total</th><th className="l">Remarks</th></tr></thead>
            <tbody>
              {sorted.map((r, k) => (
                <tr key={k}>
                  <td className="l"><b>{tmap[r.team_id]?.name}</b></td><td className="l">{r.judge}</td>
                  {CR.map((_, i) => <td key={i}>{val(r, i) ?? ""}</td>)}
                  <td><b>{total(r)}</b></td><td className="rem">{r.remarks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
