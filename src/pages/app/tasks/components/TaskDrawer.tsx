import { useState, useEffect } from 'react';
import type { WeddingTask, TaskFormData, TaskStatus, TaskPriority, TaskVisibility } from '@/types/tasks';
import { DEFAULT_TASK_CATEGORIES, EMPTY_TASK_FORM } from '@/types/tasks';

// ── Status options ──

const STATUS_OPTIONS: { value: TaskStatus; label: string; icon: string }[] = [
  { value: 'pending', label: 'Pending', icon: 'ri-time-line' },
  { value: 'in_progress', label: 'In Progress', icon: 'ri-loader-4-line' },
  { value: 'completed', label: 'Completed', icon: 'ri-check-double-line' },
];

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

// ── Props ──

interface TaskDrawerProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: TaskFormData) => Promise<{ error: string | null }>;
  task?: WeddingTask | null;
  isSubmitting: boolean;
}

export default function TaskDrawer({ open, onClose, onSave, task, isSubmitting }: TaskDrawerProps) {
  const isEdit = !!task;
  const [form, setForm] = useState<TaskFormData>({ ...EMPTY_TASK_FORM });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Populate form when task changes
  useEffect(() => {
    if (task) {
      setForm({
        title: task.title || '',
        description: task.description || '',
        category: task.category || 'Other',
        priority: task.priority || 'medium',
        status: task.status || 'pending',
        due_date: task.due_date || '',
        due_time: task.due_time || '',
        assigned_to: task.assigned_to || '',
        notes: task.notes || '',
        visibility: task.visibility || 'private',
        checklistItems: (task.items || []).map((it) => ({
          tempId: it.id,
          content: it.content,
          completed: it.completed,
        })),
      });
    } else {
      setForm({ ...EMPTY_TASK_FORM });
    }
    setValidationErrors({});
  }, [task, open]);

  const set = (field: string, value: unknown) => setForm((f) => ({ ...f, [field]: value }));

  // ── Checklist helpers ──

  const addChecklistItem = () => {
    setForm((f) => ({
      ...f,
      checklistItems: [...f.checklistItems, { tempId: `new-${Date.now()}`, content: '', completed: false }],
    }));
  };

  const updateChecklistItem = (tempId: string, updates: Partial<{ content: string; completed: boolean }>) => {
    setForm((f) => ({
      ...f,
      checklistItems: f.checklistItems.map((it) => (it.tempId === tempId ? { ...it, ...updates } : it)),
    }));
  };

  const removeChecklistItem = (tempId: string) => {
    setForm((f) => ({ ...f, checklistItems: f.checklistItems.filter((it) => it.tempId !== tempId) }));
  };

  // ── Validation ──

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.title.trim()) errors.title = 'Title is required';
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    const { error } = await onSave(form);
    if (error) {
      setValidationErrors({ submit: error });
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 pb-16 bg-black/30 overflow-y-auto" onClick={onClose}>
      <div
        className="bg-white rounded-xl w-full max-w-lg mx-4 shadow-lg"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={isEdit ? 'Edit task' : 'Create task'}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-background-200">
          <h3 className="font-heading text-lg text-foreground-900">
            {isEdit ? 'Edit task' : 'New task'}
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-md text-foreground-400 hover:bg-background-100 cursor-pointer transition-colors"
            aria-label="Close"
          >
            <i className="ri-close-line" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4 max-h-[calc(100vh-280px)] overflow-y-auto">

          {/* Title */}
          <div>
            <label htmlFor="task-title" className="block text-xs font-label font-medium text-foreground-700 mb-1.5">
              Title *
            </label>
            <input
              id="task-title"
              type="text"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="e.g. Book the florist"
              className={`w-full px-3 py-2 rounded-lg border text-sm text-foreground-900 focus:outline-none focus:border-primary-400 transition-colors ${validationErrors.title ? 'border-red-400' : 'border-background-200'}`}
            />
            {validationErrors.title && <p className="text-xs text-red-500 mt-1">{validationErrors.title}</p>}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="task-desc" className="block text-xs font-label font-medium text-foreground-700 mb-1.5">
              Description
            </label>
            <textarea
              id="task-desc"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={2}
              placeholder="Add details..."
              className="w-full px-3 py-2 rounded-lg border border-background-200 text-sm text-foreground-900 focus:outline-none focus:border-primary-400 transition-colors resize-none"
            />
          </div>

          {/* Category / Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="task-category" className="block text-xs font-label font-medium text-foreground-700 mb-1.5">
                Category
              </label>
              <select
                id="task-category"
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-background-200 text-sm text-foreground-700 focus:outline-none focus:border-primary-400 cursor-pointer transition-colors bg-white"
              >
                {DEFAULT_TASK_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="task-priority" className="block text-xs font-label font-medium text-foreground-700 mb-1.5">
                Priority
              </label>
              <select
                id="task-priority"
                value={form.priority}
                onChange={(e) => set('priority', e.target.value as TaskPriority)}
                className="w-full px-3 py-2 rounded-lg border border-background-200 text-sm text-foreground-700 focus:outline-none focus:border-primary-400 cursor-pointer transition-colors bg-white"
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Status (edit only) */}
          {isEdit && (
            <div>
              <label htmlFor="task-status" className="block text-xs font-label font-medium text-foreground-700 mb-1.5">
                Status
              </label>
              <select
                id="task-status"
                value={form.status}
                onChange={(e) => set('status', e.target.value as TaskStatus)}
                className="w-full px-3 py-2 rounded-lg border border-background-200 text-sm text-foreground-700 focus:outline-none focus:border-primary-400 cursor-pointer transition-colors bg-white"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Due date / Due time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="task-due-date" className="block text-xs font-label font-medium text-foreground-700 mb-1.5">
                Due date
              </label>
              <input
                id="task-due-date"
                type="date"
                value={form.due_date}
                onChange={(e) => set('due_date', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-background-200 text-sm text-foreground-900 focus:outline-none focus:border-primary-400 transition-colors cursor-pointer"
              />
            </div>
            <div>
              <label htmlFor="task-due-time" className="block text-xs font-label font-medium text-foreground-700 mb-1.5">
                Due time
              </label>
              <input
                id="task-due-time"
                type="time"
                value={form.due_time}
                onChange={(e) => set('due_time', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-background-200 text-sm text-foreground-900 focus:outline-none focus:border-primary-400 transition-colors cursor-pointer"
              />
            </div>
          </div>

          {/* Assigned to */}
          <div>
            <label htmlFor="task-assignee" className="block text-xs font-label font-medium text-foreground-700 mb-1.5">
              Assigned to
            </label>
            <input
              id="task-assignee"
              type="text"
              value={form.assigned_to}
              onChange={(e) => set('assigned_to', e.target.value)}
              placeholder="e.g. Sarah (Planner)"
              className="w-full px-3 py-2 rounded-lg border border-background-200 text-sm text-foreground-900 focus:outline-none focus:border-primary-400 transition-colors"
            />
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="task-notes" className="block text-xs font-label font-medium text-foreground-700 mb-1.5">
              Notes
            </label>
            <textarea
              id="task-notes"
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={2}
              placeholder="Quick notes..."
              className="w-full px-3 py-2 rounded-lg border border-background-200 text-sm text-foreground-900 focus:outline-none focus:border-primary-400 transition-colors resize-none"
            />
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">
              Visibility
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => set('visibility', 'private' as TaskVisibility)}
                className={`flex-1 px-3 py-2 rounded-lg border text-sm font-label cursor-pointer transition-colors whitespace-nowrap ${form.visibility === 'private' ? 'border-primary-300 bg-primary-50 text-primary-700' : 'border-background-200 text-foreground-600 hover:bg-background-50'}`}
              >
                <i className="ri-lock-line mr-1.5 text-xs" />Private
              </button>
              <button
                type="button"
                onClick={() => set('visibility', 'public' as TaskVisibility)}
                className={`flex-1 px-3 py-2 rounded-lg border text-sm font-label cursor-pointer transition-colors whitespace-nowrap ${form.visibility === 'public' ? 'border-primary-300 bg-primary-50 text-primary-700' : 'border-background-200 text-foreground-600 hover:bg-background-50'}`}
              >
                <i className="ri-eye-line mr-1.5 text-xs" />Public
              </button>
            </div>
          </div>

          {/* Checklist */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-label font-medium text-foreground-700">
                Checklist
              </label>
              <button
                type="button"
                onClick={addChecklistItem}
                className="text-xs text-primary-600 hover:text-primary-700 font-label cursor-pointer whitespace-nowrap"
              >
                <i className="ri-add-line mr-1" />Add item
              </button>
            </div>
            {form.checklistItems.length === 0 ? (
              <p className="text-xs text-foreground-400 italic">No checklist items yet</p>
            ) : (
              <div className="space-y-2">
                {form.checklistItems.map((item) => (
                  <div key={item.tempId} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={(e) => updateChecklistItem(item.tempId, { completed: e.target.checked })}
                      className="w-4 h-4 rounded border-background-300 text-primary-500 cursor-pointer flex-shrink-0"
                    />
                    <input
                      type="text"
                      value={item.content}
                      onChange={(e) => updateChecklistItem(item.tempId, { content: e.target.value })}
                      placeholder="Checklist item..."
                      className="flex-1 px-2 py-1.5 rounded border border-background-200 text-sm text-foreground-900 focus:outline-none focus:border-primary-400 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => removeChecklistItem(item.tempId)}
                      className="w-6 h-6 flex items-center justify-center rounded text-foreground-400 hover:text-red-500 cursor-pointer flex-shrink-0 transition-colors"
                      aria-label="Remove item"
                    >
                      <i className="ri-close-line text-xs" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit error */}
          {validationErrors.submit && (
            <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <i className="ri-error-warning-line flex-shrink-0" />
              {validationErrors.submit}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-background-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-label text-foreground-600 hover:bg-background-100 rounded-lg cursor-pointer whitespace-nowrap transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !form.title.trim()}
            className="px-5 py-2 bg-primary-500 text-white rounded-lg text-sm font-label font-semibold hover:bg-primary-600 disabled:opacity-40 cursor-pointer whitespace-nowrap transition-colors"
          >
            {isSubmitting ? (
              <><i className="ri-loader-4-line animate-spin mr-1.5" />Saving...</>
            ) : (
              isEdit ? 'Save changes' : 'Create task'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}