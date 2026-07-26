import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AppShell from '@/components/feature/AppShell';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { useGuestService } from '@/hooks/useGuestService';
import { supabase } from '@/lib/supabase';
import { isDemoMode } from '@/demo/demoConfig';
import { useDemoDataSafe } from '@/demo/useDemoDataSafe';
import { PUBLIC_SITE_URL } from '@/lib/env';

// ═══════════════════════════════════════════
// Shared helpers
// ═══════════════════════════════════════════

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr + 'T12:00:00');
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function countdownLabel(dateStr: string): string {
  const target = new Date(dateStr + 'T12:00:00');
  const now = new Date();
  if (target.toDateString() === now.toDateString()) return 'Today is the day!';
  if (target < now) return 'Celebrated!';
  return 'days to go';
}

function formatUKDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

// ═══════════════════════════════════════════
// Demo Dashboard — redesigned layout
// ═══════════════════════════════════════════

function DemoDashboard() {
  const navigate = useNavigate();
  const demoData = useDemoDataSafe();
  const { state, stats, markTaskComplete, markPaymentPaid, addDemoActivity } = demoData!;

  const w = state.wedding;
  const days = daysUntil(w.wedding_date);
  const cLabel = countdownLabel(w.wedding_date);
  const displayName = w.title || `${w.partner_one_name} & ${w.partner_two_name}`;

  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleMarkTask = (taskId: string) => {
    markTaskComplete(taskId);
    addDemoActivity({
      id: `demo-activity-task-${Date.now()}`,
      timestamp: new Date().toISOString(),
      message: `Task completed: ${state.tasks.find((t) => t.id === taskId)?.title ?? ''}`,
      category: 'tasks',
      related_guest: '',
      wedding_id: w.id,
    });
    showToast('Task marked complete — demo updated');
  };

  const handleMarkPaid = (paymentId: string) => {
    markPaymentPaid(paymentId);
    addDemoActivity({
      id: `demo-activity-pay-${Date.now()}`,
      timestamp: new Date().toISOString(),
      message: `Payment marked as paid — demo updated. No real payment was processed.`,
      category: 'payments',
      related_guest: '',
      wedding_id: w.id,
    });
    showToast('Demo updated — no real payment was processed.');
  };

  const completedTasks = state.tasks.filter((t) => t.status === 'completed').length;
  const totalTasks = state.tasks.length;
  const planningProgress = Math.round((completedTasks / Math.max(1, totalTasks)) * 40 + 30);

  return (
    <AppShell>
      {/* Toast */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-lg bg-accent-500 text-white text-sm font-label font-medium shadow-lg whitespace-nowrap">
          <i className="ri-check-line mr-2" />{toast}
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {/* ═══════ Hero ═══════ */}
        <div className="relative rounded-2xl bg-gradient-to-br from-primary-50 via-background-50 to-accent-50 border border-primary-100/60 p-6 md:p-8 mb-8 overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary-100/30 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent-100/30 rounded-full translate-y-1/3 -translate-x-1/4 blur-3xl pointer-events-none" />

          <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <p className="text-xs font-label text-foreground-400 uppercase tracking-widest mb-2">
                Welcome back, {w.partner_one_name}
              </p>
              <h1 className="font-heading text-3xl md:text-4xl lg:text-5xl text-foreground-900 leading-tight">
                {displayName}
              </h1>
              <p className="text-sm text-foreground-500 mt-2 font-label">
                {formatUKDate(w.wedding_date)} <span className="mx-2 text-foreground-300">·</span> {w.location}
              </p>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-white/80 backdrop-blur-sm border border-primary-100">
                <div className="text-center">
                  <span className="block font-heading text-3xl md:text-4xl font-semibold text-primary-600 leading-none">{days}</span>
                  <span className="block text-[10px] font-label text-foreground-500 uppercase tracking-wider mt-1">{cLabel}</span>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Link
                  to={`/w/${w.slug}`}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/80 backdrop-blur-sm border border-secondary-200 text-xs font-label text-foreground-600 hover:bg-white transition-colors cursor-pointer whitespace-nowrap"
                >
                  <i className="ri-eye-line text-sm" /> Preview site
                </Link>
                <Link
                  to="/guest/demo-session"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/80 backdrop-blur-sm border border-secondary-200 text-xs font-label text-foreground-600 hover:bg-white transition-colors cursor-pointer whitespace-nowrap"
                >
                  <i className="ri-user-line text-sm" /> View as guest
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Help banner */}
        <div className="mb-6 px-4 py-3.5 rounded-xl bg-accent-50 border border-accent-100 flex items-start gap-3">
          <div className="w-6 h-6 flex items-center justify-center text-accent-600 flex-shrink-0 mt-0.5">
            <i className="ri-lightbulb-line text-base" />
          </div>
          <div>
            <p className="text-sm font-label font-medium text-accent-900">Welcome to your planning dashboard</p>
            <p className="text-xs text-accent-700 mt-0.5 leading-relaxed">This is a live demo of Emma &amp; James’s wedding workspace. Explore every section — guests, budget, seating, gallery and more. Tick tasks off, preview the guest portal as Oliver, or open the live photo wall. All data is demo-only; nothing is stored permanently.</p>
          </div>
        </div>

        {/* ═══════ Stat cards ═══════ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Guests */}
          <div onClick={() => navigate('/app/guests')} className="group rounded-xl p-5 cursor-pointer transition-all hover:-translate-y-0.5 bg-white border border-secondary-100 hover:border-primary-200">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-primary-50 text-primary-500">
                <i className="ri-group-line text-lg" />
              </div>
              <span className="text-[10px] font-label text-foreground-400 uppercase tracking-wider">Guests</span>
            </div>
            <p className="text-3xl font-heading font-semibold text-foreground-900">{stats.totalInvited}</p>
            <div className="flex items-center gap-2 mt-3 text-[11px] font-label">
              <span className="inline-flex items-center gap-1 text-accent-600"><span className="w-1.5 h-1.5 rounded-full bg-accent-500" />{stats.attending} attending</span>
              <span className="inline-flex items-center gap-1 text-secondary-500"><span className="w-1.5 h-1.5 rounded-full bg-secondary-400" />{stats.awaitingReply} awaiting</span>
            </div>
          </div>

          {/* Invitations */}
          <div onClick={() => navigate('/app/invitations')} className="group rounded-xl p-5 cursor-pointer transition-all hover:-translate-y-0.5 bg-white border border-secondary-100 hover:border-accent-200">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-accent-50 text-accent-500">
                <i className="ri-mail-send-line text-lg" />
              </div>
              <span className="text-[10px] font-label text-foreground-400 uppercase tracking-wider">Invitations</span>
            </div>
            <p className="text-3xl font-heading font-semibold text-foreground-900">{state.invitations.length}</p>
            <div className="flex items-center gap-2 mt-3 text-[11px] font-label">
              <span className="inline-flex items-center gap-1 text-accent-600"><span className="w-1.5 h-1.5 rounded-full bg-accent-500" />{state.invitations.filter((i) => i.status === 'sent').length} sent</span>
              <span className="inline-flex items-center gap-1 text-secondary-500"><span className="w-1.5 h-1.5 rounded-full bg-secondary-400" />{state.invitations.filter((i) => i.status === 'draft').length} drafts</span>
            </div>
          </div>

          {/* Budget */}
          <div onClick={() => navigate('/app/budget')} className="group rounded-xl p-5 cursor-pointer transition-all hover:-translate-y-0.5 bg-white border border-secondary-100 hover:border-secondary-300">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-secondary-100 text-secondary-600">
                <i className="ri-money-pound-circle-line text-lg" />
              </div>
              <span className="text-[10px] font-label text-foreground-400 uppercase tracking-wider">Budget</span>
            </div>
            <p className="text-3xl font-heading font-semibold text-foreground-900">£{(stats.budgetPlanned / 1000).toFixed(0)}k</p>
            <div className="flex items-center gap-2 mt-3 text-[11px] font-label">
              <span className="inline-flex items-center gap-1 text-accent-600">£{(stats.budgetCommitted / 1000).toFixed(1)}k committed</span>
              <span className="inline-flex items-center gap-1 text-emerald-600">£{(stats.budgetPaid / 1000).toFixed(1)}k paid</span>
            </div>
          </div>

          {/* Seating */}
          <div onClick={() => navigate('/app/seating')} className="group rounded-xl p-5 cursor-pointer transition-all hover:-translate-y-0.5 bg-white border border-secondary-100 hover:border-primary-200">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-primary-50 text-primary-500">
                <i className="ri-layout-grid-line text-lg" />
              </div>
              <span className="text-[10px] font-label text-foreground-400 uppercase tracking-wider">Seating</span>
            </div>
            <p className="text-3xl font-heading font-semibold text-foreground-900">{stats.seatedGuests}</p>
            <div className="flex items-center gap-2 mt-3 text-[11px] font-label">
              <span className="inline-flex items-center gap-1 text-secondary-500">{stats.tableCount} tables</span>
              <span className={`inline-flex items-center gap-1 ${stats.unseatedGuests > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${stats.unseatedGuests > 0 ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                {stats.unseatedGuests} unassigned
              </span>
            </div>
          </div>
        </div>

        {/* ═══════ Main content grid ═══════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ── Left column (8/12) ── */}
          <div className="lg:col-span-8 space-y-6">
            {/* Planning progress */}
            <div className="rounded-xl bg-white border border-secondary-100 p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="font-label text-sm font-semibold text-foreground-900">Planning progress</h2>
                  <p className="text-xs text-foreground-400 mt-0.5">{completedTasks} of {totalTasks} tasks completed</p>
                </div>
                <span className="text-2xl font-heading font-semibold text-primary-600">{planningProgress}%</span>
              </div>
              <div className="h-2 rounded-full bg-background-200 overflow-hidden mb-6">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary-400 to-primary-500 transition-all duration-700"
                  style={{ width: `${planningProgress}%` }}
                />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3">
                {[
                  { label: 'Wedding details', done: true, icon: 'ri-heart-line' },
                  { label: 'Guest list', done: stats.totalInvited > 0, icon: 'ri-group-line' },
                  { label: 'Invitations', done: state.invitations.length > 0, icon: 'ri-mail-send-line' },
                  { label: 'Budget', done: stats.budgetPlanned > 0, icon: 'ri-money-pound-circle-line' },
                  { label: 'Seating', done: stats.seatedGuests > 0, icon: 'ri-layout-grid-line' },
                  { label: 'Travel', done: stats.travelPlacesCount > 0, icon: 'ri-map-pin-line' },
                  { label: 'Gallery', done: stats.galleryApprovedCount > 0, icon: 'ri-image-line' },
                  { label: 'Tasks', done: completedTasks > 0, icon: 'ri-calendar-check-line' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2.5">
                    <div className={`w-6 h-6 flex items-center justify-center rounded-full flex-shrink-0 ${item.done ? 'bg-accent-100 text-accent-600' : 'bg-background-100 text-foreground-300'}`}>
                      <i className={`${item.done ? 'ri-check-line' : item.icon} text-xs`} />
                    </div>
                    <span className={`text-xs font-label ${item.done ? 'text-foreground-700' : 'text-foreground-400'}`}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick actions — redesigned as icon grid */}
            <div className="rounded-xl bg-white border border-secondary-100 p-6">
              <h2 className="font-label text-sm font-semibold text-foreground-900 mb-4">Quick actions</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Add guest', icon: 'ri-user-add-line', to: '/app/guests/new' },
                  { label: 'Open website', icon: 'ri-global-line', to: `/w/${w.slug}`, isLink: true },
                  { label: 'Guest portal', icon: 'ri-user-line', to: '/guest/demo-session', isLink: true },
                  { label: 'Create design', icon: 'ri-paint-brush-line', to: '/app/invitations/design/new' },
                  { label: 'Budget', icon: 'ri-money-pound-circle-line', to: '/app/budget' },
                  { label: 'Seating', icon: 'ri-layout-grid-line', to: '/app/seating' },
                  { label: 'Invitations', icon: 'ri-mail-send-line', to: '/app/invitations' },
                  { label: 'Gallery', icon: 'ri-image-line', to: '/app/gallery-control' },
                  { label: 'Live wall', icon: 'ri-tv-line', to: `/live-wall/${w.slug}`, isLink: true },
                ].map((action) => (
                  action.isLink ? (
                    <Link
                      key={action.label}
                      to={action.to}
                      className="flex flex-col items-center gap-2 p-3 rounded-lg border border-secondary-100 hover:border-primary-200 hover:bg-primary-50/50 transition-all text-center cursor-pointer"
                    >
                      <i className={`${action.icon} text-lg text-primary-500`} />
                      <span className="text-xs font-label text-foreground-700">{action.label}</span>
                    </Link>
                  ) : (
                    <button
                      key={action.label}
                      onClick={() => navigate(action.to)}
                      className="flex flex-col items-center gap-2 p-3 rounded-lg border border-secondary-100 hover:border-primary-200 hover:bg-primary-50/50 transition-all text-center cursor-pointer"
                    >
                      <i className={`${action.icon} text-lg text-primary-500`} />
                      <span className="text-xs font-label text-foreground-700">{action.label}</span>
                    </button>
                  )
                ))}
              </div>
            </div>

            {/* Upcoming tasks */}
            <div className="rounded-xl bg-white border border-secondary-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-label text-sm font-semibold text-foreground-900">Upcoming tasks</h2>
                <button onClick={() => navigate('/app/tasks')} className="text-xs text-primary-600 font-label hover:text-primary-700 cursor-pointer whitespace-nowrap">
                  View all
                </button>
              </div>
              <div className="space-y-2">
                {state.tasks.filter((t) => t.status !== 'completed').slice(0, 5).map((task) => (
                  <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg bg-background-50 border border-background-200 hover:border-primary-200 transition-colors group">
                    <button
                      onClick={() => handleMarkTask(task.id)}
                      className={`w-5 h-5 flex items-center justify-center rounded border-2 flex-shrink-0 cursor-pointer transition-colors ${task.priority === 'high' ? 'border-amber-400 hover:border-amber-500 hover:bg-amber-50' : 'border-secondary-300 hover:border-primary-400 hover:bg-primary-50'}`}
                      title="Mark complete"
                    >
                      <i className="ri-check-line text-[10px] text-foreground-400 group-hover:text-primary-500" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground-800 truncate">{task.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {task.due_date && <span className="text-[10px] text-foreground-400 font-label">{formatUKDate(task.due_date)}</span>}
                        <span className={`text-[10px] font-label px-1.5 py-0.5 rounded-full ${task.priority === 'high' ? 'bg-amber-100 text-amber-700' : task.priority === 'medium' ? 'bg-secondary-100 text-secondary-600' : 'bg-background-100 text-foreground-500'}`}>
                          {task.priority}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {state.tasks.filter((t) => t.status !== 'completed').length === 0 && (
                <div className="text-center py-8">
                  <div className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-accent-50 text-accent-500 mb-3">
                    <i className="ri-check-double-line text-xl" />
                  </div>
                  <p className="text-sm font-label text-foreground-600">All tasks completed!</p>
                  <p className="text-xs text-foreground-400 mt-1">You are on top of everything</p>
                </div>
              )}
            </div>

            {/* Recent activity */}
            <div className="rounded-xl bg-white border border-secondary-100 p-6">
              <h2 className="font-label text-sm font-semibold text-foreground-900 mb-4">Recent activity</h2>
              <div className="space-y-3">
                {state.activityFeed.slice(0, 6).map((a) => (
                  <div key={a.id} className="flex items-start gap-3">
                    <div className={`w-8 h-8 flex items-center justify-center rounded-full flex-shrink-0 mt-0.5 ${
                      a.category === 'rsvp' ? 'bg-accent-100 text-accent-600' :
                      a.category === 'payments' ? 'bg-emerald-100 text-emerald-600' :
                      a.category === 'gallery' ? 'bg-primary-100 text-primary-600' :
                      a.category === 'seating' ? 'bg-secondary-100 text-secondary-600' :
                      'bg-background-100 text-foreground-400'
                    }`}>
                      <i className={`${
                        a.category === 'rsvp' ? 'ri-check-double-line' :
                        a.category === 'dietary' ? 'ri-restaurant-line' :
                        a.category === 'payments' ? 'ri-bank-card-line' :
                        a.category === 'gallery' ? 'ri-image-line' :
                        a.category === 'seating' ? 'ri-layout-grid-line' :
                        a.category === 'tasks' ? 'ri-calendar-check-line' :
                        'ri-information-line'
                      } text-xs`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-foreground-700 leading-snug">{a.message}</p>
                      <p className="text-[10px] text-foreground-400 font-label mt-0.5">
                        {new Date(a.timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Right column (4/12) ── */}
          <div className="lg:col-span-4 space-y-6">
            {/* RSVP overview */}
            <div className="rounded-xl bg-white border border-secondary-100 p-5">
              <h2 className="font-label text-sm font-semibold text-foreground-900 mb-5">RSVP overview</h2>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-accent-500" />
                      <span className="text-xs text-foreground-600 font-label">Attending</span>
                    </div>
                    <span className="text-sm font-heading font-semibold text-accent-600">{stats.attending}</span>
                  </div>
                  <div className="w-full bg-background-200 rounded-full h-2">
                    <div className="bg-accent-500 h-2 rounded-full" style={{ width: `${stats.totalInvited > 0 ? Math.round((stats.attending / stats.totalInvited) * 100) : 0}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-secondary-400" />
                      <span className="text-xs text-foreground-600 font-label">Awaiting reply</span>
                    </div>
                    <span className="text-sm font-heading font-semibold text-foreground-700">{stats.awaitingReply}</span>
                  </div>
                  <div className="w-full bg-background-200 rounded-full h-2">
                    <div className="bg-secondary-400 h-2 rounded-full" style={{ width: `${stats.totalInvited > 0 ? Math.round((stats.awaitingReply / stats.totalInvited) * 100) : 0}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-foreground-300" />
                      <span className="text-xs text-foreground-600 font-label">Declined</span>
                    </div>
                    <span className="text-sm font-heading font-semibold text-foreground-500">{stats.declined}</span>
                  </div>
                  <div className="w-full bg-background-200 rounded-full h-2">
                    <div className="bg-foreground-300 h-2 rounded-full" style={{ width: `${stats.totalInvited > 0 ? Math.round((stats.declined / stats.totalInvited) * 100) : 0}%` }} />
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-secondary-100">
                <span className="text-xs text-foreground-500 font-label">Response rate</span>
                <span className="text-sm font-heading font-semibold text-foreground-900">
                  {stats.totalInvited > 0 ? Math.round(((stats.attending + stats.declined) / stats.totalInvited) * 100) : 0}%
                </span>
              </div>
              <button onClick={() => navigate('/app/guests')} className="btn-outline w-full text-xs py-2.5 mt-4 cursor-pointer whitespace-nowrap">
                Manage guests
              </button>
            </div>

            {/* Upcoming payments */}
            <div className="rounded-xl bg-white border border-secondary-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-label text-sm font-semibold text-foreground-900">Upcoming payments</h2>
                <button onClick={() => navigate('/app/budget/payments')} className="text-xs text-primary-600 font-label hover:text-primary-700 cursor-pointer whitespace-nowrap">
                  View all
                </button>
              </div>
              <div className="space-y-2">
                {state.payments.filter((p) => p.status !== 'paid').slice(0, 4).map((p) => {
                  const expense = state.expenses.find((e) => e.id === p.expense_id);
                  const supplier = state.suppliers.find((s) => s.id === expense?.supplier_id);
                  return (
                    <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-background-50 border border-background-200">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-foreground-800 font-label truncate">{p.description}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-foreground-400">{p.due_date ? formatUKDate(p.due_date) : ''}</span>
                          <span className={`text-[10px] font-label ${p.status === 'overdue' ? 'text-red-600' : 'text-amber-600'}`}>
                            {p.status === 'overdue' ? 'Overdue' : 'Pending'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                        <span className="text-xs font-label font-semibold text-foreground-900 whitespace-nowrap">£{p.amount.toLocaleString()}</span>
                        <button
                          onClick={() => handleMarkPaid(p.id)}
                          className="text-[10px] text-primary-600 font-label hover:text-primary-700 cursor-pointer whitespace-nowrap"
                        >
                          Mark paid
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              {state.payments.filter((p) => p.status !== 'paid').length === 0 && (
                <div className="text-center py-5">
                  <div className="w-8 h-8 mx-auto flex items-center justify-center rounded-full bg-emerald-50 text-emerald-500 mb-2">
                    <i className="ri-check-double-line text-sm" />
                  </div>
                  <p className="text-xs font-label text-foreground-500">All payments up to date</p>
                </div>
              )}
            </div>

            {/* Wedding website + Guest portal combined */}
            <div className="rounded-xl bg-white border border-secondary-100 p-5">
              <h2 className="font-label text-sm font-semibold text-foreground-900 mb-4">Share & preview</h2>

              <div className="space-y-3">
                {/* Website */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-background-50 border border-background-200">
                  <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-primary-50 text-primary-500 flex-shrink-0">
                    <i className="ri-global-line text-base" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-label font-medium text-foreground-800 truncate">{displayName}</p>
                    <p className="text-[10px] text-foreground-400">/w/{w.slug}</p>
                  </div>
                  <Link to={`/w/${w.slug}`} className="text-[10px] text-primary-600 font-label hover:text-primary-700 cursor-pointer whitespace-nowrap flex-shrink-0">
                    Preview
                  </Link>
                </div>

                {/* Guest portal */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-background-50 border border-background-200">
                  <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-accent-50 text-accent-500 flex-shrink-0">
                    <i className="ri-user-line text-base" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-label font-medium text-foreground-800">Guest portal</p>
                    <p className="text-[10px] text-foreground-400">Oliver Bennett — Attending</p>
                  </div>
                  <Link to="/guest/demo-session" className="text-[10px] text-accent-600 font-label hover:text-accent-700 cursor-pointer whitespace-nowrap flex-shrink-0">
                    View as Oliver
                  </Link>
                </div>

                {/* Live wall */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-background-50 border border-background-200">
                  <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-secondary-100 text-secondary-500 flex-shrink-0">
                    <i className="ri-tv-line text-base" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-label font-medium text-foreground-800">Live photo wall</p>
                    <p className="text-[10px] text-foreground-400">{stats.galleryOnWallCount ?? 0} photos on display</p>
                  </div>
                  <Link to={`/live-wall/${w.slug}`} className="text-[10px] text-secondary-600 font-label hover:text-secondary-700 cursor-pointer whitespace-nowrap flex-shrink-0">
                    Open wall
                  </Link>
                </div>
              </div>
            </div>

            {/* Mini stats row — Travel + Gallery */}
            <div className="grid grid-cols-2 gap-4">
              <div onClick={() => navigate('/app/travel')} className="rounded-xl bg-white border border-secondary-100 p-4 text-center cursor-pointer hover:border-primary-200 transition-colors">
                <div className="w-10 h-10 mx-auto flex items-center justify-center rounded-lg bg-secondary-50 text-secondary-500 mb-2">
                  <i className="ri-map-pin-line text-lg" />
                </div>
                <p className="text-2xl font-heading font-semibold text-foreground-900">{stats.travelPlacesCount}</p>
                <p className="text-[11px] text-foreground-500 font-label mt-0.5">Recommendations</p>
              </div>
              <div onClick={() => navigate('/app/gallery-control')} className="rounded-xl bg-white border border-secondary-100 p-4 text-center cursor-pointer hover:border-primary-200 transition-colors">
                <div className="w-10 h-10 mx-auto flex items-center justify-center rounded-lg bg-primary-50 text-primary-500 mb-2">
                  <i className="ri-image-line text-lg" />
                </div>
                <p className="text-2xl font-heading font-semibold text-foreground-900">{stats.galleryApprovedCount}</p>
                <p className="text-[11px] text-foreground-500 font-label mt-0.5">Approved photos</p>
                <p className="text-[10px] text-foreground-400">{stats.galleryPendingCount ?? 0} pending</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

// ═══════════════════════════════════════════
// Normal (Supabase) Dashboard
// ═══════════════════════════════════════════

function NormalDashboard() {
  const navigate = useNavigate();
  const { wedding, weddingId, weddingState, loading: weddingLoading, error: weddingError, refreshWeddings } = useActiveWedding();
  const svc = useGuestService();
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [upcomingTasks, setUpcomingTasks] = useState<{ id: string; title: string; priority: string; due_date: string | null; status: string }[]>([]);

  const [stats, setStats] = useState({
    daysUntilWedding: 0,
    attending: 0,
    totalInvited: 0,
    awaitingReply: 0,
    unableToAttend: 0,
    declined: 0,
    planningProgress: 0,
    householdCount: 0,
    dayGuests: 0,
    eveningOnly: 0,
    plusOnes: 0,
    missingContact: 0,
    notReady: 0,
    dietary: 0,
    allergy: 0,
    access: 0,
    invitationsCreated: 0,
    invitationsDraft: 0,
    invitationsReady: 0,
    householdsWithoutInv: 0,
    guestsUnlinked: 0,
    templatesAvailable: 0,
    activeLinks: 0,
    revokedLinks: 0,
    portalEnabled: false,
    budgetPlanned: 0,
    budgetCommitted: 0,
    budgetPaid: 0,
    budgetRemaining: 0,
    hasBudget: false,
    seatingPlanStarted: false,
    workingPlanName: '',
    seatedGuests: 0,
    unseatedGuests: 0,
  });

  // ── Supabase data fetch ──
  useEffect(() => {
    let cancelled = false;
    if (!weddingId) {
      setLoading(false);
      return;
    }
    const fetchAll = async () => {
      try {
        const [weddingRes, guestStats, allGuestsRes, householdsRes, invRes, draftInvRes, readyInvRes, tmplRes, allRecipientsRes, allInvRes, activeTokenRes, revokedTokenRes, portalRes, budgetRes, budgetExpRes, budgetPayRes, taskRes] = await Promise.all([
          supabase.from('weddings').select('title, partner_one_name, partner_two_name, wedding_date, slug').eq('id', weddingId).maybeSingle(),
          svc.getStats(),
          supabase.from('guests').select('id').eq('wedding_id', weddingId).eq('status', 'active'),
          supabase.from('guest_households').select('id').eq('wedding_id', weddingId).eq('status', 'active'),
          supabase.from('invitations').select('id', { count: 'exact', head: true }).eq('wedding_id', weddingId).not('status', 'eq', 'archived'),
          supabase.from('invitations').select('id', { count: 'exact', head: true }).eq('wedding_id', weddingId).eq('status', 'draft'),
          supabase.from('invitations').select('id', { count: 'exact', head: true }).eq('wedding_id', weddingId).eq('status', 'ready'),
          supabase.from('invitation_templates').select('id', { count: 'exact', head: true }).eq('wedding_id', weddingId).eq('status', 'active'),
          supabase.from('invitation_recipients').select('guest_id').eq('wedding_id', weddingId),
          supabase.from('invitations').select('household_id').eq('wedding_id', weddingId).in('status', ['draft', 'ready', 'sent']).not('household_id', 'is', null),
          supabase.from('invitation_access_tokens').select('id', { count: 'exact', head: true }).eq('wedding_id', weddingId).eq('status', 'active'),
          supabase.from('invitation_access_tokens').select('id', { count: 'exact', head: true }).eq('wedding_id', weddingId).eq('status', 'revoked'),
          supabase.from('guest_portal_settings').select('portal_enabled').eq('wedding_id', weddingId).maybeSingle(),
          supabase.from('wedding_budgets').select('planned_total').eq('wedding_id', weddingId).maybeSingle(),
          supabase.from('budget_expenses').select('agreed_amount, quoted_amount, payment_status').eq('wedding_id', weddingId).eq('status', 'active'),
          supabase.from('budget_payments').select('amount, status').eq('wedding_id', weddingId),
          supabase.from('wedding_tasks').select('id, title, priority, due_date, status').eq('wedding_id', weddingId).in('status', ['pending', 'in_progress']).order('due_date', { ascending: true, nullsFirst: false }).limit(5),
        ]);

        if (cancelled) return;
        if (weddingRes.error) throw weddingRes.error;

        const w = weddingRes.data;
        const totalInvited = guestStats.total;
        const householdCount = (householdsRes.data || []).length;
        const days = w?.wedding_date ? daysUntil(w.wedding_date) : 0;

        const invitationsCreated = invRes.count || 0;
        const invitationsDraft = draftInvRes.count || 0;
        const invitationsReady = readyInvRes.count || 0;
        const templatesAvailable = tmplRes.count || 0;

        const linkedGuestIds = new Set((allRecipientsRes.data || []).map((r: { guest_id: string }) => r.guest_id));
        const guestsUnlinked = (allGuestsRes.data || []).filter((g: { id: string }) => !linkedGuestIds.has(g.id)).length;

        const linkedHHIds = new Set((allInvRes.data || []).map((r: { household_id: string }) => r.household_id));
        const householdsWithoutInv = (householdsRes.data || []).filter((h: { id: string }) => !linkedHHIds.has(h.id)).length;

        const workingPlanRes = await supabase.from('seating_plans').select('id, name').eq('wedding_id', weddingId).eq('is_working', true).maybeSingle();
        let seatedCount = 0;
        let unseatedCount = 0;
        if (workingPlanRes.data) {
          const [saRes, gsRes] = await Promise.all([
            supabase.from('seating_assignments').select('id').eq('plan_id', workingPlanRes.data.id),
            supabase.from('guests').select('id').eq('wedding_id', weddingId).in('rsvp_status', ['accepted', 'pending']).eq('status', 'active'),
          ]);
          seatedCount = (saRes.data || []).length;
          const eligible = (gsRes.data || []).length;
          unseatedCount = Math.max(0, eligible - seatedCount);
        }

        setStats({
          daysUntilWedding: days,
          attending: guestStats.attending,
          totalInvited,
          awaitingReply: guestStats.awaiting,
          unableToAttend: guestStats.declined,
          declined: guestStats.declined,
          planningProgress: Math.min(100, Math.round(((totalInvited > 0 ? 1 : 0)) * 40 + 30)),
          householdCount,
          dayGuests: guestStats.dayGuests,
          eveningOnly: guestStats.eveningOnly,
          plusOnes: guestStats.plusOnes,
          missingContact: guestStats.missingContact,
          notReady: guestStats.notReady,
          dietary: guestStats.dietaryCount,
          allergy: guestStats.allergyCount,
          access: guestStats.accessibilityCount,
          invitationsCreated,
          invitationsDraft,
          invitationsReady,
          householdsWithoutInv,
          guestsUnlinked,
          templatesAvailable,
          activeLinks: activeTokenRes.count || 0,
          revokedLinks: revokedTokenRes.count || 0,
          portalEnabled: portalRes?.data?.portal_enabled || false,
          budgetPlanned: budgetRes?.data?.planned_total || 0,
          budgetCommitted: (budgetExpRes.data || []).filter((e: Record<string, unknown>) => ['booked', 'deposit_paid', 'part_paid', 'paid'].includes(e.payment_status as string)).reduce((s: number, e: Record<string, unknown>) => s + (Number(e.agreed_amount) || Number(e.quoted_amount) || 0), 0),
          budgetPaid: (budgetPayRes.data || []).filter((p: Record<string, unknown>) => p.status === 'paid').reduce((s: number, p: Record<string, unknown>) => s + Number(p.amount), 0),
          budgetRemaining: (budgetRes?.data?.planned_total || 0) - (budgetPayRes.data || []).filter((p: Record<string, unknown>) => p.status === 'paid').reduce((s: number, p: Record<string, unknown>) => s + Number(p.amount), 0),
          hasBudget: !!budgetRes?.data,
          seatingPlanStarted: !!workingPlanRes.data,
          workingPlanName: workingPlanRes.data?.name || '',
          seatedGuests: seatedCount,
          unseatedGuests: unseatedCount,
        });

        // Tasks
        const taskData = (taskRes.data || []) as { id: string; title: string; priority: string; due_date: string | null; status: string }[];
        setUpcomingTasks(taskData);
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    if (weddingId) fetchAll();
    return () => { cancelled = true; };
  }, [weddingId]);

  const handleCopyLink = async () => {
    if (!wedding?.slug) return;
    const slug = wedding.slug;
    const baseUrl = PUBLIC_SITE_URL || window.location.origin;
    const url = `${baseUrl}/w/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const slug = wedding?.slug || '';
  const baseUrl = PUBLIC_SITE_URL || window.location.origin;
  const fullUrl = slug ? `${baseUrl}/w/${slug}` : '';
  const partnerOne = wedding?.partner_one_name || '';
  const partnerTwo = wedding?.partner_two_name || '';
  const title = wedding?.title || (partnerOne && partnerTwo ? `${partnerOne} & ${partnerTwo}` : 'Wedding');
  const dateDisplay = wedding?.wedding_date
    ? new Date(wedding.wedding_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  const shareText = encodeURIComponent(`You're invited to ${partnerOne} & ${partnerTwo}'s wedding! View all the details and RSVP here:`);
  const shareUrl = encodeURIComponent(fullUrl);
  const emailHref = `mailto:?subject=${encodeURIComponent(`You're invited — ${title}`)}&body=${shareText}%20${shareUrl}`;
  const whatsappHref = `https://wa.me/?text=${shareText}%20${shareUrl}`;
  const facebookHref = `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`;

  if (weddingState === 'no_wedding') {
    return (
      <AppShell>
        <div className="max-w-lg mx-auto text-center py-20">
          <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-primary-50 text-primary-500 mb-6">
            <i className="ri-heart-add-line text-2xl" />
          </div>
          <h1 className="font-heading text-2xl text-foreground-900 mb-3">Create your first wedding workspace</h1>
          <p className="text-sm text-foreground-500 mb-8 max-w-sm mx-auto">
            Onboarding will guide you through creating your wedding, adding venues, configuring settings, and setting up your planning workspace.
          </p>
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={() => navigate('/app/onboarding')}
              className="px-6 py-2.5 rounded-lg bg-primary-500 text-background-50 text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
            >
              Start wedding setup
            </button>
            <button
              onClick={() => navigate('/')}
              className="text-sm text-foreground-500 hover:text-foreground-700 cursor-pointer whitespace-nowrap"
            >
              Return to account
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  if (weddingState === 'access_denied') {
    return (
      <AppShell>
        <div className="max-w-lg mx-auto text-center py-20">
          <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-amber-50 text-amber-500 mb-6">
            <i className="ri-shield-user-line text-2xl" />
          </div>
          <h1 className="font-heading text-2xl text-foreground-900 mb-3">You no longer have access to this wedding</h1>
          <p className="text-sm text-foreground-500 mb-8 max-w-sm mx-auto">
            {weddingError || 'Your membership may have been revoked or the wedding may have been removed.'}
          </p>
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={() => refreshWeddings()}
              className="px-6 py-2.5 rounded-lg bg-primary-500 text-background-50 text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
            >
              Switch wedding
            </button>
            <button
              onClick={() => navigate('/')}
              className="text-sm text-foreground-500 hover:text-foreground-700 cursor-pointer whitespace-nowrap"
            >
              Return to dashboard
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  if (weddingLoading || loading) {
    return (
      <AppShell>
        <div className="max-w-6xl mx-auto flex items-center justify-center py-20">
          <div className="flex items-center gap-3 text-foreground-500">
            <i className="ri-loader-4-line animate-spin text-xl" />
            <span className="text-sm">Loading dashboard...</span>
          </div>
        </div>
      </AppShell>
    );
  }

  if (error || weddingError) {
    return (
      <AppShell>
        <div className="max-w-6xl mx-auto text-center py-20">
          <p className="text-sm text-red-600 mb-4">{error || weddingError}</p>
          <button onClick={() => refreshWeddings()} className="text-sm text-primary-600 cursor-pointer hover:text-primary-700 whitespace-nowrap">
            Try again
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="font-heading text-2xl md:text-3xl text-foreground-900">{title}</h1>
            <p className="text-sm text-foreground-500 mt-1">{dateDisplay} &middot; Planning in progress</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-secondary-200">
              <span className="font-heading text-2xl font-semibold text-primary-600">{stats.daysUntilWedding}</span>
              <span className="text-xs font-label text-foreground-500">days to go</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border border-secondary-100 rounded-xl p-5">
            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary-50 text-primary-600 mb-3">
              <i className="ri-check-double-line text-sm" />
            </div>
            <p className="text-2xl font-heading font-semibold text-foreground-900">{stats.planningProgress}%</p>
            <p className="text-xs text-foreground-500 font-label mt-1">Setup complete</p>
          </div>
          <div onClick={() => navigate(`/w/${slug}`)} className="bg-white border border-secondary-100 rounded-xl p-5 cursor-pointer hover:border-primary-300 transition-colors">
            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-accent-50 text-accent-600 mb-3">
              <i className="ri-global-line text-sm" />
            </div>
            <p className="text-sm font-label font-medium text-accent-600">Published</p>
            <p className="text-xs text-foreground-500 mt-1">Your guest page is live</p>
          </div>
          <div className="bg-white border border-secondary-100 rounded-xl p-5">
            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-secondary-50 text-secondary-600 mb-3">
              <i className="ri-group-line text-sm" />
            </div>
            <p className="text-2xl font-heading font-semibold text-foreground-900">{stats.dayGuests}</p>
            <p className="text-xs text-foreground-500 font-label mt-1">Day guests</p>
          </div>
          <div className="bg-white border border-secondary-100 rounded-xl p-5">
            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary-50 text-primary-600 mb-3">
              <i className="ri-home-4-line text-sm" />
            </div>
            <p className="text-2xl font-heading font-semibold text-foreground-900">{stats.householdCount}</p>
            <p className="text-xs text-foreground-500 font-label mt-1">Households</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-secondary-100 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-accent-50 text-accent-600">
                  <i className="ri-share-line text-sm" />
                </div>
                <div>
                  <h2 className="font-label text-sm font-semibold text-foreground-900">Your guest page</h2>
                  <p className="text-xs text-foreground-500">Share this link with your guests</p>
                </div>
              </div>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-background-50 border border-secondary-200">
                  <i className="ri-link text-foreground-400 text-sm flex-shrink-0" />
                  <span className="text-sm text-foreground-700 truncate">{fullUrl}</span>
                </div>
                <button onClick={handleCopyLink} className="px-4 py-2.5 rounded-lg bg-primary-500 text-background-50 text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5">
                  {copied ? <><i className="ri-check-line text-sm" />Copied</> : <><i className="ri-file-copy-line text-sm" />Copy</>}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                <a href={emailHref} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-secondary-200 text-sm font-label text-foreground-600 hover:bg-background-100 transition-colors cursor-pointer whitespace-nowrap"><i className="ri-mail-line text-sm" />Email</a>
                <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-lg border border-secondary-200 text-sm font-label text-foreground-600 hover:bg-background-100 transition-colors cursor-pointer whitespace-nowrap"><i className="ri-whatsapp-line text-sm" />WhatsApp</a>
                <a href={facebookHref} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-lg border border-secondary-200 text-sm font-label text-foreground-600 hover:bg-background-100 transition-colors cursor-pointer whitespace-nowrap"><i className="ri-facebook-line text-sm" />Facebook</a>
                <button onClick={() => navigate(`/w/${slug}`)} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-secondary-200 text-sm font-label text-foreground-600 hover:bg-background-100 transition-colors cursor-pointer whitespace-nowrap"><i className="ri-eye-line text-sm" />Preview</button>
              </div>
            </div>

            <div className="bg-white border border-secondary-100 rounded-xl p-5">
              <h2 className="font-label text-sm font-semibold text-foreground-900 mb-4">Quick actions</h2>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => navigate('/app/wedding')} className="btn-outline text-xs py-2 cursor-pointer"><i className="ri-pencil-line mr-1.5" />Edit wedding details</button>
                <button onClick={() => navigate('/app/guests')} className="btn-outline text-xs py-2 cursor-pointer"><i className="ri-group-line mr-1.5" />Manage guests</button>
                <button onClick={() => navigate('/app/invitations')} className="btn-outline text-xs py-2 cursor-pointer"><i className="ri-mail-send-line mr-1.5" />Send invitations</button>
                <button onClick={() => navigate('/app/invitations/design/new')} className="btn-outline text-xs py-2 cursor-pointer"><i className="ri-paint-brush-line mr-1.5" />Create design</button>
                <button onClick={() => navigate('/app/travel')} className="btn-outline text-xs py-2 cursor-pointer"><i className="ri-compass-3-line mr-1.5" />Travel Concierge</button>
                <button onClick={() => navigate('/app/tasks')} className="btn-outline text-xs py-2 cursor-pointer"><i className="ri-calendar-check-line mr-1.5" />Manage tasks</button>
                <button onClick={() => navigate('/app/suppliers')} className="btn-outline text-xs py-2 cursor-pointer"><i className="ri-contacts-book-line mr-1.5" />Manage suppliers</button>
                <button onClick={() => navigate('/app/updates')} className="btn-outline text-xs py-2 cursor-pointer"><i className="ri-mail-send-line mr-1.5" />Email campaigns</button>
                <button onClick={() => navigate('/app/settings')} className="btn-outline text-xs py-2 cursor-pointer"><i className="ri-settings-3-line mr-1.5" />Settings</button>
              </div>
            </div>

            <div className="bg-white border border-secondary-100 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-label text-sm font-semibold text-foreground-900">Upcoming tasks</h2>
                <button onClick={() => navigate('/app/tasks')} className="text-xs text-primary-600 font-label hover:text-primary-700 cursor-pointer whitespace-nowrap">View all</button>
              </div>
              {upcomingTasks.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-background-100 text-foreground-300 mb-3">
                    <i className="ri-calendar-check-line text-xl" />
                  </div>
                  <p className="text-sm text-foreground-500">No pending tasks</p>
                  <button onClick={() => navigate('/app/tasks')} className="text-xs text-primary-600 font-label hover:text-primary-700 cursor-pointer mt-2 whitespace-nowrap">
                    <i className="ri-add-line mr-1" />Add your first task
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {upcomingTasks.map((task: { id: string; title: string; priority: string; due_date: string | null; status: string }) => (
                    <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg bg-background-50 border border-background-200 hover:border-primary-200 transition-colors cursor-pointer" onClick={() => navigate('/app/tasks')}>
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${task.priority === 'high' ? 'bg-red-400' : task.priority === 'medium' ? 'bg-amber-400' : 'bg-secondary-400'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground-800 truncate">{task.title}</p>
                        {task.due_date && (
                          <p className="text-[10px] text-foreground-400 font-label mt-0.5">{formatUKDate(task.due_date)}</p>
                        )}
                      </div>
                      <span className={`text-[10px] font-label px-1.5 py-0.5 rounded-full ${task.priority === 'high' ? 'bg-amber-100 text-amber-700' : task.priority === 'medium' ? 'bg-secondary-100 text-secondary-600' : 'bg-background-100 text-foreground-500'}`}>
                        {task.priority}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white border border-secondary-100 rounded-xl p-5">
              <h2 className="font-label text-sm font-semibold text-foreground-900 mb-4">RSVP breakdown</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-accent-500" /><span className="text-xs text-foreground-600">Attending</span></div>
                  <span className="text-xs font-label font-semibold text-accent-600">{stats.attending}</span>
                </div>
                <div className="w-full bg-secondary-100 rounded-full h-1.5">
                  <div className="bg-accent-500 h-1.5 rounded-full" style={{ width: `${stats.totalInvited > 0 ? Math.round((stats.attending / stats.totalInvited) * 100) : 0}%` }} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-secondary-400" /><span className="text-xs text-foreground-600">Awaiting reply</span></div>
                  <span className="text-xs font-label font-semibold text-foreground-700">{stats.awaitingReply}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-foreground-300" /><span className="text-xs text-foreground-600">Unable to attend</span></div>
                  <span className="text-xs font-label font-semibold text-foreground-500">{stats.unableToAttend}</span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-secondary-100 rounded-xl p-5 text-center">
              <div className="w-10 h-10 mx-auto flex items-center justify-center rounded-full bg-primary-50 text-primary-600 mb-3"><i className="ri-megaphone-line text-lg" /></div>
              <h3 className="font-label text-sm font-semibold text-foreground-900 mb-1">Ready to share?</h3>
              <p className="text-xs text-foreground-500 mb-4">Your guest page is published. Copy the link above or use the share buttons to send it to your guests.</p>
              <a href={emailHref} className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-500 text-background-50 rounded-lg text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"><i className="ri-mail-send-line text-sm" />Email your guests</a>
            </div>

            <div className="bg-white border border-secondary-100 rounded-xl p-5">
              <h2 className="font-label text-sm font-semibold text-foreground-900 mb-4">Budget</h2>
              {stats.hasBudget ? (
                <>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-foreground-600">Planned</span>
                      <span className="font-label font-semibold text-foreground-900">£{stats.budgetPlanned.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-foreground-600">Committed</span>
                      <span className="font-label font-semibold text-accent-600">£{stats.budgetCommitted.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-foreground-600">Paid</span>
                      <span className="font-label font-semibold text-emerald-600">£{stats.budgetPaid.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-foreground-600">Remaining</span>
                      <span className={`font-label font-semibold ${stats.budgetRemaining < 0 ? 'text-red-600' : 'text-foreground-900'}`}>£{stats.budgetRemaining.toLocaleString()}</span>
                    </div>
                  </div>
                  <button onClick={() => navigate('/app/budget')} className="btn-outline w-full text-xs py-2 cursor-pointer whitespace-nowrap">Open budget</button>
                </>
              ) : (
                <>
                  <p className="text-xs text-foreground-500 mb-4">Set your wedding budget and track spending across all categories.</p>
                  <button onClick={() => navigate('/app/budget/setup')} className="btn-primary w-full text-xs py-2 cursor-pointer whitespace-nowrap">Set up budget</button>
                </>
              )}
            </div>

            <div className="bg-white border border-secondary-100 rounded-xl p-5">
              <h2 className="font-label text-sm font-semibold text-foreground-900 mb-4">Invitation Links</h2>
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-accent-500" />Active</span>
                  <span className="font-label font-semibold text-accent-600">{stats.activeLinks}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-foreground-300" />Revoked</span>
                  <span className="font-label font-semibold text-foreground-500">{stats.revokedLinks}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${stats.portalEnabled ? 'bg-accent-500' : 'bg-secondary-400'}`} />Guest portal</span>
                  <span className="font-label font-semibold">{stats.portalEnabled ? 'Enabled' : 'Disabled'}</span>
                </div>
              </div>
              <button onClick={() => navigate('/app/invitations')} className="btn-outline w-full text-xs py-2 cursor-pointer whitespace-nowrap">Manage invitation links</button>
            </div>

            <div className="bg-white border border-secondary-100 rounded-xl p-5">
              <h2 className="font-label text-sm font-semibold text-foreground-900 mb-4">Seating planner</h2>
              {stats.seatingPlanStarted ? (
                <>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-foreground-600">Working plan</span>
                      <span className="font-label font-semibold text-foreground-900 truncate max-w-[120px]">{stats.workingPlanName}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-foreground-600">Seated</span>
                      <span className="font-label font-semibold text-emerald-600">{stats.seatedGuests}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-foreground-600">Unseated</span>
                      <span className={`font-label font-semibold ${stats.unseatedGuests > 0 ? 'text-amber-600' : 'text-foreground-700'}`}>{stats.unseatedGuests}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <button onClick={() => navigate('/app/seating')} className="btn-outline w-full text-xs py-2 cursor-pointer whitespace-nowrap">Open seating planner</button>
                    {stats.unseatedGuests > 0 && (
                      <button onClick={() => navigate('/app/seating')} className="text-xs text-amber-600 font-label hover:text-amber-700 cursor-pointer text-center whitespace-nowrap">
                        <i className="ri-user-unfollow-line mr-1" />{stats.unseatedGuests} guests need seats
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs text-foreground-500 mb-4">Plan where everyone sits for each wedding event.</p>
                  <button onClick={() => navigate('/app/seating')} className="btn-primary w-full text-xs py-2 cursor-pointer whitespace-nowrap">Start seating plan</button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

// ═══════════════════════════════════════════
// Main export — branches on demo mode
// ═══════════════════════════════════════════

export default function DashboardPage() {
  if (isDemoMode) return <DemoDashboard />;
  return <NormalDashboard />;
}