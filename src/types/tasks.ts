// ── Wedding Task Types ──

export type TaskPriority = 'high' | 'medium' | 'low';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'archived';
export type TaskVisibility = 'public' | 'private';

export const DEFAULT_TASK_CATEGORIES = [
  'Venue',
  'Catering',
  'Attire',
  'Flowers',
  'Photography',
  'Music & Entertainment',
  'Guests',
  'Legal',
  'Budget',
  'Decoration',
  'Transport',
  'Honeymoon',
  'Gifts',
  'Stationery',
  'Other',
];

export interface WeddingTask {
  id: string;
  wedding_id: string;
  title: string;
  description: string | null;
  category: string;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string | null;
  due_time: string | null;
  assigned_to: string | null;
  created_by: string | null;
  supplier_id: string | null;
  expense_id: string | null;
  notes: string | null;
  sort_order: number;
  visibility: TaskVisibility;
  reminder_enabled: boolean;
  reminder_time: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  items?: WeddingTaskItem[];
}

export interface WeddingTaskItem {
  id: string;
  task_id: string;
  content: string;
  sort_order: number;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
}

export interface TaskActivityEntry {
  id: string;
  task_id: string;
  wedding_id: string;
  actor_id: string | null;
  action: string;
  changes: Record<string, unknown> | null;
  created_at: string;
}

export interface TaskFormData {
  title: string;
  description: string;
  category: string;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string;
  due_time: string;
  assigned_to: string;
  notes: string;
  visibility: TaskVisibility;
  checklistItems: { tempId: string; content: string; completed: boolean }[];
}

export const EMPTY_TASK_FORM: TaskFormData = {
  title: '',
  description: '',
  category: 'Other',
  priority: 'medium',
  status: 'pending',
  due_date: '',
  due_time: '',
  assigned_to: '',
  notes: '',
  visibility: 'private',
  checklistItems: [],
};

export interface TaskStats {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  overdue: number;
  dueSoon: number;
  highPriority: number;
  unassigned: number;
}

export type TaskFilterStatus = 'all' | 'pending' | 'in_progress' | 'completed' | 'archived' | 'overdue' | 'due_soon';
export type TaskFilterPriority = 'all' | 'high' | 'medium' | 'low';
export type TaskSort = 'due_date' | 'created_at' | 'priority' | 'title' | 'category';
export type TaskViewMode = 'list' | 'board' | 'timeline';