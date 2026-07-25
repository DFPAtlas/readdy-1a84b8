import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppShell from '@/components/feature/AppShell';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { supabase } from '@/lib/supabase';
import type { ExportJob, SeatingPlan } from '@/types/seating';
import { EXPORT_TYPE_LABELS } from '@/types/seating';

type ExportCategory = { label: string; items: ExportJobTemplate[] };
type ExportJobTemplate = { type: string; label: string; format: 'pdf' | 'csv' | 'png'; sensitive: boolean; icon: string };

const EXPORT_CATEGORIES: ExportCategory[] = [
  { label: 'PDF Reports', items: [
    { type: 'floor_plan', label: 'Floor plan', format: 'pdf', sensitive: false, icon: 'ri-layout-grid-line' },
    { type: 'guest_by_table', label: 'Guest-by-table list', format: 'pdf', sensitive: false, icon: 'ri-table-line' },
    { type: 'alphabetical', label: 'Alphabetical lookup', format: 'pdf', sensitive: false, icon: 'ri-sort-alphabet-asc' },
    { type: 'coordinator_pack', label: 'Coordinator pack', format: 'pdf', sensitive: true, icon: 'ri-folder-zip-line' },
    { type: 'catering', label: 'Catering report', format: 'pdf', sensitive: true, icon: 'ri-restaurant-line' },
    { type: 'accessibility', label: 'Accessibility report', format: 'pdf', sensitive: true, icon: 'ri-wheelchair-line' },
    { type: 'venue_setup', label: 'Venue setup report', format: 'pdf', sensitive: false, icon: 'ri-building-line' },
    { type: 'table_cards', label: 'Table cards', format: 'pdf', sensitive: false, icon: 'ri-file-list-3-line' },
    { type: 'place_cards', label: 'Place cards', format: 'pdf', sensitive: false, icon: 'ri-price-tag-3-line' },
  ]},
  { label: 'CSV Exports', items: [
    { type: 'guest_assignments_csv', label: 'Guest assignments', format: 'csv', sensitive: true, icon: 'ri-file-excel-2-line' },
    { type: 'tables_csv', label: 'Tables', format: 'csv', sensitive: false, icon: 'ri-file-excel-2-line' },
    { type: 'seats_csv', label: 'Seats', format: 'csv', sensitive: false, icon: 'ri-file-excel-2-line' },
    { type: 'meal_csv', label: 'Meals & dietary', format: 'csv', sensitive: true, icon: 'ri-file-excel-2-line' },
    { type: 'accessibility_csv', label: 'Accessibility', format: 'csv', sensitive: true, icon: 'ri-file-excel-2-line' },
    { type: 'unseated_csv', label: 'Unseated guests', format: 'csv', sensitive: false, icon: 'ri-file-excel-2-line' },
    { type: 'conflict_csv', label: 'Conflicts', format: 'csv', sensitive: false, icon: 'ri-file-excel-2-line' },
    { type: 'inventory_csv', label: 'Venue inventory', format: 'csv', sensitive: false, icon: 'ri-file-excel-2-line' },
  ]},
];

export default function SeatingExportsPage() {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const { weddingId, loading: weddingLoading } = useActiveWedding();

  const [plan, setPlan] = useState<SeatingPlan | null>(null);
  const [jobs, setJobs] = useState<ExportJob[]>([]);
  const [generating, setGenerating] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    if (!planId) return;
    const { data } = await supabase.from('seating_export_jobs').select('*').eq('seating_plan_id', planId).order('requested_at', { ascending: false }).limit(20);
    if (data) setJobs(data as ExportJob[]);
  }, [planId]);

  useEffect(() => {
    if (!weddingId || !planId) return;
    (async () => {
      const { data: p } = await supabase.from('seating_plans').select('*').eq('id', planId).eq('wedding_id', weddingId).maybeSingle();
      if (p) setPlan(p as SeatingPlan);
      await fetchJobs();
    })();
  }, [weddingId, planId, fetchJobs]);

  const generateExport = async (exportType: string, format: string, sensitive: boolean) => {
    if (!planId || !weddingId) return;
    setGenerating(exportType);
    try {
      const { data, error } = await supabase.from('seating_export_jobs').insert({
        wedding_id: weddingId, seating_plan_id: planId,
        export_type: exportType, format, status: 'completed',
        contains_sensitive_data: sensitive,
        completed_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }).select('*').single();

      if (error) throw error;

      setToast(`${EXPORT_TYPE_LABELS[exportType as keyof typeof EXPORT_TYPE_LABELS] || exportType} export recorded. Download will be available when server-side generation is active.`);
      await fetchJobs();
    } catch (err) {
      setToast(`Export failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
    finally { setGenerating(null); }
  };

  if (weddingLoading) {
    return <AppShell><div className="h-[calc(100vh-80px)] flex items-center justify-center"><i className="ri-loader-4-line animate-spin text-xl text-foreground-400" /></div></AppShell>;
  }

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <button onClick={() => navigate(`/app/seating/plans/${planId}`)} className="text-xs text-foreground-500 hover:text-foreground-700 cursor-pointer mb-2 whitespace-nowrap"><i className="ri-arrow-left-line mr-1" />Back to workspace</button>
          <h1 className="font-heading text-2xl text-foreground-900 mb-1">Exports</h1>
          <p className="text-sm text-foreground-500">{plan?.name || 'Seating plan'} · Download PDF and CSV files</p>
        </div>

        {EXPORT_CATEGORIES.map((cat) => (
          <div key={cat.label} className="mb-8">
            <h2 className="font-label text-xs font-semibold text-foreground-400 uppercase tracking-wide mb-3">{cat.label}</h2>
            <div className="space-y-2">
              {cat.items.map((item) => {
                const isGenerating = generating === item.type;
                const latestJob = jobs.find((j) => j.export_type === item.type);
                return (
                  <div key={item.type} className="card-default flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg bg-background-100 text-foreground-500">
                        <i className={`${item.icon} text-sm`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-label font-medium text-foreground-900">{item.label}</p>
                        <p className="text-[11px] text-foreground-400">.{item.format.toUpperCase()}{item.sensitive ? ' · Contains restricted data' : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {latestJob && latestJob.status === 'completed' && (
                        <span className="text-[10px] text-emerald-600 font-label whitespace-nowrap"><i className="ri-check-line mr-0.5" />Ready</span>
                      )}
                      <button
                        onClick={() => generateExport(item.type, item.format, item.sensitive)}
                        disabled={isGenerating}
                        className="btn-outline text-xs py-1.5 cursor-pointer whitespace-nowrap"
                      >
                        {isGenerating ? <><i className="ri-loader-4-line animate-spin mr-1" />Generating...</> : <>Generate {item.format.toUpperCase()}</>}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {jobs.length > 0 && (
          <div className="mt-8">
            <h2 className="font-label text-xs font-semibold text-foreground-400 uppercase tracking-wide mb-3">Recent exports</h2>
            <div className="space-y-1">
              {jobs.slice(0, 5).map((j) => (
                <div key={j.id} className="flex items-center justify-between py-2 px-3 bg-background-50 rounded-lg text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-foreground-600">{EXPORT_TYPE_LABELS[j.export_type] || j.export_type}</span>
                    <span className="text-foreground-400">· .{j.format}</span>
                    {j.contains_sensitive_data && <span className="text-amber-600"><i className="ri-shield-check-line text-[10px]" /></span>}
                  </div>
                  <span className={`font-label ${j.status === 'completed' ? 'text-emerald-600' : j.status === 'failed' ? 'text-red-600' : 'text-foreground-400'}`}>{j.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg bg-foreground-800 text-white text-xs max-w-md">
          <i className="ri-information-line text-sm" /><span>{toast}</span>
          <button onClick={() => setToast(null)} className="ml-2 text-white/70 hover:text-white cursor-pointer"><i className="ri-close-line" /></button>
        </div>
      )}
    </AppShell>
  );
}