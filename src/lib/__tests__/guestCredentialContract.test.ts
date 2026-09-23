import { describe, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import { guestCorsHeaders, newGuestSessionSecret, sha256Hex, validGuestSessionSecret } from '../../../supabase/functions/_shared/guestAccess';

describe('guest credential boundary', () => {
  vi.stubGlobal('crypto', webcrypto);
  it('issues a fresh 256-bit bearer secret and stores a different SHA-256 digest', async () => {
    const raw = newGuestSessionSecret();
    const next = newGuestSessionSecret();
    const stored = await sha256Hex(raw);
    expect(validGuestSessionSecret(raw)).toBe(true);
    expect(raw).not.toBe(next);
    expect(stored).toMatch(/^[0-9a-f]{64}$/);
    expect(stored).not.toBe(raw);
    expect(await sha256Hex(raw)).toBe(stored);
    expect(await sha256Hex(stored)).not.toBe(stored);
  });

  it('only allows configured origins and keeps localhost out of production', () => {
    expect(guestCorsHeaders('https://vowora.uk')['Access-Control-Allow-Origin']).toBe('https://vowora.uk');
    expect(guestCorsHeaders('https://www.vowora.uk')['Access-Control-Allow-Origin']).toBe('https://www.vowora.uk');
    expect(guestCorsHeaders('https://wedora.uk')['Access-Control-Allow-Origin']).toBeUndefined();
    expect(guestCorsHeaders('http://localhost:5173', 'http://localhost:5173')['Access-Control-Allow-Origin']).toBeUndefined();
    expect(guestCorsHeaders('http://localhost:5173', 'http://localhost:5173', true)['Access-Control-Allow-Origin']).toBe('http://localhost:5173');
    expect(guestCorsHeaders('https://preview.vowora.uk', 'https://preview.vowora.uk')['Access-Control-Allow-Origin']).toBe('https://preview.vowora.uk');
  });
});
