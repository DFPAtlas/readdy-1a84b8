import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppShell from '@/components/feature/AppShell';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { supabase } from '@/lib/supabase';
import type { SeatingPlan, FinalisationCheck, SeatingPublication } from '@/types/seating';
import { PLAN_STATUS_LABELS, EVENT_TYPE_LABELS, AUDIT_STATUS_COLOURS, AUDIT_STATUS_LABELS } from '@/types/seating';

export default function SeatingPublishPage() {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const { weddingId, loading: weddingLoading } = useActiveWedding();

  const [plan, setPlan] = useState<SeatingPlan | null>(null);
  const [publication, setPublication] = useState<SeatingPublication | null>(null);
  const [checks, setChecks] = useState<FinalisationCheck[]>([]);
  const [audience, setAudience] = useState('secure_portal');
  const [allowPublicLookup, setAllowPublicLookup] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!weddingId || !planId) return;
    (async () => {
      const { data: p } = await supabase.from('seating_plans').select('*').eq('id', planId).eq('wedding_id', weddingId).maybeSingle();
      if (p) setPlan(p as SeatingPlan);

      const { data: pub } = await supabase.from('seating_publications').select('*').eq('seating_plan_id', planId).eq('wedding_id', weddingId).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (pub) setPublication(pub as SeatingPublication);

      const { data: assigns } = await supabase.from('seating_assignments').select('guest_id, table_id').eq('plan_id', planId);
      const { data: guests } = await supabase.from('guests').select('id').eq('wedding_id', weddingId).eq('status', 'active').in('rsvp_status', ['accepted', 'pending']);
      const { data: tables } = await supabase.from('seating_tables').select('id, capacity').eq('plan_id', planId);
      const { data: conflicts } = await supabase.from('seating_conflicts').select('id').eq('seating_plan_id', planId).eq('severity', 'critical').in('status', ['open', 'reviewed']);

      const seatedIds = new Set((assigns || []).map((a: { guest_id: string }) => a.guest_id));
      const allGuestIds = (guests || []).map((g: { id: string }) => g.id);
      const unseated = allGuestIds.filter((id) => !seatedIds.has(id));
      const tablesData = tables || [];

      const checksList: FinalisationCheck[] = [
        { id: 'all_seated', label: 'All attending guests seated', status: unseated.length === 0 ? 'passed' : 'failed', detail: unseated.length === 0 ? 'All guests are seated.' : `${unseated.length} guest${unseated.length > 1 ? 's' : ''} unseated.` },
        { id: 'no_duplicates', label: 'No duplicate assignments', status: 'not_tested', detail: 'Run audit for full duplicate check.' },
        { id: 'no_over_capacity', label: 'No over-capacity tables', status: tablesData.every((t) => t.capacity >= (assigns || []).filter((a: { table_id: string }) => a.table_id === t.id).length) ? 'passed' : 'failed', detail: tablesData.every((t) => t.capacity >= (assigns || []).filter((a: { table_id: string }) => a.table_id === t.id).length) ? 'All tables within capacity.' : 'Some tables exceed capacity.' },
        { id: 'no_critical_conflicts', label: 'No critical conflicts', status: (conflicts || []).length === 0 ? 'passed' : 'failed', detail: (conflicts || []).length === 0 ? 'No critical conflicts.' : `${(conflicts || []).length} critical conflict(s) unresolved.` },
        { id: 'has_version', label: 'Version snapshot exists', status: 'not_tested', detail: 'A version will be created on publish.' },
        { id: 'public_names_safe', label: 'Table names are guest-safe', status: 'not_tested', detail: 'Review table names for private notes.' },
        { id: 'lookup_configured', label: 'Guest lookup configured', status: 'not_tested', detail: 'Configure on this page.' },
      ];
      setChecks(checksList);
    })();
  }, [weddingId, planId]);

  const hasBlockers = checks.some((c) => c.status === 'failed');

  const handlePublish = async () => {
    if (!planId || !weddingId || !plan) return;
    setPublishing(true);
    try {
      const { data: verData } = await supabase.from('seating_plan_versions').insert({
        wedding_id: weddingId, seating_plan_id: planId,
        version_number: (plan.revision || 1) + 1, label: `Published version ${(plan.revision || 1) + 1}`,
        reason: 'plan_published', source_revision: plan.revision,
        snapshot_data: { action: 'publish', timestamp: new Date().toISOString() },
      }).select('version_number').single();

      await supabase.from('seating_plans').update({ status: 'published', is_published: true, published_at: new Date().toISOString(), revision: (plan.revision || 1) + 1 }).eq('id', planId);

      await supabase.from('seating_publications').insert({
        wedding_id: weddingId, seating_plan_id: planId,
        seating_plan_version_id: verData ? (verData as { version_number: number }).version_number.toString() : null,
        status: 'published', publication_revision: 1,
        audience_settings: { audience, allow_public_lookup: allowPublicLookup },
        lookup_settings: { mode: allowPublicLookup ? 'name_code' : 'secure_portal', reveal_table: true, reveal_seat: true, reveal_companions: false },
      });

      await supabase.from('seating_activity_log').insert({ wedding_id: weddingId, seating_plan_id: planId, action: 'plan_published', summary: `Plan published as revision ${plan.revision + 1}` });

      setToast('Plan published successfully!');
      setPlan((prev) => prev ? { ...prev, status: 'published', is_published: true, revision: (prev.revision || 1) + 1 } : prev);
    } catch (err) {
      setToast(`Publish failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
    finally { setPublishing(false); }
  };

  const handleUnpublish = async () => {
    if (!planId || !weddingId || !publication) return;
    await supabase.from('seating_publications').update({ status: 'disabled', disabled_at: new Date().toISOString() }).eq('id', publication.id);
    await supabase.from('seating_plans').update({ status: 'working', is_published: false, is_working: true }).eq('id', planId);
    await supabase.from('seating_activity_log').insert({ wedding_id: weddingId, seating_plan_id: planId, action: 'plan_unpublished', summary: 'Publication disabled' });
    setPlan((prev) => prev ? { ...prev, status: 'working', is_published: false, is_working: true } : prev);
    setPublication(null);
    setToast('Publication disabled. Plan returned to working status.');
  };

  if (weddingLoading) {
    return <AppShell><div className="h-[calc(100vh-80px)] flex items-center justify-center"><i className="ri-loader-4-line animate-spin text-xl text-foreground-400" /></div></AppShell>;
  }
  if (!plan) {
    return <AppShell><div className="h-[calc(100vh-80px)] flex flex-col items-center justify-center"><p className="text-sm text-foreground-500 mb-4">Plan not found</p><button onClick={() => navigate('/app/seating')} className="btn-outline text-xs py-2 cursor-pointer whitespace-nowrap">Back</button></div></AppShell>;
  }

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <button onClick={() => navigate(`/app/seating/plans/${planId}`)} className="text-xs text-foreground-500 hover:text-foreground-700 cursor-pointer mb-2 whitespace-nowrap"><i className="ri-arrow-left-line mr-1" />Back to workspace</button>
        <h1 className="font-heading text-2xl text-foreground-900 mb-1">Publish seating plan</h1>
        <p className="text-sm text-foreground-500 mb-8">{plan.name} · {EVENT_TYPE_LABELS[plan.event_type]} · {PLAN_STATUS_LABELS[plan.status]}</p>

        {/* Finalisation checklist */}
        <div className="card-default mb-6">
          <h2 className="font-label text-sm font-semibold text-foreground-900 mb-4">Finalisation checklist</h2>
          <div className="space-y-2">
            {checks.map((check) => (
              <div key={check.id} className="flex items-start gap-3 py-2">
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-label font-semibold flex-shrink-0 mt-0.5 ${AUDIT_STATUS_COLOURS[check.status]}`}>{AUDIT_STATUS_LABELS[check.status]}</span>
                <div>
                  <p className="text-xs font-label font-medium text-foreground-900">{check.label}</p>
                  <p className="text-[11px] text-foreground-500">{check.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Audience & lookup */}
        <div className="card-default mb-6">
          <h2 className="font-label text-sm font-semibold text-foreground-900 mb-4">Audience & lookup settings</h2>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-label font-medium text-foreground-700 block mb-1">Guest access</label>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 text-xs text-foreground-700 cursor-pointer"><input type="radio" name="audience" checked={audience === 'secure_portal'} onChange={() => setAudience('secure_portal')} className="accent-primary-500" />Secure portal only</label>
                <label className="flex items-center gap-2 text-xs text-foreground-700 cursor-pointer"><input type="radio" name="audience" checked={audience === 'none'} onChange={() => setAudience('none')} className="accent-primary-500" />Disabled</label>
              </div>
            </div>
            <div>
              <label className="flex items-center gap-2 text-xs text-foreground-700 cursor-pointer"><input type="checkbox" checked={allowPublicLookup} onChange={(e) => setAllowPublicLookup(e.target.checked)} className="rounded accent-primary-500" />Allow public lookup (name + code)</label>
              {allowPublicLookup && (
                <p className="text-[11px] text-amber-600 mt-1 ml-6"><i className="ri-error-warning-line mr-1" />Public lookup is accessible to anyone with a guest&rsquo;s name and lookup code. Use with caution.</p>
              )}
            </div>
          </div>
        </div>

        {/* Publication status */}
        {publication && (
          <div className="card-default mb-6 border-accent-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-accent-50 text-accent-600"><i className="ri-global-line text-sm" /></div>
              <div>
                <p className="font-label text-sm font-semibold text-foreground-900">Currently published</p>
                <p className="text-xs text-foreground-500">Published {new Date(publication.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
            </div>
            <button onClick={handleUnpublish} className="btn-outline text-xs py-2 text-red-600 border-red-200 hover:bg-red-50 cursor-pointer whitespace-nowrap"><i className="ri-close-circle-line mr-1.5" />Unpublish & return to working</button>
          </div>
        )}

        {/* Publish button */}
        {!publication || publication.status === 'disabled' ? (
          <button
            onClick={handlePublish}
            disabled={publishing || hasBlockers}
            className="w-full sm:w-auto px-6 py-3 bg-accent-500 text-white rounded-lg text-sm font-label font-semibold hover:bg-accent-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer whitespace-nowrap"
          >
            {publishing ? <><i className="ri-loader-4-line animate-spin mr-2" />Publishing...</> : hasBlockers ? <><i className="ri-lock-line mr-2" />Resolve failed checks to publish</> : <><i className="ri-send-plane-line mr-2" />Publish seating plan</>}
          </button>
        ) : null}

        {toast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg bg-foreground-800 text-white text-xs max-w-md">
            <i className="ri-information-line text-sm" /><span>{toast}</span><button onClick={() => setToast(null)} className="ml-2 text-white/70 cursor-pointer"><i className="ri-close-line" /></button>
          </div>
        )}
      </div>
    </AppShell>
  );
}