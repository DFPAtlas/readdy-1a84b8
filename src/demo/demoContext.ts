/**
 * Lightweight demo context + hook. Kept apart from DemoDataProvider (which pulls
 * in the full demo dataset) so pages that call useDemoData()/useDemoDataSafe()
 * don't download demo data for real customers.
 */
import { createContext, useContext } from 'react';
import type { DemoState, DemoCalculatedStats, DemoGuest, DemoActivityEvent, DemoWeddingEvent, DemoEventAudience, DemoFaq, DemoGuestQuestion, DemoQuestionActivity, DemoPortalSettings } from './demoTypes';

// ── Context shape ──

export interface DemoDataContextValue {
  state: DemoState;
  stats: DemoCalculatedStats;
  lastInitialised: string | null;
  updateWedding: (updates: Partial<DemoState['wedding']>) => void;
  addGuest: (guest: DemoGuest) => void;
  updateGuest: (guestId: string, updates: Partial<DemoGuest>) => void;
  archiveGuest: (guestId: string) => void;
  restoreGuest: (guestId: string) => void;
  updateRsvp: (guestId: string, status: DemoGuest['rsvp_status'], mealChoice?: string) => void;
  updateInvitationStatus: (invitationId: string, status: string) => void;
  addExpense: (expense: DemoState['expenses'][0]) => void;
  updateExpense: (expenseId: string, updates: Partial<DemoState['expenses'][0]>) => void;
  cancelExpense: (expenseId: string) => void;
  restoreExpense: (expenseId: string) => void;
  addPayment: (payment: DemoState['payments'][0]) => void;
  updatePayment: (paymentId: string, updates: Partial<DemoState['payments'][0]>) => void;
  cancelPayment: (paymentId: string) => void;
  restorePayment: (paymentId: string) => void;
  markPaymentPaid: (paymentId: string) => void;
  updateBudgetCategory: (categoryId: string, updates: Partial<DemoState['budgetCategories'][0]>) => void;
  assignGuestToSeat: (guestId: string, tableId: string) => void;
  unassignGuest: (guestId: string) => void;
  moveSeatingTable: (tableId: string, x: number, y: number) => void;
  approveTravelPlace: (placeId: string) => void;
  hideTravelPlace: (placeId: string) => void;
  featureTravelPlace: (placeId: string, featured: boolean) => void;
  addTravelPlace: (place: DemoState['travelPlaces'][0]) => void;
  updateTravelPlace: (placeId: string, updates: Partial<DemoState['travelPlaces'][0]>) => void;
  resetSeatingOnly: () => void;
  updateGalleryModeration: (itemId: string, status: DemoState['galleryItems'][0]['moderation_status']) => void;
  toggleWallVisibility: (itemId: string, visible: boolean) => void;
  editGalleryCaption: (itemId: string, caption: string, albumId?: string) => void;
  dismissGalleryReport: (itemId: string) => void;
  addGalleryItem: (item: DemoState['galleryItems'][0]) => void;
  updateGallerySettings: (updates: Partial<DemoState['gallerySettings']>) => void;
  resetGallery: () => void;
  addDemoActivity: (activity: DemoActivityEvent) => void;
  markOnboardingComplete: (priorities: string[], estimate: number) => void;
  markTaskComplete: (taskId: string) => void;
  resetDemo: () => void;
  moveGuestToHousehold: (guestId: string, householdId: string) => void;
  removeGuestFromHousehold: (guestId: string) => void;
  updateGuestTags: (guestId: string, tagIds: string[]) => void;
  generateDemoId: (prefix: string) => string;
  submitDemoRsvp: (guestId: string, rsvpData: {
    response_status: DemoGuest['rsvp_status'];
    ceremony_attending: boolean;
    reception_attending: boolean;
    evening_attending: boolean;
    meal_choice: string;
    dietary_requirements: string;
    allergy_notes: string;
    accessibility_notes: string;
    plus_one_confirmed: boolean;
    plus_one_name: string;
    message: string;
    song_request: string;
  }) => void;
  simulateSendInvitation: (invitationId: string) => void;
  addEvent: (event: DemoWeddingEvent) => void;
  updateEvent: (eventId: string, updates: Partial<DemoWeddingEvent>) => void;
  duplicateEvent: (eventId: string) => void;
  archiveEvent: (eventId: string) => void;
  publishEvent: (eventId: string) => void;
  hideEvent: (eventId: string) => void;
  cancelEvent: (eventId: string) => void;
  addEventAudience: (audience: DemoEventAudience) => void;
  removeEventAudience: (audienceId: string) => void;
  answerQuestion: (questionId: string, response: string) => void;
  closeQuestion: (questionId: string) => void;
  reopenQuestion: (questionId: string) => void;
  addFaq: (faq: DemoFaq) => void;
  updateFaq: (faqId: string, updates: Partial<DemoFaq>) => void;
  duplicateFaq: (faqId: string) => void;
  archiveFaq: (faqId: string) => void;
  publishFaq: (faqId: string) => void;
  unpublishFaq: (faqId: string) => void;
  deleteFaq: (faqId: string) => void;
  reorderFaqs: (faqIds: string[]) => void;
  convertQuestionToFaq: (questionId: string, faqData: Partial<DemoFaq>) => void;
  updatePortalSettings: (updates: Partial<DemoPortalSettings>) => void;
  getWebsiteConfig: () => import("@/types/website").WebsiteConfig | null;
  saveWebsiteConfig: (config: import("@/types/website").WebsiteConfig | null) => void;
  updateSubscription: (updates: Record<string, unknown>) => void;
}

export const DemoDataContext = createContext<DemoDataContextValue | null>(null);

export function useDemoData(): DemoDataContextValue {
  const ctx = useContext(DemoDataContext);
  if (!ctx) { throw new Error('useDemoData must be used within a DemoDataProvider'); }
  return ctx;
}
