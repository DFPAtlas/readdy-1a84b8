import type { DemoState, DemoActivityEvent } from './demoTypes';
import { DEMO_CONFIG } from './demoConfig';
import { demoWedding, demoVenues, demoEvents, demoEventAudiences } from './demoWedding';
import { demoGuests } from './demoGuests';
import { demoHouseholds } from './demoHouseholds';
import { demoInvitations, demoInvitationRecipients, demoInvitationTemplates } from './demoInvitations';
import { demoBudgetCategories, demoExpenses, demoPayments } from './demoBudget';
import { demoSeatingPlan } from './demoSeating';
import { demoTravelPlaces } from './demoTravel';
import { demoUpdates } from './demoUpdates';
import { demoRegistryItems } from './demoRegistry';
import { demoGalleryItems, demoGalleryAlbums, demoGallerySettings } from './demoGallery';
import { demoGiftFunds, demoGiftFundContributions } from './demoGiftFunding';
import { demoTasks } from './demoTasks';
import { demoSuppliers } from './demoSuppliers';
import { demoFaqs, demoGuestQuestions, demoQuestionActivity, demoPortalSettings } from './demoQuestions';
import { createDemoWebsiteConfig } from './demoWebsite';
import { demoSubscription } from '@/demo/demoBilling';

export function createDemoActivityFeed(): DemoActivityEvent[] {
  return [
    { id: 'demo-activity-1', timestamp: '2027-01-15T14:30:00+00:00', message: 'Oliver Bennett confirmed attendance', category: 'rsvp', related_guest: 'Oliver Bennett', wedding_id: DEMO_CONFIG.weddingId },
    { id: 'demo-activity-2', timestamp: '2027-01-18T09:15:00+00:00', message: 'Sophie Carter added dietary requirement: nut allergy', category: 'dietary', related_guest: 'Sophie Carter', wedding_id: DEMO_CONFIG.weddingId },
    { id: 'demo-activity-3', timestamp: '2027-01-22T11:00:00+00:00', message: 'Amelia Wood viewed the travel guide', category: 'travel', related_guest: 'Amelia Wood', wedding_id: DEMO_CONFIG.weddingId },
    { id: 'demo-activity-4', timestamp: '2027-01-30T08:00:00+00:00', message: 'Payment of £800 due for bridal gown — now overdue', category: 'payments', related_guest: '', wedding_id: DEMO_CONFIG.weddingId },
    { id: 'demo-activity-5', timestamp: '2027-02-01T10:00:00+00:00', message: 'Four new photographs submitted and awaiting review', category: 'gallery', related_guest: '', wedding_id: DEMO_CONFIG.weddingId },
    { id: 'demo-activity-6', timestamp: '2027-02-05T16:45:00+00:00', message: 'Seating plan "Orangery Reception Layout" updated — 20 guests seated', category: 'seating', related_guest: '', wedding_id: DEMO_CONFIG.weddingId },
    { id: 'demo-activity-7', timestamp: '2027-02-10T12:00:00+00:00', message: 'Hotel room block reminder sent to all guests', category: 'updates', related_guest: '', wedding_id: DEMO_CONFIG.weddingId },
    { id: 'demo-activity-8', timestamp: '2027-02-12T14:20:00+00:00', message: 'Ruth Okonkwo confirmed plus-one: Tom Davies', category: 'rsvp', related_guest: 'Ruth Okonkwo', wedding_id: DEMO_CONFIG.weddingId },
  ];
}

export function createInitialDemoState(): DemoState {
  return {
    wedding: demoWedding,
    venues: demoVenues,
    events: demoEvents,
    eventAudiences: demoEventAudiences,
    guests: demoGuests,
    households: demoHouseholds,
    invitations: demoInvitations,
    invitationRecipients: demoInvitationRecipients,
    invitationTemplates: demoInvitationTemplates,
    budgetCategories: demoBudgetCategories,
    expenses: demoExpenses,
    payments: demoPayments,
    seatingPlan: demoSeatingPlan,
    travelPlaces: demoTravelPlaces,
    updates: demoUpdates,
    registryItems: demoRegistryItems,
    galleryItems: demoGalleryItems,
    galleryAlbums: demoGalleryAlbums,
    gallerySettings: demoGallerySettings,
    giftFunds: demoGiftFunds,
    giftFundContributions: demoGiftFundContributions,
    tasks: demoTasks,
    suppliers: demoSuppliers,
    activityFeed: createDemoActivityFeed(),
    onboardingComplete: false,
    planningPriorities: [],
    guestEstimate: 24,
    faqs: demoFaqs,
    guestQuestions: demoGuestQuestions,
    questionActivity: demoQuestionActivity,
    portalSettings: demoPortalSettings,
    websiteConfig: createDemoWebsiteConfig(),
    subscription: demoSubscription,
  };
}