import { lazy, Suspense } from "react";
import type { RouteObject } from "react-router-dom";
import AuthLayout from "@/components/feature/AuthLayout";
import GuestPortalLayout from "@/components/feature/GuestPortalLayout";
import PageLoader from "@/components/base/PageLoader";

// ── Helper: wraps a lazy component in Suspense ──
function LazyRoute({ comp: Comp }: { comp: React.LazyExoticComponent<React.ComponentType<any>> }) {
  return (
    <Suspense fallback={<PageLoader />}>
      <Comp />
    </Suspense>
  );
}

// ── Public pages ──
const Home = lazy(() => import("@/pages/home/page"));
const FeaturesPage = lazy(() => import("@/pages/features/page"));
const GuestExperiencePage = lazy(() => import("@/pages/guest-experience/page"));
const TravelConciergePage = lazy(() => import("@/pages/travel-concierge/page"));
const PricingPage = lazy(() => import("@/pages/pricing/page"));
const AboutPage = lazy(() => import("@/pages/about/page"));
const ContactPage = lazy(() => import("@/pages/contact/page"));
const LoginPage = lazy(() => import("@/pages/login/page"));
const SignupPage = lazy(() => import("@/pages/signup/page"));
const ForgotPasswordPage = lazy(() => import("@/pages/forgot-password/page"));
const ResetPasswordPage = lazy(() => import("@/pages/reset-password/page"));
const AuthCallbackPage = lazy(() => import("@/pages/auth/callback/page"));
const PrivacyPage = lazy(() => import("@/pages/privacy/page"));
const TermsPage = lazy(() => import("@/pages/terms/page"));
const CookieNoticePage = lazy(() => import("@/pages/cookies/page"));
const SubprocessorsPage = lazy(() => import("@/pages/subprocessors/page"));
const ContentRulesPage = lazy(() => import("@/pages/content-rules/page"));
const DPAPage = lazy(() => import("@/pages/dpa/page"));
const RetentionPage = lazy(() => import("@/pages/retention/page"));
const UnsubscribePage = lazy(() => import("@/pages/unsubscribe/page"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const PublicWeddingPage = lazy(() => import("@/pages/w/slug/page"));
const PublicTableLookupPage = lazy(() => import("@/pages/w/[slug]/table-lookup/page"));
const InviteLandingPage = lazy(() => import("@/pages/invite/[token]/page"));
const DemoStartPage = lazy(() => import("@/pages/demo-start/page"));
const LivePhotoWallPage = lazy(() => import("@/pages/live-wall/[slug]/page"));
const ContributionSuccessPage = lazy(() => import("@/pages/guest/fund/contribution/success/page"));
const ContributionCancelPage = lazy(() => import("@/pages/guest/fund/contribution/cancel/page"));

// ── Guest portal pages ──
const GuestHomePage = lazy(() => import("@/pages/guest/[accessId]/page"));
const GuestDetailsPage = lazy(() => import("@/pages/guest/[accessId]/details/page"));
const GuestTravelPage = lazy(() => import("@/pages/guest/[accessId]/travel/page"));
const GuestTravelMapPage = lazy(() => import("@/pages/guest/[accessId]/travel/map/page"));
const GuestAccommodationPage = lazy(() => import("@/pages/guest/[accessId]/travel/accommodation/page"));
const GuestAccommodationDetailPage = lazy(() => import("@/pages/guest/[accessId]/travel/accommodation/[locationId]/page"));
const GuestGettingTherePage = lazy(() => import("@/pages/guest/[accessId]/travel/getting-there/page"));
const GuestLocalGuidePage = lazy(() => import("@/pages/guest/[accessId]/travel/local-guide/page"));
const GuestSavedTravelPage = lazy(() => import("@/pages/guest/[accessId]/travel/saved/page"));
const GuestUpdatesPage = lazy(() => import("@/pages/guest/[accessId]/updates/page"));
const GuestUpdateDetailPage = lazy(() => import("@/pages/guest/[accessId]/updates/[updateId]/page"));
const GuestSavedUpdatesPage = lazy(() => import("@/pages/guest/[accessId]/updates/saved/page"));
const GuestUnreadUpdatesPage = lazy(() => import("@/pages/guest/[accessId]/updates/unread/page"));
const GuestSeatingLookupPage = lazy(() => import("@/pages/guest/[accessId]/seating/page"));
const GuestSeatingTablePage = lazy(() => import("@/pages/guest/[accessId]/seating/table/page"));
const GuestSeatingMapPage = lazy(() => import("@/pages/guest/[accessId]/seating/map/page"));
const GuestItineraryPage = lazy(() => import("@/pages/guest/[accessId]/itinerary/page"));
const GuestEventDetailPage = lazy(() => import("@/pages/guest/[accessId]/itinerary/[eventId]/page"));
const GuestRSVPPage = lazy(() => import("@/pages/guest/[accessId]/rsvp/page"));
const GuestRSVPReviewPage = lazy(() => import("@/pages/guest/[accessId]/rsvp/review/page"));
const GuestRSVPConfirmationPage = lazy(() => import("@/pages/guest/[accessId]/rsvp/confirmation/page"));
const GuestRSVPGuestPage = lazy(() => import("@/pages/guest/[accessId]/rsvp/[guestId]/page"));
const GuestRegistryPage = lazy(() => import("@/pages/guest/[accessId]/registry/page"));
const GuestGiftFundingPage = lazy(() => import("@/pages/guest/[accessId]/gift-funding/page"));
const GuestGiftFundDetailPage = lazy(() => import("@/pages/guest/[accessId]/gift-funding/[fundId]/page"));
const GuestGiftsPage = lazy(() => import("@/pages/guest/[accessId]/registry/gifts/page"));
const GuestGiftDetailPage = lazy(() => import("@/pages/guest/[accessId]/registry/gifts/[itemId]/page"));
const GuestFundsPage = lazy(() => import("@/pages/guest/[accessId]/registry/funds/page"));
const GuestFundDetailPage = lazy(() => import("@/pages/guest/[accessId]/registry/funds/[fundId]/page"));
const GuestCharitiesPage = lazy(() => import("@/pages/guest/[accessId]/registry/charities/page"));
const GuestContributionConfirmationPage = lazy(() => import("@/pages/guest/[accessId]/registry/confirmation/page"));
const GuestGalleryPage = lazy(() => import("@/pages/guest/[accessId]/gallery/page"));
const GuestGalleryAlbumsPage = lazy(() => import("@/pages/guest/[accessId]/gallery/albums/page"));
const GuestGalleryAlbumDetailPage = lazy(() => import("@/pages/guest/[accessId]/gallery/albums/[albumId]/page"));
const GuestGalleryFavouritesPage = lazy(() => import("@/pages/guest/[accessId]/gallery/favourites/page"));
const GuestGalleryUploadPage = lazy(() => import("@/pages/guest/[accessId]/gallery/upload/page"));
const GuestGalleryMyUploadsPage = lazy(() => import("@/pages/guest/[accessId]/gallery/my-uploads/page"));
const GuestQuestionsPage = lazy(() => import("@/pages/guest/[accessId]/questions/page"));
const GuestContactsPage = lazy(() => import("@/pages/guest/[accessId]/contacts/page"));
const GuestSettingsPage = lazy(() => import("@/pages/guest/[accessId]/settings/page"));

// ── App pages ──
const OnboardingPage = lazy(() => import("@/pages/app/onboarding/page"));
const DashboardPage = lazy(() => import("@/pages/app/dashboard/page"));
const WeddingDetailsPage = lazy(() => import("@/pages/app/wedding/page"));
const SettingsPage = lazy(() => import("@/pages/app/settings/page"));
const StyleboardPage = lazy(() => import("@/pages/app/styleboard/page"));

// Guest management
const GuestsPage = lazy(() => import("@/pages/app/guests/page"));
const AddGuestPage = lazy(() => import("@/pages/app/guests/new/page"));
const GuestDetailPage = lazy(() => import("@/pages/app/guests/[guestId]/page"));
const EditGuestPage = lazy(() => import("@/pages/app/guests/[guestId]/edit/page"));
const ImportGuestsPage = lazy(() => import("@/pages/app/guests/import/page"));
const ExportGuestsPage = lazy(() => import("@/pages/app/guests/export/page"));
const HouseholdsPage = lazy(() => import("@/pages/app/guests/households/page"));
const HouseholdNewEditPage = lazy(() => import("@/pages/app/guests/households/new/page"));
const HouseholdDetailPage = lazy(() => import("@/pages/app/guests/households/[householdId]/page"));
const TagsPage = lazy(() => import("@/pages/app/guests/tags/page"));

// Invitations
const InvitationsPage = lazy(() => import("@/pages/app/invitations/page"));
const NewInvitationPage = lazy(() => import("@/pages/app/invitations/new/page"));
const NewDesignPage = lazy(() => import("@/pages/app/invitations/design/new/page"));
const InvitationDetailPage = lazy(() => import("@/pages/app/invitations/[invitationId]/page"));
const EditInvitationPage = lazy(() => import("@/pages/app/invitations/[invitationId]/edit/page"));
const TemplatesPage = lazy(() => import("@/pages/app/invitations/templates/page"));
const NewTemplatePage = lazy(() => import("@/pages/app/invitations/templates/new/page"));
const TemplateDetailPage = lazy(() => import("@/pages/app/invitations/templates/[templateId]/page"));
const EditTemplatePage = lazy(() => import("@/pages/app/invitations/templates/[templateId]/edit/page"));
const ResponseOverviewPage = lazy(() => import("@/pages/app/invitations/responses/page"));
const InvitationAccessPage = lazy(() => import("@/pages/app/invitations/[invitationId]/access/page"));
const InvitationPreviewPage = lazy(() => import("@/pages/app/invitations/[invitationId]/preview/page"));

// Updates & Travel & Tasks & Suppliers
const UpdatesPage = lazy(() => import("@/pages/app/updates/page"));
const TravelPage = lazy(() => import("@/pages/app/travel/page"));
const TasksPage = lazy(() => import("@/pages/app/tasks/page"));
const SuppliersPage = lazy(() => import("@/pages/app/suppliers/page"));
const GalleryControlPage = lazy(() => import("@/pages/app/gallery-control/page"));

// Budget
const BudgetPage = lazy(() => import("@/pages/app/budget/page"));
const BudgetSetupPage = lazy(() => import("@/pages/app/budget/setup/page"));
const BudgetCategoriesPage = lazy(() => import("@/pages/app/budget/categories/page"));
const BudgetPaymentsPage = lazy(() => import("@/pages/app/budget/payments/page"));
const BudgetSuppliersPage = lazy(() => import("@/pages/app/budget/suppliers/page"));
const BudgetReportsPage = lazy(() => import("@/pages/app/budget/reports/page"));
const BudgetSettingsPage = lazy(() => import("@/pages/app/budget/settings/page"));
const BudgetScenariosPage = lazy(() => import("@/pages/app/budget/scenarios/page"));
const GiftFundingSetupPage = lazy(() => import("@/pages/app/budget/gift-funding/page"));

// Seating
const SeatingPage = lazy(() => import("@/pages/app/seating/page"));
const CreateSeatingPlanPage = lazy(() => import("@/pages/app/seating/new/page"));
const SeatingPlansPage = lazy(() => import("@/pages/app/seating/plans/page"));
const SeatingPlanWorkspacePage = lazy(() => import("@/pages/app/seating/plans/[planId]/page"));
const PlanSettingsPage = lazy(() => import("@/pages/app/seating/plans/[planId]/settings/page"));
const PlanVersionsPage = lazy(() => import("@/pages/app/seating/plans/[planId]/versions/page"));
const SeatingGroupsPage = lazy(() => import("@/pages/app/seating/plans/[planId]/groups/page"));
const SeatingRulesPage = lazy(() => import("@/pages/app/seating/plans/[planId]/rules/page"));
const SeatingConflictsPage = lazy(() => import("@/pages/app/seating/plans/[planId]/conflicts/page"));
const SeatingAssistantPage = lazy(() => import("@/pages/app/seating/plans/[planId]/assistant/page"));
const ProposalReviewPage = lazy(() => import("@/pages/app/seating/plans/[planId]/assistant/[proposalId]/page"));
const SeatingReportsPage = lazy(() => import("@/pages/app/seating/plans/[planId]/reports/page"));
const SeatingExportsPage = lazy(() => import("@/pages/app/seating/plans/[planId]/exports/page"));
const SeatingPublishPage = lazy(() => import("@/pages/app/seating/plans/[planId]/publish/page"));
const DayModePage = lazy(() => import("@/pages/app/seating/plans/[planId]/day-mode/page"));
const TableCardsPage = lazy(() => import("@/pages/app/seating/plans/[planId]/table-cards/page"));
const PlaceCardsPage = lazy(() => import("@/pages/app/seating/plans/[planId]/place-cards/page"));
const SeatingAuditPage = lazy(() => import("@/pages/app/seating/plans/[planId]/audit/page"));

// ── Route configuration ──

const routes: RouteObject[] = [
  // ── Public routes ──
  { path: "/", element: <LazyRoute comp={Home} /> },
  { path: "/features", element: <LazyRoute comp={FeaturesPage} /> },
  { path: "/guest-experience", element: <LazyRoute comp={GuestExperiencePage} /> },
  { path: "/travel-concierge", element: <LazyRoute comp={TravelConciergePage} /> },
  { path: "/pricing", element: <LazyRoute comp={PricingPage} /> },
  { path: "/about", element: <LazyRoute comp={AboutPage} /> },
  { path: "/contact", element: <LazyRoute comp={ContactPage} /> },
  { path: "/login", element: <LazyRoute comp={LoginPage} /> },
  { path: "/signup", element: <LazyRoute comp={SignupPage} /> },
  { path: "/forgot-password", element: <LazyRoute comp={ForgotPasswordPage} /> },
  { path: "/reset-password", element: <LazyRoute comp={ResetPasswordPage} /> },
  { path: "/auth/callback", element: <LazyRoute comp={AuthCallbackPage} /> },
  { path: "/privacy", element: <LazyRoute comp={PrivacyPage} /> },
  { path: "/terms", element: <LazyRoute comp={TermsPage} /> },
  { path: "/cookies", element: <LazyRoute comp={CookieNoticePage} /> },
  { path: "/subprocessors", element: <LazyRoute comp={SubprocessorsPage} /> },
  { path: "/content-rules", element: <LazyRoute comp={ContentRulesPage} /> },
  { path: "/dpa", element: <LazyRoute comp={DPAPage} /> },
  { path: "/retention", element: <LazyRoute comp={RetentionPage} /> },
  { path: "/unsubscribe", element: <LazyRoute comp={UnsubscribePage} /> },
  { path: "/w/:slug", element: <LazyRoute comp={PublicWeddingPage} /> },
  { path: "/w/:slug/table-lookup", element: <LazyRoute comp={PublicTableLookupPage} /> },
  { path: "/invite/:token", element: <LazyRoute comp={InviteLandingPage} /> },
  { path: "/demo-start", element: <LazyRoute comp={DemoStartPage} /> },
  { path: "/live-wall/:slug", element: <LazyRoute comp={LivePhotoWallPage} /> },
  { path: "/guest/fund/contribution/success", element: <LazyRoute comp={ContributionSuccessPage} /> },
  { path: "/guest/fund/contribution/cancel", element: <LazyRoute comp={ContributionCancelPage} /> },

  // ── Guest portal routes ──
  {
    path: "/guest/:accessId",
    element: <GuestPortalLayout />,
    children: [
      { index: true, element: <LazyRoute comp={GuestHomePage} /> },
      { path: "details", element: <LazyRoute comp={GuestDetailsPage} /> },
      { path: "travel", element: <LazyRoute comp={GuestTravelPage} /> },
      { path: "travel/map", element: <LazyRoute comp={GuestTravelMapPage} /> },
      { path: "travel/accommodation", element: <LazyRoute comp={GuestAccommodationPage} /> },
      { path: "travel/accommodation/:locationId", element: <LazyRoute comp={GuestAccommodationDetailPage} /> },
      { path: "travel/getting-there", element: <LazyRoute comp={GuestGettingTherePage} /> },
      { path: "travel/local-guide", element: <LazyRoute comp={GuestLocalGuidePage} /> },
      { path: "travel/saved", element: <LazyRoute comp={GuestSavedTravelPage} /> },
      { path: "updates", element: <LazyRoute comp={GuestUpdatesPage} /> },
      { path: "updates/:updateId", element: <LazyRoute comp={GuestUpdateDetailPage} /> },
      { path: "updates/saved", element: <LazyRoute comp={GuestSavedUpdatesPage} /> },
      { path: "updates/unread", element: <LazyRoute comp={GuestUnreadUpdatesPage} /> },
      { path: "seating", element: <LazyRoute comp={GuestSeatingLookupPage} /> },
      { path: "seating/table", element: <LazyRoute comp={GuestSeatingTablePage} /> },
      { path: "seating/map", element: <LazyRoute comp={GuestSeatingMapPage} /> },
      { path: "itinerary", element: <LazyRoute comp={GuestItineraryPage} /> },
      { path: "itinerary/:eventId", element: <LazyRoute comp={GuestEventDetailPage} /> },
      { path: "rsvp", element: <LazyRoute comp={GuestRSVPPage} /> },
      { path: "rsvp/review", element: <LazyRoute comp={GuestRSVPReviewPage} /> },
      { path: "rsvp/confirmation", element: <LazyRoute comp={GuestRSVPConfirmationPage} /> },
      { path: "rsvp/:guestId", element: <LazyRoute comp={GuestRSVPGuestPage} /> },
      { path: "registry", element: <LazyRoute comp={GuestRegistryPage} /> },
      { path: "gift-funding", element: <LazyRoute comp={GuestGiftFundingPage} /> },
      { path: "gift-funding/:fundId", element: <LazyRoute comp={GuestGiftFundDetailPage} /> },
      { path: "registry/gifts", element: <LazyRoute comp={GuestGiftsPage} /> },
      { path: "registry/gifts/:itemId", element: <LazyRoute comp={GuestGiftDetailPage} /> },
      { path: "registry/funds", element: <LazyRoute comp={GuestFundsPage} /> },
      { path: "registry/funds/:fundId", element: <LazyRoute comp={GuestFundDetailPage} /> },
      { path: "registry/charities", element: <LazyRoute comp={GuestCharitiesPage} /> },
      { path: "registry/confirmation", element: <LazyRoute comp={GuestContributionConfirmationPage} /> },
      { path: "gallery", element: <LazyRoute comp={GuestGalleryPage} /> },
      { path: "gallery/albums", element: <LazyRoute comp={GuestGalleryAlbumsPage} /> },
      { path: "gallery/albums/:albumId", element: <LazyRoute comp={GuestGalleryAlbumDetailPage} /> },
      { path: "gallery/favourites", element: <LazyRoute comp={GuestGalleryFavouritesPage} /> },
      { path: "gallery/upload", element: <LazyRoute comp={GuestGalleryUploadPage} /> },
      { path: "gallery/my-uploads", element: <LazyRoute comp={GuestGalleryMyUploadsPage} /> },
      { path: "questions", element: <LazyRoute comp={GuestQuestionsPage} /> },
      { path: "contacts", element: <LazyRoute comp={GuestContactsPage} /> },
      { path: "settings", element: <LazyRoute comp={GuestSettingsPage} /> },
    ],
  },

  // ── Protected app routes ──
  {
    path: "/app",
    element: <AuthLayout />,
    children: [
      { path: "onboarding", element: <LazyRoute comp={OnboardingPage} /> },
      { path: "dashboard", element: <LazyRoute comp={DashboardPage} /> },
      { path: "wedding", element: <LazyRoute comp={WeddingDetailsPage} /> },

      // Guest management
      { path: "guests", element: <LazyRoute comp={GuestsPage} /> },
      { path: "guests/new", element: <LazyRoute comp={AddGuestPage} /> },
      { path: "guests/import", element: <LazyRoute comp={ImportGuestsPage} /> },
      { path: "guests/export", element: <LazyRoute comp={ExportGuestsPage} /> },
      { path: "guests/households", element: <LazyRoute comp={HouseholdsPage} /> },
      { path: "guests/households/new", element: <LazyRoute comp={HouseholdNewEditPage} /> },
      { path: "guests/households/:householdId", element: <LazyRoute comp={HouseholdDetailPage} /> },
      { path: "guests/households/:householdId/edit", element: <LazyRoute comp={HouseholdNewEditPage} /> },
      { path: "guests/tags", element: <LazyRoute comp={TagsPage} /> },
      { path: "guests/:guestId", element: <LazyRoute comp={GuestDetailPage} /> },
      { path: "guests/:guestId/edit", element: <LazyRoute comp={EditGuestPage} /> },

      // Invitations
      { path: "invitations", element: <LazyRoute comp={InvitationsPage} /> },
      { path: "invitations/responses", element: <LazyRoute comp={ResponseOverviewPage} /> },
      { path: "invitations/new", element: <LazyRoute comp={NewInvitationPage} /> },
      { path: "invitations/design/new", element: <LazyRoute comp={NewDesignPage} /> },
      { path: "invitations/templates", element: <LazyRoute comp={TemplatesPage} /> },
      { path: "invitations/templates/new", element: <LazyRoute comp={NewTemplatePage} /> },
      { path: "invitations/templates/:templateId", element: <LazyRoute comp={TemplateDetailPage} /> },
      { path: "invitations/templates/:templateId/edit", element: <LazyRoute comp={EditTemplatePage} /> },
      { path: "invitations/:invitationId", element: <LazyRoute comp={InvitationDetailPage} /> },
      { path: "invitations/:invitationId/edit", element: <LazyRoute comp={EditInvitationPage} /> },
      { path: "invitations/:invitationId/access", element: <LazyRoute comp={InvitationAccessPage} /> },
      { path: "invitations/:invitationId/preview", element: <LazyRoute comp={InvitationPreviewPage} /> },

      // Planning tools
      { path: "updates", element: <LazyRoute comp={UpdatesPage} /> },
      { path: "travel", element: <LazyRoute comp={TravelPage} /> },
      { path: "tasks", element: <LazyRoute comp={TasksPage} /> },
      { path: "suppliers", element: <LazyRoute comp={SuppliersPage} /> },
      { path: "gallery-control", element: <LazyRoute comp={GalleryControlPage} /> },

      // Budget
      { path: "budget", element: <LazyRoute comp={BudgetPage} /> },
      { path: "budget/setup", element: <LazyRoute comp={BudgetSetupPage} /> },
      { path: "budget/categories", element: <LazyRoute comp={BudgetCategoriesPage} /> },
      { path: "budget/payments", element: <LazyRoute comp={BudgetPaymentsPage} /> },
      { path: "budget/suppliers", element: <LazyRoute comp={BudgetSuppliersPage} /> },
      { path: "budget/scenarios", element: <LazyRoute comp={BudgetScenariosPage} /> },
      { path: "budget/reports", element: <LazyRoute comp={BudgetReportsPage} /> },
      { path: "budget/settings", element: <LazyRoute comp={BudgetSettingsPage} /> },
      { path: "budget/gift-funding", element: <LazyRoute comp={GiftFundingSetupPage} /> },

      // Seating
      { path: "seating", element: <LazyRoute comp={SeatingPage} /> },
      { path: "seating/new", element: <LazyRoute comp={CreateSeatingPlanPage} /> },
      { path: "seating/plans", element: <LazyRoute comp={SeatingPlansPage} /> },
      { path: "seating/plans/:planId", element: <LazyRoute comp={SeatingPlanWorkspacePage} /> },
      { path: "seating/plans/:planId/settings", element: <LazyRoute comp={PlanSettingsPage} /> },
      { path: "seating/plans/:planId/versions", element: <LazyRoute comp={PlanVersionsPage} /> },
      { path: "seating/plans/:planId/groups", element: <LazyRoute comp={SeatingGroupsPage} /> },
      { path: "seating/plans/:planId/rules", element: <LazyRoute comp={SeatingRulesPage} /> },
      { path: "seating/plans/:planId/conflicts", element: <LazyRoute comp={SeatingConflictsPage} /> },
      { path: "seating/plans/:planId/assistant", element: <LazyRoute comp={SeatingAssistantPage} /> },
      { path: "seating/plans/:planId/assistant/:proposalId", element: <LazyRoute comp={ProposalReviewPage} /> },
      { path: "seating/plans/:planId/reports", element: <LazyRoute comp={SeatingReportsPage} /> },
      { path: "seating/plans/:planId/exports", element: <LazyRoute comp={SeatingExportsPage} /> },
      { path: "seating/plans/:planId/publish", element: <LazyRoute comp={SeatingPublishPage} /> },
      { path: "seating/plans/:planId/day-mode", element: <LazyRoute comp={DayModePage} /> },
      { path: "seating/plans/:planId/table-cards", element: <LazyRoute comp={TableCardsPage} /> },
      { path: "seating/plans/:planId/place-cards", element: <LazyRoute comp={PlaceCardsPage} /> },
      { path: "seating/plans/:planId/audit", element: <LazyRoute comp={SeatingAuditPage} /> },

      // Settings
      { path: "settings", element: <LazyRoute comp={SettingsPage} /> },
      { path: "styleboard", element: <LazyRoute comp={StyleboardPage} /> },
    ],
  },

  // 404
  { path: "*", element: <LazyRoute comp={NotFound} /> },
];

export default routes;