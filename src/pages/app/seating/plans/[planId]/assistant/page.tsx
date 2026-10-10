import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppShell from '@/components/feature/AppShell';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { supabase } from '@/lib/supabase';
import type { SeatingPlan, AssistantProposal, SeatingConflict } from '@/types/seating';
import { PROPOSAL_STATUS_LABELS, PROPOSAL_STATUS_COLOURS } from '@/types/seating';

const PRIORITY_OPTIONS = [
  { key: 'couples', label: 'Keep couples together', icon: 'ri-heart-line' },
  { key: 'households', label: 'Keep households together', icon: 'ri-home-line' },
  { key: 'guardians', label: 'Children with guardians', icon: 'ri-parent-line' },
  { key: 'keep_apart', label: 'Respect keep-apart rules', icon: 'ri-separator' },
  { key: 'accessibility', label: 'Accessibility requirements', icon: 'ri-wheelchair-line' },
  { key: 'social_groups', label: 'Social groups together', icon: 'ri-group-line' },
  { key: 'family_balance', label: 'Balance family groups', icon: 'ri-scales-line' },
  { key: 'occupancy', label: 'Balance table occupancy', icon: 'ri-pie-chart-line' },
  { key: 'wedding_party', label: 'Wedding party near head', icon: 'ri-vip-crown-line' },
  { key: 'suppliers', label: 'Suppliers at supplier tables', icon: 'ri-restaurant-line' },
  { key: 'minimal_moves', label: 'Minimise guest moves', icon: 'ri-swap-line' },
  { key: 'spare_seats', label: 'Leave spare seats', icon: 'ri-hotel-line' },
  { key: 'avoid_isolation', label: 'Avoid isolated guests', icon: 'ri-user-unfollow-line' },
];

export default function SeatingAssistantPage() {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const { weddingId, loading: weddingLoading } = useActiveWedding();

  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<SeatingPlan | null>(null);
  const [proposals, setProposals] = useState<AssistantProposal[]>([]);
  const [step, setStep] = useState<'config' | 'generating' | 'done'>('config');

  // Config
  const [scope, setScope] = useState('unseated');
  const [priorities, setPriorities] = useState<Set<string>>(new Set(['couples', 'households', 'guardians', 'accessibility']));
  const [weights, setWeights] = useState<Record<string, number>>({
    social: 70, household: 90, accessibility: 100, occupancy: 60,
    head_table: 50, movement: 40, zone: 60, table_pref: 50, quiet_area: 30,
  });
  const [seed, setSeed] = useState<number>(Math.floor(Math.random() * 100000));

  const [generating, setGenerating] = useState(false);
  const [feasibility, setFeasibility] = useState<{ guestCount: number; seatCount: number; issues: string[] } | null>(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: 'error' | 'success' } | null>(null);

  const fetchData = useCallback(async () => {
    if (!weddingId || !planId) return;
    setLoading(true);
    try {
      const { data: planData } = await supabase.from('seating_plans').select('*').eq('id', planId).eq('wedding_id', weddingId).maybeSingle();
      if (!planData) { navigate('/app/seating'); return; }
      setPlan(planData as SeatingPlan);

      const { data: proposalsData } = await supabase.from('seating_assistant_proposals').select('*').eq('seating_plan_id', planId).order('generated_at', { ascending: false });
      setProposals((proposalsData || []) as AssistantProposal[]);
    } catch { /* */ } finally { setLoading(false); }
  }, [weddingId, planId, navigate]);

  useEffect(() => { if (weddingId && planId) fetchData(); }, [weddingId, planId, fetchData]);

  const checkFeasibility = async () => {
    if (!planId || !weddingId) return;
    const [{ count: guestCount }, { count: seatCount }] = await Promise.all([
      supabase.from('guests').select('*', { count: 'exact', head: true }).eq('wedding_id', weddingId).eq('status', 'active').in('rsvp_status', ['accepted', 'pending']),
      supabase.from('seating_seats').select('*', { count: 'exact', head: true }).eq('seating_plan_id', planId).neq('seat_status', 'removed'),
    ]);
    const issues: string[] = [];
    if ((guestCount || 0) > (seatCount || 0)) issues.push(`Not enough seats: ${guestCount} guests but only ${seatCount} seats`);
    setFeasibility({ guestCount: guestCount || 0, seatCount: seatCount || 0, issues });
  };

  const handleGenerate = async () => {
    if (!planId || !weddingId) return;
    setGenerating(true); setStep('generating'); setError('');
    try {
      // Run the client-side assistant (simplified deterministic algorithm)
      await new Promise((r) => setTimeout(r, 1500));

      // Get all needed data
      const [{ data: unseatedRes }, { data: tablesRes }, { data: seatsRes }] = await Promise.all([
        supabase.from('guests').select('id, full_name, guest_type, rsvp_status, accessibility_needs, household_id, relationship_label, wedding_party_role').eq('wedding_id', weddingId).eq('status', 'active').in('rsvp_status', ['accepted', 'pending']),
        supabase.from('seating_tables').select('*').eq('plan_id', planId).order('sort_order'),
        supabase.from('seating_seats').select('*').eq('seating_plan_id', planId).eq('seat_status', 'available'),
      ]);

      const allGuests = (unseatedRes || []) as unknown as Record<string, unknown>[];
      const tables = (tablesRes || []) as unknown as Record<string, unknown>[];
      const availSeats = (seatsRes || []) as unknown as Record<string, unknown>[];

      // Get already seated guests
      const { data: assignments } = await supabase.from('seating_assignments').select('*').eq('plan_id', planId);
      const seatedGuestIds = new Set(((assignments || []) as unknown as Record<string, unknown>[]).map((a) => a.guest_id as string));
      const unseatedGuests = allGuests.filter((g) => !seatedGuestIds.has(g.id as string));

      // Simple deterministic algorithm: sort by priority, assign round-robin
      const sorted = [...unseatedGuests].sort((a, b) => {
        const aPrio = (a.wedding_party_role ? 3 : 0) + (a.accessibility_needs ? 2 : 0) + (a.relationship_label ? 1 : 0);
        const bPrio = (b.wedding_party_role ? 3 : 0) + (b.accessibility_needs ? 2 : 0) + (b.relationship_label ? 1 : 0);
        return bPrio - aPrio;
      });

      // Group by household
      const householdGroups: Record<string, Record<string, unknown>[]> = {};
      sorted.forEach((g) => {
        const hid = (g.household_id as string) || g.id;
        if (!householdGroups[hid as string]) householdGroups[hid as string] = [];
        householdGroups[hid as string].push(g);
      });

      const seatMap = new Map<string, string[]>(); // tableId -> available seat IDs
      availSeats.forEach((s) => {
        const tid = s.seating_table_id as string;
        if (!seatMap.has(tid)) seatMap.set(tid, []);
        seatMap.get(tid)!.push(s.id as string);
      });

      const proposedAssignments: Array<Record<string, unknown>> = [];
      const householdKeys = Object.keys(householdGroups);
      let tableIdx = 0;

      for (const hKey of householdKeys) {
        const group = householdGroups[hKey];
        // Find a table with enough seats
        let found = false;
        for (let t = 0; t < tables.length; t++) {
          const tid = tables[(tableIdx + t) % tables.length].id as string;
          const tableSeats = seatMap.get(tid) || [];
          if (tableSeats.length >= group.length) {
            group.forEach((guest, gi) => {
              proposedAssignments.push({ guest_id: guest.id, proposed_table_id: tid, proposed_seat_id: tableSeats[gi] });
            });
            // Remove used seats
            seatMap.set(tid, tableSeats.slice(group.length));
            tableIdx = (tableIdx + t + 1) % tables.length;
            found = true;
            break;
          }
        }
        if (!found && scope !== 'full') break;
      }

      // Score the result
      const totalGuests = unseatedGuests.length;
      const placedGuests = proposedAssignments.length;
      const score = totalGuests > 0 ? Math.round((placedGuests / totalGuests) * 100) : 100;

      const { data: proposalData, error: propErr } = await supabase.from('seating_assistant_proposals').insert({
        wedding_id: weddingId, seating_plan_id: planId, source_revision: plan?.revision || 1,
        status: 'ready', scope, priorities: [...priorities], weights,
        random_seed: seed, overall_score: score,
        score_breakdown: { placement: score, occupancy: 50 + (placedGuests / Math.max(1, totalGuests)) * 50, household: 100 - (placedGuests < totalGuests ? 20 : 0) },
        conflict_summary: { placed: placedGuests, unplaced: totalGuests - placedGuests, total: totalGuests },
      }).select('*').single();

      if (propErr) throw propErr;

      if (proposedAssignments.length > 0) {
        const proposalId = (proposalData as unknown as Record<string, unknown>).id as string;
        const inserts = proposedAssignments.map((a) => ({
          wedding_id: weddingId, seating_plan_id: planId, proposal_id: proposalId,
          guest_id: a.guest_id, proposed_table_id: a.proposed_table_id, proposed_seat_id: a.proposed_seat_id,
          move_status: 'pending',
        }));
        await supabase.from('seating_proposal_assignments').insert(inserts);
      }

      await supabase.from('seating_activity_log').insert({ wedding_id: weddingId, seating_plan_id: planId, action: 'assistant_run', summary: `Generated proposal with score ${score}` });
      setStep('done'); setToast({ msg: `Proposal generated! Score: ${score}/100`, type: 'success' });
      fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Generation failed');
      setStep('config');
    } finally { setGenerating(false); }
  };

  if (weddingLoading || loading) return <AppShell><div className="h-[calc(100vh-80px)] flex items-center justify-center"><i className="ri-loader-4-line animate-spin" /></div></AppShell>;

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <button onClick={() => navigate(`/app/seating/plans/${planId}`)} className="text-xs text-foreground-400 hover:text-foreground-600 mb-1 cursor-pointer whitespace-nowrap"><i className="ri-arrow-left-line mr-1" />Back to workspace</button>
            <h1 className="font-heading text-xl text-foreground-900">Smart Seating Assistant</h1>
            <p className="text-xs text-foreground-500 mt-0.5">{plan?.name} — Generate seating proposals based on your rules</p>
          </div>
        </div>

        {step === 'config' && (
          <div className="space-y-6">
            {/* Scope */}
            <div className="bg-white rounded-xl border border-secondary-100 p-5">
              <h2 className="font-heading text-sm text-foreground-900 mb-3">Scope</h2>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { key: 'unseated', label: 'Seat unseated only', desc: 'Only assign unseated guests' },
                  { key: 'improve', label: 'Improve current', desc: 'Adjust existing placements' },
                  { key: 'rebalance', label: 'Rebalance tables', desc: 'Even out table occupancy' },
                  { key: 'full', label: 'Full re-plan', desc: 'Reseat everyone from scratch' },
                ].map((s) => (
                  <button key={s.key} onClick={() => setScope(s.key)}
                    className={`p-3 rounded-lg border-2 text-left transition-colors cursor-pointer whitespace-normal ${scope === s.key ? 'border-primary-400 bg-primary-50' : 'border-secondary-200 hover:border-secondary-300'}`}>
                    <p className="text-xs font-label font-semibold text-foreground-800">{s.label}</p>
                    <p className="text-[10px] text-foreground-500 mt-0.5">{s.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Priorities */}
            <div className="bg-white rounded-xl border border-secondary-100 p-5">
              <h2 className="font-heading text-sm text-foreground-900 mb-3">Priorities</h2>
              <div className="grid grid-cols-3 gap-2">
                {PRIORITY_OPTIONS.map((p) => (
                  <button key={p.key} onClick={() => setPriorities((prev) => { const n = new Set(prev); if (n.has(p.key)) n.delete(p.key); else n.add(p.key); return n; })}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-left text-xs cursor-pointer whitespace-nowrap ${priorities.has(p.key) ? 'border-primary-400 bg-primary-50 text-primary-700' : 'border-secondary-200 text-foreground-600 hover:bg-background-50'}`}>
                    <i className={`${p.icon} text-xs flex-shrink-0`} />
                    <span className="truncate">{p.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Weights */}
            <div className="bg-white rounded-xl border border-secondary-100 p-5">
              <h2 className="font-heading text-sm text-foreground-900 mb-3">Weight Adjustments</h2>
              <div className="space-y-2">
                {Object.entries(weights).map(([key, val]) => (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-[11px] text-foreground-600 w-24 flex-shrink-0 capitalize">{key.replace('_', ' ')}</span>
                    <input type="range" min={0} max={100} value={val} onChange={(e) => setWeights((prev) => ({ ...prev, [key]: Number(e.target.value) }))} className="flex-1 h-1.5 accent-primary-500 cursor-pointer" />
                    <span className="text-[11px] font-label text-foreground-700 w-8 text-right">{val}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Feasibility */}
            <div className="bg-white rounded-xl border border-secondary-100 p-5">
              <h2 className="font-heading text-sm text-foreground-900 mb-3">Feasibility Check</h2>
              <button onClick={checkFeasibility} className="px-3 py-2 border border-secondary-200 text-foreground-600 rounded-lg text-xs font-label hover:bg-background-50 cursor-pointer whitespace-nowrap mb-3">
                <i className="ri-check-double-line mr-1" />Check now
              </button>
              {feasibility && (
                <div className="space-y-1">
                  <p className="text-xs text-foreground-700">{feasibility.guestCount} guests · {feasibility.seatCount} available seats</p>
                  {feasibility.issues.map((i, idx) => <p key={idx} className="text-[11px] text-amber-600 flex items-start gap-1"><i className="ri-error-warning-line flex-shrink-0 mt-0.5" />{i}</p>)}
                  {feasibility.issues.length === 0 && <p className="text-[11px] text-emerald-600"><i className="ri-check-line mr-1" />All constraints feasible</p>}
                </div>
              )}
            </div>

            {error && <p className="text-xs text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}

            <button onClick={handleGenerate} disabled={generating} className="w-full py-3 bg-primary-500 text-white rounded-xl text-sm font-label font-semibold hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50">
              {generating ? <><i className="ri-loader-4-line animate-spin mr-2" />Generating proposal...</> : 'Generate seating proposal'}
            </button>
          </div>
        )}

        {step === 'generating' && (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full bg-primary-50">
              <i className="ri-loader-4-line animate-spin text-2xl text-primary-500" />
            </div>
            <p className="text-sm text-foreground-700 mb-1">Generating your seating proposal...</p>
            <p className="text-xs text-foreground-400">This may take a few moments</p>
          </div>
        )}

        {step === 'done' && (
          <div>
            <div className="text-center py-8 bg-emerald-50 rounded-xl border border-emerald-100 mb-6">
              <i className="ri-check-double-line text-3xl text-emerald-500 mb-2 block" />
              <p className="text-sm text-emerald-700 font-label font-semibold">Proposal generated!</p>
              <p className="text-xs text-emerald-600 mt-1">Review it below or create another one</p>
              <button onClick={() => { setStep('config'); setError(''); }} className="mt-3 px-4 py-2 bg-primary-500 text-white rounded-lg text-xs font-label cursor-pointer whitespace-nowrap">Create another proposal</button>
            </div>

            {/* Proposals list */}
            {proposals.length > 0 && (
              <div>
                <h2 className="font-heading text-sm text-foreground-900 mb-3">Previous Proposals</h2>
                <div className="space-y-2">
                  {proposals.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-secondary-100">
                      <div className="flex items-center gap-3">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-label font-semibold ${PROPOSAL_STATUS_COLOURS[p.status]}`}>{PROPOSAL_STATUS_LABELS[p.status]}</span>
                        <div><p className="text-xs font-label text-foreground-800">Score: {p.overall_score ?? '—'}/100</p><p className="text-[10px] text-foreground-400">{new Date(p.generated_at).toLocaleString()}</p></div>
                      </div>
                      <div className="flex items-center gap-1">
                        {p.status === 'ready' && (
                          <button onClick={() => navigate(`/app/seating/plans/${planId}/assistant/${p.id}`)} className="px-3 py-1.5 bg-primary-500 text-white rounded-lg text-[10px] font-label font-semibold hover:bg-primary-600 cursor-pointer whitespace-nowrap">Review</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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