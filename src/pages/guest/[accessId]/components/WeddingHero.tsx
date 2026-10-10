import type { GuestPortalData } from '@/hooks/useGuestPortal';
import { Link } from 'react-router-dom';

interface WeddingHeroProps {
  data: GuestPortalData;
  basePath: string;
}

export default function WeddingHero({ data, basePath }: WeddingHeroProps) {
  const wedding = data.wedding;
  const recipients = data.recipients;
  const allNames = recipients.map((r) => r.guest_name);
  const greeting = data.invitation.informal_greeting || allNames.join(' & ');
  const dateDisplay = wedding.wedding_date
    ? new Date(wedding.wedding_date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  const firstVenue = data.events.find((e) => e.venue?.city)?.venue;
  const locationText = firstVenue
    ? [firstVenue.city, firstVenue.country].filter(Boolean).join(', ')
    : '';

  const settings = data.portal_settings || {};
  const showRsvp = settings.rsvp_enabled !== false;
  const showItinerary = settings.itinerary_enabled !== false;
  const hashtag = (wedding as unknown as Record<string, unknown>).hashtag as string | undefined;

  return (
    <section className="relative w-full overflow-hidden rounded-2xl" aria-label="Wedding hero banner">
      {/* Background image */}
      <div className="relative h-[320px] md:h-[420px] w-full">
        <img
          src="https://readdy.ai/api/search-image?query=Soft%20romantic%20floral%20wedding%20background%20with%20delicate%20blush%20pink%20roses%20and%20ivory%20peonies%20scattered%20across%20a%20cream%20canvas%2C%20subtle%20warm%20golden%20bokeh%20light%2C%20elegant%20and%20dreamy%20atmosphere%2C%20fine%20art%20wedding%20photography%20style%2C%20gentle%20organic%20composition%20with%20negative%20space%20for%20text%20overlay&width=1600&height=500&seq=wedora-hero-dashboard&orientation=landscape"
          alt=""
          className="w-full h-full object-cover object-top motion-safe:animate-fadeIn"
          onError={(e) => {
            // Graceful fallback on image load failure
            const el = e.currentTarget;
            el.style.display = 'none';
            const parent = el.parentElement;
            if (parent && !parent.querySelector('.hero-fallback')) {
              const fallback = document.createElement('div');
              fallback.className = 'hero-fallback absolute inset-0 bg-gradient-to-br from-primary-50 via-accent-50 to-primary-100';
              parent.appendChild(fallback);
            }
          }}
        />
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/15 to-black/40"></div>
      </div>

      {/* Content overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 md:px-10">
        <p className="text-white/80 text-xs md:text-sm font-label tracking-widest uppercase mb-3">
          {data.invitation.status === 'sent' ? 'You are invited to celebrate' : 'Celebrating'}
        </p>

        <h1 className="font-heading text-3xl md:text-5xl lg:text-6xl text-white mb-4 leading-tight">
          {wedding.partner_one_name}
          <span className="text-white/80 mx-2 md:mx-3 font-light">&amp;</span>
          {wedding.partner_two_name}
        </h1>

        {dateDisplay && (
          <p className="text-white/90 text-sm md:text-base font-label mb-2">
            <i className="ri-calendar-line mr-1.5 text-white/70" />
            {dateDisplay}
          </p>
        )}

        {locationText && (
          <p className="text-white/80 text-xs md:text-sm font-label">
            <i className="ri-map-pin-line mr-1.5 text-white/60" />
            {locationText}
          </p>
        )}

        {hashtag && (
          <p className="text-white/60 text-xs font-label mt-2 tracking-wide">{hashtag}</p>
        )}

        {/* Guest-specific welcome message */}
        {wedding.welcome_message && (
          <div className="mt-6 max-w-lg mx-auto">
            <p className="text-white/70 text-xs md:text-sm leading-relaxed italic font-heading text-base md:text-lg">
              &ldquo;{wedding.welcome_message}&rdquo;
            </p>
          </div>
        )}

        {/* Welcome greeting */}
        <div className="mt-6 inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/15 backdrop-blur-sm border border-white/20">
          <div className="w-6 h-6 flex items-center justify-center rounded-full bg-white/20 text-white">
            <i className="ri-user-smile-line text-xs" />
          </div>
          <span className="text-white text-sm font-label font-medium">
            Welcome{greeting ? `, ${greeting}` : ''}
          </span>
        </div>

        {/* Hero actions */}
        {(showItinerary || showRsvp) && (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {showItinerary && (
              <Link
                to={`${basePath}/itinerary`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/20 backdrop-blur-sm border border-white/30 text-white text-sm font-label font-medium hover:bg-white/30 transition-colors cursor-pointer whitespace-nowrap"
              >
                <i className="ri-calendar-event-line" /> View itinerary
              </Link>
            )}
            {showRsvp && (
              <Link
                to={`${basePath}/rsvp`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/25 backdrop-blur-sm border border-white/40 text-white text-sm font-label font-medium hover:bg-white/35 transition-colors cursor-pointer whitespace-nowrap"
              >
                <i className="ri-check-double-line" /> View RSVP
              </Link>
            )}
          </div>
        )}
      </div>
    </section>
  );
}