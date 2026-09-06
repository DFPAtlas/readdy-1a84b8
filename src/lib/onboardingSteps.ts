// ── Onboarding step definitions with completion-check functions ──

import type { DemoState } from '@/demo/demoTypes';

export type StepKey =
  | 'wedding-details'
  | 'wedding-date'
  | 'ceremony-event'
  | 'add-guests'
  | 'create-invitation'
  | 'configure-rsvp'
  | 'travel-info'
  | 'wedding-website'
  | 'add-suppliers'
  | 'create-budget'
  | 'start-seating'
  | 'configure-registry'
  | 'configure-gallery'
  | 'invite-collaborator'
  | 'review-guest-portal'
  | 'publish-experience';

export interface OnboardingStep {
  key: StepKey;
  title: string;
  description: string;
  route: string;
  category: 'essentials' | 'guest-experience' | 'planning' | 'sharing';
  required: boolean;
  effortLabel: string;
  icon: string;
  sortOrder: number;
}

export interface StepCompletionCheck {
  (demoState: DemoState): boolean;
}

export const ONBOARDING_STEPS: (OnboardingStep & { check: StepCompletionCheck })[] = [
  {
    key: 'wedding-details',
    title: 'Add wedding details',
    description: 'Partner names, location, and basic information for your wedding workspace.',
    route: '/app/wedding',
    category: 'essentials',
    required: true,
    effortLabel: 'Quick',
    icon: 'ri-heart-line',
    sortOrder: 1,
    check: (s) => Boolean(s.wedding.title && s.wedding.partner_one_name && s.wedding.partner_two_name && s.wedding.location),
  },
  {
    key: 'wedding-date',
    title: 'Set date & timezone',
    description: 'Confirm your wedding date and timezone for accurate countdowns and scheduling.',
    route: '/app/wedding',
    category: 'essentials',
    required: true,
    effortLabel: 'Quick',
    icon: 'ri-calendar-line',
    sortOrder: 2,
    check: (s) => Boolean(s.wedding.wedding_date && s.wedding.timezone),
  },
  {
    key: 'ceremony-event',
    title: 'Add ceremony or main event',
    description: 'Create your wedding events — ceremony, reception, and any other gatherings.',
    route: '/app/schedule',
    category: 'essentials',
    required: true,
    effortLabel: 'Medium',
    icon: 'ri-calendar-event-line',
    sortOrder: 3,
    check: (s) => s.events.length > 0,
  },
  {
    key: 'add-guests',
    title: 'Add your first guests',
    description: 'Create guest records and organise them into households.',
    route: '/app/guests',
    category: 'guest-experience',
    required: true,
    effortLabel: 'Detailed',
    icon: 'ri-group-line',
    sortOrder: 4,
    check: (s) => s.guests.filter((g) => g.status === 'active').length > 0,
  },
  {
    key: 'create-invitation',
    title: 'Create an invitation',
    description: 'Design and personalise your wedding invitations.',
    route: '/app/invitations',
    category: 'guest-experience',
    required: false,
    effortLabel: 'Medium',
    icon: 'ri-mail-send-line',
    sortOrder: 5,
    check: (s) => s.invitations.length > 0,
  },
  {
    key: 'configure-rsvp',
    title: 'Configure RSVP form',
    description: 'Set up your RSVP questions, meal choices, and guest preferences.',
    route: '/app/invitations/responses',
    category: 'guest-experience',
    required: true,
    effortLabel: 'Medium',
    icon: 'ri-check-double-line',
    sortOrder: 6,
    check: (s) => s.rsvpSettings !== null && Object.keys(s.rsvpSettings || {}).length > 0,
  },
  {
    key: 'travel-info',
    title: 'Add travel information',
    description: 'Help guests find accommodation, transport, and local recommendations.',
    route: '/app/travel',
    category: 'guest-experience',
    required: false,
    effortLabel: 'Medium',
    icon: 'ri-map-pin-line',
    sortOrder: 7,
    check: (s) => s.travelPlaces.length > 0,
  },
  {
    key: 'wedding-website',
    title: 'Set up wedding website',
    description: 'Build your public wedding page with photos, story, and event details.',
    route: '/app/website',
    category: 'guest-experience',
    required: false,
    effortLabel: 'Detailed',
    icon: 'ri-global-line',
    sortOrder: 8,
    check: (s) => s.websiteConfig !== null && Object.keys(s.websiteConfig || {}).length > 0,
  },
  {
    key: 'add-suppliers',
    title: 'Add suppliers',
    description: 'Track your vendors — photographer, florist, caterer and more.',
    route: '/app/suppliers',
    category: 'planning',
    required: false,
    effortLabel: 'Medium',
    icon: 'ri-contacts-book-line',
    sortOrder: 9,
    check: (s) => s.suppliers.length > 0,
  },
  {
    key: 'create-budget',
    title: 'Create budget',
    description: 'Set your wedding budget and track spending across categories.',
    route: '/app/budget',
    category: 'planning',
    required: false,
    effortLabel: 'Detailed',
    icon: 'ri-money-pound-circle-line',
    sortOrder: 10,
    check: (s) => s.budgetCategories.length > 0,
  },
  {
    key: 'start-seating',
    title: 'Start seating plan',
    description: 'Arrange tables and assign guests for your reception.',
    route: '/app/seating',
    category: 'planning',
    required: false,
    effortLabel: 'Detailed',
    icon: 'ri-layout-grid-line',
    sortOrder: 11,
    check: (s) => s.seatingPlan.tables.length > 0 && s.seatingPlan.assignments.length > 0,
  },
  {
    key: 'configure-registry',
    title: 'Configure registry',
    description: 'Set up gift registry items for your guests to browse and contribute.',
    route: '/app/budget/gift-funding',
    category: 'planning',
    required: false,
    effortLabel: 'Medium',
    icon: 'ri-gift-line',
    sortOrder: 12,
    check: (s) => (s.giftFunds && s.giftFunds.length > 0) || s.registryItems.length > 0,
  },
  {
    key: 'configure-gallery',
    title: 'Configure gallery',
    description: 'Create albums and set up photo upload settings for guests.',
    route: '/app/gallery-control',
    category: 'planning',
    required: false,
    effortLabel: 'Medium',
    icon: 'ri-gallery-line',
    sortOrder: 13,
    check: (s) => s.gallerySettings !== null,
  },
  {
    key: 'invite-collaborator',
    title: 'Invite a collaborator',
    description: 'Share planning with your partner, wedding planner, or family.',
    route: '/app/settings',
    category: 'sharing',
    required: false,
    effortLabel: 'Quick',
    icon: 'ri-user-add-line',
    sortOrder: 14,
    check: () => false, // No demo collaborator invite support — always treat as incomplete in demo
  },
  {
    key: 'review-guest-portal',
    title: 'Review guest portal',
    description: 'Preview what your guests will see on their personalised portal.',
    route: '/guest/demo-session',
    category: 'sharing',
    required: false,
    effortLabel: 'Quick',
    icon: 'ri-eye-line',
    sortOrder: 15,
    check: () => true, // Always "complete" — the guest portal always exists in demo
  },
  {
    key: 'publish-experience',
    title: 'Publish guest experience',
    description: 'Make your wedding website live for guests to access.',
    route: '/w/emma-and-james-2027',
    category: 'sharing',
    required: false,
    effortLabel: 'Quick',
    icon: 'ri-rocket-line',
    sortOrder: 16,
    check: () => true, // Demo site is always published
  },
];

export function computeProgress(demoState: DemoState): {
  completed: number;
  total: number;
  percentage: number;
  steps: (OnboardingStep & { completed: boolean })[];
} {
  const steps = ONBOARDING_STEPS.map((step) => ({
    ...step,
    completed: step.check(demoState),
  }));

  const completed = steps.filter((s) => s.completed).length;
  const total = steps.length;
  const percentage = Math.round((completed / total) * 100);

  return { completed, total, percentage, steps };
}

export function getNextRecommendedStep(demoState: DemoState): (OnboardingStep & { completed: boolean }) | null {
  const { steps } = computeProgress(demoState);
  // Return the first incomplete required step, then the first incomplete optional step
  const firstRequired = steps.find((s) => !s.completed && s.required);
  if (firstRequired) return firstRequired;
  const firstOptional = steps.find((s) => !s.completed);
  return firstOptional || null;
}