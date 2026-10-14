export const CR = [
  ["Innovation & Originality", 25, "Uniqueness, creativity, novelty, differentiation"],
  ["Problem Identification & Relevance", 20, "Clarity of the problem, importance, target users"],
  ["Proposed Solution & Approach", 20, "How well the idea solves it; clarity of approach"],
  ["Feasibility & Practicality", 15, "Realistic with available technology, time, resources"],
  ["Impact & Potential", 10, "Benefits, real-world usefulness, future scope"],
  ["Pitching & Q&A", 10, "Clarity, confidence, flow, time, answers to judges"],
];

export const val = (r, i) => r["c" + (i + 1)];
export const filled = (r, i) => val(r, i) !== null && val(r, i) !== undefined && val(r, i) !== "";
export const has = (r) => CR.some((_, i) => filled(r, i));
export const full = (r) => CR.every((_, i) => filled(r, i));
export const total = (r) => CR.reduce((a, _, i) => a + (+val(r, i) || 0), 0);
export const r2 = (x) => Math.round(x * 100) / 100;

// keep only a valid score: digits + one decimal place, no leading zeros, clamped to max
export function cleanScore(raw, max) {
  let s = raw.replace(/[^\d.]/g, "");
  const p = s.split(".");
  if (p.length > 2) s = p[0] + "." + p.slice(1).join("");
  s = s.replace(/^0+(?=\d)/, "");
  if (s.includes(".")) {
    const [a, b] = s.split(".");
    s = (a || "0") + "." + b.slice(0, 1);
  }
  if (s !== "" && +s > max) s = String(max);
  return s;
}
