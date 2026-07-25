import { Link } from 'react-router-dom';
import PublicNavbar from '@/components/feature/PublicNavbar';
import Footer from '@/components/feature/Footer';

export default function RetentionPage() {
  return (
    <div className="min-h-screen bg-background-50">
      <PublicNavbar transparent={false} />
      <main className="pt-20 md:pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8">
          <span className="section-label">Legal</span>
          <h1 className="font-heading text-4xl md:text-5xl text-foreground-900 mt-3 mb-2">Data Retention &amp; Deletion Schedule</h1>
          <p className="text-sm text-foreground-500 mb-10">Last updated: July 2026</p>

          <div className="card-default mb-8">
            <p className="text-sm text-foreground-600 italic">
              <strong>Review note for legal counsel:</strong> This schedule describes how long Wedora retains different categories
              of personal data. Retention periods, the legal bases cited and the deletion mechanisms must be reviewed against
              the actual data-processing architecture and applicable legal obligations (UK GDPR, limitation periods for legal
              claims, HMRC record-keeping requirements).
            </p>
          </div>

          <div className="prose prose-sm max-w-none text-foreground-700 space-y-6">
            <section>
              <h2 className="font-heading text-xl text-foreground-900 mt-8 mb-3">1. About this schedule</h2>
              <p className="text-sm leading-relaxed">
                This schedule explains how long Wedora keeps different types of personal data and what happens when data
                reaches the end of its retention period. We retain data only for as long as necessary for the purposes
                for which it was collected, or as required by law.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-xl text-foreground-900 mt-8 mb-3">2. Retention periods by data type</h2>

              <div className="overflow-x-auto mt-4">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-secondary-300">
                      <th className="text-left py-2.5 pr-4 font-label font-semibold text-foreground-900">Data category</th>
                      <th className="text-left py-2.5 pr-4 font-label font-semibold text-foreground-900">Retention period</th>
                      <th className="text-left py-2.5 pr-4 font-label font-semibold text-foreground-900">Basis</th>
                      <th className="text-left py-2.5 font-label font-semibold text-foreground-900">Deletion mechanism</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-secondary-100">
                    <tr>
                      <td className="py-2.5 pr-4 text-foreground-700 font-medium">Active wedding data</td>
                      <td className="py-2.5 pr-4 text-foreground-600">Duration of account + 30 days after deletion request</td>
                      <td className="py-2.5 pr-4 text-foreground-500">Contract performance</td>
                      <td className="py-2.5 text-foreground-500">Account deletion flow</td>
                    </tr>
                    <tr className="bg-secondary-50/50">
                      <td className="py-2.5 pr-4 text-foreground-700 font-medium">Guest personal data</td>
                      <td className="py-2.5 pr-4 text-foreground-600">Duration of wedding + 30 days after wedding deletion</td>
                      <td className="py-2.5 pr-4 text-foreground-500">Legitimate interest / couple consent</td>
                      <td className="py-2.5 text-foreground-500">Cascading delete with wedding</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-4 text-foreground-700 font-medium">RSVP submissions</td>
                      <td className="py-2.5 pr-4 text-foreground-600">Duration of wedding data retention</td>
                      <td className="py-2.5 pr-4 text-foreground-500">Contract performance</td>
                      <td className="py-2.5 text-foreground-500">Cascading delete with wedding</td>
                    </tr>
                    <tr className="bg-secondary-50/50">
                      <td className="py-2.5 pr-4 text-foreground-700 font-medium">Gallery photos &amp; videos</td>
                      <td className="py-2.5 pr-4 text-foreground-600">Duration of wedding data retention</td>
                      <td className="py-2.5 pr-4 text-foreground-500">Contract performance</td>
                      <td className="py-2.5 text-foreground-500">Storage object delete + DB record removal</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-4 text-foreground-700 font-medium">Quarantined / rejected media</td>
                      <td className="py-2.5 pr-4 text-foreground-600">30 days from rejection</td>
                      <td className="py-2.5 pr-4 text-foreground-500">Legitimate interest (abuse prevention)</td>
                      <td className="py-2.5 text-foreground-500">Scheduled job</td>
                    </tr>
                    <tr className="bg-secondary-50/50">
                      <td className="py-2.5 pr-4 text-foreground-700 font-medium">Invitation tokens &amp; access sessions</td>
                      <td className="py-2.5 pr-4 text-foreground-600">30 days after expiry / 90 days after last use</td>
                      <td className="py-2.5 pr-4 text-foreground-500">Legitimate interest (security)</td>
                      <td className="py-2.5 text-foreground-500">Scheduled job</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-4 text-foreground-700 font-medium">Activity logs &amp; audit records</td>
                      <td className="py-2.5 pr-4 text-foreground-600">12 months from creation</td>
                      <td className="py-2.5 pr-4 text-foreground-500">Legitimate interest (security / support)</td>
                      <td className="py-2.5 text-foreground-500">Scheduled job</td>
                    </tr>
                    <tr className="bg-secondary-50/50">
                      <td className="py-2.5 pr-4 text-foreground-700 font-medium">Email suppression list</td>
                      <td className="py-2.5 pr-4 text-foreground-600">Indefinite (to prevent future sends)</td>
                      <td className="py-2.5 pr-4 text-foreground-500">Legal obligation (unsubscribe compliance)</td>
                      <td className="py-2.5 text-foreground-500">Manual removal on verified request</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-4 text-foreground-700 font-medium">Payment records</td>
                      <td className="py-2.5 pr-4 text-foreground-600">6 years from transaction date</td>
                      <td className="py-2.5 pr-4 text-foreground-500">Legal obligation (HMRC / tax)</td>
                      <td className="py-2.5 text-foreground-500">Manual after statutory period</td>
                    </tr>
                    <tr className="bg-secondary-50/50">
                      <td className="py-2.5 pr-4 text-foreground-700 font-medium">Deleted account backups</td>
                      <td className="py-2.5 pr-4 text-foreground-600">90 days from deletion (cold storage only)</td>
                      <td className="py-2.5 pr-4 text-foreground-500">Legitimate interest (disaster recovery)</td>
                      <td className="py-2.5 text-foreground-500">Automated backup rotation</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-4 text-foreground-700 font-medium">Cookie consent records</td>
                      <td className="py-2.5 pr-4 text-foreground-600">6 months from last consent</td>
                      <td className="py-2.5 pr-4 text-foreground-500">Legal obligation (consent proof)</td>
                      <td className="py-2.5 text-foreground-500">Browser storage expiry</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 className="font-heading text-xl text-foreground-900 mt-8 mb-3">3. Guest deletion rights</h2>
              <p className="text-sm leading-relaxed">
                Guests can request that their personal data be removed from a wedding at any time through the
                Guest Settings page in their portal or by contacting us. When a guest deletion request is received:
              </p>
              <ul className="list-disc pl-5 text-sm space-y-2 mt-2">
                <li>The guest&rsquo;s profile data (name, contact details, dietary/accessibility notes) is anonymised</li>
                <li>RSVP responses are retained but de-identified (linked to an anonymous guest record)</li>
                <li>Gallery photos where the guest appears are not automatically removed — guests should also
                  report specific photos they wish to have taken down</li>
                <li>The deletion is completed within 30 days of a verified request</li>
              </ul>
              <p className="text-sm leading-relaxed mt-2">
                <strong>Review question for legal counsel:</strong> Is the 30-day guest deletion window compliant with UK GDPR
                Article 17 (right to erasure) timeframes? Is the approach to RSVP data de-identification (rather than outright
                deletion) defensible on the basis of the couple&rsquo;s legitimate interest in maintaining an accurate attendance
                record for their event?
              </p>
            </section>

            <section>
              <h2 className="font-heading text-xl text-foreground-900 mt-8 mb-3">4. Account deletion process</h2>
              <p className="text-sm leading-relaxed">
                When a couple requests deletion of their Wedora account:
              </p>
              <ol className="list-decimal pl-5 text-sm space-y-2 mt-2">
                <li>A deletion request is created with a 30-day cooling-off period</li>
                <li>The couple can cancel the deletion at any point during these 30 days</li>
                <li>After the cooling-off period, all wedding data is permanently deleted from the live database</li>
                <li>Payment records required for tax purposes are retained for the statutory period (6 years) but are
                  disassociated from the wedding context</li>
                <li>Backup copies may persist for up to 90 days in encrypted cold storage before being rotated out</li>
              </ol>
            </section>

            <section>
              <h2 className="font-heading text-xl text-foreground-900 mt-8 mb-3">5. Automated retention jobs</h2>
              <p className="text-sm leading-relaxed">
                Wedora runs scheduled jobs to enforce the retention periods described above. Specifically:
              </p>
              <ul className="list-disc pl-5 text-sm space-y-2 mt-2">
                <li><strong>Expired tokens:</strong> Invitation and access tokens past their expiry date + 30 days are purged daily</li>
                <li><strong>Quarantined media:</strong> Rejected uploads in the private quarantine bucket are deleted after 30 days</li>
                <li><strong>Activity logs:</strong> Records older than 12 months are purged monthly</li>
                <li><strong>Draft data:</strong> Unsubmitted onboarding drafts older than 90 days are removed</li>
                <li><strong>Deleted accounts:</strong> Accounts where the deletion cooling-off period has elapsed are processed weekly</li>
              </ul>
              <p className="text-sm leading-relaxed mt-2">
                <strong>Review question for legal counsel:</strong> Are the automated retention periods above sufficient to meet
                the data minimisation principle (UK GDPR Article 5(1)(c))? Should any additional data categories be subject to
                scheduled purging?
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}