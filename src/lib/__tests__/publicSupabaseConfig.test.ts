import { describe, expect, it } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { DEFAULT_SUPABASE_URL, resolvePublicSupabaseConfig } from '../publicSupabaseConfig';

describe('Readdy public configuration', () => {
  it('starts without an environment file', () => {
    const config = resolvePublicSupabaseConfig({});
    expect(config.url).toBe(DEFAULT_SUPABASE_URL);
    expect(config.key).toMatch(/^sb_publishable_/);
    expect(() => createClient(config.url, config.key)).not.toThrow();
  });
  it('honours an explicitly configured staging project', () => {
    expect(resolvePublicSupabaseConfig({ VITE_PUBLIC_SUPABASE_URL: ' https://staging.supabase.co ', VITE_PUBLIC_SUPABASE_ANON_KEY: ' staging-key ' })).toEqual({ url: 'https://staging.supabase.co', key: 'staging-key' });
  });
});
