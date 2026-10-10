import type * as React from "react";
import { useGuestPortal } from '@/hooks/useGuestPortal';
import { useParams, Link } from 'react-router-dom';
import WeddingHero from './components/WeddingHero';
import QuickCards from './components/QuickCards';
import {
  ItineraryPreview,
  RsvpPreview,
  AccommodationPreview,
  GettingTherePreview,
  LocationPreview,
  ThingsToDoPreview,
  RegistryPreview,
  GiftFundPreview,
  GalleryPreview,
  LatestUpdatePreview,
  SeatingPreview,
  QuestionsPreview,
  ContactsPreview,
  NextAction,
} from './components/DashboardPreviews';

function daysUntil(dateStr: string) {
  const target = new Date(dateStr);
  const now = new Date();
  return Math.max(0, Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}

// ── CARD HEADER ──

function CardHeader({ icon, iconBg, title, badge }: {
  icon: string;
  iconBg: string;
  title: string;
  badge?: string;
}) {
  return (
    <div className="flex items-start justify-between mb-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-lg flex-shrink-0 ${iconBg}`}>
          <i className={`${icon} text-sm md:text-base`} />
        </div>
        <h3 className="font-label text-sm md:text-base font-semibold text-foreground-900 truncate">
          {title}
        </h3>
      </div>
      {badge && (
        <span className="flex-shrink-0 px-2 py-0.5 rounded-full bg-accent-100 text-accent-700 text-[11px] font-label font-medium ml-2">
          {badge}
        </span>
      )}
    </div>
  );
}

// ── CARD WRAPPER ──

function PreviewCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white border border-secondary-100 rounded-xl p-5 md:p-6 flex flex-col transition-colors hover:border-secondary-200 ${className}`}>
      {children}
    </div>
  );
}

// ── PAGE ──

export default function GuestHomePage() {
  const { accessId } = useParams();
  const { data, loading, error } = useGuestPortal();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-primary-50 text-primary-500 mb-4">
            <i className="ri-loader-4-line animate-spin text-2xl" />
          </div>
          <p className="text-sm text-foreground-500">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="w-14 h-14 mx-auto flex items-center justify-center rounded-full bg-secondary-100 text-secondary-400 mb-4">
          <i className="ri-error-warning-line text-2xl" />
        </div>
        <p className="text-sm text-foreground-600">{error || 'Could not load your portal.'}</p>
      </div>
    );
  }

  const basePath = `/guest/${accessId}`;
  const settings = data.portal_settings || {};
  const wedding = data.wedding;

  // Visibility flags
  const showItinerary = settings.itinerary_enabled !== false;
  const showRsvp = settings.rsvp_enabled !== false;
  const showTravel = settings.show_travel !== false;
  const showLocation = settings.show_location !== false;
  const showRegistry = settings.show_registry !== false;
  const showGallery = settings.show_gallery !== false;
  const showUpdates = settings.show_updates !== false;
  const showSeating = settings.seating_enabled !== false;
  const showQuestions = settings.show_questions !== false;
  const showContacts = settings.show_contacts !== false;

  const hasAnyOptionalVisible = showTravel || showLocation || showRegistry || showGallery || showUpdates || showSeating || showQuestions || showContacts;

  return (
    <div>
      {/* Skip to content */}
      <a
        href="#dashboard-main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary-500 focus:text-white focus:rounded-lg focus:text-sm focus:font-label"
      >
        Skip to main content
      </a>

      {/* Hero Banner */}
      <WeddingHero data={data} basePath={basePath} />

      <div id="dashboard-main" className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-10 space-y-8">
        {/* Quick Information Cards */}
        <QuickCards data={data} />

        {/* Next Action + Invitation Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Next Action (priority-based) */}
          <NextAction data={data} basePath={basePath} />

          {/* Invitation status */}
          <div className="bg-white border border-secondary-100 rounded-xl p-5 md:p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                <i className="ri-mail-open-line text-sm" />
              </div>
              <div>
                <h2 className="font-label text-sm font-semibold text-foreground-900">Your Invitation</h2>
                <p className="text-xs text-foreground-500">
                  Status:{' '}
                  <span className="text-accent-600 font-medium capitalize">{data.invitation.status}</span>
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              {data.recipients.map((r, i) => (
                <span key={i} className="px-3 py-1.5 rounded-full bg-background-50 border border-secondary-200 text-xs text-foreground-700 font-label">
                  {r.guest_name}
                </span>
              ))}
            </div>
            {data.invitation.rsvp_deadline && (
              <p className="text-xs text-foreground-500">
                Please respond by{' '}
                <strong className="text-foreground-700">
                  {new Date(data.invitation.rsvp_deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </strong>
              </p>
            )}
          </div>
        </div>

        {/* Itinerary — always prominent, spans full width when enabled */}
        {showItinerary && (
          <PreviewCard className="md:col-span-full">
            <CardHeader
              icon="ri-calendar-event-line"
              iconBg="bg-primary-50 text-primary-600"
              title="Wedding Itinerary"
              badge={data.events.filter((e) => e.start_at && new Date(e.start_at) > new Date()).length > 0
                ? `${data.events.filter((e) => e.start_at && new Date(e.start_at) > new Date()).length} upcoming`
                : undefined}
            />
            <ItineraryPreview events={data.events} basePath={basePath} isEnabled={showItinerary} />
          </PreviewCard>
        )}

        {/* Main card grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* RSVP — always shown if enabled */}
          {showRsvp && (
            <PreviewCard>
              <CardHeader
                icon="ri-check-double-line"
                iconBg="bg-accent-50 text-accent-600"
                title="RSVP &amp; Details"
                badge={(() => {
                  const r = data.rsvp_responses?.[data.recipients[0]?.guest_id];
                  if (r?.submitted_at && !r.is_draft) {
                    return r.response_status === 'attending' ? 'Attending' : r.response_status === 'not_attending' ? 'Declined' : 'Responded';
                  }
                  return undefined;
                })()}
              />
              <RsvpPreview data={data} basePath={basePath} />
            </PreviewCard>
          )}

          {/* Accommodation */}
          {showTravel && (
            <PreviewCard>
              <CardHeader
                icon="ri-hotel-line"
                iconBg="bg-secondary-100 text-secondary-600"
                title="Accommodation"
              />
              <AccommodationPreview plans={data.accommodationPlans} localPlaces={data.localPlaces} travelPlans={data.travelPlans} basePath={basePath} />
            </PreviewCard>
          )}

          {/* Getting There */}
          {showTravel && (
            <PreviewCard>
              <CardHeader
                icon="ri-road-map-line"
                iconBg="bg-primary-50 text-primary-500"
                title="Getting There"
              />
              <GettingTherePreview
                parkingNotes={wedding.parking_notes}
                venues={data.events}
                basePath={basePath}
              />
            </PreviewCard>
          )}

          {/* Wedding Location */}
          {showLocation && (
            <PreviewCard>
              <CardHeader
                icon="ri-building-line"
                iconBg="bg-secondary-100 text-secondary-700"
                title="Wedding Location"
              />
              <LocationPreview venues={data.events} basePath={basePath} showLocation={showLocation} />
            </PreviewCard>
          )}

          {/* Things To Do */}
          {showTravel && (
            <PreviewCard>
              <CardHeader
                icon="ri-compass-3-line"
                iconBg="bg-accent-50 text-accent-500"
                title="Things To Do"
              />
              <ThingsToDoPreview localPlaces={data.localPlaces} basePath={basePath} />
            </PreviewCard>
          )}

          {/* Gift Registry */}
          {showRegistry && (
            <PreviewCard>
              <CardHeader
                icon="ri-gift-line"
                iconBg="bg-primary-50 text-primary-600"
                title="Gift Registry"
                badge={data.registry?.registries.flatMap(r => r.items).length ? `${data.registry.registries.flatMap(r => r.items).length} gift${data.registry.registries.flatMap(r => r.items).length !== 1 ? 's' : ''}` : undefined}
              />
              <RegistryPreview data={data} basePath={basePath} />
            </PreviewCard>
          )}

          {/* Gift Fund */}
          {showRegistry && (
            <PreviewCard>
              <CardHeader
                icon="ri-heart-line"
                iconBg="bg-accent-50 text-accent-600"
                title="Gift Fund"
                badge={data.giftFunds?.funds?.length ? `${data.giftFunds.funds.length} fund${data.giftFunds.funds.length !== 1 ? 's' : ''}` : undefined}
              />
              <GiftFundPreview data={data} basePath={basePath} />
            </PreviewCard>
          )}

          {/* Gallery */}
          {showGallery && (
            <PreviewCard>
              <CardHeader
                icon="ri-camera-line"
                iconBg="bg-accent-50 text-accent-600"
                title="Wedding Gallery"
                badge={data.gallery?.total_assets ? `${data.gallery.total_assets} photo${data.gallery.total_assets !== 1 ? 's' : ''}` : undefined}
              />
              <GalleryPreview data={data} basePath={basePath} />
            </PreviewCard>
          )}

          {/* Latest Update */}
          {showUpdates && (
            <PreviewCard>
              <CardHeader
                icon="ri-notification-3-line"
                iconBg="bg-secondary-100 text-secondary-700"
                title="Latest Update"
                badge={data.updates?.unread_count ? `${data.updates.unread_count} new` : undefined}
              />
              <LatestUpdatePreview data={data} basePath={basePath} />
            </PreviewCard>
          )}

          {/* Seating */}
          {showSeating && (
            <PreviewCard>
              <CardHeader
                icon="ri-user-location-line"
                iconBg="bg-primary-50 text-primary-500"
                title="Seating"
                badge={data.seating?.table?.name || undefined}
              />
              <SeatingPreview data={data} basePath={basePath} />
            </PreviewCard>
          )}

          {/* Questions */}
          {showQuestions && (
            <PreviewCard>
              <CardHeader
                icon="ri-question-line"
                iconBg="bg-accent-50 text-accent-500"
                title="Questions"
                badge={data.questions?.total_faqs ? `${data.questions.total_faqs} FAQ${data.questions.total_faqs !== 1 ? 's' : ''}` : undefined}
              />
              <QuestionsPreview data={data} basePath={basePath} />
            </PreviewCard>
          )}

          {/* Contacts */}
          {showContacts && (
            <PreviewCard>
              <CardHeader
                icon="ri-contacts-line"
                iconBg="bg-secondary-100 text-secondary-600"
                title="Important Contacts"
                badge={data.contacts?.total ? `${data.contacts.total} contact${data.contacts.total !== 1 ? 's' : ''}` : undefined}
              />
              <ContactsPreview data={data} basePath={basePath} />
            </PreviewCard>
          )}
        </div>

        {/* Empty fallback when all optional sections are hidden */}
        {!hasAnyOptionalVisible && !showItinerary && (
          <div className="bg-white border border-secondary-100 rounded-xl p-8 text-center">
            <div className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-secondary-100 text-foreground-300 mb-3">
              <i className="ri-information-line text-xl" />
            </div>
            <p className="text-sm text-foreground-500">
              The couple are still preparing their wedding details. Check back soon for more information.
            </p>
          </div>
        )}

        {/* Important information */}
        <div className="bg-white border border-secondary-100 rounded-xl p-5 md:p-6">
          <h2 className="font-label text-sm font-semibold text-foreground-900 mb-4 flex items-center gap-2">
            <i className="ri-information-line text-foreground-500" /> Important Information
          </h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {wedding.dress_code && (
              <div>
                <dt className="text-xs text-foreground-500 font-label">Dress code</dt>
                <dd className="text-sm text-foreground-700 mt-0.5">{wedding.dress_code}</dd>
              </div>
            )}
            {wedding.parking_notes && (
              <div>
                <dt className="text-xs text-foreground-500 font-label">Parking</dt>
                <dd className="text-sm text-foreground-700 mt-0.5">{wedding.parking_notes}</dd>
              </div>
            )}
            {wedding.children_policy && (
              <div>
                <dt className="text-xs text-foreground-500 font-label">Children</dt>
                <dd className="text-sm text-foreground-700 mt-0.5">{wedding.children_policy}</dd>
              </div>
            )}
            {wedding.plus_one_policy && (
              <div>
                <dt className="text-xs text-foreground-500 font-label">Plus-ones</dt>
                <dd className="text-sm text-foreground-700 mt-0.5">{wedding.plus_one_policy}</dd>
              </div>
            )}
            {wedding.accessibility_notes && (
              <div>
                <dt className="text-xs text-foreground-500 font-label">Accessibility</dt>
                <dd className="text-sm text-foreground-700 mt-0.5">{wedding.accessibility_notes}</dd>
              </div>
            )}
          </dl>
          {!wedding.dress_code && !wedding.parking_notes && !wedding.children_policy && !wedding.plus_one_policy && !wedding.accessibility_notes && (
            <p className="text-xs text-foreground-400 italic text-center py-4">
              Additional information from the couple will appear here as the wedding approaches.
            </p>
          )}
        </div>

        {/* Contact the couple */}
        {settings.show_contact_details && wedding.contact_information && (
          <div className="bg-white border border-secondary-100 rounded-xl p-5 md:p-6">
            <h2 className="font-label text-sm font-semibold text-foreground-900 mb-3 flex items-center gap-2">
              <i className="ri-chat-1-line text-foreground-500" /> Contact the Couple
            </h2>
            <p className="text-sm text-foreground-600">{wedding.contact_information}</p>
          </div>
        )}
      </div>
    </div>
  );
}