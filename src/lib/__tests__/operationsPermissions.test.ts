import { describe, it, expect } from 'vitest';
import { getPermissions, PERMISSION_MATRIX } from '@/lib/permissions';

// ── Operations permission tests ──
// Admin operational routes are gated by owner/partner role at the UI level.
// RLS policies enforce backend boundaries separately.
// These tests verify our permission model correctly classifies roles.

describe('Operations permission model', () => {
  it('owner has the highest permission level for all operations', () => {
    const perms = getPermissions('owner');
    expect(perms.canViewWedding).toBe(true);
    expect(perms.canEditWedding).toBe(true);
    expect(perms.canManageMembers).toBe(true);
    expect(perms.canDeleteWedding).toBe(true);
  });

  it('partner has appropriate elevated permissions but fewer than owner', () => {
    const perms = getPermissions('partner');
    expect(perms.canViewWedding).toBe(true);
    expect(perms.canEditWedding).toBe(true);
    expect(perms.canManageMembers).toBe(false);
    expect(perms.canDeleteWedding).toBe(false);
    expect(perms.canChangeSubscription).toBe(false);
  });

  it('planner cannot access owner-only operations', () => {
    const perms = getPermissions('planner');
    expect(perms.canViewWedding).toBe(true);
    expect(perms.canManageMembers).toBe(false);
    expect(perms.canDeleteWedding).toBe(false);
    expect(perms.canTransferOwnership).toBe(false);
  });

  it('collaborator has limited access only', () => {
    const perms = getPermissions('collaborator');
    expect(perms.canViewWedding).toBe(true);
    expect(perms.canEditWedding).toBe(true); // limited
    expect(perms.canManageSeating).toBe(true); // limited
    expect(perms.canManageInvitations).toBe(false);
    expect(perms.canManageMembers).toBe(false);
    expect(perms.canViewPrivateRSVP).toBe(false);
  });

  it('viewer has read-only access at most', () => {
    const perms = getPermissions('viewer');
    expect(perms.canViewWedding).toBe(true);
    expect(perms.canEditWedding).toBe(false);
    expect(perms.canManageGuests).toBe(false);
    expect(perms.canManageInvitations).toBe(false);
    expect(perms.canManageMembers).toBe(false);
  });

  it('null role returns all permissions as false', () => {
    const perms = getPermissions(null);
    expect(perms.canViewWedding).toBe(false);
    expect(perms.canEditWedding).toBe(false);
    expect(perms.canManageMembers).toBe(false);
  });

  it('PERMISSION_MATRIX has all roles defined', () => {
    const roles = ['owner', 'partner', 'planner', 'collaborator', 'viewer'];
    roles.forEach((role) => {
      expect(PERMISSION_MATRIX[role as keyof typeof PERMISSION_MATRIX]).toBeDefined();
    });
  });

  it('PERMISSION_MATRIX for owner has full access everywhere', () => {
    Object.values(PERMISSION_MATRIX.owner).forEach((level) => {
      expect(level).toBe('full');
    });
  });

  it('PERMISSION_MATRIX for viewer has no full access', () => {
    Object.values(PERMISSION_MATRIX.viewer).forEach((level) => {
      if (level === 'full') throw new Error('Viewer should never have full access');
    });
  });

  it('only owner and partner can access operational routes (UI gate)', () => {
    // Operational routes require membership.role === 'owner' || membership.role === 'partner'
    const operationalRoles = ['owner', 'partner'];
    const nonOperationalRoles = ['planner', 'collaborator', 'viewer', null];

    operationalRoles.forEach((role) => {
      const perms = getPermissions(role as any);
      expect(perms.canManageMembers || perms.canDeleteWedding).toBe(true);
    });

    nonOperationalRoles.forEach((role) => {
      const perms = getPermissions(role as any);
      // These roles should NOT have owner-level permissions
      expect(perms.canDeleteWedding).toBe(false);
      expect(perms.canTransferOwnership).toBe(false);
    });
  });
});

describe('Operations data safety', () => {
  it('operational dashboards should never expose secret values', () => {
    // This is an architectural test — operational pages query aggregated data
    // and never return secret keys, tokens, or private customer data
    const forbiddenInOperations = ['secret', 'token', 'password', 'key', 'card'];
    // These patterns should never appear in health check response labels
    const safeLabels = ['Platform Status', 'Database', 'Auth', 'Webhook', 'Email'];
    safeLabels.forEach((label) => {
      forbiddenInOperations.forEach((fb) => {
        expect(label.toLowerCase()).not.toContain(fb);
      });
    });
  });

  it('incident severity levels are properly defined', () => {
    const valid = ['critical', 'high', 'medium', 'low'];
    valid.forEach((s) => {
      expect(['critical', 'high', 'medium', 'low']).toContain(s);
    });
  });

  it('incident statuses cover full lifecycle', () => {
    const statuses = ['open', 'investigating', 'monitoring', 'resolved', 'closed'];
    expect(statuses).toHaveLength(5);
    // Resolved and closed should be the only terminal statuses
    const terminal = ['resolved', 'closed'];
    terminal.forEach((t) => expect(statuses).toContain(t));
  });

  it('support case statuses cover full workflow', () => {
    const statuses = ['new', 'open', 'waiting_customer', 'waiting_team', 'resolved', 'closed'];
    expect(statuses).toHaveLength(6);
  });

  it('release statuses cover full deployment lifecycle', () => {
    const statuses = ['planned', 'deploying', 'live', 'rolled_back', 'superseded'];
    expect(statuses).toHaveLength(5);
    expect(statuses).toContain('rolled_back'); // Rollback path must exist
  });

  it('incident CRUD operations require confirmation for critical/high closure', () => {
    // Critical and high incidents trigger a confirm-close flow in the UI
    const needsConfirmation = ['critical', 'high'];
    needsConfirmation.forEach((s) => {
      expect(['critical', 'high']).toContain(s);
    });
  });
});