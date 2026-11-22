import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import type { AppNotification, NotificationFilters } from '@/types/notifications';
import { isDemoMode } from '@/demo/demoConfig';
import { demoNotifications } from '@/demo/demoNotifications';
import { supabase } from '@/lib/supabase';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { useAuth } from '@/context/AuthProvider';
import { buildLiveNotifications, type LiveNotificationSources } from '@/lib/liveNotifications';

const DEMO_NOTIF_STORAGE_KEY = 'vowora.demo.notifications.v1';
const REFRESH_MS = 60_000;
// The bell in the app header and the notifications page each use this hook;
// this event keeps their read state in step.
const CHANGED_EVENT = 'vowora:notifications-changed';
const announceChange = () => window.dispatchEvent(new Event(CHANGED_EVENT));

function loadDemoNotifications(): AppNotification[] {
  if (!isDemoMode) return [];
  try {
    const raw = localStorage.getItem(DEMO_NOTIF_STORAGE_KEY);
    if (!raw) return [...demoNotifications];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return [...demoNotifications];
  } catch {
    return [...demoNotifications];
  }
}

function saveDemoNotifications(notifs: AppNotification[]) {
  try {
    localStorage.setItem(DEMO_NOTIF_STORAGE_KEY, JSON.stringify(notifs));
  } catch { /* storage full — ignore */ }
}

/** Runs a query and treats a permission or network failure as "nothing to show". */
async function rows<T>(query: PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  try {
    const { data, error } = await query;
    return error ? [] : (data ?? []);
  } catch {
    return [];
  }
}

function isoDate(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

async function loadSources(weddingId: string): Promise<LiveNotificationSources> {
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const [submissions, questions, pendingAssets, reports, payments, tasks, contributions] = await Promise.all([
    rows<LiveNotificationSources['submissions'][number]>(
      supabase.from('rsvp_submissions')
        .select('id, invitation_id, status, submitted_at, revision, is_late')
        .eq('wedding_id', weddingId).eq('is_draft', false).gte('submitted_at', since)
        .order('submitted_at', { ascending: false }).limit(50),
    ),
    rows<LiveNotificationSources['questions'][number]>(
      supabase.from('guest_questions')
        .select('id, subject, category, created_at')
        .eq('wedding_id', weddingId).eq('status', 'pending')
        .order('created_at', { ascending: false }).limit(50),
    ),
    rows<LiveNotificationSources['pendingAssets'][number]>(
      supabase.from('gallery_assets')
        .select('id, created_at')
        .eq('wedding_id', weddingId).in('moderation_status', ['pending', 'awaiting_review', 'held'])
        .order('created_at', { ascending: false }).limit(200),
    ),
    rows<LiveNotificationSources['reports'][number]>(
      supabase.from('gallery_reports')
        .select('id, reason, created_at')
        .eq('wedding_id', weddingId).eq('status', 'pending')
        .order('created_at', { ascending: false }).limit(50),
    ),
    rows<LiveNotificationSources['payments'][number]>(
      supabase.from('budget_payments')
        .select('id, expense_id, amount, due_at, status')
        .eq('wedding_id', weddingId).in('status', ['scheduled', 'overdue'])
        .lte('due_at', isoDate(14)).order('due_at', { ascending: true }).limit(50),
    ),
    rows<LiveNotificationSources['tasks'][number]>(
      supabase.from('wedding_tasks')
        .select('id, title, due_date, status')
        .eq('wedding_id', weddingId).in('status', ['pending', 'in_progress']).is('archived_at', null)
        .lte('due_date', isoDate(7)).order('due_date', { ascending: true }).limit(50),
    ),
    rows<LiveNotificationSources['contributions'][number]>(
      supabase.from('gift_fund_contributions')
        .select('id, contributor_name, amount_minor, currency, paid_at, visibility')
        .eq('wedding_id', weddingId).eq('payment_status', 'paid').gte('paid_at', since)
        .order('paid_at', { ascending: false }).limit(50),
    ),
  ]);

  const invitationIds = [...new Set(submissions.map((s) => s.invitation_id).filter(Boolean))];
  const expenseIds = [...new Set(payments.map((p) => p.expense_id).filter((id): id is string => !!id))];
  const [invitations, expenses] = await Promise.all([
    invitationIds.length
      ? rows<{ id: string; formal_recipient_name: string | null; internal_name: string | null }>(
        supabase.from('invitations').select('id, formal_recipient_name, internal_name').in('id', invitationIds),
      )
      : Promise.resolve([]),
    expenseIds.length
      ? rows<{ id: string; title: string | null }>(
        supabase.from('budget_expenses').select('id, title').in('id', expenseIds),
      )
      : Promise.resolve([]),
  ]);

  return { submissions, questions, pendingAssets, reports, payments, tasks, contributions, invitations, expenses };
}

export function useNotifications() {
  const { weddingId, activeWedding } = useActiveWedding();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const weddingName = activeWedding?.title || '';

  const [notifications, setNotifications] = useState<AppNotification[]>(() => loadDemoNotifications());
  const [loading, setLoading] = useState(!isDemoMode);
  const [error, setError] = useState<string | null>(null);
  const loadSeq = useRef(0);

  useEffect(() => {
    if (isDemoMode) saveDemoNotifications(notifications);
  }, [notifications]);

  const load = useCallback(async () => {
    if (isDemoMode) return;
    if (!weddingId || !userId) {
      setNotifications([]);
      setLoading(false);
      return;
    }
    const seq = ++loadSeq.current;
    try {
      const [sources, reads] = await Promise.all([
        loadSources(weddingId),
        rows<{ dedup_key: string; read_at: string }>(
          supabase.from('notification_reads').select('dedup_key, read_at')
            .eq('wedding_id', weddingId).eq('user_id', userId).limit(1000),
        ),
      ]);
      if (seq !== loadSeq.current) return;
      const readMap = new Map(reads.map((r) => [r.dedup_key, r.read_at]));
      setNotifications(buildLiveNotifications(sources, { weddingId, weddingName, readMap, today: isoDate(0) }));
      setError(null);
    } catch (err) {
      if (seq !== loadSeq.current) return;
      setError(err instanceof Error ? err.message : 'Could not load notifications');
    } finally {
      if (seq === loadSeq.current) setLoading(false);
    }
  }, [weddingId, userId, weddingName]);

  useEffect(() => {
    if (isDemoMode) return;
    setLoading(true);
    void load();
    const onFocus = () => { void load(); };
    window.addEventListener('focus', onFocus);
    window.addEventListener(CHANGED_EVENT, onFocus);
    const timer = window.setInterval(() => { void load(); }, REFRESH_MS);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener(CHANGED_EVENT, onFocus);
      window.clearInterval(timer);
    };
  }, [load]);

  const persistRead = useCallback(async (keys: string[], readAt: string) => {
    if (isDemoMode || !weddingId || !userId || keys.length === 0) return;
    await supabase.from('notification_reads').upsert(
      keys.map((dedup_key) => ({ wedding_id: weddingId, user_id: userId, dedup_key, read_at: readAt })),
      { onConflict: 'wedding_id,user_id,dedup_key' },
    );
    announceChange();
  }, [weddingId, userId]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.readAt).length, [notifications]);

  const markRead = useCallback((id: string) => {
    const now = new Date().toISOString();
    const target = notifications.find((n) => n.id === id && !n.readAt);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id && !n.readAt ? { ...n, readAt: now } : n)),
    );
    if (target) void persistRead([target.dedupKey], now);
  }, [notifications, persistRead]);

  const markUnread = useCallback((id: string) => {
    const target = notifications.find((n) => n.id === id && n.readAt);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id && n.readAt ? { ...n, readAt: null } : n)),
    );
    if (target && !isDemoMode && weddingId && userId) {
      void supabase.from('notification_reads').delete()
        .eq('wedding_id', weddingId).eq('user_id', userId).eq('dedup_key', target.dedupKey)
        .then(announceChange, announceChange);
    }
  }, [notifications, weddingId, userId]);

  const markAllRead = useCallback(() => {
    const now = new Date().toISOString();
    const keys = notifications.filter((n) => !n.readAt).map((n) => n.dedupKey);
    setNotifications((prev) => prev.map((n) => (!n.readAt ? { ...n, readAt: now } : n)));
    void persistRead(keys, now);
  }, [notifications, persistRead]);

  const filteredNotifications = useCallback(
    (filters: NotificationFilters) => {
      let result = [...notifications];
      if (filters.read === 'unread') result = result.filter((n) => !n.readAt);
      else if (filters.read === 'read') result = result.filter((n) => n.readAt);
      if (filters.category !== 'all') result = result.filter((n) => n.category === filters.category);
      if (filters.priority !== 'all') result = result.filter((n) => n.priority === filters.priority);
      if (filters.search) {
        const q = filters.search.toLowerCase();
        result = result.filter(
          (n) =>
            n.title.toLowerCase().includes(q) ||
            n.message.toLowerCase().includes(q) ||
            n.actorName.toLowerCase().includes(q),
        );
      }
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return result;
    },
    [notifications],
  );

  const resetNotifications = useCallback(() => {
    if (isDemoMode) {
      const fresh = [...demoNotifications];
      setNotifications(fresh);
      saveDemoNotifications(fresh);
      return;
    }
    void load();
  }, [load]);

  return {
    notifications,
    unreadCount,
    markRead,
    markUnread,
    markAllRead,
    filteredNotifications,
    resetNotifications,
    loading,
    error,
    refresh: load,
  };
}
