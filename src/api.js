const SUPABASE_URL = "https://ziavtupdsczjzrzuqttd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppYXZ0dXBkc2N6anpyenVxdHRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5NTc5NzMsImV4cCI6MjEwNzUzMzk3M30.59NERK4ENmpnnXHUYPtxxhN47cLco78soE5gUHmPn20";

// demo mode (?demo, passcode "demo") uses in-memory data so the UI can be previewed without a database
export const demo = new URLSearchParams(location.search).has("demo");
const mock = {
  teams: ["420", "NeuroNova", "CtrlPray", "California Burrito", "ACE", "HomeTeam"].map((n, i) => ({
    id: i + 1, name: n, members: "Member A, Member B, Member C",
  })),
  scores: {},
};

export async function rpc(fn, a) {
  if (demo) {
    if (fn === "portal_login") {
      if (a.p !== "demo") throw new Error("Invalid username or passcode");
      return { username: a.u, name: a.u === "admin" ? "Admin" : "Judge 1", is_admin: a.u === "admin" };
    }
    if (fn === "portal_get_teams") return mock.teams.map((t) => ({ ...t, ...(mock.scores[t.id] || {}) }));
    if (fn === "portal_save_score") {
      mock.scores[a.team] = { c1: a.v1, c2: a.v2, c3: a.v3, c4: a.v4, c5: a.v5, c6: a.v6, remarks: a.note };
      return { ok: true };
    }
    if (fn === "portal_admin_results")
      return Object.entries(mock.scores).map(([id, s]) => ({ team_id: +id, judge: "Judge 1", judge_username: "judge1", ...s }));
  }
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(a),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((d.message || "Request failed").replace(/^.*exception:?\s*/i, ""));
  return d;
}
