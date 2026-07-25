import { Link } from 'react-router-dom';
import PublicNavbar from '@/components/feature/PublicNavbar';
import Footer from '@/components/feature/Footer';

const guestFeatures = [
  {
    title: 'Personal invitation links',
    description: 'Each guest receives a unique, secure link to their personal wedding page. No generic links, no confusion.',
    icon: 'ri-link-m',
  },
  {
    title: 'RSVP form',
    description: 'A clear, friendly form that collects attendance, meal choices, dietary requirements and any special requests.',
    icon: 'ri-check-double-line',
  },
  {
    title: 'Plus-one handling',
    description: 'Couples decide whether plus-ones are included. Guests can confirm their plus-one name, meal choice and dietary needs.',
    icon: 'ri-user-add-line',
  },
  {
    title: 'Meal choices',
    description: 'Guests select from the couple\'s chosen menu options. Dietary preferences, allergies and special requests are collected automatically.',
    icon: 'ri-restaurant-line',
  },
  {
    title: 'Dietary and accessibility needs',
    description: 'Collect dietary requirements, allergies and accessibility needs so the couple and venue can make sure everyone is looked after.',
    icon: 'ri-heart-pulse-line',
  },
  {
    title: 'Travel and accommodation',
    description: 'Guests browse the couple\'s approved recommendations for hotels, transport, parking and local services on an interactive map.',
    icon: 'ri-map-pin-line',
  },
  {
    title: 'Add to calendar',
    description: 'Guests can add the wedding date, ceremony time and reception details to their personal calendar with one click.',
    icon: 'ri-calendar-event-line',
  },
  {
    title: 'Wedding schedule',
    description: 'The full day\'s timeline is available for guests: ceremony, reception, speeches, first dance and any other key moments.',
    icon: 'ri-timer-line',
  },
  {
    title: 'Couple announcements',
    description: 'Important updates from the couple appear on the guest page, so everyone stays informed of any changes or reminders.',
    icon: 'ri-megaphone-line',
  },
  {
    title: 'Mobile access',
    description: 'The guest experience is designed for mobile first. Guests can check details, confirm attendance and view travel information from any device.',
    icon: 'ri-smartphone-line',
  },
  {
    title: 'Privacy controls',
    description: 'Guest information is only visible to the couple and their designated collaborators. Data is handled securely and never shared.',
    icon: 'ri-shield-check-line',
  },
];

export default function GuestExperiencePage() {
  return (
    <div className="min-h-screen bg-background-50">
      <PublicNavbar transparent={false} />
      <main className="pt-20 md:pt-24">
        {/* Hero */}
        <section className="py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 items-center">
              <div className="w-full lg:w-1/2">
                <span className="section-label">Guest Experience</span>
                <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl text-foreground-900 mt-3 leading-tight">
                  A thoughtful experience<br />
                  <em className="font-light italic">for every single guest</em>
                </h1>
                <p className="text-foreground-600 text-base md:text-lg mt-5 max-w-lg">
                  Every guest gets their own personal wedding page with everything they need: RSVP form, meal choices, travel information and important updates from the couple.
                </p>
                <div className="flex gap-3 mt-7">
                  <Link to="/signup" className="btn-primary">Create your wedding</Link>
                  <Link to="/features" className="btn-outline">View all features</Link>
                </div>
              </div>
              <div className="w-full lg:w-1/2">
                <div className="bg-white border border-secondary-100 rounded-xl p-6 md:p-8">
                  <div className="text-center pb-5 border-b border-secondary-100">
                    <p className="font-heading text-2xl text-foreground-900">Emma &amp; James</p>
                    <p className="text-sm text-foreground-500 mt-1">24 April 2027 &middot; Bath, Somerset</p>
                  </div>
                  <div className="mt-5 space-y-4">
                    <div className="bg-accent-50 rounded-lg p-4 text-center">
                      <p className="text-sm text-foreground-600">You have responded</p>
                      <p className="font-heading text-lg text-accent-700 mt-1">Attending</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-background-50 rounded-lg p-3">
                        <p className="text-xs text-foreground-500 font-label">Meal</p>
                        <p className="text-sm font-label text-foreground-900 mt-0.5">Herb-crusted salmon</p>
                      </div>
                      <div className="bg-background-50 rounded-lg p-3">
                        <p className="text-xs text-foreground-500 font-label">Hotel</p>
                        <p className="text-sm font-label text-foreground-900 mt-0.5">The Grand Hotel</p>
                      </div>
                    </div>
                    <div className="bg-background-50 rounded-lg p-4">
                      <p className="text-xs text-foreground-500 font-label mb-2">Schedule</p>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-foreground-500 font-label w-16">14:00</span>
                          <span className="text-foreground-800">Ceremony</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-foreground-500 font-label w-16">15:30</span>
                          <span className="text-foreground-800">Reception</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-foreground-500 font-label w-16">19:00</span>
                          <span className="text-foreground-800">Dinner &amp; dancing</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature list */}
        <section className="py-16 md:py-20 bg-background-100">
          <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="font-heading text-3xl md:text-4xl text-foreground-900">
                Everything a guest needs
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {guestFeatures.map((f) => (
                <div key={f.title} className="card-default">
                  <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-primary-50 text-primary-600 mb-3">
                    <i className={`${f.icon} text-base`} />
                  </div>
                  <h3 className="font-label text-sm font-semibold text-foreground-900 mb-1.5">{f.title}</h3>
                  <p className="text-xs text-foreground-600 leading-relaxed">{f.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 text-center">
            <h2 className="font-heading text-3xl md:text-4xl text-foreground-900">
              Give your guests a beautiful experience
            </h2>
            <p className="text-foreground-600 mt-4 mb-8">
              Set up your wedding page and invite your guests today.
            </p>
            <Link to="/signup" className="btn-primary text-base px-8 py-3.5">Start planning</Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}