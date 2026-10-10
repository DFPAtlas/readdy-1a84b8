// ── Product Analytics Event System ──
// Every event must be defined here before use.
// Components MUST NOT send arbitrary JSON payloads.
// Unknown event names and properties are rejected at the recording boundary.

// ── Event categories ──
export type AnalyticsEventCategory =
  | 'account'
  | 'onboarding'
  | 'guest'
  | 'invitation'
  | 'rsvp'
  | 'website'
  | 'schedule'
  | 'budget'
  | 'seating'
  | 'travel'
  | 'gallery'
  | 'registry'
  | 'tasks'
  | 'suppliers'
  | 'questions'
  | 'exports'
  | 'billing'
  | 'help'
  | 'feedback'
  | 'collaboration';

// ── Event definition ──
export interface AnalyticsEventDef {
  /** Unique event name */
  name: string;
  /** Human-readable description */
  description: string;
  /** Event category */
  category: AnalyticsEventCategory;
  /** Whether user consent is required before recording */
  requiresConsent: boolean;
  /** Allowed property keys (no arbitrary payloads) */
  allowedProperties: string[];
  /** Retention class */
  retentionClass: 'operational' | 'product' | 'temporary';
}

// ── EVENT ALLOWLIST ──
// Only events defined here may be recorded.
// Adding or modifying requires a code review.

export const ANALYTICS_EVENTS: Record<string, AnalyticsEventDef> = {
  // ── Account ──
  account_created: {
    name: 'account_created',
    description: 'New user account created',
    category: 'account',
    requiresConsent: false,
    allowedProperties: ['signup_method', 'plan_hint'],
    retentionClass: 'operational',
  },
  account_activated: {
    name: 'account_activated',
    description: 'Account email verified or first login completed',
    category: 'account',
    requiresConsent: false,
    allowedProperties: ['method'],
    retentionClass: 'operational',
  },

  // ── Onboarding ──
  onboarding_step_completed: {
    name: 'onboarding_step_completed',
    description: 'A single onboarding step was completed',
    category: 'onboarding',
    requiresConsent: true,
    allowedProperties: ['step_index', 'step_id', 'total_steps'],
    retentionClass: 'product',
  },
  onboarding_completed: {
    name: 'onboarding_completed',
    description: 'Full onboarding flow completed',
    category: 'onboarding',
    requiresConsent: true,
    allowedProperties: ['total_steps_completed'],
    retentionClass: 'product',
  },

  // ── Wedding ──
  wedding_created: {
    name: 'wedding_created',
    description: 'New wedding record created',
    category: 'account',
    requiresConsent: false,
    allowedProperties: ['has_date'],
    retentionClass: 'operational',
  },
  wedding_details_completed: {
    name: 'wedding_details_completed',
    description: 'Wedding details form submitted',
    category: 'account',
    requiresConsent: false,
    allowedProperties: [],
    retentionClass: 'operational',
  },

  // ── Guests ──
  guest_created: {
    name: 'guest_created',
    description: 'A guest record was created',
    category: 'guest',
    requiresConsent: false,
    allowedProperties: ['imported'],
    retentionClass: 'product',
  },

  // ── Invitations ──
  invitation_created: {
    name: 'invitation_created',
    description: 'An invitation was created',
    category: 'invitation',
    requiresConsent: false,
    allowedProperties: ['template_used'],
    retentionClass: 'product',
  },
  invitation_sent: {
    name: 'invitation_sent',
    description: 'Invitation email was sent',
    category: 'invitation',
    requiresConsent: false,
    allowedProperties: ['recipient_count'],
    retentionClass: 'product',
  },
  invitation_opened: {
    name: 'invitation_opened',
    description: 'A guest opened their invitation',
    category: 'invitation',
    requiresConsent: false,
    allowedProperties: [],
    retentionClass: 'product',
  },

  // ── RSVP ──
  rsvp_opened: {
    name: 'rsvp_opened',
    description: 'Guest opened RSVP form',
    category: 'rsvp',
    requiresConsent: false,
    allowedProperties: [],
    retentionClass: 'product',
  },
  rsvp_started: {
    name: 'rsvp_started',
    description: 'Guest started filling RSVP form',
    category: 'rsvp',
    requiresConsent: false,
    allowedProperties: [],
    retentionClass: 'product',
  },
  rsvp_submitted: {
    name: 'rsvp_submitted',
    description: 'Guest submitted RSVP response',
    category: 'rsvp',
    requiresConsent: false,
    allowedProperties: ['response_count'],
    retentionClass: 'product',
  },

  // ── Website ──
  website_draft_saved: {
    name: 'website_draft_saved',
    description: 'Wedding website draft saved',
    category: 'website',
    requiresConsent: true,
    allowedProperties: [],
    retentionClass: 'product',
  },
  website_published: {
    name: 'website_published',
    description: 'Wedding website published',
    category: 'website',
    requiresConsent: true,
    allowedProperties: [],
    retentionClass: 'product',
  },

  // ── Schedule / Events ──
  event_created: {
    name: 'event_created',
    description: 'Wedding event was created',
    category: 'schedule',
    requiresConsent: true,
    allowedProperties: [],
    retentionClass: 'product',
  },

  // ── Seating ──
  seating_plan_created: {
    name: 'seating_plan_created',
    description: 'Seating plan was created',
    category: 'seating',
    requiresConsent: true,
    allowedProperties: ['table_count'],
    retentionClass: 'product',
  },

  // ── Registry ──
  registry_item_published: {
    name: 'registry_item_published',
    description: 'Registry item was published',
    category: 'registry',
    requiresConsent: true,
    allowedProperties: [],
    retentionClass: 'product',
  },

  // ── Gallery ──
  gallery_upload_completed: {
    name: 'gallery_upload_completed',
    description: 'Gallery upload completed',
    category: 'gallery',
    requiresConsent: false,
    allowedProperties: [],
    retentionClass: 'product',
  },
  gallery_media_approved: {
    name: 'gallery_media_approved',
    description: 'Gallery media was approved by moderator',
    category: 'gallery',
    requiresConsent: false,
    allowedProperties: [],
    retentionClass: 'product',
  },

  // ── Exports ──
  export_completed: {
    name: 'export_completed',
    description: 'Data export was completed',
    category: 'exports',
    requiresConsent: true,
    allowedProperties: ['export_type'],
    retentionClass: 'product',
  },

  // ── Billing ──
  pricing_viewed: {
    name: 'pricing_viewed',
    description: 'Pricing page was viewed',
    category: 'billing',
    requiresConsent: true,
    allowedProperties: [],
    retentionClass: 'product',
  },
  plan_selected: {
    name: 'plan_selected',
    description: 'A plan was selected on the pricing page',
    category: 'billing',
    requiresConsent: false,
    allowedProperties: ['plan_code'],
    retentionClass: 'product',
  },
  checkout_started: {
    name: 'checkout_started',
    description: 'Stripe Checkout session was created',
    category: 'billing',
    requiresConsent: false,
    allowedProperties: ['plan_code'],
    retentionClass: 'operational',
  },
  checkout_completed: {
    name: 'checkout_completed',
    description: 'Stripe Checkout was completed (webhook confirmed)',
    category: 'billing',
    requiresConsent: false,
    allowedProperties: ['plan_code'],
    retentionClass: 'operational',
  },
  subscription_activated: {
    name: 'subscription_activated',
    description: 'Subscription became active',
    category: 'billing',
    requiresConsent: false,
    allowedProperties: ['plan_code', 'billing_interval'],
    retentionClass: 'operational',
  },
  subscription_cancelled: {
    name: 'subscription_cancelled',
    description: 'Subscription was cancelled',
    category: 'billing',
    requiresConsent: false,
    allowedProperties: ['plan_code', 'reason_hint'],
    retentionClass: 'operational',
  },

  // ── Help ──
  help_article_viewed: {
    name: 'help_article_viewed',
    description: 'Help centre article was viewed',
    category: 'help',
    requiresConsent: true,
    allowedProperties: ['article_slug', 'was_helpful'],
    retentionClass: 'product',
  },

  // ── Feedback ──
  feedback_submitted: {
    name: 'feedback_submitted',
    description: 'In-app feedback was submitted',
    category: 'feedback',
    requiresConsent: true,
    allowedProperties: ['feedback_type', 'feature', 'route'],
    retentionClass: 'product',
  },

  // ── Collaboration ──
  collaborator_invited: {
    name: 'collaborator_invited',
    description: 'A collaborator invitation was sent',
    category: 'collaboration',
    requiresConsent: false,
    allowedProperties: ['role'],
    retentionClass: 'product',
  },
};

// ── Property allowlists per event ──
export const ALLOWED_PROPERTY_VALUES: Record<string, string[]> = {
  signup_method: ['email', 'google'],
  method: ['email', 'oauth'],
  plan_hint: ['free', 'trial', 'paid'],
  plan_code: ['free', 'starter', 'plus', 'premium'],
  billing_interval: ['monthly', 'annual'],
  feedback_type: ['problem', 'suggestion', 'confusing', 'praise', 'other'],
  role: ['partner', 'planner', 'collaborator', 'viewer'],
  export_type: ['guests', 'rsvp', 'seating', 'budget', 'gallery'],
  was_helpful: ['yes', 'no'],
  reason_hint: ['too_expensive', 'not_needed', 'missing_features', 'other'],
};

// ── Validation functions ──

export function isValidEventName(name: string): boolean {
  return name in ANALYTICS_EVENTS;
}

export function validateEventProperties(
  eventName: string,
  properties: Record<string, unknown>
): { valid: boolean; rejected: string[] } {
  const def = ANALYTICS_EVENTS[eventName];
  if (!def) return { valid: false, rejected: ['Unknown event name'] };

  const rejected: string[] = [];
  const allowedSet = new Set(def.allowedProperties);

  for (const key of Object.keys(properties)) {
    if (!allowedSet.has(key)) {
      rejected.push(`Property "${key}" not allowed for event "${eventName}"`);
      continue;
    }

    // Check allowed values if defined
    const allowedValues = ALLOWED_PROPERTY_VALUES[key];
    if (allowedValues && typeof properties[key] === 'string') {
      if (!allowedValues.includes(properties[key] as string)) {
        rejected.push(`Value "${properties[key]}" not allowed for property "${key}"`);
      }
    }
  }

  return { valid: rejected.length === 0, rejected };
}

export function isSensitiveProperty(key: string): boolean {
  const forbiddenPatterns = [
    'name', 'email', 'phone', 'token', 'hash', 'password',
    'card', 'dietary', 'allergy', 'accessibility', 'session',
    'secret', 'key', 'message', 'note',
  ];
  const lower = key.toLowerCase();
  return forbiddenPatterns.some((p) => lower.includes(p));
}

// ── Event recording (client-safe) ──
// Events are validated before reaching any storage.

export interface RecordableEvent {
  event_name: string;
  category: AnalyticsEventCategory;
  properties: Record<string, unknown>;
  release_version: string;
  route_group: string;
  consent_state: 'granted' | 'denied' | 'unknown';
  occurred_at: string;
}

export function buildRecordableEvent(
  eventName: string,
  properties: Record<string, unknown>,
  releaseVersion: string,
  route: string,
  consentGranted: boolean,
): RecordableEvent | { error: string } {
  if (!isValidEventName(eventName)) {
    return { error: `Unknown event: ${eventName}` };
  }

  const def = ANALYTICS_EVENTS[eventName];
  const validation = validateEventProperties(eventName, properties);
  if (!validation.valid) {
    return { error: validation.rejected.join('; ') };
  }

  if (def.requiresConsent && !consentGranted) {
    return { error: `Consent required for event: ${eventName}` };
  }

  // Strip any sensitive properties even if they snuck in
  const safeProps: Record<string, unknown> = {};
  for (const key of Object.keys(properties)) {
    if (!isSensitiveProperty(key) && def.allowedProperties.includes(key)) {
      safeProps[key] = properties[key];
    }
  }

  return {
    event_name: eventName,
    category: def.category,
    properties: safeProps,
    release_version: releaseVersion,
    route_group: route,
    consent_state: consentGranted ? 'granted' : 'denied',
    occurred_at: new Date().toISOString(),
  };
}