import { describe, expect, it } from 'vitest';
import { rootAuthCallbackPath, confirmationDestination } from '../authCallback';

describe('confirmation callback routing', () => {
  it('recovers signup tokens returned to Site URL without losing them', () => {
    expect(rootAuthCallbackPath(new URL('https://vowora.uk/#access_token=test&refresh_token=test&type=signup'))).toBe('/auth/callback#access_token=test&refresh_token=test&type=signup');
  });
  it('recovers a root PKCE callback', () => expect(rootAuthCallbackPath(new URL('https://vowora.uk/?code=test'))).toBe('/auth/callback?code=test'));
  it('leaves normal homepage navigation alone', () => expect(rootAuthCallbackPath(new URL('https://vowora.uk/#pricing'))).toBeNull());
  it('preserves password recovery and preview base paths', () => expect(rootAuthCallbackPath(new URL('https://preview.example/site/#access_token=test&type=recovery'), '/site/')).toBe('/site/reset-password#access_token=test&type=recovery'));
  it('continues a new paid account through onboarding instead of the homepage', () => expect(confirmationDestination('/', {selected_plan:'complete'}, false)).toBe('/app/onboarding?plan=complete'));
  it('takes an existing completed account to its dashboard', () => expect(confirmationDestination(null, {}, true)).toBe('/app/dashboard'));
  it('preserves collaborator invitations and rejects external redirects', () => {
    expect(confirmationDestination('/join/invitation', {}, false)).toBe('/join/invitation');
    expect(confirmationDestination('//evil.example', {}, false)).toBe('/app/onboarding');
  });
});
