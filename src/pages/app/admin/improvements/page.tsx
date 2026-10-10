import { usePlatformAdminAccess } from '@/context/PlatformAdminContext';
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthProvider';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { isDemoMode } from '@/demo/demoConfig';
import { RELEASE_VERSION } from '@/lib/env';

type ImprovementStatus = 'new' | 'needs_evidence' | 'approved' | 'planned' | 'in_progress' | 'testing' | 'released' | 'measuring' | 'complete' | 'rejected';
type ImpactLevel = 'low' | 'medium' | 'high' | 'critical';

interface Improvement {
  id: string;
  title: string;
  problem_statement: string | null;
  evidence: string | null;
  affected_feature: string | null;
  affected_journey: string | null;
  customer_impact: string | null;
  frequency: string | null;
  severity: ImpactLevel;
  effort_estimate: string;
  confidence: string;
  priority_score: number;
  status: ImprovementStatus;
  owner: string | null;
  target_release: string | null;
  success_measure: string | null;
  linked_feedback_ids: string[];
  linked_support_case_ids: string[];
  linked_incident_ids: string[];
  priority_override_reason: string | null;
  result: string | null;
  result_detail: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_FLOW: ImprovementStatus[] = ['new', 'needs_evidence', 'approved', 'planned', 'in_progress', 'testing', 'released', 'measuring', 'complete', 'rejected'];

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700', needs_evidence: 'bg-purple-100 text-purple-700',
  approved: 'bg-indigo-100 text-indigo-700', planned: 'bg-cyan-100 text-cyan-700',
  in_progress: 'bg-amber-100 text-amber-700', testing: 'bg-orange-100 text-orange-700',
  released: 'bg-emerald-100 text-emerald-700', measuring: 'bg-teal-100 text-teal-700',
  complete: 'bg-green-100 text-green-700', rejected: 'bg-gray-200 text-gray-600',
};

const SEVERITY_COLORS: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600', medium: 'bg-blue-100 text-blue-700',
  high: 'bg-amber-100 text-amber-700', critical: 'bg-red-100 text-red-700',
};

function computePriorityScore(
  severity: ImpactLevel,
  frequency: string | null,
  confidence: string,
  effort: string,
): number {
  const sevScore: Record<ImpactLevel, number> = { low: 1, medium: 3, high: 6, critical: 10 };
  const freqMap: Record<string, number> = { rare: 1, occasional: 2, frequent: 4, widespread: 6 };
  const confMap: Record<string, number> = { low: 0.5, medium: 1, high: 1.5 };
  const effortMap: Record<string, number> = { small: 1, medium: 2, large: 3, xl: 6 };

  const s = sevScore[severity] || 3;
  const f = (frequency && freqMap[frequency]) ? freqMap[frequency] : 2;
  const c = confMap[confidence] || 1;
  const e = effortMap[effort] || 1;

  return Math.round(s * f * c / e);
}

export default function ImprovementsPage() {
  const { membership } = useActiveWedding();
  const isAuthorised = usePlatformAdminAccess();
  const isDemo = isDemoMode;

  const [items, setItems] = useState<Improvement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const fetchImprovements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let q = supabase.from('product_improvements').select('*').order('priority_score', { ascending: false }).limit(200);
      if (filterStatus !== 'all') q = q.eq('status', filterStatus);

      const { data, error: err } = await q;
      if (err) throw err;
      setItems((data || []) as Improvement[]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load improvements');
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    fetchImprovements();
  }, [fetchImprovements]);

  const updateStatus = async (id: string, status: ImprovementStatus) => {
    const { error: err } = await supabase.from('product_improvements').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    if (err) { setError(err.message); return; }
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, status } : i));
  };

  // ── Access gates ──
  if (isDemo) {
    return (
      <div className="min-h-screen bg-background-50 flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-amber-100 text-amber-600 mb-6">
            <i className="ri-rocket-line text-2xl" />
          </div>
          <h1 className="font-heading text-2xl text-foreground-900 mb-3">Improvement Backlog</h1>
          <p className="text-sm text-foreground-500 mb-6">The improvement backlog is not available in demo mode.</p>
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
          <p className="text-sm text-foreground-500 mb-6">Only wedding owners and partners can access the Improvement Backlog.</p>
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
        <span className="ml-3 px-2 py-0.5 rounded text-[10px] font-label font-medium bg-secondary-100 text-secondary-700 uppercase tracking-wide">Improvements</span>
        <span className="ml-auto text-[11px] text-foreground-400 font-label">v{RELEASE_VERSION}</span>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <p className="text-xs font-label text-foreground-400 uppercase tracking-wide mb-1">Product Planning</p>
          <h1 className="font-heading text-2xl text-foreground-900">Improvement Backlog</h1>
          <p className="text-sm text-foreground-500 mt-1">Prioritised improvements based on verified analytics, support themes, and customer feedback.</p>
        </div>

        {/* Filter & summary */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="text-xs px-3 py-1.5 rounded-lg border border-secondary-200 bg-white text-foreground-700 cursor-pointer">
            <option value="all">All statuses</option>
            {STATUS_FLOW.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>
            ))}
          </select>
          <span className="text-[11px] text-foreground-400">{items.length} improvements</span>
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200 mb-6 flex items-center gap-2">
            <i className="ri-error-warning-line text-red-600" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Priority legend */}
        <div className="p-3 rounded-lg bg-white border border-secondary-100 mb-6">
          <p className="text-[10px] font-label text-foreground-400 uppercase mb-2">Prioritisation Framework</p>
          <div className="flex flex-wrap gap-4">
            <span className="text-[10px] text-foreground-500">Score = <strong>Severity × Frequency × Confidence ÷ Effort</strong></span>
            <span className="text-[10px] text-foreground-400">Critical=10, High=6, Med=3, Low=1</span>
            <span className="text-[10px] text-foreground-400">Small effort boosts, Large effort reduces</span>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2 animate-pulse">
            {[1,2,3,4].map((i) => <div key={i} className="h-20 rounded-lg bg-secondary-100" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 rounded-lg bg-background-100 border border-secondary-200 text-center">
            <div className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-secondary-200 text-foreground-400 mb-4">
              <i className="ri-lightbulb-line text-xl" />
            </div>
            <p className="font-label font-medium text-sm text-foreground-500">No improvements yet</p>
            <p className="text-xs text-foreground-400 mt-1">Create improvements from verified analytics, feedback, and support themes.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="p-4 rounded-lg bg-white border border-secondary-100 hover:border-secondary-200 transition-colors">
                <div className="flex items-start gap-4">
                  {/* Score badge */}
                  <div className="w-10 h-10 flex flex-col items-center justify-center rounded-lg bg-secondary-100 flex-shrink-0">
                    <span className="text-sm font-label font-bold text-foreground-900">{item.priority_score}</span>
                    <span className="text-[8px] text-foreground-400">score</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-label font-medium text-sm text-foreground-900">{item.title}</span>
                      <span className={`text-[9px] font-label font-semibold uppercase px-1.5 py-0.5 rounded ${STATUS_COLORS[item.status] || ''}`}>{item.status.replace(/_/g, ' ')}</span>
                      <span className={`text-[9px] font-label font-semibold uppercase px-1.5 py-0.5 rounded ${SEVERITY_COLORS[item.severity] || ''}`}>{item.severity}</span>
                    </div>
                    {item.problem_statement && <p className="text-xs text-foreground-500 line-clamp-2">{item.problem_statement}</p>}
                    <div className="flex flex-wrap items-center gap-3 mt-2">
                      {item.affected_feature && <span className="text-[10px] text-foreground-400">Feature: {item.affected_feature}</span>}
                      {item.effort_estimate && <span className="text-[10px] text-foreground-400">Effort: {item.effort_estimate}</span>}
                      {item.owner && <span className="text-[10px] text-foreground-400">Owner: {item.owner}</span>}
                      {item.target_release && <span className="text-[10px] text-primary-600 font-label">Target: {item.target_release}</span>}
                    </div>
                    {item.success_measure && (
                      <p className="text-[10px] text-green-700 mt-1"><i className="ri-check-line mr-0.5" />Success: {item.success_measure}</p>
                    )}
                    {item.result && (
                      <p className={`text-[10px] mt-1 ${item.result === 'successful' ? 'text-green-700' : item.result === 'unsuccessful' ? 'text-red-600' : 'text-amber-600'}`}>
                        <i className={`${item.result === 'successful' ? 'ri-check-double-line' : item.result === 'unsuccessful' ? 'ri-close-circle-line' : 'ri-subtract-line'} mr-0.5`} />
                        {item.result} — {item.result_detail || ''}
                      </p>
                    )}
                    {/* Links */}
                    <div className="flex items-center gap-1 mt-1">
                      {item.linked_feedback_ids?.length > 0 && <span className="text-[9px] text-foreground-400">{item.linked_feedback_ids.length} feedback</span>}
                      {item.linked_support_case_ids?.length > 0 && <span className="text-[9px] text-foreground-400">· {item.linked_support_case_ids.length} cases</span>}
                      {item.linked_incident_ids?.length > 0 && <span className="text-[9px] text-red-500">· {item.linked_incident_ids.length} incidents</span>}
                    </div>
                  </div>
                  {/* Status action */}
                  <select
                    value={item.status}
                    onChange={(e) => updateStatus(item.id, e.target.value as ImprovementStatus)}
                    className="text-[10px] px-2 py-1 rounded border border-secondary-200 bg-white text-foreground-600 cursor-pointer flex-shrink-0"
                  >
                    {STATUS_FLOW.map((s) => (
                      <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Privacy notice */}
        <div className="mt-8 p-3 rounded-lg bg-background-100 border border-secondary-200">
          <p className="text-[11px] text-foreground-400">
            <i className="ri-lock-line mr-1" />
            Improvement records contain redacted summaries only. Source content from feedback, support cases, and incidents is not duplicated.
          </p>
        </div>
      </div>
    </div>
  );
}