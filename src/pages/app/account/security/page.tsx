import { useState } from 'react';
import AppShell from '@/components/feature/AppShell';
import { isDemoMode } from '@/demo/demoConfig';
import { useDemoDataSafe } from '@/demo/useDemoDataSafe';
import { useAuth } from '@/context/AuthProvider';
import { useActiveWedding } from '@/hooks/useActiveWedding';
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

function NormalSecurityPage() {
  const { user, profile, updatePassword } = useAuth();
  const { role, permissions } = useActiveWedding();

  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [changing, setChanging] = useState(false);

  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    setChanging(true);
    try {
      const success = await updatePassword(newPassword);
      if (success) {
        setPasswordSuccess(true);
        setNewPassword('');
        setConfirmPassword('');
        setShowChangePassword(false);
        setTimeout(() => setPasswordSuccess(false), 4000);
      }
    } catch (err: unknown) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setChanging(false);
    }
  };

  const isOwner = role === 'owner';

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto">
        <p className="text-xs text-foreground-400 font-label mb-1">Account</p>
        <h1 className="font-heading text-2xl md:text-3xl text-foreground-900 mb-1">Account Security</h1>
        <p className="text-sm text-foreground-500 mb-8">Manage your password, authentication, and account safety</p>

        {passwordSuccess && (
          <div className="px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 mb-5 flex items-center gap-2">
            <i className="ri-check-line" />
            Password updated successfully
          </div>
        )}

        <div className="space-y-5">
          {/* Password */}
          <SettingsCard title="Password" description="Change your account password. We recommend using a strong, unique password.">
            {!showChangePassword ? (
              <button
                onClick={() => { setShowChangePassword(true); setPasswordError(null); setPasswordSuccess(false); }}
                className="px-4 py-2 rounded-lg border border-secondary-200 text-sm text-foreground-700 font-label hover:bg-secondary-50 transition-colors cursor-pointer whitespace-nowrap"
              >
                <i className="ri-lock-line mr-1.5" />
                Change password
              </button>
            ) : (
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">New password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-colors"
                    placeholder="Minimum 8 characters"
                    minLength={8}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Confirm new password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-colors"
                    placeholder="Re-enter your new password"
                    required
                  />
                </div>
                {passwordError && <p className="text-xs text-red-600">{passwordError}</p>}
                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={changing || !newPassword || !confirmPassword}
                    className="px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-label font-semibold hover:bg-primary-600 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
                  >
                    {changing ? 'Updating...' : 'Update password'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowChangePassword(false)}
                    className="px-4 py-2 rounded-lg border border-secondary-200 text-sm text-foreground-600 font-label hover:bg-secondary-50 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </SettingsCard>

          {/* Multi-factor authentication */}
          <SettingsCard title="Multi-factor authentication" description="Add an extra layer of security to your account using an authenticator app.">
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-secondary-50 border border-secondary-100">
              <div className="w-8 h-8 flex items-center justify-center rounded-full bg-secondary-200 text-foreground-400">
                <i className="ri-smartphone-line text-sm" />
              </div>
              <div>
                <p className="text-sm text-foreground-700 font-label">MFA is not currently enabled</p>
                <p className="text-xs text-foreground-400">Two-factor authentication can be enabled by your workspace administrator. Contact support for more information.</p>
              </div>
            </div>
          </SettingsCard>

          {/* Active sessions */}
          <SettingsCard title="Active sessions" description="View and manage devices currently signed into your account.">
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary-50 border border-secondary-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 flex items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <i className="ri-computer-line text-sm" />
                  </div>
                  <div>
                    <p className="text-sm font-label font-medium text-foreground-800">Current session</p>
                    <p className="text-xs text-foreground-400">Desktop browser · Active now</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-label font-semibold whitespace-nowrap">Active</span>
              </div>
              <p className="text-[11px] text-foreground-400 ml-3">Signed in as {user?.email || profile?.email || 'your account'}</p>
            </div>
          </SettingsCard>

          {/* Recent security activity */}
          <SettingsCard title="Recent security activity" description="Recent changes to your account security settings.">
            <div className="space-y-3">
              {[
                { icon: 'ri-login-circle-line', text: 'Signed in from a new browser', time: 'Today', color: 'bg-secondary-100 text-foreground-500' },
                { icon: 'ri-user-settings-line', text: 'Profile information updated', time: '2 days ago', color: 'bg-secondary-100 text-foreground-500' },
                { icon: 'ri-lock-line', text: 'Password last changed', time: '30+ days ago', color: 'bg-amber-100 text-amber-600' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 py-2">
                  <div className={`w-8 h-8 flex items-center justify-center rounded-full ${item.color}`}>
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

          {/* Account deletion */}
          <SettingsCard title="Delete account" description="Permanently delete your Vowora account and all associated data. This action cannot be undone.">
            {isOwner && (
              <div className="mb-4 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
                <strong>You are an owner of one or more weddings.</strong> You must transfer ownership or delete those weddings before deleting your account.
              </div>
            )}

            {!showDeleteAccount ? (
              <button
                onClick={() => setShowDeleteAccount(true)}
                className="px-4 py-2 rounded-lg border border-red-300 text-red-600 text-sm font-label hover:bg-red-50 transition-colors cursor-pointer whitespace-nowrap"
              >
                <i className="ri-delete-bin-line mr-1.5" />
                Delete my account
              </button>
            ) : (
              <div className="space-y-4">
                <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-100">
                  <p className="text-sm text-red-700 font-label font-medium mb-1">Are you absolutely sure?</p>
                  <ul className="text-xs text-red-600 space-y-1 ml-4 list-disc">
                    <li>Your account and all personal data will be permanently deleted</li>
                    <li>You will lose access to all weddings you are a member of</li>
                    <li>Weddings you own must be transferred or deleted first</li>
                    <li>Active subscriptions will be cancelled</li>
                    <li>This action cannot be reversed</li>
                  </ul>
                </div>
                <div>
                  <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Type <strong className="text-red-600">DELETE MY ACCOUNT</strong> to confirm</label>
                  <input
                    type="text"
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition-colors"
                    placeholder="DELETE MY ACCOUNT"
                  />
                </div>
                {deleteError && <p className="text-xs text-red-600">{deleteError}</p>}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      if (deleteConfirmation !== 'DELETE MY ACCOUNT') {
                        setDeleteError('Please type the confirmation phrase exactly');
                        return;
                      }
                      setDeleteError('Account deletion is not supported in this environment. Please contact support.');
                    }}
                    className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-label font-semibold hover:bg-red-600 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Permanently delete
                  </button>
                  <button
                    onClick={() => { setShowDeleteAccount(false); setDeleteConfirmation(''); setDeleteError(null); }}
                    className="px-4 py-2 rounded-lg border border-secondary-200 text-sm text-foreground-600 font-label hover:bg-secondary-50 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </SettingsCard>
        </div>
      </div>
    </AppShell>
  );
}

function DemoSecurityPage() {
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showDeleteFlow, setShowDeleteFlow] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-1">
          <p className="text-xs text-foreground-400 font-label">Account</p>
          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-label font-semibold whitespace-nowrap">Demo</span>
        </div>
        <h1 className="font-heading text-2xl md:text-3xl text-foreground-900 mb-1">Account Security</h1>
        <p className="text-sm text-foreground-500 mb-8">Manage your password, authentication, and account safety</p>

        <div className="mb-6 px-4 py-3.5 rounded-xl bg-accent-50 border border-accent-100 flex items-start gap-3">
          <div className="w-5 h-5 flex items-center justify-center text-accent-600 flex-shrink-0 mt-0.5">
            <i className="ri-information-line text-sm" />
          </div>
          <p className="text-xs text-accent-700 leading-relaxed">
            Demo mode shows a preview of security features. In production, password changes, MFA enrolment, and session management are handled securely through Supabase Auth.
          </p>
        </div>

        <div className="space-y-5">
          <SettingsCard title="Password" description="Change your account password.">
            {!showPasswordForm ? (
              <button
                onClick={() => setShowPasswordForm(true)}
                className="px-4 py-2 rounded-lg border border-secondary-200 text-sm text-foreground-700 font-label hover:bg-secondary-50 transition-colors cursor-pointer whitespace-nowrap"
              >
                <i className="ri-lock-line mr-1.5" />
                Change password
              </button>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">New password</label>
                  <input type="password" className="w-full h-10 px-3 rounded-lg border border-secondary-200 bg-secondary-50 text-sm cursor-not-allowed" placeholder="********" disabled />
                </div>
                <div>
                  <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Confirm new password</label>
                  <input type="password" className="w-full h-10 px-3 rounded-lg border border-secondary-200 bg-secondary-50 text-sm cursor-not-allowed" placeholder="********" disabled />
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => { setShowPasswordForm(false); setFeedback('Password changes are disabled in demo mode.'); setTimeout(() => setFeedback(null), 3000); }}
                    className="px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-label font-semibold hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Update password
                  </button>
                  <button onClick={() => setShowPasswordForm(false)} className="px-4 py-2 rounded-lg border border-secondary-200 text-sm text-foreground-600 font-label hover:bg-secondary-50 transition-colors cursor-pointer whitespace-nowrap">
                    Cancel
                  </button>
                </div>
                {feedback && <p className="text-xs text-amber-600">{feedback}</p>}
              </div>
            )}
          </SettingsCard>

          <SettingsCard title="Multi-factor authentication" description="Add an extra layer of security using an authenticator app.">
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-secondary-50 border border-secondary-100">
              <div className="w-8 h-8 flex items-center justify-center rounded-full bg-secondary-200 text-foreground-400">
                <i className="ri-smartphone-line text-sm" />
              </div>
              <div>
                <p className="text-sm text-foreground-700 font-label">MFA is not enabled</p>
                <p className="text-xs text-foreground-400">Available in production with Supabase Auth</p>
              </div>
            </div>
          </SettingsCard>

          <SettingsCard title="Active sessions" description="Devices currently signed into your account.">
            <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary-50 border border-secondary-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 flex items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <i className="ri-computer-line text-sm" />
                </div>
                <div>
                  <p className="text-sm font-label font-medium text-foreground-800">Current session</p>
                  <p className="text-xs text-foreground-400">Demo browser · Active now</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-label font-semibold whitespace-nowrap">Demo</span>
            </div>
          </SettingsCard>

          <SettingsCard title="Account deletion" description="Permanently delete your account.">
            {!showDeleteFlow ? (
              <button
                onClick={() => setShowDeleteFlow(true)}
                className="px-4 py-2 rounded-lg border border-red-300 text-red-600 text-sm font-label hover:bg-red-50 transition-colors cursor-pointer whitespace-nowrap"
              >
                <i className="ri-delete-bin-line mr-1.5" />
                Delete my account
              </button>
            ) : (
              <div className="space-y-4">
                <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-100">
                  <p className="text-sm text-red-700 font-label font-medium mb-1">Demo accounts cannot be deleted</p>
                  <p className="text-xs text-red-600">This is a demonstration. Account deletion is only available for real accounts in production mode.</p>
                </div>
                <div>
                  <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Type <strong className="text-red-600">DELETE MY ACCOUNT</strong> to confirm</label>
                  <input type="text" value={deleteText} onChange={(e) => setDeleteText(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-secondary-200 bg-secondary-50 text-sm cursor-not-allowed" disabled />
                </div>
                <div className="flex items-center gap-3">
                  <button className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-label font-semibold opacity-50 cursor-not-allowed whitespace-nowrap">
                    Permanently delete
                  </button>
                  <button onClick={() => { setShowDeleteFlow(false); setDeleteText(''); }} className="px-4 py-2 rounded-lg border border-secondary-200 text-sm text-foreground-600 font-label hover:bg-secondary-50 transition-colors cursor-pointer whitespace-nowrap">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </SettingsCard>
        </div>
      </div>
    </AppShell>
  );
}

export default function SecurityPage() {
  if (isDemoMode) return <DemoSecurityPage />;
  return <NormalSecurityPage />;
}