import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppShell from '@/components/feature/AppShell';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { supabase } from '@/lib/supabase';
import type { SeatingPlan } from '@/types/seating';
import { EVENT_TYPE_LABELS, PLAN_STATUS_LABELS, PLAN_STATUS_COLOURS } from '@/types/seating';

interface SearchResult { guest_name: string; table_number: number | null; table_name: string; seat_label: string | null; meal_choice: string | null; }

export default function DayModePage() {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const { weddingId, loading: weddingLoading } = useActiveWedding();

  const [plan, setPlan] = useState<SeatingPlan | null>(null);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [tableGuests, setTableGuests] = useState<SearchResult[]>([]);
  const [tables, setTables] = useState<Array<{ id: string; table_number: number | null; name: string }>>([]);
  const [tableName, setTableName] = useState('');

  useEffect(() => {
    if (!weddingId || !planId) return;
    (async () => {
      const { data: p } = await supabase.from('seating_plans').select('*').eq('id', planId).eq('wedding_id', weddingId).maybeSingle();
      if (p) setPlan(p as SeatingPlan);
      const { data: t } = await supabase.from('seating_tables').select('id, table_number, name').eq('plan_id', planId).order('table_number');
      if (t) setTables(t as Array<{ id: string; table_number: number | null; name: string }>);
    })();
  }, [weddingId, planId]);

  const handleSearch = useCallback(async () => {
    if (!search.trim() || !planId) return;
    setSearched(true);
    const { data } = await supabase.from('seating_assignments').select('guests!inner(full_name, meal_choice), seating_tables!inner(table_number, name), seating_seats(seat_label)').eq('plan_id', planId).ilike('guests.full_name', '%' + search.trim() + '%').limit(20);
    if (data) {
      const r = (data as Array<{ guests: Array<{ full_name: string; meal_choice: string | null }>; seating_tables: Array<{ table_number: number | null; name: string }>; seating_seats: Array<{ seat_label: string | null }> | null }>).map((row) => ({
        guest_name: row.guests[0].full_name, table_number: row.seating_tables[0].table_number, table_name: row.seating_tables[0].name,
        seat_label: row.seating_seats?.[0]?.seat_label || null, meal_choice: row.guests[0].meal_choice,
      }));
      setResults(r);
    } else { setResults([]); }
  }, [search, planId]);

  const loadTableGuests = useCallback(async (tableId: string, tName: string) => {
    setSelectedTableId(tableId);
    setTableName(tName);
    const { data } = await supabase.from('seating_assignments').select('guests!inner(full_name, meal_choice), seating_tables!inner(table_number, name), seating_seats(seat_label)').eq('plan_id', planId).eq('table_id', tableId);
    if (data) {
      const r = (data as Array<{ guests: Array<{ full_name: string; meal_choice: string | null }>; seating_tables: Array<{ table_number: number | null; name: string }>; seating_seats: Array<{ seat_label: string | null }> | null }>).map((row) => ({
        guest_name: row.guests[0].full_name, table_number: row.seating_tables[0].table_number, table_name: row.seating_tables[0].name,
        seat_label: row.seating_seats?.[0]?.seat_label || null, meal_choice: row.guests[0].meal_choice,
      }));
      setTableGuests(r);
    }
  }, [planId]);

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleSearch(); };

  const statusColour = plan ? PLAN_STATUS_COLOURS[plan.status] : '';
  const statusLabel = plan ? PLAN_STATUS_LABELS[plan.status] : '';

  if (weddingLoading) {
    return <AppShell><div className="h-[calc(100vh-80px)] flex items-center justify-center"><i className="ri-loader-4-line animate-spin text-xl text-foreground-400" /></div></AppShell>;
  }
  if (!plan) {
    return <AppShell><div className="h-[calc(100vh-80px)] flex flex-col items-center justify-center"><p className="text-sm text-foreground-500 mb-4">Plan not found</p><button onClick={() => navigate('/app/seating')} className="btn-outline text-xs py-2 cursor-pointer whitespace-nowrap">Back</button></div></AppShell>;
  }

  const workspacePath = '/app/seating/plans/' + planId;

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(workspacePath)} className="w-9 h-9 flex items-center justify-center rounded-lg text-foreground-400 hover:bg-background-100 cursor-pointer flex-shrink-0"><i className="ri-arrow-left-line text-lg" /></button>
          <div>
            <div className="flex items-center gap-2"><h1 className="font-heading text-xl text-foreground-900">Wedding Day Mode</h1><span className={'px-1.5 py-0.5 rounded text-[9px] font-label font-semibold ' + statusColour}>{statusLabel}</span></div>
            <p className="text-xs text-foreground-500">{plan.name} · {EVENT_TYPE_LABELS[plan.event_type]} · <span className="text-emerald-600 font-label">Read-only</span></p>
          </div>
        </div>

        {/* Search */}
        <div className="card-default mb-6">
          <h2 className="font-label text-sm font-semibold text-foreground-900 mb-3 flex items-center gap-2"><i className="ri-search-line text-foreground-500" />Find a guest</h2>
          <div className="flex gap-2">
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={handleKeyDown} placeholder="Search by name..." className="flex-1 px-3 py-3 text-sm border border-secondary-200 rounded-lg bg-white text-foreground-900 placeholder:text-foreground-300 focus:outline-none focus:border-primary-400" />
            <button onClick={handleSearch} className="px-5 py-3 bg-primary-500 text-white rounded-lg text-sm font-label font-semibold hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap">Find</button>
          </div>
          {searched && (
            <div className="mt-4">
              {results.length === 0 ? <p className="text-xs text-foreground-400">No guests found matching &ldquo;{search}&rdquo;.</p> : (
                <div className="space-y-2">
                  {results.map((r, i) => (
                    <div key={i} className="flex items-center justify-between py-2 px-3 bg-background-50 rounded-lg">
                      <div>
                        <p className="text-sm font-label font-medium text-foreground-900">{r.guest_name}</p>
                        <p className="text-xs text-foreground-500">Table {r.table_number || r.table_name}{r.seat_label ? ' · Seat ' + r.seat_label : ''}</p>
                      </div>
                      {r.meal_choice && <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary-100 text-secondary-700 font-label">{r.meal_choice}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Browse tables */}
        <div className="card-default mb-6">
          <h2 className="font-label text-sm font-semibold text-foreground-900 mb-3 flex items-center gap-2"><i className="ri-layout-grid-line text-foreground-500" />All tables</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {tables.map((t) => {
              const isSelected = selectedTableId === t.id;
              const borderCls = isSelected ? 'border-primary-400 bg-primary-50' : 'border-secondary-200 hover:border-primary-300 bg-white';
              return (
                <button key={t.id} onClick={() => loadTableGuests(t.id, t.name)} className={'p-3 rounded-lg text-left border cursor-pointer transition-colors text-sm ' + borderCls}>
                  <p className="font-label font-semibold text-foreground-900">Table {t.table_number || t.name}</p>
                  <p className="text-[10px] text-foreground-400 mt-0.5">{t.name}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected table guests */}
        {selectedTableId && tableGuests.length > 0 && (
          <div className="card-default">
            <h2 className="font-label text-sm font-semibold text-foreground-900 mb-3">Table {tableName} guests</h2>
            <div className="space-y-1">
              {tableGuests.map((g, i) => (
                <div key={i} className="flex items-center justify-between py-2 px-3 bg-background-50 rounded-lg text-sm">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-foreground-400 w-10">{g.seat_label || '-'}</span>
                    <span className="font-label font-medium text-foreground-900">{g.guest_name}</span>
                  </div>
                  {g.meal_choice && <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary-100 text-secondary-700 font-label">{g.meal_choice}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 p-3 bg-background-50 rounded-lg text-[11px] text-foreground-400 text-center">
          <i className="ri-information-line mr-1" />Last synced: {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} · This is a read-only view — no accidental changes possible.
        </div>
      </div>
    </AppShell>
  );
}