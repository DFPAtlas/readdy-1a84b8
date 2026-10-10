import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AppShell from '@/components/feature/AppShell';
import { supabase } from '@/lib/supabase';
import type { Guest } from '@/types/guest';
import { isDemoMode } from '@/demo/demoConfig';
import { useDemoDataSafe } from '@/demo/useDemoDataSafe';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { useGuestService } from '@/hooks/useGuestService';
import type { DemoGuest } from '@/demo/demoTypes';

const ALL_COLUMNS = [
  { key: 'full_name', label: 'First name' },
  { key: 'last_name', label: 'Last name' },
  { key: 'preferred_name', label: 'Preferred name' },
  { key: 'email', label: 'Email' },
  { key: 'mobile_phone', label: 'Mobile' },
  { key: 'guest_type', label: 'Guest type' },
  { key: 'relationship_label', label: 'Relationship' },
  { key: 'invitation_group', label: 'Invitation group' },
  { key: 'plus_one_status', label: 'Plus-one' },
  { key: 'dietary_requirements', label: 'Dietary' },
  { key: 'allergy_notes', label: 'Allergies' },
  { key: 'accessibility_notes', label: 'Accessibility' },
  { key: 'accessibility_needs', label: 'Accessibility needs' },
  { key: 'mobility_transport_notes', label: 'Transport notes' },
  { key: 'rsvp_status', label: 'RSVP status' },
  { key: 'rsvp_label', label: 'RSVP' },
  { key: 'meal_choice', label: 'Meal choice' },
  { key: 'household_name', label: 'Household' },
  { key: 'seating_table', label: 'Seating table' },
  { key: 'tags', label: 'Tags' },
  { key: 'wedding_party_role', label: 'Wedding party role' },
  { key: 'ceremony_invited', label: 'Ceremony' },
  { key: 'reception_invited', label: 'Reception' },
  { key: 'evening_invited', label: 'Evening' },
  { key: 'child_notes', label: 'Child notes' },
];

type ExportPreset = 'all' | 'contacts' | 'invitation' | 'dietary' | 'selected';

const PRESETS: Record<ExportPreset, string[]> = {
  all: ['full_name', 'last_name', 'preferred_name', 'email', 'mobile_phone', 'guest_type', 'relationship_label', 'invitation_group', 'plus_one_status', 'rsvp_label', 'dietary_requirements', 'allergy_notes', 'accessibility_notes', 'mobility_transport_notes', 'meal_choice', 'household_name', 'seating_table', 'tags', 'wedding_party_role', 'ceremony_invited', 'reception_invited', 'evening_invited'],
  contacts: ['full_name', 'last_name', 'email', 'mobile_phone', 'household_name'],
  invitation: ['full_name', 'last_name', 'invitation_group', 'ceremony_invited', 'reception_invited', 'evening_invited', 'plus_one_status', 'rsvp_label', 'guest_type'],
  dietary: ['full_name', 'last_name', 'guest_type', 'dietary_requirements', 'allergy_notes', 'accessibility_notes', 'meal_choice'],
  selected: [],
};

function getRsvpLabel(status: string): string {
  if (status === 'accepted') return 'Attending';
  if (status === 'declined') return 'Declined';
  return 'Awaiting reply';
}

function escapeCSV(val: unknown): string {
  if (val === null || val === undefined) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
  if (s.startsWith('=') || s.startsWith('+') || s.startsWith('-') || s.startsWith('@')) return `'${s}`;
  return s;
}

function DemoExportPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const demo = useDemoDataSafe()!;
  const { state } = demo;
  const selectedIds = searchParams.get('ids')?.split(',').filter(Boolean) || [];
  const [preset, setPreset] = useState<ExportPreset>(selectedIds.length > 0 ? 'selected' : 'all');
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set(PRESETS.all));
  const [includeArchived, setIncludeArchived] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const seatingMap = useMemo(() => {
    const map = new Map<string, string>();
    state.seatingPlan.assignments.forEach((a) => {
      const table = state.seatingPlan.tables.find((t) => t.id === a.table_id);
      if (table) map.set(a.guest_id, table.name);
    });
    return map;
  }, [state.seatingPlan]);

  const filteredGuests = useMemo(() => {
    let guests = state.guests;
    if (!includeArchived) guests = guests.filter((g) => g.status === 'active');
    if (selectedIds.length > 0) guests = guests.filter((g) => selectedIds.includes(g.id));
    return guests;
  }, [state.guests, includeArchived, selectedIds]);

  const handlePresetChange = (p: ExportPreset) => {
    setPreset(p);
    if (p !== 'selected') setSelectedColumns(new Set(PRESETS[p]));
  };

  const toggleColumn = (key: string) => {
    setSelectedColumns((prev) => { const next = new Set(prev); if (next.has(key)) next.delete(key); else next.add(key); return next; });
    setPreset('selected');
  };

  const handleExport = () => {
    setExporting(true);
    const cols = ALL_COLUMNS.filter((c) => selectedColumns.has(c.key));
    const headers = cols.map((c) => c.label);

    const rows = filteredGuests.map((g) => {
      return cols.map((c) => {
        const household = state.households.find((h) => h.id === g.household_id);
        const rsvpLabel = getRsvpLabel(g.rsvp_status);
        const guestWithTags = g as DemoGuest & { tag_ids?: string[] };
        switch (c.key) {
          case 'rsvp_label': return escapeCSV(rsvpLabel);
          case 'household_name': return escapeCSV(household?.display_name || '');
          case 'seating_table': return escapeCSV(seatingMap.get(g.id) || '');
          case 'tags': return escapeCSV((guestWithTags.tag_ids || []).join('; '));
          case 'ceremony_invited': case 'reception_invited': case 'evening_invited':
            return escapeCSV(g[c.key] ? 'Yes' : 'No');
          default: return escapeCSV(g[c.key as keyof DemoGuest] || '');
        }
      }).join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wedding-guests.csv`;
    a.click();
    URL.revokeObjectURL(url);

    setExporting(false);
    setFeedback({ type: 'success', message: `Demo: ${filteredGuests.length} guests exported` });
  };

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto">
        {feedback && <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-label ${feedback.type === 'success' ? 'bg-accent-50 text-accent-700 border border-accent-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{feedback.message}</div>}
        <div className="flex items-center justify-between mb-6">
          <div><h1 className="font-heading text-2xl text-foreground-900">Export guests</h1><p className="text-sm text-foreground-500 mt-1">Download guest data as CSV.</p></div>
          <button onClick={() => navigate('/app/guests')} className="btn-ghost text-sm cursor-pointer whitespace-nowrap"><i className="ri-arrow-left-line mr-1.5" />Back</button>
        </div>

        <div className="space-y-6">
          <div className="card-default">
            <h3 className="font-label text-sm font-semibold text-foreground-900 mb-3">Export type</h3>
            <div className="flex flex-wrap gap-2">
              {([
                { key: 'all' as ExportPreset, icon: 'ri-group-line', label: 'All guests' },
                { key: 'contacts' as ExportPreset, icon: 'ri-contacts-book-line', label: 'Contact list' },
                { key: 'invitation' as ExportPreset, icon: 'ri-mail-send-line', label: 'Invitation planning' },
                { key: 'dietary' as ExportPreset, icon: 'ri-restaurant-line', label: 'Dietary & accessibility' },
              ]).map((p) => (
                <button key={p.key} onClick={() => handlePresetChange(p.key)} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm cursor-pointer whitespace-nowrap transition-colors ${preset === p.key ? 'bg-primary-500 text-white' : 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200'}`}>
                  <i className={p.icon} />{p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="card-default">
            <h3 className="font-label text-sm font-semibold text-foreground-900 mb-3">Columns ({selectedColumns.size} selected)</h3>
            <div className="flex flex-wrap gap-2">
              {ALL_COLUMNS.map((c) => (
                <button key={c.key} onClick={() => toggleColumn(c.key)} className={`px-3 py-1.5 rounded-full text-xs cursor-pointer whitespace-nowrap transition-colors ${selectedColumns.has(c.key) ? 'bg-primary-100 text-primary-700 border border-primary-200' : 'bg-white border border-secondary-200 text-secondary-500 hover:border-secondary-300'}`}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground-500">{filteredGuests.length} guests will be exported</span>
            <button onClick={handleExport} disabled={exporting} className="btn-primary text-sm cursor-pointer whitespace-nowrap">
              {exporting ? <><i className="ri-loader-4-line animate-spin mr-1.5" />Exporting...</> : <><i className="ri-download-line mr-1.5" />Export CSV</>}
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function NormalExportPage() {
  const navigate = useNavigate();
  const { weddingId } = useActiveWedding();
  const svc = useGuestService();
  const [searchParams] = useSearchParams();
  const selectedIds = searchParams.get('ids')?.split(',').filter(Boolean) || [];
  const [preset, setPreset] = useState<ExportPreset>(selectedIds.length > 0 ? 'selected' : 'all');
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set(PRESETS.all));
  const [includeArchived, setIncludeArchived] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [count, setCount] = useState(0);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    svc.getExportCount(includeArchived, selectedIds.length > 0 ? selectedIds : undefined).then(setCount);
  }, [includeArchived, selectedIds, svc]);

  const toggleColumn = (key: string) => {
    setSelectedColumns((prev) => { const next = new Set(prev); if (next.has(key)) next.delete(key); else next.add(key); return next; });
    setPreset('selected');
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const guests = await svc.getExportData(includeArchived, selectedIds.length > 0 ? selectedIds : undefined);

      const cols = ALL_COLUMNS.filter((c) => selectedColumns.has(c.key));
      const headers = cols.map((c) => c.label);
      const rows = guests.map((g) => {
        const record = g as unknown as Record<string, unknown>;
        return cols.map((c) => {
          if (c.key === 'ceremony_invited' || c.key === 'reception_invited' || c.key === 'evening_invited') return escapeCSV(record[c.key] ? 'Yes' : 'No');
          if (c.key === 'rsvp_label') return escapeCSV(getRsvpLabel((g.rsvp_status || 'pending')));
          return escapeCSV(record[c.key]);
        }).join(',');
      });

      const csv = ['\uFEFF' + headers.join(','), ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vowora_guests_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      await svc.recordActivity('exported', `Exported ${guests.length} guests to CSV`);
      setFeedback({ type: 'success', message: `${guests.length} guests exported` });
    } catch {
      setFeedback({ type: 'error', message: 'Export failed' });
    } finally {
      setExporting(false);
    }
  };

  const handlePresetChange = (p: ExportPreset) => {
    setPreset(p);
    if (p !== 'selected') setSelectedColumns(new Set(PRESETS[p]));
  };

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto">
        {feedback && <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-label ${feedback.type === 'success' ? 'bg-accent-50 text-accent-700 border border-accent-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{feedback.message}</div>}
        <div className="flex items-center justify-between mb-6">
          <div><h1 className="font-heading text-2xl text-foreground-900">Export guests</h1><p className="text-sm text-foreground-500 mt-1">Download your guest data as a CSV file.</p></div>
          <button onClick={() => navigate('/app/guests')} className="btn-ghost text-sm cursor-pointer whitespace-nowrap"><i className="ri-arrow-left-line mr-1.5" />Back</button>
        </div>
        <div className="space-y-6">
          <div className="card-default">
            <h3 className="font-label text-sm font-semibold text-foreground-900 mb-3">Export type</h3>
            <div className="flex flex-wrap gap-2">
              {([
                { key: 'all' as ExportPreset, icon: 'ri-group-line', label: 'All guests' },
                { key: 'contacts' as ExportPreset, icon: 'ri-contacts-book-line', label: 'Contact list' },
                { key: 'invitation' as ExportPreset, icon: 'ri-mail-send-line', label: 'Invitation planning' },
                { key: 'dietary' as ExportPreset, icon: 'ri-restaurant-line', label: 'Dietary & accessibility' },
              ]).map((p) => (
                <button key={p.key} onClick={() => handlePresetChange(p.key)} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm cursor-pointer whitespace-nowrap ${preset === p.key ? 'bg-primary-500 text-white' : 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200'}`}>
                  <i className={p.icon} />{p.label}
                </button>
              ))}
            </div>
          </div>
          <div className="card-default">
            <h3 className="font-label text-sm font-semibold text-foreground-900 mb-3">Columns ({selectedColumns.size} selected)</h3>
            <div className="flex flex-wrap gap-2">
              {ALL_COLUMNS.map((c) => (
                <button key={c.key} onClick={() => toggleColumn(c.key)} className={`px-3 py-1.5 rounded-full text-xs cursor-pointer whitespace-nowrap ${selectedColumns.has(c.key) ? 'bg-primary-100 text-primary-700 border border-primary-200' : 'bg-white border border-secondary-200 text-secondary-500 hover:border-secondary-300'}`}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground-500">{count} guests will be exported</span>
            <button onClick={handleExport} disabled={exporting} className="btn-primary text-sm cursor-pointer whitespace-nowrap">
              {exporting ? <><i className="ri-loader-4-line animate-spin mr-1.5" />Exporting...</> : <><i className="ri-download-line mr-1.5" />Export CSV</>}
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

export default function ExportPage() {
  const demoData = useDemoDataSafe();
  if (isDemoMode && demoData) return <DemoExportPage />;
  return <NormalExportPage />;
}