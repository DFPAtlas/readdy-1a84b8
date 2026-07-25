import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { isDemoMode, DEMO_CONFIG } from '@/demo/demoConfig';
import { useDemoDataSafe } from '@/demo/useDemoDataSafe';
import type {
  WeddingTask,
  WeddingTaskItem,
  TaskActivityEntry,
  TaskFormData,
  TaskStats,
  TaskFilterStatus,
  TaskFilterPriority,
  TaskSort,
  TaskStatus,
} from '@/types/tasks';

// ── Helpers ──

function daysFromNow(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr + (dateStr.includes('T') ? '' : 'T00:00:00'));
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - now.getTime()) / 86400000);
}

function computeStats(tasks: WeddingTask[]): TaskStats {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const in7Days = new Date(now);
  in7Days.setDate(in7Days.getDate() + 7);

  let total = 0, completed = 0, inProgress = 0, pending = 0, overdue = 0, dueSoon = 0, highPriority = 0, unassigned = 0;

  for (const t of tasks) {
    if (t.status === 'archived') continue;
    total++;
    if (t.status === 'completed') completed++;
    else if (t.status === 'in_progress') inProgress++;
    else if (t.status === 'pending') pending++;

    if (t.status !== 'completed' && t.priority === 'high') highPriority++;
    if (t.status !== 'completed' && !t.assigned_to) unassigned++;

    const days = daysFromNow(t.due_date);
    if (t.status !== 'completed' && days !== null) {
      if (days < 0) overdue++;
      else if (days <= 7) dueSoon++;
    }
  }

  return { total, completed, inProgress, pending, overdue, dueSoon, highPriority, unassigned };
}

// ── Hook ──

export interface UseTasksReturn {
  tasks: WeddingTask[];
  stats: TaskStats;
  loading: boolean;
  error: string | null;
  filterStatus: TaskFilterStatus;
  filterPriority: TaskFilterPriority;
  filterCategory: string;
  search: string;
  sort: TaskSort;
  sortAsc: boolean;
  setFilterStatus: (v: TaskFilterStatus) => void;
  setFilterPriority: (v: TaskFilterPriority) => void;
  setFilterCategory: (v: string) => void;
  setSearch: (v: string) => void;
  setSort: (v: TaskSort) => void;
  setSortAsc: (v: boolean) => void;
  filteredTasks: WeddingTask[];
  refresh: () => Promise<void>;
  createTask: (data: TaskFormData) => Promise<{ task: WeddingTask | null; error: string | null }>;
  updateTask: (id: string, data: Partial<TaskFormData>) => Promise<{ task: WeddingTask | null; error: string | null }>;
  deleteTask: (id: string) => Promise<{ error: string | null }>;
  archiveTask: (id: string) => Promise<{ error: string | null }>;
  restoreTask: (id: string) => Promise<{ error: string | null }>;
  toggleComplete: (id: string, currentStatus: string) => Promise<{ error: string | null }>;
  bulkComplete: (ids: string[]) => Promise<{ error: string | null }>;
  bulkArchive: (ids: string[]) => Promise<{ error: string | null }>;
  bulkDelete: (ids: string[]) => Promise<{ error: string | null }>;
  getTaskActivity: (taskId: string) => Promise<TaskActivityEntry[]>;
}

export function useTasks(): UseTasksReturn {
  const { weddingId } = useActiveWedding();
  const demoData = useDemoDataSafe();

  const [tasks, setTasks] = useState<WeddingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterStatus, setFilterStatus] = useState<TaskFilterStatus>('all');
  const [filterPriority, setFilterPriority] = useState<TaskFilterPriority>('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<TaskSort>('due_date');
  const [sortAsc, setSortAsc] = useState(true);

  const mountedRef = useRef(true);

  const fetchTasks = useCallback(async () => {
    if (!weddingId) {
      setTasks([]);
      setLoading(false);
      return;
    }

    if (isDemoMode) {
      const demoTasks = (demoData?.state?.tasks ?? []).map((dt) => ({
        id: dt.id,
        wedding_id: DEMO_CONFIG.weddingId,
        title: dt.title,
        description: dt.description ?? null,
        category: dt.category ?? 'Other',
        priority: (dt.priority || 'medium') as WeddingTask['priority'],
        status: (dt.status || 'pending') as WeddingTask['status'],
        due_date: dt.due_date ?? null,
        due_time: null,
        assigned_to: dt.assigned_to ?? null,
        created_by: null,
        supplier_id: null,
        expense_id: null,
        notes: null,
        sort_order: 0,
        visibility: 'private' as const,
        reminder_enabled: false,
        reminder_time: null,
        archived_at: null,
        created_at: '',
        updated_at: '',
        items: [],
      }));
      setTasks(demoTasks);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: queryErr } = await supabase
        .from('wedding_tasks')
        .select('*, items:wedding_task_items(*)')
        .eq('wedding_id', weddingId)
        .order('sort_order', { ascending: true })
        .order('due_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (!mountedRef.current) return;

      if (queryErr) throw queryErr;

      const taskList = (data || []).map((row: Record<string, unknown>) => ({
        ...row,
        items: Array.isArray(row.items) ? row.items : [],
      })) as unknown as WeddingTask[];

      setTasks(taskList);
    } catch (err: unknown) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [weddingId, demoData]);

  useEffect(() => {
    mountedRef.current = true;
    fetchTasks();
    return () => { mountedRef.current = false; };
  }, [fetchTasks]);

  // ── Derived data ──

  const stats = (() => { try { return computeStats(tasks); } catch { return { total: 0, completed: 0, inProgress: 0, pending: 0, overdue: 0, dueSoon: 0, highPriority: 0, unassigned: 0 }; } })();

  const filteredTasks = (() => {
    let filtered = tasks.filter((t) => {
      if (filterStatus === 'archived' && t.status !== 'archived') return false;
      if (filterStatus !== 'all' && filterStatus !== 'archived' && t.status === 'archived') return false;

      if (filterStatus === 'overdue') {
        if (t.status === 'completed' || t.status === 'archived') return false;
        const days = daysFromNow(t.due_date);
        if (days === null || days >= 0) return false;
      } else if (filterStatus === 'due_soon') {
        if (t.status === 'completed' || t.status === 'archived') return false;
        const days = daysFromNow(t.due_date);
        if (days === null || days < 0 || days > 7) return false;
      } else if (filterStatus !== 'all' && filterStatus !== 'archived') {
        if (t.status !== filterStatus) return false;
      }

      if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
      if (filterCategory !== 'all' && t.category !== filterCategory) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!t.title.toLowerCase().includes(q) && !(t.description?.toLowerCase().includes(q)) && !(t.assigned_to?.toLowerCase().includes(q))) return false;
      }
      return true;
    });

    filtered.sort((a, b) => {
      let cmp = 0;
      switch (sort) {
        case 'due_date': {
          const aDate = a.due_date || '9999-12-31';
          const bDate = b.due_date || '9999-12-31';
          cmp = aDate.localeCompare(bDate);
          break;
        }
        case 'created_at':
          cmp = (a.created_at || '').localeCompare(b.created_at || '');
          break;
        case 'priority': {
          const order = { high: 0, medium: 1, low: 2 };
          cmp = (order[a.priority] ?? 1) - (order[b.priority] ?? 1);
          break;
        }
        case 'title':
          cmp = a.title.localeCompare(b.title);
          break;
        case 'category':
          cmp = a.category.localeCompare(b.category);
          break;
      }
      return sortAsc ? cmp : -cmp;
    });

    return filtered;
  })();

  // ── Mutations ──

  const createTask = useCallback(async (form: TaskFormData): Promise<{ task: WeddingTask | null; error: string | null }> => {
    if (isDemoMode) {
      const newTask: WeddingTask = {
        id: `demo-task-${Date.now()}`,
        wedding_id: DEMO_CONFIG.weddingId,
        title: form.title.trim(),
        description: form.description.trim() || null,
        category: form.category,
        priority: form.priority,
        status: form.status,
        due_date: form.due_date || null,
        due_time: form.due_time || null,
        assigned_to: form.assigned_to.trim() || null,
        created_by: null,
        supplier_id: null,
        expense_id: null,
        notes: form.notes.trim() || null,
        sort_order: tasks.length,
        visibility: form.visibility,
        reminder_enabled: false,
        reminder_time: null,
        archived_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        items: [],
      };
      setTasks((prev) => [...prev, newTask]);
      return { task: newTask, error: null };
    }

    if (!weddingId) return { task: null, error: 'No active wedding' };

    try {
      const insert = {
        wedding_id: weddingId,
        title: form.title.trim(),
        description: form.description.trim() || null,
        category: form.category,
        priority: form.priority,
        status: form.status,
        due_date: form.due_date || null,
        due_time: form.due_time || null,
        assigned_to: form.assigned_to.trim() || null,
        notes: form.notes.trim() || null,
        sort_order: tasks.length,
        visibility: form.visibility,
      };

      const { data, error: insertErr } = await supabase
        .from('wedding_tasks')
        .insert(insert)
        .select('*')
        .single();

      if (insertErr) throw insertErr;
      if (!data) throw new Error('Failed to create task');

      const newTask = data as unknown as WeddingTask;

      // Insert checklist items
      if (form.checklistItems.length > 0) {
        const items = form.checklistItems
          .filter((it) => it.content.trim())
          .map((it, i) => ({
            task_id: newTask.id,
            content: it.content.trim(),
            sort_order: i,
            completed: it.completed,
          }));
        if (items.length > 0) {
          await supabase.from('wedding_task_items').insert(items);
        }
      }

      // Log activity
      await supabase.from('task_activity_log').insert({
        task_id: newTask.id,
        wedding_id: weddingId,
        action: 'created',
        changes: { title: form.title, category: form.category, priority: form.priority },
      });

      setTasks((prev) => [...prev, { ...newTask, items: [] }]);
      return { task: { ...newTask, items: [] }, error: null };
    } catch (err: unknown) {
      return { task: null, error: err instanceof Error ? err.message : 'Failed to create task' };
    }
  }, [weddingId, tasks.length]);

  const updateTask = useCallback(async (id: string, form: Partial<TaskFormData>): Promise<{ task: WeddingTask | null; error: string | null }> => {
    if (isDemoMode) {
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...form, updated_at: new Date().toISOString() } : t)));
      const updated = tasks.find((t) => t.id === id);
      return { task: updated ? { ...updated, ...form } : null, error: null };
    }

    if (!weddingId) return { task: null, error: 'No active wedding' };

    try {
      const update: Record<string, unknown> = {};
      if (form.title !== undefined) update.title = form.title.trim();
      if (form.description !== undefined) update.description = form.description.trim() || null;
      if (form.category !== undefined) update.category = form.category;
      if (form.priority !== undefined) update.priority = form.priority;
      if (form.status !== undefined) update.status = form.status;
      if (form.due_date !== undefined) update.due_date = form.due_date || null;
      if (form.due_time !== undefined) update.due_time = form.due_time || null;
      if (form.assigned_to !== undefined) update.assigned_to = form.assigned_to.trim() || null;
      if (form.notes !== undefined) update.notes = form.notes.trim() || null;
      if (form.visibility !== undefined) update.visibility = form.visibility;
      update.updated_at = new Date().toISOString();

      const { data, error: updateErr } = await supabase
        .from('wedding_tasks')
        .update(update)
        .eq('id', id)
        .eq('wedding_id', weddingId)
        .select('*, items:wedding_task_items(*)')
        .single();

      if (updateErr) throw updateErr;

      const updated = data as unknown as WeddingTask;

      // Log activity
      await supabase.from('task_activity_log').insert({
        task_id: id,
        wedding_id: weddingId,
        action: 'updated',
        changes: update,
      });

      setTasks((prev) => prev.map((t) => (t.id === id ? { ...updated, items: Array.isArray(updated.items) ? updated.items : t.items } : t)));
      return { task: updated, error: null };
    } catch (err: unknown) {
      return { task: null, error: err instanceof Error ? err.message : 'Failed to update task' };
    }
  }, [weddingId]);

  const deleteTask = useCallback(async (id: string): Promise<{ error: string | null }> => {
    if (isDemoMode) {
      setTasks((prev) => prev.filter((t) => t.id !== id));
      return { error: null };
    }
    if (!weddingId) return { error: 'No active wedding' };

    try {
      const { error: deleteErr } = await supabase
        .from('wedding_tasks')
        .delete()
        .eq('id', id)
        .eq('wedding_id', weddingId);

      if (deleteErr) throw deleteErr;
      setTasks((prev) => prev.filter((t) => t.id !== id));
      return { error: null };
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : 'Failed to delete task' };
    }
  }, [weddingId]);

  const archiveTask = useCallback(async (id: string): Promise<{ error: string | null }> => {
    if (isDemoMode) {
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: 'archived' as const, archived_at: new Date().toISOString() } : t)));
      return { error: null };
    }
    if (!weddingId) return { error: 'No active wedding' };

    try {
      const now = new Date().toISOString();
      const { error: updateErr } = await supabase
        .from('wedding_tasks')
        .update({ status: 'archived', archived_at: now, updated_at: now })
        .eq('id', id)
        .eq('wedding_id', weddingId);

      if (updateErr) throw updateErr;

      await supabase.from('task_activity_log').insert({
        task_id: id,
        wedding_id: weddingId,
        action: 'archived',
      });

      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: 'archived' as const, archived_at: now } : t)));
      return { error: null };
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : 'Failed to archive task' };
    }
  }, [weddingId]);

  const restoreTask = useCallback(async (id: string): Promise<{ error: string | null }> => {
    if (isDemoMode) {
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: 'pending' as const, archived_at: null } : t)));
      return { error: null };
    }
    if (!weddingId) return { error: 'No active wedding' };

    try {
      const { error: updateErr } = await supabase
        .from('wedding_tasks')
        .update({ status: 'pending', archived_at: null, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('wedding_id', weddingId);

      if (updateErr) throw updateErr;
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: 'pending' as const, archived_at: null } : t)));
      return { error: null };
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : 'Failed to restore task' };
    }
  }, [weddingId]);

  const toggleComplete = useCallback(async (id: string, currentStatus: string): Promise<{ error: string | null }> => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    if (isDemoMode) {
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: newStatus as TaskStatus, updated_at: new Date().toISOString() } : t)));
      return { error: null };
    }
    if (!weddingId) return { error: 'No active wedding' };

    try {
      const { error: updateErr } = await supabase
        .from('wedding_tasks')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('wedding_id', weddingId);

      if (updateErr) throw updateErr;

      await supabase.from('task_activity_log').insert({
        task_id: id,
        wedding_id: weddingId,
        action: newStatus === 'completed' ? 'completed' : 'reopened',
      });

      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t)));
      return { error: null };
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : 'Failed to update task' };
    }
  }, [weddingId]);

  const bulkComplete = useCallback(async (ids: string[]): Promise<{ error: string | null }> => {
    if (isDemoMode) {
      setTasks((prev) => prev.map((t) => (ids.includes(t.id) && t.status !== 'completed' ? { ...t, status: 'completed' as const, updated_at: new Date().toISOString() } : t)));
      return { error: null };
    }
    if (!weddingId) return { error: 'No active wedding' };
    if (ids.length === 0) return { error: null };

    try {
      const now = new Date().toISOString();
      const { error: updateErr } = await supabase
        .from('wedding_tasks')
        .update({ status: 'completed', updated_at: now })
        .in('id', ids)
        .eq('wedding_id', weddingId);

      if (updateErr) throw updateErr;
      setTasks((prev) => prev.map((t) => (ids.includes(t.id) ? { ...t, status: 'completed' as const } : t)));
      return { error: null };
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : 'Failed to complete tasks' };
    }
  }, [weddingId]);

  const bulkArchive = useCallback(async (ids: string[]): Promise<{ error: string | null }> => {
    if (isDemoMode) {
      setTasks((prev) => prev.map((t) => (ids.includes(t.id) && t.status !== 'completed' ? { ...t, status: 'archived' as const, archived_at: new Date().toISOString() } : t)));
      return { error: null };
    }
    if (!weddingId) return { error: 'No active wedding' };
    if (ids.length === 0) return { error: null };

    try {
      const now = new Date().toISOString();
      const { error: updateErr } = await supabase
        .from('wedding_tasks')
        .update({ status: 'archived', archived_at: now, updated_at: now })
        .in('id', ids)
        .eq('wedding_id', weddingId);

      if (updateErr) throw updateErr;
      setTasks((prev) => prev.map((t) => (ids.includes(t.id) ? { ...t, status: 'archived' as const, archived_at: now } : t)));
      return { error: null };
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : 'Failed to archive tasks' };
    }
  }, [weddingId]);

  const bulkDelete = useCallback(async (ids: string[]): Promise<{ error: string | null }> => {
    if (isDemoMode) {
      setTasks((prev) => prev.filter((t) => !ids.includes(t.id)));
      return { error: null };
    }
    if (!weddingId) return { error: 'No active wedding' };
    if (ids.length === 0) return { error: null };

    try {
      const { error: deleteErr } = await supabase
        .from('wedding_tasks')
        .delete()
        .in('id', ids)
        .eq('wedding_id', weddingId);

      if (deleteErr) throw deleteErr;
      setTasks((prev) => prev.filter((t) => !ids.includes(t.id)));
      return { error: null };
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : 'Failed to delete tasks' };
    }
  }, [weddingId]);

  const getTaskActivity = useCallback(async (taskId: string): Promise<TaskActivityEntry[]> => {
    if (isDemoMode) return [];
    if (!weddingId) return [];

    try {
      const { data } = await supabase
        .from('task_activity_log')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false })
        .limit(20);

      return (data || []) as unknown as TaskActivityEntry[];
    } catch {
      return [];
    }
  }, [weddingId]);

  return {
    tasks,
    stats,
    loading,
    error,
    filterStatus,
    filterPriority,
    filterCategory,
    search,
    sort,
    sortAsc,
    setFilterStatus,
    setFilterPriority,
    setFilterCategory,
    setSearch,
    setSort,
    setSortAsc,
    filteredTasks,
    refresh: fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    archiveTask,
    restoreTask,
    toggleComplete,
    bulkComplete,
    bulkArchive,
    bulkDelete,
    getTaskActivity,
  };
}