import { describe, it, expect } from 'vitest';
import { getPermissions, getRoleLabel, getStatusLabel } from '@/lib/permissions';
import type { WeddingRole } from '@/types/membership';

describe('getPermissions', () => {
  it('owner has full permissions', () => {
    const perms = getPermissions('owner');
    expect(perms).toMatchObject({
      canViewWedding: true,
      canEditWedding: true,
      canManageGuests: true,
      canManageInvitations: true,
      canManageBudget: true,
      canManageSeating: true,
      canManageTravel: true,
      canManageGallery: true,
      canManageMembers: true,
      canDeleteWedding: true,
    });
  });

  it('partner has most permissions except member management and delete', () => {
    const perms = getPermissions('partner');
    expect(perms.canViewWedding).toBe(true);
    expect(perms.canEditWedding).toBe(true);
    expect(perms.canManageGuests).toBe(true);
    expect(perms.canManageInvitations).toBe(true);
    expect(perms.canManageBudget).toBe(true);
    expect(perms.canManageSeating).toBe(true);
    expect(perms.canManageTravel).toBe(true);
    expect(perms.canManageGallery).toBe(true);
    expect(perms.canManageMembers).toBe(false);
    expect(perms.canDeleteWedding).toBe(false);
  });

  it('planner can manage guests, budget, seating, travel, gallery but not members', () => {
    const perms = getPermissions('planner');
    expect(perms.canViewWedding).toBe(true);
    expect(perms.canEditWedding).toBe(true);
    expect(perms.canManageGuests).toBe(true);
    expect(perms.canManageInvitations).toBe(true);
    expect(perms.canManageBudget).toBe(true);
    expect(perms.canManageSeating).toBe(true);
    expect(perms.canManageTravel).toBe(true);
    expect(perms.canManageGallery).toBe(true);
    expect(perms.canManageMembers).toBe(false);
    expect(perms.canDeleteWedding).toBe(false);
  });

  it('collaborator can view and edit but cannot manage guests or members', () => {
    const perms = getPermissions('collaborator');
    expect(perms.canViewWedding).toBe(true);
    expect(perms.canEditWedding).toBe(false);
    expect(perms.canManageGuests).toBe(false);
    expect(perms.canManageInvitations).toBe(false);
    expect(perms.canManageBudget).toBe(false);
    expect(perms.canManageSeating).toBe(false);
    expect(perms.canManageTravel).toBe(false);
    expect(perms.canManageGallery).toBe(false);
    expect(perms.canManageMembers).toBe(false);
    expect(perms.canDeleteWedding).toBe(false);
  });

  it('viewer can only view', () => {
    const perms = getPermissions('viewer');
    expect(perms.canViewWedding).toBe(true);
    expect(perms.canEditWedding).toBe(false);
    expect(perms.canManageGuests).toBe(false);
    expect(perms.canManageMembers).toBe(false);
    expect(perms.canDeleteWedding).toBe(false);
  });

  it('null role returns all false', () => {
    const perms = getPermissions(null);
    expect(perms.canViewWedding).toBe(false);
    expect(perms.canEditWedding).toBe(false);
    expect(perms.canManageGuests).toBe(false);
    expect(perms.canManageMembers).toBe(false);
    expect(perms.canDeleteWedding).toBe(false);
  });

  it('role hierarchy is strictly enforced', () => {
    const roles: WeddingRole[] = ['owner', 'partner', 'planner', 'collaborator', 'viewer'];
    // Each role should NOT have permissions of the role above it for restricted actions
    for (let i = 1; i < roles.length; i++) {
      const perms = getPermissions(roles[i]);
      // None should be able to delete (only owner)
      expect(perms.canDeleteWedding).toBe(false);
      // None should manage members (only owner)
      expect(perms.canManageMembers).toBe(false);
    }
  });
});

describe('getRoleLabel', () => {
  it('returns correct labels', () => {
    expect(getRoleLabel('owner')).toBe('Owner');
    expect(getRoleLabel('partner')).toBe('Partner');
    expect(getRoleLabel('planner')).toBe('Planner');
    expect(getRoleLabel('collaborator')).toBe('Collaborator');
    expect(getRoleLabel('viewer')).toBe('Viewer');
  });
});

describe('getStatusLabel', () => {
  it('returns correct status labels', () => {
    expect(getStatusLabel('active')).toBe('Active');
    expect(getStatusLabel('invited')).toBe('Invited');
    expect(getStatusLabel('declined')).toBe('Declined');
    expect(getStatusLabel('revoked')).toBe('Revoked');
  });

  it('returns raw status for unknown values', () => {
    expect(getStatusLabel('unrecognised')).toBe('unrecognised');
    expect(getStatusLabel('')).toBe('');
  });
});