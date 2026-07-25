import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppShell from '@/components/feature/AppShell';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { supabase } from '@/lib/supabase';
import type { SeatingPlan, SeatingTable, GuestSeating, GuestInfo, ReportData } from '@/types/seating';
import { EVENT_TYPE_LABELS } from '@/types/seating';

interface ReportCard {
  id: string; title: string; description: string; icon: string;
  path: string; sensitive: boolean; category: string;
}

const REPORT_CARDS: ReportCard[] = [
  { id: 'guest_by_table', title: 'Guest-by-table', description: 'Guests listed per table in seat order with meal choices and dietary alerts.', icon: 'ri-table-line', path: '', sensitive: false, category: 'Guests' },
  { id: 'alphabetical', title: 'Alphabetical lookup', description: 'A–Z guest list with table, seat, and household details for quick reference.', icon: 'ri-sort-alphabet-asc', path: '', sensitive: false, category: 'Guests' },
  { id: 'occupancy', title: 'Table occupancy', description: 'Seat fill rates, capacity v. assigned, and zone-by-zone overview.', icon: 'ri-pie-chart-line', path: '', sensitive: false, category: 'Analysis' },
  { id: 'meal', title: 'Meals & catering', description: 'Meal choices, dietary requirements, allergy alerts by table for caterers.', icon: 'ri-restaurant-line', path: '', sensitive: true, category: 'Catering' },
  { id: 'accessibility', title: 'Accessibility', description: 'Wheelchair spaces, high chairs, carer proximity, route proximity.', icon: 'ri-wheelchair-line', path: '', sensitive: true, category: 'Catering' },
  { id: 'children', title: 'Children & high chairs', description: 'Child guests, high-chair seats, child-with-guardian verification.', icon: 'ri-user-smile-line', path: '', sensitive: false, category: 'Analysis' },
  { id: 'suppliers', title: 'Suppliers', description: 'Supplier-designated tables, seat counts, and setup notes.', icon: 'ri-truck-line', path: '', sensitive: false, category: 'Operations' },
  { id: 'unseated', title: 'Unseated & excluded', description: 'Guests not yet seated or deliberately excluded with reasons.', icon: 'ri-user-unfollow-line', path: '', sensitive: false, category: 'Guests' },
  { id: 'conflicts', title: 'Conflict summary', description: 'Unresolved seating conflicts and rule violations.', icon: 'ri-error-warning-line', path: '', sensitive: false, category: 'Analysis' },
  { id: 'venue_setup', title: 'Venue setup', description: 'Table positions, chair counts, venue objects, setup checklist.', icon: 'ri-building-line', path: '', sensitive: false, category: 'Operations' },
  { id: 'inventory', title: 'Room inventory', description: 'Complete inventory: tables, chairs, objects, and zones.', icon: 'ri-list-check-2', path: '', sensitive: false, category: 'Operations' },
  { id: 'coordinator_pack', title: 'Coordinator pack', description: 'Combined final plan, guest lists, meals, accessibility, and venue notes.', icon: 'ri-folder-zip-line', path: '', sensitive: true, category: 'Operations' },
  { id: 'version_changes', title: 'Version changes', description: 'What changed between the last two plan revisions.', icon: 'ri-git-branch-line', path: '', sensitive: false, category: 'Analysis' },
];

export default function SeatingReportsPage() {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const { weddingId, loading: weddingLoading } = useActiveWedding();

  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<SeatingPlan | null>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [activeReport, setActiveReport] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'report'>('grid');

  useEffect(() => {
    if (!weddingId || !planId) return;
    (async () => {
      setLoading(true);
      try {
        const { data: planData } = await supabase.from('seating_plans').select('*').eq('id', planId).eq('wedding_id', weddingId).maybeSingle();
        if (!planData) { setLoading(false); return; }
        const p = planData as SeatingPlan;
        setPlan(p);

        const { data: weddingData } = await supabase.from('weddings').select('id, partner_one_name, partner_two_name').eq('id', weddingId).maybeSingle();

        const { data: tablesData } = await supabase.from('seating_tables').select('*').eq('plan_id', planId).order('sort_order');
        const { data: seatsData } = await supabase.from('seating_seats').select('*').eq('seating_plan_id', planId);
        const { data: assignsData } = await supabase.from('seating_assignments').select('*, guests!inner(id, full_name, guest_type, meal_choice, dietary_requirements, allergy_notes, accessibility_needs, household_id, wedding_party_role, relationship_label)').eq('plan_id', planId);
        const { data: allGuestsData } = await supabase.from('guests').select('id, full_name, guest_type').eq('wedding_id', weddingId).eq('status', 'active').in('rsvp_status', ['accepted', 'pending']);

        const tables = (tablesData || []) as SeatingTable[];
        const seats = (seatsData || []) as Array<{ id: string; seating_table_id: string; seat_label: string | null; seat_number: number | null; seat_status: string }>;
        const assignments = (assignsData || []) as GuestSeating[];
        const allGuests = (allGuestsData || []) as GuestInfo[];

        const seatedGuestIds = new Set(assignments.map((a) => a.guest_id));
        const unseated = allGuests.filter((g) => !seatedGuestIds.has(g.id));

        const rd: ReportData = {
          plan: { id: p.id, name: p.name, event_type: p.event_type, room_name: p.room_name, status: p.status, revision: p.revision, updated_at: p.updated_at },
          wedding: (weddingData as { id: string; partner_one_name: string; partner_two_name: string } | null) || { id: '', partner_one_name: '', partner_two_name: '' },
          generated_at: new Date().toISOString(),
          tables: tables.map((t) => {
            const tableAssigns = assignments.filter((a) => a.table_id === t.id);
            const tableSeats = seats.filter((s) => s.seating_table_id === t.id);
            return {
              id: t.id, table_number: t.table_number, name: t.name, shape: t.shape, zone: t.zone,
              capacity: t.capacity, seated_count: tableAssigns.length,
              assignments: tableAssigns.map((a) => {
                const seat = tableSeats.find((s) => s.id === a.seating_seat_id);
                return {
                  guest_id: a.guest_id, guest_name: a.guests?.full_name || '', guest_type: a.guests?.guest_type || '',
                  seat_label: seat?.seat_label || null, seat_number: seat?.seat_number || null,
                  meal_choice: a.guests?.meal_choice || null, dietary_requirements: a.guests?.dietary_requirements || null,
                  allergy_notes: a.guests?.allergy_notes || null, accessibility_needs: a.guests?.accessibility_needs || null,
                  household_id: a.guests?.household_id || null, wedding_party_role: a.guests?.wedding_party_role || null,
                  relationship_label: a.guests?.relationship_label || null,
                };
              }),
            };
          }),
          unseated: unseated.map((g) => ({ id: g.id, full_name: g.full_name, guest_type: g.guest_type })),
          totals: {} as ReportData['totals'],
        };
        rd.totals = { guests: allGuests.length, seated: assignments.length, unseated: unseated.length, capacity: tables.reduce((s, t) => s + t.capacity, 0), tables: tables.length };
        setReportData(rd);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, [weddingId, planId]);

  const filteredCards = useMemo(() => REPORT_CARDS, []);

  const printReport = () => window.print();

  if (weddingLoading || loading) {
    return <AppShell><div className="h-[calc(100vh-80px)] flex items-center justify-center"><i className="ri-loader-4-line animate-spin text-xl text-foreground-400" /></div></AppShell>;
  }
  if (!plan || !reportData) {
    return <AppShell><div className="h-[calc(100vh-80px)] flex flex-col items-center justify-center"><p className="text-sm text-foreground-500 mb-4">Report data not available</p><button onClick={() => navigate('/app/seating')} className="btn-outline text-xs py-2 cursor-pointer whitespace-nowrap">Back</button></div></AppShell>;
  }

  const { wedding } = reportData;

  if (viewMode === 'report' && activeReport) {
    const report = REPORT_CARDS.find((r) => r.id === activeReport);
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto px-4 py-6 print:px-0 print:py-0" id="report-print">
          <div className="flex items-center justify-between mb-6 no-print">
            <div>
              <button onClick={() => { setActiveReport(null); setViewMode('grid'); }} className="text-xs text-foreground-500 hover:text-foreground-700 cursor-pointer mb-2 whitespace-nowrap"><i className="ri-arrow-left-line mr-1" />Back to reports</button>
              <h1 className="font-heading text-xl text-foreground-900">{report?.title}</h1>
              <p className="text-xs text-foreground-500">{EVENT_TYPE_LABELS[plan.event_type]} · {plan.room_name || plan.name} · {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
            <button onClick={printReport} className="btn-outline text-xs py-2 cursor-pointer whitespace-nowrap"><i className="ri-printer-line mr-1.5" />Print</button>
          </div>
          <div className="print:block">
            <div className="mb-6 print:mb-4">
              <h2 className="font-heading text-base text-foreground-900 print:text-sm">{wedding.partner_one_name} & {wedding.partner_two_name}</h2>
              <p className="text-xs text-foreground-500">Plan: {plan.name} · Revision {plan.revision} · {plan.status === 'published' ? 'FINAL' : plan.status === 'draft' ? 'DRAFT' : ''}</p>
            </div>

            {report?.id === 'guest_by_table' && <GuestByTableReport data={reportData} />}
            {report?.id === 'alphabetical' && <AlphabeticalReport data={reportData} />}
            {report?.id === 'occupancy' && <OccupancyReport data={reportData} />}
            {report?.id === 'meal' && <MealReport data={reportData} />}
            {report?.id === 'accessibility' && <AccessibilityReport data={reportData} />}
            {report?.id === 'children' && <ChildrenReport data={reportData} />}
            {report?.id === 'suppliers' && <SuppliersReport data={reportData} />}
            {report?.id === 'unseated' && <UnseatedReport data={reportData} />}
            {report?.id === 'conflicts' && <ConflictsSummary reportData={reportData} planId={planId!} weddingId={weddingId!} />}
            {report?.id === 'venue_setup' && <VenueSetupReport data={reportData} />}
            {report?.id === 'inventory' && <InventoryReport data={reportData} />}
            {report?.id === 'coordinator_pack' && <CoordinatorPack data={reportData} />}
            {report?.id === 'version_changes' && <VersionChangesReport planId={planId!} weddingId={weddingId!} />}
          </div>
        </div>
      </AppShell>
    );
  }

  const categories = [...new Set(filteredCards.map((c) => c.category))];

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <button onClick={() => navigate(`/app/seating/plans/${planId}`)} className="text-xs text-foreground-500 hover:text-foreground-700 cursor-pointer mb-2 whitespace-nowrap"><i className="ri-arrow-left-line mr-1" />Back to workspace</button>
          <h1 className="font-heading text-2xl text-foreground-900 mb-1">Reports</h1>
          <p className="text-sm text-foreground-500">{plan.name} · {EVENT_TYPE_LABELS[plan.event_type]} · Revision {plan.revision}</p>
        </div>

        {categories.map((cat) => (
          <div key={cat} className="mb-8">
            <h2 className="font-label text-xs font-semibold text-foreground-400 uppercase tracking-wide mb-3">{cat}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCards.filter((c) => c.category === cat).map((card) => (
                <button
                  key={card.id}
                  onClick={() => { setActiveReport(card.id); setViewMode('report'); }}
                  className="card-default text-left hover:border-primary-300 transition-colors cursor-pointer group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-lg bg-background-100 text-foreground-500 group-hover:bg-primary-50 group-hover:text-primary-600 transition-colors">
                      <i className={`${card.icon} text-sm`} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-label text-sm font-semibold text-foreground-900 mb-0.5">{card.title}</h3>
                      <p className="text-xs text-foreground-500 leading-relaxed">{card.description}</p>
                      {card.sensitive && (
                        <span className="inline-block mt-1.5 px-1.5 py-0.5 rounded text-[9px] font-label bg-amber-50 text-amber-600">Contains restricted data</span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}

// ── Report components ──

function GuestByTableReport({ data }: { data: ReportData }) {
  return (
    <div className="space-y-6">
      {data.tables.map((table) => (
        <div key={table.id} className="border border-secondary-200 rounded-lg p-4 break-inside-avoid">
          <div className="flex items-center gap-3 mb-3">
            <span className="font-heading text-base font-bold text-foreground-900">Table {table.table_number || table.name}</span>
            <span className="text-xs text-foreground-500">{table.name}</span>
            {table.zone && <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary-50 text-secondary-600">{table.zone}</span>}
            <span className="text-xs text-foreground-400 ml-auto">{table.seated_count}/{table.capacity} seated</span>
          </div>
          {table.assignments.length === 0 ? (
            <p className="text-xs text-foreground-400 italic">No guests assigned</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-foreground-400 border-b border-secondary-100">
                  <th className="pb-1.5 font-label font-medium">Seat</th><th className="pb-1.5 font-label font-medium">Guest</th><th className="pb-1.5 font-label font-medium">Meal</th><th className="pb-1.5 font-label font-medium hidden sm:table-cell">Dietary</th>
                </tr>
              </thead>
              <tbody>
                {table.assignments.map((a, i) => (
                  <tr key={i} className="border-b border-secondary-50 last:border-0">
                    <td className="py-1.5 text-foreground-400">{a.seat_label || a.seat_number || '-'}</td>
                    <td className="py-1.5 font-label font-medium text-foreground-900">{a.guest_name}</td>
                    <td className="py-1.5 text-foreground-600">{a.meal_choice || '-'}</td>
                    <td className="py-1.5 hidden sm:table-cell">
                      {a.dietary_requirements || a.allergy_notes ? (
                        <span className="text-amber-600"><i className="ri-error-warning-line text-[10px] mr-1" />{a.dietary_requirements || a.allergy_notes}</span>
                      ) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}
    </div>
  );
}

function AlphabeticalReport({ data }: { data: ReportData }) {
  const allGuests = data.tables.flatMap((t) => t.assignments.map((a) => ({ ...a, table_number: t.table_number, table_name: t.name })));
  allGuests.sort((a, b) => a.guest_name.localeCompare(b.guest_name));

  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-left text-foreground-400 border-b border-secondary-200">
          <th className="pb-2 font-label font-medium">Guest</th><th className="pb-2 font-label font-medium">Table</th><th className="pb-2 font-label font-medium">Seat</th><th className="pb-2 font-label font-medium hidden sm:table-cell">Type</th>
        </tr>
      </thead>
      <tbody>
        {allGuests.map((g, i) => (
          <tr key={i} className="border-b border-secondary-50">
            <td className="py-1.5 font-label font-medium text-foreground-900">{g.guest_name}</td>
            <td className="py-1.5 text-foreground-600">Table {g.table_number || g.table_name}</td>
            <td className="py-1.5 text-foreground-400">{g.seat_label || '-'}</td>
            <td className="py-1.5 hidden sm:table-cell text-foreground-500">{g.guest_type}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function OccupancyReport({ data }: { data: ReportData }) {
  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[{ label: 'Total guests', value: data.totals.guests }, { label: 'Seated', value: data.totals.seated }, { label: 'Unseated', value: data.totals.unseated }, { label: 'Total capacity', value: data.totals.capacity }].map((s) => (
          <div key={s.label} className="bg-background-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-heading font-bold text-foreground-900">{s.value}</p>
            <p className="text-[10px] text-foreground-400 font-label">{s.label}</p>
          </div>
        ))}
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-foreground-400 border-b border-secondary-200">
            <th className="pb-2 font-label font-medium">Table</th><th className="pb-2 font-label font-medium">Capacity</th><th className="pb-2 font-label font-medium">Seated</th><th className="pb-2 font-label font-medium">Free</th><th className="pb-2 font-label font-medium">Fill</th>
          </tr>
        </thead>
        <tbody>
          {data.tables.map((t) => {
            const pct = t.capacity > 0 ? Math.round((t.seated_count / t.capacity) * 100) : 0;
            return (
              <tr key={t.id} className="border-b border-secondary-50">
                <td className="py-1.5 font-label font-medium text-foreground-900">Table {t.table_number || t.name}</td>
                <td className="py-1.5 text-foreground-600">{t.capacity}</td>
                <td className="py-1.5 text-foreground-600">{t.seated_count}</td>
                <td className="py-1.5 text-foreground-400">{t.capacity - t.seated_count}</td>
                <td className="py-1.5">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-secondary-100"><div className={`h-full rounded-full ${pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(pct, 100)}%` }} /></div>
                    <span className="text-foreground-500 w-8 text-right">{pct}%</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function MealReport({ data }: { data: ReportData }) {
  const allAssigns = data.tables.flatMap((t) => t.assignments.map((a) => ({ ...a, table_number: t.table_number })));
  const mealCounts: Record<string, number> = {};
  allAssigns.forEach((a) => { const m = a.meal_choice || 'Unknown'; mealCounts[m] = (mealCounts[m] || 0) + 1; });

  return (
    <div>
      <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
        <strong className="font-label">Important:</strong> Confirm all allergy and dietary information directly with the caterer and guest before the event.
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {Object.entries(mealCounts).map(([meal, count]) => (
          <div key={meal} className="bg-background-50 rounded-lg p-3 text-center"><p className="text-xl font-heading font-bold text-foreground-900">{count}</p><p className="text-[10px] text-foreground-400 font-label">{meal}</p></div>
        ))}
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-foreground-400 border-b border-secondary-200">
            <th className="pb-2 font-label font-medium">Guest</th><th className="pb-2 font-label font-medium">Table</th><th className="pb-2 font-label font-medium">Meal</th><th className="pb-2 font-label font-medium">Dietary / Allergy</th>
          </tr>
        </thead>
        <tbody>
          {allAssigns.filter((a) => a.meal_choice || a.dietary_requirements || a.allergy_notes).map((a, i) => (
            <tr key={i} className="border-b border-secondary-50">
              <td className="py-1.5 font-label font-medium text-foreground-900">{a.guest_name}</td>
              <td className="py-1.5 text-foreground-600">Table {a.table_number}</td>
              <td className="py-1.5 text-foreground-600">{a.meal_choice || '-'}</td>
              <td className="py-1.5">{a.dietary_requirements || a.allergy_notes ? <span className="text-amber-600">{a.dietary_requirements || a.allergy_notes}</span> : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AccessibilityReport({ data }: { data: ReportData }) {
  const relevant = data.tables.flatMap((t) => t.assignments.filter((a) => a.accessibility_needs).map((a) => ({ ...a, table_number: t.table_number, table_name: t.name })));
  return relevant.length === 0 ? <p className="text-sm text-foreground-400">No accessibility requirements recorded.</p> : (
    <table className="w-full text-xs">
      <thead><tr className="text-left text-foreground-400 border-b border-secondary-200"><th className="pb-2 font-label font-medium">Guest</th><th className="pb-2 font-label font-medium">Table</th><th className="pb-2 font-label font-medium">Seat</th><th className="pb-2 font-label font-medium">Requirement</th></tr></thead>
      <tbody>{relevant.map((a, i) => (<tr key={i} className="border-b border-secondary-50"><td className="py-1.5 font-label font-medium text-foreground-900">{a.guest_name}</td><td className="py-1.5 text-foreground-600">Table {a.table_number}</td><td className="py-1.5 text-foreground-400">{a.seat_label || '-'}</td><td className="py-1.5 text-foreground-700">{a.accessibility_needs}</td></tr>))}</tbody>
    </table>
  );
}

function ChildrenReport({ data }: { data: ReportData }) {
  const children = data.tables.flatMap((t) => t.assignments.filter((a) => a.guest_type === 'child' || a.guest_type === 'infant').map((a) => ({ ...a, table_number: t.table_number })));
  return children.length === 0 ? <p className="text-sm text-foreground-400">No children seated.</p> : (
    <table className="w-full text-xs">
      <thead><tr className="text-left text-foreground-400 border-b border-secondary-200"><th className="pb-2 font-label font-medium">Guest</th><th className="pb-2 font-label font-medium">Table</th><th className="pb-2 font-label font-medium">Type</th></tr></thead>
      <tbody>{children.map((c, i) => (<tr key={i} className="border-b border-secondary-50"><td className="py-1.5 font-label font-medium text-foreground-900">{c.guest_name}</td><td className="py-1.5 text-foreground-600">Table {c.table_number}</td><td className="py-1.5 text-foreground-500 capitalize">{c.guest_type}</td></tr>))}</tbody>
    </table>
  );
}

function SuppliersReport({ data }: { data: ReportData }) {
  const suppliers = data.tables.flatMap((t) => t.assignments.filter((a) => a.guest_type === 'supplier').map((a) => ({ ...a, table_number: t.table_number })));
  return suppliers.length === 0 ? <p className="text-sm text-foreground-400">No supplier guests seated.</p> : (
    <table className="w-full text-xs">
      <thead><tr className="text-left text-foreground-400 border-b border-secondary-200"><th className="pb-2 font-label font-medium">Guest</th><th className="pb-2 font-label font-medium">Table</th><th className="pb-2 font-label font-medium">Seat</th></tr></thead>
      <tbody>{suppliers.map((s, i) => (<tr key={i} className="border-b border-secondary-50"><td className="py-1.5 font-label font-medium text-foreground-900">{s.guest_name}</td><td className="py-1.5 text-foreground-600">Table {s.table_number}</td><td className="py-1.5 text-foreground-400">{s.seat_label || '-'}</td></tr>))}</tbody>
    </table>
  );
}

function UnseatedReport({ data }: { data: ReportData }) {
  return data.unseated.length === 0 ? <p className="text-sm text-emerald-600"><i className="ri-check-line mr-1" />All guests are seated.</p> : (
    <table className="w-full text-xs">
      <thead><tr className="text-left text-foreground-400 border-b border-secondary-200"><th className="pb-2 font-label font-medium">Guest</th><th className="pb-2 font-label font-medium">Type</th></tr></thead>
      <tbody>{data.unseated.map((g) => (<tr key={g.id} className="border-b border-secondary-50"><td className="py-1.5 font-label font-medium text-foreground-900">{g.full_name}</td><td className="py-1.5 text-foreground-500 capitalize">{g.guest_type}</td></tr>))}</tbody>
    </table>
  );
}

function ConflictsSummary({ reportData, planId, weddingId }: { reportData: ReportData; planId: string; weddingId: string }) {
  const [conflicts, setConflicts] = useState<Array<{ id: string; summary: string; severity: string }>>([]);
  useEffect(() => {
    supabase.from('seating_conflicts').select('id, summary, severity').eq('seating_plan_id', planId).eq('wedding_id', weddingId).in('status', ['open', 'reviewed']).then(({ data }) => { if (data) setConflicts(data as Array<{ id: string; summary: string; severity: string }>); });
  }, [planId, weddingId]);
  return conflicts.length === 0 ? <p className="text-sm text-emerald-600"><i className="ri-check-line mr-1" />No unresolved conflicts.</p> : (
    <div className="space-y-2">{conflicts.map((c) => (<div key={c.id} className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs"><i className="ri-error-warning-line text-red-500 flex-shrink-0 mt-0.5" /><div><p className="text-red-700 font-label">{c.summary}</p><p className="text-red-400 mt-0.5 capitalize">{c.severity}</p></div></div>))}</div>
  );
}

function VenueSetupReport({ data }: { data: ReportData }) {
  return (
    <div className="space-y-4">
      <div className="bg-background-50 rounded-lg p-4">
        <h3 className="font-label text-sm font-semibold text-foreground-900 mb-2">Room: {data.plan.room_name || data.plan.name}</h3>
        <p className="text-xs text-foreground-500">{data.totals.tables} tables · {data.totals.capacity} chairs · {data.totals.seated} guests seated</p>
      </div>
      <table className="w-full text-xs">
        <thead><tr className="text-left text-foreground-400 border-b border-secondary-200"><th className="pb-2 font-label font-medium">Table</th><th className="pb-2 font-label font-medium">Shape</th><th className="pb-2 font-label font-medium">Chairs</th><th className="pb-2 font-label font-medium">Zone</th></tr></thead>
        <tbody>{data.tables.map((t) => (<tr key={t.id} className="border-b border-secondary-50"><td className="py-1.5 font-label font-medium text-foreground-900">Table {t.table_number || t.name}</td><td className="py-1.5 text-foreground-600 capitalize">{t.shape.replace('_', ' ')}</td><td className="py-1.5 text-foreground-600">{t.capacity}</td><td className="py-1.5 text-foreground-400">{t.zone || '-'}</td></tr>))}</tbody>
      </table>
      <div className="bg-background-50 rounded-lg p-4">
        <h3 className="font-label text-sm font-semibold text-foreground-900 mb-2">Setup checklist</h3>
        <div className="space-y-1.5">{['Verify table positions match the floor plan', 'Check chair count per table', 'Confirm accessible route clearance', 'Check emergency exit access', 'Verify dance floor and stage positions', 'Confirm bar and buffet locations', 'Check supplier table setup'].map((item, i) => (<label key={i} className="flex items-center gap-2 text-xs text-foreground-700 cursor-pointer"><input type="checkbox" className="rounded border-secondary-300" /><span>{item}</span></label>))}</div>
      </div>
    </div>
  );
}

function InventoryReport({ data }: { data: ReportData }) {
  const shapeCounts: Record<string, number> = {};
  data.tables.forEach((t) => { shapeCounts[t.shape] = (shapeCounts[t.shape] || 0) + 1; });
  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <div className="bg-background-50 rounded-lg p-3 text-center"><p className="text-xl font-heading font-bold text-foreground-900">{data.totals.tables}</p><p className="text-[10px] text-foreground-400 font-label">Tables</p></div>
        <div className="bg-background-50 rounded-lg p-3 text-center"><p className="text-xl font-heading font-bold text-foreground-900">{data.totals.capacity}</p><p className="text-[10px] text-foreground-400 font-label">Total chairs</p></div>
        <div className="bg-background-50 rounded-lg p-3 text-center"><p className="text-xl font-heading font-bold text-foreground-900">{data.totals.seated}</p><p className="text-[10px] text-foreground-400 font-label">Seated</p></div>
      </div>
      <table className="w-full text-xs">
        <thead><tr className="text-left text-foreground-400 border-b border-secondary-200"><th className="pb-2 font-label font-medium">Shape</th><th className="pb-2 font-label font-medium">Count</th></tr></thead>
        <tbody>{Object.entries(shapeCounts).map(([shape, count]) => (<tr key={shape} className="border-b border-secondary-50"><td className="py-1.5 text-foreground-600 capitalize">{shape.replace('_', ' ')}</td><td className="py-1.5 font-label font-medium text-foreground-900">{count}</td></tr>))}</tbody>
      </table>
    </div>
  );
}

function CoordinatorPack({ data }: { data: ReportData }) {
  return (
    <div className="space-y-8">
      <GuestByTableReport data={data} />
      <div className="border-t border-secondary-200 pt-6"><h3 className="font-heading text-base text-foreground-900 mb-4">Alphabetical guest list</h3><AlphabeticalReport data={data} /></div>
      <div className="border-t border-secondary-200 pt-6"><h3 className="font-heading text-base text-foreground-900 mb-4">Meals & dietary</h3><MealReport data={data} /></div>
      <div className="border-t border-secondary-200 pt-6"><h3 className="font-heading text-base text-foreground-900 mb-4">Accessibility</h3><AccessibilityReport data={data} /></div>
      <div className="border-t border-secondary-200 pt-6"><h3 className="font-heading text-base text-foreground-900 mb-4">Venue setup</h3><VenueSetupReport data={data} /></div>
    </div>
  );
}

function VersionChangesReport({ planId, weddingId }: { planId: string; weddingId: string }) {
  const [versions, setVersions] = useState<Array<{ version_number: number; label: string | null; created_at: string }>>([]);
  useEffect(() => {
    supabase.from('seating_plan_versions').select('version_number, label, created_at').eq('seating_plan_id', planId).eq('wedding_id', weddingId).order('version_number', { ascending: false }).limit(2).then(({ data }) => { if (data) setVersions(data as Array<{ version_number: number; label: string | null; created_at: string }>); });
  }, [planId, weddingId]);
  return versions.length < 2 ? <p className="text-sm text-foreground-400">Only one version exists. No changes to compare.</p> : (
    <div className="space-y-3">
      <div className="bg-background-50 rounded-lg p-4">
        <p className="text-xs text-foreground-500">Comparing:</p>
        <div className="flex items-center gap-2 mt-1 text-sm">
          <span className="font-label font-medium text-foreground-900">v{versions[1].version_number}</span>
          <i className="ri-arrow-right-line text-foreground-400" />
          <span className="font-label font-medium text-foreground-900">v{versions[0].version_number}</span>
        </div>
        <p className="text-xs text-foreground-400 mt-1">{versions[0].label || 'Current'} · {new Date(versions[0].created_at).toLocaleDateString('en-GB')}</p>
      </div>
      <p className="text-xs text-foreground-500">For detailed guest-level changes, compare versions on the Versions page.</p>
    </div>
  );
}