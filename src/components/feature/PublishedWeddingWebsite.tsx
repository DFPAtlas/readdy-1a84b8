import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import type { WebsiteConfig, WeddingPartyProfile } from "@/types/website";
import { usePublicSeoMetadata } from "@/hooks/usePublicSeoMetadata";
type Row = Record<string, string | null>;
type Published = {
  wedding: Row;
  config: WebsiteConfig;
  events: Row[];
  venues: Row[];
  faqs: Row[];
  places: Row[];
};
function safeLink(value: unknown): string | undefined {
  if (typeof value !== "string") return;
  try {
    const url = new URL(value, window.location.origin);
    if (
      url.protocol === "https:" ||
      (url.origin === window.location.origin && url.protocol === "http:")
    )
      return url.href;
  } catch {
    return;
  }
}
/**
 * Build the search text for a venue. Only the venue facts that are actually
 * visible to guests are used, so a hidden full address is never leaked through
 * the directions link or the embedded map.
 */
function venueLocationQuery(
  venue: Row,
  includeFullAddress: boolean,
): string | undefined {
  const parts = includeFullAddress
    ? [
        venue.name,
        venue.address_line_1,
        venue.city,
        venue.postcode,
        venue.country,
      ]
    : [venue.name];
  const query = parts
    .filter(
      (part): part is string =>
        typeof part === "string" && part.trim().length > 0,
    )
    .map((part) => part.trim())
    .join(", ");
  return query || undefined;
}
/** Google Maps "get directions" deep link for a venue. */
function venueDirectionsUrl(
  venue: Row,
  includeFullAddress: boolean,
): string | undefined {
  const query = venueLocationQuery(venue, includeFullAddress);
  if (!query) return undefined;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    query,
  )}`;
}
/** Google Maps embed (iframe) preview URL — works without an API key. */
function venueMapEmbedUrl(
  venue: Row,
  includeFullAddress: boolean,
): string | undefined {
  const query = venueLocationQuery(venue, includeFullAddress);
  if (!query) return undefined;
  return `https://www.google.com/maps?q=${encodeURIComponent(
    query,
  )}&output=embed`;
}
function Website({ data }: { data: Published }) {
  const { wedding, config, events, venues, faqs, places } = data;
  const sections = useMemo(
    () =>
      (config.sections_config || [])
        .filter((section) => section.visible)
        .sort((a, b) => a.sort_order - b.sort_order),
    [config.sections_config],
  );
  // Only mark up FAQs that are actually shown on the page (Google requires
  // structured-data content to be visible to users).
  const visibleFaqs = useMemo(
    () =>
      sections.some((section) => section.type === "faqs")
        ? faqs.map((faq) => ({
            question: faq.question,
            answer: faq.answer,
          }))
        : [],
    [sections, faqs],
  );
  // Venue location schema: only include venue facts that are visible to guests,
  // either in the dedicated venue section or listed against the schedule.
  const visibleVenues = useMemo(
    () =>
      sections.some((section) => section.type === "venue") ||
      sections.some(
        (section) =>
          section.type === "schedule" && section.config?.show_venues !== false,
      )
        ? venues.map((venue) => ({
            name: venue.name,
            addressLine1: venue.address_line_1,
            city: venue.city,
            postcode: venue.postcode,
            country: venue.country,
          }))
        : [],
    [sections, venues],
  );
  const venueAddressVisible = useMemo(
    () =>
      Boolean(
        sections.find((section) => section.type === "venue")?.config
          ?.show_full_address,
      ),
    [sections],
  );
  usePublicSeoMetadata({
    seo: config.seo_config,
    siteTitle: wedding.title || "",
    siteUrl: window.location.origin + "/w/" + wedding.slug,
    coupleNames: [wedding.partner_one_name, wedding.partner_two_name]
      .filter(Boolean)
      .join(" & "),
    weddingDate: wedding.wedding_date || undefined,
    location: wedding.location || undefined,
    // Published wedding websites are always discoverable so guests can find them via Google.
    searchIndexing: true,
    faqs: visibleFaqs,
    venues: visibleVenues,
    venueAddressVisible,
  });
  const date = wedding.wedding_date
    ? new Date(wedding.wedding_date + "T12:00:00").toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Date to be confirmed";
  const text = (value: unknown) => (typeof value === "string" ? value : "");
  const theme = config.theme_config;
  const style: CSSProperties = {
    backgroundColor: theme?.background_color,
    color: theme?.text_color,
    fontFamily: theme?.body_font,
  };
  return (
    <div className="min-h-screen" style={style}>
      <header className="border-b bg-white p-4">
        <div className="max-w-5xl mx-auto flex flex-wrap justify-between gap-4">
          <span className="font-heading text-xl">{wedding.title}</span>
          {config.navigation_config?.show_top_nav && (
            <nav className="flex flex-wrap gap-4" aria-label="Wedding website">
              {sections.map((section) => (
                <a key={section.id} className="text-sm" href={`#${section.id}`}>
                  {section.label}
                </a>
              ))}
            </nav>
          )}
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-5">
        {sections.map((section) => {
          const c = section.config || {};
          const image = safeLink(c.image_url);
          const button = safeLink(c.button_url || c.primary_button_dest);
          const isHero = section.type === "hero";
          const headingText =
            text(c.title || c.heading || c.public_heading) ||
            (isHero ? wedding.title : section.label);
          return (
            <section
              style={{ fontFamily: theme?.body_font }}
              key={section.id}
              id={section.id}
              className="py-12 border-b border-secondary-100 scroll-mt-6"
            >
              {isHero ? (
                <h1
                  style={{ fontFamily: theme?.heading_font }}
                  className="font-heading text-5xl text-center mb-5"
                >
                  {headingText}
                </h1>
              ) : (
                <h2
                  style={{ fontFamily: theme?.heading_font }}
                  className="font-heading text-3xl mb-5"
                >
                  {headingText}
                </h2>
              )}
              {section.type === "hero" && (
                <p className="text-center text-lg mb-5">
                  {text(c.subtitle) || date}{" "}
                  {wedding.location && ` · ${wedding.location}`}
                </p>
              )}
              {image && (
                <img
                  className="max-h-96 w-full object-cover rounded-xl mb-5"
                  src={image}
                  alt={headingText}
                />
              )}
              {text(c.introduction || c.body) && (
                <p className="whitespace-pre-wrap mb-5">
                  {text(c.introduction || c.body)}
                </p>
              )}
              {section.type === "wedding_party" && (
                <div className="grid md:grid-cols-3 gap-5">
                  {(Array.isArray(c.profiles)
                    ? (c.profiles as WeddingPartyProfile[])
                    : []
                  )
                    .filter((p) => p.visible)
                    .sort((a, b) => a.sort_order - b.sort_order)
                    .map((p) => (
                      <article key={p.id}>
                        {safeLink(p.photo_url) && (
                          <img
                            className="rounded-xl w-full h-56 object-cover mb-3"
                            src={safeLink(p.photo_url)}
                            alt={p.name}
                          />
                        )}
                        <h3 className="font-semibold">{p.name}</h3>
                        <p>{p.role}</p>
                        <p className="mt-2 whitespace-pre-wrap">{p.bio}</p>
                      </article>
                    ))}
                </div>
              )}
              {section.type === "dress_code" && <p>{wedding.dress_code}</p>}
              {section.type === "schedule" && (
                <ol className="space-y-4">
                  {events.map((event) => {
                    const eventVenue = venues.find(
                      (v) => v.id === event.venue_id,
                    );
                    const eventMapEmbed =
                      Boolean(c.show_venues) && eventVenue
                        ? venueMapEmbedUrl(eventVenue, venueAddressVisible)
                        : undefined;
                    const arrivalLead =
                      Number(event.arrival_offset_minutes) || 0;
                    const showArrival =
                      c.show_arrival_notes !== false &&
                      Boolean(event.arrival_notes || arrivalLead > 0);
                    const showParking =
                      c.show_parking_notes !== false &&
                      Boolean(event.parking_notes);
                    return (
                      <li key={event.id!} className="border rounded-xl p-4">
                        <h3 className="font-semibold">{event.name}</h3>
                        {c.show_times !== false && event.start_at && (
                          <p className="text-sm mt-2 flex items-center gap-2">
                            <span className="w-4 h-4 flex items-center justify-center">
                              <i className="ri-time-line" aria-hidden="true"></i>
                            </span>
                            {new Date(event.start_at).toLocaleString("en-GB", {
                              timeZone: wedding.timezone || "Europe/London",
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </p>
                        )}
                        {c.show_dress_code !== false &&
                          (event.dress_code || wedding.dress_code) && (
                            <p className="text-sm mt-2 flex items-center gap-2">
                              <span className="w-4 h-4 flex items-center justify-center">
                                <i className="ri-shirt-line" aria-hidden="true"></i>
                              </span>
                              {event.dress_code || wedding.dress_code}
                            </p>
                          )}
                        <p className="mt-2">{event.description}</p>
                        {Boolean(c.show_venues) && eventVenue?.name && (
                          <p className="text-sm mt-2">{eventVenue.name}</p>
                        )}
                        {showArrival && (
                          <p className="text-sm mt-2 flex items-start gap-2">
                            <span className="w-4 h-4 flex items-center justify-center mt-0.5">
                              <i className="ri-door-open-line" aria-hidden="true"></i>
                            </span>
                            <span>
                              {arrivalLead > 0 &&
                                `Please arrive ${arrivalLead} minutes before the start time. `}
                              {event.arrival_notes}
                            </span>
                          </p>
                        )}
                        {showParking && (
                          <p className="text-sm mt-2 flex items-start gap-2">
                            <span className="w-4 h-4 flex items-center justify-center mt-0.5">
                              <i className="ri-parking-box-line" aria-hidden="true"></i>
                            </span>
                            <span>{event.parking_notes}</span>
                          </p>
                        )}
                        {eventMapEmbed && (
                          <div className="mt-4 w-full h-56 rounded-lg overflow-hidden border border-secondary-100">
                            <iframe
                              className="w-full h-full border-0"
                              src={eventMapEmbed}
                              title={`Map showing ${eventVenue?.name}`}
                              loading="lazy"
                              referrerPolicy="no-referrer-when-downgrade"
                              allowFullScreen
                            ></iframe>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ol>
              )}
              {section.type === "venue" && (
                <div className="grid md:grid-cols-2 gap-4">
                  {venues.map((venue) => {
                    const showFullAddress = Boolean(c.show_full_address);
                    const directions = c.show_directions
                      ? venueDirectionsUrl(venue, showFullAddress)
                      : undefined;
                    const mapEmbed = c.show_map
                      ? venueMapEmbedUrl(venue, showFullAddress)
                      : undefined;
                    return (
                      <article
                        key={venue.id!}
                        className="border rounded-xl p-5"
                      >
                        <h3 className="font-semibold">{venue.name}</h3>
                        {showFullAddress && (
                          <p className="mt-2">
                            {[
                              venue.address_line_1,
                              venue.city,
                              venue.postcode,
                              venue.country,
                            ]
                              .filter(Boolean)
                              .join(", ")}
                          </p>
                        )}
                        {directions && (
                          <a
                            className="inline-flex items-center gap-2 mt-4 text-sm underline cursor-pointer"
                            href={directions}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <span className="w-4 h-4 flex items-center justify-center">
                              <i className="ri-map-pin-line" aria-hidden="true"></i>
                            </span>
                            Get directions
                          </a>
                        )}
                        {mapEmbed && (
                          <div className="mt-4 w-full h-56 rounded-lg overflow-hidden border border-secondary-100">
                            <iframe
                              className="w-full h-full border-0"
                              src={mapEmbed}
                              title={`Map showing ${venue.name}`}
                              loading="lazy"
                              referrerPolicy="no-referrer-when-downgrade"
                              allowFullScreen
                            ></iframe>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
              {["travel", "accommodation"].includes(section.type) && (
                <ul className="space-y-4">
                  {places.map((place) => (
                    <li key={place.id!}>
                      <h3 className="font-semibold">{place.name}</h3>
                      <p>{place.description}</p>
                      {safeLink(place.website) && (
                        <a
                          className="underline"
                          href={safeLink(place.website)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View website
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {section.type === "faqs" && (
                <div className="space-y-3">
                  {faqs.map((faq) => (
                    <details key={faq.id!} className="border rounded-xl p-4">
                      <summary className="cursor-pointer">
                        {faq.question}
                      </summary>
                      <p className="whitespace-pre-wrap mt-3">{faq.answer}</p>
                    </details>
                  ))}
                </div>
              )}
              {["rsvp", "gallery", "registry", "contact"].includes(
                section.type,
              ) && (
                <p>
                  Use the personalised link in your invitation to{" "}
                  {section.type === "rsvp"
                    ? "respond to your invitation"
                    : section.type === "gallery"
                      ? "view and share wedding photos"
                      : section.type === "registry"
                        ? "view the couple’s gift registry"
                        : "contact the wedding couple"}
                  .
                </p>
              )}
              {button && text(c.button_label || c.primary_button_label) && (
                <a className="inline-block underline mt-4" href={button}>
                  {text(c.button_label || c.primary_button_label)}
                </a>
              )}
            </section>
          );
        })}
      </main>
      <footer className="p-8 text-center text-sm">
        <Link to="/">Made with Vowora</Link>
      </footer>
    </div>
  );
}
export default function PublishedWeddingWebsite({
  slug,
}: {
  slug: string | undefined;
}) {
  const [data, setData] = useState<Published | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    setData(null);
    setLoading(true);
    if (!slug) {
      setLoading(false);
      return;
    }
    supabase
      .rpc("public_wedding_page", { p_slug: slug })
      .then(({ data, error }) => {
        if (!cancelled) {
          setData(error ? null : (data as Published | null));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);
  if (loading)
    return (
      <main
        className="min-h-screen flex items-center justify-center"
        role="status"
      >
        Loading wedding website…
      </main>
    );
  if (!data)
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8">
        <h1 className="font-heading text-3xl mb-4">
          Wedding website unavailable
        </h1>
        <p>
          This wedding website has not been published, or the link has changed.
        </p>
        <Link className="underline mt-5" to="/">
          Return to Vowora
        </Link>
      </main>
    );
  return <Website data={data} />;
}
