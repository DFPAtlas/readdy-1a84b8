interface GettingThereProps {
  parkingNotes?: string;
  accessibilityNotes?: string;
}

const TRANSPORT_OPTIONS = [
  { icon: 'ri-flight-takeoff-line', title: 'By Air', description: 'The nearest airports are listed below. We recommend booking flights early for the best fares.' },
  { icon: 'ri-train-line', title: 'By Train', description: 'Direct services run to the nearest station. Check National Rail for timetables and ticket information.' },
  { icon: 'ri-car-line', title: 'By Car', description: 'Major motorways provide easy access. See parking information below for venue-specific details.' },
  { icon: 'ri-taxi-line', title: 'Taxi &amp; Ride Share', description: 'Local taxi firms and ride-share services operate throughout the area. Pre-booking is recommended for wedding-day journeys.' },
  { icon: 'ri-bus-line', title: 'Coach &amp; Shuttle', description: 'Coach services connect from major cities. We may arrange a shuttle on the day — details will be confirmed closer to the date.' },
  { icon: 'ri-walk-line', title: 'Walking', description: 'The venues are within walking distance of each other and the town centre. Comfortable shoes recommended.' },
];

export default function GettingThere({ parkingNotes, accessibilityNotes }: GettingThereProps) {
  return (
    <div>
      <h2 className="font-heading text-xl text-foreground-900 mb-4 flex items-center gap-2">
        <i className="ri-compass-line text-foreground-400 text-lg" />
        Getting There
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {TRANSPORT_OPTIONS.map((opt) => (
          <div key={opt.title} className="bg-white rounded-lg border border-secondary-200/70 p-4">
            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-secondary-50 text-secondary-400 mb-3">
              <i className={`${opt.icon} text-base`} />
            </div>
            <h3 className="text-sm font-label font-semibold text-foreground-900 mb-1">{opt.title}</h3>
            <p className="text-[11px] text-foreground-500 leading-relaxed">{opt.description}</p>
          </div>
        ))}
      </div>

      {parkingNotes && (
        <div className="bg-white rounded-lg border border-secondary-200/70 p-4 mb-3">
          <h3 className="text-sm font-label font-semibold text-foreground-900 mb-2 flex items-center gap-2">
            <i className="ri-car-line text-foreground-400" /> Parking &amp; Pickup
          </h3>
          <p className="text-[11px] text-foreground-500 leading-relaxed">{parkingNotes}</p>
        </div>
      )}

      {accessibilityNotes && (
        <div className="bg-white rounded-lg border border-secondary-200/70 p-4">
          <h3 className="text-sm font-label font-semibold text-foreground-900 mb-2 flex items-center gap-2">
            <i className="ri-wheelchair-line text-foreground-400" /> Accessibility
          </h3>
          <p className="text-[11px] text-foreground-500 leading-relaxed">{accessibilityNotes}</p>
        </div>
      )}
    </div>
  );
}