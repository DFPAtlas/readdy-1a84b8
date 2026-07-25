import { useState } from 'react';
import { travelCategories, mapPreviewListings } from '@/mocks/wedora';
import ScrollReveal from '@/components/base/ScrollReveal';

const listingImages: Record<string, string> = {
  'The Orangery': 'https://readdy.ai/api/search-image?query=Elegant%20orangery%20wedding%20venue%20with%20glass%20walls%20and%20chandeliers%2C%20warm%20natural%20light%2C%20garden%20views%2C%20professional%20architectural%20photography%2C%20clean%20composition&width=200&height=100&seq=the-orangery-card&orientation=landscape',
  'The Grand Hotel': 'https://readdy.ai/api/search-image?query=Elegant%20luxury%20hotel%20exterior%20with%20classic%20architecture%2C%20warm%20stone%20facade%2C%20manicured%20entrance%2C%20professional%20photography%2C%20clean%20composition%2C%20soft%20natural%20light&width=200&height=100&seq=the-grand-hotel-card&orientation=landscape',
  'Riverside Inn': 'https://readdy.ai/api/search-image?query=Charming%20riverside%20country%20inn%20exterior%2C%20warm%20brick%20and%20ivy%2C%20welcoming%20entrance%2C%20professional%20photography%2C%20soft%20afternoon%20light%2C%20clean%20composition&width=200&height=100&seq=riverside-inn-card&orientation=landscape',
  'The Ivy Brasserie': 'https://readdy.ai/api/search-image?query=Elegant%20restaurant%20exterior%20with%20warm%20lighting%2C%20brasserie%20style%2C%20outdoor%20seating%2C%20professional%20photography%2C%20golden%20hour%20light%2C%20clean%20composition&width=200&height=100&seq=the-ivy-brasserie-card&orientation=landscape',
  'The Old Post Office': 'https://readdy.ai/api/search-image?query=Traditional%20English%20pub%20exterior%20with%20warm%20lighting%2C%20hanging%20baskets%2C%20brick%20and%20timber%20facade%2C%20professional%20photography%2C%20cosy%20atmosphere%2C%20clean%20composition&width=200&height=100&seq=the-old-post-office-card&orientation=landscape',
  'Market Square Car Park': 'https://readdy.ai/api/search-image?query=Clean%20modern%20car%20park%20entrance%20with%20clear%20signage%2C%20landscaped%20surroundings%2C%20well%20lit%2C%20professional%20photography%2C%20daylight%2C%20clean%20composition&width=200&height=100&seq=market-square-car-park-card&orientation=landscape',
  'Bath Spa Station': 'https://readdy.ai/api/search-image?query=Elegant%20historic%20train%20station%20exterior%20with%20warm%20brick%20architecture%2C%20arched%20windows%2C%20professional%20photography%2C%20soft%20natural%20light%2C%20clean%20composition&width=200&height=100&seq=bath-spa-station-card&orientation=landscape',
};

export default function TravelConcierge() {
  const [activeFilter, setActiveFilter] = useState('All');

  return (
    <section className="bg-background-100 py-20 md:py-28">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12">
          <div className="max-w-xl">
            <span className="section-label">Travel Concierge</span>
            <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl text-foreground-900 leading-tight mt-2">
              Help every guest get there,<br />
              <em className="font-light italic">stay nearby and enjoy the celebration</em>
            </h2>
          </div>
          <p className="text-sm text-foreground-600 max-w-sm lg:text-right">
            Add venues, discover nearby places, and approve what guests see before they go live.
          </p>
        </div>

        {/* Map preview */}
        <ScrollReveal direction="right" delay={200} duration={700}>
          <div className="bg-white border border-secondary-100 rounded-xl overflow-hidden">
            <div className="aspect-[16/7] bg-background-100 relative overflow-hidden">
              <img
                src="https://readdy.ai/api/search-image?query=Elegant%20minimal%20map%20illustration%20showing%20a%20stylised%20town%20layout%20with%20subtle%20roads%20and%20landmarks%2C%20soft%20warm%20cream%20and%20taupe%20colour%20palette%2C%20clean%20cartographic%20design%2C%20no%20text%20labels%2C%20artistic%20watercolour%20wash%20style%2C%20light%20airy%20feel%2C%20elegant%20wedding%20aesthetic&width=1400&height=620&seq=travel-map-preview&orientation=landscape"
                alt="Map preview showing wedding venue and nearby places"
                className="w-full h-full object-cover"
              />
              {/* Map markers overlay */}
              <div className="absolute inset-0">
                <MapMarker top="30%" left="45%" label="Venue" type="venue" />
                <MapMarker top="25%" left="35%" label="Hotel" type="hotel" />
                <MapMarker top="22%" left="55%" label="Hotel" type="hotel" />
                <MapMarker top="38%" left="60%" label="Restaurant" type="restaurant" />
                <MapMarker top="35%" left="30%" label="Pub" type="pub" />
                <MapMarker top="42%" left="50%" label="Parking" type="parking" />
                <MapMarker top="20%" left="65%" label="Station" type="station" />
              </div>
            </div>

            {/* Category filters */}
            <div className="p-4 md:p-5 border-t border-secondary-100">
              <div className="flex flex-wrap gap-2">
                {['All', 'Hotels', 'Restaurants', 'Pubs & Bars', 'Parking', 'Transport', 'Attractions'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveFilter(cat)}
                    className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-label font-medium transition-colors cursor-pointer ${
                      activeFilter === cat
                        ? 'bg-primary-500 text-white'
                        : 'bg-background-100 text-foreground-600 hover:bg-background-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Listing cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-4 md:p-5 border-t border-secondary-100">
              {mapPreviewListings.map((listing) => (
                <div key={listing.name} className="bg-background-50 rounded-lg p-3 border border-secondary-100 hover:border-primary-200 transition-colors cursor-pointer">
                  <div className="w-full h-20 rounded-md bg-background-200 mb-2 overflow-hidden">
                    <img
                      src={listingImages[listing.name] || ''}
                      alt={listing.name}
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                  <p className="text-xs font-label font-medium text-foreground-900 truncate">{listing.name}</p>
                  <p className="text-xs text-foreground-500 mt-0.5">{listing.category}</p>
                </div>
              ))}
            </div>

            <div className="px-4 md:px-5 pb-4 md:pb-5">
              <p className="text-xs text-foreground-400 italic">
                Google Maps and Places integration is connected during platform configuration.
              </p>
            </div>
          </div>
        </ScrollReveal>

        {/* Category chips */}
        <div className="flex flex-wrap gap-2 mt-6">
          {travelCategories.map((cat) => (
            <span key={cat} className="inline-flex items-center px-3 py-1.5 rounded-full bg-white border border-secondary-200 text-xs font-label text-foreground-600">
              {cat}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function MapMarker({ top, left, label, type }: { top: string; left: string; label: string; type: string }) {
  const colors: Record<string, string> = {
    venue: 'bg-primary-500',
    hotel: 'bg-accent-500',
    restaurant: 'bg-secondary-700',
    pub: 'bg-secondary-600',
    parking: 'bg-secondary-500',
    station: 'bg-foreground-500',
  };

  return (
    <div className="absolute transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer" style={{ top, left }}>
      <div className={`w-3 h-3 rounded-full ${colors[type] || 'bg-secondary-500'} ring-2 ring-white`} />
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <span className="inline-block px-2 py-0.5 rounded bg-foreground-900 text-white text-xs whitespace-nowrap font-label">{label}</span>
      </div>
    </div>
  );
}