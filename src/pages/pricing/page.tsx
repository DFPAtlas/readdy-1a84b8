import PublicNavbar from '@/components/feature/PublicNavbar';
import Footer from '@/components/feature/Footer';
import { Link } from 'react-router-dom';
import { pricingPlans } from '@/mocks/wedora';

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background-50">
      <PublicNavbar transparent={false} />
      <main className="pt-20 md:pt-24">
        {/* Hero */}
        <section className="relative py-16 md:py-24 overflow-hidden">
          <img
            src="https://readdy.ai/api/search-image?query=Elegant%20minimal%20wedding%20table%20setting%20with%20soft%20linen%2C%20dried%20flowers%2C%20candlelight%20and%20gold%20cutlery%2C%20warm%20neutral%20cream%20and%20taupe%20tones%2C%20shallow%20depth%20of%20field%2C%20editorial%20style%20photography%2C%20serene%20luxury%20atmosphere&width=1600&height=700&seq=pricing-hero-bg&orientation=landscape"
            alt=""
            className="absolute inset-0 w-full h-full object-cover object-top"
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-background-50/80" />
          <div className="relative max-w-7xl mx-auto px-4 md:px-6 lg:px-8 text-center">
            <span className="section-label">Pricing</span>
            <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl text-foreground-900 mt-3">
              Plans designed for<br />
              <em className="font-light italic">every wedding</em>
            </h1>
            <p className="text-foreground-600 text-base md:text-lg mt-5 max-w-xl mx-auto">
              Choose the plan that fits your wedding. All prices to be announced.
            </p>
            <p className="inline-flex items-center px-4 py-2 rounded-full bg-secondary-100 text-secondary-800 text-sm font-label mt-4">
              Pricing to be announced
            </p>
          </div>
        </section>

        {/* Plans */}
        <section className="py-8 md:py-12 bg-background-100">
          <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {pricingPlans.map((plan) => (
                <div
                  key={plan.name}
                  className={`card-default relative flex flex-col ${
                    plan.highlighted
                      ? 'border-primary-300 ring-1 ring-primary-200'
                      : ''
                  }`}
                >
                  {plan.highlighted && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center px-3 py-1 rounded-full bg-primary-500 text-white text-xs font-label font-medium">
                      Most popular
                    </span>
                  )}
                  <h3 className="font-heading text-xl text-foreground-900">{plan.name}</h3>
                  <p className="text-sm text-foreground-500 mt-1">{plan.description}</p>

                  <div className="mt-5 mb-1">
                    <span className="font-heading text-3xl text-foreground-900">TBA</span>
                    <span className="text-sm text-foreground-500 font-label"> / wedding</span>
                  </div>

                  <ul className="mt-5 space-y-3 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <span className="w-4 h-4 flex items-center justify-center flex-shrink-0 mt-0.5 text-accent-600">
                          <i className="ri-check-line text-xs" />
                        </span>
                        <span className="text-foreground-700">{f}</span>
                      </li>
                    ))}
                  </ul>

                  <button className={`mt-6 w-full py-3 rounded-lg text-sm font-label font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    plan.highlighted
                      ? 'bg-primary-500 text-white hover:bg-primary-600'
                      : 'border border-secondary-200 text-foreground-800 hover:bg-background-100'
                  }`}>
                    Get started
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Comparison table */}
        <section className="py-16 md:py-20">
          <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
            <h2 className="font-heading text-3xl text-foreground-900 text-center mb-10">
              Compare plans
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-secondary-200">
                    <th className="text-left py-3 px-4 font-label text-foreground-900">Feature</th>
                    <th className="text-center py-3 px-4 font-label text-foreground-700">Free</th>
                    <th className="text-center py-3 px-4 font-label text-foreground-700">Essential</th>
                    <th className="text-center py-3 px-4 font-label text-primary-700 bg-primary-50/50">Complete</th>
                    <th className="text-center py-3 px-4 font-label text-foreground-700">Luxury</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Guest limit', '20', '80', '200', 'Unlimited'],
                    ['Wedding page', 'Basic', 'Custom', 'Custom', 'Premium'],
                    ['RSVP collection', 'Basic', 'Full', 'Full', 'Full'],
                    ['Invitations', '—', '✓', '✓', '✓'],
                    ['Email updates', '—', '✓', '✓', '✓'],
                    ['Travel guide', '—', '✓', '✓', '✓'],
                    ['Planning tools', '—', '—', '✓', '✓'],
                    ['Supplier management', '—', '—', '✓', '✓'],
                    ['Budget tracker', '—', '—', '✓', '✓'],
                    ['Seating planner', '—', '—', '✓', '✓'],
                    ['Collaborators', '—', '—', '3', 'Unlimited'],
                    ['Wedding-day tools', '—', '—', '—', '✓'],
                    ['Priority support', '—', '—', '—', '✓'],
                    ['Wedora branding', 'On', 'Off', 'Off', 'Off'],
                  ].map(([feature, free, essential, complete, luxury]) => (
                    <tr key={feature} className="border-b border-secondary-100">
                      <td className="py-3 px-4 font-label text-foreground-800">{feature}</td>
                      <td className="text-center py-3 px-4 text-foreground-600">{free}</td>
                      <td className="text-center py-3 px-4 text-foreground-600">{essential}</td>
                      <td className="text-center py-3 px-4 text-primary-700 bg-primary-50/30">{complete}</td>
                      <td className="text-center py-3 px-4 text-foreground-600">{luxury}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="py-16 md:py-24 bg-background-100">
          <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 text-center">
            <h2 className="font-heading text-3xl md:text-4xl text-foreground-900">
              Start with the Free plan
            </h2>
            <p className="text-foreground-600 mt-4 mb-8">
              No credit card required. Upgrade any time as your planning progresses.
            </p>
            <Link to="/signup" className="btn-primary text-base px-8 py-3.5">Start planning for free</Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}