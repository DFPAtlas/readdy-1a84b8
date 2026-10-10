import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppShell from '@/components/feature/AppShell';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { supabase } from '@/lib/supabase';
import type { SeatingPlanVersion } from '@/types/seating';

export default function PlanVersionsPage() {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const { weddingId, loading: weddingLoading } = useActiveWedding();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [planName, setPlanName] = useState('');
  const [versions, setVersions] = useState<SeatingPlanVersion[]>([]);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState<{ id: string; value: string } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = useCallback(async () => {
    if (!weddingId || !planId) return;
    try {
      const [planRes, versionsRes] = await Promise.all([
        supabase.from('seating_plans').select('name').eq('id', planId).eq('wedding_id', weddingId).maybeSingle(),
        supabase.from('seating_plan_versions').select('*').eq('seating_plan_id', planId).order('version_number', { ascending: false }),
      ]);
      if (planRes.error) throw planRes.error;
      if (!planRes.data) { setError('Plan not found'); setLoading(false); return; }
      if (versionsRes.error) throw versionsRes.error;
      setPlanName(planRes.data.name);
      setVersions((versionsRes.data || []) as SeatingPlanVersion[]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }, [weddingId, planId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreateSnapshot = async () => {
    setActionLoading('snapshot');
    try {
      const [planRes, tablesRes, assignRes] = await Promise.all([
        supabase.from('seating_plans').select('*').eq('id', planId).single(),
        supabase.from('seating_tables').select('*').eq('plan_id', planId),
        supabase.from('seating_assignments').select('*').eq('plan_id', planId),
      ]);
      const snapshot = { plan: planRes.data, tables: tablesRes.data, assignments: assignRes.data };
      const nextVer = versions.length > 0 ? Math.max(...versions.map((v) => v.version_number)) + 1 : 1;
      await supabase.from('seating_plan_versions').insert({
        wedding_id: weddingId, seating_plan_id: planId, version_number: nextVer,
        label: 'Manual snapshot', reason: 'Manual snapshot', snapshot_data: snapshot as unknown as unknown as Record<string, unknown>,
        source_revision: planRes.data.revision,
      });
      await supabase.from('seating_activity_log').insert({ wedding_id: weddingId, seating_plan_id: planId, action: 'version_created', summary: `Snapshot v${nextVer} created` });
      showToast('Snapshot created');
      fetchData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRestore = async (version: SeatingPlanVersion) => {
    setActionLoading(version.id);
    try {
      const snapshot = version.snapshot_data as { plan?: Record<string, unknown>; tables?: Record<string, unknown>[]; assignments?: Record<string, unknown>[] } | null;
      if (!snapshot || !snapshot.plan) { showToast('Snapshot data missing', 'error'); setActionLoading(null); return; }

      // Update plan metadata (not status)
      const planData = snapshot.plan;
      await supabase.from('seating_plans').update({
        canvas_width: planData.canvas_width || 1200, canvas_height: planData.canvas_height || 900,
        grid_enabled: planData.grid_enabled ?? true, grid_size: planData.grid_size || 20,
        snap_to_grid: planData.snap_to_grid ?? true, default_zoom: planData.default_zoom || 1,
        background_opacity: planData.background_opacity ?? 1, background_locked: planData.background_locked ?? false,
        revision: ((planData.revision as number) || 1) + 1, updated_at: new Date().toISOString(),
      }).eq('id', planId);

      // Clear current tables & restore
      await supabase.from('seating_assignments').delete().eq('plan_id', planId);
      await supabase.from('seating_tables').delete().eq('plan_id', planId);

      if (snapshot.tables && snapshot.tables.length > 0) {
        await supabase.from('seating_tables').insert(snapshot.tables.map((t) => ({
          ...t, id: undefined, plan_id: planId, wedding_id: weddingId,
        })));
      }

      if (snapshot.assignments && snapshot.assignments.length > 0) {
        await supabase.from('seating_assignments').insert(snapshot.assignments.map((a) => ({
          ...a, id: undefined, plan_id: planId, wedding_id: weddingId,
        })));
      }

      // Create a restore version entry
      const nextVer = Math.max(...versions.map((v) => v.version_number)) + 1;
      await supabase.from('seating_plan_versions').insert({
        wedding_id: weddingId, seating_plan_id: planId, version_number: nextVer,
        label: `Restored from v${version.version_number}`, reason: `Restored from version ${version.version_number}: ${version.label || 'unnamed'}`,
        snapshot_data: {} as unknown as unknown as Record<string, unknown>, source_revision: ((planData.revision as number) || 1) + 1,
      });

      await supabase.from('seating_activity_log').insert({
        wedding_id: weddingId, seating_plan_id: planId, action: 'version_restored',
        summary: `Restored from v${version.version_number}`, metadata: { restored_from_version: version.version_number },
      });

      showToast(`Restored from v${version.version_number}`);
      fetchData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDuplicateAsPlan = async (version: SeatingPlanVersion) => {
    setActionLoading(version.id);
    try {
      const snapshot = version.snapshot_data as { plan?: Record<string, unknown>; tables?: Record<string, unknown>[] } | null;
      if (!snapshot?.plan) { showToast('Snapshot data missing', 'error'); setActionLoading(null); return; }

      const srcPlan = snapshot.plan;
      const { data: np } = await supabase.from('seating_plans').insert({
        wedding_id: weddingId, name: `${srcPlan.name || planName} (from v${version.version_number})`,
        event_type: srcPlan.event_type || 'reception', room_name: srcPlan.room_name,
        canvas_width: srcPlan.canvas_width || 1200, canvas_height: srcPlan.canvas_height || 900,
        grid_enabled: srcPlan.grid_enabled, grid_size: srcPlan.grid_size, snap_to_grid: srcPlan.snap_to_grid,
        status: 'draft',
      }).select('*').single();

      if (np && snapshot.tables && snapshot.tables.length > 0) {
        await supabase.from('seating_tables').insert(snapshot.tables.map((t) => ({
          ...t, id: undefined, plan_id: np.id, wedding_id: weddingId,
        })));
      }

      await supabase.from('seating_plan_versions').insert({ wedding_id: weddingId, seating_plan_id: np.id, version_number: 1, label: 'Initial version', reason: `Created from v${version.version_number} of "${planName}"`, snapshot_data: {}, source_revision: 1 });
      await supabase.from('seating_activity_log').insert({ wedding_id: weddingId, seating_plan_id: np.id, action: 'plan_created', summary: `Created from v${version.version_number}` });

      showToast('New plan created');
      navigate(`/app/seating/plans/${np.id}`);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateLabel = async (versionId: string) => {
    if (!editingLabel) return;
    try {
      await supabase.from('seating_plan_versions').update({ label: editingLabel.value || null }).eq('id', versionId);
      setEditingLabel(null);
      fetchData();
      showToast('Label updated');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed', 'error');
    }
  };

  if (weddingLoading || loading) {
    return <AppShell><div className="max-w-3xl mx-auto flex items-center justify-center py-20"><div className="flex items-center gap-3 text-foreground-500"><i className="ri-loader-4-line animate-spin text-xl" /><span className="text-sm">Loading versions...</span></div></div></AppShell>;
  }
  if (error) {
    return <AppShell><div className="max-w-3xl mx-auto text-center py-20"><p className="text-sm text-red-600 mb-4">{error}</p><button onClick={() => navigate(`/app/seating/plans/${planId}`)} className="btn-outline text-xs py-2 cursor-pointer whitespace-nowrap">Back</button></div></AppShell>;
  }

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto">
        <button onClick={() => navigate(`/app/seating/plans/${planId}`)} className="flex items-center gap-1.5 text-xs text-foreground-500 hover:text-foreground-700 mb-4 cursor-pointer whitespace-nowrap">
          <i className="ri-arrow-left-line" />Back to plan
        </button>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-heading text-2xl text-foreground-900">Version history</h1>
            <p className="text-sm text-foreground-500 mt-1">{planName}</p>
          </div>
          <button onClick={handleCreateSnapshot} disabled={actionLoading === 'snapshot'}
            className="btn-primary text-xs py-2 cursor-pointer whitespace-nowrap disabled:opacity-50">
            {actionLoading === 'snapshot' ? <><i className="ri-loader-4-line animate-spin mr-1.5" />Creating...</> : <><i className="ri-camera-line mr-1.5" />Create snapshot</>}
          </button>
        </div>

        {versions.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-background-100 text-foreground-300 mb-3"><i className="ri-history-line text-xl" /></div>
            <p className="text-sm text-foreground-500 mb-4">No versions yet</p>
            <button onClick={handleCreateSnapshot} className="btn-primary text-xs py-2 cursor-pointer whitespace-nowrap">Create first snapshot</button>
          </div>
        ) : (
          <div className="space-y-3">
            {versions.map((v) => (
              <div key={v.id} className="card-default flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-background-100 flex items-center justify-center">
                  <span className="font-heading text-sm text-foreground-700">v{v.version_number}</span>
                </div>
                <div className="flex-1 min-w-0">
                  {editingLabel?.id === v.id ? (
                    <div className="flex items-center gap-2">
                      <input type="text" value={editingLabel.value} onChange={(e) => setEditingLabel({ ...editingLabel, value: e.target.value })}
                        className="input-field text-sm py-1 flex-1" placeholder="Version label" autoFocus
                        onKeyDown={(e) => { if (e.key === 'Enter') handleUpdateLabel(v.id); if (e.key === 'Escape') setEditingLabel(null); }} />
                      <button onClick={() => handleUpdateLabel(v.id)} className="w-7 h-7 flex items-center justify-center rounded text-emerald-600 hover:bg-emerald-50 cursor-pointer"><i className="ri-check-line text-sm" /></button>
                      <button onClick={() => setEditingLabel(null)} className="w-7 h-7 flex items-center justify-center rounded text-foreground-400 hover:bg-background-50 cursor-pointer"><i className="ri-close-line text-sm" /></button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-label font-medium text-foreground-800">{v.label || `Version ${v.version_number}`}</p>
                      <button onClick={() => setEditingLabel({ id: v.id, value: v.label || '' })}
                        className="w-5 h-5 flex items-center justify-center rounded text-foreground-300 hover:text-foreground-600 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                        <i className="ri-pencil-line text-[11px]" />
                      </button>
                    </div>
                  )}
                  {v.reason && <p className="text-xs text-foreground-500 mt-0.5">{v.reason}</p>}
                  <p className="text-[11px] text-foreground-400 mt-1">
                    {new Date(v.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    {v.source_revision && ` · Revision ${v.source_revision}`}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => handleRestore(v)} disabled={actionLoading === v.id}
                    className="px-3 py-1.5 text-[11px] font-label border border-secondary-200 text-foreground-600 rounded-md hover:bg-background-50 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
                    title="Restore as current working version">
                    Restore
                  </button>
                  <button onClick={() => handleDuplicateAsPlan(v)} disabled={actionLoading === v.id}
                    className="px-3 py-1.5 text-[11px] font-label border border-secondary-200 text-foreground-600 rounded-md hover:bg-background-50 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
                    title="Duplicate into a new plan">
                    New plan
                  </button>
                </div>
              </div>
            ))}
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