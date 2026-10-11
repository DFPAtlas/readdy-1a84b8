import { describe, it, expect } from 'vitest';
import { resolvePublicSiteOrigin } from '../../../supabase/functions/_shared/publicSiteOrigin';

describe('public site redirects', () => {
  it.each([undefined, '', 'PUBLIC_SITE_URL', 'javascript:alert(1)', 'https://user:password@example.com'])('uses the canonical site for unusable configuration %s', value => {
    expect(resolvePublicSiteOrigin(value)).toBe('https://vowora.uk');
  });
  it('uses the configured origin without duplicating paths or slashes', () => {
    expect(resolvePublicSiteOrigin(' https://vowora.uk/app/ ')).toBe('https://vowora.uk');
    expect(resolvePublicSiteOrigin('https://preview.example.com/')).toBe('https://preview.example.com');
  });
});
