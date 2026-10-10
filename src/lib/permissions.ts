import type { WeddingRole, WeddingPermissions } from '@/types/membership';

const ROLE_HIERARCHY: Record<WeddingRole, number> = {
  owner: 5,
  partner: 4,
  planner: 3,
  collaborator: 2,
  viewer: 1,
};

function atLeast(role: WeddingRole | null, minimum: WeddingRole): boolean {
  if (!role) return false;
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minimum];
}

export function getPermissions(role: WeddingRole | null): WeddingPermissions {
  return {
    canViewWedding: atLeast(role, 'viewer'),
    canEditWedding: atLeast(role, 'planner'),
    canManageGuests: atLeast(role, 'planner'),
    canManageInvitations: atLeast(role, 'planner'),
    canManageBudget: atLeast(role, 'planner'),
    canManageSeating: atLeast(role, 'planner'),
    canManageTravel: atLeast(role, 'planner'),
    canManageGallery: atLeast(role, 'planner'),
    canManageMembers: atLeast(role, 'owner'),
    canDeleteWedding: atLeast(role, 'owner'),
    canViewBilling: atLeast(role, 'partner'),
    canChangeSubscription: atLeast(role, 'owner'),
    canManageSuppliers: atLeast(role, 'planner'),
    canManageRegistry: atLeast(role, 'planner'),
    canPublishWebsite: atLeast(role, 'partner'),
    canModerateGallery: atLeast(role, 'planner'),
    canExportPrivateData: atLeast(role, 'partner'),
    canTransferOwnership: atLeast(role, 'owner'),
    canViewPrivateRSVP: atLeast(role, 'planner'),
    canManageDietaryAccessibility: atLeast(role, 'planner'),
    canManageTimeline: atLeast(role, 'planner'),
    canManageTasks: atLeast(role, 'collaborator'),
    canViewGuestContactDetails: atLeast(role, 'planner'),
    canSendUpdates: atLeast(role, 'planner'),
  };
}

export function getRoleLabel(role: WeddingRole): string {
  const labels: Record<WeddingRole, string> = {
    owner: 'Owner',
    partner: 'Partner',
    planner: 'Planner',
    collaborator: 'Collaborator',
    viewer: 'Viewer',
  };
  return labels[role];
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    active: 'Active',
    invited: 'Invited',
    pending: 'Pending',
    declined: 'Declined',
    revoked: 'Revoked',
    expired: 'Expired',
    suspended: 'Suspended',
    removed: 'Removed',
  };
  return labels[status] || status;
}

export function getPermissionLabel(key: keyof WeddingPermissions): string {
  const labels: Record<keyof WeddingPermissions, string> = {
    canViewWedding: 'View wedding',
    canEditWedding: 'Edit wedding details',
    canManageGuests: 'Manage guests',
    canManageInvitations: 'Manage invitations',
    canManageBudget: 'Manage budget',
    canManageSeating: 'Manage seating',
    canManageTravel: 'Manage travel',
    canManageGallery: 'Manage gallery',
    canManageMembers: 'Manage collaborators',
    canDeleteWedding: 'Delete wedding',
    canViewBilling: 'View billing',
    canChangeSubscription: 'Change subscription',
    canManageSuppliers: 'Manage suppliers',
    canManageRegistry: 'Manage registry',
    canPublishWebsite: 'Publish website',
    canModerateGallery: 'Moderate gallery',
    canExportPrivateData: 'Export private data',
    canTransferOwnership: 'Transfer ownership',
    canViewPrivateRSVP: 'View private RSVP details',
    canManageDietaryAccessibility: 'Manage dietary & accessibility',
    canManageTimeline: 'Manage timeline',
    canManageTasks: 'Manage tasks',
    canViewGuestContactDetails: 'View guest contact details',
    canSendUpdates: 'Send updates',
  };
  return labels[key] || key;
}

export function getPermissionCategory(key: keyof WeddingPermissions): string {
  if (['canViewWedding', 'canEditWedding', 'canDeleteWedding', 'canTransferOwnership'].includes(key)) return 'Wedding';
  if (['canManageGuests', 'canManageInvitations', 'canViewPrivateRSVP', 'canViewGuestContactDetails', 'canManageDietaryAccessibility'].includes(key)) return 'Guests';
  if (['canManageBudget', 'canViewBilling', 'canChangeSubscription'].includes(key)) return 'Finance';
  if (['canManageSeating', 'canManageTravel', 'canManageSuppliers', 'canManageTimeline', 'canManageTasks'].includes(key)) return 'Planning';
  if (['canManageGallery', 'canModerateGallery', 'canManageRegistry', 'canPublishWebsite', 'canSendUpdates'].includes(key)) return 'Content';
  if (['canManageMembers', 'canExportPrivateData'].includes(key)) return 'Admin';
  return 'Other';
}

export type PermissionLevel = 'full' | 'limited' | 'none';

export const PERMISSION_MATRIX: Record<WeddingRole, Record<keyof WeddingPermissions, PermissionLevel>> = {
  owner: {
    canViewWedding: 'full', canEditWedding: 'full', canManageGuests: 'full', canManageInvitations: 'full',
    canManageBudget: 'full', canManageSeating: 'full', canManageTravel: 'full', canManageGallery: 'full',
    canManageMembers: 'full', canDeleteWedding: 'full', canViewBilling: 'full', canChangeSubscription: 'full',
    canManageSuppliers: 'full', canManageRegistry: 'full', canPublishWebsite: 'full', canModerateGallery: 'full',
    canExportPrivateData: 'full', canTransferOwnership: 'full', canViewPrivateRSVP: 'full',
    canManageDietaryAccessibility: 'full', canManageTimeline: 'full', canManageTasks: 'full',
    canViewGuestContactDetails: 'full', canSendUpdates: 'full',
  },
  partner: {
    canViewWedding: 'full', canEditWedding: 'full', canManageGuests: 'full', canManageInvitations: 'full',
    canManageBudget: 'full', canManageSeating: 'full', canManageTravel: 'full', canManageGallery: 'full',
    canManageMembers: 'limited', canDeleteWedding: 'none', canViewBilling: 'full', canChangeSubscription: 'none',
    canManageSuppliers: 'full', canManageRegistry: 'full', canPublishWebsite: 'full', canModerateGallery: 'full',
    canExportPrivateData: 'full', canTransferOwnership: 'none', canViewPrivateRSVP: 'full',
    canManageDietaryAccessibility: 'full', canManageTimeline: 'full', canManageTasks: 'full',
    canViewGuestContactDetails: 'full', canSendUpdates: 'full',
  },
  planner: {
    canViewWedding: 'full', canEditWedding: 'limited', canManageGuests: 'full', canManageInvitations: 'full',
    canManageBudget: 'full', canManageSeating: 'full', canManageTravel: 'full', canManageGallery: 'full',
    canManageMembers: 'none', canDeleteWedding: 'none', canViewBilling: 'limited', canChangeSubscription: 'none',
    canManageSuppliers: 'full', canManageRegistry: 'full', canPublishWebsite: 'limited', canModerateGallery: 'full',
    canExportPrivateData: 'none', canTransferOwnership: 'none', canViewPrivateRSVP: 'full',
    canManageDietaryAccessibility: 'full', canManageTimeline: 'full', canManageTasks: 'full',
    canViewGuestContactDetails: 'full', canSendUpdates: 'full',
  },
  collaborator: {
    canViewWedding: 'full', canEditWedding: 'none', canManageGuests: 'limited', canManageInvitations: 'none',
    canManageBudget: 'none', canManageSeating: 'limited', canManageTravel: 'limited', canManageGallery: 'limited',
    canManageMembers: 'none', canDeleteWedding: 'none', canViewBilling: 'limited', canChangeSubscription: 'none',
    canManageSuppliers: 'limited', canManageRegistry: 'none', canPublishWebsite: 'none', canModerateGallery: 'none',
    canExportPrivateData: 'none', canTransferOwnership: 'none', canViewPrivateRSVP: 'none',
    canManageDietaryAccessibility: 'none', canManageTimeline: 'limited', canManageTasks: 'full',
    canViewGuestContactDetails: 'none', canSendUpdates: 'limited',
  },
  viewer: {
    canViewWedding: 'full', canEditWedding: 'none', canManageGuests: 'none', canManageInvitations: 'none',
    canManageBudget: 'none', canManageSeating: 'none', canManageTravel: 'none', canManageGallery: 'none',
    canManageMembers: 'none', canDeleteWedding: 'none', canViewBilling: 'limited', canChangeSubscription: 'none',
    canManageSuppliers: 'none', canManageRegistry: 'none', canPublishWebsite: 'none', canModerateGallery: 'none',
    canExportPrivateData: 'none', canTransferOwnership: 'none', canViewPrivateRSVP: 'none',
    canManageDietaryAccessibility: 'none', canManageTimeline: 'none', canManageTasks: 'none',
    canViewGuestContactDetails: 'none', canSendUpdates: 'none',
  },
};

export function getPermissionLevelLabel(level: PermissionLevel): string {
  switch (level) {
    case 'full': return 'Full access';
    case 'limited': return 'Limited';
    case 'none': return 'No access';
  }
}

export function getPermissionLevelColor(level: PermissionLevel): string {
  switch (level) {
    case 'full': return 'bg-emerald-100 text-emerald-700';
    case 'limited': return 'bg-amber-100 text-amber-700';
    case 'none': return 'bg-secondary-100 text-foreground-400';
  }
}

// ⚠️ UI permission checks only — RLS must enforce backend boundaries