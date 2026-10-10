// Public browser configuration for this Readdy project. This is a publishable
// key, never a service-role key. Explicit environment values override it.
export const DEFAULT_SUPABASE_URL = 'https://fbtfomexfcwdwyxwcgot.supabase.co';
export const DEFAULT_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_35CfGmT6JmQ1QdheAEeHrg_EEk36VUj';

export function resolvePublicSupabaseConfig(env: Record<string, string | undefined>) {
  return {
    url: env.VITE_PUBLIC_SUPABASE_URL?.trim() || DEFAULT_SUPABASE_URL,
    key: env.VITE_PUBLIC_SUPABASE_ANON_KEY?.trim() || DEFAULT_SUPABASE_PUBLISHABLE_KEY,
  };
}
