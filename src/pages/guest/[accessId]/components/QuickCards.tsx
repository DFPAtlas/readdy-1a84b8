import type { GuestPortalData } from '@/hooks/useGuestPortal';

interface QuickCardsProps {
  data: GuestPortalData;
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  return Math.max(0, Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}

export default function QuickCards({ data }: QuickCardsProps) {
  const weddingDate = data.wedding.wedding_date;
  const firstVenue = data.events.find((e) => e.venue?.city)?.venue;
  const settings = data.portal_settings || {};

  const cards = [
    {
      key: 'date',
      icon: 'ri-calendar-check-line',
      iconBg: 'bg-primary-50 text-primary-600',
      label: 'Wedding Date',
      value: weddingDate
        ? new Date(weddingDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })
        : 'To be announced',
      sub: weddingDate
        ? null
        : 'Date coming soon',
    },
    {
      key: 'location',
      icon: 'ri-map-pin-2-line',
      iconBg: 'bg-accent-50 text-accent-600',
      label: 'Location',
      value: firstVenue
        ? [firstVenue.city, firstVenue.country].filter(Boolean).join(', ')
        : 'Venue to be confirmed',
      sub: firstVenue?.county_or_region || firstVenue?.name || null,
    },
    {
      key: 'countdown',
      icon: 'ri-hourglass-line',
      iconBg: 'bg-secondary-100 text-secondary-700',
      label: 'Countdown',
      value: weddingDate
        ? (() => {
            const days = daysUntil(weddingDate);
            if (days === 0) return 'Today!';
            if (days === 1) return 'Tomorrow!';
            return `${days} days`;
          })()
        : 'TBC',
      sub: weddingDate
        ? (daysUntil(weddingDate) === 0 ? 'The big day is here' : 'Until the celebration')
        : null,
      isPast: weddingDate ? daysUntil(weddingDate) === 0 && new Date(weddingDate) < new Date() : false,
    },
    {
      key: 'weather',
      icon: 'ri-sun-line',
      iconBg: 'bg-accent-50 text-accent-500',
      label: 'Weather',
      value: 'Coming soon',
      sub: 'Weather updates will appear closer to the wedding.',
      isPlaceholder: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {cards.map((card) => (
        <div
          key={card.key}
          className="bg-white border border-secondary-100 rounded-xl p-4 md:p-5 flex items-start gap-3 transition-colors hover:border-secondary-200"
        >
          <div className={`w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-lg flex-shrink-0 ${card.iconBg}`}>
            <i className={`${card.icon} text-sm md:text-base`} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] md:text-xs font-label text-foreground-500 uppercase tracking-wider mb-0.5">
              {card.label}
            </p>
            <p className={`text-sm md:text-base font-heading font-semibold truncate ${
              card.isPlaceholder ? 'text-foreground-400 italic' :
              card.isPast ? 'text-foreground-500' :
              'text-foreground-900'
            }`}>
              {card.value}
            </p>
            {card.sub && (
              <p className="text-[10px] md:text-xs text-foreground-400 mt-0.5 truncate">{card.sub}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}