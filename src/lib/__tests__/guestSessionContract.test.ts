import { webcrypto } from 'node:crypto';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import {
  GUEST_LOCAL_ORIGINS,
  GUEST_SESSION_HASH_ALGORITHM,
  GUEST_SESSION_SECRET_BYTES,
  VOWORA_PRODUCTION_ORIGINS,
  hashGuestSessionSecret,
  normalizeOrigin,
  parseAllowedOrigins,
  resolveAllowedOrigin,
} from '@/lib/guestSessionContract';

// jsdom does not always expose WebCrypto's subtle digest — stub it in.
beforeAll(() => {
  if (!(globalThis as { crypto?: { subtle?: unknown } }).crypto?.subtle) {
    vi.stubGlobal('crypto', webcrypto);
  }
});

describe('guest session credential contract', () => {
  it('uses SHA-256 with 256-bit raw secrets', () => {
    expect(GUEST_SESSION_HASH_ALGORITHM).toBe('SHA-256');
    expect(GUEST_SESSION_SECRET_BYTES).toBe(32);
  });

  it('hashes the raw credential deterministically (known vector)', async () => {
    // SHA-256("abc")
    const expected = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
    await expect(hashGuestSessionSecret('abc')).resolves.toBe(expected);
    await expect(hashGuestSessionSecret('abc')).resolves.toBe(expected);
  });

  it('produces a one-way hash that never equals the raw credential', async () => {
    const raw = 'f3a1c2'.repeat(11); // 66 chars, credential-shaped
    const hash = await hashGuestSessionSecret(raw);
    expect(hash).not.toBe(raw);
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('guest CORS allowlist', () => {
  it('normalizes origins (trims whitespace and trailing slashes)', () => {
    expect(normalizeOrigin('  https://vowora.uk/  ')).toBe('https://vowora.uk');
    expect(normalizeOrigin('https://vowora.uk///')).toBe('https://vowora.uk');
  });

  it('defaults to Vowora production + local development origins', () => {
    const allowed = parseAllowedOrigins(null, false);
    for (const origin of VOWORA_PRODUCTION_ORIGINS) expect(allowed).toContain(origin);
    for (const origin of GUEST_LOCAL_ORIGINS) expect(allowed).toContain(origin);
  });

  it('honours an explicit allowlist and drops local origins unless opted in', () => {
    const explicit = parseAllowedOrigins('https://staging.vowora.uk/, https://preview.vowora.uk', false);
    expect(explicit).toContain('https://staging.vowora.uk');
    expect(explicit).toContain('https://preview.vowora.uk');
    expect(explicit).not.toContain('http://localhost:5173');
    expect(explicit).not.toContain('https://vowora.uk');
  });

  it('includes local origins when explicitly enabled alongside an allowlist', () => {
    const allowed = parseAllowedOrigins('https://staging.vowora.uk', true);
    expect(allowed).toContain('https://staging.vowora.uk');
    expect(allowed).toContain('http://localhost:5173');
  });

  it('echoes an allowed request origin', () => {
    const allowed = parseAllowedOrigins(null, false);
    expect(resolveAllowedOrigin('https://vowora.uk', allowed)).toBe('https://vowora.uk');
    expect(resolveAllowedOrigin('http://localhost:5173', allowed)).toBe('http://localhost:5173');
  });

  it('never reflects an origin that is not on the allowlist', () => {
    const allowed = parseAllowedOrigins(null, false);
    const resolved = resolveAllowedOrigin('https://evil.example.com', allowed);
    expect(resolved).not.toBe('https://evil.example.com');
    expect(allowed).toContain(resolved);
  });

  it('falls back to a production origin when the request has no Origin header', () => {
    const allowed = parseAllowedOrigins(null, false);
    expect(resolveAllowedOrigin(null, allowed)).toBe(VOWORA_PRODUCTION_ORIGINS[0]);
  });
});