import { useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import AppShell from '@/components/feature/AppShell';
import { useWeddingCalendar } from '@/hooks/useWeddingCalendar';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { isDemoMode } from '@/demo/demoConfig';
import { useDemoDataSafe } from '@/demo/useDemoDataSafe';
import type { CalendarItem, CalendarView, CalendarSource, ConflictWarning } from '@/types/calendar';
import { CALENDAR_SOURCE_LABELS, CALENDAR_SOURCE_ICONS } from '@/types/calendar';

// ── Helpers ──

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function firstDayOfMonth(year: number, month: number): number {
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1;
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function formatTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function addMonths(y: number, m: number, n: number): [number, number] {
  const total = y * 12 + m + n;
  return [Math.floor(total / 12), total % 12];
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function weekStart(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d.toISOString().slice(0, 10);
}

// ── Conflict Panel ──

function ConflictPanel({ conflicts, items }: { conflicts: ConflictWarning[]; items: CalendarItem[] }) {
  if (conflicts.length === 0) return null;

  const critical = conflicts.filter((c) => c.severity === 'critical');
  const high = conflicts.filter((c) => c.severity === 'high');

  const severityColors: Record<string, string> = {
    critical: 'border-red-200 bg-red-50 text-red-700',
    high: 'border-amber-200 bg-amber-50 text-amber-700',
    medium: 'border-sky-200 bg-sky-50 text-sky-700',
    low: 'border-secondary-200 bg-secondary-50 text-secondary-600',
  };

  return (
    <div className="mb-6 space-y-1.5">
      {critical.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-red-200 bg-red-50 text-xs text-red-700">
          <i className="ri-error-warning-line text-sm" />
          <span className="font-semibold">{critical.length} critical</span>
          <span className="text-red-500">{critical[0].message}</span>
        </div>
      )}
      {high.length > 0 && (
        <details className="group">
          <summary className="flex items-center gap-2 px-3 py-2 rounded-lg border border-amber-200 bg-amber-50 text-xs text-amber-700 cursor-pointer">
            <i className="ri-alert-line text-sm" />
            <span className="font-semibold">{high.length} warning{high.length !== 1 ? 's' : ''}</span>
            <i className="ri-arrow-down-s-line ml-auto group-open:rotate-180 transition-transform" />
          </summary>
          <div className="mt-1 space-y-1 pl-8">
            {high.map((c) => (
              <p key={c.id} className="text-xs text-amber-700">{c.message}</p>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

// ── Source Legend ──

function SourceLegend({ activeSources, onToggle }: { activeSources: CalendarSource[]; onToggle: (s: CalendarSource) => void }) {
  const allSources: CalendarSource[] = ['wedding_event', 'task', 'supplier_appointment', 'supplier_deadline', 'budget_payment', 'rsvp_deadline'];

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {allSources.map((s) => (
        <button
          key={s}
          onClick={() => onToggle(s)}
          className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-label transition-colors cursor-pointer whitespace-nowrap ${
            activeSources.includes(s)
              ? 'bg-primary-100 text-primary-700 border border-primary-200'
              : 'bg-secondary-100 text-foreground-400 border border-secondary-200'
          }`}
        >
          <i className={`${CALENDAR_SOURCE_ICONS[s]} text-[9px]`} />
          {CALENDAR_SOURCE_LABELS[s]}
        </button>
      ))}
    </div>
  );
}

// ── Month View ──

function MonthView({
  year, month, items, selectedDate, onSelectDate, onNavigate,
}: {
  year: number; month: number; items: CalendarItem[]; selectedDate: string | null; onSelectDate: (d: string) => void;
  onNavigate: (dir: number) => void;
}) {
  const firstDay = firstDayOfMonth(year, month);
  const totalDays = daysInMonth(year, month);
  const today = todayStr();

  const byDate = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const item of items) {
      if (!item.date) continue;
      const existing = map.get(item.date) || [];
      existing.push(item);
      map.set(item.date, existing);
    }
    return map;
  }, [items]);

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let i = 1; i <= totalDays; i++) cells.push(i);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-heading text-lg text-foreground-900">{MONTHS[month]} {year}</h2>
        <div className="flex items-center gap-1">
          <button onClick={() => onNavigate(-1)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-background-100 text-foreground-500 cursor-pointer whitespace-nowrap">
            <i className="ri-arrow-left-s-line" />
          </button>
          <button onClick={() => onNavigate(0)} className="px-3 py-1.5 text-xs font-label text-primary-600 hover:bg-primary-50 rounded-lg cursor-pointer whitespace-nowrap">Today</button>
          <button onClick={() => onNavigate(1)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-background-100 text-foreground-500 cursor-pointer whitespace-nowrap">
            <i className="ri-arrow-right-s-line" />
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS_SHORT.map((d) => (
          <div key={d} className="text-center text-[10px] font-label text-foreground-400 py-1.5">{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 border-t border-l border-secondary-200 rounded-lg overflow-hidden">
        {cells.map((day, i) => {
          const dateStr = day ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : '';
          const dayItems = dateStr ? (byDate.get(dateStr) || []) : [];
          const isToday = dateStr === today;
          const isSelected = dateStr === selectedDate;
          const isWeekend = i % 7 >= 5;

          return (
            <div
              key={i}
              onClick={() => day && onSelectDate(dateStr)}
              className={`min-h-[80px] border-r border-b border-secondary-200 p-1.5 ${
                !day ? 'bg-background-50' : isWeekend ? 'bg-background-50/50' : 'bg-white'
              } ${isSelected ? 'ring-2 ring-primary-400 ring-inset' : ''} ${day ? 'cursor-pointer hover:bg-primary-50/30' : ''}`}
            >
              {day && (
                <>
                  <span className={`text-xs font-label inline-flex items-center justify-center rounded-full w-5 h-5 ${
                    isToday ? 'bg-primary-500 text-white font-semibold' : 'text-foreground-600'
                  }`}>{day}</span>
                  <div className="mt-0.5 space-y-0.5">
                    {dayItems.slice(0, 3).map((item) => (
                      <div
                        key={item.id}
                        className={`text-[9px] px-1 py-0.5 rounded truncate ${
                          item.source === 'wedding_event' ? 'bg-primary-100 text-primary-700' :
                          item.source === 'task' ? 'bg-amber-100 text-amber-700' :
                          item.source === 'budget_payment' ? 'bg-red-100 text-red-700' :
                          'bg-secondary-100 text-secondary-700'
                        } ${item.status === 'completed' || item.status === 'paid' ? 'opacity-50' : ''}`}
                      >
                        {item.startTime && <span className="mr-0.5">{item.startTime}</span>}
                        {item.title}
                      </div>
                    ))}
                    {dayItems.length > 3 && (
                      <p className="text-[9px] text-foreground-400 pl-1">+{dayItems.length - 3} more</p>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Week View ──

function WeekView({
  weekStart, items, selectedDate, onSelectDate, onNavigate,
}: {
  weekStart: string; items: CalendarItem[]; selectedDate: string | null; onSelectDate: (d: string) => void;
  onNavigate: (dir: number) => void;
}) {
  const today = todayStr();
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const byDate = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const item of items) {
      if (!item.date) continue;
      const existing = map.get(item.date) || [];
      existing.push(item);
      map.set(item.date, existing);
    }
    return map;
  }, [items]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-heading text-lg text-foreground-900">
          {new Date(weekStart + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })} – {new Date(days[6] + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
        </h2>
        <div className="flex items-center gap-1">
          <button onClick={() => onNavigate(-1)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-background-100 text-foreground-500 cursor-pointer whitespace-nowrap">
            <i className="ri-arrow-left-s-line" />
          </button>
          <button onClick={() => onNavigate(0)} className="px-3 py-1.5 text-xs font-label text-primary-600 hover:bg-primary-50 rounded-lg cursor-pointer whitespace-nowrap">Today</button>
          <button onClick={() => onNavigate(1)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-background-100 text-foreground-500 cursor-pointer whitespace-nowrap">
            <i className="ri-arrow-right-s-line" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {days.map((dateStr, di) => {
          const dayItems = byDate.get(dateStr) || [];
          const isToday = dateStr === today;
          const d = new Date(dateStr + 'T12:00:00');
          const dayLabel = d.toLocaleDateString('en-GB', { weekday: 'short' });
          const dayNum = d.getDate();

          return (
            <div
              key={dateStr}
              onClick={() => onSelectDate(dateStr)}
              className={`rounded-xl border p-2 min-h-[120px] cursor-pointer transition-colors ${
                selectedDate === dateStr ? 'border-primary-400 ring-1 ring-primary-200' : 'border-secondary-200 hover:border-secondary-300'
              } ${isToday ? 'bg-primary-50/30' : 'bg-white'}`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-label text-foreground-500">{dayLabel}</span>
                <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-primary-500 text-white' : 'text-foreground-800'}`}>{dayNum}</span>
              </div>
              <div className="space-y-1">
                {dayItems.map((item) => (
                  <div
                    key={item.id}
                    className={`text-[9px] px-1.5 py-1 rounded leading-tight ${
                      item.source === 'wedding_event' ? 'bg-primary-100 text-primary-700' :
                      item.source === 'task' ? 'bg-amber-100 text-amber-700' :
                      item.source === 'budget_payment' ? 'bg-red-100 text-red-700' :
                      'bg-secondary-100 text-secondary-700'
                    }`}
                  >
                    <span className="font-semibold">{item.title}</span>
                    {item.startTime && <span className="ml-1 opacity-75">{item.startTime}</span>}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Agenda View ──

function AgendaView({ items }: { items: CalendarItem[] }) {
  const byDate = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const item of items) {
      if (!item.date) continue;
      const existing = map.get(item.date) || [];
      existing.push(item);
      map.set(item.date, existing);
    }
    const sorted = Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
    return sorted;
  }, [items]);

  if (byDate.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="w-14 h-14 mx-auto flex items-center justify-center rounded-full bg-background-100 text-foreground-300 mb-4">
          <i className="ri-calendar-2-line text-xl" />
        </div>
        <p className="text-sm text-foreground-500 mb-2">No items to show</p>
        <p className="text-xs text-foreground-400">Try enabling more sources or adjusting your filters</p>
      </div>
    );
  }

  const sourceBg: Record<string, string> = {
    wedding_event: 'bg-primary-100 text-primary-700',
    task: 'bg-amber-100 text-amber-700',
    budget_payment: 'bg-red-100 text-red-700',
    supplier_appointment: 'bg-secondary-100 text-secondary-700',
    supplier_deadline: 'bg-secondary-100 text-secondary-700',
  };

  return (
    <div className="space-y-8">
      {byDate.map(([dateStr, dayItems]) => (
        <div key={dateStr}>
          <h3 className="font-heading text-base text-foreground-900 mb-3 sticky top-0 bg-white py-2 z-10">{formatDateLabel(dateStr)}</h3>
          <div className="space-y-2">
            {dayItems.map((item) => (
              <div key={item.id} className={`flex items-start gap-3 p-3 rounded-xl bg-white border border-secondary-200 hover:border-secondary-300 transition-colors ${item.status === 'completed' || item.status === 'paid' ? 'opacity-50' : ''}`}>
                <div className={`w-8 h-8 flex items-center justify-center rounded-lg flex-shrink-0 ${sourceBg[item.source] || 'bg-secondary-100 text-secondary-600'}`}>
                  <i className={`${CALENDAR_SOURCE_ICONS[item.source]} text-sm`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <p className="text-sm font-label font-semibold text-foreground-900">{item.title}</p>
                    {item.priority && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-label ${
                        item.priority === 'high' ? 'bg-red-100 text-red-700' : item.priority === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-secondary-100 text-secondary-600'
                      }`}>{item.priority}</span>
                    )}
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary-100 text-secondary-600 font-label">{CALENDAR_SOURCE_LABELS[item.source]}</span>
                  </div>
                  {item.description && <p className="text-xs text-foreground-500 mb-1 line-clamp-2">{item.description}</p>}
                  <div className="flex items-center gap-3 flex-wrap text-[10px] text-foreground-400">
                    {item.startTime && <span><i className="ri-time-line mr-0.5" />{item.startTime}{item.endTime ? ` – ${item.endTime}` : ''}</span>}
                    {item.location && <span><i className="ri-map-pin-line mr-0.5" />{item.location}</span>}
                    {item.assignee && <span><i className="ri-user-line mr-0.5" />{item.assignee}</span>}
                  </div>
                </div>
                {item.linkRoute && (
                  <a href={item.linkRoute} className="w-7 h-7 flex items-center justify-center rounded-lg text-foreground-400 hover:text-primary-600 hover:bg-primary-50 flex-shrink-0 cursor-pointer" title="Open source">
                    <i className="ri-arrow-right-up-line text-sm" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Day Summary Sheet ──

function DaySummary({ date, items, onClose }: { date: string; items: CalendarItem[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[70vh] overflow-hidden flex flex-col shadow-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-secondary-100 flex-shrink-0">
          <h3 className="font-heading text-base text-foreground-900">{formatDateLabel(date)}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-400 hover:bg-background-100 cursor-pointer">
            <i className="ri-close-line" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-2">
          {items.length === 0 ? (
            <p className="text-sm text-foreground-400 text-center py-8">Nothing scheduled</p>
          ) : (
            items.map((item) => (
              <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg bg-background-50 border border-background-200">
                <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-primary-100 text-primary-600 flex-shrink-0">
                  <i className={`${CALENDAR_SOURCE_ICONS[item.source]} text-xs`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-label font-semibold text-foreground-900">{item.title}</p>
                  {item.startTime && <p className="text-[10px] text-foreground-500 mt-0.5">{item.startTime}{item.endTime ? ` – ${item.endTime}` : ''}</p>}
                  {item.description && <p className="text-[10px] text-foreground-400 mt-0.5 line-clamp-2">{item.description}</p>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// Demo Calendar Helpers (re-exports from useWeddingCalendar for demo)
// ═══════════════════════════════════════════
// The useWeddingCalendar hook handles demo mode internally, so this page
// is the same for both demo and production modes.

// ── Main Calendar Page ──

export default function CalendarPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { wedding } = useActiveWedding();
  const demo = useDemoDataSafe();
  const demoMode = isDemoMode && !!demo;

  const calendar = useWeddingCalendar();

  // View state from URL
  const view = (searchParams.get('view') as CalendarView) || 'month';
  const urlDate = searchParams.get('date');
  const todayD = new Date();
  const [navYear, navMonth] = urlDate
    ? [parseInt(urlDate.slice(0, 4)), parseInt(urlDate.slice(5, 7)) - 1]
    : [todayD.getFullYear(), todayD.getMonth()];

  const [year, setYear] = useState(navYear);
  const [month, setMonth] = useState(navMonth);
  const [weekStartStr, setWeekStartStr] = useState(weekStart(todayStr()));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [daySummaryDate, setDaySummaryDate] = useState<string | null>(null);

  const setView = (v: CalendarView) => {
    const p = new URLSearchParams(searchParams);
    p.set('view', v);
    setSearchParams(p);
  };

  const handleNavigate = (dir: number) => {
    if (view === 'month') {
      if (dir === 0) {
        setYear(todayD.getFullYear());
        setMonth(todayD.getMonth());
      } else {
        const [ny, nm] = addMonths(year, month, dir);
        setYear(ny);
        setMonth(nm);
      }
    } else if (view === 'week') {
      if (dir === 0) {
        setWeekStartStr(weekStart(todayStr()));
      } else {
        setWeekStartStr(addDays(weekStartStr, dir * 7));
      }
    }
  };

  const handleSelectDate = (dateStr: string) => {
    setSelectedDate(dateStr);
    const dayItems = calendar.items.filter((i) => i.date === dateStr);
    if (dayItems.length > 0) {
      setDaySummaryDate(dateStr);
    }
  };

  const daySummaryItems = daySummaryDate ? calendar.items.filter((i) => i.date === daySummaryDate) : [];

  // ── Loading ──
  if (calendar.loading) {
    return (
      <AppShell>
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-48 bg-background-200 rounded" />
            <div className="h-4 w-96 bg-background-200 rounded" />
            <div className="h-[500px] bg-background-200 rounded-xl" />
          </div>
        </div>
      </AppShell>
    );
  }

  // ── Error ──
  if (calendar.error) {
    return (
      <AppShell>
        <div className="max-w-6xl mx-auto text-center py-20">
          <div className="w-14 h-14 mx-auto flex items-center justify-center rounded-full bg-red-50 text-red-400 mb-4">
            <i className="ri-error-warning-line text-xl" />
          </div>
          <p className="text-sm text-red-600 mb-4">{calendar.error}</p>
          <button onClick={calendar.refetch} className="px-4 py-2 rounded-lg bg-primary-500 text-background-50 text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap">
            Try again
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <p className="text-xs font-label text-foreground-400 uppercase tracking-widest mb-1">Planning overview</p>
            <h1 className="font-heading text-2xl md:text-3xl text-foreground-900">Wedding Calendar</h1>
            <p className="text-sm text-foreground-500 mt-1">Events, tasks, payments and appointments shown together in one place.</p>
          </div>
          <div className="flex items-center gap-2">
            <a href="/app/schedule" className="px-3 py-2 rounded-lg border border-secondary-200 text-sm font-label text-foreground-600 hover:bg-background-50 transition-colors cursor-pointer whitespace-nowrap">
              <i className="ri-add-line mr-1" />Add event
            </a>
            <a href="/app/exports" className="px-3 py-2 rounded-lg bg-primary-500 text-background-50 text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap">
              <i className="ri-download-line mr-1" />Export calendar
            </a>
          </div>
        </div>

        {/* Demo badge */}
        {demoMode && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-amber-50 border border-amber-100 text-xs text-amber-700 flex items-center gap-2">
            <i className="ri-information-line" />
            <span>Demo calendar &mdash; showing sample data. <a href="/app/exports" className="underline font-semibold cursor-pointer">Export</a> to download ICS/CSV.</span>
          </div>
        )}

        {/* Conflicts */}
        <ConflictPanel conflicts={calendar.conflicts} items={calendar.items} />

        {/* Filters bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
          {/* View toggle */}
          <div className="flex items-center rounded-lg border border-secondary-200 bg-white overflow-hidden">
            {(['month', 'week', 'agenda'] as CalendarView[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 text-xs font-label cursor-pointer whitespace-nowrap transition-colors capitalize ${
                  view === v ? 'bg-primary-100 text-primary-700' : 'text-foreground-500 hover:bg-background-50'
                }`}
              >
                <i className={`${v === 'month' ? 'ri-calendar-line' : v === 'week' ? 'ri-calendar-check-line' : 'ri-list-check'} mr-1`} />
                {v}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-xs text-foreground-400" />
            <input
              type="text"
              placeholder="Search..."
              value={calendar.filters.search}
              onChange={(e) => calendar.setFilters({ search: e.target.value })}
              className="w-full pl-8 pr-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none focus:border-primary-400"
            />
          </div>

          {/* Show completed */}
          <label className="flex items-center gap-1.5 text-xs font-label text-foreground-600 cursor-pointer whitespace-nowrap">
            <input
              type="checkbox"
              checked={calendar.filters.showCompleted}
              onChange={(e) => calendar.setFilters({ showCompleted: e.target.checked })}
              className="rounded border-secondary-300 text-primary-500 focus:ring-primary-400 cursor-pointer"
            />
            Show completed
          </label>
        </div>

        {/* Source legend */}
        <div className="mb-6">
          <SourceLegend activeSources={calendar.filters.sources} onToggle={calendar.toggleSource} />
        </div>

        {/* Calendar view */}
        <div className="bg-white rounded-xl border border-secondary-200 p-4 md:p-6">
          {calendar.items.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-14 h-14 mx-auto flex items-center justify-center rounded-full bg-background-100 text-foreground-300 mb-4">
                <i className="ri-calendar-2-line text-xl" />
              </div>
              <h2 className="font-heading text-lg text-foreground-700 mb-1">No items to display</h2>
              <p className="text-sm text-foreground-500 mb-4">
                {calendar.items.length === 0 && !calendar.loading
                  ? 'Enable source filters above, or create your first wedding event to see it here.'
                  : 'No items match your current filters.'}
              </p>
            </div>
          ) : view === 'month' ? (
            <MonthView
              year={year} month={month} items={calendar.items}
              selectedDate={selectedDate}
              onSelectDate={handleSelectDate}
              onNavigate={handleNavigate}
            />
          ) : view === 'week' ? (
            <WeekView
              weekStart={weekStartStr} items={calendar.items}
              selectedDate={selectedDate}
              onSelectDate={handleSelectDate}
              onNavigate={handleNavigate}
            />
          ) : (
            <AgendaView items={calendar.items} />
          )}
        </div>

        {/* Day summary sheet */}
        {daySummaryDate && (
          <DaySummary
            date={daySummaryDate}
            items={daySummaryItems}
            onClose={() => setDaySummaryDate(null)}
          />
        )}
      </div>
    </AppShell>
  );
}