import { usePlatformAdminAccess } from '@/context/PlatformAdminContext';
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthProvider';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { isDemoMode } from '@/demo/demoConfig';
import { RELEASE_VERSION } from '@/lib/env';

// ── Types ──

type SupportStatus = 'new' | 'open' | 'waiting_customer' | 'waiting_team' | 'resolved' | 'closed';
type SupportCategory = 'billing' | 'authentication' | 'invitations' | 'rsvp' | 'website' | 'gallery' | 'registry' | 'guest_access' | 'other';
type SupportPriority = 'low' | 'medium' | 'high' | 'critical';

interface SupportCase {
  id: string;
  case_ref: string;
  customer_email: string | null;
  wedding_id: string | null;
  wedding_name: string | null;
  category: SupportCategory;
  subject: string;
  safe_summary: string | null;
  status: SupportStatus;
  priority: SupportPriority;
  assigned_owner: string | null;
  related_incident_id: string | null;
  related_release_id: string | null;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  closed_at: string | null;
}

// ── Helpers ──

function statusStyle(s: SupportStatus): string {
  return { new: 'bg-blue-100 text-blue-700', open: 'bg-amber-100 text-amber-700', waiting_customer: 'bg-purple-100 text-purple-700', waiting_team: 'bg-cyan-100 text-cyan-700', resolved: 'bg-green-100 text-green-700', closed: 'bg-gray-100 text-gray-500' }[s];
}

function priorityStyle(p: SupportPriority): string {
  return { critical: 'bg-red-100 text-red-700', high: 'bg-orange-100 text-orange-700', medium: 'bg-amber-100 text-amber-700', low: 'bg-blue-100 text-blue-700' }[p];
}

function categoryLabel(c: SupportCategory): string {
  return { billing: 'Billing', authentication: 'Auth', invitations: 'Invitations', rsvp: 'RSVP', website: 'Website', gallery: 'Gallery', registry: 'Registry', guest_access: 'Guest Access', other: 'Other' }[c];
}

// ── Main component ──

export default function SupportPage() {
  const { profile } = useAuth();
  const { membership } = useActiveWedding();
  const isAuthorised = usePlatformAdminAccess();
  const isDemo = isDemoMode;

  const [cases, setCases] = useState<SupportCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<SupportStatus | 'all'>('all');
  const [selectedCase, setSelectedCase] = useState<SupportCase | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formSubject, setFormSubject] = useState('');
  const [formCategory, setFormCategory] = useState<SupportCategory>('other');
  const [formPriority, setFormPriority] = useState<SupportPriority>('medium');
  const [formEmail, setFormEmail] = useState('');
  const [formWeddingName, setFormWeddingName] = useState('');
  const [formSummary, setFormSummary] = useState('');
  const [formOwner, setFormOwner] = useState('');
  const [noteText, setNoteText] = useState('');
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const fetchCases = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase.from('wedora_support_cases').select('*').order('created_at', { ascending: false });
      if (statusFilter !== 'all') query = query.eq('status', statusFilter);
      const { data, error: err } = await query.limit(50);
      if (err) throw err;
      setCases((data || []) as SupportCase[]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load support cases');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchCases(); }, [fetchCases]);

  const handleCreate = async () => {
    if (!formSubject.trim()) return;
    setSaving(true);
    setCreateError(null);
    const ref = `SUP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    try {
      const { error: err } = await supabase.from('wedora_support_cases').insert({
        case_ref: ref,
        subject: formSubject.trim(),
        category: formCategory,
        priority: formPriority,
        customer_email: formEmail.trim() || null,
        wedding_name: formWeddingName.trim() || null,
        safe_summary: formSummary.trim() || null,
        assigned_owner: formOwner.trim() || null,
        status: 'new',
      });
      if (err) throw err;
      setShowForm(false);
      setFormSubject(''); setFormCategory('other'); setFormPriority('medium'); setFormEmail(''); setFormWeddingName(''); setFormSummary(''); setFormOwner('');
      fetchCases();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create case');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: SupportStatus) => {
    try {
      const upd: Partial<SupportCase> & { updated_at: string } = { status: newStatus, updated_at: new Date().toISOString() };
      if (newStatus === 'resolved') (upd as any).resolved_at = new Date().toISOString();
      if (newStatus === 'closed') (upd as any).closed_at = new Date().toISOString();
      const { error: err } = await supabase.from('wedora_support_cases').update(upd).eq('id', id);
      if (err) throw err;
      fetchCases();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Status update failed');
    }
  };

  const handleAddNote = async () => {
    if (!selectedCase || !noteText.trim()) return;
    setSaving(true);
    try {
      const newNote = `[${new Date().toISOString()}] ${profile?.email || 'operator'}: ${noteText.trim()}`;
      const notes = selectedCase.internal_notes ? `${selectedCase.internal_notes}\n${newNote}` : newNote;
      const { error: err } = await supabase.from('wedora_support_cases').update({ internal_notes: notes, updated_at: new Date().toISOString() }).eq('id', selectedCase.id);
      if (err) throw err;
      setNoteText('');
      fetchCases();
      setSelectedCase((prev) => prev && { ...prev, internal_notes: notes });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add note');
    } finally {
      setSaving(false);
    }
  };

  // ── Access gates ──

  if (isDemo) {
    return (
      <div className="min-h-screen bg-background-50 flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-amber-100 text-amber-600 mb-6"><i className="ri-tools-line text-2xl" /></div>
          <h1 className="font-heading text-2xl text-foreground-900 mb-3">Support Centre</h1>
          <p className="text-sm text-foreground-500 mb-6">Support case management is not available in demo mode.</p>
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
          <p className="text-sm text-foreground-500 mb-6">Only wedding owners and partners can access the Support Centre.</p>
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
        <span className="ml-3 px-2 py-0.5 rounded text-[10px] font-label font-medium bg-secondary-100 text-secondary-700 uppercase tracking-wide">Support</span>
        <div className="ml-auto flex items-center gap-2">
          <Link to="/app/admin/operations" className="text-xs text-foreground-400 hover:text-foreground-600 cursor-pointer whitespace-nowrap"><i className="ri-arrow-left-line mr-1" />Operations</Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-xs font-label text-foreground-400 uppercase tracking-wide mb-1">Customer Support</p>
            <h1 className="font-heading text-2xl text-foreground-900">Support Centre</h1>
          </div>
          <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap">
            <i className="ri-add-line" />New Case
          </button>
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-1 mb-6 bg-secondary-100 rounded-full p-1 w-fit flex-wrap">
          {(['all', 'new', 'open', 'waiting_customer', 'resolved', 'closed'] as const).map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 rounded-full text-xs font-label font-medium transition-colors cursor-pointer whitespace-nowrap ${statusFilter === s ? 'bg-white text-foreground-900 shadow-sm' : 'text-foreground-500 hover:text-foreground-700'}`}>
              {s === 'all' ? 'All' : s === 'waiting_customer' ? 'Waiting Customer' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 mb-6 flex items-center gap-2">
            <i className="ri-error-warning-line text-red-600" />
            <p className="text-sm text-red-700">{error}</p>
            <button onClick={fetchCases} className="ml-auto text-xs text-red-600 underline cursor-pointer">Retry</button>
          </div>
        )}

        {/* Create form */}
        {showForm && (
          <div className="p-5 rounded-lg bg-white border border-secondary-200 mb-8">
            <h2 className="font-heading text-lg text-foreground-900 mb-4">New Support Case</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-label text-foreground-500 mb-1">Subject *</label>
                <input value={formSubject} onChange={(e) => setFormSubject(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm outline-none" placeholder="Brief case subject" />
              </div>
              <div>
                <label className="block text-xs font-label text-foreground-500 mb-1">Category</label>
                <select value={formCategory} onChange={(e) => setFormCategory(e.target.value as SupportCategory)} className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm bg-white outline-none cursor-pointer">
                  {(['billing', 'authentication', 'invitations', 'rsvp', 'website', 'gallery', 'registry', 'guest_access', 'other'] as SupportCategory[]).map((c) => (
                    <option key={c} value={c}>{categoryLabel(c)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-label text-foreground-500 mb-1">Priority</label>
                <select value={formPriority} onChange={(e) => setFormPriority(e.target.value as SupportPriority)} className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm bg-white outline-none cursor-pointer">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-label text-foreground-500 mb-1">Customer Email</label>
                <input value={formEmail} onChange={(e) => setFormEmail(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm outline-none" placeholder="customer@example.com" />
              </div>
              <div>
                <label className="block text-xs font-label text-foreground-500 mb-1">Wedding Name</label>
                <input value={formWeddingName} onChange={(e) => setFormWeddingName(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm outline-none" placeholder="Optional" />
              </div>
              <div>
                <label className="block text-xs font-label text-foreground-500 mb-1">Assigned Owner</label>
                <input value={formOwner} onChange={(e) => setFormOwner(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm outline-none" placeholder="support@vowora.uk" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-label text-foreground-500 mb-1">Safe Summary</label>
                <textarea value={formSummary} onChange={(e) => setFormSummary(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm outline-none resize-none" placeholder="No private data, tokens, or secrets" />
              </div>
            </div>
            {createError && <p className="text-xs text-red-600 mb-3">{createError}</p>}
            <div className="flex items-center gap-3">
              <button onClick={handleCreate} disabled={saving || !formSubject.trim()} className="px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer disabled:opacity-40 whitespace-nowrap">{saving ? 'Saving...' : 'Create Case'}</button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-foreground-500 hover:text-foreground-700 cursor-pointer whitespace-nowrap">Cancel</button>
            </div>
          </div>
        )}

        {/* Case list */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 rounded-lg bg-white border border-secondary-100 animate-pulse">
                <div className="h-4 bg-secondary-100 rounded w-2/3 mb-2" />
                <div className="h-3 bg-secondary-100 rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : cases.length === 0 ? (
          <div className="p-10 text-center">
            <div className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-green-50 text-green-500 mb-4"><i className="ri-check-line text-xl" /></div>
            <p className="font-label font-medium text-sm text-foreground-900">No support cases</p>
            <p className="text-xs text-foreground-400 mt-1">{statusFilter === 'all' ? 'No cases yet' : `No ${statusFilter} cases`}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {cases.map((c) => (
              <div key={c.id} className={`p-4 rounded-lg bg-white border cursor-pointer transition-colors ${selectedCase?.id === c.id ? 'border-primary-300 bg-primary-50/30' : 'border-secondary-100 hover:border-secondary-300'}`} onClick={() => setSelectedCase(selectedCase?.id === c.id ? null : c)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[10px] font-mono text-foreground-400">{c.case_ref}</span>
                      <span className={`text-[10px] font-label font-semibold uppercase px-1.5 py-0.5 rounded ${statusStyle(c.status)}`}>{c.status.replace('_', ' ')}</span>
                      <span className={`text-[10px] font-label font-semibold uppercase px-1.5 py-0.5 rounded ${priorityStyle(c.priority)}`}>{c.priority}</span>
                      <span className="text-[10px] text-foreground-400 bg-secondary-50 px-1.5 py-0.5 rounded">{categoryLabel(c.category)}</span>
                    </div>
                    <p className="font-label font-medium text-sm text-foreground-900">{c.subject}</p>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-foreground-400 flex-wrap">
                      {c.customer_email && <span><i className="ri-mail-line mr-0.5" />{c.customer_email}</span>}
                      {c.wedding_name && <span><i className="ri-heart-line mr-0.5" />{c.wedding_name}</span>}
                      {c.assigned_owner && <span><i className="ri-user-line mr-0.5" />{c.assigned_owner}</span>}
                      <span>{new Date(c.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Expanded detail */}
                {selectedCase?.id === c.id && (
                  <div className="mt-4 pt-4 border-t border-secondary-100" onClick={(e) => e.stopPropagation()}>
                    {c.safe_summary && (
                      <div className="mb-3">
                        <p className="text-[10px] font-label text-foreground-400 uppercase mb-0.5">Summary</p>
                        <p className="text-sm text-foreground-700">{c.safe_summary}</p>
                      </div>
                    )}
                    {c.internal_notes && (
                      <div className="mb-3 p-3 rounded-lg bg-yellow-50 border border-yellow-100">
                        <p className="text-[10px] font-label text-amber-700 uppercase mb-0.5">Internal Notes</p>
                        <p className="text-sm text-foreground-700 whitespace-pre-wrap">{c.internal_notes}</p>
                      </div>
                    )}

                    {/* Add note */}
                    <div className="mt-3 p-3 rounded-lg bg-background-100">
                      <div className="flex items-center gap-2">
                        <input value={noteText} onChange={(e) => setNoteText(e.target.value)} className="flex-1 px-3 py-2 rounded-lg border border-secondary-200 text-sm outline-none text-sm" placeholder="Add internal note..." />
                        <button onClick={handleAddNote} disabled={saving || !noteText.trim()} className="px-3 py-2 rounded-lg bg-secondary-500 text-white text-xs font-label font-medium hover:bg-secondary-600 transition-colors cursor-pointer disabled:opacity-40 whitespace-nowrap">
                          {saving ? 'Saving...' : 'Add Note'}
                        </button>
                      </div>
                    </div>

                    {/* Quick actions */}
                    <div className="mt-3 flex items-center gap-1 flex-wrap">
                      {c.status !== 'resolved' && c.status !== 'closed' && (
                        <button onClick={() => handleStatusChange(c.id, 'resolved')} className="px-2 py-1 rounded text-[10px] font-label bg-green-100 text-green-700 hover:bg-green-200 cursor-pointer whitespace-nowrap">Resolve</button>
                      )}
                      {c.status !== 'closed' && (
                        <button onClick={() => handleStatusChange(c.id, 'closed')} className="px-2 py-1 rounded text-[10px] font-label bg-gray-100 text-gray-600 hover:bg-gray-200 cursor-pointer whitespace-nowrap">Close</button>
                      )}
                      {c.status === 'new' && (
                        <button onClick={() => handleStatusChange(c.id, 'open')} className="px-2 py-1 rounded text-[10px] font-label bg-amber-100 text-amber-700 hover:bg-amber-200 cursor-pointer whitespace-nowrap">Open</button>
                      )}
                      {c.status !== 'waiting_customer' && c.status !== 'resolved' && c.status !== 'closed' && (
                        <button onClick={() => handleStatusChange(c.id, 'waiting_customer')} className="px-2 py-1 rounded text-[10px] font-label bg-purple-100 text-purple-700 hover:bg-purple-200 cursor-pointer whitespace-nowrap">Wait Customer</button>
                      )}
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