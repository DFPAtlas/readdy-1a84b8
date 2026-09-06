// ── Calendar Aggregation Types ──

export type CalendarSource =
  | 'wedding_event'
  | 'task'
  | 'supplier_appointment'
  | 'supplier_deadline'
  | 'budget_payment'
  | 'rsvp_deadline'
  | 'gallery_close'
  | 'registry_close'
  | 'timeline_item'
  | 'invitation_deadline';

export const CALENDAR_SOURCE_LABELS: Record<CalendarSource, string> = {
  wedding_event: 'Wedding event',
  task: 'Task',
  supplier_appointment: 'Supplier appointment',
  supplier_deadline: 'Supplier deadline',
  budget_payment: 'Payment due',
  rsvp_deadline: 'RSVP deadline',
  gallery_close: 'Gallery closes',
  registry_close: 'Registry closes',
  timeline_item: 'Timeline item',
  invitation_deadline: 'Invitation deadline',
};

export const CALENDAR_SOURCE_ICONS: Record<CalendarSource, string> = {
  wedding_event: 'ri-calendar-event-line',
  task: 'ri-checkbox-circle-line',
  supplier_appointment: 'ri-user-star-line',
  supplier_deadline: 'ri-alert-line',
  budget_payment: 'ri-bank-card-line',
  rsvp_deadline: 'ri-mail-check-line',
  gallery_close: 'ri-image-line',
  registry_close: 'ri-gift-line',
  timeline_item: 'ri-time-line',
  invitation_deadline: 'ri-mail-send-line',
};

export type CalendarView = 'month' | 'week' | 'agenda';

export interface CalendarItem {
  id: string;
  source: CalendarSource;
  title: string;
  description: string | null;
  date: string;            // YYYY-MM-DD
  startTime: string | null; // HH:mm
  endTime: string | null;   // HH:mm
  startAt: string | null;   // ISO timestamp
  endAt: string | null;     // ISO timestamp
  allDay: boolean;
  status: string;
  priority: string | null;
  location: string | null;
  assignee: string | null;
  linkRoute: string | null;  // Route to source editor
  sourceId: string;          // Original record ID
  weddingId: string;
  category: string | null;
}

export interface ConflictWarning {
  id: string;
  type: 'overlap' | 'overdue' | 'missing_time' | 'missing_venue' | 'deadline_after_event' | 'double_booked';
  message: string;
  itemIds: string[];
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface CalendarFilters {
  sources: CalendarSource[];
  search: string;
  showCompleted: boolean;
  showPrivate: boolean;
  statusFilter: string;
  assigneeFilter: string;
}

export const DEFAULT_CALENDAR_FILTERS: CalendarFilters = {
  sources: ['wedding_event', 'task', 'supplier_appointment', 'supplier_deadline', 'budget_payment', 'rsvp_deadline'],
  search: '',
  showCompleted: false,
  showPrivate: true,
  statusFilter: 'all',
  assigneeFilter: 'all',
};