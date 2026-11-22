import { useState, useMemo, useCallback, useEffect } from 'react';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { useWeddingEvents } from '@/hooks/useWeddingEvents';
import { useTasks } from '@/hooks/useTasks';
import { useSuppliers } from '@/hooks/useSuppliers';
import { isDemoMode } from '@/demo/demoConfig';
import { useDemoDataSafe } from '@/demo/useDemoDataSafe';
import type { CalendarItem, CalendarFilters, ConflictWarning, CalendarSource } from '@/types/calendar';
import { DEFAULT_CALENDAR_FILTERS } from '@/types/calendar';
import type { WeddingEvent } from '@/hooks/useWeddingEvents';
import type { WeddingTask } from '@/types/tasks';
import type { WeddingSupplier } from '@/types/suppliers';
import type { DemoExpense, DemoPayment } from '@/demo/demoTypes';
import { supabase } from '@/lib/supabase';

// ── Normalise helpers ──

function eventToCalendarItem(e: WeddingEvent): CalendarItem {
  return {
    id: `evt-${e.id}`,
    source: 'wedding_event',
    title: e.name,
    description: e.description || null,
    date: e.start_at ? e.start_at.slice(0, 10) : (e.event_date || ''),
    startTime: e.start_time || null,
    endTime: e.end_time || null,
    startAt: e.start_at || null,
    endAt: e.end_at || null,
    allDay: !e.start_time,
    status: e.status || 'draft',
    priority: null,
    location: e.venue?.name || null,
    assignee: null,
    linkRoute: '/app/schedule',
    sourceId: e.id,
    weddingId: e.wedding_id,
    category: e.event_type || null,
  };
}

function taskToCalendarItem(t: WeddingTask): CalendarItem {
  return {
    id: `task-${t.id}`,
    source: 'task',
    title: t.title,
    description: t.description || null,
    date: t.due_date || '',
    startTime: t.due_time || null,
    endTime: null,
    startAt: t.due_date ? `${t.due_date}T${t.due_time || '00:00'}:00` : null,
    endAt: null,
    allDay: !t.due_time,
    status: t.status,
    priority: t.priority,
    location: null,
    assignee: t.assigned_to || null,
    linkRoute: '/app/tasks',
    sourceId: t.id,
    weddingId: t.wedding_id,
    category: t.category || null,
  };
}

function supplierToCalendarItem(s: WeddingSupplier): CalendarItem {
  const date = s.next_action_date || s.contract_date || '';
  return {
    id: `sup-${s.id}`,
    source: date === s.next_action_date ? 'supplier_appointment' : 'supplier_deadline',
    title: s.next_action || `Review ${s.business_name}`,
    description: `Supplier: ${s.business_name}`,
    date,
    startTime: null,
    endTime: null,
    startAt: null,
    endAt: null,
    allDay: true,
    status: s.status,
    priority: null,
    location: null,
    assignee: null,
    linkRoute: '/app/suppliers',
    sourceId: s.id,
    weddingId: s.wedding_id,
    category: s.category || null,
  };
}

// ── Demo helpers ──

function demoEventToCalendarItem(e: { id: string; name: string; start_at?: string | null; end_at?: string | null; event_type?: string; status?: string; description?: string; venue_id?: string }, venues: { id: string; name: string }[]): CalendarItem {
  const venue = e.venue_id ? venues.find((v) => v.id === e.venue_id) : null;
  return {
    id: `evt-${e.id}`,
    source: 'wedding_event',
    title: e.name,
    description: e.description || null,
    date: e.start_at ? e.start_at.slice(0, 10) : '',
    startTime: e.start_at ? new Date(e.start_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : null,
    endTime: e.end_at ? new Date(e.end_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : null,
    startAt: e.start_at || null,
    endAt: e.end_at || null,
    allDay: false,
    status: e.status || 'published',
    priority: null,
    location: venue?.name || null,
    assignee: null,
    linkRoute: '/app/schedule',
    sourceId: e.id,
    weddingId: '',
    category: e.event_type || null,
  };
}

function demoTaskToCalendarItem(t: { id: string; title: string; due_date?: string; status: string; priority: string; category?: string; assigned_to?: string }): CalendarItem {
  return {
    id: `task-${t.id}`,
    source: 'task',
    title: t.title,
    description: null,
    date: t.due_date || '',
    startTime: null,
    endTime: null,
    startAt: null,
    endAt: null,
    allDay: true,
    status: t.status,
    priority: t.priority,
    location: null,
    assignee: t.assigned_to || null,
    linkRoute: '/app/tasks',
    sourceId: t.id,
    weddingId: '',
    category: t.category || null,
  };
}

function demoPaymentToCalendarItem(p: DemoPayment, expenses: DemoExpense[]): CalendarItem {
  const exp = expenses.find((e) => e.id === p.expense_id);
  return {
    id: `pay-${p.id}`,
    source: 'budget_payment',
    title: p.description || 'Payment due',
    description: exp ? `For: ${exp.description}` : null,
    date: p.due_date || '',
    startTime: null,
    endTime: null,
    startAt: null,
    endAt: null,
    allDay: true,
    status: p.status,
    priority: p.status === 'overdue' ? 'high' : 'medium',
    location: null,
    assignee: null,
    linkRoute: '/app/budget/payments',
    sourceId: p.id,
    weddingId: '',
    category: 'Payment',
  };
}

interface BudgetPaymentRow {
  id: string;
  wedding_id: string;
  expense_id: string | null;
  payment_type: string | null;
  amount: number | string | null;
  due_at: string | null;
  status: string | null;
  notes: string | null;
}

export function paymentToCalendarItem(p: BudgetPaymentRow, expenseTitles: Map<string, string>, today: string): CalendarItem {
  const due = (p.due_at || '').slice(0, 10);
  const expense = p.expense_id ? expenseTitles.get(p.expense_id) : undefined;
  const overdue = p.status === 'overdue' || (p.status === 'scheduled' && !!due && due < today);
  const kind = p.payment_type === 'deposit' ? 'Deposit' : p.payment_type === 'final' ? 'Final payment' : 'Payment';
  return {
    id: `pay-${p.id}`,
    source: 'budget_payment',
    title: expense ? `${kind}: ${expense}` : `${kind} due`,
    description: p.notes || null,
    date: due,
    startTime: null,
    endTime: null,
    startAt: null,
    endAt: null,
    allDay: true,
    status: overdue ? 'overdue' : (p.status || 'scheduled'),
    priority: overdue ? 'high' : 'medium',
    location: null,
    assignee: null,
    linkRoute: '/app/budget/payments',
    sourceId: p.id,
    weddingId: p.wedding_id,
    category: 'Payment',
  };
}

function demoSupplierToCalendarItem(s: { id: string; name: string; category: string; status: string; contact_name?: string; next_action?: string; next_action_date?: string }): CalendarItem {
  return {
    id: `sup-${s.id}`,
    source: s.next_action_date ? 'supplier_appointment' : 'supplier_deadline',
    title: s.next_action || s.name,
    description: `Supplier: ${s.name}`,
    date: s.next_action_date || '',
    startTime: null,
    endTime: null,
    startAt: null,
    endAt: null,
    allDay: true,
    status: s.status,
    priority: null,
    location: null,
    assignee: s.contact_name || null,
    linkRoute: '/app/suppliers',
    sourceId: s.id,
    weddingId: '',
    category: s.category || null,
  };
}

// ── Conflict detection ──

function detectConflicts(items: CalendarItem[]): ConflictWarning[] {
  const warnings: ConflictWarning[] = [];
  const dated = items.filter((i) => i.date);

  const timed = dated.filter((i) => i.startTime && i.endTime);
  const byDate = new Map<string, CalendarItem[]>();
  for (const item of timed) {
    const existing = byDate.get(item.date) || [];
    existing.push(item);
    byDate.set(item.date, existing);
  }

  for (const [, dayItems] of byDate) {
    for (let i = 0; i < dayItems.length; i++) {
      for (let j = i + 1; j < dayItems.length; j++) {
        const a = dayItems[i];
        const b = dayItems[j];
        if (a.startTime && a.endTime && b.startTime && b.endTime) {
          if (a.startTime < b.endTime && b.startTime < a.endTime) {
            warnings.push({
              id: `overlap-${a.id}-${b.id}`,
              type: 'overlap',
              message: `"${a.title}" overlaps with "${b.title}"`,
              itemIds: [a.id, b.id],
              severity: 'high',
            });
          }
        }
      }
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  for (const item of items) {
    if (item.source === 'budget_payment' && item.status === 'overdue') {
      warnings.push({
        id: `overdue-${item.id}`,
        type: 'overdue',
        message: `Payment "${item.title}" is overdue`,
        itemIds: [item.id],
        severity: 'critical',
      });
    }
    if (item.source === 'task' && item.date && item.date < today && item.status !== 'completed' && item.status !== 'archived') {
      warnings.push({
        id: `overdue-${item.id}`,
        type: 'overdue',
        message: `Task "${item.title}" is overdue`,
        itemIds: [item.id],
        severity: 'high',
      });
    }
    if (item.source === 'wedding_event' && !item.startTime && item.status === 'published') {
      warnings.push({
        id: `missing-time-${item.id}`,
        type: 'missing_time',
        message: `Event "${item.title}" has no time set`,
        itemIds: [item.id],
        severity: 'medium',
      });
    }
  }

  return warnings;
}

// ── Filter helper ──

function filterItems(allItems: CalendarItem[], filters: CalendarFilters): CalendarItem[] {
  let filtered = allItems;
  if (filters.search) {
    const q = filters.search.toLowerCase();
    filtered = filtered.filter((i) =>
      i.title.toLowerCase().includes(q) ||
      (i.description || '').toLowerCase().includes(q) ||
      (i.location || '').toLowerCase().includes(q) ||
      (i.assignee || '').toLowerCase().includes(q),
    );
  }
  if (!filters.showCompleted) {
    filtered = filtered.filter((i) =>
      i.status !== 'completed' && i.status !== 'archived' && i.status !== 'paid' && i.status !== 'cancelled',
    );
  }
  if (filters.statusFilter !== 'all') {
    filtered = filtered.filter((i) => i.status === filters.statusFilter);
  }
  return filtered;
}

// ── Hook ──

export interface UseWeddingCalendarReturn {
  items: CalendarItem[];
  conflicts: ConflictWarning[];
  loading: boolean;
  error: string | null;
  filters: CalendarFilters;
  setFilters: (f: Partial<CalendarFilters>) => void;
  toggleSource: (source: CalendarSource) => void;
  refetch: () => void;
}

export function useWeddingCalendar(): UseWeddingCalendarReturn {
  const { weddingId } = useActiveWedding();
  const demo = useDemoDataSafe();
  const demoMode = isDemoMode && !!demo;

  // Always call hooks unconditionally
  const [filters, setFiltersState] = useState<CalendarFilters>(DEFAULT_CALENDAR_FILTERS);
  const eventsHook = useWeddingEvents();
  const tasksHook = useTasks();
  const suppliersHook = useSuppliers();

  // Budget payment due dates (no shared hook loads these yet)
  const [payments, setPayments] = useState<BudgetPaymentRow[]>([]);
  const [expenseTitles, setExpenseTitles] = useState<Map<string, string>>(new Map());
  const [paymentsLoading, setPaymentsLoading] = useState(!isDemoMode);
  const [paymentsVersion, setPaymentsVersion] = useState(0);

  useEffect(() => {
    if (demoMode || !weddingId) {
      setPayments([]);
      setPaymentsLoading(false);
      return;
    }
    let cancelled = false;
    setPaymentsLoading(true);
    (async () => {
      const { data, error: payErr } = await supabase
        .from('budget_payments')
        .select('id, wedding_id, expense_id, payment_type, amount, due_at, status, notes')
        .eq('wedding_id', weddingId)
        .not('due_at', 'is', null)
        .neq('status', 'cancelled');
      if (cancelled) return;
      if (payErr) {
        // Budget may not be on this plan or role: leave payments off the
        // calendar rather than failing the whole calendar.
        setPayments([]);
        setPaymentsLoading(false);
        return;
      }
      const rows = (data || []) as BudgetPaymentRow[];
      const ids = [...new Set(rows.map((r) => r.expense_id).filter((id): id is string => !!id))];
      const titles = new Map<string, string>();
      if (ids.length) {
        const { data: exp } = await supabase.from('budget_expenses').select('id, title').in('id', ids);
        for (const e of (exp || []) as { id: string; title: string | null }[]) if (e.title) titles.set(e.id, e.title);
      }
      if (cancelled) return;
      setPayments(rows);
      setExpenseTitles(titles);
      setPaymentsLoading(false);
    })().catch(() => {
      if (cancelled) return;
      setPayments([]);
      setPaymentsLoading(false);
    });
    return () => { cancelled = true; };
  }, [demoMode, weddingId, paymentsVersion]);

  const setFilters = useCallback((partial: Partial<CalendarFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...partial }));
  }, []);

  const toggleSource = useCallback((source: CalendarSource) => {
    setFiltersState((prev) => ({
      ...prev,
      sources: prev.sources.includes(source)
        ? prev.sources.filter((s) => s !== source)
        : [...prev.sources, source],
    }));
  }, []);

  // Build demo items
  const demoState = demo?.state;
  const demoAllItems = useMemo(() => {
    if (!demoMode || !demoState) return [] as CalendarItem[];
    const state = demoState;
    const allItems: CalendarItem[] = [];

    if (filters.sources.includes('wedding_event')) {
      for (const e of (state.events || [])) {
        allItems.push(demoEventToCalendarItem(e, state.venues || []));
      }
    }
    if (filters.sources.includes('task')) {
      for (const t of (state.tasks || [])) {
        if (t.due_date) allItems.push(demoTaskToCalendarItem(t));
      }
    }
    if (filters.sources.includes('budget_payment')) {
      for (const p of (state.payments || [])) {
        if (p.due_date) allItems.push(demoPaymentToCalendarItem(p, state.expenses || []));
      }
    }
    if (filters.sources.includes('supplier_appointment') || filters.sources.includes('supplier_deadline')) {
      for (const s of (state.suppliers || [])) {
        const item = demoSupplierToCalendarItem(s);
        const sourceOk = item.source === 'supplier_appointment'
          ? filters.sources.includes('supplier_appointment')
          : filters.sources.includes('supplier_deadline');
        if (sourceOk && item.date) allItems.push(item);
      }
    }

    return allItems;
  }, [demoMode, demoState, filters.sources]);

  // Build production items
  const prodAllItems = useMemo(() => {
    if (demoMode) return [] as CalendarItem[];
    const all: CalendarItem[] = [];

    if (filters.sources.includes('wedding_event')) {
      for (const e of eventsHook.events) {
        if (e.start_at || e.event_date) all.push(eventToCalendarItem(e));
      }
    }
    if (filters.sources.includes('task')) {
      for (const t of tasksHook.filteredTasks) {
        if (t.due_date) all.push(taskToCalendarItem(t));
      }
    }
    if (filters.sources.includes('budget_payment')) {
      const today = new Date().toISOString().slice(0, 10);
      for (const p of payments) {
        // Paid instalments stay on the calendar as a record, like completed tasks.
        if (p.due_at) all.push(paymentToCalendarItem(p, expenseTitles, today));
      }
    }
    const supSourcesOk = filters.sources.includes('supplier_appointment') || filters.sources.includes('supplier_deadline');
    if (supSourcesOk) {
      for (const s of suppliersHook.suppliers) {
        const item = supplierToCalendarItem(s);
        const sourceOk = item.source === 'supplier_appointment'
          ? filters.sources.includes('supplier_appointment')
          : filters.sources.includes('supplier_deadline');
        if (sourceOk && item.date) all.push(item);
      }
    }

    return all;
  }, [demoMode, eventsHook.events, tasksHook.filteredTasks, suppliersHook.suppliers, payments, expenseTitles, filters.sources]);

  const allItems = demoMode ? demoAllItems : prodAllItems;

  const items = useMemo(() => filterItems(allItems, filters), [allItems, filters]);

  const conflicts = useMemo(() => detectConflicts(items), [items]);

  const loading = demoMode ? false : (eventsHook.loading || tasksHook.loading || suppliersHook.loading || paymentsLoading);
  const error = demoMode ? null : (eventsHook.error || tasksHook.error || suppliersHook.error);

  const refetchEvents = eventsHook.refetch;
  const refreshTasks = tasksHook.refresh;
  const fetchSuppliers = suppliersHook.fetchSuppliers;
  const refetch = useCallback(() => {
    if (!demoMode) {
      refetchEvents();
      refreshTasks();
      fetchSuppliers();
      setPaymentsVersion((v) => v + 1);
    }
  }, [demoMode, refetchEvents, refreshTasks, fetchSuppliers]);

  return {
    items,
    conflicts,
    loading,
    error,
    filters,
    setFilters,
    toggleSource,
    refetch,
  };
}