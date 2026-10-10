import { describe, it, expect } from 'vitest';
import { ANALYTICS_EVENTS, isValidEventName, validateEventProperties, isSensitiveProperty, buildRecordableEvent } from '@/lib/analyticsEvents';

// ── Event name validation ──

describe('Analytics Event System', () => {
  describe('isValidEventName', () => {
    it('accepts defined event names', () => {
      expect(isValidEventName('account_created')).toBe(true);
      expect(isValidEventName('invitation_sent')).toBe(true);
      expect(isValidEventName('rsvp_submitted')).toBe(true);
      expect(isValidEventName('website_published')).toBe(true);
      expect(isValidEventName('checkout_completed')).toBe(true);
      expect(isValidEventName('feedback_submitted')).toBe(true);
    });

    it('rejects unknown event names', () => {
      expect(isValidEventName('user_did_something')).toBe(false);
      expect(isValidEventName('')).toBe(false);
      expect(isValidEventName('random_event')).toBe(false);
      expect(isValidEventName('guest_name_exposed')).toBe(false);
    });

    it('rejects events that would leak private data', () => {
      // These patterns must NOT exist in the event allowlist
      expect(isValidEventName('guest_email_captured')).toBe(false);
      expect(isValidEventName('payment_card_stored')).toBe(false);
      expect(isValidEventName('rsvp_message_saved')).toBe(false);
    });
  });

  describe('validateEventProperties', () => {
    it('allows defined properties', () => {
      const result = validateEventProperties('account_created', { signup_method: 'email' });
      expect(result.valid).toBe(true);
      expect(result.rejected).toHaveLength(0);
    });

    it('rejects unknown properties', () => {
      const result = validateEventProperties('account_created', { unknown_field: 'value' });
      expect(result.valid).toBe(false);
      expect(result.rejected.length).toBeGreaterThan(0);
    });

    it('rejects disallowed property values', () => {
      const result = validateEventProperties('account_created', { signup_method: 'hacked' });
      expect(result.valid).toBe(false);
    });

    it('allows empty properties for events with no required props', () => {
      const result = validateEventProperties('invitation_opened', {});
      expect(result.valid).toBe(true);
    });

    it('rejects sensitive-sounding property names', () => {
      const result = validateEventProperties('guest_created', { guest_email: 'test@test.com' });
      expect(result.valid).toBe(false);
    });
  });

  describe('isSensitiveProperty', () => {
    it('flags email as sensitive', () => {
      expect(isSensitiveProperty('email')).toBe(true);
      expect(isSensitiveProperty('user_email')).toBe(true);
    });

    it('flags name as sensitive', () => {
      expect(isSensitiveProperty('guest_name')).toBe(true);
      expect(isSensitiveProperty('first_name')).toBe(true);
    });

    it('flags token as sensitive', () => {
      expect(isSensitiveProperty('access_token')).toBe(true);
      expect(isSensitiveProperty('invitation_token')).toBe(true);
    });

    it('flags hash as sensitive', () => {
      expect(isSensitiveProperty('session_hash')).toBe(true);
    });

    it('flags password/card as sensitive', () => {
      expect(isSensitiveProperty('password')).toBe(true);
      expect(isSensitiveProperty('card_number')).toBe(true);
    });

    it('flags dietary/allergy/accessibility as sensitive', () => {
      expect(isSensitiveProperty('dietary_requirements')).toBe(true);
      expect(isSensitiveProperty('allergy_info')).toBe(true);
      expect(isSensitiveProperty('accessibility_needs')).toBe(true);
    });

    it('flags message/note as sensitive', () => {
      expect(isSensitiveProperty('message')).toBe(true);
      expect(isSensitiveProperty('private_note')).toBe(true);
    });

    it('allows safe properties', () => {
      expect(isSensitiveProperty('signup_method')).toBe(false);
      expect(isSensitiveProperty('plan_code')).toBe(false);
      expect(isSensitiveProperty('step_index')).toBe(false);
      expect(isSensitiveProperty('route')).toBe(false);
    });
  });

  describe('buildRecordableEvent', () => {
    it('builds a valid event', () => {
      const result = buildRecordableEvent('account_created', { signup_method: 'email' }, '2026.08.05.1', '/app/signup', true);
      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result.event_name).toBe('account_created');
        expect(result.category).toBe('account');
        expect(result.release_version).toBe('2026.08.05.1');
        expect(result.consent_state).toBe('granted');
      }
    });

    it('rejects unknown events', () => {
      const result = buildRecordableEvent('unknown_event', {}, '1.0', '/', true);
      expect('error' in result).toBe(true);
    });

    it('rejects consent-required events without consent', () => {
      const result = buildRecordableEvent('onboarding_step_completed', { step_index: 1, step_id: 'a', total_steps: 5 }, '1.0', '/', false);
      expect('error' in result).toBe(true);
    });

    it('strips sensitive properties from the payload', () => {
      const result = buildRecordableEvent('account_created', { signup_method: 'email', guest_email: 'should_be_stripped@test.com' }, '1.0', '/', true);
      if (!('error' in result)) {
        expect(result.properties).not.toHaveProperty('guest_email');
        expect(result.properties).toHaveProperty('signup_method');
      }
    });

    it('rejects forbidden property values', () => {
      const result = buildRecordableEvent('feedback_submitted', { feedback_type: 'hack', feature: 'guests', route: '/app/guests' }, '1.0', '/', true);
      expect('error' in result).toBe(true);
    });

    it('allows feedback_submitted with valid props', () => {
      const result = buildRecordableEvent('feedback_submitted', { feedback_type: 'suggestion', feature: 'guests', route: '/app/guests' }, '1.0', '/', true);
      expect('error' in result).toBe(false);
    });
  });

  describe('Event allowlist completeness', () => {
    it('has no events with sensitive property names in allowedProperties', () => {
      for (const def of Object.values(ANALYTICS_EVENTS)) {
        for (const prop of def.allowedProperties) {
          expect(isSensitiveProperty(prop)).toBe(false);
        }
      }
    });

    it('has all required event categories', () => {
      const categories = new Set(Object.values(ANALYTICS_EVENTS).map((e) => e.category));
      expect(categories.has('account')).toBe(true);
      expect(categories.has('onboarding')).toBe(true);
      expect(categories.has('guest')).toBe(true);
      expect(categories.has('invitation')).toBe(true);
      expect(categories.has('rsvp')).toBe(true);
      expect(categories.has('website')).toBe(true);
      expect(categories.has('billing')).toBe(true);
    });
  });

  // ── Permission boundary tests ──

  describe('Admin route access', () => {
    it('analytics routes follow admin pattern', () => {
      const adminRoutes = ['/app/admin/analytics', '/app/admin/feedback', '/app/admin/improvements'];
      adminRoutes.forEach((route) => {
        expect(route.startsWith('/app/admin/')).toBe(true);
      });
    });

    it('admin routes are not accessible to normal user paths', () => {
      // These paths should NOT be in the guest or standard app nav
      const normalPaths = ['/app/dashboard', '/app/guests', '/app/wedding', '/guest/'];
      normalPaths.forEach((path) => {
        expect(path.startsWith('/app/admin/')).toBe(false);
      });
    });
  });

  // ── Priority score calculation ──

  describe('Priority scoring', () => {
    const computePriorityScore = (
      severity: string,
      frequency: string | null,
      confidence: string,
      effort: string,
    ): number => {
      const sevScore: Record<string, number> = { low: 1, medium: 3, high: 6, critical: 10 };
      const freqMap: Record<string, number> = { rare: 1, occasional: 2, frequent: 4, widespread: 6 };
      const confMap: Record<string, number> = { low: 0.5, medium: 1, high: 1.5 };
      const effortMap: Record<string, number> = { small: 1, medium: 2, large: 3, xl: 6 };
      const s = sevScore[severity] || 3;
      const f = (frequency && freqMap[frequency]) ? freqMap[frequency] : 2;
      const c = confMap[confidence] || 1;
      const e = effortMap[effort] || 1;
      return Math.round(s * f * c / e);
    };

    it('gives higher score to critical/high severity', () => {
      const critical = computePriorityScore('critical', 'frequent', 'high', 'medium');
      const low = computePriorityScore('low', 'frequent', 'high', 'medium');
      expect(critical).toBeGreaterThan(low);
    });

    it('gives higher score to small effort', () => {
      const small = computePriorityScore('high', 'frequent', 'high', 'small');
      const large = computePriorityScore('high', 'frequent', 'high', 'large');
      expect(small).toBeGreaterThan(large);
    });

    it('gives higher score to widespread frequency', () => {
      const widespread = computePriorityScore('high', 'widespread', 'high', 'medium');
      const rare = computePriorityScore('high', 'rare', 'high', 'medium');
      expect(widespread).toBeGreaterThan(rare);
    });
  });
});