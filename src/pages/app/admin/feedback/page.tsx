import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthProvider';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { isDemoMode } from '@/demo/demoConfig';
import { RELEASE_VERSION } from '@/lib/env';

type FeedbackType = 'problem' | 'suggestion' | 'confusing' | 'praise' | 'other';
type FeedbackStatus = 'new' | 'reviewed' | 'in_progress' | 'resolved' | 'closed';
type FeedbackPriority = 'low' | 'medium' | 'high' | 'critical';

interface FeedbackItem {
  id: string;
  feedback_type: FeedbackType;
  feature: string | null;
  category: string | null;
  summary: string;
  description: string | null;
  priority: FeedbackPriority;
  status: FeedbackStatus;
  assigned_to: string | null;
  submitted_by: string | null;
  submitted_at: string;
  linked_support_case_id: string | null;
  linked_incident_id: string | null;
  linked_improvement_id: string | null;
}

const FEEDBACK_TYPE_ICONS: Record<string, string> = {
  problem: 'ri-bug-line', suggestion: 'ri-lightbulb-line', confusing: 'ri-emotion-unhappy-line',
  praise: 'ri-heart-line', other: 'ri-chat-3-line',
};

const FEEDBACK_TYPE_LABELS: Record<string, string> = {
  problem: 'Problem', suggestion: 'Suggestion', confusing: 'Confusing', praise: 'Praise', other: 'Other',
};

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700', reviewed: 'bg-purple-100 text-purple-700',
  in_progress: 'bg-amber-100 text-amber-700', resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-500',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600', medium: 'bg-blue-100 text-blue-700',
  high: 'bg-amber-100 text-amber-700', critical: 'bg-red-100 text-red-700',
};

export default function FeedbackCentrePage() {
  const { profile } = useAuth();
  const { membership } = useActiveWedding();
  const isAuthorised = membership?.role === 'owner' || membership?.role === 'partner';
  const isDemo = isDemoMode;

  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');

  const fetchFeedback = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let q = supabase.from('product_feedback').select('*').order('submitted_at', { ascending: false }).limit(200);
      if (filterType !== 'all') q = q.eq('feedback_type', filterType);
      if (filterStatus !== 'all') q = q.eq('status', filterStatus);
      if (filterPriority !== 'all') q = q.eq('priority', filterPriority);

      const { data, error: err } = await q;
      if (err) throw err;
      setItems((data || []) as FeedbackItem[]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load feedback');
    } finally {
      setLoading(false);
    }
  }, [filterType, filterStatus, filterPriority]);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  const updateStatus = async (id: string, status: FeedbackStatus) => {
    const { error: err } = await supabase.from('product_feedback').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    if (err) { setError(err.message); return; }
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, status } : i));
  };

  const updatePriority = async (id: string, priority: FeedbackPriority) => {
    const { error: err } = await supabase.from('product_feedback').update({ priority, updated_at: new Date().toISOString() }).eq('id', id);
    if (err) { setError(err.message); return; }
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, priority } : i));
  };

  // ── Access gates ──
  if (isDemo) {
    return (
      <div className="min-h-screen bg-background-50 flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-amber-100 text-amber-600 mb-6">
            <i className="ri-feedback-line text-2xl" />
          </div>
          <h1 className="font-heading text-2xl text-foreground-900 mb-3">Feedback Centre</h1>
          <p className="text-sm text-foreground-500 mb-6">Customer feedback is not available in demo mode.</p>
          <Link to="/app/dashboard" className="btn-outline cursor-pointer whitespace-nowrap">
            <i className="ri-arrow-left-line mr-1.5" /> Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!isAuthorised) {
    return (
      <div className="min-h-screen bg-background-50 flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-primary-50 text-primary-600 mb-6">
            <i className="ri-shield-check-line text-2xl" />
          </div>
          <h1 className="font-heading text-2xl text-foreground-900 mb-3">Access Restricted</h1>
          <p className="text-sm text-foreground-500 mb-6">Only wedding owners and partners can access the Feedback Centre.</p>
          <Link to="/app/dashboard" className="btn-outline cursor-pointer whitespace-nowrap">
            <i className="ri-arrow-left-line mr-1.5" /> Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-50">
      <header className="h-16 bg-white border-b border-secondary-100 flex items-center px-4 md:px-6">
        <Link to="/app/dashboard" className="font-heading text-xl font-semibold text-foreground-900 cursor-pointer">Vowora</Link>
        <span className="ml-3 px-2 py-0.5 rounded text-[10px] font-label font-medium bg-secondary-100 text-secondary-700 uppercase tracking-wide">Feedback</span>
        <span className="ml-auto text-[11px] text-foreground-400 font-label">v{RELEASE_VERSION}</span>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <p className="text-xs font-label text-foreground-400 uppercase tracking-wide mb-1">Customer Feedback</p>
          <h1 className="font-heading text-2xl text-foreground-900">Feedback Centre</h1>
          <p className="text-sm text-foreground-500 mt-1">Aggregated from support cases, in-app feedback, and cancellation reasons. Private messages are not shown.</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="text-xs px-3 py-1.5 rounded-lg border border-secondary-200 bg-white text-foreground-700 cursor-pointer">
            <option value="all">All types</option>
            <option value="problem">Problem</option>
            <option value="suggestion">Suggestion</option>
            <option value="confusing">Confusing</option>
            <option value="praise">Praise</option>
            <option value="other">Other</option>
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="text-xs px-3 py-1.5 rounded-lg border border-secondary-200 bg-white text-foreground-700 cursor-pointer">
            <option value="all">All statuses</option>
            <option value="new">New</option>
            <option value="reviewed">Reviewed</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className="text-xs px-3 py-1.5 rounded-lg border border-secondary-200 bg-white text-foreground-700 cursor-pointer">
            <option value="all">All priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
          <span className="text-[11px] text-foreground-400 ml-auto">{items.length} items</span>
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200 mb-6 flex items-center gap-2">
            <i className="ri-error-warning-line text-red-600" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="space-y-2 animate-pulse">
            {[1,2,3,4,5].map((i) => <div key={i} className="h-16 rounded-lg bg-secondary-100" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 rounded-lg bg-background-100 border border-secondary-200 text-center">
            <div className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-secondary-200 text-foreground-400 mb-4">
              <i className="ri-chat-smile-2-line text-xl" />
            </div>
            <p className="font-label font-medium text-sm text-foreground-500">No feedback items yet</p>
            <p className="text-xs text-foreground-400 mt-1">Customer feedback will appear here as it is collected.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="p-4 rounded-lg bg-white border border-secondary-100 hover:border-secondary-200 transition-colors">
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 flex items-center justify-center rounded-full bg-secondary-100 flex-shrink-0 mt-0.5`}>
                    <i className={`${FEEDBACK_TYPE_ICONS[item.feedback_type] || 'ri-chat-3-line'} text-sm text-foreground-500`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-label font-medium text-sm text-foreground-900">{item.summary}</span>
                      <span className={`text-[9px] font-label font-semibold uppercase px-1.5 py-0.5 rounded ${STATUS_COLORS[item.status] || 'bg-gray-100 text-gray-500'}`}>{item.status.replace('_', ' ')}</span>
                      <span className={`text-[9px] font-label font-semibold uppercase px-1.5 py-0.5 rounded ${PRIORITY_COLORS[item.priority] || 'bg-gray-100 text-gray-500'}`}>{item.priority}</span>
                    </div>
                    <p className="text-xs text-foreground-500">{FEEDBACK_TYPE_LABELS[item.feedback_type] || item.feedback_type}{item.feature ? ` · ${item.feature}` : ''}{item.category ? ` · ${item.category}` : ''}</p>
                    {item.description && <p className="text-xs text-foreground-600 mt-1 line-clamp-2">{item.description}</p>}
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[10px] text-foreground-400">{new Date(item.submitted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      {item.submitted_by && <span className="text-[10px] text-foreground-400">{item.submitted_by}</span>}
                    </div>
                  </div>
                  {/* Quick actions */}
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <select value={item.status} onChange={(e) => updateStatus(item.id, e.target.value as FeedbackStatus)} className="text-[10px] px-2 py-1 rounded border border-secondary-200 bg-white text-foreground-600 cursor-pointer">
                      <option value="new">New</option>
                      <option value="reviewed">Reviewed</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                    <select value={item.priority} onChange={(e) => updatePriority(item.id, e.target.value as FeedbackPriority)} className="text-[10px] px-2 py-1 rounded border border-secondary-200 bg-white text-foreground-600 cursor-pointer">
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Privacy notice */}
        <div className="mt-8 p-3 rounded-lg bg-background-100 border border-secondary-200">
          <p className="text-[11px] text-foreground-400">
            <i className="ri-lock-line mr-1" />
            Full private messages, guest names, tokens, and payment data are never displayed. Feedback summaries are redacted for privacy.
          </p>
        </div>
      </div>
    </div>
  );
}