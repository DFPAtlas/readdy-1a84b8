import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AppShell from '@/components/feature/AppShell';
import { useDemoDataSafe } from '@/demo/useDemoDataSafe';
import { isDemoMode } from '@/demo/demoConfig';
import type { DemoInvitation, DemoGuest } from '@/demo/demoTypes';
import { supabase } from '@/lib/supabase';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { useInvitationSend } from '@/hooks/useInvitationSend';
import type { Invitation, InvitationTemplate } from '@/types/invitation';
import { INVITATION_STATUS_OPTIONS, INVITATION_SORT_OPTIONS, DELIVERY_METHOD_OPTIONS, DELIVERY_STATUS_BADGE, DELIVERY_STATUS_LABELS } from '@/types/invitation';

const PAGE_SIZE = 15;

function NormalInvitationsPage() {
  const navigate = useNavigate();
  const { weddingId } = useActiveWedding();
  const { sendingIds, bulkSending, sendInvitation, sendBulkInvitations } = useInvitationSend();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [templates, setTemplates] = useState<InvitationTemplate[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [stats, setStats] = useState({ draft: 0, ready: 0, sent: 0, failed: 0, delivered: 0, missingContact: 0 });
  const filters = {
    search: searchParams.get('search') || '',
    status: searchParams.get('status') || '',
    delivery_method: searchParams.get('delivery_method') || '',
    template_id: searchParams.get('template_id') || '',
    type: searchParams.get('type') || '',
    active_archived: searchParams.get('active_archived') || 'active',
    sort: searchParams.get('sort') || 'created_at_desc',
    page: parseInt(searchParams.get('page') || '1', 10),
  };
  const updateFilter = (key: string, value: string) => { const next = new URLSearchParams(searchParams); if (value) { next.set(key, value); } else { next.delete(key); } if (key !== 'page') next.set('page', '1'); setSearchParams(next); };
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [tmplRes] = await Promise.all([supabase.from('invitation_templates').select('id, name, style_preset').eq('wedding_id', weddingId).eq('status', 'active')]);
      setTemplates((tmplRes.data || []) as InvitationTemplate[]);
      let query = supabase.from('invitations').select('*, template:invitation_templates(id, name, style_preset), household:guest_households(id, display_name)', { count: 'exact' }).eq('wedding_id', weddingId);
      if (filters.status) query = query.eq('status', filters.status);
      if (filters.delivery_method) query = query.eq('delivery_method', filters.delivery_method);
      if (filters.template_id) query = query.eq('template_id', filters.template_id);
      if (filters.type) query = query.eq('invitation_type', filters.type);
      if (filters.active_archived === 'active') query = query.not('status', 'eq', 'archived');
      else if (filters.active_archived === 'archived') query = query.eq('status', 'archived');
      if (filters.search) query = query.or(`internal_name.ilike.%${filters.search}%,formal_recipient_name.ilike.%${filters.search}%`);
      const sortMap: Record<string, { col: string; asc: boolean }> = { internal_name_asc: { col: 'internal_name', asc: true }, internal_name_desc: { col: 'internal_name', asc: false }, created_at_desc: { col: 'created_at', asc: false }, created_at_asc: { col: 'created_at', asc: true }, status_asc: { col: 'status', asc: true } };
      const s = sortMap[filters.sort] || sortMap.created_at_desc;
      query = query.order(s.col, { ascending: s.asc });
      const from = (filters.page - 1) * PAGE_SIZE;
      query = query.range(from, from + PAGE_SIZE - 1);
      const { data, count, error: dbErr } = await query;
      if (dbErr) throw dbErr;
      setInvitations((data || []) as Invitation[]);
      setTotalCount(count || 0);
      const [draftC, readyC, sentC, failedC, deliveredC] = await Promise.all([
        supabase.from('invitations').select('id', { count: 'exact', head: true }).eq('wedding_id', weddingId).eq('status', 'draft'),
        supabase.from('invitations').select('id', { count: 'exact', head: true }).eq('wedding_id', weddingId).eq('status', 'ready'),
        supabase.from('invitations').select('id', { count: 'exact', head: true }).eq('wedding_id', weddingId).eq('status', 'sent'),
        supabase.from('invitations').select('id', { count: 'exact', head: true }).eq('wedding_id', weddingId).eq('delivery_status', 'failed'),
        supabase.from('invitations').select('id', { count: 'exact', head: true }).eq('wedding_id', weddingId).eq('delivery_status', 'delivered'),
      ]);
      setStats({ draft: draftC.count || 0, ready: readyC.count || 0, sent: sentC.count || 0, failed: failedC.count || 0, delivered: deliveredC.count || 0, missingContact: 0 });
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed to load invitations'); } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchData(); }, [fetchData]);
  const toggleSelect = (id: string) => { setSelected((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; }); };
  const toggleSelectAll = () => { if (selected.size === invitations.length) { setSelected(new Set()); } else { setSelected(new Set(invitations.map((i) => i.id))); } };
  const handleBulkAction = async (action: string) => {
    if (selected.size === 0) return;
    const ids = [...selected];
    if (action === 'archive' && !window.confirm(`Archive ${ids.length} invitation${ids.length > 1 ? 's' : ''}?`)) return;
    try {
      if (action === 'mark-ready') { await supabase.from('invitations').update({ status: 'ready', updated_at: new Date().toISOString() }).in('id', ids); }
      else if (action === 'return-draft') { await supabase.from('invitations').update({ status: 'draft', updated_at: new Date().toISOString() }).in('id', ids); }
      else if (action === 'archive') { await supabase.from('invitations').update({ status: 'archived', archived_at: new Date().toISOString() }).in('id', ids); }
      setFeedback({ type: 'success', message: `${ids.length} invitation${ids.length > 1 ? 's' : ''} updated` });
      setSelected(new Set());
      fetchData();
    } catch (err: unknown) { setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Bulk action failed' }); }
  };

  const handleBulkSend = async () => {
    const readyIds = [...selected].filter((id) => {
      const inv = invitations.find((i) => i.id === id);
      return inv?.status === 'ready';
    });
    if (readyIds.length === 0) {
      setFeedback({ type: 'error', message: 'No ready invitations selected. Only "ready" invitations can be sent.' });
      return;
    }
    setShowBulkConfirm(false);
    const result = await sendBulkInvitations(readyIds);
    if (result.sent > 0) {
      setFeedback({ type: 'success', message: `${result.sent} invitation${result.sent !== 1 ? 's' : ''} sent${result.failed > 0 ? `, ${result.failed} failed` : ''}` });
      setSelected(new Set());
      fetchData();
    } else {
      setFeedback({ type: 'error', message: `All ${result.failed} invitation${result.failed !== 1 ? 's' : ''} failed to send` });
    }
  };

  const handleSendSingle = async (invitationId: string) => {
    const result = await sendInvitation(invitationId);
    if (result.success) {
      setFeedback({ type: 'success', message: result.message || 'Invitation sent!' });
      fetchData();
    } else {
      setFeedback({ type: 'error', message: result.error || 'Send failed' });
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = { draft: 'bg-secondary-100 text-secondary-700', ready: 'bg-accent-100 text-accent-700', sent: 'bg-primary-100 text-primary-700', cancelled: 'bg-foreground-200 text-foreground-600', archived: 'bg-foreground-100 text-foreground-400' };
    return `px-2 py-0.5 rounded text-xs font-label capitalize ${map[status] || ''}`;
  };

  const readySelectedCount = [...selected].filter((id) => invitations.find((i) => i.id === id)?.status === 'ready').length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  if (loading && invitations.length === 0) { return <AppShell><div className="max-w-6xl mx-auto flex items-center justify-center py-20"><div className="flex items-center gap-3 text-foreground-500"><i className="ri-loader-4-line animate-spin text-xl" /><span className="text-sm">Loading invitations...</span></div></div></AppShell>; }
  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">
        {feedback && (<div className={`mb-4 px-4 py-3 rounded-lg text-sm font-label flex items-center justify-between ${feedback.type === 'success' ? 'bg-accent-50 text-accent-700 border border-accent-200' : 'bg-red-50 text-red-700 border border-red-200'}`}><span>{feedback.message}</span><button onClick={() => setFeedback(null)} className="cursor-pointer"><i className="ri-close-line" /></button></div>)}
        {error && <div className="mb-4 px-4 py-3 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200">{error}<button onClick={() => { setError(''); fetchData(); }} className="ml-3 underline cursor-pointer">Retry</button></div>}

        {/* Bulk action bar */}
        {selected.size > 0 && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-primary-50 border border-primary-200 flex items-center justify-between">
            <span className="text-sm font-label text-primary-700">{selected.size} selected{readySelectedCount > 0 ? ` (${readySelectedCount} ready to send)` : ''}</span>
            <div className="flex items-center gap-2">
              {readySelectedCount > 0 && (
                <button onClick={() => setShowBulkConfirm(true)} disabled={bulkSending} className="btn-primary text-xs py-1.5 px-4 cursor-pointer whitespace-nowrap disabled:opacity-50">
                  {bulkSending ? <><i className="ri-loader-4-line animate-spin mr-1" />Sending...</> : <><i className="ri-send-plane-line mr-1" />Send {readySelectedCount} selected</>}
                </button>
              )}
              <button onClick={() => handleBulkAction('mark-ready')} className="btn-ghost text-xs py-1.5 cursor-pointer whitespace-nowrap"><i className="ri-check-line mr-1" />Mark ready</button>
              <button onClick={() => handleBulkAction('return-draft')} className="btn-ghost text-xs py-1.5 cursor-pointer whitespace-nowrap"><i className="ri-edit-line mr-1" />Return to draft</button>
              <button onClick={() => handleBulkAction('archive')} className="btn-ghost text-xs py-1.5 text-red-500 cursor-pointer whitespace-nowrap"><i className="ri-archive-line mr-1" />Archive</button>
              <button onClick={() => setSelected(new Set())} className="btn-ghost text-xs py-1.5 cursor-pointer whitespace-nowrap">Clear</button>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div><h1 className="font-heading text-2xl text-foreground-900">Invitations</h1><p className="text-sm text-foreground-500 mt-1">Prepare, send and track personalised invitations.</p></div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/app/invitations/templates')} className="btn-ghost text-sm cursor-pointer whitespace-nowrap"><i className="ri-layout-line mr-1.5" />Manage templates</button>
            <button onClick={() => navigate('/app/invitations/new')} className="btn-primary text-sm py-2.5 px-4 cursor-pointer whitespace-nowrap"><i className="ri-add-line mr-1.5" />Create invitation</button>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <div className="card-default"><p className="text-lg font-heading font-semibold text-foreground-900">{stats.draft}</p><p className="text-xs text-foreground-500 mt-0.5">Draft</p></div>
          <div className="card-default"><p className="text-lg font-heading font-semibold text-accent-600">{stats.ready}</p><p className="text-xs text-foreground-500 mt-0.5">Ready</p></div>
          <div className="card-default"><p className="text-lg font-heading font-semibold text-primary-600">{stats.sent}</p><p className="text-xs text-foreground-500 mt-0.5">Sent</p></div>
          <div className="card-default"><p className="text-lg font-heading font-semibold text-emerald-600">{stats.delivered}</p><p className="text-xs text-foreground-500 mt-0.5">Delivered</p></div>
          <div className="card-default"><p className="text-lg font-heading font-semibold text-red-500">{stats.failed}</p><p className="text-xs text-foreground-500 mt-0.5">Failed</p></div>
          <div className="card-default"><p className="text-lg font-heading font-semibold text-foreground-900">{stats.missingContact}</p><p className="text-xs text-foreground-500 mt-0.5">Missing contact</p></div>
        </div>
        <div className="hidden md:block">{invitations.length === 0 ? (
          <div className="card-default text-center py-16"><div className="w-14 h-14 mx-auto flex items-center justify-center rounded-full bg-secondary-100 text-secondary-400 mb-4"><i className="ri-mail-send-line text-2xl" /></div><h3 className="font-label text-sm font-semibold text-foreground-900 mb-2">No invitations yet</h3><p className="text-sm text-foreground-500 mb-6">Create your first invitation to get started.</p><button onClick={() => navigate('/app/invitations/new')} className="btn-outline text-sm cursor-pointer">Create your first invitation</button></div>
        ) : (
          <><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-secondary-100"><th className="text-left py-2.5 px-2 w-10"><input type="checkbox" checked={selected.size === invitations.length && invitations.length > 0} onChange={toggleSelectAll} className="cursor-pointer" /></th><th className="text-left py-2.5 px-2 text-xs font-label text-foreground-500 font-medium">Invitation</th><th className="text-left py-2.5 px-2 text-xs font-label text-foreground-500 font-medium">Status</th><th className="text-left py-2.5 px-2 text-xs font-label text-foreground-500 font-medium">Delivery</th><th className="text-right py-2.5 px-2 text-xs font-label text-foreground-500 font-medium">Actions</th></tr></thead><tbody>{invitations.map((inv) => (<tr key={inv.id} className="border-b border-secondary-50 hover:bg-background-50 transition-colors"><td className="py-3 px-2"><input type="checkbox" checked={selected.has(inv.id)} onChange={() => toggleSelect(inv.id)} className="cursor-pointer" /></td><td className="py-3 px-2"><button onClick={() => navigate(`/app/invitations/${inv.id}`)} className="text-foreground-900 font-label hover:text-primary-600 transition-colors cursor-pointer">{inv.internal_name}</button>{inv.formal_recipient_name && <p className="text-xs text-foreground-400 mt-0.5">{inv.formal_recipient_name}</p>}</td><td className="py-3 px-2"><span className={statusBadge(inv.status)}>{inv.status}</span></td><td className="py-3 px-2">{inv.delivery_status ? <span className={`px-2 py-0.5 rounded text-[10px] font-label capitalize ${DELIVERY_STATUS_BADGE[inv.delivery_status] || 'bg-foreground-100 text-foreground-400'}`}>{DELIVERY_STATUS_LABELS[inv.delivery_status] || inv.delivery_status}</span> : <span className="text-xs text-foreground-400">—</span>}</td><td className="py-3 px-2 text-right"><div className="flex items-center justify-end gap-1"><button onClick={() => navigate(`/app/invitations/${inv.id}`)} className="w-7 h-7 inline-flex items-center justify-center rounded-md text-foreground-400 hover:text-foreground-700 hover:bg-background-100 cursor-pointer" title="View"><i className="ri-eye-line text-sm" /></button><button onClick={() => navigate(`/app/invitations/${inv.id}/access`)} className="w-7 h-7 inline-flex items-center justify-center rounded-md text-foreground-400 hover:text-foreground-700 hover:bg-background-100 cursor-pointer" title="Access"><i className="ri-key-2-line text-sm" /></button>{inv.status === 'ready' && (<button onClick={() => handleSendSingle(inv.id)} disabled={sendingIds.has(inv.id)} className="w-7 h-7 inline-flex items-center justify-center rounded-md text-accent-600 hover:text-accent-700 hover:bg-accent-50 cursor-pointer disabled:opacity-30" title="Send"><i className={`${sendingIds.has(inv.id) ? 'ri-loader-4-line animate-spin' : 'ri-send-plane-line'} text-sm`} /></button>)}</div></td></tr>))}</tbody></table></div>
          {totalPages > 1 && (<div className="flex items-center justify-between mt-4 text-sm"><span className="text-foreground-500">{totalCount} invitation{totalCount !== 1 ? 's' : ''}</span><div className="flex items-center gap-1"><button disabled={filters.page <= 1} onClick={() => updateFilter('page', String(filters.page - 1))} className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-background-100 disabled:opacity-30 cursor-pointer"><i className="ri-arrow-left-s-line" /></button>{Array.from({ length: Math.min(totalPages, 7) }, (_, i) => { let pageNum: number; if (totalPages <= 7) { pageNum = i + 1; } else if (filters.page <= 4) { pageNum = i + 1; } else if (filters.page >= totalPages - 3) { pageNum = totalPages - 6 + i; } else { pageNum = filters.page - 3 + i; } return (<button key={pageNum} onClick={() => updateFilter('page', String(pageNum))} className={`w-8 h-8 flex items-center justify-center rounded-md text-sm cursor-pointer ${pageNum === filters.page ? 'bg-primary-500 text-background-50' : 'hover:bg-background-100 text-foreground-600'}`}>{pageNum}</button>); })}<button disabled={filters.page >= totalPages} onClick={() => updateFilter('page', String(filters.page + 1))} className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-background-100 disabled:opacity-30 cursor-pointer"><i className="ri-arrow-right-s-line" /></button></div></div>)}</>
        )}</div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-3">{invitations.length === 0 ? (
          <div className="card-default text-center py-16"><div className="w-14 h-14 mx-auto flex items-center justify-center rounded-full bg-secondary-100 text-secondary-400 mb-4"><i className="ri-mail-send-line text-2xl" /></div><h3 className="font-label text-sm font-semibold text-foreground-900 mb-2">No invitations yet</h3><button onClick={() => navigate('/app/invitations/new')} className="btn-outline text-sm cursor-pointer">Create your first invitation</button></div>
        ) : (invitations.map((inv) => (<div key={inv.id} className="card-default cursor-pointer" onClick={() => navigate(`/app/invitations/${inv.id}`)}><div className="flex items-start justify-between gap-2"><div className="flex-1 min-w-0"><p className="text-sm font-label font-semibold text-foreground-900 truncate">{inv.internal_name}</p>{inv.delivery_status && <p className="text-[10px] text-foreground-400 mt-0.5 capitalize">{DELIVERY_STATUS_LABELS[inv.delivery_status] || inv.delivery_status}</p>}</div><span className={statusBadge(inv.status)}>{inv.status}</span></div></div>)))}</div>
      </div>

      {/* Bulk send confirmation */}
      {showBulkConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowBulkConfirm(false)} />
          <div className="relative bg-white rounded-xl border border-secondary-200 p-6 max-w-sm mx-4 z-10">
            <h3 className="font-label text-sm font-semibold text-foreground-900 mb-2">Send {readySelectedCount} invitation{readySelectedCount !== 1 ? 's' : ''}?</h3>
            <p className="text-xs text-foreground-500 mb-4">
              This will send each invitation to its recipients via email. A unique secure access token will be generated for each invitation.
            </p>
            <div className="flex items-center gap-2 justify-end">
              <button onClick={() => setShowBulkConfirm(false)} className="btn-ghost text-xs cursor-pointer whitespace-nowrap">Cancel</button>
              <button onClick={handleBulkSend} disabled={bulkSending} className="btn-primary text-xs cursor-pointer whitespace-nowrap disabled:opacity-50">
                {bulkSending ? 'Sending...' : 'Send all'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

// ── Demo mode ──

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-secondary-100 text-secondary-700',
  ready: 'bg-accent-100 text-accent-700',
  sent: 'bg-primary-100 text-primary-700',
  cancelled: 'bg-foreground-200 text-foreground-600',
  archived: 'bg-foreground-100 text-foreground-400',
};

function statusBadgeClass(status: string) {
  return `px-2 py-0.5 rounded text-xs font-label capitalize ${STATUS_BADGE[status] || 'bg-foreground-100 text-foreground-400'}`;
}

function DemoInvitationsPage() {
  const navigate = useNavigate();
  const demo = useDemoDataSafe();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [simulatingId, setSimulatingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Pre-compute with fallback for when demo is null
  const invitations = demo?.state.invitations || [];
  const guests = demo?.state.guests || [];
  const recipients = demo?.state.invitationRecipients || [];
  const households = demo?.state.households || [];

  const filteredInvitations = useMemo(() => {
    let result = invitations;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((i) =>
        i.internal_name.toLowerCase().includes(q) ||
        i.formal_recipient_name.toLowerCase().includes(q) ||
        i.informal_greeting.toLowerCase().includes(q)
      );
    }
    if (statusFilter) result = result.filter((i) => i.status === statusFilter);
    if (typeFilter) result = result.filter((i) => i.invitation_type === typeFilter);
    return result;
  }, [invitations, search, statusFilter, typeFilter]);

  if (!demo) {
    return <AppShell><div className="max-w-6xl mx-auto flex items-center justify-center py-20"><p className="text-sm text-foreground-500">Demo data not available</p></div></AppShell>;
  }

  const { stats, simulateSendInvitation } = demo;

  const draftCount = invitations.filter((i) => i.status === 'draft').length;
  const readyCount = invitations.filter((i) => i.status === 'ready').length;
  const sentCount = invitations.filter((i) => i.status === 'sent').length;
  const totalInvitations = invitations.length;

  // RSVP response rates
  const invitedGuestIds = new Set(recipients.map((r) => r.guest_id));
  const invitedGuests = guests.filter((g) => invitedGuestIds.has(g.id) && g.status === 'active');
  const respondedGuests = invitedGuests.filter((g) => g.rsvp_submitted_at);
  const attendingResponded = invitedGuests.filter((g) => g.rsvp_status === 'accepted' && g.rsvp_submitted_at);
  const responseRate = invitedGuests.length > 0 ? Math.round((respondedGuests.length / invitedGuests.length) * 100) : 0;

  const getRecipientGuests = (inv: DemoInvitation): DemoGuest[] => {
    const recipGuestIds = recipients.filter((r) => r.invitation_id === inv.id).map((r) => r.guest_id);
    return guests.filter((g) => recipGuestIds.includes(g.id));
  };

  const getRecipientSummary = (inv: DemoInvitation) => {
    const invGuests = getRecipientGuests(inv);
    const responded = invGuests.filter((g) => g.rsvp_submitted_at);
    return `${responded.length}/${invGuests.length} responded`;
  };

  const handleSimulateSend = async (invitationId: string) => {
    setSimulatingId(invitationId);
    await new Promise((r) => setTimeout(r, 1200));
    simulateSendInvitation(invitationId);
    setSimulatingId(null);
    setFeedback({ type: 'success', message: 'Demo invitation marked as sent. No real email was delivered.' });
    setTimeout(() => setFeedback(null), 4000);
  };

  const getFirstRecipientGuestId = (inv: DemoInvitation): string => {
    const recip = recipients.find((r) => r.invitation_id === inv.id);
    return recip?.guest_id || '';
  };

  const getHouseholdName = (inv: DemoInvitation): string => {
    const hh = households.find((h) => h.id === inv.household_id);
    return hh?.display_name || '';
  };

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">
        {/* Feedback toast */}
        {feedback && (
          <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-label flex items-center justify-between ${feedback.type === 'success' ? 'bg-accent-50 text-accent-700 border border-accent-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            <span>{feedback.message}</span>
            <button onClick={() => setFeedback(null)} className="cursor-pointer"><i className="ri-close-line" /></button>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="font-heading text-2xl text-foreground-900">Invitations</h1>
            <p className="text-sm text-foreground-500 mt-1">Design, preview and track invitations for Emma &amp; James.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-label">Demo Account</span>
            <button onClick={() => navigate('/app/invitations/responses')} className="btn-outline text-sm cursor-pointer whitespace-nowrap">
              <i className="ri-check-double-line mr-1.5" />View responses
            </button>
            <button onClick={() => navigate('/app/invitations/new')} className="btn-primary text-sm py-2.5 px-4 cursor-pointer whitespace-nowrap">
              <i className="ri-add-line mr-1.5" />Create invitation
            </button>
          </div>
        </div>

        {/* Help banner */}
        <div className="mb-6 px-4 py-3.5 rounded-xl bg-accent-50 border border-accent-100 flex items-start gap-3">
          <div className="w-6 h-6 flex items-center justify-center text-accent-600 flex-shrink-0 mt-0.5">
            <i className="ri-lightbulb-line text-base" />
          </div>
          <div>
            <p className="text-sm font-label font-medium text-accent-900">How invitations work</p>
            <p className="text-xs text-accent-700 mt-0.5 leading-relaxed">Create a personalised invitation for each household — choose a template, set the delivery method and mark it ready when it&rsquo;s good to go. In demo mode, &ldquo;Send&rdquo; simulates dispatch without delivering a real email. Click any invitation to preview the full design.</p>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
          <div className="card-default"><p className="text-lg font-heading font-semibold text-foreground-900">{totalInvitations}</p><p className="text-xs text-foreground-500 mt-0.5">Total</p></div>
          <div className="card-default"><p className="text-lg font-heading font-semibold text-secondary-600">{draftCount}</p><p className="text-xs text-foreground-500 mt-0.5">Draft</p></div>
          <div className="card-default"><p className="text-lg font-heading font-semibold text-accent-600">{readyCount}</p><p className="text-xs text-foreground-500 mt-0.5">Ready</p></div>
          <div className="card-default"><p className="text-lg font-heading font-semibold text-primary-600">{sentCount}</p><p className="text-xs text-foreground-500 mt-0.5">Sent</p></div>
          <div className="card-default"><p className="text-lg font-heading font-semibold text-foreground-900">{respondedGuests.length}</p><p className="text-xs text-foreground-500 mt-0.5">Responded</p></div>
          <div className="card-default"><p className="text-lg font-heading font-semibold text-emerald-600">{responseRate}%</p><p className="text-xs text-foreground-500 mt-0.5">Response rate</p></div>
        </div>

        {/* Search + Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <div className="flex-1 relative min-w-[200px]">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400 text-sm" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search invitations..." className="input-field pl-9" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field text-sm min-w-[130px]">
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="ready">Ready</option>
            <option value="sent">Sent</option>
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="input-field text-sm min-w-[130px]">
            <option value="">All types</option>
            <option value="individual">Individual</option>
            <option value="couple">Couple</option>
            <option value="household">Household</option>
          </select>
          {(search || statusFilter || typeFilter) && (
            <button onClick={() => { setSearch(''); setStatusFilter(''); setTypeFilter(''); }} className="text-xs text-red-500 hover:text-red-600 cursor-pointer whitespace-nowrap">
              <i className="ri-close-line mr-1" />Clear
            </button>
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block">
          {filteredInvitations.length === 0 ? (
            <div className="card-default text-center py-16">
              <div className="w-14 h-14 mx-auto flex items-center justify-center rounded-full bg-secondary-100 text-secondary-400 mb-4"><i className="ri-mail-send-line text-2xl" /></div>
              <h3 className="font-label text-sm font-semibold text-foreground-900 mb-2">No invitations found</h3>
              <p className="text-sm text-foreground-500 mb-4">Try adjusting your search or filters.</p>
              <button onClick={() => { setSearch(''); setStatusFilter(''); setTypeFilter(''); }} className="btn-outline text-sm cursor-pointer">Clear filters</button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-secondary-100">
                    <th className="text-left py-2.5 px-2 text-xs font-label text-foreground-500 font-medium">Invitation</th>
                    <th className="text-left py-2.5 px-2 text-xs font-label text-foreground-500 font-medium">Household</th>
                    <th className="text-left py-2.5 px-2 text-xs font-label text-foreground-500 font-medium">Type</th>
                    <th className="text-left py-2.5 px-2 text-xs font-label text-foreground-500 font-medium">Delivery</th>
                    <th className="text-left py-2.5 px-2 text-xs font-label text-foreground-500 font-medium">Status</th>
                    <th className="text-left py-2.5 px-2 text-xs font-label text-foreground-500 font-medium">Response</th>
                    <th className="text-right py-2.5 px-2 text-xs font-label text-foreground-500 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvitations.map((inv) => {
                    const firstGuestId = getFirstRecipientGuestId(inv);
                    const isOliver = firstGuestId === 'demo-guest-oliver';
                    return (
                      <tr key={inv.id} className="border-b border-secondary-50 hover:bg-background-50 transition-colors">
                        <td className="py-3 px-2">
                          <button onClick={() => navigate(`/app/invitations/${inv.id}`)} className="text-foreground-900 font-label hover:text-primary-600 transition-colors cursor-pointer text-left">
                            {inv.internal_name}
                          </button>
                          <p className="text-xs text-foreground-400 mt-0.5">{inv.formal_recipient_name}</p>
                        </td>
                        <td className="py-3 px-2 text-foreground-600 text-xs">{getHouseholdName(inv)}</td>
                        <td className="py-3 px-2 text-foreground-600 text-xs capitalize">{inv.invitation_type}</td>
                        <td className="py-3 px-2 text-foreground-600 text-xs capitalize">{inv.delivery_method}</td>
                        <td className="py-3 px-2"><span className={statusBadgeClass(inv.status)}>{inv.status}</span></td>
                        <td className="py-3 px-2 text-xs text-foreground-500">{inv.status === 'sent' ? getRecipientSummary(inv) : '—'}</td>
                        <td className="py-3 px-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => navigate(`/app/invitations/${inv.id}/preview`)} className="w-7 h-7 flex items-center justify-center rounded-md text-foreground-400 hover:text-foreground-700 hover:bg-background-100 cursor-pointer" title="Preview"><i className="ri-eye-line text-sm" /></button>
                            {isOliver && (
                              <button onClick={() => navigate('/guest/demo-session')} className="w-7 h-7 flex items-center justify-center rounded-md text-primary-500 hover:text-primary-700 hover:bg-primary-50 cursor-pointer" title="View as Oliver"><i className="ri-user-line text-sm" /></button>
                            )}
                            {inv.status === 'ready' && (
                              <button onClick={() => handleSimulateSend(inv.id)} disabled={simulatingId === inv.id} className="px-2.5 py-1 rounded-md bg-accent-100 text-accent-700 text-xs font-label hover:bg-accent-200 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50">
                                {simulatingId === inv.id ? <><i className="ri-loader-4-line animate-spin mr-1" />Sending...</> : <><i className="ri-send-plane-line mr-1" />Send</>}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-3">
          {filteredInvitations.length === 0 ? (
            <div className="card-default text-center py-16">
              <div className="w-14 h-14 mx-auto flex items-center justify-center rounded-full bg-secondary-100 text-secondary-400 mb-4"><i className="ri-mail-send-line text-2xl" /></div>
              <h3 className="font-label text-sm font-semibold text-foreground-900 mb-2">No invitations found</h3>
              <button onClick={() => { setSearch(''); setStatusFilter(''); setTypeFilter(''); }} className="btn-outline text-sm cursor-pointer">Clear filters</button>
            </div>
          ) : (
            filteredInvitations.map((inv) => (
              <div key={inv.id} className="card-default">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <button onClick={() => navigate(`/app/invitations/${inv.id}`)} className="text-sm font-label font-semibold text-foreground-900 hover:text-primary-600 transition-colors cursor-pointer text-left">{inv.internal_name}</button>
                    <p className="text-xs text-foreground-500 mt-0.5">{getHouseholdName(inv)} · <span className="capitalize">{inv.invitation_type}</span></p>
                  </div>
                  <span className={statusBadgeClass(inv.status)}>{inv.status}</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <button onClick={() => navigate(`/app/invitations/${inv.id}/preview`)} className="btn-ghost text-xs cursor-pointer whitespace-nowrap"><i className="ri-eye-line mr-1" />Preview</button>
                  {getFirstRecipientGuestId(inv) === 'demo-guest-oliver' && (
                    <button onClick={() => navigate('/guest/demo-session')} className="btn-ghost text-xs cursor-pointer text-primary-600 whitespace-nowrap"><i className="ri-user-line mr-1" />Oliver</button>
                  )}
                  {inv.status === 'ready' && (
                    <button onClick={() => handleSimulateSend(inv.id)} disabled={simulatingId === inv.id} className="px-2.5 py-1 rounded-md bg-accent-100 text-accent-700 text-xs font-label hover:bg-accent-200 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50">
                      {simulatingId === inv.id ? 'Sending...' : 'Send'}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}

// ── Export ──

export default function InvitationsPage() {
  if (isDemoMode) return <DemoInvitationsPage />;
  return <NormalInvitationsPage />;
}