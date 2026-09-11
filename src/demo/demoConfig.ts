import { IS_DEMO_MODE } from '@/lib/env';

export const DEMO_CONFIG = {
  weddingId: 'demo-wedding-emma-james',
  guestSessionId: 'demo-session',
  publicSlug: 'emma-and-james',
  demoToken: 'DEMO-VOWORA-2026',
  storageKey: 'vowora.demo.state.v1',
  storageVersion: 1,
} as const;

export const isDemoMode = IS_DEMO_MODE;