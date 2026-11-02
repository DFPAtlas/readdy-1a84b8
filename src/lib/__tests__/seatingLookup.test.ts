import { describe, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import {
  LOOKUP_CODE_ALPHABET,
  deriveLookupCode,
  formatLookupCode,
  lookupCodeHash,
  normaliseGuestName,
  normaliseLookupCode,
  seatingLookupSecret,
} from '../../../supabase/functions/_shared/seatingLookup';

describe('seating lookup codes', () => {
  vi.stubGlobal('crypto', webcrypto);
  const pub = '11111111-1111-4111-8111-111111111111';
  const otherPub = '22222222-2222-4222-8222-222222222222';
  const guest = '33333333-3333-4333-8333-333333333333';
  const otherGuest = '44444444-4444-4444-8444-444444444444';

  it('derives a stable 6-character code from the publication and guest', async () => {
    const code = await deriveLookupCode('secret', pub, guest);
    expect(code).toMatch(new RegExp(`^[${LOOKUP_CODE_ALPHABET}]{6}$`));
    expect(await deriveLookupCode('secret', pub, guest)).toBe(code);
    expect(await deriveLookupCode('secret', pub, otherGuest)).not.toBe(code);
    expect(await deriveLookupCode('secret', otherPub, guest)).not.toBe(code);
    expect(await deriveLookupCode('other-secret', pub, guest)).not.toBe(code);
  });

  it('refuses to derive codes without a secret', async () => {
    await expect(deriveLookupCode('', pub, guest)).rejects.toThrow(/not configured/);
  });

  it('accepts codes typed with spaces, hyphens or lower case, and rejects anything else', () => {
    expect(normaliseLookupCode('abc-234')).toBe('ABC234');
    expect(normaliseLookupCode(' AbC 234 ')).toBe('ABC234');
    expect(formatLookupCode('ABC234')).toBe('ABC-234');
    expect(normaliseLookupCode('ABC23')).toBeNull();
    expect(normaliseLookupCode('ABC2345')).toBeNull();
    expect(normaliseLookupCode('ABO234')).toBeNull(); // O is excluded (looks like 0)
    expect(normaliseLookupCode(123456)).toBeNull();
    expect(normaliseLookupCode('A'.repeat(40))).toBeNull();
  });

  it('scopes stored hashes to the publication and never stores the code itself', async () => {
    const hash = await lookupCodeHash(pub, 'ABC234');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain('ABC234');
    expect(await lookupCodeHash(otherPub, 'ABC234')).not.toBe(hash);
  });

  it('matches names regardless of case, accents, punctuation and spacing', () => {
    expect(normaliseGuestName('  Zoë  O’Brien-Smith ')).toBe('zoe o brien smith');
    expect(normaliseGuestName('ZOE OBRIEN SMITH')).not.toBe(normaliseGuestName('Zoë O’Brien-Smith'));
    expect(normaliseGuestName('zoe o brien smith')).toBe(normaliseGuestName('Zoë O’Brien-Smith'));
    expect(normaliseGuestName(undefined)).toBe('');
  });

  it('prefers a dedicated secret and falls back to the service role key', () => {
    const env = (vars: Record<string, string>) => (name: string) => vars[name];
    expect(seatingLookupSecret(env({ SEATING_LOOKUP_SECRET: 'a', SUPABASE_SERVICE_ROLE_KEY: 'b' }))).toBe('a');
    expect(seatingLookupSecret(env({ SUPABASE_SERVICE_ROLE_KEY: 'b' }))).toBe('b');
    expect(seatingLookupSecret(env({}))).toBe('');
  });
});
