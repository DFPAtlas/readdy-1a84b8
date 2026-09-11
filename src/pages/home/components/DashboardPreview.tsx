import { dashboardStats } from '@/mocks/vowora';
import ScrollReveal from '@/components/base/ScrollReveal';
import { Link } from 'react-router-dom';

export default function DashboardPreview() {
  return (
    <section className="bg-background-50 py-20 md:py-28">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          {/* Left content */}
          <div className="w-full lg:w-2/5 flex-shrink-0">
            <span className="section-label">Dashboard</span>
            <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl text-foreground-900 leading-tight">
              One <em className="font-light italic">calm</em> dashboard<br />
              for the whole wedding
            </h2>
            <p className="text-foreground-600 text-base leading-relaxed mt-4 max-w-md">
              Everything you need at a glance. Your countdown, guest totals, RSVP status, upcoming tasks and quick actions, all in one organised workspace.
            </p>
            <div className="flex gap-3 mt-6">
              <Link to="/signup" className="btn-primary">Preview dashboard</Link>
              <Link to="/features" className="btn-outline">Explore features</Link>
            </div>
          </div>

          {/* Right: Dashboard mockup */}
          <div className="w-full lg:w-3/5">
            <ScrollReveal direction="left" delay={250} duration={700}>
              <div className="bg-white border border-secondary-100 rounded-xl p-6 md:p-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="font-heading text-xl text-foreground-900">Wedding dashboard</p>
                    <p className="text-xs text-foreground-500 font-label">Emma &amp; James &middot; 24 April 2027</p>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-50 text-primary-700">
                    <span className="text-xl font-heading font-semibold">{dashboardStats.daysUntilWedding}</span>
                    <span className="text-xs font-label">days to go</span>
                  </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                  <MiniStat icon="ri-group-line" label="Invited" value={dashboardStats.totalInvited} />
                  <MiniStat icon="ri-check-double-line" label="Attending" value={dashboardStats.attending} color="text-accent-600" />
                  <MiniStat icon="ri-time-line" label="Awaiting" value={dashboardStats.awaitingReply} />
                  <MiniStat icon="ri-close-circle-line" label="Declined" value={dashboardStats.unableToAttend} />
                </div>

                {/* Progress */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-label text-foreground-600">Planning progress</span>
                    <span className="text-xs font-label font-medium text-foreground-900">{dashboardStats.planningProgress}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-background-200 overflow-hidden">
                    <div className="h-full rounded-full bg-primary-500" style={{ width: `${dashboardStats.planningProgress}%` }} />
                  </div>
                </div>

                {/* Quick actions */}
                <div className="flex flex-wrap gap-2 pt-4 border-t border-secondary-100">
                  {['Add guests', 'Create update', 'Review RSVPs', 'Edit website', 'Travel suggestions'].map((action) => (
                    <button key={action} className="whitespace-nowrap px-3 py-1.5 rounded-full bg-background-100 border border-secondary-200 text-xs font-label text-foreground-700 hover:bg-primary-50 hover:border-primary-200 transition-colors cursor-pointer">
                      {action}
                    </button>
                  ))}
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </div>
    </section>
  );
}

function MiniStat({ icon, label, value, color = 'text-foreground-800' }: { icon: string; label: string; value: string | number; color?: string }) {
  return (
    <div className="bg-background-50 rounded-lg p-4">
      <div className={`w-7 h-7 flex items-center justify-center rounded-md bg-background-200 mb-2 ${color}`}>
        <i className={`${icon} text-sm`} />
      </div>
      <p className={`text-lg font-heading font-semibold ${color}`}>{value}</p>
      <p className="text-xs text-foreground-500 font-label">{label}</p>
    </div>
  );
}