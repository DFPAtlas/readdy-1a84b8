import { Link } from 'react-router-dom';
import PublicNavbar from '@/components/feature/PublicNavbar';
import Footer from '@/components/feature/Footer';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background-50">
      <PublicNavbar transparent={false} />
      <main className="pt-20 md:pt-24 pb-16">
        <div className="max-w-3xl mx-auto px-4 md:px-6 lg:px-8">
          <span className="section-label">Legal</span>
          <h1 className="font-heading text-4xl md:text-5xl text-foreground-900 mt-3 mb-2">Terms of Service</h1>
          <p className="text-sm text-foreground-500 mb-10">Last updated: July 2026 &middot; Version 2.0</p>

          <div className="card-default mb-8">
            <p className="text-sm text-foreground-600 italic">
              <strong>Review note for legal counsel:</strong> These Terms of Service are drafted for a UK-facing SaaS platform.
              They cover account terms, acceptable use, user-generated content, payments, availability, termination and
              limitation of liability. Jurisdiction and governing law are set as England and Wales.
              Every clause should be reviewed for legal accuracy and completeness before these terms are published as final.
              Sections marked with <strong>[REVIEW]</strong> contain open questions for legal counsel.
            </p>
          </div>

          <div className="prose prose-sm max-w-none text-foreground-700 space-y-6">
            <section>
              <h2 className="font-heading text-xl text-foreground-900 mt-8 mb-3">1. About these terms</h2>
              <p className="text-sm leading-relaxed">
                These Terms of Service (&ldquo;Terms&rdquo;) form a legal agreement between you (&ldquo;you&rdquo;, &ldquo;your&rdquo;)
                and Vowora (&ldquo;Vowora&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo;, &ldquo;us&rdquo;) governing your use of the
                Vowora wedding planning platform (&ldquo;the Service&rdquo;). By creating an account or using the Service,
                you agree to these Terms. If you do not agree, you must not use the Service.
              </p>
              <p className="text-sm leading-relaxed mt-2">
                <strong>[REVIEW]</strong> Insert the legal entity name, company registration number and registered office address.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-xl text-foreground-900 mt-8 mb-3">2. Eligibility and accounts</h2>
              <h3 className="font-label text-sm font-semibold text-foreground-900 mt-4 mb-2">2.1 Eligibility</h3>
              <p className="text-sm leading-relaxed">
                You must be at least 18 years old to create a Vowora account. By creating an account, you represent that you
                meet this requirement.
              </p>
              <h3 className="font-label text-sm font-semibold text-foreground-900 mt-4 mb-2">2.2 Account responsibility</h3>
              <p className="text-sm leading-relaxed">
                You must provide accurate, complete and current information when creating your account. You are responsible
                for maintaining the confidentiality of your login credentials and for all activity that occurs under your
                account. You must notify us immediately of any unauthorised use of your account.
              </p>
              <h3 className="font-label text-sm font-semibold text-foreground-900 mt-4 mb-2">2.3 Account types</h3>
              <p className="text-sm leading-relaxed">
                The Service offers different account types (individual couples, wedding planners, business customers).
                Additional terms may apply to business accounts, including a Data Processing Addendum available at{' '}
                <Link to="/dpa" className="text-primary-600 underline cursor-pointer">/dpa</Link>.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-xl text-foreground-900 mt-8 mb-3">3. The Vowora Service</h2>
              <p className="text-sm leading-relaxed">
                Vowora provides a wedding planning platform that may include:
              </p>
              <ul className="list-disc pl-5 text-sm space-y-1 mt-1">
                <li>Wedding website creation and hosting</li>
                <li>Guest management, invitation delivery and RSVP collection</li>
                <li>Wedding schedule and event management</li>
                <li>Budget tracking and payment scheduling</li>
                <li>Seating plan design</li>
                <li>Photo gallery and live photo wall</li>
                <li>Travel Concierge with venue discovery</li>
                <li>Supplier management</li>
                <li>Email updates and communications</li>
              </ul>
              <p className="text-sm leading-relaxed mt-2">
                We may add, modify or remove features at any time. We will provide reasonable notice of material changes
                that affect your use of the Service.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-xl text-foreground-900 mt-8 mb-3">4. Acceptable use</h2>
              <p className="text-sm leading-relaxed">You agree not to:</p>
              <ul className="list-disc pl-5 text-sm space-y-1 mt-1">
                <li>Use the Service for any unlawful purpose or in violation of any applicable law</li>
                <li>Upload, post or share content that violates our{' '}
                  <Link to="/content-rules" className="text-primary-600 underline cursor-pointer">Community &amp; Content Rules</Link></li>
                <li>Send spam, unsolicited messages or unauthorised advertising through the Service</li>
                <li>Upload or transmit malicious code, viruses or harmful content</li>
                <li>Attempt to gain unauthorised access to the Service, other users&rsquo; accounts or our systems</li>
                <li>Interfere with or disrupt the Service or its infrastructure</li>
                <li>Scrape, data-mine or extract data from the Service without our permission</li>
                <li>Resell, sublicense or commercially exploit the Service without our written consent</li>
                <li>Impersonate another person or misrepresent your affiliation</li>
                <li>Use the Service in a way that infringes the intellectual property or privacy rights of others</li>
              </ul>
            </section>

            <section>
              <h2 className="font-heading text-xl text-foreground-900 mt-8 mb-3">5. User content</h2>
              <h3 className="font-label text-sm font-semibold text-foreground-900 mt-4 mb-2">5.1 Your content</h3>
              <p className="text-sm leading-relaxed">
                You retain ownership of the content you create, upload or share through the Service (&ldquo;User Content&rdquo;),
                including wedding information, guest data, photos, messages and settings. By using the Service, you grant us
                a limited licence to host, store and display your User Content solely for the purpose of providing the Service
                to you.
              </p>
              <h3 className="font-label text-sm font-semibold text-foreground-900 mt-4 mb-2">5.2 Guest data</h3>
              <p className="text-sm leading-relaxed">
                When you add guest personal data to Vowora, you confirm that you have a lawful basis for providing that data,
                such as the guest&rsquo;s consent or your legitimate interest in planning your wedding. You are responsible
                for ensuring your use of guest data complies with applicable data protection laws.
              </p>
              <h3 className="font-label text-sm font-semibold text-foreground-900 mt-4 mb-2">5.3 Content removal</h3>
              <p className="text-sm leading-relaxed">
                We reserve the right to remove User Content that violates these Terms, our{' '}
                <Link to="/content-rules" className="text-primary-600 underline cursor-pointer">Community &amp; Content Rules</Link> or
                applicable law. We may suspend or terminate accounts for serious or repeated violations.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-xl text-foreground-900 mt-8 mb-3">6. Payments and billing</h2>
              <h3 className="font-label text-sm font-semibold text-foreground-900 mt-4 mb-2">6.1 Plans</h3>
              <p className="text-sm leading-relaxed">
                Vowora may offer both free and paid plans. The features, limits and pricing for each plan are described on our
                pricing page and in your account settings. Prices are in pounds sterling (£) and include VAT where applicable.
              </p>
              <h3 className="font-label text-sm font-semibold text-foreground-900 mt-4 mb-2">6.2 Payment processing</h3>
              <p className="text-sm leading-relaxed">
                Payments are processed securely by Stripe. We do not store your full payment card details. By subscribing to a
                paid plan, you agree to Stripe&rsquo;s terms of service and authorise recurring payments until you cancel.
              </p>
              <h3 className="font-label text-sm font-semibold text-foreground-900 mt-4 mb-2">6.3 Cancellation</h3>
              <p className="text-sm leading-relaxed">
                You may cancel your paid plan at any time through your account settings. Cancellation takes effect at the end of
                your current billing period. You will retain access to paid features until that date. Refunds are at our discretion
                unless required by law.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-xl text-foreground-900 mt-8 mb-3">7. Intellectual property</h2>
              <p className="text-sm leading-relaxed">
                The Vowora platform, including its design, code, branding, logos and documentation, is protected by intellectual
                property rights owned by or licensed to us. You may not copy, modify, distribute, sell or create derivative
                works based on the platform without our prior written permission.
              </p>
              <p className="text-sm leading-relaxed mt-2">
                You retain all rights to your User Content. We do not claim ownership of your wedding data, guest information
                or uploaded media.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-xl text-foreground-900 mt-8 mb-3">8. Third-party services</h2>
              <p className="text-sm leading-relaxed">
                The Service may integrate with or link to third-party services such as Google Maps, Stripe and Resend.
                We are not responsible for the content, functionality or practices of third-party services. Your use of
                third-party services is at your own risk and subject to their terms.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-xl text-foreground-900 mt-8 mb-3">9. Availability and support</h2>
              <p className="text-sm leading-relaxed">
                We strive to provide a reliable Service, but we do not guarantee uninterrupted or error-free operation.
                The Service may be unavailable during maintenance, updates or circumstances beyond our reasonable control.
                We will use reasonable efforts to notify you of planned downtime.
              </p>
              <p className="text-sm leading-relaxed mt-2">
                Support is provided as described on our website. Response times and support channels may vary by plan.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-xl text-foreground-900 mt-8 mb-3">10. Limitation of liability</h2>
              <p className="text-sm leading-relaxed">
                <strong>Important — please read carefully.</strong> This section limits our liability to you.
              </p>
              <p className="text-sm leading-relaxed mt-2">
                Nothing in these Terms excludes or limits our liability for death or personal injury caused by negligence,
                fraud or fraudulent misrepresentation, or any other liability that cannot be excluded or limited by English law.
              </p>
              <p className="text-sm leading-relaxed mt-2">
                To the fullest extent permitted by law:
              </p>
              <ul className="list-disc pl-5 text-sm space-y-1 mt-1">
                <li>The Service is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis without warranties of any kind, express or implied.</li>
                <li>We shall not be liable for any indirect, incidental, special, consequential or punitive damages, including
                  loss of profits, data, use or goodwill, arising from your use of or inability to use the Service.</li>
                <li>Our total aggregate liability to you for any claims arising from these Terms or your use of the Service
                  shall not exceed the amount you have paid us in the 12 months preceding the claim, or £100 if you use the free plan.</li>
              </ul>
              <p className="text-sm leading-relaxed mt-2">
                <strong>[REVIEW]</strong> Confirm that the liability cap amounts are appropriate and proportional to the
                risks of the Service. Consider whether separate caps should apply to different types of claim.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-xl text-foreground-900 mt-8 mb-3">11. Indemnification</h2>
              <p className="text-sm leading-relaxed">
                You agree to indemnify and hold harmless Vowora and its team members from any claims, damages, losses or expenses
                arising from your violation of these Terms, your User Content, or your violation of any third-party rights.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-xl text-foreground-900 mt-8 mb-3">12. Termination</h2>
              <h3 className="font-label text-sm font-semibold text-foreground-900 mt-4 mb-2">12.1 Termination by you</h3>
              <p className="text-sm leading-relaxed">
                You may close your account at any time through your account settings or by contacting us. Upon account closure,
                your data will be handled in accordance with our{' '}
                <Link to="/privacy" className="text-primary-600 underline cursor-pointer">Privacy Notice</Link> and{' '}
                <Link to="/retention" className="text-primary-600 underline cursor-pointer">Retention Schedule</Link>.
              </p>
              <h3 className="font-label text-sm font-semibold text-foreground-900 mt-4 mb-2">12.2 Termination by us</h3>
              <p className="text-sm leading-relaxed">
                We may suspend or terminate your account if you violate these Terms, if required by law, or if we discontinue
                the Service. Where reasonably possible, we will provide notice and an opportunity to remedy the violation.
              </p>
              <h3 className="font-label text-sm font-semibold text-foreground-900 mt-4 mb-2">12.3 Effect of termination</h3>
              <p className="text-sm leading-relaxed">
                Upon termination, your right to use the Service ends immediately. Provisions that by their nature should survive
                termination (including intellectual property, limitation of liability, indemnification and governing law) will
                continue to apply.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-xl text-foreground-900 mt-8 mb-3">13. Changes to these terms</h2>
              <p className="text-sm leading-relaxed">
                We may update these Terms from time to time. Material changes will be communicated to you by email or through
                the platform at least 30 days before they take effect. Your continued use of the Service after the changes
                take effect constitutes acceptance of the updated Terms. If you do not agree to the changes, you must stop
                using the Service before they take effect.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-xl text-foreground-900 mt-8 mb-3">14. Governing law and jurisdiction</h2>
              <p className="text-sm leading-relaxed">
                These Terms are governed by and interpreted in accordance with the laws of England and Wales. Any disputes
                arising from these Terms shall be subject to the exclusive jurisdiction of the courts of England and Wales.
              </p>
              <p className="text-sm leading-relaxed mt-2">
                <strong>[REVIEW]</strong> Confirm that England and Wales is the correct jurisdiction. Update if the
                business is registered in Scotland or Northern Ireland.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-xl text-foreground-900 mt-8 mb-3">15. General provisions</h2>
              <ul className="list-disc pl-5 text-sm space-y-1 mt-1">
                <li><strong>Entire agreement:</strong> These Terms, together with our Privacy Notice, Cookie Notice,
                  Content Rules and any applicable DPA, constitute the entire agreement between you and Vowora.</li>
                <li><strong>Severability:</strong> If any provision of these Terms is found unenforceable, the remaining
                  provisions remain in full effect.</li>
                <li><strong>No waiver:</strong> Our failure to enforce any provision does not constitute a waiver of that provision.</li>
                <li><strong>Assignment:</strong> You may not assign your rights under these Terms without our written consent.
                  We may assign our rights to an affiliate or successor.</li>
                <li><strong>Notices:</strong> Notices to you may be sent by email to the address associated with your account.
                  Notices to us should be sent through our <Link to="/contact" className="text-primary-600 underline cursor-pointer">Contact page</Link>.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-heading text-xl text-foreground-900 mt-8 mb-3">16. Contact</h2>
              <p className="text-sm leading-relaxed">
                For questions about these Terms, please use our{' '}
                <Link to="/contact" className="text-primary-600 underline cursor-pointer">Contact page</Link>.
              </p>
            </section>

            <section className="mt-8 pt-6 border-t border-secondary-200">
              <h2 className="font-heading text-lg text-foreground-900 mb-3">Open legal-review questions</h2>
              <ol className="list-decimal pl-5 text-xs text-foreground-600 space-y-1.5">
                <li>Insert the legal entity name, company registration number and registered office address.</li>
                <li>Confirm that England and Wales is the correct governing law and jurisdiction.</li>
                <li>Review and confirm the liability cap amounts (£100 free / 12-month fees paid).</li>
                <li>Confirm whether a 30-day notice period for material changes to Terms is sufficient and appropriate.</li>
                <li>Confirm whether separate Terms are needed for business/wedding-planner customers.</li>
                <li>Review the indemnification clause for scope and enforceability under English law.</li>
                <li>Confirm that the termination provisions comply with consumer protection law if applicable.</li>
                <li>Confirm that the refund policy is clearly stated and compliant with UK consumer law (Consumer Rights Act 2015).</li>
              </ol>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}