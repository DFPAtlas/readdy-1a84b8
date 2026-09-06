import { useState, useCallback } from 'react';
import AppShell from '@/components/feature/AppShell';
import { isDemoMode } from '@/demo/demoConfig';
import { useDemoDataSafe } from '@/demo/useDemoDataSafe';
import { useAuth } from '@/context/AuthProvider';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { useProfileSettings } from '@/hooks/useSettings';
import { COMMON_TIMEZONES } from '@/types/settings';
import { Link } from 'react-router-dom';

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

function NormalProfilePage() {
  const { user, profile: authProfile } = useAuth();
  const { role } = useActiveWedding();
  const { profile, loading, saving, save, error } = useProfileSettings(user?.id || null);
  const [localProfile, setLocalProfile] = useState<Record<string, string>>({});
  const [savedMsg, setSavedMsg] = useState(false);

  if (loading) {
    return (
      <AppShell>
        <div className="max-w-2xl mx-auto space-y-5 animate-pulse">
          <div className="h-8 w-48 rounded bg-secondary-200" />
          <div className="h-4 w-64 rounded bg-secondary-100" />
          <div className="bg-background-50 border border-secondary-100 rounded-xl p-6 space-y-4">
            <div className="h-16 w-16 rounded-full bg-secondary-200" />
            <div className="h-4 w-32 rounded bg-secondary-200" />
          </div>
        </div>
      </AppShell>
    );
  }

  if (!profile) {
    return (
      <AppShell>
        <div className="max-w-2xl mx-auto text-center py-20">
          <div className="w-16 h-16 mx-auto rounded-full bg-secondary-100 flex items-center justify-center mb-4">
            <i className="ri-user-line text-2xl text-foreground-400" />
          </div>
          <p className="text-foreground-600 font-label">Unable to load profile</p>
          <p className="text-xs text-foreground-400 mt-1">Please try refreshing the page</p>
        </div>
      </AppShell>
    );
  }

  const data = { ...profile, ...localProfile };

  const update = (key: string, value: string) => {
    setLocalProfile((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    try {
      await save(localProfile as Parameters<typeof save>[0]);
      setLocalProfile({});
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 2500);
    } catch {
      // error shown inline
    }
  };

  const hasChanges = Object.keys(localProfile).length > 0;

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto">
        <p className="text-xs text-foreground-400 font-label mb-1">Account</p>
        <h1 className="font-heading text-2xl md:text-3xl text-foreground-900 mb-1">My Profile</h1>
        <p className="text-sm text-foreground-500 mb-8">Manage your personal information and account preferences</p>

        {error && (
          <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 mb-5">{error}</div>
        )}

        <div className="space-y-5">
          {/* Avatar & basic info */}
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
                <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-label font-semibold ${role === 'owner' ? 'bg-amber-100 text-amber-700' : 'bg-secondary-100 text-secondary-700'}`}>
                  {role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Member'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">First name</label>
                <input
                  type="text"
                  value={data.firstName}
                  onChange={(e) => update('firstName', e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-colors"
                  placeholder="Emma"
                />
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Last name</label>
                <input
                  type="text"
                  value={data.lastName}
                  onChange={(e) => update('lastName', e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-colors"
                  placeholder="Watson"
                />
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Display name</label>
                <input
                  type="text"
                  value={data.displayName}
                  onChange={(e) => update('displayName', e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-colors"
                  placeholder="How your name appears"
                />
                <p className="text-[11px] text-foreground-400 mt-1">Shown to guests and collaborators</p>
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Phone</label>
                <input
                  type="tel"
                  value={data.phone}
                  onChange={(e) => update('phone', e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-colors"
                  placeholder="+44 7700 900123"
                />
              </div>
            </div>
          </SettingsCard>

          {/* Email & timezone */}
          <SettingsCard title="Account settings">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Email address</label>
                <input
                  type="email"
                  value={authProfile?.email || data.email}
                  disabled
                  className="w-full h-10 px-3 rounded-lg border border-secondary-200 bg-secondary-50 text-sm text-foreground-500 cursor-not-allowed"
                />
                <p className="text-[11px] text-foreground-400 mt-1">Managed by your authentication provider</p>
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Timezone</label>
                <select
                  value={data.timezone}
                  onChange={(e) => update('timezone', e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-colors cursor-pointer"
                >
                  {COMMON_TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>{tz.replace('_', ' ').replace('/', ' / ')}</option>
                  ))}
                </select>
              </div>
            </div>
          </SettingsCard>

          {/* Account preferences */}
          <SettingsCard title="Preferences" description="Customise your Vowora experience">
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm text-foreground-800 font-label">Notification preferences</p>
                  <p className="text-xs text-foreground-500">Configure which alerts you receive</p>
                </div>
                <Link
                  to="/app/settings"
                  className="flex items-center gap-1.5 text-sm text-primary-600 font-label hover:text-primary-700 cursor-pointer whitespace-nowrap"
                >
                  Manage
                  <i className="ri-arrow-right-line text-xs" />
                </Link>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm text-foreground-800 font-label">Onboarding setup</p>
                  <p className="text-xs text-foreground-500">Review or resume your wedding setup</p>
                </div>
                <Link
                  to="/app/getting-started"
                  className="flex items-center gap-1.5 text-sm text-primary-600 font-label hover:text-primary-700 cursor-pointer whitespace-nowrap"
                >
                  View
                  <i className="ri-arrow-right-line text-xs" />
                </Link>
              </div>
            </div>
          </SettingsCard>

          {/* Save */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className="px-5 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-label font-semibold hover:bg-primary-600 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
            >
              {saving ? 'Saving...' : 'Save changes'}
            </button>
            {savedMsg && (
              <span className="text-sm text-emerald-600 font-label flex items-center gap-1.5">
                <i className="ri-check-line" />
                Profile saved
              </span>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function DemoProfilePage() {
  const demo = useDemoDataSafe();
  const wedding = demo?.state.wedding;
  const [prefs, setPrefs] = useState({
    timezone: 'Europe/London',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '12h',
  });

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-1">
          <p className="text-xs text-foreground-400 font-label">Account</p>
          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-label font-semibold whitespace-nowrap">Demo</span>
        </div>
        <h1 className="font-heading text-2xl md:text-3xl text-foreground-900 mb-1">My Profile</h1>
        <p className="text-sm text-foreground-500 mb-8">Manage your personal information and account preferences</p>

        <div className="mb-6 px-4 py-3.5 rounded-xl bg-accent-50 border border-accent-100 flex items-start gap-3">
          <div className="w-5 h-5 flex items-center justify-center text-accent-600 flex-shrink-0 mt-0.5">
            <i className="ri-information-line text-sm" />
          </div>
          <p className="text-xs text-accent-700 leading-relaxed">
            This is a demo profile. In production, your profile syncs with your Supabase account and persists across sessions.
          </p>
        </div>

        <div className="space-y-5">
          <SettingsCard title="Personal details">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                <span className="text-primary-700 font-heading text-xl font-semibold">
                  {(wedding?.partner_one_name?.charAt(0) || 'E') + (wedding?.partner_two_name?.charAt(0) || 'J')}
                </span>
              </div>
              <div>
                <p className="text-sm font-label font-semibold text-foreground-900">
                  {wedding?.partner_one_name || 'Emma'} {wedding?.partner_two_name || 'Watson'}
                </p>
                <p className="text-xs text-foreground-500">demo@vowora.uk</p>
                <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-label font-semibold bg-amber-100 text-amber-700">Owner</span>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">First name</label>
                <input type="text" defaultValue={wedding?.partner_one_name || 'Emma'} className="w-full h-10 px-3 rounded-lg border border-secondary-200 bg-secondary-50 text-sm text-foreground-500 cursor-not-allowed" disabled />
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Last name</label>
                <input type="text" defaultValue={wedding?.partner_two_name || 'Watson'} className="w-full h-10 px-3 rounded-lg border border-secondary-200 bg-secondary-50 text-sm text-foreground-500 cursor-not-allowed" disabled />
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Email</label>
                <input type="email" defaultValue="demo@vowora.uk" className="w-full h-10 px-3 rounded-lg border border-secondary-200 bg-secondary-50 text-sm text-foreground-500 cursor-not-allowed" disabled />
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Timezone</label>
                <select value={prefs.timezone} onChange={(e) => setPrefs((p) => ({ ...p, timezone: e.target.value }))} className="w-full h-10 px-3 rounded-lg border border-secondary-200 bg-secondary-50 text-sm text-foreground-500 cursor-not-allowed" disabled>
                  {COMMON_TIMEZONES.map((tz) => (<option key={tz} value={tz}>{tz.replace('_', ' ').replace('/', ' / ')}</option>))}
                </select>
              </div>
            </div>
          </SettingsCard>

          <SettingsCard title="Preferences">
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm text-foreground-800 font-label">Notification preferences</p>
                  <p className="text-xs text-foreground-500">Configure which alerts you receive</p>
                </div>
                <Link to="/app/settings" className="flex items-center gap-1.5 text-sm text-primary-600 font-label hover:text-primary-700 cursor-pointer whitespace-nowrap">
                  Manage <i className="ri-arrow-right-line text-xs" />
                </Link>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm text-foreground-800 font-label">Onboarding setup</p>
                  <p className="text-xs text-foreground-500">Review or resume your wedding setup</p>
                </div>
                <Link to="/app/getting-started" className="flex items-center gap-1.5 text-sm text-primary-600 font-label hover:text-primary-700 cursor-pointer whitespace-nowrap">
                  View <i className="ri-arrow-right-line text-xs" />
                </Link>
              </div>
            </div>
          </SettingsCard>

          <p className="text-[11px] text-amber-700 px-4 py-3 bg-amber-50 rounded-lg">
            Profile editing is available in production mode with Supabase connected. Start a real account to customise your profile.
          </p>
        </div>
      </div>
    </AppShell>
  );
}

export default function ProfilePage() {
  if (isDemoMode) return <DemoProfilePage />;
  return <NormalProfilePage />;
}