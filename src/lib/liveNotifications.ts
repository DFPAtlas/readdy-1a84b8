// ── Live in-app notifications ──
// Turns workspace records into notifications. Pure (no Supabase calls) so the
// rules are unit tested; useNotifications loads the rows and the read state.
import type { AppNotification, NotificationCategory, NotificationPriority, NotificationType } from '@/types/notifications';

export interface LiveNotificationSources {
  submissions: { id: string; invitation_id: string; status: string | null; submitted_at: string | null; revision: number | null; is_late: boolean | null }[];
  questions: { id: string; subject: string | null; category: string | null; created_at: string }[];
  pendingAssets: { id: string; created_at: string }[];
  reports: { id: string; reason: string | null; created_at: string }[];
  payments: { id: string; expense_id: string | null; amount: number | string | null; due_at: string | null; status: string | null }[];
  tasks: { id: string; title: string | null; due_date: string | null; status: string | null }[];
  contributions: { id: string; contributor_name: string | null; amount_minor: number | null; currency: string | null; paid_at: string | null; visibility: string | null }[];
  invitations: { id: string; formal_recipient_name: string | null; internal_name: string | null }[];
  expenses: { id: string; title: string | null }[];
}

export interface BuildOptions {
  weddingId: string;
  weddingName: string;
  /** dedup_key → read_at */
  readMap: Map<string, string>;
  /** YYYY-MM-DD, local "today" */
  today: string;
}

function money(amount: number, currency = 'GBP'): string {
  try {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: currency.toUpperCase() }).format(amount);
  } catch {
    return `£${amount.toFixed(2)}`;
  }
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

export function buildLiveNotifications(src: LiveNotificationSources, opts: BuildOptions): AppNotification[] {
  const { weddingId, weddingName, readMap, today } = opts;
  const out: AppNotification[] = [];
  const startOfToday = `${today}T00:00:00.000Z`;

  const push = (n: {
    key: string; type: NotificationType; category: NotificationCategory; priority: NotificationPriority;
    title: string; message: string; route: string; routeLabel: string; relatedType: string; relatedId: string;
    createdAt: string; actorName?: string;
  }) => {
    out.push({
      id: n.key,
      weddingId,
      type: n.type,
      category: n.category,
      priority: n.priority,
      title: n.title,
      message: n.message,
      route: n.route,
      routeLabel: n.routeLabel,
      relatedType: n.relatedType,
      relatedId: n.relatedId,
      dedupKey: n.key,
      readAt: readMap.get(n.key) ?? null,
      createdAt: n.createdAt,
      expiresAt: null,
      actorName: n.actorName ?? '',
      weddingName,
    });
  };

  const invitationName = new Map(src.invitations.map((i) => [i.id, i.formal_recipient_name || i.internal_name || 'A guest']));
  for (const s of src.submissions) {
    if (!s.submitted_at) continue;
    const name = invitationName.get(s.invitation_id) || 'A guest';
    const revision = s.revision ?? 1;
    const updated = revision > 1;
    push({
      key: `rsvp:${s.id}:${revision}`,
      type: updated ? 'rsvp_updated' : 'rsvp_submitted',
      category: 'rsvp',
      priority: 'info',
      title: updated ? `${name} updated their RSVP` : `${name} replied`,
      message: `${name} ${updated ? 'changed their RSVP' : 'sent their RSVP'}${s.is_late ? ' after the deadline' : ''}.`,
      route: '/app/invitations/responses',
      routeLabel: 'View responses',
      relatedType: 'invitation',
      relatedId: s.invitation_id,
      createdAt: s.submitted_at,
      actorName: name,
    });
  }

  for (const q of src.questions) {
    push({
      key: `question:${q.id}`,
      type: 'guest_question_new',
      category: 'questions',
      priority: 'action',
      title: 'New guest question',
      message: q.subject ? `“${q.subject}” is waiting for a reply.` : 'A guest question is waiting for a reply.',
      route: '/app/questions',
      routeLabel: 'Reply',
      relatedType: 'guest_question',
      relatedId: q.id,
      createdAt: q.created_at,
    });
  }

  if (src.pendingAssets.length > 0) {
    const latest = src.pendingAssets[0];
    const n = src.pendingAssets.length;
    push({
      // Keyed on the newest upload, so a fresh upload makes it unread again.
      key: `gallery-pending:${latest.id}`,
      type: 'gallery_upload_pending',
      category: 'gallery',
      priority: 'action',
      title: `${plural(n, 'photo', 'photos')} waiting for review`,
      message: `Guests have uploaded ${plural(n, 'photo', 'photos')} that ${n === 1 ? 'needs' : 'need'} your approval before anyone else sees ${n === 1 ? 'it' : 'them'}.`,
      route: '/app/gallery-control',
      routeLabel: 'Review uploads',
      relatedType: 'gallery_asset',
      relatedId: latest.id,
      createdAt: latest.created_at,
    });
  }

  for (const r of src.reports) {
    push({
      key: `gallery-report:${r.id}`,
      type: 'gallery_rejected',
      category: 'gallery',
      priority: 'urgent',
      title: 'A guest reported a photo',
      message: r.reason ? `Reason given: ${r.reason}` : 'Check the photo and decide whether to keep it.',
      route: '/app/gallery-control',
      routeLabel: 'Review report',
      relatedType: 'gallery_report',
      relatedId: r.id,
      createdAt: r.created_at,
    });
  }

  const expenseTitle = new Map(src.expenses.map((e) => [e.id, e.title || 'A payment']));
  for (const p of src.payments) {
    if (!p.due_at) continue;
    const due = p.due_at.slice(0, 10);
    const overdue = p.status === 'overdue' || due < today;
    const label = (p.expense_id && expenseTitle.get(p.expense_id)) || 'A payment';
    const amount = Number(p.amount);
    const amountText = Number.isFinite(amount) && amount > 0 ? ` (${money(amount)})` : '';
    push({
      key: `payment:${p.id}:${due}:${overdue ? 'overdue' : 'due'}`,
      type: overdue ? 'payment_overdue' : 'payment_due',
      category: 'budget',
      priority: overdue ? 'urgent' : 'action',
      title: overdue ? `${label} is overdue` : `${label} is due soon`,
      message: `${label}${amountText} ${overdue ? 'was' : 'is'} due on ${new Date(`${due}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}.`,
      route: '/app/budget/payments',
      routeLabel: 'View payments',
      relatedType: 'budget_payment',
      relatedId: p.id,
      createdAt: overdue ? `${due}T09:00:00.000Z` : startOfToday,
    });
  }

  for (const t of src.tasks) {
    if (!t.due_date) continue;
    const due = t.due_date.slice(0, 10);
    const overdue = due < today;
    const title = t.title || 'A task';
    push({
      key: `task:${t.id}:${due}:${overdue ? 'overdue' : 'due'}`,
      type: overdue ? 'task_overdue' : 'task_due',
      category: 'tasks',
      priority: overdue ? 'urgent' : 'action',
      title: overdue ? `Overdue: ${title}` : `Due soon: ${title}`,
      message: `${title} ${overdue ? 'was' : 'is'} due on ${new Date(`${due}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}.`,
      route: '/app/tasks',
      routeLabel: 'View tasks',
      relatedType: 'task',
      relatedId: t.id,
      createdAt: overdue ? `${due}T09:00:00.000Z` : startOfToday,
    });
  }

  for (const c of src.contributions) {
    if (!c.paid_at) continue;
    const name = c.visibility === 'anonymous' || !c.contributor_name ? 'A guest' : c.contributor_name;
    const amount = (c.amount_minor ?? 0) / 100;
    push({
      key: `contribution:${c.id}`,
      type: 'registry_contribution',
      category: 'registry',
      priority: 'info',
      title: `${name} sent a gift`,
      message: amount > 0 ? `${name} contributed ${money(amount, c.currency || 'GBP')} to your gift fund.` : `${name} contributed to your gift fund.`,
      route: '/app/budget/gift-funding',
      routeLabel: 'View gift funds',
      relatedType: 'gift_fund_contribution',
      relatedId: c.id,
      createdAt: c.paid_at,
      actorName: name,
    });
  }

  out.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return out;
}
