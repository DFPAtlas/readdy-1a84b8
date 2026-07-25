import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppShell from '@/components/feature/AppShell';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { supabase } from '@/lib/supabase';
import type { SeatingPlan, AssistantProposal, ProposalAssignment, MoveStatus } from '@/types/seating';
import { PROPOSAL_STATUS_LABELS, PROPOSAL_STATUS_COLOURS } from '@/types/seating';

type ViewMode = 'changes' | 'current' | 'proposed';

export default function ProposalReviewPage() {
  const { planId, proposalId } = useParams<{ planId: string; proposalId: string }>();
  const navigate = useNavigate();
  const { weddingId, loading: weddingLoading } = useActiveWedding();

  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<SeatingPlan | null>(null);
  const [proposal, setProposal] = useState<AssistantProposal | null>(null);
  const [assignments, setAssignments] = useState<ProposalAssignment[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('changes');
  const [applying, setApplying] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: 'error' | 'success' } | null>(null);

  const fetchData = useCallback(async () => {
    if (!weddingId || !planId || !proposalId) return;
    setLoading(true);
    try {
      const { data: planData } = await supabase.from('seating_plans').select('*').eq('id', planId).eq('wedding_id', weddingId).maybeSingle();
      if (!planData) { navigate('/app/seating'); return; }
      setPlan(planData as SeatingPlan);

      const { data: propData } = await supabase.from('seating_assistant_proposals').select('*').eq('id', proposalId).single();
      if (!propData) { navigate('/app/seating'); return; }
      setProposal(propData as AssistantProposal);

      const { data: assignsData } = await supabase.from('seating_proposal_assignments').select('*, guest:guest_id(id, full_name, guest_type), current_table:current_table_id(id, name), proposed_table:proposed_table_id(id, name)').eq('proposal_id', proposalId).order('created_at');
      setAssignments((assignsData || []) as ProposalAssignment[]);
    } catch { /* */ } finally { setLoading(false); }
  }, [weddingId, planId, proposalId, navigate]);

  useEffect(() => { if (weddingId && planId && proposalId) fetchData(); }, [weddingId, planId, proposalId, fetchData]);

  const handleMoveStatus = async (assignmentId: string, status: MoveStatus) => {
    await supabase.from('seating_proposal_assignments').update({ move_status: status, updated_at: new Date().toISOString() }).eq('id', assignmentId);
    setAssignments((prev) => prev.map((a) => a.id === assignmentId ? { ...a, move_status: status } : a));
    setToast({ msg: `Move ${status}`, type: 'success' });
  };

  const handleAcceptAll = async () => {
    const pending = assignments.filter((a) => a.move_status === 'pending');
    if (pending.length === 0) return;
    const ids = pending.map((a) => a.id);
    await supabase.from('seating_proposal_assignments').update({ move_status: 'accepted', updated_at: new Date().toISOString() }).in('id', ids);
    setAssignments((prev) => prev.map((a) => ids.includes(a.id) ? { ...a, move_status: 'accepted' as const } : a));
    setToast({ msg: `Accepted ${ids.length} moves`, type: 'success' });
  };

  const handleApply = async () => {
    if (!proposalId || !planId || !plan) return;
    setApplying(true); setError('');

    // Verify revision match
    const { data: currentPlan } = await supabase.from('seating_plans').select('revision').eq('id', planId).single();
    if ((currentPlan as Record<string, unknown>)?.revision !== proposal?.source_revision) {
      setError('The plan has changed since this proposal was generated. Please regenerate.'); setApplying(false); return;
    }

    // Create version snapshot
    await supabase.from('seating_plan_versions').insert({ wedding_id: weddingId, seating_plan_id: planId, version_number: (plan.revision || 1) + 1, label: 'Before assistant proposal', reason: 'Pre-proposal snapshot', snapshot_data: {}, source_revision: plan.revision, created_by: null });

    // Apply accepted assignments
    const accepted = assignments.filter((a) => a.move_status === 'accepted');
    if (accepted.length > 0) {
      // Delete current assignments for these guests
      const guestIds = accepted.map((a) => a.guest_id);
      await supabase.from('seating_assignments').delete().eq('plan_id', planId).in('guest_id', guestIds);

      // Insert new assignments
      const inserts = accepted.map((a) => ({
        plan_id: planId, wedding_id: weddingId, table_id: a.proposed_table_id,
        guest_id: a.guest_id, seating_seat_id: a.proposed_seat_id,
        assignment_status: 'seated', created_by: null,
      }));
      if (inserts.length > 0) await supabase.from('seating_assignments').insert(inserts);

      // Update seat statuses
      const seatIds = accepted.filter((a) => a.proposed_seat_id).map((a) => a.proposed_seat_id as string);
      if (seatIds.length > 0) await supabase.from('seating_seats').update({ seat_status: 'assigned' }).in('id', seatIds);
    }

    // Mark proposal as applied
    await supabase.from('seating_assistant_proposals').update({ status: 'applied', applied_at: new Date().toISOString() }).eq('id', proposalId);
    await supabase.from('seating_plans').update({ revision: (plan.revision || 1) + 1, updated_at: new Date().toISOString() }).eq('id', planId);

    await supabase.from('seating_activity_log').insert({ wedding_id: weddingId, seating_plan_id: planId, action: 'proposal_applied', summary: `Applied proposal with ${accepted.length} moves` });

    setShowConfirm(false);
    setToast({ msg: `Proposal applied — ${accepted.length} guest(s) seated`, type: 'success' });
    fetchData();
    setApplying(false);
  };

  const handleReject = async () => {
    if (!proposalId) return;
    await supabase.from('seating_assistant_proposals').update({ status: 'rejected', rejected_at: new Date().toISOString() }).eq('id', proposalId);
    await supabase.from('seating_activity_log').insert({ wedding_id: weddingId, seating_plan_id: planId, action: 'proposal_rejected', summary: 'Proposal rejected' });
    setToast({ msg: 'Proposal rejected', type: 'success' });
    navigate(`/app/seating/plans/${planId}/assistant`);
  };

  const stats = useMemo(() => {
    const newSeated = assignments.filter((a) => !a.current_table_id).length;
    const moved = assignments.filter((a) => a.current_table_id).length;
    const accepted = assignments.filter((a) => a.move_status === 'accepted').length;
    return { newSeated, moved, accepted, total: assignments.length };
  }, [assignments]);

  const filtered = useMemo(() => {
    if (viewMode === 'current') return assignments.filter((a) => a.current_table_id);
    if (viewMode === 'proposed') return assignments.filter((a) => a.proposed_table_id);
    return assignments;
  }, [assignments, viewMode]);

  if (weddingLoading || loading) return <AppShell><div className="h-[calc(100vh-80px)] flex items-center justify-center"><i className="ri-loader-4-line animate-spin" /></div></AppShell>;
  if (!proposal) return <AppShell><div className="h-[calc(100vh-80px)] flex items-center justify-center"><p className="text-sm text-foreground-500">Proposal not found</p></div></AppShell>;

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <button onClick={() => navigate(`/app/seating/plans/${planId}/assistant`)} className="text-xs text-foreground-400 hover:text-foreground-600 mb-1 cursor-pointer whitespace-nowrap"><i className="ri-arrow-left-line mr-1" />Back to assistant</button>
            <h1 className="font-heading text-xl text-foreground-900">Proposal Review</h1>
            <p className="text-xs text-foreground-500 mt-0.5">{plan?.name} — Score: <strong>{proposal.overall_score ?? '—'}/100</strong></p>
          </div>
          <div className="flex gap-2">
            {proposal.status === 'ready' && (
              <>
                <button onClick={handleReject} className="px-3 py-2 border border-red-200 text-red-600 rounded-lg text-xs font-label hover:bg-red-50 cursor-pointer whitespace-nowrap"><i className="ri-close-line mr-1" />Reject</button>
                <button onClick={() => setShowConfirm(true)} disabled={stats.accepted === 0} className="px-4 py-2 bg-primary-500 text-white rounded-lg text-xs font-label font-semibold hover:bg-primary-600 cursor-pointer whitespace-nowrap disabled:opacity-50"><i className="ri-check-line mr-1" />Apply proposal</button>
              </>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total moves', value: stats.total, icon: 'ri-swap-line', color: 'text-foreground-600' },
            { label: 'Newly seated', value: stats.newSeated, icon: 'ri-user-add-line', color: 'text-emerald-600' },
            { label: 'Moved', value: stats.moved, icon: 'ri-arrow-left-right-line', color: 'text-amber-600' },
            { label: 'Accepted', value: stats.accepted, icon: 'ri-check-line', color: 'text-primary-600' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-secondary-100 p-3 text-center">
              <i className={`${s.icon} ${s.color} text-sm mb-1 block`} />
              <p className="text-base font-heading font-bold text-foreground-900">{s.value}</p>
              <p className="text-[10px] text-foreground-500">{s.label}</p>
            </div>
          ))}
        </div>

        {/* View mode */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[11px] text-foreground-500">View:</span>
          {(['changes', 'current', 'proposed'] as ViewMode[]).map((m) => (
            <button key={m} onClick={() => setViewMode(m)} className={`px-3 py-1 rounded-full text-[11px] font-label cursor-pointer whitespace-nowrap ${viewMode === m ? 'bg-primary-500 text-white' : 'bg-background-100 text-foreground-500 hover:bg-background-200'}`}>{m.charAt(0).toUpperCase() + m.slice(1)}</button>
          ))}
          <button onClick={handleAcceptAll} disabled={!assignments.some((a) => a.move_status === 'pending')} className="ml-auto px-3 py-1 text-[11px] text-primary-600 font-label hover:bg-primary-50 rounded-lg cursor-pointer whitespace-nowrap disabled:opacity-30">Accept all</button>
        </div>

        {error && <p className="text-xs text-red-600 bg-red-50 p-3 rounded-lg mb-4">{error}</p>}

        {/* Assignments */}
        {filtered.length === 0 ? (
          <div className="text-center py-12 bg-background-50 rounded-xl border border-secondary-100">
            <p className="text-xs text-foreground-400">No assignments in this view</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {filtered.map((a) => (
              <div key={a.id} className={`flex items-center justify-between p-3 rounded-lg border ${a.move_status === 'accepted' ? 'bg-emerald-50 border-emerald-200' : a.move_status === 'rejected' ? 'bg-red-50 border-red-200' : a.move_status === 'locked' ? 'bg-amber-50 border-amber-200' : 'bg-white border-secondary-100'}`}>
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-full text-[9px] font-bold ${
                    a.move_status === 'accepted' ? 'bg-emerald-500 text-white' : a.move_status === 'rejected' ? 'bg-red-500 text-white' : a.move_status === 'locked' ? 'bg-amber-500 text-white' : 'bg-background-100 text-foreground-400'}`}>
                    {a.move_status === 'accepted' ? <i className="ri-check-line text-[10px]" /> : a.move_status === 'rejected' ? <i className="ri-close-line text-[10px]" /> : a.move_status === 'locked' ? <i className="ri-lock-line text-[10px]" /> : a.guest?.full_name?.charAt(0) || '?'}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-label text-foreground-800 truncate">{a.guest?.full_name || 'Unknown'}</p>
                    <div className="flex items-center gap-1 text-[10px] text-foreground-400">
                      {a.current_table && <span className="truncate">From: {a.current_table.name}</span>}
                      {a.current_table && a.proposed_table && <span>→</span>}
                      {a.proposed_table && <span className="text-primary-600 font-label truncate">To: {a.proposed_table.name}</span>}
                      {!a.current_table && a.proposed_table && <span className="text-emerald-600 font-label">New: {a.proposed_table.name}</span>}
                    </div>
                  </div>
                </div>
                {proposal?.status === 'ready' && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => handleMoveStatus(a.id, 'accepted')} className={`w-6 h-6 flex items-center justify-center rounded cursor-pointer ${a.move_status === 'accepted' ? 'bg-emerald-500 text-white' : 'text-emerald-600 hover:bg-emerald-50'}`} title="Accept"><i className={`${a.move_status === 'accepted' ? 'ri-check-fill' : 'ri-check-line'} text-xs`} /></button>
                    <button onClick={() => handleMoveStatus(a.id, 'rejected')} className={`w-6 h-6 flex items-center justify-center rounded cursor-pointer ${a.move_status === 'rejected' ? 'bg-red-500 text-white' : 'text-red-400 hover:bg-red-50'}`} title="Reject"><i className="ri-close-line text-xs" /></button>
                    <button onClick={() => handleMoveStatus(a.id, 'locked')} className={`w-6 h-6 flex items-center justify-center rounded cursor-pointer ${a.move_status === 'locked' ? 'bg-amber-500 text-white' : 'text-amber-400 hover:bg-amber-50'}`} title="Lock"><i className="ri-lock-line text-xs" /></button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Apply confirm */}
        {showConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setShowConfirm(false)}>
            <div className="bg-white rounded-xl p-6 w-full max-w-sm mx-4 shadow-lg" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start gap-3 mb-5">
                <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full bg-primary-50 text-primary-600"><i className="ri-check-line text-lg" /></div>
                <div><h3 className="font-heading text-base text-foreground-900 mb-1">Apply proposal?</h3><p className="text-xs text-foreground-500">This will seat {stats.accepted} guest{stats.accepted !== 1 ? 's' : ''} according to the proposal. A version snapshot will be saved first.</p></div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowConfirm(false)} className="flex-1 px-4 py-2 rounded-lg border border-secondary-200 text-xs font-label text-foreground-600 hover:bg-background-50 cursor-pointer whitespace-nowrap">Cancel</button>
                <button onClick={handleApply} disabled={applying} className="flex-1 px-4 py-2 rounded-lg bg-primary-500 text-white text-xs font-label font-semibold hover:bg-primary-600 cursor-pointer whitespace-nowrap disabled:opacity-50">{applying ? 'Applying...' : 'Apply'}</button>
              </div>
            </div>
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