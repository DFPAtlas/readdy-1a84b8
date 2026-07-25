import { Link, useNavigate } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import { useGuestPortal } from '@/hooks/useGuestPortal';
import type { SeatingLookupSettings } from '@/types/access';

// ── Table Illustration (same as seating page) ──

function TableIllustration({ shape, colour, tableNumber, seatLabel, showSeat, highlightedSeat }: {
  shape: string;
  colour: string | null;
  tableNumber: number | string | null;
  seatLabel?: string | null;
  showSeat?: boolean;
  highlightedSeat?: boolean;
}) {
  const fill = colour || '#e8d5d5';
  const label = tableNumber !== null && tableNumber !== undefined ? String(tableNumber) : '';
  const showHighlight = showSeat && highlightedSeat && seatLabel;

  if (shape === 'rectangle' || shape === 'rectangular') {
    return (
      <div className="relative w-56 h-40 mx-auto">
        <svg viewBox="0 0 224 160" className="w-full h-full" aria-label={`Table ${label} — rectangular table illustration`}>
          <rect x="8" y="8" width="208" height="144" rx="14" fill={fill} opacity="0.25" />
          <rect x="16" y="16" width="192" height="128" rx="10" fill={fill} opacity="0.45" />
          <rect x="24" y="24" width="176" height="112" rx="8" fill={fill} />
          {label && (
            <text x="112" y="88" textAnchor="middle" dominantBaseline="central" className="text-[28px] font-bold" fill="#5c3d3d" fontFamily="var(--font-heading, serif)">
              {label}
            </text>
          )}
          {/* Seat markers along top edge */}
          {showSeat && (
            <>
              <circle cx="56" cy="16" r="5" fill={showHighlight && seatLabel === '1' ? '#c4a07a' : '#e8d5d5'} stroke="#d4b896" strokeWidth="1" />
              <circle cx="112" cy="16" r="5" fill={showHighlight && seatLabel === '2' ? '#c4a07a' : '#e8d5d5'} stroke="#d4b896" strokeWidth="1" />
              <circle cx="168" cy="16" r="5" fill={showHighlight && seatLabel === '3' ? '#c4a07a' : '#e8d5d5'} stroke="#d4b896" strokeWidth="1" />
              <circle cx="56" cy="144" r="5" fill={showHighlight && seatLabel === '4' ? '#c4a07a' : '#e8d5d5'} stroke="#d4b896" strokeWidth="1" />
              <circle cx="112" cy="144" r="5" fill={showHighlight && seatLabel === '5' ? '#c4a07a' : '#e8d5d5'} stroke="#d4b896" strokeWidth="1" />
              <circle cx="168" cy="144" r="5" fill={showHighlight && seatLabel === '6' ? '#c4a07a' : '#e8d5d5'} stroke="#d4b896" strokeWidth="1" />
              <circle cx="24" cy="64" r="5" fill={showHighlight && seatLabel === '7' ? '#c4a07a' : '#e8d5d5'} stroke="#d4b896" strokeWidth="1" />
              <circle cx="24" cy="96" r="5" fill={showHighlight && seatLabel === '8' ? '#c4a07a' : '#e8d5d5'} stroke="#d4b896" strokeWidth="1" />
              <circle cx="200" cy="64" r="5" fill={showHighlight && seatLabel === '9' ? '#c4a07a' : '#e8d5d5'} stroke="#d4b896" strokeWidth="1" />
              <circle cx="200" cy="96" r="5" fill={showHighlight && seatLabel === '10' ? '#c4a07a' : '#e8d5d5'} stroke="#d4b896" strokeWidth="1" />
            </>
          )}
        </svg>
      </div>
    );
  }

  if (shape === 'oval') {
    return (
      <div className="relative w-48 h-32 mx-auto">
        <svg viewBox="0 0 192 128" className="w-full h-full" aria-label={`Table ${label} — oval table illustration`}>
          <ellipse cx="96" cy="64" rx="88" ry="56" fill={fill} opacity="0.25" />
          <ellipse cx="96" cy="64" rx="80" ry="48" fill={fill} opacity="0.45" />
          <ellipse cx="96" cy="64" rx="72" ry="40" fill={fill} />
          {label && (
            <text x="96" y="72" textAnchor="middle" dominantBaseline="central" className="text-[22px] font-bold" fill="#5c3d3d" fontFamily="var(--font-heading, serif)">
              {label}
            </text>
          )}
          {showSeat && (
            <>
              <circle cx="96" cy="16" r="4" fill={showHighlight && seatLabel === '1' ? '#c4a07a' : '#e8d5d5'} stroke="#d4b896" strokeWidth="1" />
              <circle cx="96" cy="112" r="4" fill={showHighlight && seatLabel === '2' ? '#c4a07a' : '#e8d5d5'} stroke="#d4b896" strokeWidth="1" />
              <circle cx="164" cy="64" r="4" fill={showHighlight && seatLabel === '3' ? '#c4a07a' : '#e8d5d5'} stroke="#d4b896" strokeWidth="1" />
              <circle cx="28" cy="64" r="4" fill={showHighlight && seatLabel === '4' ? '#c4a07a' : '#e8d5d5'} stroke="#d4b896" strokeWidth="1" />
            </>
          )}
        </svg>
      </div>
    );
  }

  // Round
  return (
    <div className="relative w-48 h-48 mx-auto">
      <svg viewBox="0 0 192 192" className="w-full h-full" aria-label={`Table ${label} — round table illustration`}>
        <circle cx="96" cy="96" r="88" fill={fill} opacity="0.2" />
        <circle cx="96" cy="96" r="80" fill={fill} opacity="0.4" />
        <circle cx="96" cy="96" r="72" fill={fill} />
        <circle cx="96" cy="96" r="68" fill="none" stroke="#ffffff" strokeWidth="2" strokeDasharray="8 4" opacity="0.25" />
        {label && (
          <text x="96" y="104" textAnchor="middle" dominantBaseline="central" className="text-[32px] font-bold" fill="#5c3d3d" fontFamily="var(--font-heading, serif)">
            {label}
          </text>
        )}
        {showSeat && (
          <>
            <circle cx="96" cy="20" r="5" fill={showHighlight && (seatLabel === '1' || seatLabel === 'A') ? '#c4a07a' : '#e8d5d5'} stroke="#d4b896" strokeWidth="1" />
            <circle cx="148" cy="36" r="5" fill={showHighlight && (seatLabel === '2' || seatLabel === 'B') ? '#c4a07a' : '#e8d5d5'} stroke="#d4b896" strokeWidth="1" />
            <circle cx="172" cy="96" r="5" fill={showHighlight && (seatLabel === '3' || seatLabel === 'C') ? '#c4a07a' : '#e8d5d5'} stroke="#d4b896" strokeWidth="1" />
            <circle cx="148" cy="156" r="5" fill={showHighlight && (seatLabel === '4' || seatLabel === 'D') ? '#c4a07a' : '#e8d5d5'} stroke="#d4b896" strokeWidth="1" />
            <circle cx="96" cy="172" r="5" fill={showHighlight && (seatLabel === '5' || seatLabel === 'E') ? '#c4a07a' : '#e8d5d5'} stroke="#d4b896" strokeWidth="1" />
            <circle cx="44" cy="156" r="5" fill={showHighlight && (seatLabel === '6' || seatLabel === 'F') ? '#c4a07a' : '#e8d5d5'} stroke="#d4b896" strokeWidth="1" />
            <circle cx="20" cy="96" r="5" fill={showHighlight && (seatLabel === '7' || seatLabel === 'G') ? '#c4a07a' : '#e8d5d5'} stroke="#d4b896" strokeWidth="1" />
            <circle cx="44" cy="36" r="5" fill={showHighlight && (seatLabel === '8' || seatLabel === 'H') ? '#c4a07a' : '#e8d5d5'} stroke="#d4b896" strokeWidth="1" />
          </>
        )}
      </svg>
    </div>
  );
}

// ── Format name based on companion_name_format setting ──

function formatCompanionName(companion: { full_name: string; preferred_name: string | null; display_name?: string }, format: string): string {
  if (companion.display_name) return companion.display_name;
  switch (format) {
    case 'first_names_only':
      return companion.preferred_name || companion.full_name.split(' ')[0] || companion.full_name;
    case 'preferred_names':
      return companion.preferred_name || companion.full_name;
    case 'full_names':
    default:
      return companion.full_name;
  }
}

export default function GuestSeatingTablePage() {
  const { accessId } = useParams<{ accessId: string }>();
  const { data, loading, error } = useGuestPortal();
  const basePath = `/guest/${accessId}`;

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-10 h-10 flex items-center justify-center rounded-full bg-primary-50 text-primary-500">
          <i className="ri-loader-4-line animate-spin text-xl" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-sm text-red-600">{error || 'Could not load seating details.'}</p>
      </div>
    );
  }

  const seating = data.seating;

  if (!seating || !seating.table) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="w-14 h-14 mx-auto flex items-center justify-center rounded-full bg-secondary-100 text-secondary-400 mb-4">
          <i className="ri-user-location-line text-2xl" />
        </div>
        <h2 className="font-heading text-lg text-foreground-900 mb-2">Table details not available</h2>
        <p className="text-sm text-foreground-500 mb-4">Your seating assignment hasn&rsquo;t been published yet.</p>
        <Link to={`${basePath}/seating`} className="inline-flex items-center gap-1.5 text-xs font-label text-primary-600 hover:text-primary-700 cursor-pointer whitespace-nowrap">
          <i className="ri-arrow-left-line" /> Back to seating
        </Link>
      </div>
    );
  }

  const table = seating.table;
  const seat = seating.seat;
  const companions = seating.companions || [];
  const lookup = seating.lookup_settings;
  const showSeatNumbers = lookup.show_seat_numbers !== false;
  const showCompanions = lookup.reveal_companions === true && lookup.companion_name_format !== 'hidden';
  const companionFormat = lookup.companion_name_format || 'full_names';
  const showCompanionSeatLabels = lookup.show_companion_seat_labels === true;
  const tableLabel = table.table_number ? `Table ${table.table_number}` : table.name;
  const displayName = table.table_number ? table.name : null;
  const hasMap = lookup.show_room_map !== false && seating.map_data;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
      {/* Back link */}
      <Link to={`${basePath}/seating`} className="inline-flex items-center gap-1.5 text-sm text-foreground-500 hover:text-foreground-700 cursor-pointer whitespace-nowrap mb-6">
        <i className="ri-arrow-left-line" /> Back to seating
      </Link>

      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="font-heading text-2xl md:text-3xl text-foreground-900 mb-2">Your table</h1>
        <p className="text-sm text-foreground-500">Everything you need to know about where you&rsquo;ll be sitting</p>
      </div>

      {/* Table illustration */}
      <div className="card-default overflow-hidden mb-6">
        <div className="bg-gradient-to-b from-accent-50/60 to-background-50 py-10 px-4">
          <TableIllustration
            shape={table.shape}
            colour={table.colour}
            tableNumber={table.table_number}
            seatLabel={seat?.seat_label || null}
            showSeat={showSeatNumbers}
            highlightedSeat={true}
          />
        </div>

        <div className="px-6 py-6 text-center">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground-900 mb-1">{tableLabel}</h2>
          {displayName && <p className="text-sm text-foreground-500 mb-4 italic">{displayName}</p>}

          {seat && showSeatNumbers && seat.seat_label && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent-50 border border-accent-200 mt-2">
              <div className="w-4 h-4 flex items-center justify-center text-accent-500">
                <i className="ri-map-pin-line text-xs" />
              </div>
              <span className="text-sm font-label font-medium text-foreground-700">Seat {seat.seat_label}</span>
            </div>
          )}

          {seating.zone && (
            <p className="text-xs text-foreground-500 mt-3">
              <i className="ri-compass-3-line mr-1 text-foreground-400" />{seating.zone}
            </p>
          )}

          <p className="text-xs text-foreground-400 mt-2">
            {table.shape === 'round' || table.shape === 'oval'
              ? `A ${table.shape} table seating up to ${table.capacity} guests`
              : `A ${table.shape} table seating up to ${table.capacity} guests`}
          </p>
        </div>
      </div>

      {/* Companions section */}
      <div className="card-default px-6 py-5 mb-6">
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
            <div className="flex flex-wrap gap-2 mb-4">
              {companions.map((companion, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span className="px-3 py-1.5 rounded-full bg-background-50 border border-secondary-200 text-sm text-foreground-700 font-label">
                    {formatCompanionName(companion, companionFormat)}
                  </span>
                  {showCompanionSeatLabels && companion.seat_label && (
                    <span className="text-[10px] text-foreground-400 font-label">{companion.seat_label}</span>
                  )}
                </div>
              ))}
            </div>
            <p className="text-[11px] text-foreground-400 leading-relaxed">
              These are the guests seated with you. We hope you enjoy their company &mdash; it&rsquo;s a wonderful group.
            </p>
          </>
        )}
      </div>

      {/* Guest-safe table note */}
      {seating.wedding_day_note && (
        <div className="card-default px-6 py-5 mb-6">
          <h3 className="font-label text-xs font-semibold text-foreground-400 uppercase tracking-wide mb-3 flex items-center gap-2">
            <div className="w-4 h-4 flex items-center justify-center">
              <i className="ri-information-line text-sm" />
            </div>
            A note from the couple
          </h3>
          <p className="text-sm text-foreground-600 leading-relaxed whitespace-pre-line">{seating.wedding_day_note}</p>
        </div>
      )}

      {/* Finding your table */}
      <div className="card-default px-6 py-5 mb-6">
        <h3 className="font-label text-xs font-semibold text-foreground-400 uppercase tracking-wide mb-3 flex items-center gap-2">
          <div className="w-4 h-4 flex items-center justify-center">
            <i className="ri-compass-3-line text-sm" />
          </div>
          Finding your table
        </h3>
        <p className="text-sm text-foreground-600 leading-relaxed">
          When you arrive at the venue, a member of the wedding party or front-of-house staff will be available to guide you to your table. A printed seating chart will also be displayed near the entrance.
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {hasMap && (
          <Link
            to={`${basePath}/seating/map`}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-700 hover:bg-background-50 transition-colors cursor-pointer whitespace-nowrap"
          >
            <i className="ri-map-2-line" /> View room map
          </Link>
        )}
        <Link
          to={`${basePath}/seating`}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
        >
          <i className="ri-arrow-left-line" /> Back to seating
        </Link>
      </div>
    </div>
  );
}