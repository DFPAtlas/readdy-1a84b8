import { describe, expect, it } from 'vitest';
import { buildLiveNotifications, type LiveNotificationSources } from '@/lib/liveNotifications';

const empty: LiveNotificationSources = {
  submissions: [], questions: [], pendingAssets: [], reports: [], payments: [], tasks: [], contributions: [], invitations: [], expenses: [],
};
const opts = { weddingId: 'w1', weddingName: 'Test', readMap: new Map<string, string>(), today: '2026-11-22' };

describe('buildLiveNotifications', () => {
  it('returns nothing for an empty workspace', () => {
    expect(buildLiveNotifications(empty, opts)).toEqual([]);
  });

  it('names the invitation on an RSVP and marks a revision as an update', () => {
    const out = buildLiveNotifications({
      ...empty,
      submissions: [
        { id: 's1', invitation_id: 'i1', status: 'submitted', submitted_at: '2026-11-20T10:00:00Z', revision: 1, is_late: false },
        { id: 's2', invitation_id: 'i1', status: 'submitted', submitted_at: '2026-11-21T10:00:00Z', revision: 2, is_late: true },
      ],
      invitations: [{ id: 'i1', formal_recipient_name: 'The Smiths', internal_name: null }],
    }, opts);
    expect(out.map((n) => n.title)).toEqual(['The Smiths updated their RSVP', 'The Smiths replied']);
    expect(out[0].message).toContain('after the deadline');
    expect(out[0].dedupKey).toBe('rsvp:s2:2');
  });

  it('applies stored read state by dedup key', () => {
    const readMap = new Map([['question:q1', '2026-11-21T09:00:00Z']]);
    const out = buildLiveNotifications({
      ...empty,
      questions: [
        { id: 'q1', subject: 'Parking?', category: null, created_at: '2026-11-20T10:00:00Z' },
        { id: 'q2', subject: null, category: null, created_at: '2026-11-21T10:00:00Z' },
      ],
    }, { ...opts, readMap });
    expect(out.find((n) => n.relatedId === 'q1')?.readAt).toBe('2026-11-21T09:00:00Z');
    expect(out.find((n) => n.relatedId === 'q2')?.readAt).toBeNull();
  });

  it('groups pending uploads into one notification keyed on the newest', () => {
    const out = buildLiveNotifications({
      ...empty,
      pendingAssets: [{ id: 'a2', created_at: '2026-11-21T10:00:00Z' }, { id: 'a1', created_at: '2026-11-20T10:00:00Z' }],
    }, opts);
    expect(out).toHaveLength(1);
    expect(out[0].title).toBe('2 photos waiting for review');
    expect(out[0].dedupKey).toBe('gallery-pending:a2');
  });

  it('flags past-due payments and tasks as urgent and upcoming ones as actions', () => {
    const out = buildLiveNotifications({
      ...empty,
      payments: [
        { id: 'p1', expense_id: 'e1', amount: 500, due_at: '2026-11-20', status: 'scheduled' },
        { id: 'p2', expense_id: null, amount: null, due_at: '2026-11-30', status: 'scheduled' },
      ],
      expenses: [{ id: 'e1', title: 'Venue deposit' }],
      tasks: [{ id: 't1', title: 'Book band', due_date: '2026-11-21', status: 'pending' }],
    }, opts);
    const byId = new Map(out.map((n) => [n.relatedId, n]));
    expect(byId.get('p1')?.type).toBe('payment_overdue');
    expect(byId.get('p1')?.priority).toBe('urgent');
    expect(byId.get('p1')?.title).toBe('Venue deposit is overdue');
    expect(byId.get('p2')?.type).toBe('payment_due');
    expect(byId.get('t1')?.type).toBe('task_overdue');
  });

  it('hides the contributor name on anonymous gifts', () => {
    const out = buildLiveNotifications({
      ...empty,
      contributions: [{ id: 'c1', contributor_name: 'Jo', amount_minor: 2500, currency: 'gbp', paid_at: '2026-11-21T10:00:00Z', visibility: 'anonymous' }],
    }, opts);
    expect(out[0].title).toBe('A guest sent a gift');
    expect(out[0].message).toContain('£25.00');
  });
});
