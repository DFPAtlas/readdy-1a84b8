import type { LocalPlace } from '@/types/access';

interface PlaceCardProps {
  place: LocalPlace;
  onSave?: (place: LocalPlace) => void;
  onSelect?: (place: LocalPlace) => void;
  isSaved?: boolean;
}

const PLACE_TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  venue: { label: 'Venue', icon: 'ri-building-line' },
  hotel: { label: 'Hotel', icon: 'ri-hotel-line' },
  food_drink: { label: 'Food &amp; Drink', icon: 'ri-restaurant-line' },
  parking: { label: 'Parking', icon: 'ri-car-line' },
  transport: { label: 'Transport', icon: 'ri-train-line' },
  attraction: { label: 'Attraction', icon: 'ri-landscape-line' },
  essential: { label: 'Essential', icon: 'ri-first-aid-kit-line' },
};

export default function PlaceCard({ place, onSave, onSelect, isSaved }: PlaceCardProps) {
  const typeInfo = PLACE_TYPE_LABELS[place.place_type] || { label: place.place_type, icon: 'ri-map-pin-line' };
  const hasImage = Boolean(place.image_url);
  const fullAddress = [place.address_line_1, place.city, place.postcode, place.country].filter(Boolean).join(', ');

  return (
    <div
      className="bg-white rounded-lg border border-secondary-200/70 overflow-hidden group hover:border-secondary-300/70 transition-colors cursor-pointer"
      onClick={() => onSelect?.(place)}
    >
      {hasImage ? (
        <div className="relative h-40 w-full bg-background-50 overflow-hidden">
          <img
            src={place.image_url}
            alt={place.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute top-2 left-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-label font-medium bg-white/90 text-foreground-700">
              <i className={`${typeInfo.icon} text-[10px]`} />
              {typeInfo.label}
            </span>
          </div>
          {place.provider_rating && (
            <div className="absolute top-2 right-2">
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-label font-medium bg-white/90 text-foreground-700">
                <i className="ri-star-fill text-amber-500 text-[10px]" />
                {place.provider_rating}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="relative h-40 w-full bg-secondary-50 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-secondary-100 flex items-center justify-center text-secondary-400">
            <i className={`${typeInfo.icon} text-2xl`} />
          </div>
          <div className="absolute top-2 left-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-label font-medium bg-white/90 text-foreground-700">
              <i className={`${typeInfo.icon} text-[10px]`} />
              {typeInfo.label}
            </span>
          </div>
          {place.provider_rating && (
            <div className="absolute top-2 right-2">
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-label font-medium bg-white/90 text-foreground-700">
                <i className="ri-star-fill text-amber-500 text-[10px]" />
                {place.provider_rating}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="p-3">
        <h3 className="text-sm font-label font-semibold text-foreground-900 leading-snug mb-1">{place.name}</h3>
        {fullAddress && (
          <p className="text-[11px] text-foreground-400 line-clamp-1 mb-2">{fullAddress}</p>
        )}
        {place.description && (
          <p className="text-[11px] text-foreground-500 leading-relaxed line-clamp-2 mb-2">{place.description}</p>
        )}

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-secondary-100">
          <div className="flex items-center gap-2 text-[10px] text-foreground-400">
            {place.opening_info && (
              <span className="flex items-center gap-1">
                <i className="ri-time-line" /> {place.opening_info}
              </span>
            )}
            {place.accessibility_info && (
              <span className="flex items-center gap-1" title={place.accessibility_info}>
                <i className="ri-wheelchair-line" />
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {place.website && (
              <a
                href={place.website}
                target="_blank"
                rel="noopener noreferrer"
                className="w-6 h-6 flex items-center justify-center rounded text-foreground-400 hover:text-primary-600 hover:bg-primary-50 transition-colors cursor-pointer"
                onClick={(e) => e.stopPropagation()}
                title="Website"
              >
                <i className="ri-global-line text-xs" />
              </a>
            )}
            {place.telephone && (
              <a
                href={`tel:${place.telephone}`}
                className="w-6 h-6 flex items-center justify-center rounded text-foreground-400 hover:text-primary-600 hover:bg-primary-50 transition-colors cursor-pointer"
                onClick={(e) => e.stopPropagation()}
                title="Call"
              >
                <i className="ri-phone-line text-xs" />
              </a>
            )}
            {fullAddress && (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullAddress)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-6 h-6 flex items-center justify-center rounded text-foreground-400 hover:text-primary-600 hover:bg-primary-50 transition-colors cursor-pointer"
                onClick={(e) => e.stopPropagation()}
                title="Directions"
              >
                <i className="ri-direction-line text-xs" />
              </a>
            )}
            {place.place_type === 'hotel' && onSave && (
              <button
                onClick={(e) => { e.stopPropagation(); onSave(place); }}
                className={`w-6 h-6 flex items-center justify-center rounded transition-colors cursor-pointer ${
                  isSaved
                    ? 'text-primary-600 bg-primary-50'
                    : 'text-foreground-400 hover:text-primary-600 hover:bg-primary-50'
                }`}
                title={isSaved ? 'Saved' : 'Save accommodation'}
              >
                <i className={`text-xs ${isSaved ? 'ri-heart-fill' : 'ri-heart-line'}`} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}