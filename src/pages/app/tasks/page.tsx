import { useState, useMemo, useCallback } from 'react';
import AppShell from '@/components/feature/AppShell';
import { useTasks } from '@/hooks/useTasks';
import { isDemoMode } from '@/demo/demoConfig';
import TaskDrawer from '@/pages/app/tasks/components/TaskDrawer';
import type { WeddingTask, TaskFilterStatus, TaskFilterPriority, TaskSort, TaskViewMode, TaskFormData } from '@/types/tasks';
import { DEFAULT_TASK_CATEGORIES } from '@/types/tasks';

// ── Constants ──

const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-secondary-100 text-secondary-600',
};

const PRIORITY_DOT: Record<string, string> = {
  high: 'bg-red-400',
  medium: 'bg-amber-400',
  low: 'bg-secondary-400',
};

const STATUS_ICONS: Record<string, string> = {
  pending: 'ri-time-line',
  in_progress: 'ri-loader-4-line',
  completed: 'ri-check-double-line',
  archived: 'ri-archive-line',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-background-100 text-foreground-400',
  in_progress: 'bg-sky-100 text-sky-600',
  completed: 'bg-emerald-100 text-emerald-600',
  archived: 'bg-secondary-100 text-secondary-500',
};

const SORT_OPTIONS: { value: TaskSort; label: string }[] = [
  { value: 'due_date', label: 'Due date' },
  { value: 'priority', label: 'Priority' },
  { value: 'created_at', label: 'Created' },
  { value: 'title', label: 'Title' },
  { value: 'category', label: 'Category' },
];

const BOARD_COLUMNS = [
  { key: 'pending' as const, label: 'To Do', icon: 'ri-time-line', bg: 'bg-background-50' },
  { key: 'in_progress' as const, label: 'In Progress', icon: 'ri-loader-4-line', bg: 'bg-sky-50/50' },
  { key: 'completed' as const, label: 'Done', icon: 'ri-check-double-line', bg: 'bg-emerald-50/50' },
];

// ── Helpers ──

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr + (dateStr.includes('T') ? '' : 'T00:00:00')).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatTime(timeStr: string | null): string {
  if (!timeStr) return '';
  try {
    const [h, m] = timeStr.split(':');
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  } catch {
    return timeStr;
  }
}

function daysFromNow(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr + (dateStr.includes('T') ? '' : 'T00:00:00'));
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - now.getTime()) / 86400000);
}

function getDueLabel(dateStr: string | null): { text: string; urgent: boolean } {
  if (!dateStr) return { text: 'No due date', urgent: false };
  const days = daysFromNow(dateStr);
  if (days === null) return { text: formatDate(dateStr), urgent: false };
  if (days < 0) return { text: `Overdue by ${Math.abs(days)}d`, urgent: true };
  if (days === 0) return { text: 'Due today', urgent: true };
  if (days === 1) return { text: 'Due tomorrow', urgent: false };
  if (days <= 7) return { text: `Due in ${days}d`, urgent: false };
  return { text: formatDate(dateStr), urgent: false };
}

// ── Stats row ──

function StatsCards({ stats }: { stats: ReturnType<typeof useTasks>['stats'] }) {
  const cards = [
    { label: 'Total', value: stats.total, icon: 'ri-calendar-check-line', color: 'text-foreground-700', bg: 'bg-background-100' },
    { label: 'Completed', value: stats.completed, icon: 'ri-check-double-line', color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'In progress', value: stats.inProgress, icon: 'ri-loader-4-line', color: 'text-sky-600', bg: 'bg-sky-50' },
    { label: 'Pending', value: stats.pending, icon: 'ri-time-line', color: 'text-secondary-600', bg: 'bg-secondary-100' },
    { label: 'Overdue', value: stats.overdue, icon: 'ri-alarm-warning-line', color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Due soon', value: stats.dueSoon, icon: 'ri-calendar-event-line', color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'High priority', value: stats.highPriority, icon: 'ri-flag-line', color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Unassigned', value: stats.unassigned, icon: 'ri-user-unfollow-line', color: 'text-foreground-500', bg: 'bg-background-100' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 mb-6">
      {cards.map((c) => (
        <div key={c.label} className="card-default">
          <div className={`w-8 h-8 flex items-center justify-center rounded-lg ${c.bg} ${c.color} mb-2`}>
            <i className={`${c.icon} text-sm`} />
          </div>
          <p className="text-xl font-heading font-semibold text-foreground-900">{c.value}</p>
          <p className="text-[10px] text-foreground-500 font-label mt-0.5 uppercase tracking-wide">{c.label}</p>
        </div>
      ))}
    </div>
  );
}

// ── Progress bar ──

function ProgressBar({ stats }: { stats: ReturnType<typeof useTasks>['stats'] }) {
  const pct = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
  return (
    <div className="card-default mb-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-label text-foreground-600">Overall completion</span>
        <span className="text-xs font-label font-semibold text-foreground-900">{pct}%</span>
      </div>
      <div className="w-full h-2.5 rounded-full bg-background-200 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-accent-400 to-accent-500 rounded-full transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Task card for list view ──

function TaskRow({
  task,
  onToggle,
  onEdit,
  selected,
  onSelect,
  showSelect,
}: {
  task: WeddingTask;
  onToggle: (id: string, status: string) => void;
  onEdit: (task: WeddingTask) => void;
  selected: boolean;
  onSelect: (id: string) => void;
  showSelect: boolean;
}) {
  const isCompleted = task.status === 'completed';
  const isArchived = task.status === 'archived';
  const due = getDueLabel(task.due_date);
  const checklistDone = (task.items || []).filter((i) => i.completed).length;
  const checklistTotal = (task.items || []).length;

  return (
    <div
      className={`bg-white rounded-xl border p-4 flex items-start gap-3 hover:border-primary-200 transition-colors group cursor-pointer ${
        isCompleted ? 'opacity-60 border-secondary-100' : isArchived ? 'opacity-50 border-secondary-100' : 'border-secondary-200'
      } ${selected ? 'border-primary-400 bg-primary-50/30' : ''}`}
      onClick={() => onEdit(task)}
    >
      {/* Select checkbox */}
      {showSelect && (
        <button
          onClick={(e) => { e.stopPropagation(); onSelect(task.id); }}
          className={`w-5 h-5 mt-0.5 flex items-center justify-center rounded border-2 flex-shrink-0 transition-colors cursor-pointer ${
            selected ? 'bg-primary-500 border-primary-500 text-white' : 'border-secondary-300 hover:border-primary-400'
          }`}
        >
          {selected && <i className="ri-check-line text-[10px]" />}
        </button>
      )}

      {/* Complete checkbox */}
      <button
        onClick={(e) => { e.stopPropagation(); if (!isArchived) onToggle(task.id, task.status); }}
        className={`w-5 h-5 flex-shrink-0 mt-0.5 flex items-center justify-center rounded border-2 transition-colors cursor-pointer ${
          isCompleted
            ? 'border-emerald-400 bg-emerald-400 text-white'
            : task.priority === 'high'
              ? 'border-red-300 hover:border-red-500 hover:bg-red-50'
              : 'border-secondary-300 hover:border-primary-400 hover:bg-primary-50'
        } ${isArchived ? 'opacity-40 cursor-not-allowed' : ''}`}
        aria-label={isCompleted ? 'Reopen task' : 'Complete task'}
      >
        {isCompleted && <i className="ri-check-line text-[10px]" />}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 flex-wrap mb-1">
          <p className={`text-sm font-label font-medium ${isCompleted ? 'line-through text-foreground-400' : 'text-foreground-900'}`}>
            {task.title}
          </p>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-label flex-shrink-0 ${PRIORITY_COLORS[task.priority]}`}>
            {task.priority}
          </span>
          {task.status === 'in_progress' && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-label bg-sky-100 text-sky-700 flex-shrink-0">
              In progress
            </span>
          )}
          {task.status === 'archived' && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-label bg-secondary-100 text-secondary-600 flex-shrink-0">
              Archived
            </span>
          )}
        </div>

        {task.description && (
          <p className="text-xs text-foreground-500 mb-1.5 line-clamp-2">{task.description}</p>
        )}

        {/* Checklist mini-progress */}
        {checklistTotal > 0 && (
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className="flex-1 max-w-[80px] h-1 rounded-full bg-background-200 overflow-hidden">
              <div
                className="h-full bg-emerald-400 rounded-full transition-all"
                style={{ width: `${Math.round((checklistDone / checklistTotal) * 100)}%` }}
              />
            </div>
            <span className="text-[10px] text-foreground-400">{checklistDone}/{checklistTotal}</span>
          </div>
        )}

        <div className="flex items-center gap-3 flex-wrap text-[10px] text-foreground-400">
          {task.category && (
            <span className="flex items-center gap-1">
              <i className="ri-folder-line text-[9px]" />{task.category}
            </span>
          )}
          {task.due_date && (
            <span className={`flex items-center gap-1 ${due.urgent ? 'text-red-500 font-semibold' : ''}`}>
              <i className="ri-calendar-line text-[9px]" />
              {due.text}
              {task.due_time && ` at ${formatTime(task.due_time)}`}
            </span>
          )}
          {task.assigned_to && (
            <span className="flex items-center gap-1">
              <i className="ri-user-line text-[9px]" />{task.assigned_to}
            </span>
          )}
        </div>
      </div>

      {/* Status icon */}
      <div className={`w-7 h-7 flex items-center justify-center rounded-full flex-shrink-0 ${STATUS_COLORS[task.status]}`}>
        <i className={`${STATUS_ICONS[task.status]} text-sm`} />
      </div>
    </div>
  );
}

// ── Board view task card ──

function BoardCard({ task, onToggle, onEdit }: { task: WeddingTask; onToggle: (id: string, status: string) => void; onEdit: (task: WeddingTask) => void }) {
  const isCompleted = task.status === 'completed';
  const due = getDueLabel(task.due_date);

  return (
    <div
      className="bg-white rounded-lg border border-secondary-200 p-3 hover:border-primary-200 transition-colors cursor-pointer"
      onClick={() => onEdit(task)}
    >
      <p className={`text-xs font-label font-medium mb-1 ${isCompleted ? 'line-through text-foreground-400' : 'text-foreground-900'}`}>
        {task.title}
      </p>
      <div className="flex items-center gap-2 flex-wrap text-[10px] text-foreground-400 mb-1.5">
        <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[task.priority]}`} />
        {task.category}
      </div>
      {task.due_date && (
        <p className={`text-[10px] ${due.urgent ? 'text-red-500 font-semibold' : 'text-foreground-500'}`}>
          {due.text}
        </p>
      )}
      {task.assigned_to && (
        <p className="text-[10px] text-foreground-400 mt-0.5">
          <i className="ri-user-line mr-0.5" />{task.assigned_to}
        </p>
      )}
    </div>
  );
}

// ── Main page ──

export default function TasksPage() {
  const {
    tasks, stats, loading, error,
    filterStatus, filterPriority, filterCategory, search, sort, sortAsc,
    setFilterStatus, setFilterPriority, setFilterCategory, setSearch, setSort, setSortAsc,
    filteredTasks, refresh, createTask, updateTask, deleteTask, archiveTask, restoreTask,
    toggleComplete, bulkComplete, bulkArchive, bulkDelete,
  } = useTasks();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<WeddingTask | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState('');
  const [viewMode, setViewMode] = useState<TaskViewMode>('list');
  const [showArchived, setShowArchived] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkConfirm, setBulkConfirm] = useState<'complete' | 'archive' | 'delete' | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const categories = useMemo(() => {
    const cats = new Set(tasks.map((t) => t.category));
    DEFAULT_TASK_CATEGORIES.forEach((c) => cats.add(c));
    return Array.from(cats).sort();
  }, [tasks]);

  const displayedTasks = useMemo(() => {
    if (showArchived) return filteredTasks.filter((t) => t.status === 'archived');
    return filteredTasks.filter((t) => t.status !== 'archived');
  }, [filteredTasks, showArchived]);

  const boardTasks = useMemo(() => ({
    pending: displayedTasks.filter((t) => t.status === 'pending'),
    in_progress: displayedTasks.filter((t) => t.status === 'in_progress'),
    completed: displayedTasks.filter((t) => t.status === 'completed'),
  }), [displayedTasks]);

  // ── Handlers ──

  const handleOpenCreate = () => {
    setEditingTask(null);
    setDrawerOpen(true);
  };

  const handleOpenEdit = useCallback((task: WeddingTask) => {
    setEditingTask(task);
    setDrawerOpen(true);
  }, []);

  const handleSave = async (form: TaskFormData): Promise<{ error: string | null }> => {
    setIsSubmitting(true);
    try {
      if (editingTask) {
        const { error: err } = await updateTask(editingTask.id, form);
        if (err) return { error: err };
        showToast('Task updated');
        setDrawerOpen(false);
        setEditingTask(null);
        return { error: null };
      }
      const { error: err } = await createTask(form);
      if (err) return { error: err };
      showToast('Task created');
      setDrawerOpen(false);
      return { error: null };
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (id: string, status: string) => {
    const { error: err } = await toggleComplete(id, status);
    if (err) showToast('Something went wrong');
    else showToast(status === 'completed' ? 'Task reopened' : 'Task completed');
  };

  const handleDelete = async (id: string) => {
    const { error: err } = await deleteTask(id);
    if (err) showToast('Failed to delete');
    else showToast('Task deleted');
    setDrawerOpen(false);
    setEditingTask(null);
  };

  const handleArchive = async (id: string) => {
    const { error: err } = await archiveTask(id);
    if (err) showToast('Failed to archive');
    else showToast('Task archived');
    setDrawerOpen(false);
    setEditingTask(null);
  };

  const handleRestore = async (id: string) => {
    const { error: err } = await restoreTask(id);
    if (err) showToast('Failed to restore');
    else showToast('Task restored');
  };

  const handleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === displayedTasks.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displayedTasks.map((t) => t.id)));
    }
  };

  const handleBulkAction = async () => {
    if (!bulkConfirm) return;
    const ids = Array.from(selectedIds);
    let err: string | null = null;

    if (bulkConfirm === 'complete') {
      ({ error: err } = await bulkComplete(ids));
      if (!err) showToast(`${ids.length} tasks completed`);
    } else if (bulkConfirm === 'archive') {
      ({ error: err } = await bulkArchive(ids));
      if (!err) showToast(`${ids.length} tasks archived`);
    } else if (bulkConfirm === 'delete') {
      ({ error: err } = await bulkDelete(ids));
      if (!err) showToast(`${ids.length} tasks deleted`);
    }

    if (err) showToast('Something went wrong');
    setSelectedIds(new Set());
    setBulkConfirm(null);
  };

  const hasFilters = search || filterStatus !== 'all' || filterPriority !== 'all' || filterCategory !== 'all';
  const clearFilters = () => { setSearch(''); setFilterStatus('all'); setFilterPriority('all'); setFilterCategory('all'); };

  // ── Loading state ──

  if (loading) {
    return (
      <AppShell>
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <h1 className="font-heading text-2xl md:text-3xl text-foreground-900">Tasks</h1>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 mb-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="card-default animate-pulse">
                <div className="w-8 h-8 rounded-lg bg-background-200 mb-2" />
                <div className="h-6 w-10 bg-background-200 rounded mb-1" />
                <div className="h-3 w-14 bg-background-200 rounded" />
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-secondary-200 p-4 animate-pulse">
                <div className="flex items-start gap-4">
                  <div className="w-5 h-5 rounded bg-background-200 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-48 bg-background-200 rounded" />
                    <div className="h-3 w-72 bg-background-200 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  // ── Error state ──

  if (error) {
    return (
      <AppShell>
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <h1 className="font-heading text-2xl md:text-3xl text-foreground-900">Tasks</h1>
          </div>
          <div className="card-default text-center py-14">
            <div className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-red-50 text-red-500 mb-3">
              <i className="ri-error-warning-line text-xl" />
            </div>
            <p className="text-sm text-foreground-700 mb-1 font-medium">Couldn&apos;t load tasks</p>
            <p className="text-xs text-foreground-500 mb-4">{error}</p>
            <button onClick={refresh} className="btn-outline text-xs py-2 cursor-pointer whitespace-nowrap">
              <i className="ri-refresh-line mr-1.5" />Try again
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {/* Toast */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-lg bg-accent-500 text-white text-sm font-label font-medium shadow-lg whitespace-nowrap animate-[fadeIn_0.2s_ease-out]">
          <i className="ri-check-line mr-2" />{toast}
        </div>
      )}

      {/* Bulk confirm modal */}
      {bulkConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setBulkConfirm(null)}>
          <div className="bg-white rounded-xl w-full max-w-sm mx-4 px-6 py-5 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <i className="ri-error-warning-line text-amber-600 text-lg" />
              </div>
              <div>
                <p className="font-label font-semibold text-foreground-900 text-sm">
                  {bulkConfirm === 'complete' ? 'Complete tasks?' : bulkConfirm === 'archive' ? 'Archive tasks?' : 'Delete tasks?'}
                </p>
                <p className="text-xs text-foreground-500 mt-0.5">
                  {selectedIds.size} task{selectedIds.size !== 1 ? 's' : ''} selected
                  {bulkConfirm === 'delete' ? '. This cannot be undone.' : ''}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setBulkConfirm(null)} className="px-4 py-2 text-sm font-label text-foreground-600 hover:bg-background-100 rounded-lg cursor-pointer whitespace-nowrap">Cancel</button>
              <button
                onClick={handleBulkAction}
                className={`px-5 py-2 rounded-lg text-sm font-label font-semibold text-white cursor-pointer whitespace-nowrap ${
                  bulkConfirm === 'delete' ? 'bg-red-500 hover:bg-red-600' : 'bg-primary-500 hover:bg-primary-600'
                }`}
              >
                {bulkConfirm === 'complete' ? 'Complete all' : bulkConfirm === 'archive' ? 'Archive all' : 'Delete all'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="font-heading text-2xl md:text-3xl text-foreground-900">Tasks</h1>
              {isDemoMode && (
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-label font-semibold">
                  Demo Account
                </span>
              )}
            </div>
            <p className="text-sm text-foreground-500 mt-1">Keep track of every task leading up to your big day</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleOpenCreate} className="btn-primary text-xs py-2 cursor-pointer whitespace-nowrap">
              <i className="ri-add-line mr-1.5" />Add task
            </button>
          </div>
        </div>

        {/* Stats */}
        <StatsCards stats={stats} />
        <ProgressBar stats={stats} />

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          {/* Search */}
          <div className="relative flex-1">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400 text-xs" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none focus:border-primary-400 transition-colors"
            />
          </div>

          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as TaskFilterStatus)}
            className="px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-700 focus:outline-none cursor-pointer whitespace-nowrap"
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In progress</option>
            <option value="completed">Completed</option>
            <option value="overdue">Overdue</option>
            <option value="due_soon">Due soon</option>
          </select>

          {/* Priority filter */}
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value as TaskFilterPriority)}
            className="px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-700 focus:outline-none cursor-pointer whitespace-nowrap"
          >
            <option value="all">All priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Category filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-700 focus:outline-none cursor-pointer whitespace-nowrap"
          >
            <option value="all">All categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          {/* Sort */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as TaskSort)}
            className="px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-700 focus:outline-none cursor-pointer whitespace-nowrap"
          >
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>Sort: {o.label}</option>)}
          </select>

          <button
            onClick={() => setSortAsc(!sortAsc)}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-secondary-200 bg-white text-foreground-500 hover:bg-background-100 cursor-pointer transition-colors flex-shrink-0"
            title={sortAsc ? 'Ascending' : 'Descending'}
          >
            <i className={sortAsc ? 'ri-sort-asc' : 'ri-sort-desc'} />
          </button>

          {/* Clear filters */}
          {hasFilters && (
            <button onClick={clearFilters} className="text-xs text-accent-600 hover:text-accent-700 font-label cursor-pointer whitespace-nowrap px-1">
              Clear
            </button>
          )}
        </div>

        {/* View mode + bulk actions + archived toggle */}
        <div className="flex items-center justify-between mb-4">
          {/* Selection controls */}
          <div className="flex items-center gap-2">
            {/* Select all */}
            {displayedTasks.length > 0 && (
              <button
                onClick={handleSelectAll}
                className="flex items-center gap-1.5 text-xs font-label text-foreground-500 hover:text-foreground-700 cursor-pointer whitespace-nowrap"
              >
                <span className={`w-4 h-4 flex items-center justify-center rounded border-2 transition-colors ${
                  selectedIds.size === displayedTasks.length ? 'bg-primary-500 border-primary-500 text-white' : 'border-secondary-300'
                }`}>
                  {selectedIds.size === displayedTasks.length && <i className="ri-check-line text-[8px]" />}
                </span>
                {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select all'}
              </button>
            )}

            {/* Bulk actions */}
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setBulkConfirm('complete')}
                  className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-label font-medium hover:bg-emerald-100 cursor-pointer whitespace-nowrap"
                >
                  <i className="ri-check-line mr-1" />Complete
                </button>
                <button
                  onClick={() => setBulkConfirm('archive')}
                  className="px-2.5 py-1 rounded-md bg-secondary-100 text-secondary-700 text-[11px] font-label font-medium hover:bg-secondary-200 cursor-pointer whitespace-nowrap"
                >
                  <i className="ri-archive-line mr-1" />Archive
                </button>
                <button
                  onClick={() => setBulkConfirm('delete')}
                  className="px-2.5 py-1 rounded-md bg-red-50 text-red-600 text-[11px] font-label font-medium hover:bg-red-100 cursor-pointer whitespace-nowrap"
                >
                  <i className="ri-delete-bin-line mr-1" />Delete
                </button>
              </div>
            )}
          </div>

          {/* Right side: view toggle + archived */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowArchived(!showArchived)}
              className={`text-xs font-label cursor-pointer whitespace-nowrap px-2.5 py-1 rounded-md transition-colors ${
                showArchived ? 'bg-secondary-200 text-secondary-800' : 'text-foreground-500 hover:text-foreground-700'
              }`}
            >
              <i className="ri-archive-line mr-1" />Archived
            </button>

            {/* View mode */}
            <div className="flex items-center rounded-lg border border-secondary-200 overflow-hidden">
              <button
                onClick={() => setViewMode('list')}
                className={`px-2.5 py-1.5 text-xs cursor-pointer transition-colors ${viewMode === 'list' ? 'bg-primary-500 text-white' : 'text-foreground-500 hover:bg-background-100'}`}
                aria-label="List view"
              >
                <i className="ri-list-check" />
              </button>
              <button
                onClick={() => setViewMode('board')}
                className={`px-2.5 py-1.5 text-xs cursor-pointer transition-colors ${viewMode === 'board' ? 'bg-primary-500 text-white' : 'text-foreground-500 hover:bg-background-100'}`}
                aria-label="Board view"
              >
                <i className="ri-layout-column-line" />
              </button>
            </div>
          </div>
        </div>

        {/* Content area */}
        {displayedTasks.length === 0 ? (
          <div className="card-default text-center py-14">
            <div className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-background-100 text-foreground-300 mb-3">
              <i className="ri-calendar-check-line text-xl" />
            </div>
            <p className="text-sm text-foreground-500 mb-3">
              {showArchived ? 'No archived tasks.' : hasFilters ? 'No tasks match your filters.' : 'No tasks yet.'}
            </p>
            {hasFilters ? (
              <button onClick={clearFilters} className="btn-outline text-xs py-2 cursor-pointer whitespace-nowrap">
                Clear filters
              </button>
            ) : !showArchived ? (
              <button onClick={handleOpenCreate} className="btn-primary text-xs py-2 cursor-pointer whitespace-nowrap">
                <i className="ri-add-line mr-1.5" />Create your first task
              </button>
            ) : null}
          </div>
        ) : viewMode === 'list' ? (
          <div className="space-y-2">
            {displayedTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onToggle={showArchived ? handleRestore : handleToggle}
                onEdit={showArchived ? () => handleRestore(task.id) : handleOpenEdit}
                selected={selectedIds.has(task.id)}
                onSelect={handleSelect}
                showSelect={true}
              />
            ))}
          </div>
        ) : (
          /* Board view */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {BOARD_COLUMNS.map((col) => {
              const colTasks = boardTasks[col.key];
              return (
                <div key={col.key} className={`rounded-xl p-3 ${col.bg}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <i className={`${col.icon} text-sm text-foreground-600`} />
                      <span className="text-xs font-label font-semibold text-foreground-700">{col.label}</span>
                    </div>
                    <span className="text-[10px] text-foreground-400 font-label">{colTasks.length}</span>
                  </div>
                  <div className="space-y-2 min-h-[100px]">
                    {colTasks.map((task) => (
                      <BoardCard key={task.id} task={task} onToggle={handleToggle} onEdit={handleOpenEdit} />
                    ))}
                    {colTasks.length === 0 && (
                      <p className="text-[10px] text-foreground-300 italic text-center py-4">No tasks</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Quick actions in drawer (edit mode) */}
        {editingTask && drawerOpen && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 bg-white rounded-full border border-secondary-200 shadow-lg px-3 py-2">
            <button
              onClick={() => { if (editingTask) handleArchive(editingTask.id); }}
              className="px-3 py-1.5 text-xs font-label text-foreground-600 hover:bg-background-100 rounded-full cursor-pointer whitespace-nowrap transition-colors"
              disabled={editingTask.status === 'archived'}
            >
              <i className="ri-archive-line mr-1" />Archive
            </button>
            <div className="w-px h-4 bg-secondary-200" />
            <button
              onClick={() => { if (editingTask) handleDelete(editingTask.id); }}
              className="px-3 py-1.5 text-xs font-label text-red-600 hover:bg-red-50 rounded-full cursor-pointer whitespace-nowrap transition-colors"
            >
              <i className="ri-delete-bin-line mr-1" />Delete
            </button>
          </div>
        )}
      </div>

      {/* Task drawer */}
      <TaskDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setEditingTask(null); }}
        onSave={handleSave}
        task={editingTask}
        isSubmitting={isSubmitting}
      />

      {/* Animation style */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </AppShell>
  );
}