const FILTERS = [
  { key: 'all', label: 'All', icon: 'ri-map-pin-line' },
  { key: 'venue', label: 'Venues', icon: 'ri-building-line' },
  { key: 'hotel', label: 'Hotels', icon: 'ri-hotel-line' },
  { key: 'food_drink', label: 'Food &amp; Drink', icon: 'ri-restaurant-line' },
  { key: 'parking', label: 'Parking', icon: 'ri-car-line' },
  { key: 'transport', label: 'Transport', icon: 'ri-train-line' },
  { key: 'attraction', label: 'Attractions', icon: 'ri-landscape-line' },
  { key: 'essential', label: 'Essentials', icon: 'ri-first-aid-kit-line' },
];

interface PlaceFiltersProps {
  active: string;
  onChange: (key: string) => void;
  counts: Record<string, number>;
}

export default function PlaceFilters({ active, onChange, counts }: PlaceFiltersProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {FILTERS.map((f) => {
        const isActive = active === f.key;
        const count = f.key === 'all' ? counts.all ?? 0 : counts[f.key] ?? 0;
        return (
          <button
            key={f.key}
            onClick={() => onChange(f.key)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-label transition-colors cursor-pointer whitespace-nowrap ${
              isActive
                ? 'bg-primary-500 text-white'
                : 'bg-white text-foreground-600 border border-secondary-200 hover:border-secondary-300 hover:text-foreground-900'
            }`}
          >
            <i className={`${f.icon} text-[11px]`} />
            {f.label}
            {count > 0 && (
              <span className={`text-[10px] font-medium ${isActive ? 'text-white/80' : 'text-foreground-400'}`}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}