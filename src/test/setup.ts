import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
});

// Mock localStorage for tests
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock import.meta.env for tests
vi.stubGlobal('import', {
  meta: {
    env: {
      DEV: true,
      PROD: false,
      VITE_DEMO_MODE: 'false',
      VITE_PUBLIC_SITE_URL: 'https://vowora.uk',
      VITE_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      VITE_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
      VITE_PUBLIC_GOOGLE_MAPS_KEY: '',
    },
  },
});
vi.stubEnv("VITE_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
vi.stubEnv("VITE_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
