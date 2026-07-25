import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '@/components/feature/AppShell';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { useDemoDataSafe } from '@/demo/useDemoDataSafe';
import { supabase } from '@/lib/supabase';
import type { SeatingPlan } from '@/types/seating';
import { EVENT_TYPE_LABELS, PLAN_STATUS_LABELS, PLAN_STATUS_COLOURS } from '@/types/seating';

// ── Demo plans list ──
function DemoSeatingPlansPage() {
  const navigate = useNavigate();
  const demo = useDemoDataSafe();

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <button onClick={() => navigate('/app/seating')} className="flex items-center gap-1.5 text-xs text-foreground-500 hover:text-foreground-700 mb-2 cursor-pointer whitespace-nowrap">
              <i className="ri-arrow-left-line" />Back to seating planner
            </button>
            <h1 className="font-heading text-2xl text-foreground-900">Seating plans</h1>
          </div>
          <span className="px-2 py-1 rounded-full bg-accent-100 text-accent-700 text-[10px] font-label font-semibold">Demo Account</span>
        </div>

        <div className="card-default mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-xl bg-primary-50 text-primary-600">
              <i className="ri-layout-grid-line text-xl" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-label font-semibold text-foreground-900">Orangery Reception Layout</h2>
              <p className="text-xs text-foreground-500 mt-0.5">Working plan · {demo?.state.seatingPlan.tables.filter((t) => t.capacity > 0).length || 6} tables · {demo?.state.seatingPlan.assignments.length || 21} seated</p>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-label font-semibold">Working</span>
          </div>
        </div>

        <div className="text-center py-6">
          <p className="text-xs text-foreground-400 mb-4">The demo plan is ready to use. Open it directly from the seating overview.</p>
          <button onClick={() => navigate('/app/seating')} className="btn-primary text-xs py-2 cursor-pointer whitespace-nowrap">
            <i className="ri-arrow-left-line mr-1.5" />Back to seating planner
          </button>
        </div>
      </div>
    </AppShell>
  );
}

// ── Normal (Supabase-backed) plans list ──
function NormalSeatingPlansPage() {
  const navigate = useNavigate();
  const { weddingId, loading: weddingLoading, error: weddingError } = useActiveWedding();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [plans, setPlans] = useState<SeatingPlan[]>([]);
  const [filter, setFilter] = useState({ event: '', status: '', search: '', showArchived: false });
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchPlans = useCallback(async () => {
    if (!weddingId) return;
    setLoading(true);
    try {
      let query = supabase.from('seating_plans').select('*').eq('wedding_id', weddingId).order('updated_at', { ascending: false });
      if (!filter.showArchived) query = query.neq('status', 'archived');

      const { data, error: fetchErr } = await query;
      if (fetchErr) throw fetchErr;
      setPlans((data || []) as SeatingPlan[]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load plans');
    } finally {
      setLoading(false);
    }
  }, [weddingId, filter.showArchived]);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  const handleAction = async (planId: string, action: string) => {
    setActionLoading(planId);
    try {
      switch (action) {
        case 'working': {
          await supabase.from('seating_plans').update({ is_working: false }).eq('wedding_id', weddingId).eq('is_working', true);
          await supabase.from('seating_plans').update({ is_working: true, status: 'working' }).eq('id', planId);
          showToast('Set as working plan');
          break;
        }
        case 'final': {
          await supabase.from('seating_plans').update({ is_final: true, status: 'final' }).eq('id', planId);
          showToast('Marked as final');
          break;
        }
        case 'publish': {
          await supabase.from('seating_plans').update({ is_published: false }).eq('wedding_id', weddingId).eq('is_published', true);
          await supabase.from('seating_plans').update({ is_published: true, status: 'published', published_at: new Date().toISOString() }).eq('id', planId);
          showToast('Plan published');
          break;
        }
        case 'review': {
          await supabase.from('seating_plans').update({ status: 'review' }).eq('id', planId);
          showToast('Marked for review');
          break;
        }
        case 'archive': {
          await supabase.from('seating_plans').update({ status: 'archived', archived_at: new Date().toISOString(), is_working: false, is_final: false, is_published: false }).eq('id', planId);
          showToast('Archived');
          break;
        }
        case 'restore': {
          await supabase.from('seating_plans').update({ status: 'draft', archived_at: null }).eq('id', planId);
          showToast('Restored');
          break;
        }
        case 'duplicate': {
          const { data: src } = await supabase.from('seating_plans').select('*').eq('id', planId).single();
          if (!src) throw new Error('Source not found');
          const { data: np } = await supabase.from('seating_plans').insert({
            wedding_id: weddingId, name: `${src.name} (copy)`, event_type: src.event_type,
            room_name: src.room_name, canvas_width: src.canvas_width, canvas_height: src.canvas_height,
            grid_enabled: src.grid_enabled, grid_size: src.grid_size, snap_to_grid: src.snap_to_grid, status: 'draft',
          }).select('*').single();
          if (np) {
            const { data: st } = await supabase.from('seating_tables').select('*').eq('plan_id', planId);
            if (st && st.length > 0) {
              await supabase.from('seating_tables').insert(st.map((t: Record<string, unknown>) => ({
                plan_id: np.id, wedding_id: weddingId, name: t.name, shape: t.shape, capacity: t.capacity,
                position_x: t.position_x, position_y: t.position_y, width: t.width, height: t.height,
                rotation: t.rotation, zone: t.zone, colour: t.colour, colour_key: t.colour_key, sort_order: t.sort_order,
              })));
            }
            navigate(`/app/seating/plans/${np.id}`);
            return;
          }
          break;
        }
      }
      await supabase.from('seating_activity_log').insert({ wedding_id: weddingId, seating_plan_id: planId, action: `plan_${action}`, summary: `${action} action` });
      fetchPlans();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Action failed', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = plans.filter((p) => {
    if (filter.event && p.event_type !== filter.event) return false;
    if (filter.status && p.status !== filter.status) return false;
    if (filter.search && !p.name.toLowerCase().includes(filter.search.toLowerCase())) return false;
    return true;
  });

  if (weddingLoading || loading) {
    return <AppShell><div className="max-w-6xl mx-auto flex items-center justify-center py-20"><div className="flex items-center gap-3 text-foreground-500"><i className="ri-loader-4-line animate-spin text-xl" /><span className="text-sm">Loading plans...</span></div></div></AppShell>;
  }

  if (weddingError || error) {
    return <AppShell><div className="max-w-6xl mx-auto text-center py-20"><p className="text-sm text-red-600 mb-4">{weddingError || error}</p><button onClick={() => window.location.reload()} className="btn-outline text-xs py-2 cursor-pointer whitespace-nowrap">Try again</button></div></AppShell>;
  }

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <button onClick={() => navigate('/app/seating')} className="flex items-center gap-1.5 text-xs text-foreground-500 hover:text-foreground-700 mb-2 cursor-pointer whitespace-nowrap">
              <i className="ri-arrow-left-line" />Back to seating planner
            </button>
            <h1 className="font-heading text-2xl text-foreground-900">Manage plans</h1>
          </div>
          <button onClick={() => navigate('/app/seating/new')} className="btn-primary text-xs py-2 cursor-pointer whitespace-nowrap"><i className="ri-add-line mr-1.5" />Create plan</button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="relative">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400 text-xs" />
            <input type="text" value={filter.search} onChange={(e) => setFilter((f) => ({ ...f, search: e.target.value }))} placeholder="Search plans..." className="pl-8 pr-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm font-label focus:outline-none focus:border-primary-400 w-48" />
          </div>
          <select value={filter.event} onChange={(e) => setFilter((f) => ({ ...f, event: e.target.value }))} className="px-3 py-2 rounded-lg border border-secondary-200 bg-white text-xs font-label text-foreground-700 focus:outline-none focus:border-primary-400 cursor-pointer">
            <option value="">All events</option>
            {Object.entries(EVENT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={filter.status} onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value }))} className="px-3 py-2 rounded-lg border border-secondary-200 bg-white text-xs font-label text-foreground-700 focus:outline-none focus:border-primary-400 cursor-pointer">
            <option value="">All statuses</option>
            {Object.entries(PLAN_STATUS_LABELS).filter(([k]) => k !== 'archived' || filter.showArchived).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <label className="flex items-center gap-1.5 text-xs text-foreground-600 cursor-pointer">
            <input type="checkbox" checked={filter.showArchived} onChange={(e) => setFilter((f) => ({ ...f, showArchived: e.target.checked }))} className="w-3.5 h-3.5 rounded accent-primary-500 cursor-pointer" />
            Show archived
          </label>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-background-100 text-foreground-300 mb-3"><i className="ri-layout-grid-line text-xl" /></div>
            <p className="text-sm text-foreground-500 mb-4">No plans match your filters</p>
            <button onClick={() => navigate('/app/seating/new')} className="btn-primary text-xs py-2 cursor-pointer whitespace-nowrap">Create a plan</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-secondary-100">
                  <th className="text-left py-2.5 px-3 text-xs font-label font-semibold text-foreground-500">Plan name</th>
                  <th className="text-left py-2.5 px-3 text-xs font-label font-semibold text-foreground-500">Event</th>
                  <th className="text-left py-2.5 px-3 text-xs font-label font-semibold text-foreground-500">Venue</th>
                  <th className="text-left py-2.5 px-3 text-xs font-label font-semibold text-foreground-500">Status</th>
                  <th className="text-left py-2.5 px-3 text-xs font-label font-semibold text-foreground-500">Updated</th>
                  <th className="text-right py-2.5 px-3 text-xs font-label font-semibold text-foreground-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((plan) => (
                  <tr key={plan.id} className="border-b border-secondary-50 hover:bg-background-50 transition-colors">
                    <td className="py-2.5 px-3">
                      <button onClick={() => navigate(`/app/seating/plans/${plan.id}`)} className="text-sm font-label font-medium text-foreground-800 hover:text-primary-600 transition-colors cursor-pointer text-left">
                        {plan.name}
                      </button>
                    </td>
                    <td className="py-2.5 px-3 text-xs text-foreground-600">{EVENT_TYPE_LABELS[plan.event_type] || plan.event_type}</td>
                    <td className="py-2.5 px-3 text-xs text-foreground-500">{plan.room_name || '—'}</td>
                    <td className="py-2.5 px-3"><span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-label font-semibold ${PLAN_STATUS_COLOURS[plan.status]}`}>{PLAN_STATUS_LABELS[plan.status]}</span></td>
                    <td className="py-2.5 px-3 text-xs text-foreground-500">{new Date(plan.updated_at).toLocaleDateString('en-GB')}</td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center justify-end gap-1">
                        {plan.status !== 'archived' && !plan.is_working && (
                          <button onClick={() => handleAction(plan.id, 'working')} disabled={actionLoading === plan.id} className="w-7 h-7 flex items-center justify-center rounded text-foreground-400 hover:text-primary-600 hover:bg-primary-50 cursor-pointer disabled:opacity-50" title="Set working"><i className="ri-edit-line" style={{ fontSize: '13px' }} /></button>
                        )}
                        {plan.status === 'working' && (
                          <button onClick={() => handleAction(plan.id, 'review')} disabled={actionLoading === plan.id} className="w-7 h-7 flex items-center justify-center rounded text-foreground-400 hover:text-amber-600 hover:bg-amber-50 cursor-pointer disabled:opacity-50" title="Mark for review"><i className="ri-eye-line" style={{ fontSize: '13px' }} /></button>
                        )}
                        {plan.status === 'review' && (
                          <button onClick={() => handleAction(plan.id, 'final')} disabled={actionLoading === plan.id} className="w-7 h-7 flex items-center justify-center rounded text-foreground-400 hover:text-emerald-600 hover:bg-emerald-50 cursor-pointer disabled:opacity-50" title="Mark final"><i className="ri-check-double-line" style={{ fontSize: '13px' }} /></button>
                        )}
                        {plan.status !== 'published' && plan.status !== 'archived' && plan.status !== 'draft' && (
                          <button onClick={() => handleAction(plan.id, 'publish')} disabled={actionLoading === plan.id} className="w-7 h-7 flex items-center justify-center rounded text-foreground-400 hover:text-accent-600 hover:bg-accent-50 cursor-pointer disabled:opacity-50" title="Publish"><i className="ri-send-plane-line" style={{ fontSize: '13px' }} /></button>
                        )}
                        <button onClick={() => handleAction(plan.id, 'duplicate')} disabled={actionLoading === plan.id} className="w-7 h-7 flex items-center justify-center rounded text-foreground-400 hover:text-accent-600 hover:bg-accent-50 cursor-pointer disabled:opacity-50" title="Duplicate"><i className="ri-file-copy-line" style={{ fontSize: '13px' }} /></button>
                        <button onClick={() => navigate(`/app/seating/plans/${plan.id}/settings`)} className="w-7 h-7 flex items-center justify-center rounded text-foreground-400 hover:text-foreground-600 hover:bg-background-100 cursor-pointer" title="Settings"><i className="ri-settings-3-line" style={{ fontSize: '13px' }} /></button>
                        <button onClick={() => navigate(`/app/seating/plans/${plan.id}/versions`)} className="w-7 h-7 flex items-center justify-center rounded text-foreground-400 hover:text-foreground-600 hover:bg-background-100 cursor-pointer" title="Versions"><i className="ri-history-line" style={{ fontSize: '13px' }} /></button>
                        {plan.status === 'archived' ? (
                          <button onClick={() => handleAction(plan.id, 'restore')} disabled={actionLoading === plan.id} className="w-7 h-7 flex items-center justify-center rounded text-foreground-400 hover:text-emerald-600 hover:bg-emerald-50 cursor-pointer disabled:opacity-50" title="Restore"><i className="ri-arrow-go-back-line" style={{ fontSize: '13px' }} /></button>
                        ) : (
                          <button onClick={() => handleAction(plan.id, 'archive')} disabled={actionLoading === plan.id} className="w-7 h-7 flex items-center justify-center rounded text-foreground-400 hover:text-red-600 hover:bg-red-50 cursor-pointer disabled:opacity-50" title="Archive"><i className="ri-archive-line" style={{ fontSize: '13px' }} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {toast && (
          <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg max-w-md text-xs font-label ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
            <i className={`${toast.type === 'success' ? 'ri-check-line' : 'ri-error-warning-line'} text-sm flex-shrink-0`} />
            <span>{toast.msg}</span>
            <button onClick={() => setToast(null)} className="ml-2 text-white/70 hover:text-white cursor-pointer"><i className="ri-close-line" /></button>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function SeatingPlansPage() {
  const navigate = useNavigate();
  const demo = useDemoDataSafe();
  const isDemo = !!demo;

  if (isDemo) return <DemoSeatingPlansPage />;

  return <NormalSeatingPlansPage />;
}