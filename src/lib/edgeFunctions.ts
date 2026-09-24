// ── Edge Function URL helper ──
// Builds Supabase Edge Function URLs from the connected project.
// Never hardcode a backend host in page or component code — use this helper
// so every function call always targets the project's configured Supabase URL.

import { SUPABASE_URL } from '@/lib/env';

export const FUNCTIONS_BASE_URL = SUPABASE_URL
  ? `${SUPABASE_URL.replace(/\/+$/, '')}/functions/v1`
  : '';

export function edgeFunctionUrl(name: string): string {
  return `${FUNCTIONS_BASE_URL}/${name}`;
}