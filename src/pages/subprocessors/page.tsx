import { Link } from 'react-router-dom';
import PublicNavbar from '@/components/feature/PublicNavbar';
import Footer from '@/components/feature/Footer';

const SUBPROCESSORS = [
  {
    name: 'Supabase',
    service: 'Cloud database, authentication, file storage, Edge Functions',
    location: 'USA (data hosted in EU region where customer selects)',
    privacyUrl: 'https://supabase.com/privacy',
    dpaUrl: 'https://supabase.com/legal/dpa',
    safeguards: 'EU Standard Contractual Clauses, SOC 2 Type II, ISO 27001',
  },
  {
    name: 'Readdy',
    service: 'Website hosting, form handling, analytics, agent services',
    location: 'UK / EU',
    privacyUrl: 'https://readdy.ai/privacy',
    dpaUrl: null,
    safeguards: 'UK / EU hosting, data processing agreement',
  },
  {
    name: 'Resend',
    service: 'Transactional email delivery (invitations, updates, notifications)',
    location: 'USA',
    privacyUrl: 'https://resend.com/legal/privacy-policy',
    dpaUrl: 'https://resend.com/legal/dpa',
    safeguards: 'EU Standard Contractual Clauses, SOC 2, GDPR compliant',
  },
  {
    name: 'Google Maps / Places API',
    service: 'Travel Concierge map display and venue discovery (when enabled by couple)',
    location: 'USA',
    privacyUrl: 'https://policies.google.com/privacy',
    dpaUrl: 'https://cloud.google.com/terms/data-processing-terms',
    safeguards: 'EU Standard Contractual Clauses, ISO 27001, data processing terms',
  },
  {
    name: 'Stripe',
    service: 'Payment processing for paid Vowora plans (when connected)',
    location: 'USA',
    privacyUrl: 'https://stripe.com/gb/privacy',
    dpaUrl: 'https://stripe.com/gb/legal/dpa',
    safeguards: 'EU Standard Contractual Clauses, PCI DSS Level 1, SOC 2',
  },
  {
    name: 'Google Fonts',
    service: 'Website typography (fonts served from Google CDN)',
    location: 'USA',
    privacyUrl: 'https://policies.google.com/privacy',
    dpaUrl: null,
    safeguards: 'Fonts served from CDN; IP address may be logged by Google',
  },
  {
    name: 'CDNJS (Cloudflare)',
    service: 'Icon library delivery (Font Awesome, Remix Icon)',
    location: 'Global CDN',
    privacyUrl: 'https://www.cloudflare.com/privacypolicy/',
    dpaUrl: 'https://www.cloudflare.com/cloudflare-customer-dpa/',
    safeguards: 'Global CDN; widely used for open-source library delivery',
  },
];

export default function SubprocessorsPage() {
  return (
    <div className="min-h-screen bg-background-50">
      <PublicNavbar transparent={false} />
      <main className="pt-20 md:pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8">
          <span className="section-label">Legal</span>
          <h1 className="font-heading text-4xl md:text-5xl text-foreground-900 mt-3 mb-2">Subprocessors</h1>
          <p className="text-sm text-foreground-500 mb-10">Last updated: July 2026</p>

          <div className="card-default mb-8">
            <p className="text-sm text-foreground-600 italic">
              <strong>Review note for legal counsel:</strong> This list describes the third-party services Vowora relies on to
              operate the platform. Each service, the data it processes, its hosting location and the applicable legal safeguards
              must be verified before this document is considered final. This list should be maintained as a living record and
              updated whenever a new subprocessor is engaged.
            </p>
          </div>

          <div className="prose prose-sm max-w-none text-foreground-700 space-y-6">
            <section>
              <h2 className="font-heading text-xl text-foreground-900 mt-8 mb-3">1. About this list</h2>
              <p className="text-sm leading-relaxed">
                Vowora uses third-party service providers (&ldquo;subprocessors&rdquo;) to help deliver the platform.
                This page lists the subprocessors we currently use, what they do, where they are based and the legal
                safeguards in place to protect your data.
              </p>
              <p className="text-sm leading-relaxed mt-2">
                We carry out due diligence on all subprocessors and enter into written agreements requiring them to
                handle personal data in compliance with applicable data protection law, including the UK GDPR.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-xl text-foreground-900 mt-8 mb-3">2. Current subprocessors</h2>
              <div className="space-y-4 mt-4">
                {SUBPROCESSORS.map((sp) => (
                  <div key={sp.name} className="border border-secondary-200 rounded-xl p-5 bg-white">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h3 className="font-label text-sm font-semibold text-foreground-900">{sp.name}</h3>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-secondary-100 text-secondary-700 font-label whitespace-nowrap shrink-0">{sp.location}</span>
                    </div>
                    <p className="text-sm text-foreground-600 mb-2">{sp.service}</p>
                    <p className="text-xs text-foreground-500 mb-3">Safeguards: {sp.safeguards}</p>
                    <div className="flex items-center gap-3">
                      <a href={sp.privacyUrl} target="_blank" rel="nofollow noopener noreferrer" className="text-xs text-primary-600 hover:underline cursor-pointer whitespace-nowrap">
                        Privacy policy
                      </a>
                      {sp.dpaUrl && (
                        <a href={sp.dpaUrl} target="_blank" rel="nofollow noopener noreferrer" className="text-xs text-primary-600 hover:underline cursor-pointer whitespace-nowrap">
                          Data Processing Agreement
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="font-heading text-xl text-foreground-900 mt-8 mb-3">3. Data processed by subprocessors</h2>
              <p className="text-sm leading-relaxed">
                The data processed by each subprocessor depends on which Vowora features you use. For example:
              </p>
              <ul className="list-disc pl-5 text-sm space-y-2 mt-2">
                <li>If you use the Travel Concierge, venue addresses may be sent to Google Maps / Places</li>
                <li>If you send email invitations or updates, guest email addresses and message content are processed by Resend</li>
                <li>If you connect Stripe for paid plans, billing information is processed by Stripe</li>
                <li>Wedding data, guest information and uploaded media are stored in Supabase</li>
              </ul>
              <p className="text-sm leading-relaxed mt-2">
                For a full description of the data we collect, please see our{' '}
                <Link to="/privacy" className="text-primary-600 underline cursor-pointer">Privacy Policy</Link>.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-xl text-foreground-900 mt-8 mb-3">4. International transfers</h2>
              <p className="text-sm leading-relaxed">
                Some subprocessors are based outside the UK. Where personal data is transferred internationally, we ensure
                appropriate safeguards are in place, such as UK International Data Transfer Agreements, EU Standard
                Contractual Clauses or an adequacy decision.
              </p>
              <p className="text-sm leading-relaxed mt-2">
                <strong>Review question for legal counsel:</strong> Have UK International Data Transfer Agreements or the
                UK Addendum to the EU SCCs been executed with each subprocessor that processes personal data outside the UK?
                Is a Transfer Risk Assessment required for any of the listed subprocessors?
              </p>
            </section>

            <section>
              <h2 className="font-heading text-xl text-foreground-900 mt-8 mb-3">5. Updates to this list</h2>
              <p className="text-sm leading-relaxed">
                We will update this page when we engage new subprocessors or change existing ones. If you are a Vowora customer
                and would like to be notified of subprocessor changes, please contact us and we will add you to our notification list.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}