import { useState, useCallback, useMemo } from 'react';
import AppShell from '@/components/feature/AppShell';
import { isDemoMode } from '@/demo/demoConfig';
import { useDemoDataSafe } from '@/demo/useDemoDataSafe';
import { useEmailCampaigns } from '@/hooks/useEmailCampaigns';
import CampaignEditor from './components/CampaignEditor';
import type {
  EmailCampaign,
  CampaignFormData,
  CampaignStatus,
  CampaignRecipient,
  AudienceFilter,
  DeliveryStats,
} from '@/types/emailCampaigns';
import {
  CAMPAIGN_STATUS_LABELS,
  CAMPAIGN_STATUS_COLORS,
  TEMPLATE_TYPE_LABELS,
  RECIPIENT_STATUS_LABELS,
  RECIPIENT_STATUS_COLORS,
  EMPTY_CAMPAIGN_FORM,
} from '@/types/emailCampaigns';

// ── Demo page ──
function DemoUpdatesPage() {
  const demo = useDemoDataSafe();
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  // Build demo campaigns from existing updates
  const demoCampaigns = useMemo(() => {
    if (!demo?.state.updates) return [];
    return demo.state.updates.map((u, i) => ({
      id: u.id,
      name: u.title,
      subject: u.title,
      status: 'sent' as CampaignStatus,
      recipient_count: demo.state.guests?.length || 0,
      delivery_stats: { accepted: demo.state.guests?.length || 0, delivered: demo.state.guests?.length || 0, bounced: 0, complained: 0, failed: 0 },
      sent_at: u.publish_at,
      sender_name: `${demo.state.wedding?.partner_one_name || ''} & ${demo.state.wedding?.partner_two_name || ''}`,
      category: u.category,
      priority: u.priority,
      summary: u.summary,
    }));
  }, [demo]);

  const selected = useMemo(() => demoCampaigns.find((c) => c.id === selectedCampaign), [demoCampaigns, selectedCampaign]);

  const stats = useMemo(() => ({
    total: demoCampaigns.length,
    draft: 0,
    scheduled: 0,
    sent: demoCampaigns.length,
    failed: 0,
  }), [demoCampaigns]);

  return (
    <AppShell>
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-lg bg-accent-500 text-white text-sm font-label font-medium shadow-lg whitespace-nowrap max-w-xs text-center">
          <i className="ri-check-line mr-2" />{toast}
        </div>
      )}

      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="font-heading text-2xl md:text-3xl text-foreground-900">Communications</h1>
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-label font-semibold">Demo</span>
            </div>
            <p className="text-sm text-foreground-500 mt-1">Create, preview, schedule and send email campaigns to your wedding guests</p>
          </div>
          <button onClick={() => setShowEditor(true)} className="btn-primary text-xs py-2 cursor-pointer whitespace-nowrap">
            <i className="ri-mail-add-line mr-1.5" />New campaign
          </button>
        </div>

        {/* Help banner */}
        <div className="mb-6 px-4 py-3.5 rounded-xl bg-accent-50 border border-accent-100 flex items-start gap-3">
          <div className="w-6 h-6 flex items-center justify-center text-accent-600 flex-shrink-0 mt-0.5"><i className="ri-lightbulb-line text-base" /></div>
          <div>
            <p className="text-sm font-label font-medium text-accent-900">Demo mode — no real emails sent</p>
            <p className="text-xs text-accent-700 mt-0.5 leading-relaxed">In production, you can create campaigns with templates, build recipient lists from your guest data, send test emails to yourself, and track delivery. Real emails require a verified Resend sending domain.</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-3 mb-8">
          {[
            { label: 'Campaigns', value: stats.total, color: 'text-foreground-900' },
            { label: 'Drafts', value: stats.draft, color: 'text-foreground-600' },
            { label: 'Scheduled', value: stats.scheduled, color: 'text-amber-600' },
            { label: 'Sent', value: stats.sent, color: 'text-emerald-600' },
            { label: 'Failed', value: stats.failed, color: 'text-red-600' },
          ].map((s, i) => (
            <div key={i} className="card-default text-center">
              <p className={`text-2xl font-heading font-semibold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-foreground-500 font-label mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Campaign list */}
        {demoCampaigns.length === 0 ? (
          <div className="card-default text-center py-14">
            <div className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-background-100 text-foreground-300 mb-3"><i className="ri-mail-line text-xl" /></div>
            <p className="text-sm text-foreground-500 mb-3">No campaigns yet.</p>
            <button onClick={() => setShowEditor(true)} className="btn-primary text-xs py-2 cursor-pointer whitespace-nowrap">Create your first campaign</button>
          </div>
        ) : (
          <div className="space-y-3">
            {demoCampaigns.map((c) => (
              <div key={c.id} onClick={() => setSelectedCampaign(selectedCampaign === c.id ? null : c.id)}
                className={`bg-white rounded-xl border p-5 cursor-pointer transition-colors ${selectedCampaign === c.id ? 'border-primary-400 ring-1 ring-primary-200' : 'border-secondary-200 hover:border-secondary-300'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="text-sm font-label font-semibold text-foreground-900">{c.name}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-label flex-shrink-0 ${CAMPAIGN_STATUS_COLORS[c.status]}`}>{CAMPAIGN_STATUS_LABELS[c.status]}</span>
                      {c.priority && c.priority !== 'standard' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-label flex-shrink-0">{c.priority}</span>
                      )}
                    </div>
                    <p className="text-xs text-foreground-600 line-clamp-1">{c.subject}</p>
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-foreground-400 font-label">
                      <span><i className="ri-user-line mr-0.5" />{c.recipient_count} recipients</span>
                      {c.sent_at && <span><i className="ri-time-line mr-0.5" />{new Date(c.sent_at).toLocaleDateString('en-GB')}</span>}
                    </div>
                  </div>
                  <i className={selectedCampaign === c.id ? 'ri-arrow-up-s-line text-foreground-400' : 'ri-arrow-down-s-line text-foreground-400'} />
                </div>

                {selectedCampaign === c.id && (
                  <div className="mt-4 pt-4 border-t border-secondary-100">
                    <p className="text-sm text-foreground-600 leading-relaxed">{c.summary}</p>
                    <div className="flex items-center gap-4 mt-4 text-xs text-foreground-500">
                      <span className="flex items-center gap-1"><i className="ri-check-double-line text-emerald-500" />{c.delivery_stats?.delivered || 0} delivered</span>
                      <span className="flex items-center gap-1"><i className="ri-mail-open-line text-sky-500" />{c.delivery_stats?.accepted || 0} accepted</span>
                      <span className="flex items-center gap-1"><i className="ri-error-warning-line text-red-400" />{c.delivery_stats?.failed || 0} failed</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Editor modal */}
      {showEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowEditor(false)}>
          <div className="bg-white rounded-xl w-full max-w-lg mx-4 p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-heading text-lg text-foreground-900">New campaign</h3>
              <button onClick={() => setShowEditor(false)} className="w-8 h-8 flex items-center justify-center rounded-md text-foreground-400 hover:bg-background-100 cursor-pointer"><i className="ri-close-line" /></button>
            </div>
            <div className="p-3 mb-4 rounded-lg bg-amber-50 border border-amber-100 text-xs text-amber-700">
              <i className="ri-information-line mr-1" />Demo mode — campaigns are simulated. No real emails are sent until you switch to production and configure Resend.
            </div>
            <p className="text-sm text-foreground-600 mb-6">In demo mode, you can explore the communications interface. Switch to a real account to send actual email campaigns via Resend.</p>
            <div className="flex justify-end gap-2 pt-4 border-t border-secondary-100">
              <button onClick={() => setShowEditor(false)} className="px-4 py-2 text-sm font-label text-foreground-600 hover:bg-background-100 rounded-lg cursor-pointer whitespace-nowrap">Close</button>
              <a href="/app/updates" className="px-5 py-2 bg-primary-500 text-white rounded-lg text-sm font-label font-semibold hover:bg-primary-600 cursor-pointer whitespace-nowrap">
                <i className="ri-external-link-line mr-1.5" />Switch to production
              </a>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

// ── Production page ──
function ProductionUpdatesPage() {
  const {
    campaigns, templates, loading, error,
    getStats, getRecipients,
    createCampaign, updateCampaign, updateCampaignStatus, deleteCampaign, duplicateCampaign,
    buildRecipients, sendTestEmail, sendCampaign, cancelScheduled,
  } = useEmailCampaigns();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<EmailCampaign | null>(null);
  const [filterStatus, setFilterStatus] = useState<CampaignStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isTestSending, setIsTestSending] = useState(false);
  const [toast, setToast] = useState('');
  const [detailTab, setDetailTab] = useState<'overview' | 'recipients'>('overview');
  const [recipients, setRecipients] = useState<CampaignRecipient[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [sendConfirm, setSendConfirm] = useState<string | null>(null);

  const stats = useMemo(() => getStats(), [getStats]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  const filtered = useMemo(() => {
    let list = campaigns;
    if (filterStatus !== 'all') list = list.filter((c) => c.status === filterStatus);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q) || c.subject.toLowerCase().includes(q));
    }
    return list;
  }, [campaigns, filterStatus, searchQuery]);

  const selected = useMemo(() => campaigns.find((c) => c.id === selectedId), [campaigns, selectedId]);

  // Load recipients when selecting a campaign
  const selectCampaign = useCallback(async (id: string) => {
    if (selectedId === id) { setSelectedId(null); return; }
    setSelectedId(id);
    setDetailTab('overview');
    setLoadingRecipients(true);
    try {
      const recs = await getRecipients(id);
      setRecipients(recs);
    } catch {
      setRecipients([]);
    } finally {
      setLoadingRecipients(false);
    }
  }, [selectedId, getRecipients]);

  // Create new campaign
  const handleCreate = async (data: CampaignFormData) => {
    setIsSaving(true);
    try {
      await createCampaign(data);
      setShowEditor(false);
      showToast('Campaign saved as draft');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  // Edit existing campaign
  const handleEdit = (campaign: EmailCampaign) => {
    setEditingCampaign(campaign);
    setShowEditor(true);
  };

  const handleUpdate = async (data: CampaignFormData) => {
    if (!editingCampaign) return;
    setIsSaving(true);
    try {
      await updateCampaign(editingCampaign.id, data);
      setShowEditor(false);
      setEditingCampaign(null);
      showToast('Campaign updated');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setIsSaving(false);
    }
  };

  // Build recipients
  const handleBuildRecipients = async (campaignId: string, filter: AudienceFilter): Promise<number> => {
    try {
      const count = await buildRecipients(campaignId, filter);
      showToast(`${count} recipients built`);
      return count;
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to build recipients');
      throw err;
    }
  };

  // Test send
  const handleTestSend = async (campaignId: string) => {
    setIsTestSending(true);
    try {
      await sendTestEmail(campaignId);
      showToast('Test email sent to your address');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Test send failed');
    } finally {
      setIsTestSending(false);
    }
  };

  // Send campaign
  const handleSend = async (campaignId: string) => {
    setIsSending(true);
    setSendConfirm(null);
    try {
      await sendCampaign(campaignId);
      showToast('Campaign sent!');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Send failed');
    } finally {
      setIsSending(false);
    }
  };

  // Delete
  const handleDelete = async (campaignId: string) => {
    try {
      await deleteCampaign(campaignId);
      setDeleteConfirm(null);
      setSelectedId(null);
      showToast('Campaign deleted');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  // Duplicate
  const handleDuplicate = async (campaignId: string) => {
    try {
      await duplicateCampaign(campaignId);
      showToast('Campaign duplicated');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Duplicate failed');
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // ── Render ──
  return (
    <AppShell>
      {/* Toast */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-lg bg-accent-500 text-white text-sm font-label font-medium shadow-lg whitespace-nowrap max-w-sm text-center">
          <i className="ri-check-line mr-2" />{toast}
        </div>
      )}

      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="font-heading text-2xl md:text-3xl text-foreground-900">Communications</h1>
            <p className="text-sm text-foreground-500 mt-1">Create, preview, schedule and send email campaigns to your wedding guests</p>
          </div>
          <button onClick={() => { setEditingCampaign(null); setShowEditor(true); }}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg text-xs font-label font-semibold hover:bg-primary-600 cursor-pointer whitespace-nowrap">
            <i className="ri-mail-add-line mr-1.5" />New campaign
          </button>
        </div>

        {/* Status bar */}
        <div className="mb-6 px-4 py-2.5 rounded-lg bg-amber-50 border border-amber-100 flex items-center gap-2 text-xs text-amber-800">
          <i className="ri-information-line flex-shrink-0" />
          <span>Real email delivery requires a verified Resend sending domain. Go to <strong>Settings → Resend</strong> to configure before sending live campaigns.</span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-3 mb-6">
          {[
            { label: 'Campaigns', value: stats.total, color: 'text-foreground-900', icon: 'ri-mail-line' },
            { label: 'Drafts', value: stats.draft, color: 'text-foreground-600', icon: 'ri-draft-line' },
            { label: 'Scheduled', value: stats.scheduled, color: 'text-amber-600', icon: 'ri-time-line' },
            { label: 'Sent', value: stats.sent, color: 'text-emerald-600', icon: 'ri-check-double-line' },
            { label: 'Failed', value: stats.failed, color: 'text-red-600', icon: 'ri-error-warning-line' },
          ].map((s, i) => (
            <div key={i} className="card-default text-center">
              <p className={`text-2xl font-heading font-semibold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-foreground-500 font-label mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Sent stats sub-row */}
        {stats.total_sent_count > 0 && (
          <div className="grid grid-cols-4 gap-3 mb-6">
            <div className="card-default text-center"><p className="text-lg font-heading font-semibold text-foreground-900">{stats.total_sent_count}</p><p className="text-xs text-foreground-500">Total recipients</p></div>
            <div className="card-default text-center"><p className="text-lg font-heading font-semibold text-emerald-600">{stats.total_delivered}</p><p className="text-xs text-foreground-500">Delivered</p></div>
            <div className="card-default text-center"><p className="text-lg font-heading font-semibold text-red-600">{stats.total_bounced}</p><p className="text-xs text-foreground-500">Bounced</p></div>
            <div className="card-default text-center"><p className="text-lg font-heading font-semibold text-orange-600">{stats.total_complained}</p><p className="text-xs text-foreground-500">Complaints</p></div>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-1 bg-background-100 rounded-full p-1">
            {(['all','draft','scheduled','sent','failed','archived'] as const).map((s) => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`px-3 py-1 text-xs font-label font-medium rounded-full cursor-pointer whitespace-nowrap transition-colors ${filterStatus === s ? 'bg-white text-foreground-900 shadow-sm' : 'text-foreground-500 hover:text-foreground-700'}`}>
                {s === 'all' ? 'All' : CAMPAIGN_STATUS_LABELS[s]}
              </button>
            ))}
          </div>
          <div className="flex-1" />
          <div className="relative">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400 text-xs" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search campaigns..." className="pl-8 pr-3 py-1.5 text-xs border border-secondary-200 rounded-lg w-48 focus:outline-none focus:border-primary-300" />
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-secondary-200 p-5 animate-pulse">
                <div className="h-4 bg-background-200 rounded w-1/3 mb-2" />
                <div className="h-3 bg-background-100 rounded w-2/3" />
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="card-default text-center py-10">
            <div className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-red-100 text-red-500 mb-3"><i className="ri-error-warning-line text-xl" /></div>
            <p className="text-sm text-foreground-600 mb-3">{error}</p>
            <button onClick={() => window.location.reload()} className="px-4 py-2 bg-primary-500 text-white rounded-lg text-xs font-label cursor-pointer whitespace-nowrap">Try again</button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && campaigns.length === 0 && (
          <div className="card-default text-center py-14">
            <div className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-background-100 text-foreground-300 mb-3"><i className="ri-mail-line text-xl" /></div>
            <p className="text-sm text-foreground-500 mb-3">No campaigns yet. Create your first email campaign to get started.</p>
            <button onClick={() => { setEditingCampaign(null); setShowEditor(true); }} className="px-4 py-2 bg-primary-500 text-white rounded-lg text-xs font-label font-semibold cursor-pointer whitespace-nowrap">Create campaign</button>
          </div>
        )}

        {/* Campaign list */}
        {!loading && !error && campaigns.length > 0 && filtered.length === 0 && (
          <div className="card-default text-center py-10">
            <p className="text-sm text-foreground-500 mb-2">No campaigns match your filters.</p>
            <button onClick={() => { setFilterStatus('all'); setSearchQuery(''); }} className="text-xs text-primary-600 hover:underline cursor-pointer">Clear all filters</button>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="space-y-3">
            {filtered.map((c) => (
              <div key={c.id} onClick={() => selectCampaign(c.id)}
                className={`bg-white rounded-xl border p-5 cursor-pointer transition-colors ${selectedId === c.id ? 'border-primary-400 ring-1 ring-primary-200' : 'border-secondary-200 hover:border-secondary-300'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="text-sm font-label font-semibold text-foreground-900">{c.name}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-label flex-shrink-0 ${CAMPAIGN_STATUS_COLORS[c.status]}`}>{CAMPAIGN_STATUS_LABELS[c.status]}</span>
                      {c.template_id && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-background-200 text-foreground-500 font-label flex-shrink-0">
                          {TEMPLATE_TYPE_LABELS[templates.find((t) => t.id === c.template_id)?.template_type || 'custom'] || 'Template'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-foreground-600 line-clamp-1">{c.subject}</p>
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-foreground-400 font-label flex-wrap">
                      <span><i className="ri-user-line mr-0.5" />{c.recipient_count} recipients</span>
                      {c.schedule_at && c.status === 'scheduled' && <span><i className="ri-calendar-line mr-0.5" />{formatDate(c.schedule_at)}</span>}
                      {c.sent_at && <span><i className="ri-check-line mr-0.5" />Sent {formatDate(c.sent_at)}</span>}
                      {c.sender_name && <span><i className="ri-at-line mr-0.5" />{c.sender_name}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {c.status === 'draft' && (
                      <>
                        <button onClick={(e) => { e.stopPropagation(); handleEdit(c); }} title="Edit" className="w-7 h-7 flex items-center justify-center rounded text-foreground-400 hover:text-foreground-600 hover:bg-background-100 cursor-pointer"><i className="ri-edit-line text-sm" /></button>
                        <button onClick={(e) => { e.stopPropagation(); handleDuplicate(c.id); }} title="Duplicate" className="w-7 h-7 flex items-center justify-center rounded text-foreground-400 hover:text-foreground-600 hover:bg-background-100 cursor-pointer"><i className="ri-file-copy-line text-sm" /></button>
                        <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm(c.id); }} title="Delete" className="w-7 h-7 flex items-center justify-center rounded text-foreground-400 hover:text-red-500 hover:bg-red-50 cursor-pointer"><i className="ri-delete-bin-line text-sm" /></button>
                      </>
                    )}
                    {c.status === 'scheduled' && (
                      <button onClick={(e) => { e.stopPropagation(); cancelScheduled(c.id); showToast('Schedule cancelled'); }} title="Cancel schedule" className="px-2 py-1 text-xs text-foreground-500 hover:bg-background-100 rounded cursor-pointer whitespace-nowrap">
                        <i className="ri-close-circle-line mr-1" />Cancel
                      </button>
                    )}
                    {c.status === 'sent' && (
                      <button onClick={(e) => { e.stopPropagation(); updateCampaignStatus(c.id, 'archived'); showToast('Campaign archived'); }} title="Archive" className="w-7 h-7 flex items-center justify-center rounded text-foreground-400 hover:text-foreground-600 hover:bg-background-100 cursor-pointer"><i className="ri-archive-line text-sm" /></button>
                    )}
                    <i className={selectedId === c.id ? 'ri-arrow-up-s-line text-foreground-400' : 'ri-arrow-down-s-line text-foreground-400'} />
                  </div>
                </div>

                {/* Expanded detail */}
                {selectedId === c.id && (
                  <div className="mt-4 pt-4 border-t border-secondary-100">
                    {/* Detail tabs */}
                    <div className="flex items-center gap-1 mb-4">
                      {(['overview','recipients'] as const).map((tab) => (
                        <button key={tab} onClick={(e) => { e.stopPropagation(); setDetailTab(tab); }}
                          className={`px-3 py-1 text-xs font-label font-medium rounded-full cursor-pointer whitespace-nowrap transition-colors ${detailTab === tab ? 'bg-primary-500 text-white' : 'text-foreground-500 hover:bg-background-200'}`}>
                          {tab === 'overview' ? 'Overview' : 'Recipients'}
                        </button>
                      ))}
                    </div>

                    {detailTab === 'overview' && selected && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-3 text-xs">
                          <div><span className="text-foreground-400">Sender:</span> <span className="text-foreground-700 ml-1">{selected.sender_name}</span></div>
                          <div><span className="text-foreground-400">From:</span> <span className="text-foreground-700 ml-1">{selected.sender_email}</span></div>
                          <div><span className="text-foreground-400">Reply-to:</span> <span className="text-foreground-700 ml-1">{selected.reply_to_email || '—'}</span></div>
                        </div>
                        <div>
                          <p className="text-xs text-foreground-400 mb-1">Subject</p>
                          <p className="text-sm text-foreground-800">{selected.subject}</p>
                        </div>
                        {selected.preheader && (
                          <div>
                            <p className="text-xs text-foreground-400 mb-1">Preheader</p>
                            <p className="text-sm text-foreground-600">{selected.preheader}</p>
                          </div>
                        )}
                        {selected.cta_label && (
                          <div>
                            <p className="text-xs text-foreground-400 mb-1">CTA</p>
                            <p className="text-sm text-foreground-600">{selected.cta_label} → {selected.cta_url}</p>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded" style={{ background: selected.brand_primary_color }} title="Primary" />
                          <div className="w-5 h-5 rounded border" style={{ background: selected.brand_secondary_color }} title="Secondary bg" />
                          <div className="w-5 h-5 rounded" style={{ background: selected.brand_accent_color }} title="Accent" />
                          <span className="text-xs text-foreground-400 ml-1">{selected.brand_font_family}</span>
                        </div>

                        {/* Delivery stats */}
                        {selected.status !== 'draft' && (
                          <div className="grid grid-cols-5 gap-2 mt-3 pt-3 border-t border-secondary-100">
                            {[
                              { label: 'Accepted', value: (selected.delivery_stats as DeliveryStats)?.accepted || 0, color: 'text-amber-600' },
                              { label: 'Delivered', value: (selected.delivery_stats as DeliveryStats)?.delivered || 0, color: 'text-emerald-600' },
                              { label: 'Bounced', value: (selected.delivery_stats as DeliveryStats)?.bounced || 0, color: 'text-red-600' },
                              { label: 'Complaints', value: (selected.delivery_stats as DeliveryStats)?.complained || 0, color: 'text-orange-600' },
                              { label: 'Failed', value: (selected.delivery_stats as DeliveryStats)?.failed || 0, color: 'text-red-600' },
                            ].map((s, i) => (
                              <div key={i} className="text-center">
                                <p className={`text-lg font-heading font-semibold ${s.color}`}>{s.value}</p>
                                <p className="text-[10px] text-foreground-400">{s.label}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 pt-3 border-t border-secondary-100">
                          {selected.status === 'draft' && (
                            <>
                              <button onClick={(e) => { e.stopPropagation(); handleEdit(selected); }} className="px-3 py-1.5 text-xs font-label bg-secondary-500 text-white rounded-lg hover:bg-secondary-600 cursor-pointer whitespace-nowrap">
                                <i className="ri-edit-line mr-1" />Edit
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); setSendConfirm(selected.id); }} className="px-3 py-1.5 text-xs font-label bg-primary-500 text-white rounded-lg hover:bg-primary-600 cursor-pointer whitespace-nowrap">
                                <i className="ri-send-plane-line mr-1" />Review &amp; send
                              </button>
                            </>
                          )}
                          {selected.status === 'sent' && (
                            <>
                              <button onClick={(e) => { e.stopPropagation(); handleDuplicate(selected.id); }} className="px-3 py-1.5 text-xs font-label bg-secondary-500 text-white rounded-lg hover:bg-secondary-600 cursor-pointer whitespace-nowrap">
                                <i className="ri-file-copy-line mr-1" />Duplicate
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); updateCampaignStatus(selected.id, 'archived'); showToast('Archived'); }} className="px-3 py-1.5 text-xs font-label text-foreground-600 hover:bg-background-200 rounded-lg cursor-pointer whitespace-nowrap">
                                <i className="ri-archive-line mr-1" />Archive
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {detailTab === 'recipients' && (
                      <div>
                        {loadingRecipients ? (
                          <div className="text-center py-4"><i className="ri-loader-4-line animate-spin text-foreground-400" /><p className="text-xs text-foreground-400 mt-1">Loading recipients...</p></div>
                        ) : recipients.length === 0 ? (
                          <p className="text-xs text-foreground-500 py-2">No recipients built yet. Edit the campaign and build your recipient list.</p>
                        ) : (
                          <div className="max-h-64 overflow-y-auto space-y-1">
                            {recipients.map((r) => (
                              <div key={r.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-background-50 text-xs">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${r.status === 'delivered' ? 'bg-emerald-500' : r.status === 'bounced' || r.status === 'failed' ? 'bg-red-500' : r.status === 'complained' ? 'bg-orange-500' : r.status === 'suppressed' ? 'bg-foreground-300' : 'bg-amber-400'}`} />
                                  <span className="text-foreground-700 truncate">{r.recipient_name || r.recipient_email}</span>
                                </div>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-label flex-shrink-0 ${RECIPIENT_STATUS_COLORS[r.status]}`}>{RECIPIENT_STATUS_LABELS[r.status]}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Campaign editor */}
      {showEditor && (
        <CampaignEditor
          templates={templates}
          initialData={editingCampaign ? {
            name: editingCampaign.name,
            subject: editingCampaign.subject,
            preheader: editingCampaign.preheader,
            sender_name: editingCampaign.sender_name,
            sender_email: editingCampaign.sender_email,
            reply_to_email: editingCampaign.reply_to_email,
            content_blocks: editingCampaign.content_blocks,
            cta_label: editingCampaign.cta_label,
            cta_url: editingCampaign.cta_url,
            brand_primary_color: editingCampaign.brand_primary_color,
            brand_secondary_color: editingCampaign.brand_secondary_color,
            brand_accent_color: editingCampaign.brand_accent_color,
            brand_font_family: editingCampaign.brand_font_family,
            audience_filter: (editingCampaign.audience_filter || {}) as AudienceFilter,
            schedule_at: editingCampaign.schedule_at,
            template_id: editingCampaign.template_id,
          } : undefined}
          onSave={editingCampaign ? handleUpdate : handleCreate}
          onClose={() => { setShowEditor(false); setEditingCampaign(null); }}
          onTestSend={editingCampaign ? () => handleTestSend(editingCampaign.id) : undefined}
          onBuildRecipients={editingCampaign ? (filter) => handleBuildRecipients(editingCampaign.id, filter) : undefined}
          isSaving={isSaving}
          isTestSending={isTestSending}
          isNew={!editingCampaign}
        />
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-xl w-full max-w-sm mx-4 p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 flex items-center justify-center rounded-full bg-red-100 text-red-600"><i className="ri-delete-bin-line text-lg" /></div>
              <div><h4 className="font-label font-semibold text-foreground-900 text-sm">Delete campaign?</h4><p className="text-xs text-foreground-500">This will permanently delete the campaign and all recipient data.</p></div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm text-foreground-600 hover:bg-background-100 rounded-lg cursor-pointer whitespace-nowrap">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-label font-semibold hover:bg-red-600 cursor-pointer whitespace-nowrap">
                <i className="ri-delete-bin-line mr-1" />Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send confirmation */}
      {sendConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" onClick={() => setSendConfirm(null)}>
          <div className="bg-white rounded-xl w-full max-w-md mx-4 p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 flex items-center justify-center rounded-full bg-primary-100 text-primary-600"><i className="ri-send-plane-line text-lg" /></div>
              <div>
                <h4 className="font-label font-semibold text-foreground-900 text-sm">Ready to send?</h4>
                <p className="text-xs text-foreground-500">This will send the campaign to all built recipients immediately.</p>
              </div>
            </div>
            <div className="bg-background-50 rounded-lg p-3 mb-4 text-xs space-y-1">
              <p><strong>Campaign:</strong> {campaigns.find((c) => c.id === sendConfirm)?.name}</p>
              <p><strong>Subject:</strong> {campaigns.find((c) => c.id === sendConfirm)?.subject}</p>
              <p><strong>Recipients:</strong> {campaigns.find((c) => c.id === sendConfirm)?.recipient_count || 0}</p>
              <p><strong>Sender:</strong> {campaigns.find((c) => c.id === sendConfirm)?.sender_name}</p>
            </div>
            <p className="text-xs text-amber-700 bg-amber-50 rounded-lg p-2 mb-4">
              <i className="ri-alert-line mr-1" />Make sure you have sent a test email first and reviewed the preview. Real sending cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setSendConfirm(null)} className="px-4 py-2 text-sm text-foreground-600 hover:bg-background-100 rounded-lg cursor-pointer whitespace-nowrap">Cancel</button>
              <button onClick={() => handleSend(sendConfirm)} disabled={isSending}
                className="px-5 py-2 bg-primary-500 text-white rounded-lg text-sm font-label font-semibold hover:bg-primary-600 disabled:opacity-50 cursor-pointer whitespace-nowrap">
                <i className={`${isSending ? 'ri-loader-4-line animate-spin' : 'ri-send-plane-line'} mr-1.5`} />
                {isSending ? 'Sending...' : 'Send now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

// ── Route export ──
export default function UpdatesPage() {
  if (isDemoMode) return <DemoUpdatesPage />;
  return <ProductionUpdatesPage />;
}