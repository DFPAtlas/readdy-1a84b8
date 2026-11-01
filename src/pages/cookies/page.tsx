import { Link } from 'react-router-dom';
import PublicNavbar from '@/components/feature/PublicNavbar';
import Footer from '@/components/feature/Footer';
import { usePageSeo } from '@/hooks/usePageSeo';

export default function CookieNoticePage() {
  usePageSeo({
    title: 'Cookie Notice — Vowora',
    description: 'How Vowora uses cookies and browser local storage, the exact storage keys we set, how long each is kept, how to change your choices, and which third parties we contact.',
    path: '/cookies',
    keywords: 'Vowora cookie notice, cookie consent, analytics cookies, UK PECR',
  });

  return (
    <div className="min-h-screen bg-background-50">
      <PublicNavbar transparent={false} />
      <main className="pt-20 md:pt-24 pb-16">
        <div className="max-w-3xl mx-auto px-4 md:px-6 lg:px-8">
          <span className="section-label">Legal</span>
          <h1 className="font-heading text-4xl md:text-5xl text-foreground-900 mt-3 mb-2">Cookie Notice</h1>
          <p className="text-sm text-foreground-500 mb-10">Last updated: November 2026</p>

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
              <p className="text-sm leading-relaxed mt-3">
                Vowora also uses your browser&rsquo;s <strong>local storage</strong>. Local storage is similar to a cookie in that it
                is saved by your browser on your own device, but it is a different technology: local storage entries are not cookies,
                they never expire on their own, and they are not sent automatically with every request to our servers. Where this
                notice names a &ldquo;storage key&rdquo;, that entry is held in your browser&rsquo;s local storage rather than in a cookie.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-xl text-foreground-900 mt-8 mb-3">2. How Vowora uses cookies and local storage</h2>
              <p className="text-sm leading-relaxed">
                We group what we store in your browser into three categories:
              </p>

              <h3 className="font-label text-sm font-semibold text-foreground-900 mt-4 mb-2">Essential browser storage (always active)</h3>
              <p className="text-sm leading-relaxed">
                These entries are necessary for the website to function properly. They enable core features such as authentication,
                session management, security and accessibility preferences. The website cannot operate without them. The entries
                below are <strong>local storage entries</strong>, not cookies, and none of them has a fixed expiry date.
              </p>
              <div className="overflow-x-auto mt-2">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-secondary-200">
                      <th className="text-left py-2 pr-4 font-label font-semibold text-foreground-900">Storage key (local storage)</th>
                      <th className="text-left py-2 pr-4 font-label font-semibold text-foreground-900">Purpose</th>
                      <th className="text-left py-2 font-label font-semibold text-foreground-900">How long it is kept</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-secondary-100">
                    <tr>
                      <td className="py-2 pr-4 text-foreground-700">sb-&lt;project-ref&gt;-auth-token</td>
                      <td className="py-2 pr-4 text-foreground-600">Supabase authentication session that keeps you signed in</td>
                      <td className="py-2 text-foreground-500">Until you sign out, your session expires or is revoked, or you clear site data</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 text-foreground-700">vowora_cookie_consent</td>
                      <td className="py-2 pr-4 text-foreground-600">Records the cookie and storage choices you made in the consent banner</td>
                      <td className="py-2 text-foreground-500">No fixed expiry — kept until you clear site data or we publish a new version of this notice</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 text-foreground-700">vowora.activeWeddingId</td>
                      <td className="py-2 pr-4 text-foreground-600">Remembers which wedding workspace you last had open</td>
                      <td className="py-2 text-foreground-500">Until you switch workspace or clear site data</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h3 className="font-label text-sm font-semibold text-foreground-900 mt-6 mb-2">Analytics storage (optional)</h3>
              <p className="text-sm leading-relaxed">
                Analytics entries would help us understand how visitors interact with the website by collecting and reporting
                information anonymously, so we can measure page views, feature usage and performance.
              </p>
              <p className="text-sm leading-relaxed mt-2">
                <strong>As of the date of this notice, Vowora does not load any third-party analytics, measurement or tracking
                technology</strong>, and no analytics entry is created in your browser. The Analytics option in the consent banner
                is recorded so that your choice is already on file, but it currently enables nothing on the site. If we introduce
                analytics in future, we will update this notice and ask for your consent before anything is loaded.
              </p>

              <h3 className="font-label text-sm font-semibold text-foreground-900 mt-6 mb-2">Marketing cookies and storage (optional)</h3>
              <p className="text-sm leading-relaxed">
                These entries could be set through our site by advertising partners, and may be used to build a profile of your
                interests and show you relevant advertisements on other sites. Vowora does not currently deploy any marketing
                cookies, pixels or storage directly, and no advertising network is loaded. If we partner with advertising
                networks in future, we will update this notice and ask for fresh consent first.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-xl text-foreground-900 mt-8 mb-3">3. Managing your cookie preferences</h2>
              <p className="text-sm leading-relaxed">
                When you first visit Vowora, we show a cookie consent banner. You can:
              </p>
              <ul className="list-disc pl-5 text-sm space-y-2 mt-2">
                <li><strong>Accept all</strong> — enable all categories</li>
                <li><strong>Reject all</strong> — only essential storage is used</li>
                <li><strong>Customise</strong> — choose which categories to allow</li>
              </ul>
              <p className="text-sm leading-relaxed mt-2">
                Your choice is saved in your browser (the <code className="text-xs">vowora_cookie_consent</code> local storage entry)
                so the banner does not reappear on every page load. This notice sets no fixed expiry on that entry, so your choice is
                remembered until you change it.
              </p>
              <p className="text-sm leading-relaxed mt-2">
                At present there is no in-page control to reopen the banner after you have made a choice. To withdraw or change your
                choice, clear the site data (cookies and local storage) for this site in your browser settings and reload the page —
                the banner will then appear again and you can choose again. Clearing site data will also sign you out, because your
                login session is held in the same place. You can also block cookies and local storage through your browser settings,
                though this may affect site functionality.
              </p>
              <p className="text-sm leading-relaxed mt-2">
                We will also ask you again automatically if we publish a new version of this notice, because a new version resets
                stored choices.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-xl text-foreground-900 mt-8 mb-3">4. Third-party cookies</h2>
              <p className="text-sm leading-relaxed">
                Some of our pages link to third-party services, such as Google Maps destinations for the Travel Concierge feature.
                A link only contacts the third party if you click it. If we ever embed third-party content directly, those providers
                may set their own cookies, which we do not control.
              </p>
              <p className="text-sm leading-relaxed mt-2">
                Separately, our web fonts and icon sets are requested from third-party content delivery networks (Google Fonts and
                Cloudflare&rsquo;s cdnjs) on every page load. These requests are made by your browser directly to those providers and
                may include your IP address. They are not used by us to track you, but they are third-party requests nonetheless.
              </p>
              <p className="text-sm leading-relaxed mt-2">
                We recommend you review the relevant third-party privacy policies:
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