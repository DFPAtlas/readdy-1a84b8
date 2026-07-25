import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppShell from '@/components/feature/AppShell';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { supabase } from '@/lib/supabase';
import type { SeatingPlan, PlaceCardConfig, CardTheme } from '@/types/seating';
import { CARD_THEME_LABELS } from '@/types/seating';

interface PlaceCardGuest { id: string; name: string; table_number: number | null; table_name: string; seat_label: string | null; meal_choice: string | null; dietary: string | null; guest_type: string; }

const THEME_STYLES: Record<CardTheme, { bg: string; border: string; text: string; accent: string }> = {
  classic: { bg: 'bg-white', border: 'border-foreground-200', text: 'text-foreground-900', accent: 'text-foreground-500' },
  modern: { bg: 'bg-background-50', border: 'border-foreground-200', text: 'text-foreground-900', accent: 'text-primary-600' },
  botanical: { bg: 'bg-emerald-50/20', border: 'border-emerald-300', text: 'text-emerald-900', accent: 'text-emerald-600' },
  minimal: { bg: 'bg-white', border: 'border-secondary-200', text: 'text-foreground-900', accent: 'text-foreground-400' },
  romantic: { bg: 'bg-rose-50/20', border: 'border-rose-200', text: 'text-rose-900', accent: 'text-rose-500' },
  editorial: { bg: 'bg-foreground-900', border: 'border-foreground-700', text: 'text-white', accent: 'text-secondary-300' },
};

export default function PlaceCardsPage() {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const { weddingId } = useActiveWedding();

  const [plan, setPlan] = useState<SeatingPlan | null>(null);
  const [guests, setGuests] = useState<PlaceCardGuest[]>([]);
  const [config, setConfig] = useState<PlaceCardConfig>({
    showTableNumber: true, showSeatLabel: false, showMealMarker: false,
    showDietaryMarker: false, showCoupleNames: true, showWeddingDate: false,
    theme: 'classic', format: 'flat', paperSize: 'a4',
    includeChildren: true, excludeSuppliers: false,
    sortBy: 'table', dietaryMarkerMode: 'off',
    coupleNames: '', weddingDate: '',
  });

  useEffect(() => {
    if (!weddingId || !planId) return;
    (async () => {
      const { data: p } = await supabase.from('seating_plans').select('*').eq('id', planId).eq('wedding_id', weddingId).maybeSingle();
      if (p) setPlan(p as SeatingPlan);

      const { data: a } = await supabase.from('seating_assignments').select('guests!inner(id, full_name, guest_type, meal_choice, dietary_requirements), table_id, seating_seat_id').eq('plan_id', planId);
      const { data: t } = await supabase.from('seating_tables').select('id, table_number, name').eq('plan_id', planId);
      const { data: s } = await supabase.from('seating_seats').select('id, seat_label, seat_number').eq('seating_plan_id', planId);

      const tableMap = new Map((t || []).map((tbl: { id: string; table_number: number | null; name: string }) => [tbl.id, tbl]));
      const seatMap = new Map((s || []).map((se: { id: string; seat_label: string | null; seat_number: number | null }) => [se.id, se]));

      const gs: PlaceCardGuest[] = (a || []).map((row: { guests: Array<{ id: string; full_name: string; guest_type: string; meal_choice: string | null; dietary_requirements: string | null }>; table_id: string; seating_seat_id: string | null }) => {
        const seat = row.seating_seat_id ? seatMap.get(row.seating_seat_id) : null;
        const tbl = tableMap.get(row.table_id);
        return {
          id: row.guests[0].id, name: row.guests[0].full_name, guest_type: row.guests[0].guest_type,
          table_number: tbl?.table_number || null, table_name: tbl?.name || '',
          seat_label: seat?.seat_label || null, meal_choice: row.guests[0].meal_choice,
          dietary: row.guests[0].dietary_requirements,
        };
      });

      let filtered = gs;
      if (!config.includeChildren) filtered = filtered.filter((g) => g.guest_type !== 'child' && g.guest_type !== 'infant');
      if (config.excludeSuppliers) filtered = filtered.filter((g) => g.guest_type !== 'supplier');

      if (config.sortBy === 'guest') filtered.sort((a, b) => a.name.localeCompare(b.name));
      else if (config.sortBy === 'table') filtered.sort((a, b) => (a.table_number || 0) - (b.table_number || 0) || a.name.localeCompare(b.name));
      else filtered.sort((a, b) => (a.seat_label || '').localeCompare(b.seat_label || ''));

      setGuests(filtered);
    })();
  }, [weddingId, planId, config.includeChildren, config.excludeSuppliers, config.sortBy]);

  const theme = THEME_STYLES[config.theme];
  const printCards = () => window.print();

  if (!plan) {
    return <AppShell><div className="h-[calc(100vh-80px)] flex flex-col items-center justify-center"><p className="text-sm text-foreground-500 mb-4">Plan not found</p><button onClick={() => navigate('/app/seating')} className="btn-outline text-xs py-2 cursor-pointer whitespace-nowrap">Back</button></div></AppShell>;
  }

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6 no-print">
          <button onClick={() => navigate('/app/seating/plans/' + planId)} className="text-xs text-foreground-500 hover:text-foreground-700 cursor-pointer mb-2 whitespace-nowrap"><i className="ri-arrow-left-line mr-1" />Back to workspace</button>
          <div className="flex items-center justify-between">
            <div><h1 className="font-heading text-2xl text-foreground-900 mb-1">Place cards</h1><p className="text-sm text-foreground-500">{guests.length} guests · {plan.name}</p></div>
            <button onClick={printCards} className="btn-outline text-xs py-2 cursor-pointer whitespace-nowrap"><i className="ri-printer-line mr-1.5" />Print</button>
          </div>
        </div>

        {/* Config */}
        <div className="card-default mb-8 no-print">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div><label className="text-[10px] text-foreground-400 font-label block mb-1">Theme</label>
              <select value={config.theme} onChange={(e) => setConfig({ ...config, theme: e.target.value as CardTheme })} className="w-full px-2 py-1.5 text-xs border border-secondary-200 rounded-lg bg-white text-foreground-900">
                {(Object.keys(CARD_THEME_LABELS) as CardTheme[]).map((t) => <option key={t} value={t}>{CARD_THEME_LABELS[t]}</option>)}
              </select>
            </div>
            <div><label className="text-[10px] text-foreground-400 font-label block mb-1">Sort by</label>
              <select value={config.sortBy} onChange={(e) => setConfig({ ...config, sortBy: e.target.value as 'guest' | 'table' | 'seat' })} className="w-full px-2 py-1.5 text-xs border border-secondary-200 rounded-lg bg-white text-foreground-900">
                <option value="table">Table order</option><option value="guest">Guest name</option><option value="seat">Seat order</option>
              </select>
            </div>
            <div><label className="text-[10px] text-foreground-400 font-label block mb-1">Format</label>
              <select value={config.format} onChange={(e) => setConfig({ ...config, format: e.target.value as 'flat' | 'folded' })} className="w-full px-2 py-1.5 text-xs border border-secondary-200 rounded-lg bg-white text-foreground-900">
                <option value="flat">Flat</option><option value="folded">Folded</option>
              </select>
            </div>
            <div><label className="text-[10px] text-foreground-400 font-label block mb-1">Dietary marker</label>
              <select value={config.dietaryMarkerMode} onChange={(e) => setConfig({ ...config, dietaryMarkerMode: e.target.value as 'off' | 'discreet' | 'full' })} className="w-full px-2 py-1.5 text-xs border border-secondary-200 rounded-lg bg-white text-foreground-900">
                <option value="off">Off</option><option value="discreet">Discreet</option><option value="full">Full</option>
              </select>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 mt-3">
            <label className="flex items-center gap-1.5 text-xs text-foreground-700 cursor-pointer"><input type="checkbox" checked={config.showTableNumber} onChange={(e) => setConfig({ ...config, showTableNumber: e.target.checked })} className="rounded accent-primary-500" />Table number</label>
            <label className="flex items-center gap-1.5 text-xs text-foreground-700 cursor-pointer"><input type="checkbox" checked={config.showSeatLabel} onChange={(e) => setConfig({ ...config, showSeatLabel: e.target.checked })} className="rounded accent-primary-500" />Seat label</label>
            <label className="flex items-center gap-1.5 text-xs text-foreground-700 cursor-pointer"><input type="checkbox" checked={config.showMealMarker} onChange={(e) => setConfig({ ...config, showMealMarker: e.target.checked })} className="rounded accent-primary-500" />Meal marker</label>
            <label className="flex items-center gap-1.5 text-xs text-foreground-700 cursor-pointer"><input type="checkbox" checked={config.excludeSuppliers} onChange={(e) => setConfig({ ...config, excludeSuppliers: e.target.checked })} className="rounded accent-primary-500" />Exclude suppliers</label>
          </div>
        </div>

        {/* Place cards grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {guests.map((g) => (
            <div key={g.id} className={'p-4 rounded-lg text-center break-inside-avoid ' + theme.bg + ' border ' + theme.border} style={{ minHeight: config.format === 'folded' ? '120px' : 'auto' }}>
              <p className={'font-heading text-base font-semibold mb-1 ' + theme.text}>{g.name}</p>
              {config.showTableNumber && <p className={'text-xs ' + theme.accent}>Table {g.table_number || g.table_name}</p>}
              {config.showSeatLabel && g.seat_label && <p className={'text-xs ' + theme.accent}>Seat {g.seat_label}</p>}
              {config.showMealMarker && g.meal_choice && <p className={'text-[10px] mt-1 ' + theme.accent}>{g.meal_choice}</p>}
              {config.dietaryMarkerMode !== 'off' && g.dietary && (
                <p className="text-[10px] mt-1 text-amber-500">
                  {config.dietaryMarkerMode === 'discreet' ? <i className="ri-error-warning-line" /> : g.dietary}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}