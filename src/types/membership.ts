// ── Wedding Membership Types ──

export type WeddingRole = 'owner' | 'partner' | 'planner' | 'collaborator' | 'viewer';

export type WeddingMembershipStatus = 'invited' | 'active' | 'declined' | 'revoked';

export interface WeddingMembership {
  id: string;
  wedding_id: string;
  user_id: string;
  role: WeddingRole;
  status: WeddingMembershipStatus;
  invited_by: string | null;
  invited_email: string | null;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AccessibleWedding {
  id: string;
  title: string;
  partner_one_name: string;
  partner_two_name: string;
  wedding_date: string | null;
  slug: string;
  status: string;
  role: WeddingRole;
  membershipStatus: WeddingMembershipStatus;
}

export type ActiveWeddingState = 'loading' | 'no_wedding' | 'ready' | 'access_denied' | 'error';

// ── Permission flags ──

export interface WeddingPermissions {
  canViewWedding: boolean;
  canEditWedding: boolean;
  canManageGuests: boolean;
  canManageInvitations: boolean;
  canManageBudget: boolean;
  canManageSeating: boolean;
  canManageTravel: boolean;
  canManageGallery: boolean;
  canManageMembers: boolean;
  canDeleteWedding: boolean;
  canViewBilling: boolean;
  canChangeSubscription: boolean;
  canManageSuppliers: boolean;
  canManageRegistry: boolean;
  canPublishWebsite: boolean;
  canModerateGallery: boolean;
  canExportPrivateData: boolean;
  canTransferOwnership: boolean;
  canViewPrivateRSVP: boolean;
  canManageDietaryAccessibility: boolean;
  canManageTimeline: boolean;
  canManageTasks: boolean;
  canViewGuestContactDetails: boolean;
  canSendUpdates: boolean;
}