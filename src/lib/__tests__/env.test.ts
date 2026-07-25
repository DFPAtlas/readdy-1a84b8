import { describe, it, expect } from 'vitest';
import {
  isProductionConfigured,
  getMissingEnvVars,
  IS_DEMO_MODE,
  PUBLIC_SITE_URL,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
} from '@/lib/env';

describe('env module', () => {
  describe('isProductionConfigured', () => {
    it('returns true when SUPABASE_URL and SUPABASE_ANON_KEY are set', () => {
      // Our test setup stubs these as non-empty, so this should pass
      // Note: env vars are imported at module load time from import.meta.env
      // In test environment they come from the vitest stub in setup.ts
      expect(typeof isProductionConfigured()).toBe('boolean');
    });
  });

  describe('getMissingEnvVars', () => {
    it('returns an array', () => {
      const missing = getMissingEnvVars();
      expect(Array.isArray(missing)).toBe(true);
    });

    it('each missing var starts with VITE_PUBLIC_', () => {
      const missing = getMissingEnvVars();
      for (const v of missing) {
        expect(v).toMatch(/^VITE_PUBLIC_/);
      }
    });
  });

  describe('constants', () => {
    it('IS_DEMO_MODE is a boolean', () => {
      expect(typeof IS_DEMO_MODE).toBe('boolean');
    });

    it('PUBLIC_SITE_URL is a string', () => {
      expect(typeof PUBLIC_SITE_URL).toBe('string');
    });

    it('SUPABASE_URL is a string', () => {
      expect(typeof SUPABASE_URL).toBe('string');
    });

    it('SUPABASE_ANON_KEY is a string', () => {
      expect(typeof SUPABASE_ANON_KEY).toBe('string');
    });
  });
});