import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '@/components/feature/AppShell';
import { useDemoDataSafe } from '@/demo/useDemoDataSafe';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { supabase } from '@/lib/supabase';
import { mapToSeatingPlan, mapToTablesWithData, mapToRoomObjects, mapToUnseatedGuests, mapToAllGuestInfos } from '@/demo/demoSeatingMapping';
import type { TableWithData, GuestInfo, UnseatedGuest, RoomObject, GuestSeating, SeatingSeat, CanvasWarning } from '@/types/seating';

// ── Simple room canvas (no heavy Canvas component needed for overview) ──
function MiniSeatingCanvas({ tables, roomObjects }: { tables: TableWithData[]; roomObjects: RoomObject[] }) {
  return (
    <div className="relative w-full" style={{ paddingBottom: '70%' }}>
      <div className="absolute inset-0 bg-background-50 rounded-xl border border-secondary-200 overflow-hidden">
        {/* Room boundary */}
        <div className="absolute inset-4 border-2 border-secondary-200 rounded-lg bg-white">
          {/* Room objects */}
          {roomObjects.map((obj) => (
            <div key={obj.id} className="absolute flex flex-col items-center justify-center border-2 border-amber-200 bg-amber-50/60 rounded-lg"
              style={{
                left: `${(obj.x_position / 900) * 100}%`,
                top: `${(obj.y_position / 950) * 100}%`,
                width: `${(obj.width / 900) * 100}%`,
                height: `${(obj.height / 950) * 100}%`,
              }}>
              <i className="ri-music-line text-amber-400 text-[10px]" />
              <span className="text-[7px] text-amber-500 font-label">{obj.name}</span>
            </div>
          ))}

          {/* Tables */}
          {tables.map((table) => (
            <div key={table.id} className="absolute flex items-center justify-center border-2 border-emerald-300 bg-emerald-50 rounded-full"
              style={{
                left: `${(table.position_x / 900) * 100}%`,
                top: `${(table.position_y / 950) * 100}%`,
                width: `${(table.width / 900) * 100}%`,
                height: `${(table.height / 950) * 100}%`,
              }}>
              <div className="text-center">
                <span className="text-[8px] font-label text-emerald-700 leading-tight block">{table.name.split(' — ')[0] || table.name}</span>
                <span className="text-[7px] text-emerald-500">{table.seated_count}/{table.capacity}</span>
              </div>
            </div>
          ))}

          {/* Room label */}
          <span className="absolute top-2 left-3 text-[9px] text-foreground-300 font-label uppercase">The Orangery · Reception</span>
        </div>
      </div>
    </div>
  );
}

export default function SeatingOverviewPage() {
  const navigate = useNavigate();
  const demo = useDemoDataSafe();
  const isDemo = !!demo;

  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [resetConfirm, setResetConfirm] = useState(false);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Demo mode ──
  const demoPlan = useMemo(() => {
    if (!isDemo || !demo) return null;
    return mapToSeatingPlan(demo.state.seatingPlan);
  }, [isDemo, demo]);

  const demoTables = useMemo(() => {
    if (!isDemo || !demo) return [] as TableWithData[];
    return mapToTablesWithData(demo.state.seatingPlan, demo.state.guests);
  }, [isDemo, demo]);

  const demoRoomObjects = useMemo(() => {
    if (!isDemo || !demo) return [] as RoomObject[];
    return mapToRoomObjects(demo.state.seatingPlan);
  }, [isDemo, demo]);

  const demoUnseated = useMemo(() => {
    if (!isDemo || !demo) return [] as UnseatedGuest[];
    return mapToUnseatedGuests(demo.state.seatingPlan, demo.state.guests);
  }, [isDemo, demo]);

  const demoAllGuests = useMemo(() => {
    if (!isDemo || !demo) return [] as GuestInfo[];
    return mapToAllGuestInfos(demo.state.guests);
  }, [isDemo, demo]);

  const totalGuests = demoAllGuests.length;
  const totalSeated = demoTables.reduce((s, t) => s + t.seated_count, 0);
  const totalUnseated = demoUnseated.length;
  const tableCount = demoTables.length;

  const handleResetSeating = useCallback(() => {
    if (!isDemo || !demo) return;
    setResetConfirm(false);
    demo.resetSeatingOnly();
    showToast('Seating layout reset to original. All changes removed.');
    demo.addDemoActivity({
      id: `demo-activity-${Date.now()}`,
      timestamp: new Date().toISOString(),
      message: 'Seating layout was reset to the original plan.',
      category: 'seating',
      related_guest: '',
      wedding_id: demo.state.wedding.id,
    });
  }, [isDemo, demo]);

  // ── Non-demo fallback ──
  if (!isDemo) {
    return <RealSeatingOverview />;
  }

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="font-heading text-2xl md:text-3xl text-foreground-900">Seating planner</h1>
              <span className="px-2 py-0.5 rounded-full bg-accent-100 text-accent-700 text-[10px] font-label font-semibold">Demo Account</span>
            </div>
            <p className="text-sm text-foreground-500 mt-1">Arrange tables, assign guests and visualise the Orangery reception.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/guest/demo-session/seating`)}
              className="btn-outline text-xs py-2 cursor-pointer whitespace-nowrap"
            >
              <i className="ri-eye-line mr-1.5" />Preview as guest
            </button>
            <button
              onClick={() => navigate('/app/seating/plans/demo-plan')}
              className="btn-primary text-xs py-2 cursor-pointer whitespace-nowrap"
            >
              <i className="ri-layout-grid-line mr-1.5" />Open planner
            </button>
          </div>
        </div>

        {/* Help banner */}
        <div className="mb-6 px-4 py-3.5 rounded-xl bg-accent-50 border border-accent-100 flex items-start gap-3">
          <div className="w-6 h-6 flex items-center justify-center text-accent-600 flex-shrink-0 mt-0.5">
            <i className="ri-lightbulb-line text-base" />
          </div>
          <div>
            <p className="text-sm font-label font-medium text-accent-900">How the seating planner works</p>
            <p className="text-xs text-accent-700 mt-0.5 leading-relaxed">This overview shows your table layout and which guests are assigned. Click &ldquo;Open planner&rdquo; to drag and drop guests onto tables in the interactive room canvas. Guests with dietary needs or allergies are flagged automatically. This is demo data; no changes are saved permanently.</p>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Guest tables', value: tableCount, icon: 'ri-hotel-line', color: 'text-primary-600', bg: 'bg-primary-50' },
            { label: 'Total guests', value: totalGuests, icon: 'ri-group-line', color: 'text-foreground-700', bg: 'bg-background-100' },
            { label: 'Seated', value: totalSeated, icon: 'ri-user-received-line', color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Unassigned', value: totalUnseated, icon: 'ri-user-unfollow-line', color: 'text-amber-600', bg: 'bg-amber-50' },
          ].map((card) => (
            <div key={card.label} className="card-default">
              <div className={`w-8 h-8 flex items-center justify-center rounded-lg ${card.bg} ${card.color} mb-3`}>
                <i className={`${card.icon} text-sm`} />
              </div>
              <p className="text-2xl font-heading font-semibold text-foreground-900">{card.value}</p>
              <p className="text-xs text-foreground-500 font-label mt-1">{card.label}</p>
            </div>
          ))}
        </div>

        {/* Plan card + mini canvas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Plan info */}
          <div className="card-default">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                <i className="ri-layout-grid-line text-sm" />
              </div>
              <div>
                <h2 className="font-label text-sm font-semibold text-foreground-900">{demoPlan?.name || 'Orangery Reception Layout'}</h2>
                <p className="text-xs text-foreground-500">Working plan · Last updated {demoPlan ? new Date(demoPlan.updated_at).toLocaleDateString('en-GB') : ''}</p>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              {[
                { label: 'Venue', value: 'The Orangery, Bath', icon: 'ri-building-line' },
                { label: 'Room', value: 'Main reception hall', icon: 'ri-door-open-line' },
                { label: 'Capacity', value: `${totalSeated}/${demoTables.reduce((s, t) => s + t.capacity, 0)} seats used`, icon: 'ri-user-line' },
                { label: 'Tables', value: `${tableCount} guest tables + 1 dance floor`, icon: 'ri-layout-grid-line' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2 text-xs">
                  <i className={`${item.icon} text-foreground-400 text-[11px] w-4 text-center`} />
                  <span className="text-foreground-500 w-16 flex-shrink-0">{item.label}</span>
                  <span className="text-foreground-800 font-label">{item.value}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/app/seating/plans/demo-plan')}
                className="px-3 py-2 bg-primary-500 text-white rounded-lg text-xs font-label font-semibold hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
              >
                Open planner
              </button>
              <button
                onClick={() => { if (window.confirm('Reset the seating layout to its original arrangement? All assignment changes will be lost.')) handleResetSeating(); }}
                className="px-3 py-2 border border-secondary-200 rounded-lg text-xs font-label text-foreground-600 hover:bg-background-50 transition-colors cursor-pointer whitespace-nowrap"
              >
                <i className="ri-refresh-line mr-1" />Reset layout
              </button>
            </div>
          </div>

          {/* Mini canvas preview */}
          <div className="card-default">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-label text-sm font-semibold text-foreground-900">Room preview</h2>
              <span className="text-[10px] text-foreground-400">The Orangery</span>
            </div>
            <MiniSeatingCanvas tables={demoTables} roomObjects={demoRoomObjects} />
          </div>
        </div>

        {/* Table list */}
        <div className="card-default mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-label text-sm font-semibold text-foreground-900">Tables</h2>
            <span className="text-xs text-foreground-400">{tableCount} tables</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {demoTables.map((table) => (
              <div key={table.id} className="border border-secondary-200 rounded-lg p-4 hover:border-primary-300 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-label font-semibold text-foreground-800">{table.name}</h3>
                  <span className={`text-[10px] font-label px-2 py-0.5 rounded-full ${table.seated_count >= table.capacity ? 'bg-red-50 text-red-600' : table.seated_count > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-secondary-100 text-secondary-600'}`}>
                    {table.seated_count}/{table.capacity}
                  </span>
                </div>
                <p className="text-[11px] text-foreground-500 mb-2">
                  {table.shape === 'round' ? 'Round table' : 'Rectangular table'} · {table.capacity} seats
                </p>
                {table.assignments.length > 0 && (
                  <div className="space-y-1">
                    {table.assignments.map((a) => (
                      <div key={a.id} className="flex items-center gap-1.5 text-[11px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary-400 flex-shrink-0" />
                        <span className="text-foreground-700 truncate">{a.guests?.full_name || 'Unknown'}</span>
                        {a.guests?.dietary_requirements && (
                          <span className="text-amber-500 flex-shrink-0" title="Dietary"><i className="ri-leaf-line text-[10px]" /></span>
                        )}
                        {a.guests?.allergy_notes && (
                          <span className="text-red-400 flex-shrink-0" title="Allergy"><i className="ri-alert-line text-[10px]" /></span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {table.assignments.length === 0 && (
                  <p className="text-[11px] text-foreground-400 italic">No guests assigned</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Unassigned guests */}
        {demoUnseated.length > 0 && (
          <div className="card-default">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-label text-sm font-semibold text-foreground-900">
                Unassigned guests
                <span className="ml-2 text-xs font-normal text-amber-600">{demoUnseated.length} waiting</span>
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {demoUnseated.map((g) => (
                <div key={g.id} className="flex items-center gap-2 p-2 rounded-lg border border-secondary-100">
                  <div className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-full bg-amber-50 text-amber-600 text-[10px] font-label">
                    {g.full_name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-label text-foreground-800 truncate">{g.full_name}</p>
                    <div className="flex items-center gap-1">
                      {g.has_dietary && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Dietary" />}
                      {g.has_accessibility && <span className="w-1.5 h-1.5 rounded-full bg-sky-400" title="Accessibility" />}
                      <span className="text-[9px] text-foreground-400">{g.rsvp_status || 'pending'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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

/* ── Real (Supabase-backed) seating overview ── */

function RealSeatingOverview() {
  const navigate = useNavigate();
  const { weddingId, loading: weddingLoading } = useActiveWedding();

  interface PlanSummary {
    id: string; name: string; event_type: string; room_name: string | null;
    status: string; revision: number; canvas_width: number; canvas_height: number;
    updated_at: string; _count_tables: number; _count_assignments: number;
  }

  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newPlanName, setNewPlanName] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchPlans = useCallback(async () => {
    if (!weddingId || !supabase) return;
    setLoading(true);
    try {
      const { data, error: err } = await supabase
        .from('seating_plans')
        .select('id, name, event_type, room_name, status, revision, canvas_width, canvas_height, updated_at')
        .eq('wedding_id', weddingId)
        .order('updated_at', { ascending: false });

      if (err) throw err;

      const plansWithCounts = await Promise.all(
        (data || []).map(async (p: PlanSummary) => {
          const [{ count: tc }, { count: ac }] = await Promise.all([
            supabase.from('seating_tables').select('*', { count: 'exact', head: true }).eq('plan_id', p.id),
            supabase.from('seating_assignments').select('*', { count: 'exact', head: true }).eq('plan_id', p.id),
          ]);
          return { ...p, _count_tables: tc || 0, _count_assignments: ac || 0 };
        })
      );

      setPlans(plansWithCounts);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load plans');
    } finally { setLoading(false); }
  }, [weddingId, supabase]);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  const handleCreate = async () => {
    if (!newPlanName.trim() || !weddingId || !supabase) return;
    setCreating(true);
    try {
      const { data, error: err } = await supabase.from('seating_plans').insert({
        wedding_id: weddingId, name: newPlanName.trim(),
        event_type: 'reception', status: 'draft', canvas_width: 1200, canvas_height: 900,
        grid_enabled: true, grid_size: 20, snap_to_grid: true, measurement_unit: 'px',
        default_zoom: 0.85, revision: 1,
      }).select('*').single();
      if (err) throw err;
      await supabase.from('seating_activity_log').insert({ wedding_id: weddingId, seating_plan_id: data.id, action: 'plan_created', summary: `Created "${newPlanName}"` });
      setShowCreate(false);
      setNewPlanName('');
      navigate(`/app/seating/plans/${data.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Create failed');
    } finally { setCreating(false); }
  };

  if (weddingLoading || loading) {
    return (
      <AppShell>
        <div className="h-[calc(100vh-80px)] flex items-center justify-center">
          <i className="ri-loader-4-line animate-spin text-xl text-foreground-400" />
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        <div className="max-w-6xl mx-auto text-center py-20">
          <p className="text-sm text-red-600 mb-4">{error}</p>
          <button onClick={fetchPlans} className="btn-outline text-xs py-2 cursor-pointer whitespace-nowrap">Retry</button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-heading text-2xl md:text-3xl text-foreground-900">Seating planner</h1>
            <p className="text-sm text-foreground-500 mt-1">{plans.length} plan{plans.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={() => { setShowCreate(true); setNewPlanName(''); setError(''); }}
            className="btn-primary text-xs py-2 cursor-pointer whitespace-nowrap">
            <i className="ri-add-line mr-1.5" />New plan
          </button>
        </div>

        {plans.length === 0 ? (
          <div className="text-center py-16 bg-background-50 rounded-xl border border-secondary-100">
            <div className="w-14 h-14 mx-auto flex items-center justify-center rounded-full bg-background-100 text-foreground-300 mb-4">
              <i className="ri-layout-grid-line text-2xl" />
            </div>
            <h2 className="font-heading text-lg text-foreground-700 mb-1">No seating plans yet</h2>
            <p className="text-sm text-foreground-500 mb-6">Create your first seating plan to start arranging tables and assigning guests.</p>
            <button onClick={() => { setShowCreate(true); setNewPlanName(''); }}
              className="btn-primary text-sm py-2.5 px-6 cursor-pointer whitespace-nowrap">
              <i className="ri-add-line mr-1.5" />Create your first plan
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map((p) => (
              <button key={p.id}
                onClick={() => navigate(`/app/seating/plans/${p.id}`)}
                className="card-default text-left hover:border-primary-300 transition-colors cursor-pointer group">
                <div className="flex items-center justify-between mb-3">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-label font-semibold ${
                    p.status === 'published' ? 'bg-accent-100 text-accent-700' :
                    p.status === 'final' ? 'bg-emerald-100 text-emerald-700' :
                    p.status === 'review' ? 'bg-amber-100 text-amber-700' :
                    p.status === 'working' ? 'bg-primary-100 text-primary-700' :
                    p.status === 'archived' ? 'bg-foreground-100 text-foreground-500' :
                    'bg-secondary-100 text-secondary-700'}`}>
                    {p.status}
                  </span>
                  <span className="text-[10px] text-foreground-400">v{p.revision}</span>
                </div>
                <h3 className="font-label text-sm font-semibold text-foreground-900 mb-1 truncate">{p.name}</h3>
                <p className="text-[11px] text-foreground-500 mb-3 truncate">
                  {p.event_type === 'reception' ? 'Reception' : p.event_type === 'ceremony' ? 'Ceremony' : p.event_type.replace('_', ' ')}
                  {p.room_name ? ` · ${p.room_name}` : ''}
                </p>
                <div className="flex items-center gap-3 text-[10px] text-foreground-400">
                  <span><i className="ri-layout-grid-line mr-0.5" />{p._count_tables} tables</span>
                  <span><i className="ri-user-received-line mr-0.5" />{p._count_assignments} seated</span>
                  <span className="ml-auto">{new Date(p.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                </div>
                <div className="mt-3 w-full h-1.5 bg-secondary-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-primary-400" style={{ width: `${Math.min(100, (p._count_assignments / Math.max(1, p._count_tables * 8)) * 100)}%` }} />
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Create modal */}
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setShowCreate(false)}>
            <div className="bg-white rounded-xl p-6 w-full max-w-sm mx-4 shadow-lg" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-heading text-base text-foreground-900 mb-4">New seating plan</h3>
              {error && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg mb-3">{error}</p>}
              <label className="block text-xs font-label text-foreground-600 mb-1">Plan name</label>
              <input type="text" value={newPlanName} onChange={(e) => setNewPlanName(e.target.value)}
                placeholder="e.g. Reception layout"
                className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm focus:outline-none focus:border-primary-400 mb-4"
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }} autoFocus />
              <div className="flex gap-2">
                <button onClick={() => setShowCreate(false)} className="flex-1 px-4 py-2 rounded-lg border border-secondary-200 text-xs font-label text-foreground-600 cursor-pointer whitespace-nowrap">Cancel</button>
                <button onClick={handleCreate} disabled={creating || !newPlanName.trim()}
                  className="flex-1 px-4 py-2 rounded-lg bg-primary-500 text-white text-xs font-label font-semibold hover:bg-primary-600 cursor-pointer whitespace-nowrap disabled:opacity-50">
                  {creating ? 'Creating...' : 'Create plan'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}