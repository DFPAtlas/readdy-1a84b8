// ── Gallery Admin Types ──

export type GalleryModerationStatus =
  | 'uploading'
  | 'processing'
  | 'scanning'
  | 'pending'
  | 'awaiting_review'
  | 'approved'
  | 'rejected'
  | 'held'
  | 'hidden'
  | 'removed'
  | 'failed';

export type GallerySourceType = 'couple' | 'guest' | 'photographer';
export type GalleryPublicationStatus = 'draft' | 'published' | 'hidden';
export type GalleryAlbumStatus = 'draft' | 'published' | 'hidden' | 'archived';

export interface GalleryAdminAsset {
  id: string;
  wedding_id: string;
  album_id: string | null;
  title: string | null;
  caption: string | null;
  storage_path: string;
  thumbnail_path: string | null;
  preview_path: string | null;
  file_size: number | null;
  mime_type: string;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
  uploaded_by_user_id: string | null;
  uploaded_by_guest_id: string | null;
  uploaded_by_invitation_id: string | null;
  moderation_status: GalleryModerationStatus;
  moderation_ai_label: string | null;
  moderation_reason: string | null;
  moderation_scanned_at: string | null;
  scanned_by: string | null;
  moderation_updated_by: string | null;
  moderation_updated_at: string | null;
  original_file_hash: string | null;
  metadata_stripped: boolean;
  source_type: GallerySourceType;
  publication_status: GalleryPublicationStatus;
  wall_visible: boolean;
  wall_added_at: string | null;
  published_at: string | null;
  captured_at: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  // Computed
  signed_url?: string;
  thumbnail_signed_url?: string;
  album_title?: string | null;
  uploader_name?: string | null;
}

export interface GalleryAdminAlbum {
  id: string;
  wedding_id: string;
  title: string;
  description: string | null;
  cover_asset_id: string | null;
  allow_uploads: boolean;
  is_published: boolean;
  publish_at: string | null;
  sort_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  // Computed
  asset_count: number;
  cover_signed_url?: string | null;
}

export interface GalleryAdminState {
  assets: GalleryAdminAsset[];
  albums: GalleryAdminAlbum[];
  rules: GalleryModerationRules | null;
  uploadSettings: GalleryUploadSettings | null;
  loading: boolean;
  error: string;
}

export interface GalleryModerationRules {
  id?: string;
  wedding_id?: string;
  photos_allowed: boolean;
  videos_allowed: boolean;
  max_file_size_bytes: number;
  max_video_duration_seconds?: number;
  max_uploads_per_guest: number;
  manual_approval_required: boolean;
  auto_approve_trusted_guests: boolean;
  auto_add_to_wall: boolean;
  allow_reporting: boolean;
  blocked_labels: string[] | null;
  provider_config: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
}

export interface GalleryUploadSettings {
  id?: string;
  wedding_id?: string;
  uploads_enabled: boolean;
  max_file_size_bytes: number;
  allowed_image_types: string[];
  allowed_video_types: string[];
  max_uploads_per_guest: number;
  require_metadata_consent: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface LiveWallConfig {
  enabled: boolean;
  moderation_mode: 'approved_only' | 'auto_approved' | 'manual_selection';
  photo_duration_ms: number;
  transition_style: 'fade' | 'slide' | 'gentle_zoom' | 'none';
  shuffle: boolean;
  show_captions: boolean;
  show_couple_names: boolean;
  show_hashtag: boolean;
  hashtag: string;
  show_qr_upload: boolean;
  show_upload_count: boolean;
  background_style: 'solid' | 'gradient' | 'blur';
  background_color: string;
  show_logo: boolean;
  fullscreen_by_default: boolean;
  paused: boolean;
}

export interface GallerySettingsTab {
  show_gallery: boolean;
  allow_guest_uploads: boolean;
  require_moderation: boolean;
  allow_video_uploads: boolean;
  allow_captions: boolean;
  show_uploader_names: boolean;
  upload_closing_date: string | null;
  max_uploads_per_guest: number;
  gallery_title: string;
  gallery_introduction: string;
  upload_instructions: string;
  privacy_notice: string;
  closed_gallery_message: string;
  default_guest_upload_album: string | null;
  allow_guest_downloads: boolean;
  allow_original_downloads: boolean;
}

export interface StorageUsage {
  total_bytes: number;
  image_bytes: number;
  video_bytes: number;
  file_count: number;
  largest_files: { id: string; title: string | null; path: string; size: number }[];
  archived_bytes: number;
}

export const MODERATION_STATUS_OPTIONS: { value: GalleryModerationStatus | 'all' | 'on_wall'; label: string; color: string }[] = [
  { value: 'all', label: 'All statuses', color: 'bg-secondary-100 text-secondary-700' },
  { value: 'pending', label: 'Pending scan', color: 'bg-sky-100 text-sky-700' },
  { value: 'scanning', label: 'Scanning', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'awaiting_review', label: 'Awaiting review', color: 'bg-amber-100 text-amber-700' },
  { value: 'approved', label: 'Approved', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'held', label: 'Held', color: 'bg-orange-100 text-orange-700' },
  { value: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-700' },
  { value: 'hidden', label: 'Hidden', color: 'bg-secondary-200 text-secondary-600' },
  { value: 'on_wall', label: 'On live wall', color: 'bg-primary-100 text-primary-700' },
];

export const SOURCE_TYPE_OPTIONS = [
  { value: 'all', label: 'All sources' },
  { value: 'couple', label: 'Couple upload' },
  { value: 'guest', label: 'Guest upload' },
  { value: 'photographer', label: 'Photographer' },
];

export const MEDIA_TYPE_OPTIONS = [
  { value: 'all', label: 'All types' },
  { value: 'image', label: 'Photos' },
  { value: 'video', label: 'Videos' },
];

export const REJECTION_REASONS = [
  'Blurry or unusable',
  'Duplicate',
  'Inappropriate',
  'Privacy concern',
  'Wrong event',
  'Other',
];

export const MAX_BATCH_UPLOAD = 20;
export const DEFAULT_MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];