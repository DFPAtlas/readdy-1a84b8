import { Link } from 'react-router-dom';
import PublicNavbar from '@/components/feature/PublicNavbar';
import Footer from '@/components/feature/Footer';

export default function ContentRulesPage() {
  return (
    <div className="min-h-screen bg-background-50">
      <PublicNavbar transparent={false} />
      <main className="pt-20 md:pt-24 pb-16">
        <div className="max-w-3xl mx-auto px-4 md:px-6 lg:px-8">
          <span className="section-label">Legal</span>
          <h1 className="font-heading text-4xl md:text-5xl text-foreground-900 mt-3 mb-2">Community &amp; Content Rules</h1>
          <p className="text-sm text-foreground-500 mb-10">Last updated: July 2026</p>

          <div className="card-default mb-8">
            <p className="text-sm text-foreground-600 italic">
              <strong>Review note for legal counsel:</strong> These rules govern user-generated content on the Wedora platform.
              The scope, definitions of prohibited content, enforcement process and jurisdictional references should be reviewed
              for completeness and compliance with applicable law including the UK Online Safety Act.
            </p>
          </div>

          <div className="prose prose-sm max-w-none text-foreground-700 space-y-6">
            <section>
              <h2 className="font-heading text-xl text-foreground-900 mt-8 mb-3">1. Purpose</h2>
              <p className="text-sm leading-relaxed">
                Wedora is a platform for celebrating love and bringing people together. These Community &amp; Content Rules
                (&ldquo;the Rules&rdquo;) set out what is and is not acceptable when you upload, post or share content on Wedora.
                They apply to all users — couples, wedding party members, collaborators and guests.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-xl text-foreground-900 mt-8 mb-3">2. What we expect</h2>
              <p className="text-sm leading-relaxed">
                All content shared on Wedora should be:
              </p>
              <ul className="list-disc pl-5 text-sm space-y-2 mt-2">
                <li><strong>Relevant</strong> — connected to the wedding or celebration</li>
                <li><strong>Respectful</strong> — kind and considerate to all involved</li>
                <li><strong>Lawful</strong> — complies with applicable laws</li>
                <li><strong>Appropriate</strong> — suitable for a mixed-age wedding audience</li>
              </ul>
            </section>

            <section>
              <h2 className="font-heading text-xl text-foreground-900 mt-8 mb-3">3. Prohibited content</h2>
              <p className="text-sm leading-relaxed">
                The following content is not permitted on Wedora:
              </p>
              <ul className="list-disc pl-5 text-sm space-y-2 mt-2">
                <li>Content that is illegal under UK law</li>
                <li>Content that promotes violence, hatred, harassment or discrimination</li>
                <li>Sexually explicit or pornographic material</li>
                <li>Content that infringes someone else&rsquo;s intellectual property rights</li>
                <li>Content that impersonates another person or misrepresents your identity</li>
                <li>Spam, unsolicited advertising or malicious links</li>
                <li>Content that reveals someone&rsquo;s personal information without their consent</li>
                <li>Content involving children in a harmful or exploitative manner (any such content will be reported to the relevant authorities immediately)</li>
                <li>Content uploaded without the consent of identifiable people in photos or videos</li>
              </ul>
            </section>

            <section>
              <h2 className="font-heading text-xl text-foreground-900 mt-8 mb-3">4. Photo &amp; video uploads</h2>
              <p className="text-sm leading-relaxed">
                When you upload photos or videos to a wedding gallery on Wedora, you confirm that:
              </p>
              <ul className="list-disc pl-5 text-sm space-y-2 mt-2">
                <li>You have permission from any identifiable people in the image to share it</li>
                <li>The content does not violate anyone&rsquo;s privacy or rights</li>
                <li>You are not uploading content on behalf of someone who has not consented</li>
                <li>The couple whose wedding you are sharing to has enabled guest uploads</li>
              </ul>
              <p className="text-sm leading-relaxed mt-2">
                Couples can configure their gallery settings to require approval before guest uploads appear publicly.
                All uploads are subject to automated safety scanning before they are published.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-xl text-foreground-900 mt-8 mb-3">5. Reporting content</h2>
              <p className="text-sm leading-relaxed">
                If you see content on Wedora that you believe violates these Rules, you can report it:
              </p>
              <ul className="list-disc pl-5 text-sm space-y-2 mt-2">
                <li><strong>Guest gallery:</strong> Use the report button on any photo or video in the gallery</li>
                <li><strong>Other concerns:</strong> Contact us through our{' '}
                  <Link to="/contact" className="text-primary-600 underline cursor-pointer">Contact page</Link>
                </li>
              </ul>
            </section>

            <section>
              <h2 className="font-heading text-xl text-foreground-900 mt-8 mb-3">6. Enforcement</h2>
              <p className="text-sm leading-relaxed">
                When we receive a report, we will review the content against these Rules. Depending on the severity and context,
                we may:
              </p>
              <ul className="list-disc pl-5 text-sm space-y-2 mt-2">
                <li>Remove the reported content</li>
                <li>Restrict the uploading user&rsquo;s ability to share further content</li>
                <li>Notify the wedding couple (for content on their gallery)</li>
                <li>Suspend or terminate the account responsible for serious or repeated violations</li>
                <li>Report illegal content to the relevant authorities</li>
              </ul>
              <p className="text-sm leading-relaxed mt-2">
                We aim to acknowledge reports within 48 hours and resolve them within 7 working days.
                Decisions can be appealed by contacting us through our{' '}
                <Link to="/contact" className="text-primary-600 underline cursor-pointer">Contact page</Link>.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-xl text-foreground-900 mt-8 mb-3">7. The couple&rsquo;s role</h2>
              <p className="text-sm leading-relaxed">
                Wedding couples have additional controls over their gallery content. They can hide, remove or approve
                guest uploads. Couples are responsible for content they choose to publish on their public wedding website
                and must ensure it complies with these Rules and applicable law.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-xl text-foreground-900 mt-8 mb-3">8. Changes to these rules</h2>
              <p className="text-sm leading-relaxed">
                We may update these Rules from time to time. The latest version is always available on this page.
              </p>
              <p className="text-sm leading-relaxed mt-2">
                <strong>Review question for legal counsel:</strong> Do these content rules adequately address the
                requirements of the UK Online Safety Act 2023 (if applicable) and any other relevant content-moderation
                legislation? Are the reporting timeframes, enforcement steps and appeal mechanisms sufficient?
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}