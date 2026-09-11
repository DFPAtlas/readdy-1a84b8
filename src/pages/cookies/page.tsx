import { Link } from 'react-router-dom';
import PublicNavbar from '@/components/feature/PublicNavbar';
import Footer from '@/components/feature/Footer';

export default function CookieNoticePage() {
  return (
    <div className="min-h-screen bg-background-50">
      <PublicNavbar transparent={false} />
      <main className="pt-20 md:pt-24 pb-16">
        <div className="max-w-3xl mx-auto px-4 md:px-6 lg:px-8">
          <span className="section-label">Legal</span>
          <h1 className="font-heading text-4xl md:text-5xl text-foreground-900 mt-3 mb-2">Cookie Notice</h1>
          <p className="text-sm text-foreground-500 mb-10">Last updated: July 2026</p>

          <div className="card-default mb-8">
            <p className="text-sm text-foreground-600 italic">
              <strong>Review note for legal counsel:</strong> This cookie notice is drafted for UK PECR / GDPR compliance.
              Cookie categories, durations, and third-party service details must be verified against the actual deployed
              configuration before this document is considered final.
            </p>
          </div>

          <div className="prose prose-sm max-w-none text-foreground-700 space-y-6">
            <section>
              <h2 className="font-heading text-xl text-foreground-900 mt-8 mb-3">1. What are cookies?</h2>
              <p className="text-sm leading-relaxed">
                Cookies are small text files placed on your device when you visit a website. They are widely used to make websites
                work efficiently and to provide information to the site owners. Some cookies are essential for the website to function,
                while others help us understand how visitors use the site.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-xl text-foreground-900 mt-8 mb-3">2. How Vowora uses cookies</h2>
              <p className="text-sm leading-relaxed">
                We group the cookies we use into three categories:
              </p>

              <h3 className="font-label text-sm font-semibold text-foreground-900 mt-4 mb-2">Essential cookies (always active)</h3>
              <p className="text-sm leading-relaxed">
                These cookies are necessary for the website to function properly. They enable core features such as authentication,
                session management, security, and accessibility preferences. The website cannot operate without them.
              </p>
              <div className="overflow-x-auto mt-2">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-secondary-200">
                      <th className="text-left py-2 pr-4 font-label font-semibold text-foreground-900">Cookie</th>
                      <th className="text-left py-2 pr-4 font-label font-semibold text-foreground-900">Purpose</th>
                      <th className="text-left py-2 font-label font-semibold text-foreground-900">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-secondary-100">
                    <tr>
                      <td className="py-2 pr-4 text-foreground-700">sb-access-token / sb-refresh-token</td>
                      <td className="py-2 pr-4 text-foreground-600">Supabase authentication session</td>
                      <td className="py-2 text-foreground-500">Session / 7 days</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 text-foreground-700">vowora_cookie_consent</td>
                      <td className="py-2 pr-4 text-foreground-600">Stores your cookie consent preferences</td>
                      <td className="py-2 text-foreground-500">6 months</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 text-foreground-700">wedding_id_pref</td>
                      <td className="py-2 pr-4 text-foreground-600">Remembers your active wedding workspace selection</td>
                      <td className="py-2 text-foreground-500">Session</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h3 className="font-label text-sm font-semibold text-foreground-900 mt-6 mb-2">Analytics cookies (optional)</h3>
              <p className="text-sm leading-relaxed">
                These cookies help us understand how visitors interact with the website by collecting and reporting information
                anonymously. They allow us to measure page views, feature usage and performance so we can improve Vowora.
              </p>
              <div className="overflow-x-auto mt-2">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-secondary-200">
                      <th className="text-left py-2 pr-4 font-label font-semibold text-foreground-900">Service</th>
                      <th className="text-left py-2 pr-4 font-label font-semibold text-foreground-900">Purpose</th>
                      <th className="text-left py-2 font-label font-semibold text-foreground-900">Provider</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-secondary-100">
                    <tr>
                      <td className="py-2 pr-4 text-foreground-700">Google Analytics (when connected)</td>
                      <td className="py-2 pr-4 text-foreground-600">Anonymous page-view and usage analytics</td>
                      <td className="py-2 text-foreground-500">Google LLC (USA)</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 text-foreground-700">Readdy Analytics</td>
                      <td className="py-2 pr-4 text-foreground-600">Built-in anonymous site analytics</td>
                      <td className="py-2 text-foreground-500">Readdy (UK/EU hosting)</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h3 className="font-label text-sm font-semibold text-foreground-900 mt-6 mb-2">Marketing cookies (optional)</h3>
              <p className="text-sm leading-relaxed">
                These cookies may be set through our site by advertising partners. They may be used to build a profile of your
                interests and show you relevant advertisements on other sites. Vowora does not currently deploy marketing
                cookies directly. If we partner with advertising networks in future, we will update this notice and ask for
                fresh consent.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-xl text-foreground-900 mt-8 mb-3">3. Managing your cookie preferences</h2>
              <p className="text-sm leading-relaxed">
                When you first visit Vowora, we show a cookie consent banner. You can:
              </p>
              <ul className="list-disc pl-5 text-sm space-y-2 mt-2">
                <li><strong>Accept all</strong> — enable all cookie categories</li>
                <li><strong>Reject all</strong> — only essential cookies are used</li>
                <li><strong>Customise</strong> — choose which categories to allow</li>
              </ul>
              <p className="text-sm leading-relaxed mt-2">
                You can change your preferences at any time by clearing your browser cookies for this site and reloading the page,
                which will show the consent banner again. You can also block cookies through your browser settings, though this
                may affect site functionality.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-xl text-foreground-900 mt-8 mb-3">4. Third-party cookies</h2>
              <p className="text-sm leading-relaxed">
                Some of our pages may use embedded content from third parties such as Google Maps for the Travel Concierge feature.
                These third parties may set their own cookies. We do not control these cookies and recommend you review the
                relevant third-party privacy policies:
              </p>
              <ul className="list-disc pl-5 text-sm space-y-2 mt-2">
                <li><a href="https://policies.google.com/privacy" target="_blank" rel="nofollow noopener noreferrer" className="text-primary-600 underline cursor-pointer">Google Privacy Policy</a></li>
                <li><a href="https://stripe.com/gb/privacy" target="_blank" rel="nofollow noopener noreferrer" className="text-primary-600 underline cursor-pointer">Stripe Privacy Policy</a></li>
              </ul>
            </section>

            <section>
              <h2 className="font-heading text-xl text-foreground-900 mt-8 mb-3">5. Changes to this notice</h2>
              <p className="text-sm leading-relaxed">
                We may update this Cookie Notice from time to time. When we make material changes, we will ask for your
                consent again through the cookie banner. The latest version is always available on this page.
              </p>
              <p className="text-sm leading-relaxed mt-2">
                <strong>Review question for legal counsel:</strong> Is the current cookie categorisation and consent mechanism
                compliant with UK PECR and the ICO&rsquo;s guidance on cookie consent as of the review date? Are any additional
                disclosures required for embedded third-party content?
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}