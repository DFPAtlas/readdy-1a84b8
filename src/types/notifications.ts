// ── Notification types for Vowora ──

export type NotificationType =
  | 'rsvp_submitted'
  | 'rsvp_updated'
  | 'rsvp_declined'
  | 'dietary_requirement'
  | 'accessibility_requirement'
  | 'guest_question_new'
  | 'guest_question_reply'
  | 'gallery_upload_pending'
  | 'gallery_approved'
  | 'gallery_rejected'
  | 'registry_contribution'
  | 'gift_reserved'
  | 'payment_due'
  | 'payment_overdue'
  | 'supplier_deadline'
  | 'supplier_appointment'
  | 'task_assigned'
  | 'task_due'
  | 'task_overdue'
  | 'event_updated'
  | 'rsvp_deadline'
  | 'collaborator_invited'
  | 'export_completed'
  | 'subscription_failed'
  | 'schedule_conflict'
  | 'system';

export type NotificationCategory =
  | 'rsvp'
  | 'guests'
  | 'questions'
  | 'gallery'
  | 'registry'
  | 'budget'
  | 'suppliers'
  | 'tasks'
  | 'schedule'
  | 'system'
  | 'billing';

export type NotificationPriority = 'info' | 'action' | 'urgent';

export interface AppNotification {
  id: string;
  weddingId: string;
  type: NotificationType;
  category: NotificationCategory;
  priority: NotificationPriority;
  title: string;
  message: string;
  route: string;
  routeLabel: string;
  relatedType: string;
  relatedId: string;
  dedupKey: string;
  readAt: string | null;
  createdAt: string;
  expiresAt: string | null;
  actorName: string;
  weddingName: string;
}

export interface NotificationFilters {
  category: NotificationCategory | 'all';
  priority: NotificationPriority | 'all';
  read: 'all' | 'unread' | 'read';
  search: string;
}

export const NOTIFICATION_CATEGORIES: { key: NotificationCategory; label: string; icon: string }[] = [
  { key: 'rsvp', label: 'RSVP', icon: 'ri-check-double-line' },
  { key: 'guests', label: 'Guests', icon: 'ri-group-line' },
  { key: 'questions', label: 'Questions', icon: 'ri-question-answer-line' },
  { key: 'gallery', label: 'Gallery', icon: 'ri-image-line' },
  { key: 'registry', label: 'Registry', icon: 'ri-gift-line' },
  { key: 'budget', label: 'Budget', icon: 'ri-money-pound-circle-line' },
  { key: 'suppliers', label: 'Vendors', icon: 'ri-contacts-book-line' },
  { key: 'tasks', label: 'Tasks', icon: 'ri-calendar-check-line' },
  { key: 'schedule', label: 'Schedule', icon: 'ri-calendar-event-line' },
  { key: 'system', label: 'System', icon: 'ri-settings-3-line' },
  { key: 'billing', label: 'Billing', icon: 'ri-bank-card-line' },
];

export function getNotificationIcon(type: NotificationType): string {
  switch (type) {
    case 'rsvp_submitted':
    case 'rsvp_updated':
      return 'ri-check-double-line';
    case 'rsvp_declined':
      return 'ri-close-circle-line';
    case 'dietary_requirement':
      return 'ri-restaurant-line';
    case 'accessibility_requirement':
      return 'ri-wheelchair-line';
    case 'guest_question_new':
    case 'guest_question_reply':
      return 'ri-question-answer-line';
    case 'gallery_upload_pending':
    case 'gallery_approved':
    case 'gallery_rejected':
      return 'ri-image-line';
    case 'registry_contribution':
    case 'gift_reserved':
      return 'ri-gift-line';
    case 'payment_due':
    case 'payment_overdue':
      return 'ri-bank-card-line';
    case 'supplier_deadline':
    case 'supplier_appointment':
      return 'ri-contacts-book-line';
    case 'task_assigned':
    case 'task_due':
    case 'task_overdue':
      return 'ri-calendar-check-line';
    case 'event_updated':
    case 'schedule_conflict':
      return 'ri-calendar-event-line';
    case 'rsvp_deadline':
      return 'ri-alarm-line';
    case 'collaborator_invited':
      return 'ri-user-add-line';
    case 'export_completed':
      return 'ri-download-cloud-2-line';
    case 'subscription_failed':
      return 'ri-error-warning-line';
    case 'system':
      return 'ri-information-line';
    default:
      return 'ri-notification-3-line';
  }
}

export function getPriorityColor(priority: NotificationPriority): string {
  switch (priority) {
    case 'urgent':
      return 'bg-red-100 text-red-700 border-red-200';
    case 'action':
      return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'info':
    default:
      return 'bg-primary-100 text-primary-700 border-primary-200';
  }
}

export function getCategoryBadge(category: NotificationCategory): string {
  switch (category) {
    case 'rsvp':
      return 'bg-accent-100 text-accent-700';
    case 'guests':
      return 'bg-primary-100 text-primary-700';
    case 'questions':
      return 'bg-secondary-100 text-secondary-700';
    case 'gallery':
      return 'bg-accent-100 text-accent-700';
    case 'registry':
      return 'bg-primary-100 text-primary-700';
    case 'budget':
      return 'bg-secondary-100 text-secondary-700';
    case 'suppliers':
      return 'bg-primary-100 text-primary-700';
    case 'tasks':
      return 'bg-amber-100 text-amber-700';
    case 'schedule':
      return 'bg-accent-100 text-accent-700';
    case 'system':
      return 'bg-secondary-100 text-secondary-700';
    case 'billing':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-secondary-100 text-secondary-700';
  }
}