import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthProvider';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { isDemoMode } from '@/demo/demoConfig';
import { RELEASE_VERSION } from '@/lib/env';

// ── Types ──

type Severity = 'critical' | 'high' | 'medium' | 'low';
type IncidentStatus = 'open' | 'investigating' | 'monitoring' | 'resolved' | 'closed';

interface OperationalIncident {
  id: string;
  incident_ref: string;
  title: string;
  severity: Severity;
  status: IncidentStatus;
  affected_service: string | null;
  start_time: string;
  end_time: string | null;
  detected_by: string | null;
  user_impact: string | null;
  technical_summary: string | null;
  release_version: string | null;
  assigned_owner: string | null;
  immediate_action: string | null;
  resolution: string | null;
  follow_up_actions: string | null;
  created_at: string;
  updated_at: string;
}

interface IncidentUpdate {
  id: string;
  incident_id: string;
  author: string;
  text: string;
  visibility: 'internal';
  status_change: IncidentStatus | null;
  created_at: string;
}

// ── Severity helpers ──

function severityColor(sev: Severity): string {
  return { critical: 'bg-red-100 text-red-700', high: 'bg-orange-100 text-orange-700', medium: 'bg-amber-100 text-amber-700', low: 'bg-blue-100 text-blue-700' }[sev];
}

function statusColor(st: IncidentStatus): string {
  return { open: 'bg-red-100 text-red-700', investigating: 'bg-orange-100 text-orange-700', monitoring: 'bg-amber-100 text-amber-700', resolved: 'bg-green-100 text-green-700', closed: 'bg-gray-100 text-gray-500' }[st];
}

// ── Main component ──

export default function IncidentsPage() {
  const { profile } = useAuth();
  const { membership } = useActiveWedding();
  const isAuthorised = membership?.role === 'owner' || membership?.role === 'partner';
  const isDemo = isDemoMode;

  const [incidents, setIncidents] = useState<OperationalIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<IncidentStatus | 'all'>('all');
  const [selectedIncident, setSelectedIncident] = useState<OperationalIncident | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [updates, setUpdates] = useState<IncidentUpdate[]>([]);

  // Create form state
  const [formTitle, setFormTitle] = useState('');
  const [formSeverity, setFormSeverity] = useState<Severity>('medium');
  const [formService, setFormService] = useState('');
  const [formImpact, setFormImpact] = useState('');
  const [formSummary, setFormSummary] = useState('');
  const [formOwner, setFormOwner] = useState('');
  const [formAction, setFormAction] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Update form state
  const [updateText, setUpdateText] = useState('');
  const [updateStatus, setUpdateStatus] = useState<IncidentStatus>('open');
  const [postingUpdate, setPostingUpdate] = useState(false);

  // Close confirm
  const [closeConfirmId, setCloseConfirmId] = useState<string | null>(null);

  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase.from('operational_incidents').select('*').order('created_at', { ascending: false });
      if (statusFilter !== 'all') query = query.eq('status', statusFilter);
      const { data, error: err } = await query.limit(50);
      if (err) throw err;
      setIncidents((data || []) as OperationalIncident[]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load incidents');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  const handleCreate = async () => {
    if (!formTitle.trim()) return;
    setCreating(true);
    setCreateError(null);
    const ref = `INC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    try {
      const { error: err } = await supabase.from('operational_incidents').insert({
        incident_ref: ref,
        title: formTitle.trim(),
        severity: formSeverity,
        affected_service: formService.trim() || null,
        user_impact: formImpact.trim() || null,
        technical_summary: formSummary.trim() || null,
        assigned_owner: formOwner.trim() || null,
        immediate_action: formAction.trim() || null,
        release_version: RELEASE_VERSION,
        detected_by: profile?.email || 'unknown',
      });
      if (err) throw err;
      setShowCreate(false);
      setFormTitle(''); setFormSeverity('medium'); setFormService(''); setFormImpact(''); setFormSummary(''); setFormOwner(''); setFormAction('');
      fetchIncidents();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create incident');
    } finally {
      setCreating(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: IncidentStatus) => {
    if ((newStatus === 'closed') && !closeConfirmId) {
      setCloseConfirmId(id);
      return;
    }
    setCloseConfirmId(null);
    try {
      const updates: Partial<OperationalIncident> = { status: newStatus, updated_at: new Date().toISOString() };
      if (newStatus === 'resolved' || newStatus === 'closed') updates.end_time = new Date().toISOString();
      const { error: err } = await supabase.from('operational_incidents').update(updates).eq('id', id);
      if (err) throw err;
      fetchIncidents();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Status update failed');
    }
  };

  const handlePostUpdate = async () => {
    if (!selectedIncident || !updateText.trim()) return;
    setPostingUpdate(true);
    try {
      // Use a simple approach - update the incident with the update appended
      const newUpdate = `[${new Date().toISOString()}] ${profile?.email || 'operator'}: ${updateText.trim()}${updateStatus !== selectedIncident.status ? ` (Status → ${updateStatus})` : ''}`;
      const resolution = selectedIncident.resolution ? `${selectedIncident.resolution}\n${newUpdate}` : newUpdate;
      const updates: Partial<OperationalIncident> = {
        resolution,
        status: updateStatus,
        updated_at: new Date().toISOString(),
      };
      if (updateStatus === 'resolved' || updateStatus === 'closed') updates.end_time = new Date().toISOString();
      const { error: err } = await supabase.from('operational_incidents').update(updates).eq('id', selectedIncident.id);
      if (err) throw err;
      setUpdateText('');
      fetchIncidents();
      setSelectedIncident((prev) => prev && { ...prev, resolution, status: updateStatus, updated_at: new Date().toISOString() });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to post update');
    } finally {
      setPostingUpdate(false);
    }
  };

  // ── Access gates ──

  if (isDemo) {
    return (
      <div className="min-h-screen bg-background-50 flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-amber-100 text-amber-600 mb-6"><i className="ri-tools-line text-2xl" /></div>
          <h1 className="font-heading text-2xl text-foreground-900 mb-3">Incident Management</h1>
          <p className="text-sm text-foreground-500 mb-6">Incident management is not available in demo mode.</p>
          <Link to="/app/dashboard" className="text-sm text-primary-500 font-label hover:underline cursor-pointer whitespace-nowrap"><i className="ri-arrow-left-line mr-1.5" />Back to dashboard</Link>
        </div>
      </div>
    );
  }

  if (!isAuthorised) {
    return (
      <div className="min-h-screen bg-background-50 flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-primary-50 text-primary-600 mb-6"><i className="ri-shield-check-line text-2xl" /></div>
          <h1 className="font-heading text-2xl text-foreground-900 mb-3">Access Restricted</h1>
          <p className="text-sm text-foreground-500 mb-6">Only wedding owners and partners can access incident management.</p>
          <Link to="/app/dashboard" className="text-sm text-primary-500 font-label hover:underline cursor-pointer whitespace-nowrap"><i className="ri-arrow-left-line mr-1.5" />Back to dashboard</Link>
        </div>
      </div>
    );
  }

  // ── Render ──

  return (
    <div className="min-h-screen bg-background-50">
      <header className="h-16 bg-white border-b border-secondary-100 flex items-center px-4 md:px-6">
        <Link to="/app/dashboard" className="font-heading text-xl font-semibold text-foreground-900 cursor-pointer">Vowora</Link>
        <span className="ml-3 px-2 py-0.5 rounded text-[10px] font-label font-medium bg-secondary-100 text-secondary-700 uppercase tracking-wide">Incidents</span>
        <div className="ml-auto flex items-center gap-2">
          <Link to="/app/admin/operations" className="text-xs text-foreground-400 hover:text-foreground-600 cursor-pointer whitespace-nowrap"><i className="ri-arrow-left-line mr-1" />Operations</Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-xs font-label text-foreground-400 uppercase tracking-wide mb-1">Incident Management</p>
            <h1 className="font-heading text-2xl text-foreground-900">Platform Incidents</h1>
          </div>
          <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap">
            <i className="ri-add-line" />New Incident
          </button>
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1 mb-6 bg-secondary-100 rounded-full p-1 w-fit flex-wrap">
          {(['all', 'open', 'investigating', 'monitoring', 'resolved', 'closed'] as const).map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 rounded-full text-xs font-label font-medium transition-colors cursor-pointer whitespace-nowrap ${statusFilter === s ? 'bg-white text-foreground-900 shadow-sm' : 'text-foreground-500 hover:text-foreground-700'}`}>
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 mb-6 flex items-center gap-2">
            <i className="ri-error-warning-line text-red-600" />
            <p className="text-sm text-red-700">{error}</p>
            <button onClick={fetchIncidents} className="ml-auto text-xs text-red-600 underline cursor-pointer">Retry</button>
          </div>
        )}

        {/* Create form */}
        {showCreate && (
          <div className="p-5 rounded-lg bg-white border border-secondary-200 mb-8">
            <h2 className="font-heading text-lg text-foreground-900 mb-4">Create Incident</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-label text-foreground-500 mb-1">Title *</label>
                <input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm text-foreground-900 focus:border-primary-300 focus:ring-1 focus:ring-primary-200 outline-none" placeholder="Brief incident title" />
              </div>
              <div>
                <label className="block text-xs font-label text-foreground-500 mb-1">Severity</label>
                <select value={formSeverity} onChange={(e) => setFormSeverity(e.target.value as Severity)} className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm text-foreground-900 bg-white outline-none cursor-pointer">
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-label text-foreground-500 mb-1">Affected Service</label>
                <input value={formService} onChange={(e) => setFormService(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm text-foreground-900 outline-none" placeholder="e.g. Stripe webhooks" />
              </div>
              <div>
                <label className="block text-xs font-label text-foreground-500 mb-1">Assigned Owner</label>
                <input value={formOwner} onChange={(e) => setFormOwner(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm text-foreground-900 outline-none" placeholder="e.g. ops@vowora.uk" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-label text-foreground-500 mb-1">User Impact</label>
                <input value={formImpact} onChange={(e) => setFormImpact(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm text-foreground-900 outline-none" placeholder="How are users affected?" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-label text-foreground-500 mb-1">Technical Summary</label>
                <textarea value={formSummary} onChange={(e) => setFormSummary(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm text-foreground-900 outline-none resize-none" placeholder="Safe technical details (no secrets)" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-label text-foreground-500 mb-1">Immediate Action</label>
                <input value={formAction} onChange={(e) => setFormAction(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm text-foreground-900 outline-none" placeholder="First action taken" />
              </div>
            </div>
            {createError && <p className="text-xs text-red-600 mb-3">{createError}</p>}
            <div className="flex items-center gap-3">
              <button onClick={handleCreate} disabled={creating || !formTitle.trim()} className="px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer disabled:opacity-40 whitespace-nowrap">
                {creating ? 'Creating...' : 'Create Incident'}
              </button>
              <button onClick={() => { setShowCreate(false); setCreateError(null); }} className="px-4 py-2 text-sm text-foreground-500 hover:text-foreground-700 cursor-pointer whitespace-nowrap">Cancel</button>
            </div>
          </div>
        )}

        {/* Incident list */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 rounded-lg bg-white border border-secondary-100 animate-pulse">
                <div className="h-4 bg-secondary-100 rounded w-2/3 mb-2" />
                <div className="h-3 bg-secondary-100 rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : incidents.length === 0 ? (
          <div className="p-10 text-center">
            <div className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-green-50 text-green-500 mb-4"><i className="ri-check-line text-xl" /></div>
            <p className="font-label font-medium text-sm text-foreground-900">No incidents found</p>
            <p className="text-xs text-foreground-400 mt-1">{statusFilter === 'all' ? 'Platform is running smoothly' : `No ${statusFilter} incidents`}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {incidents.map((inc) => (
              <div key={inc.id} className={`p-4 rounded-lg bg-white border cursor-pointer transition-colors ${selectedIncident?.id === inc.id ? 'border-primary-300 bg-primary-50/30' : 'border-secondary-100 hover:border-secondary-300'}`} onClick={() => setSelectedIncident(selectedIncident?.id === inc.id ? null : inc)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-mono text-foreground-400">{inc.incident_ref}</span>
                      <span className={`text-[10px] font-label font-semibold uppercase px-1.5 py-0.5 rounded ${severityColor(inc.severity)}`}>{inc.severity}</span>
                      <span className={`text-[10px] font-label font-semibold uppercase px-1.5 py-0.5 rounded ${statusColor(inc.status)}`}>{inc.status}</span>
                    </div>
                    <p className="font-label font-medium text-sm text-foreground-900">{inc.title}</p>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-foreground-400">
                      {inc.affected_service && <span><i className="ri-server-line mr-0.5" />{inc.affected_service}</span>}
                      {inc.assigned_owner && <span><i className="ri-user-line mr-0.5" />{inc.assigned_owner}</span>}
                      <span>{new Date(inc.start_time).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {inc.status !== 'resolved' && inc.status !== 'closed' && (
                      <>
                        {closeConfirmId === inc.id ? (
                          <div className="flex items-center gap-1">
                            <button onClick={(e) => { e.stopPropagation(); handleStatusChange(inc.id, 'closed'); }} className="px-2 py-1 rounded text-[10px] font-label font-medium bg-red-500 text-white hover:bg-red-600 cursor-pointer whitespace-nowrap">Confirm close</button>
                            <button onClick={(e) => { e.stopPropagation(); setCloseConfirmId(null); }} className="px-2 py-1 text-[10px] text-foreground-400 cursor-pointer whitespace-nowrap">Cancel</button>
                          </div>
                        ) : (
                          <button onClick={(e) => { e.stopPropagation(); handleStatusChange(inc.id, 'resolved'); }} className="px-2 py-1 rounded text-[10px] font-label bg-green-100 text-green-700 hover:bg-green-200 cursor-pointer whitespace-nowrap">Resolve</button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Expanded detail */}
                {selectedIncident?.id === inc.id && (
                  <div className="mt-4 pt-4 border-t border-secondary-100" onClick={(e) => e.stopPropagation()}>
                    {inc.user_impact && (
                      <div className="mb-3">
                        <p className="text-[10px] font-label text-foreground-400 uppercase mb-0.5">User Impact</p>
                        <p className="text-sm text-foreground-700">{inc.user_impact}</p>
                      </div>
                    )}
                    {inc.technical_summary && (
                      <div className="mb-3">
                        <p className="text-[10px] font-label text-foreground-400 uppercase mb-0.5">Technical Summary</p>
                        <p className="text-sm text-foreground-700">{inc.technical_summary}</p>
                      </div>
                    )}
                    {inc.immediate_action && (
                      <div className="mb-3">
                        <p className="text-[10px] font-label text-foreground-400 uppercase mb-0.5">Immediate Action</p>
                        <p className="text-sm text-foreground-700">{inc.immediate_action}</p>
                      </div>
                    )}
                    {inc.resolution && (
                      <div className="mb-3 p-3 rounded-lg bg-green-50 border border-green-100">
                        <p className="text-[10px] font-label text-green-700 uppercase mb-0.5">Resolution / Updates</p>
                        <p className="text-sm text-green-800 whitespace-pre-wrap">{inc.resolution}</p>
                      </div>
                    )}

                    {/* Status update form */}
                    <div className="mt-4 p-3 rounded-lg bg-background-100">
                      <div className="flex items-center gap-2 mb-2">
                        <input value={updateText} onChange={(e) => setUpdateText(e.target.value)} className="flex-1 px-3 py-2 rounded-lg border border-secondary-200 text-sm text-foreground-900 outline-none text-sm" placeholder="Add incident update..." />
                        <select value={updateStatus} onChange={(e) => setUpdateStatus(e.target.value as IncidentStatus)} className="px-2 py-2 rounded-lg border border-secondary-200 text-xs bg-white outline-none cursor-pointer">
                          <option value="open">Open</option>
                          <option value="investigating">Investigating</option>
                          <option value="monitoring">Monitoring</option>
                          <option value="resolved">Resolved</option>
                          <option value="closed">Closed</option>
                        </select>
                        <button onClick={handlePostUpdate} disabled={postingUpdate || !updateText.trim()} className="px-3 py-2 rounded-lg bg-primary-500 text-white text-xs font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer disabled:opacity-40 whitespace-nowrap">
                          {postingUpdate ? 'Posting...' : 'Post'}
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-2 text-[10px] text-foreground-400">
                      <span>Detected by: {inc.detected_by || 'unknown'}</span>
                      <span>·</span>
                      <span>Release: {inc.release_version || 'N/A'}</span>
                      {inc.end_time && <><span>·</span><span>Ended: {new Date(inc.end_time).toLocaleString()}</span></>}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}