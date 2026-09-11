import { Link } from 'react-router-dom';
import { dashboardStats } from '@/mocks/vowora';

export default function ProductIntro() {
  return (
    <section className="relative bg-background-50 py-20 md:py-28 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          {/* Left content */}
          <div className="w-full lg:w-2/5 flex-shrink-0">
            <span className="section-label">Vowora</span>
            <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl text-foreground-900 leading-tight">
              Everything comes together<br />
              <em className="font-light italic">in Vowora</em>
            </h2>
            <p className="text-foreground-600 text-base leading-relaxed mt-4 max-w-md">
              Planning a wedding means managing hundreds of details. Vowora brings your website, guest list, invitations, replies, updates, travel information and planning tools into one calm, organised workspace.
            </p>
            <div className="flex gap-3 mt-6">
              <Link to="/signup" className="btn-primary">Start planning</Link>
              <Link to="/features" className="btn-outline">View features</Link>
            </div>
          </div>

          {/* Right preview card */}
          <div className="w-full lg:w-3/5">
            <div className="bg-white border border-secondary-100 rounded-xl p-6 md:p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="font-heading text-xl text-foreground-900">Emma &amp; James</p>
                  <p className="text-xs text-foreground-500 font-label">24 April 2027</p>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary-100 text-xs font-label text-foreground-700">
                  <span className="w-2 h-2 rounded-full bg-accent-500" />
                  Planning
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <StatCard label="Invited" value={dashboardStats.totalInvited} />
                <StatCard label="Attending" value={dashboardStats.attending} accent />
                <StatCard label="Awaiting reply" value={dashboardStats.awaitingReply} />
                <StatCard label="Unable to attend" value={dashboardStats.unableToAttend} />
                <StatCard label="Planning complete" value={`${dashboardStats.planningProgress}%`} />
                <StatCard label="Supplier payments due" value={dashboardStats.supplierPaymentsDue} warn />
              </div>

              <div className="mt-6 pt-5 border-t border-secondary-100">
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 rounded-full bg-background-200 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary-500 transition-all"
                      style={{ width: `${dashboardStats.planningProgress}%` }}
                    />
                  </div>
                  <span className="text-xs font-label text-foreground-500 whitespace-nowrap">{dashboardStats.planningProgress}% complete</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StatCard({ label, value, accent: isAccent, warn }: { label: string; value: string | number; accent?: boolean; warn?: boolean }) {
  return (
    <div className="bg-background-50 rounded-lg p-4 text-center">
      <p className={`text-2xl font-heading font-semibold ${warn ? 'text-accent-600' : isAccent ? 'text-primary-600' : 'text-foreground-900'}`}>
        {value}
      </p>
      <p className="text-xs text-foreground-500 font-label mt-1">{label}</p>
    </div>
  );
}