// ── Seating Plan ──
export type PlanStatus = 'draft' | 'working' | 'review' | 'final' | 'published' | 'archived';
export type EventType = 'wedding_breakfast' | 'reception' | 'evening_celebration' | 'ceremony' | 'rehearsal_dinner' | 'welcome_event' | 'day_after_brunch' | 'custom';
export type AssignmentStatus = 'seated' | 'reserved' | 'tentative' | 'confirmed';
export type TableShape = 'round' | 'oval' | 'square' | 'rectangular' | 'banquet' | 'head_table' | 'sweetheart';
export type SeatType = 'standard' | 'wheelchair' | 'high_chair' | 'child_seat' | 'reserved_empty' | 'supplier' | 'couple';
export type SeatStatus = 'available' | 'assigned' | 'reserved' | 'blocked' | 'removed';
export type ObjectType = 'wall' | 'door' | 'window' | 'column' | 'stage' | 'dance_floor' | 'dj_area' | 'band_area' | 'bar' | 'buffet' | 'cake_table' | 'gift_table' | 'guest_book' | 'photo_booth' | 'sweet_table' | 'lounge' | 'registration' | 'cloakroom' | 'toilets' | 'emergency_exit' | 'fire_equipment' | 'accessible_route' | 'no_table_zone' | 'custom_label' | 'custom_rectangle' | 'custom_circle';

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  wedding_breakfast: 'Wedding breakfast', reception: 'Reception', evening_celebration: 'Evening celebration',
  ceremony: 'Ceremony', rehearsal_dinner: 'Rehearsal dinner', welcome_event: 'Welcome event',
  day_after_brunch: 'Day-after brunch', custom: 'Custom',
};

export const PLAN_STATUS_LABELS: Record<PlanStatus, string> = {
  draft: 'Draft', working: 'Working', review: 'In review', final: 'Final', published: 'Published', archived: 'Archived',
};

export const PLAN_STATUS_COLOURS: Record<PlanStatus, string> = {
  draft: 'bg-secondary-100 text-secondary-700', working: 'bg-primary-100 text-primary-700',
  review: 'bg-amber-100 text-amber-700', final: 'bg-emerald-100 text-emerald-700',
  published: 'bg-accent-100 text-accent-700', archived: 'bg-foreground-100 text-foreground-500',
};

export const OBJECT_TYPE_LABELS: Record<ObjectType, string> = {
  wall: 'Wall', door: 'Door', window: 'Window', column: 'Column', stage: 'Stage',
  dance_floor: 'Dance floor', dj_area: 'DJ area', band_area: 'Band area', bar: 'Bar',
  buffet: 'Buffet', cake_table: 'Cake table', gift_table: 'Gift table', guest_book: 'Guest book',
  photo_booth: 'Photo booth', sweet_table: 'Sweet table', lounge: 'Lounge',
  registration: 'Registration desk', cloakroom: 'Cloakroom', toilets: 'Toilets',
  emergency_exit: 'Emergency exit', fire_equipment: 'Fire equipment',
  accessible_route: 'Accessible route', no_table_zone: 'No-table zone',
  custom_label: 'Custom label', custom_rectangle: 'Custom rectangle', custom_circle: 'Custom circle',
};

export const OBJECT_TYPE_ICONS: Record<ObjectType, string> = {
  wall: 'ri-checkbox-blank-line', door: 'ri-door-open-line', window: 'ri-window-line',
  column: 'ri-layout-column-line', stage: 'ri-mic-line', dance_floor: 'ri-music-line',
  dj_area: 'ri-disc-line', band_area: 'ri-speaker-line', bar: 'ri-goblet-line',
  buffet: 'ri-restaurant-line', cake_table: 'ri-cake-line', gift_table: 'ri-gift-line',
  guest_book: 'ri-book-open-line', photo_booth: 'ri-camera-line', sweet_table: 'ri-cake-2-line',
  lounge: 'ri-sofa-line', registration: 'ri-user-received-line', cloakroom: 'ri-shirt-line',
  toilets: 'ri-door-lock-line', emergency_exit: 'ri-alarm-warning-line',
  fire_equipment: 'ri-fire-line', accessible_route: 'ri-wheelchair-line',
  no_table_zone: 'ri-forbid-line', custom_label: 'ri-font-size', custom_rectangle: 'ri-checkbox-blank-line',
  custom_circle: 'ri-circle-line',
};

export const SEAT_TYPE_LABELS: Record<SeatType, string> = {
  standard: 'Standard chair', wheelchair: 'Wheelchair space', high_chair: 'High chair',
  child_seat: 'Child seat', reserved_empty: 'Reserved empty', supplier: 'Supplier seat', couple: 'Couple seat',
};

export interface SeatingPlan {
  id: string; wedding_id: string; linked_event_id: string | null; name: string;
  event_type: EventType; venue_id: string | null; room_name: string | null; room_label: string | null;
  description: string | null; notes: string | null; status: PlanStatus;
  is_working: boolean; is_final: boolean; is_published: boolean; revision: number;
  canvas_width: number; canvas_height: number; default_zoom: number;
  grid_enabled: boolean; grid_size: number; snap_to_grid: boolean; measurement_unit: string;
  background_asset_id: string | null; background_opacity: number; background_locked: boolean;
  created_by: string | null; updated_by: string | null; created_at: string; updated_at: string;
  archived_at: string | null; published_at: string | null;
  wedding_event?: { id: string; name: string; event_type: string } | null;
  _count?: { tables: number; assignments: number };
}

export interface SeatingTable {
  id: string; plan_id: string; wedding_id: string; name: string; table_number: number | null;
  shape: TableShape; capacity: number; position_x: number; position_y: number;
  width: number; height: number; rotation: number; zone: string | null;
  colour: string | null; colour_key: string | null; locked: boolean; notes: string | null;
  sort_order: number; created_at: string; updated_at: string; archived_at: string | null;
}

export interface SeatingAssignment {
  id: string; plan_id: string; wedding_id: string; table_id: string; guest_id: string;
  seating_seat_id: string | null; seat_label: string | null;
  assignment_status: AssignmentStatus; notes: string | null;
  created_by: string | null; updated_by: string | null; created_at: string; updated_at: string;
}

export interface SeatingSeat {
  id: string; wedding_id: string; seating_plan_id: string; seating_table_id: string;
  seat_label: string | null; seat_number: number | null;
  seat_type: SeatType; seat_status: SeatStatus;
  relative_x: number; relative_y: number; rotation: number;
  locked: boolean; notes: string | null;
  created_at: string; updated_at: string;
}

export interface RoomObject {
  id: string; wedding_id: string; seating_plan_id: string;
  object_type: ObjectType; name: string;
  x_position: number; y_position: number; width: number; height: number;
  rotation: number; layer_order: number; style_key: string | null;
  opacity: number; locked: boolean; visible: boolean;
  geometry_data: Record<string, unknown> | null; notes: string | null;
  created_at: string; updated_at: string; archived_at: string | null;
}

export interface SeatingZone {
  id: string; wedding_id: string; seating_plan_id: string;
  name: string; description: string | null; style_key: string | null;
  geometry_data: Record<string, unknown> | null;
  visible: boolean; locked: boolean;
  created_at: string; updated_at: string;
}

export interface BackgroundAsset {
  id: string; wedding_id: string; seating_plan_id: string;
  storage_path: string | null; original_filename: string | null;
  mime_type: string | null; file_size: number | null;
  width: number | null; height: number | null;
  scale_factor: number; x_position: number; y_position: number;
  rotation: number; opacity: number; locked: boolean; visible: boolean;
  uploaded_by: string | null; created_at: string; updated_at: string;
}

export interface GuestSeating extends SeatingAssignment {
  guests?: GuestInfo | null;
}

export interface GuestInfo {
  id: string; full_name: string; guest_type: string; rsvp_status: string;
  dietary_requirements: string | null; allergy_notes: string | null;
  accessibility_needs: string | null; accessibility_notes: string | null;
  household_id: string | null; relationship_label: string | null;
  wedding_party_role: string | null; meal_choice: string | null;
  invitation_group: string | null;
}

export interface UnseatedGuest extends GuestInfo {
  has_dietary: boolean; has_accessibility: boolean;
}

export interface TableWithData extends SeatingTable {
  assignments: GuestSeating[];
  seats: SeatingSeat[];
  seated_count: number;
}

export interface SeatingPlanVersion {
  id: string; wedding_id: string; seating_plan_id: string;
  version_number: number; label: string | null; reason: string | null;
  snapshot_data: unknown; source_revision: number | null;
  created_by: string | null; created_at: string;
}

export interface SeatingActivityLog {
  id: string; wedding_id: string; seating_plan_id: string | null;
  actor_user_id: string | null; action: string; summary: string | null;
  metadata: unknown; created_at: string;
}

export interface PlanStats {
  totalPlans: number; activePlans: number; workingPlan: SeatingPlan | null;
  publishedPlan: SeatingPlan | null; totalTables: number;
  seatedGuests: number; unseatedGuests: number;
}

export interface CanvasWarning {
  id: string; type: 'table_outside' | 'table_overlap' | 'seat_outside' | 'over_capacity' |
    'under_min' | 'no_table_number' | 'duplicate_number' | 'accessible_route_blocked' |
    'no_table_zone_overlap' | 'emergency_exit_blocked' | 'floor_plan_not_calibrated' |
    'occupied_seat_removed' | 'locked_object_move';
  message: string; tableId?: string; objectId?: string; seatId?: string;
}

export interface UndoEntry {
  type: string; label: string;
  before: Record<string, unknown>; after: Record<string, unknown>;
  timestamp: number;
}

export const ACTIVITY_ACTION_LABELS: Record<string, string> = {
  plan_created: 'Plan created', plan_renamed: 'Plan renamed', plan_duplicated: 'Plan duplicated',
  plan_working: 'Set as working plan', plan_review: 'Marked for review', plan_final: 'Marked as final',
  plan_published: 'Published', plan_archived: 'Archived', plan_restored: 'Restored from archive',
  plan_settings_changed: 'Settings updated', version_created: 'Version snapshot created',
  version_restored: 'Restored from version', table_created: 'Table added', table_moved: 'Table moved',
  table_deleted: 'Table deleted', table_rotated: 'Table rotated', table_resized: 'Table resized',
  table_locked: 'Table locked', table_unlocked: 'Table unlocked', table_duplicated: 'Table duplicated',
  seats_regenerated: 'Seats regenerated', seat_added: 'Seat added', seat_blocked: 'Seat blocked',
  guest_assigned: 'Guest seated', guest_moved: 'Guest moved', guest_unseated: 'Guest removed',
  guest_swapped: 'Guests swapped', conflict_detected: 'Save conflict detected',
  plan_migrated: 'Plan upgraded', object_created: 'Object added', object_moved: 'Object moved',
  object_deleted: 'Object deleted', object_locked: 'Object locked', background_uploaded: 'Background uploaded',
  background_calibrated: 'Background calibrated', background_removed: 'Background removed',
  zone_created: 'Zone created', zone_edited: 'Zone edited', bulk_align: 'Bulk alignment',
  bulk_distribute: 'Bulk distribution',
};

// ── Phase S3: Groups, Rules, Conflicts, Proposals ──

export type GroupType = 'social' | 'household' | 'family' | 'wedding_party' | 'supplier' | 'children' | 'accessibility' | 'custom';
export type GroupScope = 'wedding' | 'plan';
export type GroupStatus = 'active' | 'archived';

export type RuleType = 'keep_together' | 'prefer_together' | 'keep_apart' | 'prefer_apart' | 'same_table' | 'adjacent_seats' | 'same_zone' | 'preferred_table' | 'avoid_table' | 'preferred_zone' | 'avoid_zone' | 'near_head_table' | 'away_from_speakers' | 'near_exit' | 'near_accessible_route' | 'near_toilets' | 'quiet_area' | 'wheelchair_required' | 'high_chair_required' | 'child_with_guardian' | 'couple_together' | 'household_together' | 'wedding_party_placement' | 'supplier_table' | 'custom';
export type RuleStrength = 'required' | 'high' | 'medium' | 'low' | 'preference';
export type RuleSourceType = 'guest' | 'group' | 'household';
export type RuleTargetType = 'guest' | 'group' | 'table' | 'zone' | 'seat_type';
export type RuleStatus = 'active' | 'disabled' | 'archived';

export type ConflictType = 'hard_violation' | 'soft_violation' | 'over_capacity' | 'split_household' | 'split_couple' | 'child_without_guardian' | 'accessibility_mismatch' | 'missing_wheelchair_seat' | 'missing_high_chair_seat' | 'avoided_table' | 'avoided_zone' | 'over_split_group' | 'declined_guest_seated' | 'archived_guest_seated' | 'rsvp_unresolved' | 'room_boundary' | 'accessible_route_blocked' | 'empty_required_seat' | 'blocked_seat_assignment' | 'duplicate_assignment' | 'custom';
export type ConflictSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type ConflictStatus = 'open' | 'reviewed' | 'resolved' | 'overridden' | 'dismissed';

export type ProposalStatus = 'generating' | 'ready' | 'failed' | 'reviewing' | 'applied' | 'rejected' | 'archived';
export type MoveStatus = 'pending' | 'accepted' | 'rejected' | 'locked';

export interface SeatingGroup {
  id: string; wedding_id: string; seating_plan_id: string | null; scope: GroupScope;
  name: string; description: string | null; group_type: GroupType;
  priority: number; preferred_zone_id: string | null; preferred_table_id: string | null;
  keep_together: boolean; max_table_split: number; notes: string | null;
  status: GroupStatus; created_by: string | null; updated_by: string | null;
  created_at: string; updated_at: string; archived_at: string | null;
  _count?: { members: number };
}

export interface SeatingGroupMember {
  id: string; wedding_id: string; seating_plan_id: string | null;
  seating_group_id: string; guest_id: string;
  created_by: string | null; created_at: string;
  guest?: GuestInfo | null;
}

export interface SeatingRule {
  id: string; wedding_id: string; seating_plan_id: string | null;
  name: string; rule_type: RuleType;
  source_type: RuleSourceType; source_id: string;
  target_type: RuleTargetType; target_id: string | null;
  strength: RuleStrength; is_hard_constraint: boolean;
  rule_config: Record<string, unknown> | null;
  reason: string | null; notes: string | null;
  status: RuleStatus; created_by: string | null; updated_by: string | null;
  created_at: string; updated_at: string; archived_at: string | null;
}

export interface SeatingConflict {
  id: string; wedding_id: string; seating_plan_id: string;
  conflict_type: ConflictType; severity: ConflictSeverity;
  guest_id: string | null; related_guest_id: string | null;
  seating_table_id: string | null; seating_seat_id: string | null;
  seating_rule_id: string | null; summary: string;
  details: Record<string, unknown> | null;
  status: ConflictStatus; override_reason: string | null;
  resolved_by: string | null; resolved_at: string | null;
  created_at: string; updated_at: string;
  guest?: GuestInfo | null; related_guest?: GuestInfo | null;
  table?: { id: string; name: string } | null;
  rule?: SeatingRule | null;
}

export interface AssistantProposal {
  id: string; wedding_id: string; seating_plan_id: string;
  source_revision: number; status: ProposalStatus;
  scope: string; priorities: string[] | null;
  weights: Record<string, number> | null; random_seed: number | null;
  overall_score: number | null; score_breakdown: Record<string, number> | null;
  conflict_summary: Record<string, unknown> | null;
  generated_by: string | null; generated_at: string;
  applied_by: string | null; applied_at: string | null; rejected_at: string | null;
  _count?: { assignments: number };
}

export interface ProposalAssignment {
  id: string; wedding_id: string; seating_plan_id: string;
  proposal_id: string; guest_id: string;
  current_table_id: string | null; current_seat_id: string | null;
  proposed_table_id: string | null; proposed_seat_id: string | null;
  move_status: MoveStatus; explanation: string | null;
  created_at: string; updated_at: string;
  guest?: GuestInfo | null;
  current_table?: { id: string; name: string } | null;
  proposed_table?: { id: string; name: string } | null;
}

export const GROUP_TYPE_LABELS: Record<GroupType, string> = {
  social: 'Social', household: 'Household', family: 'Family',
  wedding_party: 'Wedding party', supplier: 'Supplier', children: 'Children',
  accessibility: 'Accessibility', custom: 'Custom',
};

export const RULE_TYPE_LABELS: Record<RuleType, string> = {
  keep_together: 'Keep together', prefer_together: 'Prefer together',
  keep_apart: 'Keep apart', prefer_apart: 'Prefer apart',
  same_table: 'Same table', adjacent_seats: 'Adjacent seats',
  same_zone: 'Same zone', preferred_table: 'Preferred table',
  avoid_table: 'Avoid table', preferred_zone: 'Preferred zone',
  avoid_zone: 'Avoid zone', near_head_table: 'Near head table',
  away_from_speakers: 'Away from speakers', near_exit: 'Near exit',
  near_accessible_route: 'Near accessible route', near_toilets: 'Near toilets',
  quiet_area: 'Quiet area preference', wheelchair_required: 'Wheelchair space required',
  high_chair_required: 'High chair required', child_with_guardian: 'Child with guardian',
  couple_together: 'Couple kept together', household_together: 'Household kept together',
  wedding_party_placement: 'Wedding party placement', supplier_table: 'Supplier table placement',
  custom: 'Custom rule',
};

export const RULE_STRENGTH_LABELS: Record<RuleStrength, string> = {
  required: 'Required', high: 'High', medium: 'Medium', low: 'Low', preference: 'Preference only',
};

export const RULE_STRENGTH_COLOURS: Record<RuleStrength, string> = {
  required: 'bg-red-100 text-red-700', high: 'bg-amber-100 text-amber-700',
  medium: 'bg-secondary-100 text-secondary-700', low: 'bg-sky-100 text-sky-700',
  preference: 'bg-foreground-100 text-foreground-500',
};

export const CONFLICT_SEVERITY_LABELS: Record<ConflictSeverity, string> = {
  critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low', info: 'Info',
};

export const CONFLICT_SEVERITY_COLOURS: Record<ConflictSeverity, string> = {
  critical: 'bg-red-100 text-red-700 border-red-300',
  high: 'bg-amber-100 text-amber-700 border-amber-300',
  medium: 'bg-secondary-100 text-secondary-700 border-secondary-300',
  low: 'bg-sky-100 text-sky-700 border-sky-300',
  info: 'bg-foreground-100 text-foreground-500 border-foreground-200',
};

export const CONFLICT_TYPE_LABELS: Record<ConflictType, string> = {
  hard_violation: 'Hard rule violation', soft_violation: 'Soft rule violation',
  over_capacity: 'Table over capacity', split_household: 'Household split',
  split_couple: 'Couple split', child_without_guardian: 'Child without guardian',
  accessibility_mismatch: 'Accessibility mismatch', missing_wheelchair_seat: 'Missing wheelchair seat',
  missing_high_chair_seat: 'Missing high chair seat', avoided_table: 'Guest at avoided table',
  avoided_zone: 'Guest in avoided zone', over_split_group: 'Group over-split',
  declined_guest_seated: 'Declined guest seated', archived_guest_seated: 'Archived guest seated',
  rsvp_unresolved: 'Unresolved RSVP', room_boundary: 'Outside room boundary',
  accessible_route_blocked: 'Accessible route blocked', empty_required_seat: 'Empty required seat',
  blocked_seat_assignment: 'Blocked seat assigned', duplicate_assignment: 'Duplicate assignment',
  custom: 'Custom conflict',
};

export const PROPOSAL_STATUS_LABELS: Record<ProposalStatus, string> = {
  generating: 'Generating...', ready: 'Ready', failed: 'Failed',
  reviewing: 'Reviewing', applied: 'Applied', rejected: 'Rejected', archived: 'Archived',
};

export const PROPOSAL_STATUS_COLOURS: Record<ProposalStatus, string> = {
  generating: 'bg-sky-100 text-sky-700', ready: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-red-100 text-red-700', reviewing: 'bg-amber-100 text-amber-700',
  applied: 'bg-primary-100 text-primary-700', rejected: 'bg-foreground-100 text-foreground-500',
  archived: 'bg-foreground-100 text-foreground-400',
};

// ── Phase S4: Publications, Exports, Lookups, Audit ──

export type PublicationStatus = 'published' | 'replaced' | 'disabled' | 'error';
export type ExportType = 'floor_plan' | 'guest_by_table' | 'alphabetical' | 'coordinator_pack' | 'catering' | 'accessibility' | 'venue_setup' | 'table_cards' | 'place_cards' | 'guest_assignments_csv' | 'tables_csv' | 'seats_csv' | 'meal_csv' | 'accessibility_csv' | 'unseated_csv' | 'conflict_csv' | 'inventory_csv';
export type ExportFormat = 'pdf' | 'csv' | 'png';
export type ExportStatus = 'pending' | 'generating' | 'completed' | 'failed' | 'expired';
export type LookupEventType = 'lookup_search' | 'lookup_found' | 'lookup_not_found' | 'lookup_rate_limited' | 'qr_access' | 'qr_revoked';
export type AuditStatus = 'passed' | 'warning' | 'failed' | 'not_applicable' | 'not_tested';

export const PUBLICATION_STATUS_LABELS: Record<PublicationStatus, string> = {
  published: 'Published', replaced: 'Replaced', disabled: 'Disabled', error: 'Error',
};

export const EXPORT_TYPE_LABELS: Record<ExportType, string> = {
  floor_plan: 'Floor plan', guest_by_table: 'Guest-by-table list', alphabetical: 'Alphabetical lookup',
  coordinator_pack: 'Coordinator pack', catering: 'Catering report', accessibility: 'Accessibility report',
  venue_setup: 'Venue setup report', table_cards: 'Table cards', place_cards: 'Place cards',
  guest_assignments_csv: 'Guest assignments (CSV)', tables_csv: 'Tables (CSV)', seats_csv: 'Seats (CSV)',
  meal_csv: 'Meal & dietary (CSV)', accessibility_csv: 'Accessibility (CSV)', unseated_csv: 'Unseated guests (CSV)',
  conflict_csv: 'Conflicts (CSV)', inventory_csv: 'Venue inventory (CSV)',
};

export const AUDIT_STATUS_LABELS: Record<AuditStatus, string> = {
  passed: 'Passed', warning: 'Warning', failed: 'Failed', not_applicable: 'N/A', not_tested: 'Not tested',
};

export const AUDIT_STATUS_COLOURS: Record<AuditStatus, string> = {
  passed: 'bg-emerald-100 text-emerald-700', warning: 'bg-amber-100 text-amber-700',
  failed: 'bg-red-100 text-red-700', not_applicable: 'bg-secondary-100 text-secondary-500',
  not_tested: 'bg-foreground-100 text-foreground-500',
};

export interface SeatingPublication {
  id: string; wedding_id: string; seating_plan_id: string;
  seating_plan_version_id: string | null; linked_event_id: string | null;
  status: PublicationStatus; publication_revision: number;
  audience_settings: Record<string, unknown> | null;
  lookup_settings: Record<string, unknown> | null;
  published_by: string | null; published_at: string;
  disabled_by: string | null; disabled_at: string | null;
  replaced_by_publication_id: string | null;
  created_at: string; updated_at: string;
}

export interface ExportJob {
  id: string; wedding_id: string; seating_plan_id: string;
  seating_plan_version_id: string | null;
  export_type: ExportType; format: ExportFormat; status: ExportStatus;
  options: Record<string, unknown> | null; storage_path: string | null;
  contains_sensitive_data: boolean;
  requested_by: string | null; requested_at: string;
  completed_at: string | null; expires_at: string | null;
  error_summary: string | null;
}

export interface ReportTemplate {
  id: string; wedding_id: string;
  report_type: ExportType; name: string;
  template_config: Record<string, unknown> | null;
  is_default: boolean; status: 'active' | 'archived';
  created_by: string | null; updated_by: string | null;
  created_at: string; updated_at: string;
}

export interface LookupCode {
  id: string; wedding_id: string; seating_plan_id: string | null;
  publication_id: string | null; guest_id: string | null;
  invitation_id: string | null; code_hash: string;
  status: 'active' | 'revoked' | 'expired';
  expires_at: string | null; created_at: string; revoked_at: string | null;
}

export interface LookupActivity {
  id: string; wedding_id: string; publication_id: string | null;
  event_type: LookupEventType; result_type: string | null;
  security_metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface AuditCheck {
  id: string; category: string; label: string;
  status: AuditStatus; detail: string; action: string | null;
}

export interface FinalisationCheck {
  id: string; label: string; status: AuditStatus; detail: string;
}

export type CardTheme = 'classic' | 'modern' | 'botanical' | 'minimal' | 'romantic' | 'editorial';

export const CARD_THEME_LABELS: Record<CardTheme, string> = {
  classic: 'Classic', modern: 'Modern', botanical: 'Botanical',
  minimal: 'Minimal', romantic: 'Romantic', editorial: 'Editorial',
};

export interface TableCardConfig {
  showTableNumber: boolean; showTableName: boolean; showGuestList: boolean;
  showCoupleNames: boolean; showWeddingDate: boolean; showMonogram: boolean;
  theme: CardTheme; paperSize: string; orientation: 'portrait' | 'landscape';
  border: boolean; alignment: 'left' | 'center' | 'right';
  fontScale: number; guestNameFormat: 'full' | 'first_only' | 'last_initial';
  coupleNames: string; weddingDate: string;
}

export interface PlaceCardConfig {
  showTableNumber: boolean; showSeatLabel: boolean; showMealMarker: boolean;
  showDietaryMarker: boolean; showCoupleNames: boolean; showWeddingDate: boolean;
  theme: CardTheme; format: 'folded' | 'flat'; paperSize: string;
  includeChildren: boolean; excludeSuppliers: boolean;
  sortBy: 'guest' | 'table' | 'seat'; dietaryMarkerMode: 'off' | 'discreet' | 'full';
  coupleNames: string; weddingDate: string;
}

export interface ReportData {
  plan: { id: string; name: string; event_type: string; room_name: string | null; status: string; revision: number; updated_at: string };
  wedding: { id: string; partner_one_name: string; partner_two_name: string };
  generated_at: string;
  tables: Array<{
    id: string; table_number: number | null; name: string; shape: string;
    zone: string | null; capacity: number; seated_count: number;
    assignments: Array<{
      guest_id: string; guest_name: string; guest_type: string;
      seat_label: string | null; seat_number: number | null;
      meal_choice: string | null; dietary_requirements: string | null;
      allergy_notes: string | null; accessibility_needs: string | null;
      household_id: string | null; wedding_party_role: string | null;
      relationship_label: string | null;
    }>;
  }>;
  unseated: Array<{ id: string; full_name: string; guest_type: string }>;
  totals: { guests: number; seated: number; unseated: number; capacity: number; tables: number };
}