import { describe, expect, it } from 'vitest';
import { shouldBlockFraming } from '../frameGuard';
import { buildContentSecurityPolicy } from '../../../vite.security';

describe('shouldBlockFraming', () => {
  it('blocks third-party framing on the production host only', () => {
    expect(shouldBlockFraming('vowora.uk', true, false)).toBe(true);
    expect(shouldBlockFraming('www.vowora.uk', true, false)).toBe(true);
    expect(shouldBlockFraming('vowora.uk', true, true)).toBe(false);
    expect(shouldBlockFraming('vowora.uk', false, false)).toBe(false);
    expect(shouldBlockFraming('preview.readdy.ai', true, false)).toBe(false);
    expect(shouldBlockFraming('localhost', true, false)).toBe(false);
  });
});

describe('buildContentSecurityPolicy', () => {
  it('pins Supabase to the configured project and blocks plugins and inline script', () => {
    const csp = buildContentSecurityPolicy('https://abc.supabase.co');
    expect(csp).toContain("script-src 'self';");
    expect(csp).toContain('https://abc.supabase.co wss://abc.supabase.co');
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain('frame-src https://www.google.com');
    expect(csp).not.toContain("'unsafe-eval'");
  });

  it('falls back to the Supabase wildcard without a URL', () => {
    expect(buildContentSecurityPolicy('')).toContain('https://*.supabase.co');
  });
});
