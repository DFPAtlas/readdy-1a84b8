import { useState, useCallback, useRef } from 'react';
import AppShell from '@/components/feature/AppShell';
import { isDemoMode } from '@/demo/demoConfig';
import { useDemoDataSafe } from '@/demo/useDemoDataSafe';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { useAuth } from '@/context/AuthProvider';
import {
  useProfileSettings,
  useWeddingSettings,
  useGuestPortalSettings,
  useNotificationPreferences,
  useCollaborators,
  usePrivacySettings,
  useBilling,
  useDataManagement,
} from '@/hooks/useSettings';
import {
  SETTINGS_NAV,
  ROLE_LABELS,
  ROLE_SHORT_LABELS,
  ROLE_DESCRIPTIONS,
  ROLE_COLORS,
  PLAN_LABELS,
  PLAN_PRICES,
  PLAN_FEATURES,
  COMMON_TIMEZONES,
} from '@/types/settings';
import type {
  SettingsTab,
  WeddingRole,
} from '@/types/settings';

// ── Toggle Switch ──

function Toggle({ enabled, onChange, label, description, disabled }: {
  enabled: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3.5">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground-900 font-label font-medium">{label}</p>
        {description && <p className="text-xs text-foreground-500 mt-0.5 leading-relaxed">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        disabled={disabled}
        onClick={() => !disabled && onChange(!enabled)}
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        } ${enabled ? 'bg-primary-500' : 'bg-secondary-300'}`}
      >
        <span className={`inline-block h-5 w-5 rounded-full bg-white transition-transform mt-0.5 ${enabled ? 'translate-x-[22px]' : 'translate-x-[2px]'}`} />
      </button>
    </div>
  );
}

// ── Card wrapper ──

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

// ── Section Skeleton ──

function SectionSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-6 w-48 rounded bg-secondary-200" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-background-50 border border-secondary-100 rounded-xl p-5">
            <div className="h-4 w-32 rounded bg-secondary-200 mb-3" />
            <div className="h-3 w-64 rounded bg-secondary-100 mb-1" />
            <div className="h-3 w-48 rounded bg-secondary-100" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Profile Section ──

function ProfileSection({ userId }: { userId: string | null }) {
  const { profile, loading, saving, save, error } = useProfileSettings(userId);
  const [localProfile, setLocalProfile] = useState<Record<string, string>>({});
  const [savedMsg, setSavedMsg] = useState(false);

  if (loading) return <SectionSkeleton />;
  if (!profile) return <p className="text-sm text-foreground-500">Unable to load profile</p>;

  const data = { ...profile, ...localProfile };

  const update = (key: string, value: string) => {
    setLocalProfile((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    try {
      await save(localProfile as Parameters<typeof save>[0]);
      setLocalProfile({});
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 2000);
    } catch (e) {
      // error shown inline
    }
  };

  const hasChanges = Object.keys(localProfile).length > 0;

  return (
    <div className="space-y-5">
      {error && <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>}

      {/* Avatar & Name */}
      <SettingsCard title="Personal details">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
            {data.avatarUrl ? (
              <img src={data.avatarUrl} alt="" className="w-16 h-16 rounded-full object-cover" />
            ) : (
              <span className="text-primary-700 font-heading text-xl font-semibold">
                {(data.firstName?.charAt(0) || '') + (data.lastName?.charAt(0) || '')}
              </span>
            )}
          </div>
          <div>
            <p className="text-sm font-label font-semibold text-foreground-900">
              {data.displayName || `${data.firstName} ${data.lastName}`.trim() || 'Your Name'}
            </p>
            <p className="text-xs text-foreground-500">{data.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">First name</label>
            <input
              type="text"
              value={data.firstName}
              onChange={(e) => update('firstName', e.target.value)}
              className="input-field"
              placeholder="Emma"
            />
          </div>
          <div>
            <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Last name</label>
            <input
              type="text"
              value={data.lastName}
              onChange={(e) => update('lastName', e.target.value)}
              className="input-field"
              placeholder="Watson"
            />
          </div>
          <div>
            <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Display name</label>
            <input
              type="text"
              value={data.displayName}
              onChange={(e) => update('displayName', e.target.value)}
              className="input-field"
              placeholder="Emma Watson"
            />
            <p className="text-[11px] text-foreground-400 mt-1">How your name appears to guests</p>
          </div>
          <div>
            <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Phone</label>
            <input
              type="tel"
              value={data.phone}
              onChange={(e) => update('phone', e.target.value)}
              className="input-field"
              placeholder="+44 7700 900123"
            />
          </div>
        </div>
      </SettingsCard>

      {/* Email & Timezone */}
      <SettingsCard title="Preferences">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Email address</label>
            <input
              type="email"
              value={data.email}
              disabled
              className="input-field opacity-60 cursor-not-allowed"
            />
            <p className="text-[11px] text-foreground-400 mt-1">Contact support to change your email</p>
          </div>
          <div>
            <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Timezone</label>
            <select
              value={data.timezone}
              onChange={(e) => update('timezone', e.target.value)}
              className="input-field"
            >
              {COMMON_TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>{tz.replace('_', ' ').replace('/', ' / ')}</option>
              ))}
            </select>
          </div>
        </div>
      </SettingsCard>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          className="btn-primary cursor-pointer disabled:opacity-50 whitespace-nowrap"
        >
          {saving ? 'Saving...' : 'Save profile'}
        </button>
        {savedMsg && <span className="text-sm text-emerald-600 font-label">Saved!</span>}
      </div>
    </div>
  );
}

// ── Wedding Section ──

function WeddingSection({ weddingId }: { weddingId: string | null }) {
  const { wedding, loading, saving, save, error } = useWeddingSettings(weddingId);
  const [localWedding, setLocalWedding] = useState<Record<string, string>>({});
  const [savedMsg, setSavedMsg] = useState(false);

  if (loading) return <SectionSkeleton />;
  if (!wedding) return <p className="text-sm text-foreground-500">No wedding selected</p>;

  const data = { ...wedding, ...localWedding };

  const update = (key: string, value: string) => {
    setLocalWedding((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    try {
      await save(localWedding as Parameters<typeof save>[0]);
      setLocalWedding({});
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 2000);
    } catch { /* inline error */ }
  };

  const hasChanges = Object.keys(localWedding).length > 0;

  return (
    <div className="space-y-5">
      {error && <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>}

      <SettingsCard title="Wedding details" description="These details appear on your guest portal and invitations">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Wedding title</label>
            <input
              type="text"
              value={data.title}
              onChange={(e) => update('title', e.target.value)}
              className="input-field"
              placeholder="Emma & James"
            />
          </div>
          <div>
            <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Partner one name</label>
            <input
              type="text"
              value={data.partnerOneName}
              onChange={(e) => update('partnerOneName', e.target.value)}
              className="input-field"
              placeholder="Emma"
            />
          </div>
          <div>
            <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Partner two name</label>
            <input
              type="text"
              value={data.partnerTwoName}
              onChange={(e) => update('partnerTwoName', e.target.value)}
              className="input-field"
              placeholder="James"
            />
          </div>
          <div>
            <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Wedding date</label>
            <input
              type="date"
              value={data.weddingDate}
              onChange={(e) => update('weddingDate', e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Timezone</label>
            <select
              value={data.timezone}
              onChange={(e) => update('timezone', e.target.value)}
              className="input-field"
            >
              {COMMON_TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>{tz.replace('_', ' ').replace('/', ' / ')}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Location</label>
            <input
              type="text"
              value={data.location}
              onChange={(e) => update('location', e.target.value)}
              className="input-field"
              placeholder="Bath, Somerset"
            />
          </div>
          <div>
            <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">URL slug</label>
            <input
              type="text"
              value={data.slug}
              onChange={(e) => update('slug', e.target.value)}
              className="input-field"
              placeholder="emma-and-james"
            />
            <p className="text-[11px] text-foreground-400 mt-1">wedora.app/{data.slug || 'your-slug'}</p>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Contact information</label>
            <textarea
              value={data.contactInfo}
              onChange={(e) => update('contactInfo', e.target.value)}
              className="input-field min-h-[80px]"
              placeholder="If you have any questions, contact us at..."
            />
          </div>
        </div>
      </SettingsCard>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          className="btn-primary cursor-pointer disabled:opacity-50 whitespace-nowrap"
        >
          {saving ? 'Saving...' : 'Save wedding'}
        </button>
        {savedMsg && <span className="text-sm text-emerald-600 font-label">Saved!</span>}
      </div>
    </div>
  );
}

// ── Collaborators Section ──

function CollaboratorsSection({ weddingId }: { weddingId: string | null }) {
  const { collaborators, loading, error, inviteCollaborator, revokeInvitation, removeCollaborator, changeRole, fetch } = useCollaborators(weddingId);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<WeddingRole>('viewer');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [roleMenu, setRoleMenu] = useState<string | null>(null);
  const roleMenuRef = useRef<HTMLDivElement>(null);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteError(null);
    try {
      await inviteCollaborator(inviteEmail.trim(), inviteRole);
      setInviteEmail('');
      setInviteSuccess(true);
      setTimeout(() => {
        setInviteSuccess(false);
        setShowInvite(false);
      }, 1500);
    } catch (err: unknown) {
      setInviteError(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  if (loading) return <SectionSkeleton />;

  return (
    <div className="space-y-5">
      {error && <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>}

      {/* Header + Invite */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-label text-sm font-semibold text-foreground-900">Team members</h2>
          <p className="text-xs text-foreground-500 mt-0.5">{collaborators.filter((c) => c.status === 'active').length} active member{collaborators.filter((c) => c.status === 'active').length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => { setShowInvite(!showInvite); setInviteError(null); setInviteSuccess(false); }}
          className="btn-primary cursor-pointer whitespace-nowrap"
        >
          <i className="ri-user-add-line mr-1.5" />
          Invite collaborator
        </button>
      </div>

      {/* Invite form */}
      {showInvite && (
        <div className="bg-accent-50 border border-accent-100 rounded-xl p-5">
          <h3 className="font-label text-sm font-semibold text-accent-900 mb-1">Invite a collaborator</h3>
          <p className="text-xs text-accent-700 mb-4">They&rsquo;ll receive an email invitation to join your wedding workspace</p>
          <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="input-field flex-1"
              placeholder="colleague@example.com"
              required
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as WeddingRole)}
              className="input-field sm:w-40"
            >
              <option value="partner">Partner / Co-owner</option>
              <option value="planner">Planner</option>
              <option value="collaborator">Collaborator</option>
              <option value="viewer">Viewer</option>
            </select>
            <button
              type="submit"
              disabled={inviting || !inviteEmail.trim()}
              className="btn-primary cursor-pointer disabled:opacity-50 whitespace-nowrap"
            >
              {inviting ? 'Sending...' : 'Send invite'}
            </button>
          </form>
          {inviteError && <p className="text-xs text-red-600 mt-2">{inviteError}</p>}
          {inviteSuccess && <p className="text-xs text-emerald-600 mt-2">Invitation sent!</p>}
        </div>
      )}

      {/* Collaborator list */}
      <div className="space-y-3">
        {collaborators.length === 0 ? (
          <div className="text-center py-10 bg-background-50 border border-secondary-100 rounded-xl">
            <div className="w-12 h-12 mx-auto rounded-full bg-secondary-100 flex items-center justify-center mb-3">
              <i className="ri-team-line text-xl text-foreground-400" />
            </div>
            <p className="text-sm text-foreground-600 font-label">No collaborators yet</p>
            <p className="text-xs text-foreground-400 mt-0.5">Invite your partner, wedding planner, or family to help out</p>
          </div>
        ) : collaborators.map((collab) => {
          const roleClass = ROLE_COLORS[collab.role] || 'bg-secondary-100 text-secondary-700';
          const isOwner = collab.role === 'owner';
          const isActive = collab.status === 'active';

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
              <div className="flex items-center gap-2.5">
                {!isActive && !collab.isInvitation && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-label font-semibold bg-amber-100 text-amber-700 whitespace-nowrap">{collab.status}</span>
                )}
                {collab.isInvitation && collab.status === 'pending' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-label font-semibold bg-amber-100 text-amber-700 whitespace-nowrap">Pending</span>
                )}
                {collab.isInvitation && collab.status === 'expired' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-label font-semibold bg-red-50 text-red-600 whitespace-nowrap">Expired</span>
                )}

                {/* Role dropdown */}
                <div className="relative" ref={roleMenu === collab.id ? roleMenuRef : undefined}>
                  <button
                    onClick={() => setRoleMenu(roleMenu === collab.id ? null : collab.id)}
                    disabled={isOwner}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-label font-semibold transition-colors cursor-pointer whitespace-nowrap ${roleClass} ${isOwner ? 'opacity-80 cursor-default' : 'hover:opacity-80'}`}
                  >
                    {ROLE_SHORT_LABELS[collab.role]}
                    {!isOwner && <i className="ri-arrow-down-s-line ml-1 text-[10px]" />}
                  </button>
                  {roleMenu === collab.id && !isOwner && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-secondary-200 rounded-lg shadow-lg z-20 py-1 min-w-[140px]">
                      {(Object.entries(ROLE_SHORT_LABELS) as [WeddingRole, string][]).filter(([r]) => r !== 'owner').map(([role, label]) => (
                        <button
                          key={role}
                          onClick={async () => {
                            setRoleMenu(null);
                            try {
                              await changeRole(collab.isInvitation ? collab.id : collab.id, collab.isInvitation, role);
                            } catch { /* error silent */ }
                          }}
                          className={`w-full text-left px-3 py-2 text-xs font-label hover:bg-secondary-50 transition-colors cursor-pointer whitespace-nowrap ${
                            collab.role === role ? 'text-primary-600 font-semibold' : 'text-foreground-700'
                          }`}
                        >
                          <span>{label}</span>
                          <span className="block text-[10px] text-foreground-400 font-normal">{ROLE_DESCRIPTIONS[role].slice(0, 60)}...</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Remove / Revoke */}
                {!isOwner && (
                  <button
                    onClick={() => {
                      if (collab.isInvitation) {
                        revokeInvitation(collab.id);
                      } else {
                        if (window.confirm(`Remove ${collab.name} from this wedding? They will lose all access.`)) {
                          removeCollaborator(collab.id);
                        }
                      }
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                    title={collab.isInvitation ? 'Revoke invitation' : 'Remove member'}
                  >
                    <i className="ri-close-line text-base" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Role descriptions */}
      <div className="bg-background-50 border border-secondary-200/70 rounded-xl p-5">
        <h3 className="font-label text-xs font-semibold text-foreground-700 mb-3">Role permissions</h3>
        <div className="space-y-2.5">
          {(Object.entries(ROLE_DESCRIPTIONS) as [WeddingRole, string][]).map(([role, desc]) => (
            <div key={role} className="flex items-start gap-2">
              <span className={`px-2 py-0.5 rounded text-[10px] font-label font-semibold shrink-0 mt-0.5 ${ROLE_COLORS[role]}`}>
                {ROLE_SHORT_LABELS[role]}
              </span>
              <span className="text-xs text-foreground-600">{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Guest Portal Section ──

function GuestPortalSection({ weddingId }: { weddingId: string | null }) {
  const { settings, loading, saving, save, error } = useGuestPortalSettings(weddingId);
  const [savedMsg, setSavedMsg] = useState(false);

  if (loading) return <SectionSkeleton />;

  const update = async (key: string, value: boolean | string) => {
    try {
      await save({ [key]: value });
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 2000);
    } catch { /* silent */ }
  };

  return (
    <div className="space-y-5">
      {error && <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>}

      <SettingsCard title="Visible sections" description="Choose which sections guests can see in their portal">
        <div className="divide-y divide-secondary-100">
          <Toggle enabled={settings.galleryEnabled} onChange={(v) => update('galleryEnabled', v)} label="Photo gallery" description="Wedding photo gallery for guests to browse and contribute" />
          <Toggle enabled={settings.itineraryEnabled} onChange={(v) => update('itineraryEnabled', v)} label="Itinerary &amp; schedule" description="Ceremony, reception, and event timeline" />
          <Toggle enabled={settings.registryEnabled} onChange={(v) => update('registryEnabled', v)} label="Gift registry" description="Let guests browse and contribute to your registry" />
          <Toggle enabled={settings.travelEnabled} onChange={(v) => update('travelEnabled', v)} label="Travel &amp; local guide" description="Accommodation, transport, and local recommendations" />
          <Toggle enabled={settings.seatingEnabled} onChange={(v) => update('seatingEnabled', v)} label="Seating plan" description="Guests can find their table assignment" />
          <Toggle enabled={settings.updatesEnabled} onChange={(v) => update('updatesEnabled', v)} label="Updates &amp; messages" description="Wedding announcements and messages" />
        </div>
      </SettingsCard>

      <SettingsCard title="Guest contributions" description="Manage how guests interact with your content">
        <div className="divide-y divide-secondary-100">
          <Toggle enabled={settings.allowGuestUploads} onChange={(v) => update('allowGuestUploads', v)} label="Allow guest photo uploads" description="Guests can upload photos to your shared gallery" />
          <Toggle enabled={settings.requireUploadApproval} onChange={(v) => update('requireUploadApproval', v)} label="Require approval for uploads" description="You review photos before they appear in the gallery" />
          <Toggle enabled={settings.showGuestCount} onChange={(v) => update('showGuestCount', v)} label="Show guest count" description="Display the number of invited guests on your portal" />
        </div>
      </SettingsCard>

      <SettingsCard title="Publishing" description="Control who can see your wedding website">
        <div className="flex gap-3">
          <button
            onClick={() => update('publishMode', 'draft')}
            className={`flex-1 rounded-lg border-2 p-4 text-left transition-colors cursor-pointer ${
              settings.publishMode === 'draft' ? 'border-primary-500 bg-primary-50' : 'border-secondary-200 hover:border-secondary-300'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <i className={`ri-draft-line text-lg ${settings.publishMode === 'draft' ? 'text-primary-600' : 'text-foreground-500'}`} />
              <span className="text-sm font-label font-semibold text-foreground-900">Draft</span>
            </div>
            <p className="text-xs text-foreground-500">Only collaborators can see your website</p>
          </button>
          <button
            onClick={() => update('publishMode', 'live')}
            className={`flex-1 rounded-lg border-2 p-4 text-left transition-colors cursor-pointer ${
              settings.publishMode === 'live' ? 'border-primary-500 bg-primary-50' : 'border-secondary-200 hover:border-secondary-300'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <i className={`ri-global-line text-lg ${settings.publishMode === 'live' ? 'text-primary-600' : 'text-foreground-500'}`} />
              <span className="text-sm font-label font-semibold text-foreground-900">Live</span>
            </div>
            <p className="text-xs text-foreground-500">Anyone with the link can see it</p>
          </button>
        </div>
      </SettingsCard>

      {savedMsg && <p className="text-sm text-emerald-600 font-label">Settings saved</p>}
    </div>
  );
}

// ── Notifications Section ──

function NotificationsSection({ weddingId, userId }: { weddingId: string | null; userId: string | null }) {
  const { prefs, loading, save, error } = useNotificationPreferences(weddingId, userId);
  const [savedMsg, setSavedMsg] = useState(false);

  if (loading) return <SectionSkeleton />;

  const update = async (key: string, value: boolean) => {
    try {
      await save({ [key]: value });
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 2000);
    } catch { /* silent */ }
  };

  return (
    <div className="space-y-5">
      {error && <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>}

      <SettingsCard title="Email notifications" description="Get alerted about wedding activity via email">
        <div className="divide-y divide-secondary-100">
          <Toggle enabled={prefs.emailRsvpAlerts} onChange={(v) => update('emailRsvpAlerts', v)} label="RSVP responses" description="Get an email each time a guest submits their RSVP" />
          <Toggle enabled={prefs.emailNewUploads} onChange={(v) => update('emailNewUploads', v)} label="New photo uploads" description="Alerted when guests upload photos to the gallery" />
          <Toggle enabled={prefs.emailCampaignUpdates} onChange={(v) => update('emailCampaignUpdates', v)} label="Campaign updates" description="Notified when email campaigns are delivered or bounce" />
          <Toggle enabled={prefs.emailBudgetAlerts} onChange={(v) => update('emailBudgetAlerts', v)} label="Budget milestones" description="Notify when you approach or exceed budget limits" />
          <Toggle enabled={prefs.emailWeeklyDigest} onChange={(v) => update('emailWeeklyDigest', v)} label="Weekly digest" description="Summary of all wedding activity every Sunday" />
        </div>
      </SettingsCard>

      <SettingsCard title="Other channels">
        <div className="divide-y divide-secondary-100">
          <Toggle enabled={prefs.smsRsvpAlerts} onChange={(v) => update('smsRsvpAlerts', v)} label="SMS for urgent RSVP changes" description="Text when guests change RSVP within 48h of deadline" />
          <Toggle enabled={prefs.pushEnabled} onChange={(v) => update('pushEnabled', v)} label="Push notifications" description="Browser notifications for important updates" />
        </div>
      </SettingsCard>

      {savedMsg && <p className="text-sm text-emerald-600 font-label">Preferences saved</p>}
    </div>
  );
}

// ── Privacy Section ──

function PrivacySection({ weddingId }: { weddingId: string | null }) {
  const { privacy, loading, save, error } = usePrivacySettings(weddingId);
  const [savedMsg, setSavedMsg] = useState(false);

  if (loading) return <SectionSkeleton />;

  const update = async (key: string, value: boolean) => {
    try {
      await save({ [key]: value });
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 2000);
    } catch { /* silent */ }
  };

  return (
    <div className="space-y-5">
      {error && <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>}

      <SettingsCard title="Visibility" description="Control how your wedding website appears to search engines and the public">
        <div className="divide-y divide-secondary-100">
          <Toggle
            enabled={privacy.guestPortalPublic}
            onChange={(v) => update('guestPortalPublic', v)}
            label="Guest portal access"
            description="Allow invited guests to access the guest portal. When disabled, only you can see it."
          />
          <Toggle
            enabled={privacy.searchEngineIndexing}
            onChange={(v) => update('searchEngineIndexing', v)}
            label="Search engine indexing"
            description="Allow Google and other search engines to index your wedding website. Turn this off to keep it private."
          />
        </div>
      </SettingsCard>

      <SettingsCard title="Data collection" description="What guest data your portal collects and how it&rsquo;s used">
        <p className="text-xs text-foreground-600 leading-relaxed mb-4">
          Your guest portal collects only the data necessary: RSVP responses, dietary requirements, travel preferences, and photo uploads. All data is stored securely in your wedding workspace and is never shared with third parties.
        </p>
        <div className="flex items-center gap-2 text-xs text-foreground-500">
          <i className="ri-shield-check-line text-base text-emerald-600" />
          <span>GDPR / UK PECR compliant. Read our <a href={`${__BASE_PATH__}privacy`} className="text-primary-600 hover:underline">privacy policy</a>.</span>
        </div>
      </SettingsCard>

      {savedMsg && <p className="text-sm text-emerald-600 font-label">Privacy settings saved</p>}
    </div>
  );
}

// ── Billing Section ──

function BillingSection({ weddingId }: { weddingId: string | null }) {
  const { billing, loading, error } = useBilling(weddingId);

  if (loading) return <SectionSkeleton />;

  const currentPlan = billing.plan;
  const features = PLAN_FEATURES[currentPlan] || [];

  return (
    <div className="space-y-5">
      {error && <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>}

      {/* Current plan */}
      <SettingsCard title="Current plan">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg text-xs font-label font-semibold bg-primary-100 text-primary-700">{PLAN_LABELS[currentPlan]}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-label font-semibold ${billing.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                {billing.status === 'active' ? 'Active' : billing.status.replace('_', ' ')}
              </span>
            </div>
            {billing.currentPeriodEnd && (
              <p className="text-xs text-foreground-500 mt-1.5">
                {billing.cancelAtPeriodEnd ? 'Ends' : 'Renews'} on {new Date(billing.currentPeriodEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            )}
          </div>
          <span className="text-xl font-heading font-semibold text-foreground-900">{PLAN_PRICES[currentPlan]}</span>
        </div>
        <div className="space-y-1.5">
          {features.map((f: string, i: number) => (
            <div key={i} className="flex items-center gap-2 text-xs text-foreground-600">
              <i className="ri-check-line text-emerald-500 text-sm" />
              <span>{f}</span>
            </div>
          ))}
        </div>
      </SettingsCard>

      {/* Upgrade */}
      <SettingsCard title="Upgrade plan">
        <p className="text-xs text-foreground-600 leading-relaxed mb-4">
          Need more guests, collaborators, or advanced features? Upgrade your plan to unlock the full Wedora experience.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(Object.entries(PLAN_PRICES) as [typeof currentPlan, string][]).filter(([p]) => p !== 'free').map(([plan, price]) => {
            const isCurrent = plan === currentPlan;
            const planFeatures = PLAN_FEATURES[plan] || [];
            return (
              <div key={plan} className={`rounded-xl border-2 p-4 ${isCurrent ? 'border-primary-500 bg-primary-50' : 'border-secondary-200'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-label font-semibold text-foreground-900">{PLAN_LABELS[plan]}</span>
                  <span className="text-sm font-heading font-semibold text-foreground-900">{price}</span>
                </div>
                <ul className="space-y-1 mb-4">
                  {planFeatures.slice(0, 4).map((f: string, i: number) => (
                    <li key={i} className="text-[11px] text-foreground-600 flex items-center gap-1.5">
                      <i className="ri-check-line text-[10px] text-emerald-500" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  disabled={isCurrent}
                  className={`w-full py-2 rounded-lg text-xs font-label font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    isCurrent ? 'bg-secondary-100 text-foreground-400 cursor-default' : 'bg-primary-500 text-white hover:bg-primary-600'
                  }`}
                >
                  {isCurrent ? 'Current plan' : 'Upgrade'}
                </button>
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-foreground-400 mt-3">
          Stripe integration handles all billing securely. <readdy-link integration="stripe">Connect Stripe</readdy-link> to enable paid plans.
        </p>
      </SettingsCard>

      {/* Cancel */}
      <SettingsCard title="Cancel plan">
        <p className="text-xs text-foreground-600 leading-relaxed mb-4">
          You can cancel your paid plan at any time. You&rsquo;ll keep access until the end of your current billing period.
        </p>
        <button className="btn-outline text-red-600 border-red-200 hover:bg-red-50 cursor-pointer whitespace-nowrap" disabled>
          <i className="ri-close-circle-line mr-1.5" />
          Cancel subscription
        </button>
        <p className="text-[11px] text-foreground-400 mt-2">Connect Stripe to manage billing.</p>
      </SettingsCard>
    </div>
  );
}

// ── Data Section ──

function DataSection({ weddingId }: { weddingId: string | null }) {
  const { exports, deletion, loading, error, requestExport, requestDeletion, confirmDeletion, cancelDeletion } = useDataManagement(weddingId);
  const [showDeletionModal, setShowDeletionModal] = useState(false);
  const [deletionReason, setDeletionReason] = useState('');
  const [deletionCode, setDeletionCode] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deletionError, setDeletionError] = useState<string | null>(null);
  const [exportMsg, setExportMsg] = useState<string | null>(null);

  if (loading) return <SectionSkeleton />;

  const handleExport = async () => {
    try {
      await requestExport();
      setExportMsg('Export requested. You\'ll be notified when it\'s ready.');
      setTimeout(() => setExportMsg(null), 4000);
    } catch (err: unknown) {
      setExportMsg(err instanceof Error ? err.message : 'Export failed');
    }
  };

  const handleDeletionRequest = async () => {
    if (!deletionReason.trim() || !deletionCode.trim()) return;
    setDeleting(true);
    setDeletionError(null);
    try {
      await requestDeletion(deletionReason, deletionCode);
      setShowDeletionModal(false);
      setDeletionReason('');
      setDeletionCode('');
    } catch (err: unknown) {
      setDeletionError(err instanceof Error ? err.message : 'Failed to submit deletion request');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      {error && <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>}

      {/* Export */}
      <SettingsCard title="Export your data" description="Download all your wedding data including guests, RSVPs, budget, and settings">
        <button onClick={handleExport} className="btn-outline cursor-pointer whitespace-nowrap">
          <i className="ri-download-line mr-1.5" />
          Request data export
        </button>
        {exportMsg && <p className={`text-xs mt-2 ${exportMsg.includes('failed') ? 'text-red-600' : 'text-foreground-600'}`}>{exportMsg}</p>}

        {exports.length > 0 && (
          <div className="mt-4 pt-4 border-t border-secondary-100">
            <p className="text-xs font-label font-semibold text-foreground-700 mb-2">Recent exports</p>
            <div className="space-y-2">
              {exports.map((exp) => (
                <div key={exp.id} className="flex items-center justify-between text-xs">
                  <span className="text-foreground-600">
                    {new Date(exp.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-label font-semibold ${
                    exp.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                    exp.status === 'failed' ? 'bg-red-50 text-red-600' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {exp.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </SettingsCard>

      {/* Deletion */}
      <SettingsCard title="Delete wedding" description="Permanently delete all wedding data. This action cannot be undone.">
        {deletion ? (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 flex items-center justify-center text-amber-600 shrink-0 mt-0.5">
                <i className="ri-alert-line text-base" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-label font-semibold text-amber-900">Deletion requested</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Your wedding will be permanently deleted on {new Date(deletion.scheduledDeletionAt).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}.
                  You can cancel this request before that date.
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <button onClick={confirmDeletion} className="text-xs px-3 py-1.5 rounded-lg bg-red-500 text-white font-label font-semibold hover:bg-red-600 transition-colors cursor-pointer whitespace-nowrap">
                    Delete immediately
                  </button>
                  <button onClick={cancelDeletion} className="text-xs px-3 py-1.5 rounded-lg bg-white border border-secondary-200 text-foreground-700 font-label font-semibold hover:bg-secondary-50 transition-colors cursor-pointer whitespace-nowrap">
                    Cancel deletion
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-xs text-foreground-600 leading-relaxed mb-3">
              Deleting your wedding will remove all guest data, RSVPs, budget records, gallery photos, and settings. We recommend exporting your data first.
            </p>
            <button
              onClick={() => setShowDeletionModal(true)}
              className="text-xs px-4 py-2 rounded-lg border border-red-300 text-red-600 font-label font-semibold hover:bg-red-50 transition-colors cursor-pointer whitespace-nowrap"
            >
              <i className="ri-delete-bin-line mr-1.5" />
              Request deletion
            </button>
          </div>
        )}
      </SettingsCard>

      {/* Deletion confirmation modal */}
      {showDeletionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <i className="ri-error-warning-line text-lg text-red-600" />
              </div>
              <div>
                <h3 className="font-label text-sm font-semibold text-foreground-900">Delete wedding?</h3>
                <p className="text-xs text-foreground-500">This action is irreversible</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Reason (optional)</label>
                <textarea
                  value={deletionReason}
                  onChange={(e) => setDeletionReason(e.target.value)}
                  className="input-field min-h-[60px]"
                  placeholder="I no longer need this wedding..."
                  maxLength={500}
                />
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Type <strong className="text-red-600">DELETE</strong> to confirm</label>
                <input
                  type="text"
                  value={deletionCode}
                  onChange={(e) => setDeletionCode(e.target.value)}
                  className="input-field"
                  placeholder="DELETE"
                />
              </div>
              {deletionError && <p className="text-xs text-red-600">{deletionError}</p>}
            </div>

            <div className="flex items-center gap-3 mt-5">
              <button
                onClick={() => { setShowDeletionModal(false); setDeletionError(null); }}
                className="flex-1 py-2 rounded-lg border border-secondary-200 text-foreground-700 font-label text-sm font-semibold hover:bg-secondary-50 transition-colors cursor-pointer whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                onClick={handleDeletionRequest}
                disabled={deletionCode !== 'DELETE' || deleting}
                className="flex-1 py-2 rounded-lg bg-red-500 text-white font-label text-sm font-semibold hover:bg-red-600 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
              >
                {deleting ? 'Submitting...' : 'Confirm deletion'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════ MAIN PAGE ═══════════════

function NormalSettingsPage() {
  const { weddingId, permissions, role } = useActiveWedding();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  const visibleNav = SETTINGS_NAV.filter((item) => {
    if (item.requiresOwner && !permissions.canManageMembers) return false;
    return true;
  });

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto">
        <h1 className="font-heading text-2xl md:text-3xl text-foreground-900 mb-1">Settings</h1>
        <p className="text-sm text-foreground-500 mb-8">Manage your profile, wedding preferences, and workspace</p>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar navigation */}
          <nav className="lg:w-56 shrink-0">
            <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
              {visibleNav.map((item) => (
                <button
                  key={item.key}
                  onClick={() => setActiveTab(item.key)}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-label transition-colors cursor-pointer whitespace-nowrap ${
                    activeTab === item.key
                      ? 'bg-primary-50 text-primary-700 font-semibold'
                      : 'text-foreground-600 hover:bg-secondary-50 hover:text-foreground-900'
                  }`}
                >
                  <i className={`${item.icon} text-base ${activeTab === item.key ? 'text-primary-600' : 'text-foreground-400'}`} />
                  {item.label}
                </button>
              ))}
            </div>
          </nav>

          {/* Content area */}
          <div className="flex-1 min-w-0">
            {activeTab === 'profile' && <ProfileSection userId={user?.id || null} />}
            {activeTab === 'wedding' && <WeddingSection weddingId={weddingId} />}
            {activeTab === 'collaborators' && <CollaboratorsSection weddingId={weddingId} />}
            {activeTab === 'guest-portal' && <GuestPortalSection weddingId={weddingId} />}
            {activeTab === 'notifications' && <NotificationsSection weddingId={weddingId} userId={user?.id || null} />}
            {activeTab === 'privacy' && <PrivacySection weddingId={weddingId} />}
            {activeTab === 'billing' && <BillingSection weddingId={weddingId} />}
            {activeTab === 'data' && <DataSection weddingId={weddingId} />}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

// ── Demo Settings ──

function DemoSettingsPage() {
  const demo = useDemoDataSafe();
  const wedding = demo?.state.wedding;
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="font-heading text-2xl md:text-3xl text-foreground-900">Settings</h1>
          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-label font-semibold whitespace-nowrap">Demo</span>
        </div>
        <p className="text-sm text-foreground-500 mb-8">Manage your profile and wedding preferences</p>

        {/* Wedding info banner */}
        {wedding && (
          <div className="bg-background-50 border border-secondary-200/70 rounded-xl p-4 mb-8 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
              <span className="text-primary-700 font-label text-sm font-semibold">
                {wedding.partner_one_name?.charAt(0)}{wedding.partner_two_name?.charAt(0)}
              </span>
            </div>
            <div>
              <p className="text-sm font-label font-semibold text-foreground-900">{wedding.partner_one_name} &amp; {wedding.partner_two_name}</p>
              <p className="text-xs text-foreground-500">
                {wedding.wedding_date ? new Date(wedding.wedding_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Date not set'} &middot; {wedding.location}
              </p>
            </div>
          </div>
        )}

        {/* Demo info banner */}
        <div className="mb-8 px-4 py-3.5 rounded-xl bg-accent-50 border border-accent-100 flex items-start gap-3">
          <div className="w-5 h-5 flex items-center justify-center text-accent-600 flex-shrink-0 mt-0.5">
            <i className="ri-lightbulb-line text-sm" />
          </div>
          <div>
            <p className="text-sm font-label font-medium text-accent-900">Demo mode</p>
            <p className="text-xs text-accent-700 mt-0.5 leading-relaxed">
              Settings are saved locally in demo mode. In production, all settings sync to your Supabase wedding workspace and persist across sessions. Collaborator invitations, notifications, and billing are fully functional in production.
            </p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          <nav className="lg:w-56 shrink-0">
            <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
              {SETTINGS_NAV.map((item) => (
                <button
                  key={item.key}
                  onClick={() => setActiveTab(item.key)}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-label transition-colors cursor-pointer whitespace-nowrap ${
                    activeTab === item.key
                      ? 'bg-primary-50 text-primary-700 font-semibold'
                      : 'text-foreground-600 hover:bg-secondary-50 hover:text-foreground-900'
                  }`}
                >
                  <i className={`${item.icon} text-base ${activeTab === item.key ? 'text-primary-600' : 'text-foreground-400'}`} />
                  {item.label}
                </button>
              ))}
            </div>
          </nav>
          <div className="flex-1 min-w-0">
            <DemoTabContent tab={activeTab} wedding={wedding} />
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function DemoTabContent({ tab, wedding }: { tab: SettingsTab; wedding: ReturnType<typeof useDemoDataSafe>['state']['wedding'] }) {
  useDemoDataSafe(); // keep hook call consistent

  switch (tab) {
    case 'profile':
      return (
        <div className="space-y-5">
          <SettingsCard title="Personal details">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                <span className="text-primary-700 font-heading text-xl font-semibold">EW</span>
              </div>
              <div>
                <p className="text-sm font-label font-semibold text-foreground-900">Emma Watson</p>
                <p className="text-xs text-foreground-500">emma@example.com</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">First name</label>
                <input type="text" defaultValue="Emma" disabled className="input-field opacity-60" />
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Last name</label>
                <input type="text" defaultValue="Watson" disabled className="input-field opacity-60" />
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Email</label>
                <input type="email" defaultValue="emma@example.com" disabled className="input-field opacity-60" />
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Timezone</label>
                <select defaultValue="Europe/London" disabled className="input-field opacity-60">
                  <option>Europe/London</option>
                </select>
              </div>
            </div>
            <p className="text-[11px] text-amber-700 mt-4 px-3 py-2 bg-amber-50 rounded-lg">
              Profile editing is available in production mode with Supabase connected.
            </p>
          </SettingsCard>
        </div>
      );
    case 'wedding':
      return (
        <SettingsCard title="Wedding details" description="These appear on your guest portal and invitations">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Title</label>
              <input type="text" defaultValue={wedding?.title || 'Emma & James'} disabled className="input-field opacity-60" />
            </div>
            <div>
              <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Partner one</label>
              <input type="text" defaultValue={wedding?.partner_one_name || 'Emma'} disabled className="input-field opacity-60" />
            </div>
            <div>
              <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Partner two</label>
              <input type="text" defaultValue={wedding?.partner_two_name || 'James'} disabled className="input-field opacity-60" />
            </div>
            <div>
              <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Date</label>
              <input type="date" defaultValue={wedding?.wedding_date || '2027-04-24'} disabled className="input-field opacity-60" />
            </div>
            <div>
              <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Location</label>
              <input type="text" defaultValue={wedding?.location || 'Bath, Somerset'} disabled className="input-field opacity-60" />
            </div>
          </div>
          <p className="text-[11px] text-amber-700 mt-4 px-3 py-2 bg-amber-50 rounded-lg">
            Wedding details are editable in production mode.
          </p>
        </SettingsCard>
      );
    case 'collaborators':
      return (
        <div className="space-y-5">
          <SettingsCard title="Team members">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-background-50 rounded-lg border border-secondary-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-xs font-label font-semibold text-amber-700">EW</div>
                  <div>
                    <p className="text-sm font-label font-semibold text-foreground-900">Emma Watson</p>
                    <p className="text-xs text-foreground-500">emma@example.com</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg text-[11px] font-label font-semibold bg-amber-100 text-amber-800">Owner</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-background-50 rounded-lg border border-secondary-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-accent-100 flex items-center justify-center text-xs font-label font-semibold text-accent-700">JS</div>
                  <div>
                    <p className="text-sm font-label font-semibold text-foreground-900">James Smith</p>
                    <p className="text-xs text-foreground-500">james@example.com</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg text-[11px] font-label font-semibold bg-accent-100 text-accent-800">Partner</span>
              </div>
            </div>
            <p className="text-[11px] text-amber-700 mt-4 px-3 py-2 bg-amber-50 rounded-lg">
              Collaborator management is available in production mode — invite your wedding planner, family, or friends.
            </p>
          </SettingsCard>
        </div>
      );
    case 'guest-portal':
      return (
        <div className="space-y-5">
          <SettingsCard title="Guest portal toggles" description="These settings are stored locally in demo mode">
            <p className="text-xs text-amber-700 px-3 py-2 bg-amber-50 rounded-lg">
              In production, guest portal settings sync to your wedding workspace and immediately affect what guests can see.
            </p>
          </SettingsCard>
        </div>
      );
    case 'notifications':
      return (
        <SettingsCard title="Notification preferences" description="Configure how you receive wedding alerts">
          <p className="text-xs text-amber-700 px-3 py-2 bg-amber-50 rounded-lg">
            In production, notification preferences are linked to your account and sync across devices.
          </p>
        </SettingsCard>
      );
    case 'privacy':
      return (
        <SettingsCard title="Privacy controls" description="Control search engine visibility and data collection">
          <p className="text-xs text-amber-700 px-3 py-2 bg-amber-50 rounded-lg">
            Full privacy controls including search engine indexing and guest data policies are available in production mode.
          </p>
        </SettingsCard>
      );
    case 'billing':
      return (
        <SettingsCard title="Billing &amp; subscription">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg text-xs font-label font-semibold bg-primary-100 text-primary-700">Free</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-label font-semibold bg-emerald-100 text-emerald-700">Active</span>
            </div>
            <span className="text-xl font-heading font-semibold text-foreground-900">£0</span>
          </div>
          <p className="text-xs text-amber-700 px-3 py-2 bg-amber-50 rounded-lg">
            Billing and Stripe integration are available in production mode. Connect Stripe to upgrade your plan.
          </p>
        </SettingsCard>
      );
    case 'data':
      return (
        <SettingsCard title="Data management" description="Export or delete your wedding data">
          <p className="text-xs text-amber-700 px-3 py-2 bg-amber-50 rounded-lg">
            Data export and deletion workflows are available in production mode.
          </p>
        </SettingsCard>
      );
    default:
      return null;
  }
}

// ── Export ──

export default function SettingsPage() {
  if (isDemoMode) return <DemoSettingsPage />;
  return <NormalSettingsPage />;
}