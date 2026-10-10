import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppShell from '@/components/feature/AppShell';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { supabase } from '@/lib/supabase';
import type { SeatingPlan, SeatingConflict, SeatingRule, ConflictSeverity, ConflictStatus } from '@/types/seating';
import { CONFLICT_SEVERITY_LABELS, CONFLICT_SEVERITY_COLOURS, CONFLICT_TYPE_LABELS } from '@/types/seating';

export default function SeatingConflictsPage() {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const { weddingId, loading: weddingLoading } = useActiveWedding();

  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<SeatingPlan | null>(null);
  const [conflicts, setConflicts] = useState<SeatingConflict[]>([]);
  const [regenerating, setRegenerating] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState<ConflictSeverity | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<ConflictStatus | 'all'>('all');
  const [toast, setToast] = useState<{ msg: string; type: 'error' | 'success' } | null>(null);

  const fetchData = useCallback(async () => {
    if (!weddingId || !planId) return;
    setLoading(true);
    try {
      const { data: planData } = await supabase.from('seating_plans').select('*').eq('id', planId).eq('wedding_id', weddingId).maybeSingle();
      if (!planData) { navigate('/app/seating'); return; }
      setPlan(planData as SeatingPlan);

      const { data: conflictsData } = await supabase.from('seating_conflicts').select('*, guest:guest_id(id, full_name), related_guest:related_guest_id(id, full_name), table:seating_table_id(id, name)').eq('seating_plan_id', planId).order('created_at', { ascending: false });
      setConflicts((conflictsData || []) as SeatingConflict[]);
    } catch { /* */ } finally { setLoading(false); }
  }, [weddingId, planId, navigate]);

  useEffect(() => { if (weddingId && planId) fetchData(); }, [weddingId, planId, fetchData]);

  const runAnalysis = async () => {
    if (!weddingId || !planId) return;
    setRegenerating(true);
    try {
      // Clear old conflicts
      await supabase.from('seating_conflicts').delete().eq('seating_plan_id', planId);

      // Fetch current assignments + rules for analysis
      const [{ data: assignments }, { data: tablesData }, { data: seatsData }, { data: rulesData }, { data: guestsData }] = await Promise.all([
        supabase.from('seating_assignments').select('*, guests!inner(id, full_name, guest_type, rsvp_status, accessibility_needs, household_id, relationship_label)').eq('plan_id', planId),
        supabase.from('seating_tables').select('*').eq('plan_id', planId),
        supabase.from('seating_seats').select('*').eq('seating_plan_id', planId),
        supabase.from('seating_rules').select('*').eq('wedding_id', weddingId).or(`seating_plan_id.eq.${planId}, seating_plan_id.is.null`).eq('status', 'active'),
        supabase.from('guests').select('id, full_name, guest_type, rsvp_status, accessibility_needs, accessibility_notes, household_id, relationship_label, status').eq('wedding_id', weddingId),
      ]);

      const newConflicts: Array<Record<string, unknown>> = [];
      const tables = (tablesData || []) as unknown as Record<string, unknown>[];
      const seats = (seatsData || []) as unknown as Record<string, unknown>[];
      const rules = (rulesData || []) as SeatingRule[];
      const guests = (guestsData || []) as unknown as Record<string, unknown>[];
      const assigns = (assignments || []) as unknown as Record<string, unknown>[];

      // 1. Check over-capacity
      const tableGuestCounts: Record<string, number> = {};
      assigns.forEach((a) => { const tid = a.table_id as string; tableGuestCounts[tid] = (tableGuestCounts[tid] || 0) + 1; });
      tables.forEach((t) => {
        const count = tableGuestCounts[t.id as string] || 0;
        if (count > (t.capacity as number)) {
          newConflicts.push({ wedding_id: weddingId, seating_plan_id: planId, conflict_type: 'over_capacity', severity: 'high', seating_table_id: t.id, summary: `"${t.name}" has ${count} guests but only ${t.capacity} seats`, status: 'open' });
        }
      });

      // 2. Check split households
      const householdTables: Record<string, Set<string>> = {};
      assigns.forEach((a) => {
        const guest = (a as unknown as Record<string, unknown>).guests as unknown as Record<string, unknown> | undefined;
        const hid = guest?.household_id as string | undefined;
        const tid = a.table_id as string;
        if (hid) { if (!householdTables[hid]) householdTables[hid] = new Set(); householdTables[hid].add(tid); }
      });
      Object.entries(householdTables).forEach(([hid, tableSet]) => {
        if (tableSet.size > 1) {
          const guestsInHousehold = assigns.filter((a) => ((a as unknown as Record<string, unknown>).guests as unknown as Record<string, unknown>)?.household_id === hid);
          const guestNames = guestsInHousehold.map((a) => ((a as unknown as Record<string, unknown>).guests as unknown as Record<string, unknown>)?.full_name).join(', ');
          newConflicts.push({ wedding_id: weddingId, seating_plan_id: planId, conflict_type: 'split_household', severity: 'medium', guest_id: guestsInHousehold[0]?.guest_id, summary: `Household split across ${tableSet.size} tables: ${guestNames}`, status: 'open' });
        }
      });

      // 3. Check accessibility mismatches (wheelchair guests not in wheelchair seats)
      const wheelchairGuests = guests.filter((g) => (g.accessibility_needs as string || '').toLowerCase().includes('wheelchair') || (g.accessibility_notes as string || '').toLowerCase().includes('wheelchair'));
      const wheelchairSeatIds = new Set(seats.filter((s) => s.seat_type === 'wheelchair').map((s) => s.id as string));
      wheelchairGuests.forEach((g) => {
        const assign = assigns.find((a) => a.guest_id === g.id);
        if (assign && assign.seating_seat_id && !wheelchairSeatIds.has(assign.seating_seat_id as string)) {
          newConflicts.push({ wedding_id: weddingId, seating_plan_id: planId, conflict_type: 'accessibility_mismatch', severity: 'high', guest_id: g.id, seating_seat_id: assign.seating_seat_id, summary: `"${g.full_name}" needs wheelchair access but is not in a wheelchair seat`, status: 'open' });
        }
      });

      // 4. Check duplicate assignments
      const guestAssignCount: Record<string, number> = {};
      assigns.forEach((a) => { guestAssignCount[a.guest_id as string] = (guestAssignCount[a.guest_id as string] || 0) + 1; });
      Object.entries(guestAssignCount).forEach(([gid, count]) => {
        if (count > 1) {
          const guest = guests.find((g) => g.id === gid);
          newConflicts.push({ wedding_id: weddingId, seating_plan_id: planId, conflict_type: 'duplicate_assignment', severity: 'critical', guest_id: gid, summary: `"${guest?.full_name || gid}" is assigned to ${count} seats`, status: 'open' });
        }
      });

      // 5. Check declined/archived guests seated
      const declinedGuestIds = new Set(guests.filter((g) => g.rsvp_status === 'declined' || g.status === 'archived').map((g) => g.id));
      assigns.forEach((a) => {
        if (declinedGuestIds.has(a.guest_id as string)) {
          const guest = guests.find((g) => g.id === a.guest_id);
          newConflicts.push({ wedding_id: weddingId, seating_plan_id: planId, conflict_type: 'declined_guest_seated', severity: 'low', guest_id: a.guest_id, summary: `"${guest?.full_name || a.guest_id}" has declined but is seated`, status: 'open' });
        }
      });

      // 6. Hard rule violations
      const hardRules = rules.filter((r) => r.is_hard_constraint);
      hardRules.forEach((rule) => {
        newConflicts.push({ wedding_id: weddingId, seating_plan_id: planId, conflict_type: 'hard_violation', severity: 'critical', seating_rule_id: rule.id, summary: `Hard rule "${rule.name}" may be violated — manual review needed`, status: 'open' });
      });

      if (newConflicts.length > 0) {
        await supabase.from('seating_conflicts').insert(newConflicts);
      }
      await supabase.from('seating_activity_log').insert({ wedding_id: weddingId, seating_plan_id: planId, action: 'conflicts_analysed', summary: `Found ${newConflicts.length} conflict(s)` });
      setToast({ msg: `Analysis complete — ${newConflicts.length} conflict(s) found`, type: 'success' });
      fetchData();
    } catch { setToast({ msg: 'Analysis failed', type: 'error' }); }
    finally { setRegenerating(false); }
  };

  const handleResolve = async (id: string, status: ConflictStatus, overrideReason?: string) => {
    await supabase.from('seating_conflicts').update({ status, override_reason: overrideReason || null, resolved_at: status === 'resolved' || status === 'overridden' ? new Date().toISOString() : null, updated_at: new Date().toISOString() }).eq('id', id);
    await supabase.from('seating_activity_log').insert({ wedding_id: weddingId, seating_plan_id: planId, action: `conflict_${status}`, summary: `Conflict marked as ${status}` });
    setToast({ msg: `Conflict ${status}`, type: 'success' });
    fetchData();
  };

  const filtered = useMemo(() => conflicts.filter((c) => {
    if (filterSeverity !== 'all' && c.severity !== filterSeverity) return false;
    if (filterStatus !== 'all' && c.status !== filterStatus) return false;
    return true;
  }), [conflicts, filterSeverity, filterStatus]);

  const counts = useMemo(() => ({
    total: conflicts.length, open: conflicts.filter((c) => c.status === 'open').length,
    critical: conflicts.filter((c) => c.severity === 'critical' && c.status === 'open').length,
    high: conflicts.filter((c) => c.severity === 'high' && c.status === 'open').length,
    medium: conflicts.filter((c) => c.severity === 'medium' && c.status === 'open').length,
    low: conflicts.filter((c) => c.severity === 'low' && c.status === 'open').length,
  }), [conflicts]);

  if (weddingLoading || loading) return <AppShell><div className="h-[calc(100vh-80px)] flex items-center justify-center"><i className="ri-loader-4-line animate-spin" /></div></AppShell>;

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <button onClick={() => navigate(`/app/seating/plans/${planId}`)} className="text-xs text-foreground-400 hover:text-foreground-600 mb-1 cursor-pointer whitespace-nowrap"><i className="ri-arrow-left-line mr-1" />Back to workspace</button>
            <h1 className="font-heading text-xl text-foreground-900">Conflict Analysis</h1>
            <p className="text-xs text-foreground-500 mt-0.5">{plan?.name} — Review and resolve seating issues</p>
          </div>
          <button onClick={runAnalysis} disabled={regenerating} className="px-4 py-2 bg-accent-500 text-white rounded-lg text-xs font-label font-semibold hover:bg-accent-600 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50">
            <i className={`${regenerating ? 'ri-loader-4-line animate-spin' : 'ri-refresh-line'} mr-1`} />{regenerating ? 'Analysing...' : 'Run analysis'}
          </button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-5 gap-3 mb-6">
          {[
            { label: 'Total', value: counts.total, color: 'text-foreground-900' },
            { label: 'Critical', value: counts.critical, color: 'text-red-600' },
            { label: 'High', value: counts.high, color: 'text-amber-600' },
            { label: 'Medium', value: counts.medium, color: 'text-foreground-600' },
            { label: 'Low', value: counts.low, color: 'text-sky-600' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-secondary-100 p-3 text-center">
              <p className={`text-lg font-heading font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-foreground-500">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-[11px] text-foreground-500">Filter:</span>
          <select value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value as ConflictSeverity | 'all')} className="px-2 py-1 rounded border border-secondary-200 text-[11px]">
            <option value="all">All severities</option>
            {(['critical', 'high', 'medium', 'low', 'info'] as ConflictSeverity[]).map((s) => <option key={s} value={s}>{CONFLICT_SEVERITY_LABELS[s]}</option>)}
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as ConflictStatus | 'all')} className="px-2 py-1 rounded border border-secondary-200 text-[11px]">
            <option value="all">All statuses</option>
            <option value="open">Open</option><option value="resolved">Resolved</option><option value="overridden">Overridden</option><option value="dismissed">Dismissed</option>
          </select>
        </div>

        {conflicts.length === 0 ? (
          <div className="text-center py-16 bg-background-50 rounded-xl border border-secondary-100">
            <i className="ri-check-double-line text-3xl text-emerald-300 mb-3 block" />
            <p className="text-sm text-foreground-500 mb-1">No conflicts detected</p>
            <p className="text-xs text-foreground-400 mb-4">Run an analysis to check for seating issues</p>
            <button onClick={runAnalysis} disabled={regenerating} className="px-4 py-2 bg-primary-500 text-white rounded-lg text-xs font-label cursor-pointer whitespace-nowrap">{regenerating ? 'Analysing...' : 'Run analysis'}</button>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((c) => (
              <div key={c.id} className={`flex items-start gap-3 p-3 rounded-lg border ${CONFLICT_SEVERITY_COLOURS[c.severity]}`}>
                <i className={`${c.severity === 'critical' ? 'ri-alert-fill text-red-600' : c.severity === 'high' ? 'ri-error-warning-fill text-amber-600' : 'ri-error-warning-line text-foreground-500'} text-sm mt-0.5 flex-shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-label px-1 py-0.5 rounded bg-white/60 whitespace-nowrap">{CONFLICT_TYPE_LABELS[c.conflict_type]}</span>
                    <span className="text-[10px] px-1 py-0.5 rounded bg-white/60 whitespace-nowrap">{CONFLICT_SEVERITY_LABELS[c.severity]}</span>
                    {c.status !== 'open' && <span className="text-[10px] bg-foreground-100 text-foreground-500 px-1 py-0.5 rounded-full whitespace-nowrap">{c.status}</span>}
                  </div>
                  <p className="text-xs text-foreground-800">{c.summary}</p>
                  {c.override_reason && <p className="text-[10px] text-foreground-400 mt-1">Override: {c.override_reason}</p>}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {c.status === 'open' && (
                    <>
                      <button onClick={() => handleResolve(c.id, 'resolved')} className="w-6 h-6 flex items-center justify-center rounded text-emerald-600 hover:bg-emerald-50 cursor-pointer" title="Resolve"><i className="ri-check-line text-xs" /></button>
                      <button onClick={() => handleResolve(c.id, 'overridden', 'Manually overridden')} className="w-6 h-6 flex items-center justify-center rounded text-amber-600 hover:bg-amber-50 cursor-pointer" title="Override"><i className="ri-shield-cross-line text-xs" /></button>
                      <button onClick={() => handleResolve(c.id, 'dismissed')} className="w-6 h-6 flex items-center justify-center rounded text-foreground-400 hover:bg-background-100 cursor-pointer" title="Dismiss"><i className="ri-close-line text-xs" /></button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {toast && (
          <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-xs font-label ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
            <i className={`${toast.type === 'success' ? 'ri-check-line' : 'ri-error-warning-line'} text-sm`} />{toast.msg}
            <button onClick={() => setToast(null)} className="ml-2 text-white/70 hover:text-white cursor-pointer"><i className="ri-close-line" /></button>
          </div>
        )}
      </div>
    </AppShell>
  );
}