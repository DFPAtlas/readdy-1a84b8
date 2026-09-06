import { Link } from 'react-router-dom';
import PublicNavbar from '@/components/feature/PublicNavbar';
import Footer from '@/components/feature/Footer';

const features = [
  {
    title: 'Wedding website builder',
    description: 'Create a beautiful personalised wedding website in minutes. Share your story, schedule, venues, dress code, accommodation details and a gallery of your favourite moments.',
    icon: 'ri-global-line',
    status: 'available',
  },
  {
    title: 'Guest list and households',
    description: 'Organise guests into households, manage plus-ones, children, meal choices, dietary requirements and accessibility needs. Keep every detail about every guest in one place.',
    icon: 'ri-group-line',
    status: 'available',
  },
  {
    title: 'Digital invitations',
    description: 'Send elegant digital invitations that link directly to each guest\'s personal wedding page. Track opens and responses without chasing people individually.',
    icon: 'ri-mail-send-line',
    status: 'available',
  },
  {
    title: 'RSVP collection',
    description: 'Collect structured replies including attendance, meal preferences, dietary requirements and any special requests guests may have.',
    icon: 'ri-check-double-line',
    status: 'available',
  },
  {
    title: 'Email updates',
    description: 'Send targeted updates to all guests or specific groups. Whether it is a change of plan, an accommodation reminder or a thank-you message, reach everyone easily.',
    icon: 'ri-notification-3-line',
    status: 'available',
  },
  {
    title: 'Task management',
    description: 'Keep track of every task leading up to your wedding day. Assign tasks to your partner or planner, set deadlines and never miss a thing.',
    icon: 'ri-calendar-check-line',
    status: 'coming-soon',
  },
  {
    title: 'Supplier management',
    description: 'Store contracts, track payments, manage contact details and keep notes on every supplier, from your florist to your photographer.',
    icon: 'ri-contacts-book-line',
    status: 'coming-soon',
  },
  {
    title: 'Budget tracker',
    description: 'Set your overall budget, allocate funds across categories, track actual spending against planned amounts and stay in control of wedding finances.',
    icon: 'ri-money-pound-circle-line',
    status: 'coming-soon',
  },
  {
    title: 'Seating planner',
    description: 'Drag and drop guests onto tables, visualise the room layout and automatically flag potential conflicts or dietary mismatches.',
    icon: 'ri-layout-grid-line',
    status: 'coming-soon',
  },
  {
    title: 'Collaborators',
    description: 'Invite your partner, wedding planner, family members or wedding-day coordinator with role-based permissions so everyone sees what they need.',
    icon: 'ri-team-line',
    status: 'available',
  },
  {
    title: 'Wedding-day tools',
    description: 'Access schedules, venue maps, supplier contacts and emergency information from any device, so you and your coordinator stay aligned on the day.',
    icon: 'ri-smartphone-line',
    status: 'coming-soon',
  },
  {
    title: 'After-wedding gallery and thank-you tracking',
    description: 'Share a gallery of wedding photos with guests and track thank-you notes so you know who you have written to and who still needs one.',
    icon: 'ri-image-line',
    status: 'coming-soon',
  },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-background-50">
      <PublicNavbar transparent={false} />
      <main className="pt-20 md:pt-24">
        {/* Hero */}
        <section className="py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 items-center">
              <div className="w-full lg:w-1/2">
                <span className="section-label">Features</span>
                <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl text-foreground-900 mt-3 leading-tight">
                  Everything you need<br />
                  <em className="font-light italic">for a beautifully planned wedding</em>
                </h1>
                <p className="text-foreground-600 text-base md:text-lg mt-5 max-w-lg">
                  From your first invitation to the last thank-you note, Vowora gives you the tools to stay organised, keep guests informed and plan with confidence.
                </p>
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

        {/* Features grid */}
        <section className="py-16 md:py-20 bg-background-100">
          <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
              {features.map((feature) => (
                <div key={feature.title} className="card-default relative">
                  <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-accent-50 text-accent-600 mb-4">
                    <i className={`${feature.icon} text-lg`} />
                  </div>
                  <h3 className="font-heading text-lg text-foreground-900 mb-2">{feature.title}</h3>
                  <p className="text-sm text-foreground-600 leading-relaxed">{feature.description}</p>
                  {feature.status === 'coming-soon' && (
                    <span className="absolute top-4 right-4 inline-flex items-center px-2.5 py-1 rounded-full bg-secondary-100 text-secondary-800 text-xs font-label">
                      Coming in a later Vowora release
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 text-center">
            <h2 className="font-heading text-3xl md:text-4xl text-foreground-900">
              Ready to start planning?
            </h2>
            <p className="text-foreground-600 mt-4 mb-8">
              Create your Vowora account and bring every wedding detail together.
            </p>
            <Link to="/signup" className="btn-primary text-base px-8 py-3.5">Start planning your wedding</Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}