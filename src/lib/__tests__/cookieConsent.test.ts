import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadConsentState,
  saveConsentState,
  hasConsentFor,
  COOKIE_CONSENT_VERSION,
  COOKIE_STORAGE_KEY,
} from '@/lib/cookieConsent';
import type { CookieConsentState } from '@/lib/cookieConsent';

describe('cookieConsent', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const validState: CookieConsentState = {
    version: COOKIE_CONSENT_VERSION,
    timestamp: new Date().toISOString(),
    consented: true,
    categories: {
      essential: true,
      analytics: true,
      marketing: false,
    },
  };

  describe('loadConsentState', () => {
    it('returns null when no consent stored', () => {
      expect(loadConsentState()).toBeNull();
    });

    it('returns parsed state when valid consent exists', () => {
      localStorage.setItem(COOKIE_STORAGE_KEY, JSON.stringify(validState));
      const loaded = loadConsentState();
      expect(loaded).not.toBeNull();
      expect(loaded!.version).toBe(COOKIE_CONSENT_VERSION);
      expect(loaded!.consented).toBe(true);
      expect(loaded!.categories.essential).toBe(true);
      expect(loaded!.categories.analytics).toBe(true);
      expect(loaded!.categories.marketing).toBe(false);
    });

    it('returns null for corrupted localStorage data', () => {
      localStorage.setItem(COOKIE_STORAGE_KEY, '{invalid json');
      expect(loadConsentState()).toBeNull();
    });

    it('returns null when consent version is outdated', () => {
      const oldState = { ...validState, version: 999 }; // future version, not matching
      localStorage.setItem(COOKIE_STORAGE_KEY, JSON.stringify(oldState));
      expect(loadConsentState()).toBeNull();
    });
  });

  describe('saveConsentState', () => {
    it('saves state to localStorage', () => {
      saveConsentState(validState);
      const raw = localStorage.getItem(COOKIE_STORAGE_KEY);
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!);
      expect(parsed.version).toBe(COOKIE_CONSENT_VERSION);
      expect(parsed.consented).toBe(true);
    });

    it('handles localStorage errors gracefully', () => {
      // Simulate localStorage being unavailable
      const origSetItem = localStorage.setItem;
      localStorage.setItem = () => { throw new Error('storage full'); };
      expect(() => saveConsentState(validState)).not.toThrow();
      localStorage.setItem = origSetItem;
    });
  });

  describe('hasConsentFor', () => {
    it('returns true for essential when no consent stored', () => {
      expect(hasConsentFor('essential')).toBe(true);
    });

    it('returns false for analytics when no consent stored', () => {
      expect(hasConsentFor('analytics')).toBe(false);
    });

    it('returns false for marketing when no consent stored', () => {
      expect(hasConsentFor('marketing')).toBe(false);
    });

    it('returns correct consent when state is stored', () => {
      localStorage.setItem(COOKIE_STORAGE_KEY, JSON.stringify(validState));
      expect(hasConsentFor('essential')).toBe(true);
      expect(hasConsentFor('analytics')).toBe(true);
      expect(hasConsentFor('marketing')).toBe(false);
    });

    it('returns false for all non-essential when version outdated', () => {
      const oldState = { ...validState, version: 0 };
      localStorage.setItem(COOKIE_STORAGE_KEY, JSON.stringify(oldState));
      // loadConsentState returns null due to version mismatch
      // hasConsentFor falls back: essential=true, others=false
      expect(hasConsentFor('essential')).toBe(true);
      expect(hasConsentFor('analytics')).toBe(false);
      expect(hasConsentFor('marketing')).toBe(false);
    });
  });

  describe('consent versioning', () => {
    it('treats mismatched version as no consent', () => {
      const futureState = { ...validState, version: COOKIE_CONSENT_VERSION + 1 };
      localStorage.setItem(COOKIE_STORAGE_KEY, JSON.stringify(futureState));
      expect(loadConsentState()).toBeNull();
    });

    it('current version is positive integer', () => {
      expect(COOKIE_CONSENT_VERSION).toBeGreaterThan(0);
      expect(Number.isInteger(COOKIE_CONSENT_VERSION)).toBe(true);
    });
  });
});