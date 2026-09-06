import PublicNavbar from '@/components/feature/PublicNavbar';
import Footer from '@/components/feature/Footer';
import { Link } from 'react-router-dom';
import { travelCategories } from '@/mocks/wedora';

const steps = [
  {
    step: 1,
    title: 'Add your venues',
    description: 'Enter the ceremony and reception locations. You can add addresses manually or search for them when Google Places is connected.',
  },
  {
    step: 2,
    title: 'Discover nearby places',
    description: 'Vowora uses Google Places to search for useful businesses near your venues — hotels, restaurants, transport hubs and more.',
  },
  {
    step: 3,
    title: 'Review privately',
    description: 'All suggestions appear in a private approval area visible only to you and your collaborators. Nothing is published without your approval.',
  },
  {
    step: 4,
    title: 'Approve, edit, label and organise',
    description: 'Approve the places you recommend. Add personal notes, mark favourites, label family-friendly or budget options, and set the display order.',
  },
  {
    step: 5,
    title: 'Publish the guest map',
    description: 'Approved places appear as interactive overlays on a Google Map embedded in your wedding website for guests.',
  },
  {
    step: 6,
    title: 'Guests explore and plan',
    description: 'Guests filter by category, open listing cards with details, and view routes between hotels, venues and transport points.',
  },
];

export default function TravelConciergePage() {
  return (
    <div className="min-h-screen bg-background-50">
      <PublicNavbar transparent={false} />
      <main className="pt-20 md:pt-24">
        {/* Hero */}
        <section className="py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 items-center">
              <div className="w-full lg:w-1/2">
                <span className="section-label">Travel Concierge</span>
                <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl text-foreground-900 mt-3 leading-tight">
                  Wedding travel<br />
                  <em className="font-light italic">made easier for every guest</em>
                </h1>
                <p className="text-foreground-600 text-base md:text-lg mt-5 max-w-lg">
                  Help your guests find hotels, restaurants, transport and useful local services. You control exactly what appears on the map, and guests get an effortless way to plan their journey.
                </p>
                <div className="flex gap-3 mt-7">
                  <Link to="/signup" className="btn-primary">Start planning</Link>
                  <Link to="/features" className="btn-outline">View all features</Link>
                </div>
              </div>
              <div className="w-full lg:w-1/2">
                <div className="bg-white border border-secondary-100 rounded-xl overflow-hidden">
                  <div className="aspect-[4/3] bg-background-100 relative">
                    <video
                      src="https://storage.readdy-site.link/project_files/db465b55-2978-4a6e-8202-84a3a77c69f8/6fb55303-f8ac-4954-871d-d4f8a26c29ae_Firefly-want-a-image-of-a-county-side-hotel-in-the-uk-with-a-white-filter-over-lay-404914.mp4"
                      autoPlay
                      muted
                      loop
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-16 md:py-20 bg-background-100">
          <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
            <div className="text-center mb-14">
              <h2 className="font-heading text-3xl md:text-4xl text-foreground-900">
                How Travel Concierge works
              </h2>
            </div>

            <div className="max-w-3xl mx-auto space-y-8">
              {steps.map((s) => (
                <div key={s.step} className="flex gap-5">
                  <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-accent-100 text-accent-700 font-label text-sm font-semibold">
                    {s.step}
                  </div>
                  <div className="pt-2">
                    <h3 className="font-label text-base font-semibold text-foreground-900">{s.title}</h3>
                    <p className="text-sm text-foreground-600 mt-1">{s.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Categories */}
        <section className="py-16 md:py-20">
          <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
            <div className="text-center mb-10">
              <h2 className="font-heading text-3xl md:text-4xl text-foreground-900">
                Categories we search
              </h2>
            </div>
            <div className="flex flex-wrap justify-center gap-2 max-w-3xl mx-auto">
              {travelCategories.map((cat) => (
                <span key={cat} className="inline-flex items-center px-4 py-2 rounded-full bg-white border border-secondary-200 text-sm font-label text-foreground-700">
                  {cat}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Technical notes */}
        <section className="py-16 md:py-20 bg-background-100">
          <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
              <h2 className="font-heading text-3xl md:text-4xl text-foreground-900 text-center mb-8">
                Integration details
              </h2>
              <div className="card-default space-y-3">
                <p className="text-sm text-foreground-600">
                  <strong className="text-foreground-900">Google Places</strong> discovers nearby businesses, ratings and contact details based on your venue locations.
                </p>
                <p className="text-sm text-foreground-600">
                  <strong className="text-foreground-900">Google Maps</strong> displays the interactive map that guests use to explore approved locations.
                </p>
                <p className="text-sm text-foreground-600">
                  <strong className="text-foreground-900">Routes</strong> can calculate driving, walking and public transport distances and journey estimates between points.
                </p>
                <p className="text-sm text-foreground-600">
                  <strong className="text-foreground-900">Google Cloud billing</strong> and restricted API keys are required. The integration is not live until configured with your own credentials.
                </p>
                <p className="text-sm text-foreground-600">
                  <strong className="text-foreground-900">Privacy:</strong> Place searches happen server-side using a private API key. The browser key shown on the map page is restricted to your domain only.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 text-center">
            <h2 className="font-heading text-3xl md:text-4xl text-foreground-900">
              Help every guest find their way
            </h2>
            <p className="text-foreground-600 mt-4 mb-8">
              Set up your Travel Concierge and make it effortless for guests to plan their journey.
            </p>
            <Link to="/signup" className="btn-primary text-base px-8 py-3.5">Start planning</Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}