// ── Wedding-Day Timeline Types ──

export type TimelineCategory =
  | 'guest_event'
  | 'setup'
  | 'supplier_arrival'
  | 'delivery'
  | 'photography'
  | 'hair_makeup'
  | 'transport'
  | 'ceremony_action'
  | 'reception_action'
  | 'speech'
  | 'entertainment'
  | 'catering'
  | 'room_turnaround'
  | 'cleanup'
  | 'reminder'
  | 'custom';

export const TIMELINE_CATEGORY_LABELS: Record<TimelineCategory, string> = {
  guest_event: 'Guest-facing event',
  setup: 'Setup',
  supplier_arrival: 'Supplier arrival',
  delivery: 'Delivery',
  photography: 'Photography',
  hair_makeup: 'Hair & makeup',
  transport: 'Transport',
  ceremony_action: 'Ceremony action',
  reception_action: 'Reception action',
  speech: 'Speech',
  entertainment: 'Entertainment',
  catering: 'Catering',
  room_turnaround: 'Room turnaround',
  cleanup: 'Cleanup',
  reminder: 'Reminder',
  custom: 'Custom',
};

export const TIMELINE_CATEGORY_ICONS: Record<TimelineCategory, string> = {
  guest_event: 'ri-user-heart-line',
  setup: 'ri-tools-line',
  supplier_arrival: 'ri-truck-line',
  delivery: 'ri-store-2-line',
  photography: 'ri-camera-line',
  hair_makeup: 'ri-brush-line',
  transport: 'ri-car-line',
  ceremony_action: 'ri-heart-line',
  reception_action: 'ri-restaurant-line',
  speech: 'ri-mic-line',
  entertainment: 'ri-music-line',
  catering: 'ri-cake-line',
  room_turnaround: 'ri-refresh-line',
  cleanup: 'ri-delete-back-line',
  reminder: 'ri-alarm-line',
  custom: 'ri-star-line',
};

export type TimelineVisibility = 'private' | 'collaborator' | 'supplier' | 'guest';
export type TimelineStatus = 'draft' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
export type TimelinePriority = 'high' | 'medium' | 'low';

export const TIMELINE_VISIBILITY_LABELS: Record<TimelineVisibility, string> = {
  private: 'Organiser only',
  collaborator: 'Collaborators',
  supplier: 'Supplier',
  guest: 'Guest-safe',
};

export const TIMELINE_STATUS_LABELS: Record<TimelineStatus, string> = {
  draft: 'Draft',
  confirmed: 'Confirmed',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const TIMELINE_STATUS_COLORS: Record<TimelineStatus, string> = {
  draft: 'bg-secondary-100 text-secondary-700',
  confirmed: 'bg-primary-100 text-primary-700',
  in_progress: 'bg-sky-100 text-sky-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
};

export const TIMELINE_PRIORITY_COLORS: Record<TimelinePriority, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-secondary-100 text-secondary-600',
};

export interface TimelineItem {
  id: string;
  wedding_id: string;
  timeline_date: string;       // YYYY-MM-DD
  title: string;
  category: TimelineCategory;
  start_at: string | null;     // ISO timestamp
  end_at: string | null;       // ISO timestamp
  duration_min: number | null;
  description: string | null;
  location: string | null;
  wedding_event_id: string | null;
  supplier_id: string | null;
  assigned_user_id: string | null;
  responsible_contact: string | null;
  internal_notes: string | null;
  shared_notes: string | null;
  visibility: TimelineVisibility;
  status: TimelineStatus;
  priority: TimelinePriority;
  sort_order: number;
  created_at: string;
  updated_at: string;
  // Joined fields
  linked_event_name?: string | null;
  linked_event_time?: string | null;
  linked_event_venue?: string | null;
  linked_supplier_name?: string | null;
  linked_assignee_name?: string | null;
}

export interface TimelineFormData {
  title: string;
  category: TimelineCategory;
  start_at: string;
  end_at: string;
  duration_min: number | null;
  description: string;
  location: string;
  wedding_event_id: string | null;
  supplier_id: string | null;
  assigned_user_id: string | null;
  responsible_contact: string;
  internal_notes: string;
  shared_notes: string;
  visibility: TimelineVisibility;
  status: TimelineStatus;
  priority: TimelinePriority;
}

export const EMPTY_TIMELINE_FORM: TimelineFormData = {
  title: '',
  category: 'custom',
  start_at: '',
  end_at: '',
  duration_min: null,
  description: '',
  location: '',
  wedding_event_id: null,
  supplier_id: null,
  assigned_user_id: null,
  responsible_contact: '',
  internal_notes: '',
  shared_notes: '',
  visibility: 'private',
  status: 'draft',
  priority: 'medium',
};

export interface TimelineValidation {
  id: string;
  type: 'overlap' | 'gap' | 'missing_owner' | 'missing_supplier' | 'missing_location' | 'missing_duration' | 'impossible_order' | 'event_conflict' | 'private_in_shareable' | 'outside_date';
  message: string;
  itemIds: string[];
  severity: 'critical' | 'warning' | 'info';
}

export type ExportCategory = 'calendar' | 'timeline' | 'guests' | 'seating' | 'budget' | 'suppliers' | 'registry' | 'gallery' | 'full_pack';
export type ExportFormat = 'pdf' | 'csv' | 'ics' | 'png';
export type ExportPrivacy = 'organiser' | 'supplier' | 'guest';
export type ExportStatus = 'pending' | 'generating' | 'completed' | 'failed' | 'expired';

export const EXPORT_CATEGORY_LABELS: Record<ExportCategory, string> = {
  calendar: 'Calendar',
  timeline: 'Timeline',
  guests: 'Guests & RSVP',
  seating: 'Seating',
  budget: 'Budget & Payments',
  suppliers: 'Suppliers',
  registry: 'Registry',
  gallery: 'Gallery manifest',
  full_pack: 'Full planning pack',
};

export const EXPORT_CATEGORY_ICONS: Record<ExportCategory, string> = {
  calendar: 'ri-calendar-2-line',
  timeline: 'ri-time-line',
  guests: 'ri-user-line',
  seating: 'ri-layout-grid-line',
  budget: 'ri-money-pound-circle-line',
  suppliers: 'ri-contacts-book-line',
  registry: 'ri-gift-line',
  gallery: 'ri-image-line',
  full_pack: 'ri-folder-zip-line',
};

export const EXPORT_FORMAT_LABELS: Record<ExportFormat, string> = {
  pdf: 'PDF',
  csv: 'CSV',
  ics: 'Calendar (.ics)',
  png: 'PNG Image',
};

export const EXPORT_PRIVACY_LABELS: Record<ExportPrivacy, string> = {
  organiser: 'Organiser copy',
  supplier: 'Supplier-safe copy',
  guest: 'Guest-safe copy',
};

export const EXPORT_STATUS_LABELS: Record<ExportStatus, string> = {
  pending: 'Pending',
  generating: 'Generating...',
  completed: 'Ready',
  failed: 'Failed',
  expired: 'Expired',
};

export const EXPORT_STATUS_COLORS: Record<ExportStatus, string> = {
  pending: 'bg-secondary-100 text-secondary-700',
  generating: 'bg-sky-100 text-sky-700',
  completed: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-red-100 text-red-700',
  expired: 'bg-foreground-100 text-foreground-500',
};

export interface ExportRequest {
  id: string;
  wedding_id: string;
  requested_by: string | null;
  export_type: string;
  status: ExportStatus;
  storage_path: string | null;
  contains_sensitive_data: boolean;
  requested_at: string;
  started_at: string | null;
  completed_at: string | null;
  expires_at: string | null;
  error_message: string | null;
  created_at: string;
  requested_by_name?: string | null;
}

export interface ExportPreset {
  category: ExportCategory;
  format: ExportFormat;
  privacy: ExportPrivacy;
  dateRange: { from: string; to: string };
  estimatedCount: number;
  filename: string;
}