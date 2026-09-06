import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { DemoState, DemoCalculatedStats, DemoGuest, DemoActivityEvent, DemoWeddingEvent, DemoEventAudience, DemoFaq, DemoGuestQuestion, DemoQuestionActivity, DemoPortalSettings } from './demoTypes';
import { createInitialDemoState } from './demoData';
import { loadDemoState, saveDemoState, clearDemoState, getLastInitialised } from './demoStorage';
import { isDemoMode } from './demoConfig';
import { demoInvitationTemplates } from './demoInvitations';

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
  getWebsiteConfig: () => Record<string, unknown> | null;
  saveWebsiteConfig: (config: Record<string, unknown> | null) => void;
  updateSubscription: (updates: Record<string, unknown>) => void;
}

export const DemoDataContext = createContext<DemoDataContextValue | null>(null);

function calculateStats(state: DemoState): DemoCalculatedStats {
  const guests = state.guests;
  const attending = guests.filter((g) => g.rsvp_status === 'accepted').length;
  const declined = guests.filter((g) => g.rsvp_status === 'declined').length;
  const dietaryCount = guests.filter((g) => g.dietary_requirements || g.allergy_notes).length;
  const accessibilityCount = guests.filter((g) => g.accessibility_needs || g.accessibility_notes).length;
  const plusOneCount = guests.filter((g) => g.plus_one_status === 'allowed' || g.plus_one_status === 'named').length;
  const dayGuests = guests.filter((g) => g.ceremony_invited || g.reception_invited).length;
  const eveningOnly = guests.filter((g) => !g.ceremony_invited && !g.reception_invited && g.evening_invited).length;
  const committed = state.expenses.filter((e) => e.status === 'active').reduce((sum, e) => sum + (e.agreed_amount || e.quoted_amount), 0);
  const paid = state.payments.filter((p) => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
  const planned = state.budgetCategories.reduce((sum, c) => sum + c.planned_amount, 0);
  const outstanding = committed - paid;
  const remainingUncommitted = planned - committed;
  const seatedGuestIds = new Set(state.seatingPlan.assignments.map((a) => a.guest_id));
  const eligible = guests.filter((g) => g.rsvp_status !== 'declined' && g.status === 'active').length;
  const seated = seatedGuestIds.size;
  const unseated = Math.max(0, eligible - seated);
  const guestTables = state.seatingPlan.tables.filter((t) => t.table_type === 'round' || t.table_type === 'rectangle');
  return {
    totalInvited: guests.length, attending, awaitingReply: guests.length - attending - declined,
    declined, householdCount: state.households.length, dietaryCount, accessibilityCount,
    plusOneCount, dayGuests, eveningOnly, tableCount: guestTables.length,
    seatedGuests: seated, unseatedGuests: unseated, budgetPlanned: planned,
    budgetCommitted: committed, budgetPaid: paid, budgetOutstanding: outstanding,
    budgetRemaining: remainingUncommitted, categoryCount: state.budgetCategories.length,
    expenseCount: state.expenses.length,
    upcomingPayments: state.payments.filter((p) => p.status === 'pending' || p.status === 'overdue').length,
    travelPlacesCount: state.travelPlaces.length, updateCount: state.updates.length,
    registryItemCount: state.registryItems.length,
    galleryApprovedCount: state.galleryItems.filter((g) => g.moderation_status === 'approved').length,
    galleryPendingCount: state.galleryItems.filter((g) => g.moderation_status === 'needs_review').length,
    galleryOnWallCount: state.galleryItems.filter((g) => g.moderation_status === 'approved' && g.wall_visible).length,
    taskCount: state.tasks.length, supplierCount: state.suppliers.length,
  };
}

export function DemoDataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(() => {
    if (!isDemoMode) return createInitialDemoState();
    const loaded = loadDemoState();
    if (!loaded) return createInitialDemoState();
    const fresh = createInitialDemoState();
    return { ...fresh, ...loaded, invitationTemplates: loaded.invitationTemplates?.length ? loaded.invitationTemplates : demoInvitationTemplates };
  });
  const [lastInitialised, setLastInitialised] = useState<string | null>(() => getLastInitialised());

  useEffect(() => {
    if (!isDemoMode) return;
    saveDemoState(state);
  }, [state]);

  const update = useCallback((fn: (prev: DemoState) => DemoState) => { setState((prev) => fn(prev)); }, []);

  const updateWedding = useCallback((updates: Partial<DemoState['wedding']>) => { update((prev) => ({ ...prev, wedding: { ...prev.wedding, ...updates } })); }, [update]);
  const addGuest = useCallback((guest: DemoGuest) => { update((prev) => ({ ...prev, guests: [...prev.guests, guest] })); }, [update]);
  const updateGuest = useCallback((guestId: string, updates: Partial<DemoGuest>) => { update((prev) => ({ ...prev, guests: prev.guests.map((g) => (g.id === guestId ? { ...g, ...updates } : g)) })); }, [update]);
  const archiveGuest = useCallback((guestId: string) => { update((prev) => ({ ...prev, guests: prev.guests.map((g) => (g.id === guestId ? { ...g, status: 'archived' as const } : g)) })); }, [update]);
  const restoreGuest = useCallback((guestId: string) => { update((prev) => ({ ...prev, guests: prev.guests.map((g) => (g.id === guestId ? { ...g, status: 'active' as const } : g)) })); }, [update]);
  const updateRsvp = useCallback((guestId: string, status: DemoGuest['rsvp_status'], mealChoice?: string) => { update((prev) => ({ ...prev, guests: prev.guests.map((g) => (g.id === guestId ? { ...g, rsvp_status: status, ...(mealChoice !== undefined ? { meal_choice: mealChoice } : {}) } : g)) })); }, [update]);
  const updateInvitationStatus = useCallback((invitationId: string, status: string) => { update((prev) => ({ ...prev, invitations: prev.invitations.map((inv) => (inv.id === invitationId ? { ...inv, status: status as DemoState['invitations'][0]['status'] } : inv)) })); }, [update]);
  const addExpense = useCallback((expense: DemoState['expenses'][0]) => { update((prev) => ({ ...prev, expenses: [...prev.expenses, expense] })); }, [update]);
  const updateExpense = useCallback((expenseId: string, updates: Partial<DemoState['expenses'][0]>) => { update((prev) => ({ ...prev, expenses: prev.expenses.map((e) => (e.id === expenseId ? { ...e, ...updates } : e)) })); }, [update]);
  const cancelExpense = useCallback((expenseId: string) => { update((prev) => ({ ...prev, expenses: prev.expenses.map((e) => (e.id === expenseId ? { ...e, status: 'cancelled' as const } : e)) })); }, [update]);
  const restoreExpense = useCallback((expenseId: string) => { update((prev) => ({ ...prev, expenses: prev.expenses.map((e) => (e.id === expenseId ? { ...e, status: 'active' as const } : e)) })); }, [update]);
  const addPayment = useCallback((payment: DemoState['payments'][0]) => { update((prev) => ({ ...prev, payments: [...prev.payments, payment] })); }, [update]);
  const updatePayment = useCallback((paymentId: string, updates: Partial<DemoState['payments'][0]>) => { update((prev) => ({ ...prev, payments: prev.payments.map((p) => (p.id === paymentId ? { ...p, ...updates } : p)) })); }, [update]);
  const cancelPayment = useCallback((paymentId: string) => { update((prev) => ({ ...prev, payments: prev.payments.map((p) => (p.id === paymentId ? { ...p, status: 'cancelled' as const } : p)) })); }, [update]);
  const restorePayment = useCallback((paymentId: string) => { update((prev) => ({ ...prev, payments: prev.payments.map((p) => (p.id === paymentId ? { ...p, status: 'pending' as const } : p)) })); }, [update]);
  const markPaymentPaid = useCallback((paymentId: string) => { const now = new Date().toISOString(); update((prev) => ({ ...prev, payments: prev.payments.map((p) => (p.id === paymentId ? { ...p, status: 'paid' as const, paid_at: now } : p)) })); }, [update]);
  const updateBudgetCategory = useCallback((categoryId: string, updates: Partial<DemoState['budgetCategories'][0]>) => { update((prev) => ({ ...prev, budgetCategories: prev.budgetCategories.map((c) => (c.id === categoryId ? { ...c, ...updates } : c)) })); }, [update]);
  const assignGuestToSeat = useCallback((guestId: string, tableId: string) => { update((prev) => { const filtered = prev.seatingPlan.assignments.filter((a) => a.guest_id !== guestId); const existingAssignment = prev.seatingPlan.assignments.find((a) => a.table_id === tableId && a.guest_id === guestId); if (existingAssignment) return prev; const maxSeat = filtered.filter((a) => a.table_id === tableId).length; return { ...prev, seatingPlan: { ...prev.seatingPlan, assignments: [...filtered, { id: `demo-seat-${Date.now()}`, guest_id: guestId, table_id: tableId, seat_number: maxSeat + 1 }] } }; }); }, [update]);
  const unassignGuest = useCallback((guestId: string) => { update((prev) => ({ ...prev, seatingPlan: { ...prev.seatingPlan, assignments: prev.seatingPlan.assignments.filter((a) => a.guest_id !== guestId) } })); }, [update]);
  const moveSeatingTable = useCallback((tableId: string, x: number, y: number) => { update((prev) => ({ ...prev, seatingPlan: { ...prev.seatingPlan, tables: prev.seatingPlan.tables.map((t) => (t.id === tableId ? { ...t, x, y } : t)) } })); }, [update]);
  const approveTravelPlace = useCallback((placeId: string) => { update((prev) => ({ ...prev, travelPlaces: prev.travelPlaces.map((p) => (p.id === placeId ? { ...p, approval_status: 'approved' as const } : p)) })); }, [update]);
  const hideTravelPlace = useCallback((placeId: string) => { update((prev) => ({ ...prev, travelPlaces: prev.travelPlaces.map((p) => (p.id === placeId ? { ...p, approval_status: 'hidden' as const } : p)) })); }, [update]);
  const featureTravelPlace = useCallback((placeId: string, featured: boolean) => { update((prev) => ({ ...prev, travelPlaces: prev.travelPlaces.map((p) => (p.id === placeId ? { ...p, featured } : p)) })); }, [update]);
  const addTravelPlace = useCallback((place: DemoState['travelPlaces'][0]) => { update((prev) => ({ ...prev, travelPlaces: [...prev.travelPlaces, place] })); }, [update]);
  const updateTravelPlace = useCallback((placeId: string, updates: Partial<DemoState['travelPlaces'][0]>) => { update((prev) => ({ ...prev, travelPlaces: prev.travelPlaces.map((p) => (p.id === placeId ? { ...p, ...updates } : p)) })); }, [update]);
  const resetSeatingOnly = useCallback(() => { const fresh = createInitialDemoState(); update((prev) => ({ ...prev, seatingPlan: fresh.seatingPlan })); }, [update]);
  const updateGalleryModeration = useCallback((itemId: string, status: DemoState['galleryItems'][0]['moderation_status']) => { update((prev) => ({ ...prev, galleryItems: prev.galleryItems.map((gi) => { if (gi.id !== itemId) return gi; const updated: DemoState['galleryItems'][0] = { ...gi, moderation_status: status }; if (status !== 'approved') updated.wall_visible = false; return updated; }) })); }, [update]);
  const toggleWallVisibility = useCallback((itemId: string, visible: boolean) => { update((prev) => ({ ...prev, galleryItems: prev.galleryItems.map((gi) => { if (gi.id !== itemId) return gi; if (visible && gi.moderation_status !== 'approved') return gi; return { ...gi, wall_visible: visible }; }) })); }, [update]);
  const editGalleryCaption = useCallback((itemId: string, caption: string, albumId?: string) => { update((prev) => ({ ...prev, galleryItems: prev.galleryItems.map((gi) => { if (gi.id !== itemId) return gi; const updated = { ...gi, caption }; if (albumId) (updated as Record<string, unknown>).album_id = albumId; return updated; }) })); }, [update]);
  const dismissGalleryReport = useCallback((itemId: string) => { update((prev) => ({ ...prev, galleryItems: prev.galleryItems.map((gi) => (gi.id === itemId ? { ...gi, reported: false } : gi)) })); }, [update]);
  const addGalleryItem = useCallback((item: DemoState['galleryItems'][0]) => { update((prev) => ({ ...prev, galleryItems: [...prev.galleryItems, item] })); }, [update]);
  const updateGallerySettings = useCallback((updates: Partial<DemoState['gallerySettings']>) => { update((prev) => ({ ...prev, gallerySettings: { ...prev.gallerySettings, ...updates } })); }, [update]);
  const resetGallery = useCallback(() => { update((prev) => ({ ...prev, galleryItems: createInitialDemoState().galleryItems, gallerySettings: createInitialDemoState().gallerySettings })); }, [update]);
  const addDemoActivity = useCallback((activity: DemoActivityEvent) => { update((prev) => ({ ...prev, activityFeed: [activity, ...prev.activityFeed] })); }, [update]);
  const markOnboardingComplete = useCallback((priorities: string[], estimate: number) => { update((prev) => ({ ...prev, onboardingComplete: true, planningPriorities: priorities, guestEstimate: estimate })); }, [update]);
  const markTaskComplete = useCallback((taskId: string) => { update((prev) => ({ ...prev, tasks: prev.tasks.map((t) => (t.id === taskId ? { ...t, status: 'completed' as const } : t)) })); }, [update]);
  const resetDemo = useCallback(() => { clearDemoState(); const fresh = createInitialDemoState(); setState(fresh); saveDemoState(fresh); setLastInitialised(new Date().toISOString()); }, []);
  const moveGuestToHousehold = useCallback((guestId: string, householdId: string) => { update((prev) => ({ ...prev, guests: prev.guests.map((g) => (g.id === guestId ? { ...g, household_id: householdId } : g)) })); }, [update]);
  const removeGuestFromHousehold = useCallback((guestId: string) => { update((prev) => ({ ...prev, guests: prev.guests.map((g) => (g.id === guestId ? { ...g, household_id: '' } : g)) })); }, [update]);
  const updateGuestTags = useCallback((guestId: string, tagIds: string[]) => { update((prev) => ({ ...prev, guests: prev.guests.map((g) => (g.id === guestId ? { ...g, tag_ids: tagIds } : g)) })); }, [update]);
  const generateDemoId = useCallback((prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, []);

  const submitDemoRsvp = useCallback((guestId: string, rsvpData: { response_status: DemoGuest['rsvp_status']; ceremony_attending: boolean; reception_attending: boolean; evening_attending: boolean; meal_choice: string; dietary_requirements: string; allergy_notes: string; accessibility_notes: string; plus_one_confirmed: boolean; plus_one_name: string; message: string; song_request: string; }) => { const now = new Date().toISOString(); update((prev) => { const updatedGuests = prev.guests.map((g) => { if (g.id !== guestId) return g; return { ...g, rsvp_status: rsvpData.response_status, rsvp_ceremony_attending: rsvpData.ceremony_attending, rsvp_reception_attending: rsvpData.reception_attending, rsvp_evening_attending: rsvpData.evening_attending, meal_choice: rsvpData.meal_choice, dietary_requirements: rsvpData.dietary_requirements, allergy_notes: rsvpData.allergy_notes, accessibility_notes: rsvpData.accessibility_notes, rsvp_plus_one_confirmed: rsvpData.plus_one_confirmed, plus_one_name: rsvpData.plus_one_name || g.plus_one_name, rsvp_message: rsvpData.message, rsvp_song_request: rsvpData.song_request, rsvp_submitted_at: now }; }); let updatedAssignments = prev.seatingPlan.assignments; if (rsvpData.response_status === 'declined') { updatedAssignments = updatedAssignments.filter((a) => a.guest_id !== guestId); } const guest = prev.guests.find((g) => g.id === guestId); const guestName = guest ? (guest.preferred_name || guest.full_name) : 'Guest'; return { ...prev, guests: updatedGuests, seatingPlan: { ...prev.seatingPlan, assignments: updatedAssignments }, activityFeed: [{ id: `demo-activity-${Date.now()}`, timestamp: now, message: `${guestName} ${rsvpData.response_status === 'accepted' ? 'accepted the invitation' : rsvpData.response_status === 'declined' ? 'declined the invitation' : 'updated their RSVP'}.`, category: 'rsvp', related_guest: guestName, wedding_id: prev.wedding.id }, ...prev.activityFeed] }; }); }, [update]);

  const simulateSendInvitation = useCallback((invitationId: string) => { const now = new Date().toISOString(); update((prev) => { const updatedInvitations = prev.invitations.map((inv) => { if (inv.id !== invitationId) return inv; return { ...inv, status: 'sent' as const }; }); const invitation = prev.invitations.find((inv) => inv.id === invitationId); return { ...prev, invitations: updatedInvitations, activityFeed: [{ id: `demo-activity-${Date.now()}`, timestamp: now, message: `Demo invitation "${invitation?.internal_name || invitationId}" marked as sent. No real email was delivered.`, category: 'invitation', related_guest: '', wedding_id: prev.wedding.id }, ...prev.activityFeed] }; }); }, [update]);

  const addEvent = useCallback((event: DemoWeddingEvent) => { update((prev) => ({ ...prev, events: [...prev.events, event] })); }, [update]);
  const updateEvent = useCallback((eventId: string, updates: Partial<DemoWeddingEvent>) => { update((prev) => ({ ...prev, events: prev.events.map((e) => (e.id === eventId ? { ...e, ...updates } : e)) })); }, [update]);
  const duplicateEvent = useCallback((eventId: string) => { update((prev) => { const original = prev.events.find((e) => e.id === eventId); if (!original) return prev; const newId = `demo-event-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`; const duplicate: DemoWeddingEvent = { ...original, id: newId, name: `${original.name} (copy)`, status: 'draft', published_at: null, sort_order: prev.events.length + 1 }; return { ...prev, events: [...prev.events, duplicate] }; }); }, [update]);
  const archiveEvent = useCallback((eventId: string) => { update((prev) => ({ ...prev, events: prev.events.map((e) => (e.id === eventId ? { ...e, status: 'archived' as const } : e)) })); }, [update]);
  const publishEvent = useCallback((eventId: string) => { const now = new Date().toISOString(); update((prev) => ({ ...prev, events: prev.events.map((e) => (e.id === eventId ? { ...e, status: 'published' as const, published_at: now } : e)) })); }, [update]);
  const hideEvent = useCallback((eventId: string) => { update((prev) => ({ ...prev, events: prev.events.map((e) => (e.id === eventId ? { ...e, visibility: 'hidden' as const } : e)) })); }, [update]);
  const cancelEvent = useCallback((eventId: string) => { update((prev) => ({ ...prev, events: prev.events.map((e) => (e.id === eventId ? { ...e, status: 'cancelled' as const } : e)) })); }, [update]);
  const addEventAudience = useCallback((audience: DemoEventAudience) => { update((prev) => ({ ...prev, eventAudiences: [...prev.eventAudiences, audience] })); }, [update]);
  const removeEventAudience = useCallback((audienceId: string) => { update((prev) => ({ ...prev, eventAudiences: prev.eventAudiences.filter((a) => a.id !== audienceId) })); }, [update]);

  // ── Question & FAQ mutations ──
  const answerQuestion = useCallback((questionId: string, response: string) => { const now = new Date().toISOString(); update((prev) => ({ ...prev, guestQuestions: prev.guestQuestions.map((q) => (q.id === questionId ? { ...q, response, responded_at: now, status: 'answered' as const, updated_at: now } : q)) })); }, [update]);
  const closeQuestion = useCallback((questionId: string) => { const now = new Date().toISOString(); update((prev) => ({ ...prev, guestQuestions: prev.guestQuestions.map((q) => (q.id === questionId ? { ...q, status: 'closed' as const, updated_at: now } : q)) })); }, [update]);
  const reopenQuestion = useCallback((questionId: string) => { const now = new Date().toISOString(); update((prev) => ({ ...prev, guestQuestions: prev.guestQuestions.map((q) => (q.id === questionId ? { ...q, status: 'pending' as const, updated_at: now } : q)) })); }, [update]);

  const addFaq = useCallback((faq: DemoFaq) => { update((prev) => ({ ...prev, faqs: [...prev.faqs, faq] })); }, [update]);
  const updateFaq = useCallback((faqId: string, updates: Partial<DemoFaq>) => { const now = new Date().toISOString(); update((prev) => ({ ...prev, faqs: prev.faqs.map((f) => (f.id === faqId ? { ...f, ...updates, updated_at: now } : f)) })); }, [update]);
  const duplicateFaq = useCallback((faqId: string) => { update((prev) => { const original = prev.faqs.find((f) => f.id === faqId); if (!original) return prev; const newId = `demo-faq-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`; const duplicate: DemoFaq = { ...original, id: newId, question: `${original.question} (copy)`, status: 'draft', is_published: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), helpful_count: 0, not_helpful_count: 0 }; return { ...prev, faqs: [...prev.faqs, duplicate] }; }); }, [update]);
  const archiveFaq = useCallback((faqId: string) => { update((prev) => ({ ...prev, faqs: prev.faqs.map((f) => (f.id === faqId ? { ...f, status: 'archived' as const, is_published: false, updated_at: new Date().toISOString() } : f)) })); }, [update]);
  const publishFaq = useCallback((faqId: string) => { update((prev) => ({ ...prev, faqs: prev.faqs.map((f) => (f.id === faqId ? { ...f, status: 'published' as const, is_published: true, updated_at: new Date().toISOString() } : f)) })); }, [update]);
  const unpublishFaq = useCallback((faqId: string) => { update((prev) => ({ ...prev, faqs: prev.faqs.map((f) => (f.id === faqId ? { ...f, status: 'draft' as const, is_published: false, updated_at: new Date().toISOString() } : f)) })); }, [update]);
  const deleteFaq = useCallback((faqId: string) => { update((prev) => ({ ...prev, faqs: prev.faqs.filter((f) => f.id !== faqId) })); }, [update]);
  const reorderFaqs = useCallback((faqIds: string[]) => { update((prev) => ({ ...prev, faqs: faqIds.map((id, idx) => { const faq = prev.faqs.find((f) => f.id === id); return faq ? { ...faq, sort_order: idx + 1 } : null; }).filter(Boolean) as DemoFaq[] })); }, [update]);
  const convertQuestionToFaq = useCallback((questionId: string, faqData: Partial<DemoFaq>) => { const now = new Date().toISOString(); const newId = `demo-faq-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`; const newFaq: DemoFaq = { id: newId, wedding_id: faqData.wedding_id || createInitialDemoState().wedding.id, category: faqData.category || 'general', question: faqData.question || '', answer: faqData.answer || '', related_links: faqData.related_links || [], is_published: false, status: 'draft', sort_order: 999, helpful_count: 0, not_helpful_count: 0, created_at: now, updated_at: now, ...faqData, id: newId }; update((prev) => ({ ...prev, faqs: [...prev.faqs, newFaq] })); }, [update]);
  const updatePortalSettings = useCallback((updates: Partial<DemoPortalSettings>) => { update((prev) => ({ ...prev, portalSettings: { ...prev.portalSettings, ...updates } })); }, [update]);

  const getWebsiteConfig = useCallback((): Record<string, unknown> | null => {
    return state.websiteConfig;
  }, [state.websiteConfig]);

  const saveWebsiteConfig = useCallback((config: Record<string, unknown> | null) => {
    update((prev) => ({ ...prev, websiteConfig: config as Record<string, unknown> | null }));
  }, [update]);

  const updateSubscription = useCallback((updates: Record<string, unknown>) => {
    update((prev) => ({
      ...prev,
      subscription: { ...((prev.subscription || {}) as Record<string, unknown>), ...updates },
    }));
  }, [update]);

  const stats = calculateStats(state);

  return (
    <DemoDataContext.Provider value={{ state, stats, lastInitialised, updateWedding, addGuest, updateGuest, archiveGuest, restoreGuest, updateRsvp, updateInvitationStatus, addExpense, updateExpense, cancelExpense, restoreExpense, addPayment, updatePayment, cancelPayment, restorePayment, markPaymentPaid, updateBudgetCategory, assignGuestToSeat, unassignGuest, moveSeatingTable, approveTravelPlace, hideTravelPlace, featureTravelPlace, addTravelPlace, updateTravelPlace, resetSeatingOnly, updateGalleryModeration, toggleWallVisibility, editGalleryCaption, dismissGalleryReport, addGalleryItem, updateGallerySettings, resetGallery, addDemoActivity, markOnboardingComplete, markTaskComplete, resetDemo, moveGuestToHousehold, removeGuestFromHousehold, updateGuestTags, generateDemoId, submitDemoRsvp, simulateSendInvitation, addEvent, updateEvent, duplicateEvent, archiveEvent, publishEvent, hideEvent, cancelEvent, addEventAudience, removeEventAudience, answerQuestion, closeQuestion, reopenQuestion, addFaq, updateFaq, duplicateFaq, archiveFaq, publishFaq, unpublishFaq, deleteFaq, reorderFaqs, convertQuestionToFaq, updatePortalSettings, getWebsiteConfig, saveWebsiteConfig, updateSubscription }}>
      {children}
    </DemoDataContext.Provider>
  );
}

export function useDemoData(): DemoDataContextValue {
  const ctx = useContext(DemoDataContext);
  if (!ctx) { throw new Error('useDemoData must be used within a DemoDataProvider'); }
  return ctx;
}