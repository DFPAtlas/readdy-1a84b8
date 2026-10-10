import type * as React from "react";
import { useState, useRef, useEffect, useCallback } from 'react';
import AppShell from '@/components/feature/AppShell';
import { isDemoMode } from '@/demo/demoConfig';
import { useDemoDataSafe } from '@/demo/useDemoDataSafe';
import { useAuth } from '@/context/AuthProvider';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { useCollaborators } from '@/hooks/useSettings';
import {
  ROLE_SHORT_LABELS,
  ROLE_DESCRIPTIONS,
  ROLE_COLORS,
} from '@/types/settings';
import {
  PERMISSION_MATRIX,
  getPermissionLabel,
  getPermissionCategory,
  getPermissionLevelLabel,
  getPermissionLevelColor,
  getStatusLabel,
} from '@/lib/permissions';
import type { WeddingRole, WeddingPermissions } from '@/types/membership';
import type { CollaboratorDisplay } from '@/types/settings';

type CollaboratorTab = 'active' | 'pending' | 'roles' | 'activity';

function SettingsCard({ title, description, children }: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-background-50 border border-secondary-200/70 rounded-xl p-5 md:p-6">
      <h3 className="font-label text-sm font-semibold text-foreground-900 mb-1">{title}</h3>
      {description && <p className="text-xs text-foreground-500 mb-5">{description}</p>}
      {children}
    </div>
  );
}

function NormalCollaboratorsPage() {
  const { user } = useAuth();
  const { weddingId, role: currentUserRole, permissions } = useActiveWedding();
  const { collaborators, loading, error, fetch, inviteCollaborator, revokeInvitation, removeCollaborator, changeRole } = useCollaborators(weddingId);
  const [activeTab, setActiveTab] = useState<CollaboratorTab>('active');
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<WeddingRole>('viewer');
  const [inviteMessage, setInviteMessage] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [roleMenuId, setRoleMenuId] = useState<string | null>(null);
  const [showOwnershipTransfer, setShowOwnershipTransfer] = useState(false);
  const [transferTarget, setTransferTarget] = useState<string | null>(null);
  const [transferConfirm, setTransferConfirm] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const roleMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!roleMenuId) return;
    const handler = (e: MouseEvent) => {
      if (roleMenuRef.current && !roleMenuRef.current.contains(e.target as Node)) {
        setRoleMenuId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [roleMenuId]);

  const canManageMembers = permissions.canManageMembers;
  const isOwner = currentUserRole === 'owner';

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteError(null);
    try {
      await inviteCollaborator(inviteEmail.trim(), inviteRole);
      setInviteEmail('');
      setInviteMessage('');
      setInviteSuccess(true);
      setTimeout(() => {
        setInviteSuccess(false);
        setShowInvite(false);
      }, 2000);
    } catch (err: unknown) {
      setInviteError(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (id: string, isInvitation: boolean) => {
    if (isInvitation) {
      await revokeInvitation(id);
    } else {
      if (!window.confirm('Remove this collaborator from the wedding? They will lose all access. Their created records (tasks, notes, etc.) will be preserved.')) return;
      try {
        await removeCollaborator(id);
      } catch (err: unknown) {
        setActionError(err instanceof Error ? err.message : 'Failed to remove collaborator');
      }
    }
  };

  const handleSuspend = async (id: string) => {
    setActionError('Suspend is not yet supported. Use Remove to revoke access.');
  };

  const handleTransferOwnership = async () => {
    if (!transferTarget || transferConfirm !== 'TRANSFER OWNERSHIP') {
      setActionError('Please confirm the transfer by typing the confirmation phrase');
      return;
    }
    setTransferring(true);
    setActionError(null);
    try {
      // Ownership transfer not yet implemented in backend
      setActionError('Ownership transfer requires backend support. Contact support.');
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Transfer failed');
    } finally {
      setTransferring(false);
    }
  };

  const activeCount = collaborators.filter((c) => c.status === 'active' && !c.isInvitation).length;
  const pendingCount = collaborators.filter((c) => c.isInvitation && c.status === 'pending').length;

  if (loading) {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto space-y-5 animate-pulse">
          <div className="h-8 w-48 rounded bg-secondary-200" />
          <div className="h-4 w-64 rounded bg-secondary-100" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-xl bg-secondary-100" />
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto">
        <p className="text-xs text-foreground-400 font-label mb-1">Wedding team</p>
        <h1 className="font-heading text-2xl md:text-3xl text-foreground-900 mb-1">Collaborators</h1>
        <p className="text-sm text-foreground-500 mb-8">Manage who has access to your wedding workspace. Only share access with trusted people.</p>

        {error && (
          <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 mb-5">{error}</div>
        )}
        {actionError && (
          <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 mb-5">{actionError}</div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div className="bg-background-50 border border-secondary-200/70 rounded-xl p-4">
            <p className="text-2xl font-heading font-semibold text-foreground-900">{activeCount}</p>
            <p className="text-xs text-foreground-500 mt-0.5">Active collaborator{activeCount !== 1 ? 's' : ''}</p>
          </div>
          <div className="bg-background-50 border border-secondary-200/70 rounded-xl p-4">
            <p className="text-2xl font-heading font-semibold text-foreground-900">{pendingCount}</p>
            <p className="text-xs text-foreground-500 mt-0.5">Pending invitation{pendingCount !== 1 ? 's' : ''}</p>
          </div>
          <div className="bg-background-50 border border-secondary-200/70 rounded-xl p-4">
            <p className="text-2xl font-heading font-semibold text-amber-600">{collaborators.filter((c) => c.role === 'owner').length}</p>
            <p className="text-xs text-foreground-500 mt-0.5">Owner{activeCount !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-1 mb-6 border-b border-secondary-100 overflow-x-auto">
          {(['active', 'pending', 'roles', 'activity'] as CollaboratorTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-label whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
                activeTab === tab
                  ? 'border-primary-500 text-primary-700 font-semibold'
                  : 'border-transparent text-foreground-500 hover:text-foreground-700'
              }`}
            >
              {tab === 'active' && `Active (${activeCount})`}
              {tab === 'pending' && `Pending (${pendingCount})`}
              {tab === 'roles' && 'Roles & Permissions'}
              {tab === 'activity' && 'Activity'}
            </button>
          ))}
          <div className="flex-1" />
          {canManageMembers && (
            <button
              onClick={() => { setShowInvite(!showInvite); setInviteError(null); setInviteSuccess(false); }}
              className="px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-label font-semibold hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5"
            >
              <i className="ri-user-add-line" />
              Invite
            </button>
          )}
        </div>

        {/* Invite form */}
        {showInvite && (
          <div className="mb-6 bg-accent-50 border border-accent-100 rounded-xl p-5">
            <h3 className="font-label text-sm font-semibold text-accent-900 mb-1">Invite a collaborator</h3>
            <p className="text-xs text-accent-700 mb-4">They will receive an email invitation to join your wedding workspace.</p>
            <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="flex-1 h-10 px-3 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                placeholder="colleague@example.com"
                required
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as WeddingRole)}
                className="h-10 px-3 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 cursor-pointer sm:w-40"
              >
                <option value="partner">Partner / Co-owner</option>
                <option value="planner">Planner</option>
                <option value="collaborator">Collaborator</option>
                <option value="viewer">Viewer</option>
              </select>
              <button
                type="submit"
                disabled={inviting || !inviteEmail.trim()}
                className="h-10 px-5 rounded-lg bg-primary-500 text-white text-sm font-label font-semibold hover:bg-primary-600 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
              >
                {inviting ? 'Sending...' : 'Send invite'}
              </button>
            </form>
            {inviteMessage && (
              <textarea
                value={inviteMessage}
                onChange={(e) => setInviteMessage(e.target.value)}
                className="mt-3 w-full px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-primary-400 min-h-[60px]"
                placeholder="Optional: add a personal message..."
                maxLength={500}
              />
            )}
            {inviteError && <p className="text-xs text-red-600 mt-2">{inviteError}</p>}
            {inviteSuccess && (
              <div className="flex items-center gap-2 mt-2 text-xs text-emerald-600">
                <i className="ri-check-line" />
                Invitation sent to {inviteEmail || 'recipient'}
              </div>
            )}
          </div>
        )}

        {/* Active tab */}
        {activeTab === 'active' && (
          <div className="space-y-3">
            {collaborators.filter((c) => !c.isInvitation || c.status === 'active').length === 0 ? (
              <div className="text-center py-14 bg-background-50 border border-secondary-100 rounded-xl">
                <div className="w-14 h-14 mx-auto rounded-full bg-secondary-100 flex items-center justify-center mb-3">
                  <i className="ri-team-line text-2xl text-foreground-400" />
                </div>
                <p className="text-sm text-foreground-600 font-label">No collaborators yet</p>
                <p className="text-xs text-foreground-400 mt-1">Invite your partner, planner, or family to help plan</p>
              </div>
            ) : (
              collaborators.filter((c) => !c.isInvitation || c.status === 'active').map((collab) => (
                <CollaboratorRow
                  key={collab.id}
                  collab={collab}
                  currentUserRole={currentUserRole}
                  canManageMembers={canManageMembers}
                  isOwner={isOwner}
                  roleMenuId={roleMenuId}
                  roleMenuRef={roleMenuRef}
                  setRoleMenuId={setRoleMenuId}
                  changeRole={changeRole}
                  handleRemove={handleRemove}
                  handleSuspend={handleSuspend}
                  setShowOwnershipTransfer={setShowOwnershipTransfer}
                  setTransferTarget={setTransferTarget}
                  setTransferConfirm={setTransferConfirm}
                />
              ))
            )}
          </div>
        )}

        {/* Pending tab */}
        {activeTab === 'pending' && (
          <div className="space-y-3">
            {collaborators.filter((c) => c.isInvitation && c.status === 'pending').length === 0 ? (
              <div className="text-center py-14 bg-background-50 border border-secondary-100 rounded-xl">
                <div className="w-14 h-14 mx-auto rounded-full bg-secondary-100 flex items-center justify-center mb-3">
                  <i className="ri-mail-send-line text-2xl text-foreground-400" />
                </div>
                <p className="text-sm text-foreground-600 font-label">No pending invitations</p>
                <p className="text-xs text-foreground-400 mt-1">Sent invitations will appear here</p>
              </div>
            ) : (
              collaborators.filter((c) => c.isInvitation && c.status === 'pending').map((inv) => (
                <div key={inv.id} className="bg-background-50 border border-secondary-200/70 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0 text-amber-600">
                      <i className="ri-mail-line text-sm" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-label font-semibold text-foreground-900 truncate">{inv.email}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-label font-semibold ${ROLE_COLORS[inv.role]}`}>
                          {ROLE_SHORT_LABELS[inv.role]}
                        </span>
                        <span className="text-xs text-foreground-400">
                          {inv.expiresAt ? `Expires ${new Date(inv.expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : 'No expiry'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { revokeInvitation(inv.id); }}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                      title="Revoke invitation"
                    >
                      <i className="ri-close-line" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Roles tab */}
        {activeTab === 'roles' && (
          <div className="space-y-5">
            <SettingsCard title="Role descriptions">
              <div className="space-y-3">
                {(Object.entries(ROLE_DESCRIPTIONS) as [WeddingRole, string][]).map(([role, desc]) => (
                  <div key={role} className="flex items-start gap-3 py-2">
                    <span className={`px-2.5 py-1 rounded-lg text-[11px] font-label font-semibold shrink-0 mt-0.5 whitespace-nowrap ${ROLE_COLORS[role]}`}>
                      {ROLE_SHORT_LABELS[role]}
                    </span>
                    <p className="text-xs text-foreground-600 leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
            </SettingsCard>

            <SettingsCard title="Permission matrix" description="What each role can and cannot do">
              <div className="overflow-x-auto -mx-2">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-secondary-100">
                      <th className="text-left py-2 px-3 font-label font-semibold text-foreground-700 whitespace-nowrap">Permission</th>
                      {(['owner', 'partner', 'planner', 'collaborator', 'viewer'] as WeddingRole[]).map((r) => (
                        <th key={r} className="text-center py-2 px-3 font-label font-semibold text-foreground-700 whitespace-nowrap">
                          {ROLE_SHORT_LABELS[r]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const allKeys = Object.keys(PERMISSION_MATRIX.owner) as (keyof WeddingPermissions)[];
                      const categories: string[] = [];
                      const rows: { category: string; key: keyof WeddingPermissions; label: string }[] = [];

                      for (const key of allKeys) {
                        const cat = getPermissionCategory(key);
                        if (!categories.includes(cat)) categories.push(cat);
                        rows.push({ category: cat, key, label: getPermissionLabel(key) });
                      }

                      return categories.flatMap((cat) => [
                        <tr key={`cat-${cat}`} className="border-b border-secondary-50">
                          <td colSpan={6} className="py-3 px-3">
                            <span className="text-[11px] font-label font-semibold text-foreground-400 uppercase tracking-wider">{cat}</span>
                          </td>
                        </tr>,
                        ...rows.filter((r) => r.category === cat).map((row) => (
                          <tr key={row.key} className="border-b border-secondary-50 hover:bg-secondary-50/50 transition-colors">
                            <td className="py-2.5 px-3 text-foreground-700 font-label">{row.label}</td>
                            {(['owner', 'partner', 'planner', 'collaborator', 'viewer'] as WeddingRole[]).map((role) => {
                              const level = PERMISSION_MATRIX[role]?.[row.key] || 'none';
                              return (
                                <td key={role} className="py-2.5 px-3 text-center">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-label font-semibold whitespace-nowrap ${getPermissionLevelColor(level)}`}>
                                    {getPermissionLevelLabel(level)}
                                  </span>
                                </td>
                              );
                            })}
                          </tr>
                        )),
                      ]);
                    })()}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-foreground-400 mt-4">Frontend permissions only. Backend RLS policies provide the authoritative enforcement.</p>
            </SettingsCard>
          </div>
        )}

        {/* Activity tab */}
        {activeTab === 'activity' && (
          <div className="space-y-5">
            <SettingsCard title="Collaborator activity" description="Recent changes to your wedding team.">
              <div className="space-y-3">
                {collaborators.length === 0 ? (
                  <p className="text-sm text-foreground-400 text-center py-6">No activity to display yet</p>
                ) : (
                  collaborators.slice(0, 10).map((c) => (
                    <div key={`activity-${c.id}`} className="flex items-center gap-3 py-2">
                      <div className="w-8 h-8 flex items-center justify-center rounded-full bg-secondary-100 text-foreground-400">
                        <i className="ri-user-add-line text-sm" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground-700">
                          {c.isInvitation ? (
                            <>{c.email} was invited as {ROLE_SHORT_LABELS[c.role]}</>
                          ) : (
                            <>{c.name} joined as {ROLE_SHORT_LABELS[c.role]}</>
                          )}
                        </p>
                        <p className="text-xs text-foreground-400">
                          {new Date(c.invitedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </SettingsCard>
          </div>
        )}

        {/* Ownership transfer modal */}
        {showOwnershipTransfer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <i className="ri-error-warning-line text-lg text-amber-600" />
                </div>
                <div>
                  <h3 className="font-label text-sm font-semibold text-foreground-900">Transfer ownership?</h3>
                  <p className="text-xs text-foreground-500">This action cannot be undone easily</p>
                </div>
              </div>
              <div className="text-xs text-foreground-600 space-y-2 mb-4">
                <p>You are about to transfer full ownership of this wedding. This means:</p>
                <ul className="space-y-1 ml-4 list-disc">
                  <li>You will become a Partner (co-owner)</li>
                  <li>The new owner will control billing, collaborators, and destructive actions</li>
                  <li>Billing ownership may require a separate transfer</li>
                </ul>
              </div>
              <div className="mb-4">
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">
                  Type <strong className="text-red-600">TRANSFER OWNERSHIP</strong> to confirm
                </label>
                <input
                  type="text"
                  value={transferConfirm}
                  onChange={(e) => setTransferConfirm(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder="TRANSFER OWNERSHIP"
                />
              </div>
              {actionError && <p className="text-xs text-red-600 mb-3">{actionError}</p>}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setShowOwnershipTransfer(false); setTransferTarget(null); setTransferConfirm(''); setActionError(null); }}
                  className="flex-1 py-2.5 rounded-lg border border-secondary-200 text-sm text-foreground-700 font-label hover:bg-secondary-50 transition-colors cursor-pointer whitespace-nowrap"
                >
                  Cancel
                </button>
                <button
                  onClick={handleTransferOwnership}
                  disabled={transferring}
                  className="flex-1 py-2.5 rounded-lg bg-amber-500 text-white text-sm font-label font-semibold hover:bg-amber-600 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
                >
                  {transferring ? 'Transferring...' : 'Transfer ownership'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function CollaboratorRow({
  collab, currentUserRole, canManageMembers, isOwner, roleMenuId, roleMenuRef, setRoleMenuId, changeRole, handleRemove, handleSuspend, setShowOwnershipTransfer, setTransferTarget, setTransferConfirm,
}: {
  collab: CollaboratorDisplay;
  currentUserRole: string | null;
  canManageMembers: boolean;
  isOwner: boolean;
  roleMenuId: string | null;
  roleMenuRef: React.RefObject<HTMLDivElement | null>;
  setRoleMenuId: (id: string | null) => void;
  changeRole: (id: string, isInvitation: boolean, newRole: WeddingRole) => Promise<void>;
  handleRemove: (id: string, isInvitation: boolean) => Promise<void>;
  handleSuspend: (id: string) => void;
  setShowOwnershipTransfer: (v: boolean) => void;
  setTransferTarget: (v: string | null) => void;
  setTransferConfirm: (v: string) => void;
}) {
  const roleColors = ROLE_COLORS[collab.role] || 'bg-secondary-100 text-secondary-700';
  const isCollabOwner = collab.role === 'owner';
  const isActive = collab.status === 'active';

  return (
    <div className="bg-background-50 border border-secondary-200/70 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" key={collab.id}>
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-full bg-secondary-200 flex items-center justify-center shrink-0 text-xs font-label font-semibold text-foreground-600">
          {collab.avatarUrl ? (
            <img src={collab.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
          ) : (
            collab.name?.charAt(0)?.toUpperCase() || '?'
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-label font-semibold text-foreground-900 truncate">{collab.name}</p>
          <p className="text-xs text-foreground-500 truncate">{collab.email}</p>
          {collab.acceptedAt && (
            <p className="text-[10px] text-foreground-400 mt-0.5">
              Joined {new Date(collab.acceptedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2.5">
        {!isActive && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-label font-semibold bg-amber-100 text-amber-700 whitespace-nowrap">
            {getStatusLabel(collab.status)}
          </span>
        )}

        {/* Role badge/dropdown */}
        <div className="relative" ref={roleMenuId === collab.id ? roleMenuRef : undefined}>
          <button
            onClick={() => canManageMembers && !isCollabOwner && setRoleMenuId(roleMenuId === collab.id ? null : collab.id)}
            disabled={!canManageMembers || isCollabOwner}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-label font-semibold transition-colors cursor-pointer whitespace-nowrap ${roleColors} ${(!canManageMembers || isCollabOwner) ? 'opacity-80 cursor-default' : 'hover:opacity-80'}`}
          >
            {ROLE_SHORT_LABELS[collab.role]}
            {canManageMembers && !isCollabOwner && <i className="ri-arrow-down-s-line ml-1 text-[10px]" />}
          </button>
          {roleMenuId === collab.id && canManageMembers && !isCollabOwner && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-secondary-200 rounded-lg shadow-lg z-20 py-1 min-w-[160px]">
              {(Object.entries(ROLE_SHORT_LABELS) as [WeddingRole, string][]).filter(([r]) => r !== 'owner').map(([role, label]) => (
                <button
                  key={role}
                  onClick={async () => {
                    setRoleMenuId(null);
                    try { await changeRole(collab.id, collab.isInvitation, role); } catch { /* silent */ }
                  }}
                  className={`w-full text-left px-3 py-2 text-xs font-label hover:bg-secondary-50 transition-colors cursor-pointer whitespace-nowrap ${collab.role === role ? 'text-primary-600 font-semibold' : 'text-foreground-700'}`}
                >
                  <span>{label}</span>
                  <span className="block text-[10px] text-foreground-400 font-normal">{ROLE_DESCRIPTIONS[role].slice(0, 55)}...</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        {canManageMembers && !isCollabOwner && (
          <div className="flex items-center gap-1">
            {isOwner && isActive && (
              <button
                onClick={() => { setTransferTarget(collab.id); setTransferConfirm(''); setShowOwnershipTransfer(true); }}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-400 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                title="Transfer ownership"
              >
                <i className="ri-exchange-line text-sm" />
              </button>
            )}
            <button
              onClick={() => handleRemove(collab.id, collab.isInvitation)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
              title="Remove collaborator"
            >
              <i className="ri-user-unfollow-line text-sm" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Demo Collaborators Page ──

function DemoCollaboratorsPage() {
  const demo = useDemoDataSafe();
  const wedding = demo?.state.wedding;
  const [activeTab, setActiveTab] = useState<CollaboratorTab>('active');
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<WeddingRole>('viewer');
  const [inviteDemoFeedback, setInviteDemoFeedback] = useState<string | null>(null);
  const [showOwnerTransfer, setShowOwnerTransfer] = useState(false);

  const demoCollaborators = [
    {
      id: 'demo-collab-1',
      userId: 'demo-user-1',
      email: 'emma@example.com',
      name: `${wedding?.partner_one_name || 'Emma'} ${wedding?.partner_two_name || 'Watson'}`,
      role: 'owner' as WeddingRole,
      status: 'active' as const,
      isInvitation: false,
      invitationId: null,
      avatarUrl: null,
      invitedAt: '2026-01-15T10:00:00Z',
      acceptedAt: '2026-01-15T10:00:00Z',
      expiresAt: null,
    },
    {
      id: 'demo-collab-2',
      userId: 'demo-user-2',
      email: 'james@example.com',
      name: 'James Smith',
      role: 'partner' as WeddingRole,
      status: 'active' as const,
      isInvitation: false,
      invitationId: null,
      avatarUrl: null,
      invitedAt: '2026-01-20T14:00:00Z',
      acceptedAt: '2026-01-22T09:00:00Z',
      expiresAt: null,
    },
    {
      id: 'demo-collab-3',
      userId: 'demo-user-3',
      email: 'sarah@planners.co.uk',
      name: 'Sarah Mitchell',
      role: 'planner' as WeddingRole,
      status: 'active' as const,
      isInvitation: false,
      invitationId: null,
      avatarUrl: null,
      invitedAt: '2026-03-01T11:00:00Z',
      acceptedAt: '2026-03-03T16:00:00Z',
      expiresAt: null,
    },
    {
      id: 'demo-pending-1',
      userId: null,
      email: 'mum.watson@email.com',
      name: 'mum.watson@email.com',
      role: 'collaborator' as WeddingRole,
      status: 'pending' as const,
      isInvitation: true,
      invitationId: 'demo-inv-1',
      avatarUrl: null,
      invitedAt: '2026-07-28T08:00:00Z',
      acceptedAt: null,
      expiresAt: '2026-08-11T08:00:00Z',
    },
  ];

  const activeCount = demoCollaborators.filter((c) => c.status === 'active').length;
  const pendingCount = demoCollaborators.filter((c) => c.isInvitation && c.status === 'pending').length;

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-1">
          <p className="text-xs text-foreground-400 font-label">Wedding team</p>
          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-label font-semibold whitespace-nowrap">Demo</span>
        </div>
        <h1 className="font-heading text-2xl md:text-3xl text-foreground-900 mb-1">Collaborators</h1>
        <p className="text-sm text-foreground-500 mb-8">Manage who has access to your wedding workspace</p>

        <div className="mb-6 px-4 py-3.5 rounded-xl bg-accent-50 border border-accent-100 flex items-start gap-3">
          <div className="w-5 h-5 flex items-center justify-center text-accent-600 flex-shrink-0 mt-0.5">
            <i className="ri-information-line text-sm" />
          </div>
          <p className="text-xs text-accent-700 leading-relaxed">
            Demo mode shows sample collaborators. In production, invitation emails are sent through Supabase Edge Functions, and all membership changes are stored securely.
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div className="bg-background-50 border border-secondary-200/70 rounded-xl p-4">
            <p className="text-2xl font-heading font-semibold text-foreground-900">{activeCount}</p>
            <p className="text-xs text-foreground-500 mt-0.5">Active collaborators</p>
          </div>
          <div className="bg-background-50 border border-secondary-200/70 rounded-xl p-4">
            <p className="text-2xl font-heading font-semibold text-foreground-900">{pendingCount}</p>
            <p className="text-xs text-foreground-500 mt-0.5">Pending invitations</p>
          </div>
          <div className="bg-background-50 border border-secondary-200/70 rounded-xl p-4">
            <p className="text-2xl font-heading font-semibold text-amber-600">1</p>
            <p className="text-xs text-foreground-500 mt-0.5">Owner</p>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-1 mb-6 border-b border-secondary-100 overflow-x-auto">
          {(['active', 'pending', 'roles', 'activity'] as CollaboratorTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-label whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
                activeTab === tab
                  ? 'border-primary-500 text-primary-700 font-semibold'
                  : 'border-transparent text-foreground-500 hover:text-foreground-700'
              }`}
            >
              {tab === 'active' && `Active (${activeCount})`}
              {tab === 'pending' && `Pending (${pendingCount})`}
              {tab === 'roles' && 'Roles & Permissions'}
              {tab === 'activity' && 'Activity'}
            </button>
          ))}
          <div className="flex-1" />
          <button
            onClick={() => { setShowInvite(!showInvite); setInviteDemoFeedback(null); }}
            className="px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-label font-semibold hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5"
          >
            <i className="ri-user-add-line" />
            Invite
          </button>
        </div>

        {/* Invite form (demo) */}
        {showInvite && (
          <div className="mb-6 bg-accent-50 border border-accent-100 rounded-xl p-5">
            <h3 className="font-label text-sm font-semibold text-accent-900 mb-1">Invite a collaborator (demo)</h3>
            <p className="text-xs text-accent-700 mb-4">No email will be sent in demo mode</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="flex-1 h-10 px-3 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900"
                placeholder="colleague@example.com"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as WeddingRole)}
                className="h-10 px-3 rounded-lg border border-secondary-200 bg-white text-sm cursor-pointer sm:w-40"
              >
                <option value="partner">Partner</option>
                <option value="planner">Planner</option>
                <option value="collaborator">Collaborator</option>
                <option value="viewer">Viewer</option>
              </select>
              <button
                onClick={() => {
                  setInviteDemoFeedback(`Invitation simulated for ${inviteEmail || 'recipient'} — no email sent in demo mode`);
                  setTimeout(() => { setInviteDemoFeedback(null); setShowInvite(false); }, 3000);
                }}
                className="h-10 px-5 rounded-lg bg-primary-500 text-white text-sm font-label font-semibold hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
              >
                Send invite
              </button>
            </div>
            {inviteDemoFeedback && (
              <p className="text-xs text-amber-600 mt-2">{inviteDemoFeedback}</p>
            )}
          </div>
        )}

        {/* Active tab (demo) */}
        {activeTab === 'active' && (
          <div className="space-y-3">
            {demoCollaborators.filter((c) => c.status === 'active').map((collab) => {
              const roleColors = ROLE_COLORS[collab.role] || 'bg-secondary-100 text-secondary-700';
              return (
                <div key={collab.id} className="bg-background-50 border border-secondary-200/70 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-secondary-200 flex items-center justify-center shrink-0 text-xs font-label font-semibold text-foreground-600">
                      {collab.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-label font-semibold text-foreground-900 truncate">{collab.name}</p>
                      <p className="text-xs text-foreground-500 truncate">{collab.email}</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-lg text-[11px] font-label font-semibold whitespace-nowrap ${roleColors}`}>
                    {ROLE_SHORT_LABELS[collab.role]}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Pending tab (demo) */}
        {activeTab === 'pending' && (
          <div className="space-y-3">
            {demoCollaborators.filter((c) => c.isInvitation && c.status === 'pending').map((inv) => (
              <div key={inv.id} className="bg-background-50 border border-secondary-200/70 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0 text-amber-600">
                    <i className="ri-mail-line text-sm" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-label font-semibold text-foreground-900 truncate">{inv.email}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-label font-semibold ${ROLE_COLORS[inv.role]}`}>
                        {ROLE_SHORT_LABELS[inv.role]}
                      </span>
                      <span className="text-xs text-foreground-400">Expires 11 Aug</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Roles tab (demo) */}
        {activeTab === 'roles' && (
          <div className="space-y-5">
            <SettingsCard title="Role descriptions">
              <div className="space-y-3">
                {(Object.entries(ROLE_DESCRIPTIONS) as [WeddingRole, string][]).map(([role, desc]) => (
                  <div key={role} className="flex items-start gap-3 py-2">
                    <span className={`px-2.5 py-1 rounded-lg text-[11px] font-label font-semibold shrink-0 mt-0.5 whitespace-nowrap ${ROLE_COLORS[role]}`}>
                      {ROLE_SHORT_LABELS[role]}
                    </span>
                    <p className="text-xs text-foreground-600 leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
            </SettingsCard>

            <SettingsCard title="Permission matrix">
              <div className="overflow-x-auto -mx-2">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-secondary-100">
                      <th className="text-left py-2 px-3 font-label font-semibold text-foreground-700 whitespace-nowrap">Permission</th>
                      {(['owner', 'partner', 'planner', 'collaborator', 'viewer'] as WeddingRole[]).map((r) => (
                        <th key={r} className="text-center py-2 px-3 font-label font-semibold text-foreground-700 whitespace-nowrap">
                          {ROLE_SHORT_LABELS[r]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const allKeys = Object.keys(PERMISSION_MATRIX.owner) as (keyof WeddingPermissions)[];
                      const cats = [...new Set(allKeys.map((k) => getPermissionCategory(k)))];
                      return cats.flatMap((cat) => [
                        <tr key={`cat-${cat}`} className="border-b border-secondary-50">
                          <td colSpan={6} className="py-3 px-3">
                            <span className="text-[11px] font-label font-semibold text-foreground-400 uppercase tracking-wider">{cat}</span>
                          </td>
                        </tr>,
                        ...allKeys.filter((k) => getPermissionCategory(k) === cat).map((key) => (
                          <tr key={key} className="border-b border-secondary-50 hover:bg-secondary-50/50 transition-colors">
                            <td className="py-2.5 px-3 text-foreground-700 font-label">{getPermissionLabel(key)}</td>
                            {(['owner', 'partner', 'planner', 'collaborator', 'viewer'] as WeddingRole[]).map((role) => {
                              const level = PERMISSION_MATRIX[role]?.[key] || 'none';
                              return (
                                <td key={role} className="py-2.5 px-3 text-center">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-label font-semibold whitespace-nowrap ${getPermissionLevelColor(level)}`}>
                                    {getPermissionLevelLabel(level)}
                                  </span>
                                </td>
                              );
                            })}
                          </tr>
                        )),
                      ]);
                    })()}
                  </tbody>
                </table>
              </div>
            </SettingsCard>
          </div>
        )}

        {/* Activity tab (demo) */}
        {activeTab === 'activity' && (
          <SettingsCard title="Collaborator activity">
            <div className="space-y-3">
              {[
                { icon: 'ri-user-add-line', text: 'Sarah Mitchell (Planner) joined the wedding', time: '3 Mar 2026' },
                { icon: 'ri-user-add-line', text: 'James Smith (Partner) joined the wedding', time: '22 Jan 2026' },
                { icon: 'ri-user-add-line', text: 'You created this wedding', time: '15 Jan 2026' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 py-2">
                  <div className="w-8 h-8 flex items-center justify-center rounded-full bg-secondary-100 text-foreground-400">
                    <i className={`${item.icon} text-sm`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-foreground-700">{item.text}</p>
                  </div>
                  <span className="text-xs text-foreground-400">{item.time}</span>
                </div>
              ))}
            </div>
          </SettingsCard>
        )}

        {/* Ownership transfer preview (demo) */}
        {showOwnerTransfer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <i className="ri-error-warning-line text-lg text-amber-600" />
                </div>
                <div>
                  <h3 className="font-label text-sm font-semibold text-foreground-900">Demo preview</h3>
                  <p className="text-xs text-foreground-500">Ownership transfer requires production mode</p>
                </div>
              </div>
              <p className="text-xs text-foreground-600 mb-4">In production, you would confirm with a verification phrase and the transfer would be processed securely.</p>
              <button
                onClick={() => setShowOwnerTransfer(false)}
                className="w-full py-2.5 rounded-lg bg-primary-500 text-white text-sm font-label font-semibold hover:bg-primary-600 transition-colors cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function CollaboratorsPage() {
  if (isDemoMode) return <DemoCollaboratorsPage />;
  return <NormalCollaboratorsPage />;
}