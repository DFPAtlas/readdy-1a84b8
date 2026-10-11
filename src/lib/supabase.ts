import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './env';
import { rootAuthCallbackPath } from './authCallback';

// Supabase falls back to Site URL when an email redirect is not allowlisted.
// Capture that return before the auth SDK consumes and removes its URL tokens.
if (typeof window !== 'undefined') {
  const callback = rootAuthCallbackPath(new URL(window.location.href), typeof __BASE_PATH__ === 'string' ? __BASE_PATH__ : '/');
  if (callback) window.history.replaceState(window.history.state, '', callback);
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
