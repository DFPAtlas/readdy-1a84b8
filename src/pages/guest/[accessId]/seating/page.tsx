import { useParams, Link } from 'react-router-dom';
import { useGuestPortal } from '@/hooks/useGuestPortal';

function TableIllustration({ shape, colour, tableNumber }: { shape: string; colour: string | null; tableNumber: number | string | null }) {
  const fill = colour || '#e8d5d5';
  const label = tableNumber !== null && tableNumber !== undefined ? String(tableNumber) : '';

  if (shape === 'rectangle' || shape === 'rectangular') {
    return (
      <div className="relative w-48 h-32 mx-auto">
        <svg viewBox="0 0 192 128" className="w-full h-full" aria-label={`Table ${label} — rectangular table illustration`}>
          <rect x="8" y="8" width="176" height="112" rx="12" fill={fill} opacity="0.35" />
          <rect x="16" y="16" width="160" height="96" rx="8" fill={fill} opacity="0.55" />
          <rect x="24" y="24" width="144" height="80" rx="6" fill={fill} />
          {label && (
            <text x="96" y="72" textAnchor="middle" dominantBaseline="central" className="text-[22px] font-bold" fill="#5c3d3d" fontFamily="var(--font-heading, serif)">
              {label}
            </text>
          )}
        </svg>
      </div>
    );
  }

  if (shape === 'oval') {
    return (
      <div className="relative w-48 h-32 mx-auto">
        <svg viewBox="0 0 192 128" className="w-full h-full" aria-label={`Table ${label} — oval table illustration`}>
          <ellipse cx="96" cy="64" rx="88" ry="56" fill={fill} opacity="0.35" />
          <ellipse cx="96" cy="64" rx="80" ry="48" fill={fill} opacity="0.55" />
          <ellipse cx="96" cy="64" rx="72" ry="40" fill={fill} />
          {label && (
            <text x="96" y="72" textAnchor="middle" dominantBaseline="central" className="text-[22px] font-bold" fill="#5c3d3d" fontFamily="var(--font-heading, serif)">
              {label}
            </text>
          )}
        </svg>
      </div>
    );
  }

  // Default: round
  return (
    <div className="relative w-44 h-44 mx-auto">
      <svg viewBox="0 0 176 176" className="w-full h-full" aria-label={`Table ${label} — round table illustration`}>
        <circle cx="88" cy="88" r="80" fill={fill} opacity="0.25" />
        <circle cx="88" cy="88" r="72" fill={fill} opacity="0.45" />
        <circle cx="88" cy="88" r="64" fill={fill} />
        <circle cx="88" cy="88" r="60" fill="none" stroke="#ffffff" strokeWidth="2" strokeDasharray="8 4" opacity="0.3" />
        {label && (
          <text x="88" y="96" textAnchor="middle" dominantBaseline="central" className="text-[28px] font-bold" fill="#5c3d3d" fontFamily="var(--font-heading, serif)">
            {label}
          </text>
        )}
      </svg>
    </div>
  );
}

export default function GuestSeatingPage() {
  const { accessId } = useParams<{ accessId: string }>();
  const { data, loading, error } = useGuestPortal();
  const basePath = `/guest/${accessId}`;

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-10 h-10 flex items-center justify-center rounded-full bg-primary-50 text-primary-500">
          <i className="ri-loader-4-line animate-spin text-xl" />
        </div>
      </div>
    );
  }

  // ── Error ──
  if (error || !data) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-sm text-red-600">{error || 'Could not load your portal.'}</p>
      </div>
    );
  }

  const seating = data.seating;
  const wedding = data.wedding;

  // ── No seating data at all (no publication) ──
  if (!seating || !seating.publication) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 md:py-14">
        <div className="text-center mb-8">
          <h1 className="font-heading text-2xl md:text-3xl text-foreground-900 mb-2">Your seating</h1>
          <p className="text-sm text-foreground-500">Find your table for the wedding</p>
        </div>

        <div className="card-default text-center py-14">
          <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-secondary-100 text-secondary-400 mb-5">
            <i className="ri-user-location-line text-2xl" />
          </div>
          <h2 className="font-heading text-xl text-foreground-900 mb-3">Seating not yet available</h2>
          <p className="text-sm text-foreground-500 max-w-sm mx-auto leading-relaxed">
            The seating plan hasn&rsquo;t been published yet. Please check back closer to the wedding day &mdash; we&rsquo;ll have your table ready for you.
          </p>
        </div>

        <p className="text-center text-[11px] text-foreground-400 mt-6">
          Seating may change &mdash; please check again closer to the wedding day.
        </p>
      </div>
    );
  }

  // ── Emergency disabled ──
  if (seating.is_emergency_disabled) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 md:py-14">
        <div className="text-center mb-8">
          <h1 className="font-heading text-2xl md:text-3xl text-foreground-900 mb-2">Your seating</h1>
          <p className="text-sm text-foreground-500">Find your table for the wedding</p>
        </div>

        <div className="card-default text-center py-14">
          <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-accent-100 text-accent-500 mb-5">
            <i className="ri-error-warning-line text-2xl" />
          </div>
          <h2 className="font-heading text-xl text-foreground-900 mb-3">Seating temporarily unavailable</h2>
          <p className="text-sm text-foreground-500 max-w-sm mx-auto leading-relaxed">
            The seating plan is being updated. Please check back soon, or speak to a member of the wedding party on the day &mdash; they&rsquo;ll be happy to guide you to your table.
          </p>
        </div>

        <p className="text-center text-[11px] text-foreground-400 mt-6">
          Seating may change &mdash; please check again closer to the wedding day.
        </p>
      </div>
    );
  }

  // ── Before reveal date ──
  if (seating.is_before_reveal) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 md:py-14">
        <div className="text-center mb-8">
          <h1 className="font-heading text-2xl md:text-3xl text-foreground-900 mb-2">Your seating</h1>
          <p className="text-sm text-foreground-500">Find your table for the wedding</p>
        </div>

        <div className="card-default text-center py-14">
          <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-secondary-100 text-secondary-400 mb-5">
            <i className="ri-time-line text-2xl" />
          </div>
          <h2 className="font-heading text-xl text-foreground-900 mb-3">Seating coming soon</h2>
          <p className="text-sm text-foreground-500 max-w-sm mx-auto leading-relaxed">
            Your table details will be available closer to the wedding. We&rsquo;re putting the finishing touches on the seating plan &mdash; please check back soon.
          </p>
        </div>

        <p className="text-center text-[11px] text-foreground-400 mt-6">
          Seating may change &mdash; please check again closer to the wedding day.
        </p>
      </div>
    );
  }

  // ── Published but guest not assigned ──
  if (!seating.table) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 md:py-14">
        <div className="text-center mb-8">
          <h1 className="font-heading text-2xl md:text-3xl text-foreground-900 mb-2">Your seating</h1>
          <p className="text-sm text-foreground-500">Find your table for the wedding</p>
        </div>

        <div className="card-default text-center py-14">
          <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-accent-100 text-accent-500 mb-5">
            <i className="ri-user-search-line text-2xl" />
          </div>
          <h2 className="font-heading text-xl text-foreground-900 mb-3">We&rsquo;re working on your seat</h2>
          <p className="text-sm text-foreground-500 max-w-sm mx-auto leading-relaxed">
            The seating plan has been published, but your table assignment isn&rsquo;t quite ready yet. Please check back soon, or ask a member of the wedding party on the day.
          </p>
        </div>

        <p className="text-center text-[11px] text-foreground-400 mt-6">
          Seating may change &mdash; please check again closer to the wedding day.
        </p>
      </div>
    );
  }

  // ── Full seating card ──
  const table = seating.table;
  const seat = seating.seat;
  const companions = seating.companions || [];
  const lookup = seating.lookup_settings;
  const showCompanions = lookup.reveal_companions === true && lookup.companion_name_format !== 'hidden';
  const companionFormat = lookup.companion_name_format || 'full_names';
  const showSeatNumbers = lookup.show_seat_numbers !== false;
  const tableLabel = table.table_number ? `Table ${table.table_number}` : table.name;
  const displayName = table.table_number ? table.name : null;
  const hasMap = lookup.show_room_map !== false && seating.map_data;
  const hasUpdates = seating.updated_at && seating.publication;

  function formatCompanionName(companion: { full_name: string; preferred_name: string | null; display_name?: string }): string {
    if (companion.display_name) return companion.display_name;
    switch (companionFormat) {
      case 'first_names_only':
        return companion.preferred_name || companion.full_name.split(' ')[0] || companion.full_name;
      case 'preferred_names':
        return companion.preferred_name || companion.full_name;
      case 'full_names':
      default:
        return companion.full_name;
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 md:py-14">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="font-heading text-2xl md:text-3xl text-foreground-900 mb-2">Your seating</h1>
        <p className="text-sm text-foreground-500">
          We&rsquo;ve saved you a seat
        </p>
        {/* Updated badge */}
        {hasUpdates && (
          <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-accent-50 border border-accent-200 text-xs text-foreground-600 font-label">
            <div className="w-3.5 h-3.5 flex items-center justify-center text-accent-500">
              <i className="ri-refresh-line text-xs" />
            </div>
            Updated {new Date(seating.updated_at!).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        )}
      </div>

      {/* Table illustration card */}
      <div className="card-default overflow-hidden">
        {/* Illustration area */}
        <div className="bg-gradient-to-b from-accent-50/60 to-background-50 py-10 px-4">
          <TableIllustration
            shape={table.shape}
            colour={table.colour}
            tableNumber={table.table_number}
          />
        </div>

        {/* Table info */}
        <div className="px-6 py-6 text-center">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground-900 mb-1">
            {tableLabel}
          </h2>
          {displayName && (
            <p className="text-sm text-foreground-500 mb-4 italic">{displayName}</p>
          )}

          {/* Seat label pill */}
          {seat && showSeatNumbers && seat.seat_label && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent-50 border border-accent-200 mt-2">
              <div className="w-4 h-4 flex items-center justify-center text-accent-500">
                <i className="ri-map-pin-line text-xs" />
              </div>
              <span className="text-sm font-label font-medium text-foreground-700">
                Seat {seat.seat_label}
              </span>
            </div>
          )}

          {/* Zone */}
          {seating.zone && (
            <p className="text-xs text-foreground-500 mt-3">
              <i className="ri-compass-3-line mr-1 text-foreground-400" />{seating.zone}
            </p>
          )}

          {/* Table capacity hint */}
          <p className="text-xs text-foreground-400 mt-3">
            {table.shape === 'round' || table.shape === 'oval'
              ? `A ${table.shape} table seating up to ${table.capacity} guests`
              : `A ${table.shape} table seating up to ${table.capacity} guests`}
          </p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
        {hasMap && (
          <Link
            to={`${basePath}/seating/map`}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-700 hover:bg-background-50 transition-colors cursor-pointer whitespace-nowrap"
          >
            <i className="ri-map-2-line" /> View room map
          </Link>
        )}
        <Link
          to={`${basePath}/seating/table`}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
        >
          <i className="ri-group-line" /> View table details
        </Link>
      </div>

      {/* Companions section */}
      <div className="card-default mt-5 px-6 py-5">
        <h3 className="font-label text-xs font-semibold text-foreground-400 uppercase tracking-wide mb-4 flex items-center gap-2">
          <div className="w-4 h-4 flex items-center justify-center">
            <i className="ri-group-line text-sm" />
          </div>
          Also at your table
        </h3>
        {!showCompanions ? (
          <p className="text-sm text-foreground-500 italic">
            The couple has chosen to keep the full table list private.
          </p>
        ) : companions.length === 0 ? (
          <p className="text-sm text-foreground-500 italic">
            You&rsquo;re the first to be seated at this table.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {companions.map((companion, i) => (
                <span
                  key={i}
                  className="px-3 py-1.5 rounded-full bg-background-50 border border-secondary-200 text-sm text-foreground-700 font-label"
                >
                  {formatCompanionName(companion)}
                </span>
              ))}
            </div>
            <p className="text-[11px] text-foreground-400 mt-4 leading-relaxed">
              These are the guests seated with you. We hope you enjoy their company &mdash; it&rsquo;s a wonderful group.
            </p>
          </>
        )}
      </div>

      {/* Wedding-day note */}
      {seating.wedding_day_note && (
        <div className="card-default mt-5 px-6 py-5">
          <h3 className="font-label text-xs font-semibold text-foreground-400 uppercase tracking-wide mb-3 flex items-center gap-2">
            <div className="w-4 h-4 flex items-center justify-center">
              <i className="ri-information-line text-sm" />
            </div>
            A note from the couple
          </h3>
          <p className="text-sm text-foreground-600 leading-relaxed whitespace-pre-line">
            {seating.wedding_day_note}
          </p>
        </div>
      )}

      {/* Directions text alternative */}
      <div className="card-default mt-5 px-6 py-5">
        <h3 className="font-label text-xs font-semibold text-foreground-400 uppercase tracking-wide mb-3 flex items-center gap-2">
          <div className="w-4 h-4 flex items-center justify-center">
            <i className="ri-compass-3-line text-sm" />
          </div>
          Finding your table
        </h3>
        <p className="text-sm text-foreground-600 leading-relaxed">
          When you arrive at the venue, a member of the wedding party or front-of-house staff will be available to guide you to your table. A printed seating chart will also be displayed near the entrance.
        </p>
        <p className="text-sm text-foreground-500 leading-relaxed mt-3">
          If you need any assistance on the day, please speak to the venue staff or a member of the wedding party &mdash; they&rsquo;ll be delighted to help.
        </p>
      </div>

      {/* Footer warning */}
      <div className="mt-8 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent-50 border border-accent-200">
          <div className="w-4 h-4 flex items-center justify-center text-accent-500">
            <i className="ri-information-line text-xs" />
          </div>
          <p className="text-xs text-foreground-600 font-label">
            Seating may change &mdash; please check again closer to the wedding day
          </p>
        </div>
      </div>
    </div>
  );
}