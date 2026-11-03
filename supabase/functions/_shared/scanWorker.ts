/**
 * Input rules for gallery-scan-worker (Tron's photo safety checks).
 * Free of Deno APIs so the same rules are unit tested in the app.
 */

export type ScanVerdict = "clean" | "flagged" | "error";

export interface ScanResult {
  asset_id: string;
  verdict: ScanVerdict;
  labels: string[];
  score: number | null;
  model: string | null;
  reason: string | null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Compares two secrets without leaking how many leading characters match. */
export function secretsMatch(given: string | null | undefined, expected: string | null | undefined): boolean {
  if (!given || !expected || expected.length < 32) return false;
  const a = new TextEncoder().encode(given);
  const b = new TextEncoder().encode(expected);
  let diff = a.length ^ b.length;
  for (let i = 0; i < b.length; i++) diff |= (a[i] ?? 0) ^ b[i];
  return diff === 0;
}

function shortText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const text = Array.from(value, (ch) => (ch.charCodeAt(0) < 32 || ch.charCodeAt(0) === 127 ? " " : ch))
    .join("").replace(/\s+/g, " ").trim().slice(0, max);
  return text || null;
}

/** Validates one result posted by Tron. Returns null when it is unusable. */
export function parseScanResult(body: unknown): ScanResult | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (typeof b.asset_id !== "string" || !UUID.test(b.asset_id)) return null;
  if (b.verdict !== "clean" && b.verdict !== "flagged" && b.verdict !== "error") return null;
  const labels = Array.isArray(b.labels)
    ? b.labels.map((l) => shortText(l, 40)).filter((l): l is string => !!l).slice(0, 10)
    : [];
  const rawScore = typeof b.score === "number" ? b.score : Number.NaN;
  const score = Number.isFinite(rawScore) ? Math.min(1, Math.max(0, rawScore)) : null;
  return {
    asset_id: b.asset_id.toLowerCase(),
    verdict: b.verdict,
    labels,
    score,
    model: shortText(b.model, 120),
    reason: shortText(b.reason, 300),
  };
}

export function claimLimit(value: unknown): number {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) && n > 0 ? Math.min(n, 25) : 10;
}
