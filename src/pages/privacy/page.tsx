import { Link } from 'react-router-dom';
import PublicNavbar from '@/components/feature/PublicNavbar';
import Footer from '@/components/feature/Footer';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background-50">
      <PublicNavbar transparent={false} />
      <main className="pt-20 md:pt-24 pb-16">
        <div className="max-w-3xl mx-auto px-4 md:px-6 lg:px-8">
          <span className="section-label">Legal</span>
          <h1 className="font-heading text-4xl md:text-5xl text-foreground-900 mt-3 mb-2">Privacy Notice</h1>
          <p className="text-sm text-foreground-500 mb-10">Last updated: July 2026 &middot; Version 2.0</p>

          <div className="card-default mb-8">
            <p className="text-sm text-foreground-600 italic">
              <strong>Review note for legal counsel:</strong> This Privacy Notice is drafted for UK GDPR / Data Protection Act 2018 compliance.
              It describes how Wedora collects, uses and protects personal data across the platform. Every section should be
              reviewed for accuracy against the actual data-processing activities before this notice is published as final.
              Sections marked with <strong>[REVIEW]</strong> contain open questions for legal counsel.
            </p>
          </div>

          <div className="prose prose-sm max-w-none text-foreground-700 space-y-6">
            <section>
              <h2 className="font-heading text-xl text-foreground-900 mt-8 mb-3">1. About this notice</h2>
              <p className="text-sm leading-relaxed">
                Wedora (&ldquo;Wedora&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo;, &ldquo;us&rdquo;) is a wedding planning platform
                operated by the Wedora team. We are a data controller for the personal data we process through the platform.
              </p>
              <p className="text-sm leading-relaxed mt-2">
                This Privacy Notice explains how we collect, use, share and protect the personal data of:
              </p>
              <ul className="list-disc pl-5 text-sm space-y-1 mt-2">
                <li><strong>Couples</strong> — people who create a Wedora account to plan their wedding</li>
                <li><strong>Wedding party members</strong> — partners, planners and collaborators added to a wedding workspace</li>
                <li><strong>Guests</strong> — people invited to a wedding through Wedora, whose data is provided by the couple</li>
                <li><strong>Suppliers</strong> — venue managers, photographers, caterers and other wedding suppliers added to the platform</li>
                <li><strong>Website visitors</strong> — people who browse the Wedora marketing website</li>
              </ul>
              <p className="text-sm leading-relaxed mt-2">
                <strong>[REVIEW]</strong> Confirm the legal entity name and registered address that should appear here.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-xl text-foreground-900 mt-8 mb-3">2. Personal data we collect</h2>

              <h3 className="font-label text-sm font-semibold text-foreground-900 mt-4 mb-2">2.1 Data you provide directly</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse mt-2">
                  <thead>
                    <tr className="border-b border-secondary-200">
                      <th className="text-left py-2 pr-4 font-label font-semibold text-foreground-900">Data</th>
                      <th className="text-left py-2 pr-4 font-label font-semibold text-foreground-900">Collected from</th>
                      <th className="text-left py-2 font-label font-semibold text-foreground-900">Purpose</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-secondary-100">
                    <tr>
                      <td className="py-2 pr-4 text-foreground-700">Name, email address, password</td>
                      <td className="py-2 pr-4 text-foreground-600">Couples / members</td>
                      <td className="py-2 text-foreground-500">Account creation and authentication</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 text-foreground-700">Wedding details (date, venue, location, schedule)</td>
                      <td className="py-2 pr-4 text-foreground-600">Couples</td>
                      <td className="py-2 text-foreground-500">Wedding planning and website display</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 text-foreground-700">Guest names, email addresses, postal addresses</td>
                      <td className="py-2 pr-4 text-foreground-600">Couples (on behalf of guests)</td>
                      <td className="py-2 text-foreground-500">Invitation delivery and guest management</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 text-foreground-700">Guest dietary requirements, allergies, accessibility needs</td>
                      <td className="py-2 pr-4 text-foreground-600">Couples or guests</td>
                      <td className="py-2 text-foreground-500">Meal planning and venue accessibility</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 text-foreground-700">RSVP responses and meal preferences</td>
                      <td className="py-2 pr-4 text-foreground-600">Guests</td>
                      <td className="py-2 text-foreground-500">Attendance tracking and catering</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 text-foreground-700">Supplier contact information</td>
                      <td className="py-2 pr-4 text-foreground-600">Couples</td>
                      <td className="py-2 text-foreground-500">Supplier management and budget tracking</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 text-foreground-700">Photos, videos and captions</td>
                      <td className="py-2 pr-4 text-foreground-600">Couples and guests</td>
                      <td className="py-2 text-foreground-500">Wedding gallery and live wall display</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 text-foreground-700">Messages and questions</td>
                      <td className="py-2 pr-4 text-foreground-600">Guests</td>
                      <td className="py-2 text-foreground-500">Guest-to-couple communication</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 text-foreground-700">Payment information (processed by Stripe)</td>
                      <td className="py-2 pr-4 text-foreground-600">Couples</td>
                      <td className="py-2 text-foreground-500">Subscription billing (when applicable)</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h3 className="font-label text-sm font-semibold text-foreground-900 mt-6 mb-2">2.2 Data collected automatically</h3>
              <ul className="list-disc pl-5 text-sm space-y-1">
                <li>Device and browser information (IP address, browser type, operating system)</li>
                <li>Usage data (pages visited, features used, time spent)</li>
                <li>Cookie data (see our <Link to="/cookies" className="text-primary-600 underline cursor-pointer">Cookie Notice</Link>)</li>
                <li>Error and performance logs</li>
              </ul>

              <h3 className="font-label text-sm font-semibold text-foreground-900 mt-4 mb-2">2.3 Special category data</h3>
              <p className="text-sm leading-relaxed">
                Some data we process may be considered special category data under the UK GDPR, such as:
              </p>
              <ul className="list-disc pl-5 text-sm space-y-1 mt-1">
                <li>Dietary requirements that may indicate religious beliefs (e.g. halal, kosher)</li>
                <li>Accessibility needs that may reveal health information</li>
              </ul>
              <p className="text-sm leading-relaxed mt-2">
                We process this data only because the couple has chosen to collect it for their wedding planning.
                We minimise the collection of health-related data to only what is strictly necessary for the purpose
                (e.g. dietary restrictions for meal planning, mobility requirements for venue access).
              </p>
            </section>

            <section>
              <h2 className="font-heading text-xl text-foreground-900 mt-8 mb-3">3. How we use your data</h2>
              <p className="text-sm leading-relaxed">We use personal data for the following purposes and on the following legal bases:</p>
              <div className="overflow-x-auto mt-3">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-secondary-200">
                      <th className="text-left py-2 pr-4 font-label font-semibold text-foreground-900">Purpose</th>
                      <th className="text-left py-2 font-label font-semibold text-foreground-900">Legal basis (UK GDPR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-secondary-100">
                    <tr>
                      <td className="py-2 pr-4 text-foreground-700">Providing and maintaining the Wedora platform</td>
                      <td className="py-2 text-foreground-500">Contract performance (Art. 6(1)(b))</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 text-foreground-700">Delivering wedding websites and guest portals</td>
                      <td className="py-2 text-foreground-500">Contract performance (Art. 6(1)(b))</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 text-foreground-700">Sending service emails (invitations, updates, notifications)</td>
                      <td className="py-2 text-foreground-500">Contract performance (Art. 6(1)(b))</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 text-foreground-700">Sending marketing communications</td>
                      <td className="py-2 text-foreground-500">Consent (Art. 6(1)(a)) — separate opt-in</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 text-foreground-700">Improving the platform (analytics, error tracking)</td>
                      <td className="py-2 text-foreground-500">Legitimate interest (Art. 6(1)(f))</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 text-foreground-700">Security, fraud prevention and abuse detection</td>
                      <td className="py-2 text-foreground-500">Legitimate interest (Art. 6(1)(f))</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 text-foreground-700">Complying with legal obligations</td>
                      <td className="py-2 text-foreground-500">Legal obligation (Art. 6(1)(c))</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-sm leading-relaxed mt-3">
                Service emails (such as invitation delivery, RSVP confirmations and account notifications) are sent as part of
                the platform service. Marketing communications are sent only with your separate consent, which you can withdraw
                at any time through the <Link to="/unsubscribe" className="text-primary-600 underline cursor-pointer">unsubscribe page</Link> or your account settings.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-xl text-foreground-900 mt-8 mb-3">4. Who we share data with</h2>
              <p className="text-sm leading-relaxed">
                We do not sell personal data. We share data only as necessary to provide the platform and as described below:
              </p>
              <h3 className="font-label text-sm font-semibold text-foreground-900 mt-4 mb-2">4.1 Third-party service providers (subprocessors)</h3>
              <p className="text-sm leading-relaxed">
                We use carefully selected third-party services to operate the platform. A complete list is maintained on our{' '}
                <Link to="/subprocessors" className="text-primary-600 underline cursor-pointer">Subprocessors</Link> page. Key providers include:
              </p>
              <ul className="list-disc pl-5 text-sm space-y-1 mt-1">
                <li><strong>Supabase</strong> — cloud database, authentication and file storage</li>
                <li><strong>Resend</strong> — email delivery for invitations and updates</li>
                <li><strong>Readdy</strong> — website hosting and form handling</li>
                <li><strong>Google Maps / Places</strong> — Travel Concierge venue discovery (when enabled)</li>
                <li><strong>Stripe</strong> — payment processing (when connected)</li>
              </ul>
              <p className="text-sm leading-relaxed mt-2">
                All subprocessors are bound by data processing agreements that require them to protect your data.
              </p>

              <h3 className="font-label text-sm font-semibold text-foreground-900 mt-4 mb-2">4.2 The wedding couple</h3>
              <p className="text-sm leading-relaxed">
                Guest data (RSVP responses, dietary requirements, accessibility needs, contact information) is visible to the
                wedding couple and any collaborators they add to their workspace. The couple is responsible for how they use
                this data outside of Wedora.
              </p>

              <h3 className="font-label text-sm font-semibold text-foreground-900 mt-4 mb-2">4.3 Legal disclosures</h3>
              <p className="text-sm leading-relaxed">
                We may disclose data where required by law, court order or governmental authority, or where necessary to
                protect our rights, property or safety.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-xl text-foreground-900 mt-8 mb-3">5. International data transfers</h2>
              <p className="text-sm leading-relaxed">
                Some of our subprocessors are based outside the United Kingdom. Where personal data is transferred internationally,
                we ensure appropriate safeguards are in place, such as the UK International Data Transfer Agreement, EU Standard
                Contractual Clauses with the UK Addendum, or an adequacy decision.
              </p>
              <p className="text-sm leading-relaxed mt-2">
                <strong>[REVIEW]</strong> Confirm the hosting location of all data (Supabase region, Readdy hosting) and
                whether any data is stored or processed in the United States. Update this section with the specific transfer
                mechanisms used for each subprocessor.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-xl text-foreground-900 mt-8 mb-3">6. Data retention</h2>
              <p className="text-sm leading-relaxed">
                We keep personal data only for as long as necessary. A detailed schedule is published on our{' '}
                <Link to="/retention" className="text-primary-600 underline cursor-pointer">Data Retention &amp; Deletion Schedule</Link> page.
                Key retention periods:
              </p>
              <ul className="list-disc pl-5 text-sm space-y-1 mt-1">
                <li>Active wedding data — retained for the life of the account plus 30 days after deletion</li>
                <li>Guest personal data — retained for the duration of the wedding plus 30 days</li>
                <li>Payment records — retained for 6 years (HMRC requirement)</li>
                <li>Cookie consent records — retained for 6 months</li>
                <li>Activity logs — retained for 12 months</li>
              </ul>
            </section>

            <section>
              <h2 className="font-heading text-xl text-foreground-900 mt-8 mb-3">7. Your rights</h2>
              <p className="text-sm leading-relaxed">
                Under the UK GDPR, you have the following rights in relation to your personal data:
              </p>
              <ul className="list-disc pl-5 text-sm space-y-1 mt-1">
                <li><strong>Right of access</strong> — request a copy of the data we hold about you</li>
                <li><strong>Right to rectification</strong> — ask us to correct inaccurate data</li>
                <li><strong>Right to erasure</strong> — ask us to delete your data in certain circumstances</li>
                <li><strong>Right to restrict processing</strong> — ask us to limit how we use your data</li>
                <li><strong>Right to data portability</strong> — receive your data in a structured, commonly used format</li>
                <li><strong>Right to object</strong> — object to processing based on legitimate interests</li>
                <li><strong>Right to withdraw consent</strong> — withdraw consent at any time where processing is based on consent</li>
              </ul>
              <p className="text-sm leading-relaxed mt-2">
                To exercise any of these rights, please contact us through our{' '}
                <Link to="/contact" className="text-primary-600 underline cursor-pointer">Contact page</Link>.
                We may ask you to verify your identity before processing your request.
                We will respond within one month (or within three months for complex requests).
              </p>
              <p className="text-sm leading-relaxed mt-2">
                You also have the right to lodge a complaint with the{' '}
                <a href="https://ico.org.uk/make-a-complaint/" target="_blank" rel="nofollow noopener noreferrer" className="text-primary-600 underline cursor-pointer">Information Commissioner&rsquo;s Office (ICO)</a>,
                the UK supervisory authority for data protection.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-xl text-foreground-900 mt-8 mb-3">8. Guest data &amp; the couple&rsquo;s responsibilities</h2>
              <p className="text-sm leading-relaxed">
                When a couple adds guest data to Wedora, the couple acts as a data controller for that guest data.
                We process it on their behalf as a data processor. Couples should ensure they have a lawful basis for
                providing guest data to Wedora — typically consent or legitimate interest.
              </p>
              <p className="text-sm leading-relaxed mt-2">
                We provide tools for guests to manage their own data, including the ability to update their details,
                control communication preferences and request deletion through the guest settings page in their portal.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-xl text-foreground-900 mt-8 mb-3">9. Photo &amp; video uploads</h2>
              <p className="text-sm leading-relaxed">
                When guests upload photos or videos to a wedding gallery, we require them to confirm they have permission
                from identifiable people in the content. Uploads are scanned by automated safety tools before publication.
                Couples can require manual approval before guest uploads appear publicly.
              </p>
              <p className="text-sm leading-relaxed mt-2">
                We strip EXIF metadata (including location data) from uploaded photos by default. Guests can choose to
                retain metadata through a consent toggle during upload.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-xl text-foreground-900 mt-8 mb-3">10. Children&rsquo;s data</h2>
              <p className="text-sm leading-relaxed">
                Wedora is not intended for use by children under 16. Couples may include children as guests in their
                wedding, but we do not knowingly collect personal data directly from children. If you believe a child
                has provided us with personal data without parental consent, please contact us.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-xl text-foreground-900 mt-8 mb-3">11. Security</h2>
              <p className="text-sm leading-relaxed">
                We implement appropriate technical and organisational measures to protect personal data, including:
              </p>
              <ul className="list-disc pl-5 text-sm space-y-1 mt-1">
                <li>Encryption of data in transit (TLS) and at rest</li>
                <li>Role-based access controls and least-privilege principles</li>
                <li>Row-Level Security (RLS) on all database tables, scoped to wedding membership</li>
                <li>Automated content safety scanning for uploaded media</li>
                <li>Rate limiting and abuse detection</li>
                <li>Regular security reviews and dependency updates</li>
              </ul>
            </section>

            <section>
              <h2 className="font-heading text-xl text-foreground-900 mt-8 mb-3">12. Changes to this notice</h2>
              <p className="text-sm leading-relaxed">
                We may update this Privacy Notice from time to time. Material changes will be communicated through the
                platform or by email. The latest version is always available on this page.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-xl text-foreground-900 mt-8 mb-3">13. Contact &amp; complaints</h2>
              <p className="text-sm leading-relaxed">
                For privacy-related enquiries or to exercise your data rights, please:
              </p>
              <ul className="list-disc pl-5 text-sm space-y-1 mt-1">
                <li>Use our <Link to="/contact" className="text-primary-600 underline cursor-pointer">Contact page</Link> (select &ldquo;Privacy request&rdquo; as the subject)</li>
                <li>Or email us at the contact address provided on our website</li>
              </ul>
              <p className="text-sm leading-relaxed mt-2">
                You have the right to complain to the ICO. We would appreciate the opportunity to address your concerns first.
              </p>
              <p className="text-sm leading-relaxed mt-2">
                <strong>[REVIEW]</strong> Insert the registered office address, Data Protection Officer contact details (if applicable)
                and ICO registration number here.
              </p>
            </section>

            <section className="mt-8 pt-6 border-t border-secondary-200">
              <h2 className="font-heading text-lg text-foreground-900 mb-3">Open legal-review questions</h2>
              <ol className="list-decimal pl-5 text-xs text-foreground-600 space-y-1.5">
                <li>Confirm the legal entity name and registered address for Wedora.</li>
                <li>Confirm the hosting location of all personal data and whether any data is stored or processed in the United States.</li>
                <li>Confirm whether a Data Protection Officer has been appointed and their contact details.</li>
                <li>Confirm the ICO registration number.</li>
                <li>Confirm the specific international transfer mechanisms used for each subprocessor listed on the Subprocessors page.</li>
                <li>Review the legitimate-interest assessments for analytics, security and abuse prevention.</li>
                <li>Confirm that the retention periods for payment records (6 years) and activity logs (12 months) are appropriate.</li>
                <li>Review the special-category-data handling for dietary/accessibility data to ensure appropriate safeguards are in place.</li>
              </ol>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}