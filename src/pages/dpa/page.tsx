import { Link } from 'react-router-dom';
import PublicNavbar from '@/components/feature/PublicNavbar';
import Footer from '@/components/feature/Footer';

export default function DPAPage() {
  return (
    <div className="min-h-screen bg-background-50">
      <PublicNavbar transparent={false} />
      <main className="pt-20 md:pt-24 pb-16">
        <div className="max-w-3xl mx-auto px-4 md:px-6 lg:px-8">
          <span className="section-label">Legal</span>
          <h1 className="font-heading text-4xl md:text-5xl text-foreground-900 mt-3 mb-2">Data Processing Addendum</h1>
          <p className="text-sm text-foreground-500 mb-10">Last updated: July 2026</p>

          <div className="card-default mb-8">
            <p className="text-sm text-foreground-600 italic">
              <strong>Review note for legal counsel:</strong> This is an outline of the Data Processing Addendum that Vowora would
              enter into with business customers who require one. The full DPA must be drafted or reviewed by a qualified data-protection
              lawyer to reflect the actual data flows, security measures and subprocessing arrangements in place. This outline
              describes the intended scope and is not a binding agreement.
            </p>
          </div>

          <div className="prose prose-sm max-w-none text-foreground-700 space-y-6">
            <section>
              <h2 className="font-heading text-xl text-foreground-900 mt-8 mb-3">1. When is a DPA needed?</h2>
              <p className="text-sm leading-relaxed">
                Under the UK GDPR, if you are a business using Vowora (for example, a wedding planner managing multiple
                couples&rsquo; weddings), you are a data controller and Vowora is a data processor. A Data Processing
                Addendum (DPA) sets out the respective obligations and is legally required under Article 28 of the UK GDPR.
              </p>
              <p className="text-sm leading-relaxed mt-2">
                For individual couples using Vowora to plan their own wedding, Vowora is also a data controller for the
                platform data, and a full DPA is not typically required. Our standard{' '}
                <Link to="/terms" className="text-primary-600 underline cursor-pointer">Terms of Service</Link> and{' '}
                <Link to="/privacy" className="text-primary-600 underline cursor-pointer">Privacy Policy</Link> govern
                the relationship.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-xl text-foreground-900 mt-8 mb-3">2. DPA outline</h2>
              <p className="text-sm leading-relaxed">
                The DPA would cover the following areas:
              </p>

              <h3 className="font-label text-sm font-semibold text-foreground-900 mt-4 mb-2">2.1 Definitions and scope</h3>
              <p className="text-sm leading-relaxed">
                Defines the parties (controller and processor), the subject matter of processing, its duration, the nature
                and purpose, the types of personal data and categories of data subjects.
              </p>

              <h3 className="font-label text-sm font-semibold text-foreground-900 mt-4 mb-2">2.2 Processor obligations</h3>
              <ul className="list-disc pl-5 text-sm space-y-2">
                <li>Process personal data only on the documented instructions of the controller</li>
                <li>Ensure persons authorised to process the data are bound by confidentiality</li>
                <li>Implement appropriate technical and organisational security measures</li>
                <li>Assist the controller in responding to data subject rights requests</li>
                <li>Assist the controller with data breach notification obligations</li>
                <li>Assist the controller with data protection impact assessments</li>
                <li>Delete or return all personal data at the end of the contract</li>
                <li>Make available information necessary to demonstrate compliance</li>
              </ul>

              <h3 className="font-label text-sm font-semibold text-foreground-900 mt-4 mb-2">2.3 Subprocessing</h3>
              <p className="text-sm leading-relaxed">
                Vowora would maintain an up-to-date list of subprocessors (available at{' '}
                <Link to="/subprocessors" className="text-primary-600 underline cursor-pointer">/subprocessors</Link>),
                provide notice of changes, and ensure subprocessors are bound by equivalent data protection obligations.
              </p>

              <h3 className="font-label text-sm font-semibold text-foreground-900 mt-4 mb-2">2.4 International transfers</h3>
              <p className="text-sm leading-relaxed">
                Where personal data is transferred outside the UK, Vowora would ensure appropriate safeguards such as
                UK International Data Transfer Agreements or Standard Contractual Clauses with the UK Addendum.
              </p>

              <h3 className="font-label text-sm font-semibold text-foreground-900 mt-4 mb-2">2.5 Security measures</h3>
              <p className="text-sm leading-relaxed">
                Vowora would describe the technical and organisational measures in place: encryption at rest and in transit,
                access controls, authentication, logging and monitoring, regular testing and staff training.
              </p>

              <h3 className="font-label text-sm font-semibold text-foreground-900 mt-4 mb-2">2.6 Breach notification</h3>
              <p className="text-sm leading-relaxed">
                Vowora would notify the controller without undue delay (and within 72 hours where feasible) of any personal
                data breach affecting the controller&rsquo;s data.
              </p>

              <h3 className="font-label text-sm font-semibold text-foreground-900 mt-4 mb-2">2.7 Liability and term</h3>
              <p className="text-sm leading-relaxed">
                The DPA would define each party&rsquo;s liability for data protection breaches and remain in effect for
                the duration of the processing relationship.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-xl text-foreground-900 mt-8 mb-3">3. How to request a DPA</h2>
              <p className="text-sm leading-relaxed">
                If you are a business customer and require a signed Data Processing Addendum, please contact us through our{' '}
                <Link to="/contact" className="text-primary-600 underline cursor-pointer">Contact page</Link> with
                the subject &ldquo;DPA Request&rdquo;. We will provide a draft for review within 10 working days.
              </p>
              <p className="text-sm leading-relaxed mt-2">
                <strong>Review question for legal counsel:</strong> Has a full DPA been drafted and is it ready for
                execution with business customers? Does it correctly reference the UK GDPR (rather than EU GDPR) post-Brexit?
                Are the subprocessor commitments and international transfer provisions legally sufficient?
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}