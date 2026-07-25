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
    canEditWedding: atLeast(role, 'collaborator'),
    canManageGuests: atLeast(role, 'planner'),
    canManageInvitations: atLeast(role, 'planner'),
    canManageBudget: atLeast(role, 'planner'),
    canManageSeating: atLeast(role, 'planner'),
    canManageTravel: atLeast(role, 'planner'),
    canManageGallery: atLeast(role, 'planner'),
    canManageMembers: atLeast(role, 'owner'),
    canDeleteWedding: atLeast(role, 'owner'),
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
    declined: 'Declined',
    revoked: 'Revoked',
  };
  return labels[status] || status;
}

// ⚠️ UI permission checks only — Prompt 4 must add equivalent RLS enforcement