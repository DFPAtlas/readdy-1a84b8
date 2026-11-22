/**
 * Client-side throttle for credential and contact forms.
 *
 * This is a courtesy layer only: the real limits are enforced server-side by
 * Supabase Auth (Dashboard → Authentication → Rate Limits) and by the form
 * endpoint. It stops accidental double submits and casual scripted hammering
 * from one browser, and gives people a clear message instead of a vague error.
 */
export interface RateLimitRule {
  max: number;
  windowMs: number;
}

export const RATE_LIMITS = {
  signIn: { max: 5, windowMs: 60_000 },
  signUp: { max: 5, windowMs: 10 * 60_000 },
  passwordReset: { max: 3, windowMs: 15 * 60_000 },
  contact: { max: 3, windowMs: 10 * 60_000 },
} satisfies Record<string, RateLimitRule>;

export type RateLimitKey = keyof typeof RATE_LIMITS;

const memory = new Map<string, number[]>();
const STORAGE_PREFIX = 'vowora.rl.';

function read(key: string): number[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter((value) => typeof value === 'number');
    }
  } catch {
    // storage unavailable (private mode, sandboxed frame): fall back to memory
  }
  return memory.get(key) || [];
}

function write(key: string, stamps: number[]) {
  memory.set(key, stamps);
  try {
    window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(stamps));
  } catch {
    // ignore
  }
}

/**
 * Records an attempt and returns 0 when allowed, or the number of seconds to wait.
 */
export function takeAttempt(key: RateLimitKey, now = Date.now(), rule: RateLimitRule = RATE_LIMITS[key]): number {
  const recent = read(key).filter((stamp) => now - stamp < rule.windowMs);
  if (recent.length >= rule.max) {
    write(key, recent);
    return Math.max(1, Math.ceil((rule.windowMs - (now - recent[0])) / 1000));
  }
  write(key, [...recent, now]);
  return 0;
}

export function rateLimitMessage(seconds: number): string {
  const wait = seconds >= 90 ? `${Math.ceil(seconds / 60)} minutes` : `${seconds} seconds`;
  return `Too many attempts. Please wait ${wait} and try again.`;
}

export function resetRateLimit(key: RateLimitKey) {
  memory.delete(key);
  try {
    window.localStorage.removeItem(STORAGE_PREFIX + key);
  } catch {
    // ignore
  }
}
