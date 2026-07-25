import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppShell from '@/components/feature/AppShell';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { supabase } from '@/lib/supabase';
import type { SeatingPlan, TableCardConfig, CardTheme } from '@/types/seating';
import { CARD_THEME_LABELS } from '@/types/seating';

interface TableInfo { id: string; table_number: number | null; name: string; guests: string[]; }

const THEME_STYLES: Record<CardTheme, { bg: string; border: string; text: string; accent: string }> = {
  classic: { bg: 'bg-white', border: 'border-foreground-300', text: 'text-foreground-900', accent: 'text-foreground-600' },
  modern: { bg: 'bg-background-50', border: 'border-foreground-200', text: 'text-foreground-900', accent: 'text-primary-600' },
  botanical: { bg: 'bg-emerald-50/30', border: 'border-emerald-300', text: 'text-emerald-900', accent: 'text-emerald-600' },
  minimal: { bg: 'bg-white', border: 'border-secondary-200', text: 'text-foreground-900', accent: 'text-foreground-400' },
  romantic: { bg: 'bg-rose-50/30', border: 'border-rose-200', text: 'text-rose-900', accent: 'text-rose-500' },
  editorial: { bg: 'bg-foreground-900', border: 'border-foreground-700', text: 'text-white', accent: 'text-secondary-300' },
};

export default function TableCardsPage() {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const { weddingId } = useActiveWedding();

  const [plan, setPlan] = useState<SeatingPlan | null>(null);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [config, setConfig] = useState<TableCardConfig>({
    showTableNumber: true, showTableName: true, showGuestList: true,
    showCoupleNames: true, showWeddingDate: false, showMonogram: false,
    theme: 'classic', paperSize: 'a4', orientation: 'portrait',
    border: true, alignment: 'center', fontScale: 1, guestNameFormat: 'full',
    coupleNames: '', weddingDate: '',
  });

  useEffect(() => {
    if (!weddingId || !planId) return;
    (async () => {
      const { data: p } = await supabase.from('seating_plans').select('*').eq('id', planId).eq('wedding_id', weddingId).maybeSingle();
      if (p) setPlan(p as SeatingPlan);

      const { data: t } = await supabase.from('seating_tables').select('id, table_number, name').eq('plan_id', planId).order('table_number');
      if (!t) return;

      const { data: a } = await supabase.from('seating_assignments').select('guests!inner(full_name), table_id').eq('plan_id', planId);

      const tablesWithGuests = (t as Array<{ id: string; table_number: number | null; name: string }>).map((table) => ({
        id: table.id, table_number: table.table_number, name: table.name,
        guests: (a || []).filter((as: { table_id: string }) => as.table_id === table.id).map((as: { guests: Array<{ full_name: string }> }) => as.guests[0].full_name),
      }));
      setTables(tablesWithGuests);
    })();
  }, [weddingId, planId]);

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
            <div><h1 className="font-heading text-2xl text-foreground-900 mb-1">Table cards</h1><p className="text-sm text-foreground-500">{tables.length} tables · {plan.name}</p></div>
            <button onClick={printCards} className="btn-outline text-xs py-2 cursor-pointer whitespace-nowrap"><i className="ri-printer-line mr-1.5" />Print</button>
          </div>
        </div>

        {/* Config panel */}
        <div className="card-default mb-8 no-print">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div><label className="text-[10px] text-foreground-400 font-label block mb-1">Theme</label>
              <select value={config.theme} onChange={(e) => setConfig({ ...config, theme: e.target.value as CardTheme })} className="w-full px-2 py-1.5 text-xs border border-secondary-200 rounded-lg bg-white text-foreground-900">
                {(Object.keys(CARD_THEME_LABELS) as CardTheme[]).map((t) => <option key={t} value={t}>{CARD_THEME_LABELS[t]}</option>)}
              </select>
            </div>
            <div><label className="text-[10px] text-foreground-400 font-label block mb-1">Paper</label>
              <select value={config.paperSize} onChange={(e) => setConfig({ ...config, paperSize: e.target.value })} className="w-full px-2 py-1.5 text-xs border border-secondary-200 rounded-lg bg-white text-foreground-900">
                <option value="a4">A4</option><option value="a5">A5</option><option value="letter">Letter</option>
              </select>
            </div>
            <div><label className="text-[10px] text-foreground-400 font-label block mb-1">Orientation</label>
              <select value={config.orientation} onChange={(e) => setConfig({ ...config, orientation: e.target.value as 'portrait' | 'landscape' })} className="w-full px-2 py-1.5 text-xs border border-secondary-200 rounded-lg bg-white text-foreground-900">
                <option value="portrait">Portrait</option><option value="landscape">Landscape</option>
              </select>
            </div>
            <div><label className="text-[10px] text-foreground-400 font-label block mb-1">Alignment</label>
              <select value={config.alignment} onChange={(e) => setConfig({ ...config, alignment: e.target.value as 'left' | 'center' | 'right' })} className="w-full px-2 py-1.5 text-xs border border-secondary-200 rounded-lg bg-white text-foreground-900">
                <option value="center">Centre</option><option value="left">Left</option><option value="right">Right</option>
              </select>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 mt-3">
            <label className="flex items-center gap-1.5 text-xs text-foreground-700 cursor-pointer"><input type="checkbox" checked={config.showGuestList} onChange={(e) => setConfig({ ...config, showGuestList: e.target.checked })} className="rounded accent-primary-500" />Guest list</label>
            <label className="flex items-center gap-1.5 text-xs text-foreground-700 cursor-pointer"><input type="checkbox" checked={config.showCoupleNames} onChange={(e) => setConfig({ ...config, showCoupleNames: e.target.checked })} className="rounded accent-primary-500" />Couple names</label>
            <label className="flex items-center gap-1.5 text-xs text-foreground-700 cursor-pointer"><input type="checkbox" checked={config.showWeddingDate} onChange={(e) => setConfig({ ...config, showWeddingDate: e.target.checked })} className="rounded accent-primary-500" />Wedding date</label>
            <label className="flex items-center gap-1.5 text-xs text-foreground-700 cursor-pointer"><input type="checkbox" checked={config.border} onChange={(e) => setConfig({ ...config, border: e.target.checked })} className="rounded accent-primary-500" />Border</label>
          </div>
        </div>

        {/* Card previews */}
        <div className="space-y-4">
          {tables.map((table) => (
            <div key={table.id} className={'p-6 rounded-lg break-inside-avoid ' + theme.bg + ' ' + (config.border ? 'border ' + theme.border : '')} style={{ textAlign: config.alignment, fontSize: 14 * config.fontScale + 'px' }}>
              <h2 className={'font-heading text-3xl font-bold mb-2 ' + theme.text}>Table {table.table_number || table.name}</h2>
              {config.showTableName && <p className={'text-sm mb-3 ' + theme.accent}>{table.name}</p>}
              {config.showCoupleNames && config.coupleNames && <p className={'text-xs mb-2 ' + theme.accent}>{config.coupleNames}</p>}
              {config.showWeddingDate && config.weddingDate && <p className={'text-xs mb-4 ' + theme.accent}>{config.weddingDate}</p>}
              {config.showGuestList && table.guests.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {table.guests.map((g, i) => (
                    <li key={i} className={'text-sm ' + theme.text}>{g}</li>
                  ))}
                </ul>
              )}
              {config.showGuestList && table.guests.length === 0 && <p className={'text-xs italic ' + theme.accent}>No guests assigned</p>}
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}