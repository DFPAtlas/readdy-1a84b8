import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AppShell from '@/components/feature/AppShell';
import { useAuth } from '@/context/AuthProvider';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { isDemoMode } from '@/demo/demoConfig';
import { supabase } from '@/lib/supabase';

type DeletionStep = 'confirm' | 'review' | 'confirmation_phrase' | 'completed';

export default function AccountPrivacyPage() {
  const isDemo = isDemoMode;

  if (isDemo) return <DemoPrivacyPage />;
  return <NormalPrivacyPage />;
}

// ── Demo version ──

function DemoPrivacyPage() {
  return (
    <AppShell>
      <div className="max-w-2xl mx-auto">
        <p className="text-xs text-foreground-400 font-label mb-1">Account</p>
        <h1 className="font-heading text-2xl md:text-3xl text-foreground-900 mb-1">Privacy &amp; Data</h1>
        <p className="text-sm text-foreground-500 mb-8">Manage your data, exports, and deletion requests.</p>

        <div className="mb-6 px-4 py-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
          <div className="w-5 h-5 flex items-center justify-center text-amber-600 flex-shrink-0 mt-0.5"><i className="ri-information-line text-sm" /></div>
          <p className="text-xs text-amber-700">Privacy controls are available in production mode. This demo shows the interface but does not process real data.</p>
        </div>

        <div className="space-y-5">
          <PrivacyCard title="Download my data" description="Export your profile, wedding data, and account information." icon="ri-download-cloud-2-line">
            <div className="space-y-3">
              <button disabled className="w-full px-4 py-2.5 rounded-lg bg-secondary-100 text-foreground-400 text-sm font-label cursor-not-allowed whitespace-nowrap">
                <i className="ri-file-zip-line mr-2" />Download account data
              </button>
              <button disabled className="w-full px-4 py-2.5 rounded-lg bg-secondary-100 text-foreground-400 text-sm font-label cursor-not-allowed whitespace-nowrap">
                <i className="ri-folder-zip-line mr-2" />Download wedding data
              </button>
              <p className="text-[10px] text-foreground-400">Exports generated via secure backend. Signed URLs expire after 72 hours.</p>
            </div>
          </PrivacyCard>

          <PrivacyCard title="Delete my data" description="Request account or wedding deletion with cooling-off protection." icon="ri-delete-bin-line">
            <div className="space-y-3">
              <button disabled className="w-full px-4 py-2.5 rounded-lg bg-red-50 text-red-400 text-sm font-label cursor-not-allowed whitespace-nowrap">
                <i className="ri-alert-line mr-2" />Request account deletion
              </button>
              <button disabled className="w-full px-4 py-2.5 rounded-lg bg-red-50 text-red-400 text-sm font-label cursor-not-allowed whitespace-nowrap">
                <i className="ri-delete-bin-6-line mr-2" />Request wedding deletion
              </button>
              <p className="text-[10px] text-foreground-400">30-day cooling off period. Cancel anytime before scheduled deletion.</p>
            </div>
          </PrivacyCard>

          <PrivacyCard title="Privacy information" description="Understand how your data is handled and retained." icon="ri-shield-check-line">
            <div className="space-y-2">
              <Link to="/privacy" className="flex items-center justify-between py-2 text-sm text-foreground-700 hover:text-primary-600 cursor-pointer">
                Privacy Policy <i className="ri-arrow-right-line text-xs" />
              </Link>
              <Link to="/retention" className="flex items-center justify-between py-2 text-sm text-foreground-700 hover:text-primary-600 cursor-pointer">
                Data Retention Schedule <i className="ri-arrow-right-line text-xs" />
              </Link>
              <Link to="/terms" className="flex items-center justify-between py-2 text-sm text-foreground-700 hover:text-primary-600 cursor-pointer">
                Terms of Service <i className="ri-arrow-right-line text-xs" />
              </Link>
            </div>
          </PrivacyCard>
        </div>
      </div>
    </AppShell>
  );
}

// ── Normal (production) version ──

function PrivacyCard({ title, description, icon, children }: { title: string; description: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-background-50 border border-secondary-200/70 rounded-xl p-5 md:p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-primary-50 text-primary-500"><i className={`${icon} text-lg`} /></div>
        <div>
          <h3 className="font-label text-sm font-semibold text-foreground-900">{title}</h3>
          <p className="text-xs text-foreground-500">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function NormalPrivacyPage() {
  const { user, profile } = useAuth();
  const { weddingId, membership } = useActiveWedding();
  const navigate = useNavigate();

  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState('');
  const [deletionStep, setDeletionStep] = useState<DeletionStep>('confirm');
  const [deletionMsg, setDeletionMsg] = useState('');
  const [confirmationPhrase, setConfirmationPhrase] = useState('');
  const [processing, setProcessing] = useState(false);

  const isOwner = membership?.role === 'owner';

  const handleAccountExport = async () => {
    setExporting(true);
    setExportMsg('');
    try {
      const { error } = await supabase.from('privacy_requests').insert({
        request_type: 'account_export',
        user_id: user?.id,
        status: 'submitted',
      });
      if (error) throw error;
      setExportMsg('Account export request submitted. You will be notified when your export is ready.');
    } catch (err: unknown) {
      setExportMsg(err instanceof Error ? err.message : 'Failed to submit export request. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleWeddingExport = async () => {
    if (!weddingId) { setExportMsg('No active wedding selected.'); return; }
    setExporting(true);
    setExportMsg('');
    try {
      const { error } = await supabase.from('privacy_requests').insert({
        request_type: 'wedding_export',
        user_id: user?.id,
        wedding_id: weddingId,
        status: 'submitted',
      });
      if (error) throw error;
      setExportMsg('Wedding export request submitted. You will be notified when your export is ready.');
    } catch (err: unknown) {
      setExportMsg(err instanceof Error ? err.message : 'Failed to submit export request. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleAccountDeletion = async () => {
    if (deletionStep === 'confirm') {
      setDeletionStep('review');
      return;
    }
    if (deletionStep === 'review') {
      setDeletionStep('confirmation_phrase');
      return;
    }
    // Submit deletion request
    setProcessing(true);
    setDeletionMsg('');
    try {
      const { error } = await supabase.from('privacy_requests').insert({
        request_type: 'account_deletion',
        user_id: user?.id,
        status: 'submitted',
        cooling_off_until: new Date(Date.now() + 30 * 86400000).toISOString(),
        safe_notes: `Confirmation phrase provided. ${weddingId ? 'User has active wedding — ownership transfer or wedding deletion required first.' : 'No active wedding.'}`,
      });
      if (error) throw error;
      setDeletionStep('completed');
      setDeletionMsg('Your account deletion request has been submitted. A 30-day cooling-off period is now active. You can cancel this request at any time during this period.');
    } catch (err: unknown) {
      setDeletionMsg(err instanceof Error ? err.message : 'Failed to submit deletion request.');
    } finally {
      setProcessing(false);
    }
  };

  const handleCancelDeletion = () => {
    setDeletionStep('confirm');
    setDeletionMsg('Deletion request cancelled.');
  };

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto">
        <p className="text-xs text-foreground-400 font-label mb-1">Account</p>
        <h1 className="font-heading text-2xl md:text-3xl text-foreground-900 mb-1">Privacy &amp; Data</h1>
        <p className="text-sm text-foreground-500 mb-8">Manage your data, download exports, and request deletion.</p>

        <div className="space-y-5">
          {/* Data Export */}
          <PrivacyCard title="Download my data" description="Get a copy of your account and wedding data." icon="ri-download-cloud-2-line">
            <div className="space-y-3">
              <button onClick={handleAccountExport} disabled={exporting} className="w-full px-4 py-2.5 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-700 font-label hover:bg-background-50 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap">
                {exporting ? <><i className="ri-loader-4-line animate-spin mr-2" />Submitting...</> : <><i className="ri-file-zip-line mr-2" />Download account data</>}
              </button>
              {weddingId && (
                <button onClick={handleWeddingExport} disabled={exporting} className="w-full px-4 py-2.5 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-700 font-label hover:bg-background-50 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap">
                  {exporting ? <><i className="ri-loader-4-line animate-spin mr-2" />Submitting...</> : <><i className="ri-folder-zip-line mr-2" />Download wedding data</>}
                </button>
              )}
              <p className="text-[10px] text-foreground-400">Your data export includes profile info, wedding data you own, guests, schedule, tasks, and preferences. Exports never include passwords, raw tokens, or other users' private data. Signed download links expire after 72 hours.</p>
              {exportMsg && (
                <p className={`text-xs px-3 py-2 rounded-lg ${exportMsg.includes('Failed') || exportMsg.includes('error') ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>{exportMsg}</p>
              )}
            </div>
          </PrivacyCard>

          {/* Account Deletion */}
          <PrivacyCard title="Delete my account" description="Permanently delete your Vowora account and associated data." icon="ri-delete-bin-line">
            {deletionStep === 'confirm' && (
              <div>
                <p className="text-xs text-foreground-500 mb-4">Deleting your account will permanently remove your profile and all data you own. This action cannot be undone once completed. A 30-day cooling-off period applies before deletion is final.</p>
                <button onClick={handleAccountDeletion} className="px-4 py-2.5 rounded-lg bg-red-500 text-white text-sm font-label font-medium hover:bg-red-600 transition-colors cursor-pointer whitespace-nowrap">
                  <i className="ri-alert-line mr-2" />Request account deletion
                </button>
              </div>
            )}

            {deletionStep === 'review' && (
              <div>
                <div className="p-4 rounded-lg bg-red-50 border border-red-200 mb-4">
                  <h4 className="text-sm font-label font-semibold text-red-700 mb-2">Before you proceed:</h4>
                  <ul className="text-xs text-red-600 space-y-1.5 list-disc pl-4">
                    {isOwner && <li>You are the owner of an active wedding. You must transfer ownership or delete the wedding first.</li>}
                    <li>All your profile data will be permanently deleted after the cooling-off period.</li>
                    <li>Shared wedding data where you are a collaborator will NOT be deleted.</li>
                    <li>Active subscriptions must be cancelled separately.</li>
                    <li>Payment records required for tax purposes are retained for 6 years.</li>
                  </ul>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={handleAccountDeletion} className="px-4 py-2.5 rounded-lg bg-red-500 text-white text-sm font-label font-medium hover:bg-red-600 transition-colors cursor-pointer whitespace-nowrap">
                    I understand, continue
                  </button>
                  <button onClick={handleCancelDeletion} className="px-4 py-2.5 text-sm text-foreground-500 font-label hover:text-foreground-700 cursor-pointer whitespace-nowrap">Cancel</button>
                </div>
              </div>
            )}

            {deletionStep === 'confirmation_phrase' && (
              <div>
                <p className="text-xs text-foreground-500 mb-4">Type <strong className="text-foreground-900">DELETE MY ACCOUNT</strong> to confirm you want to permanently delete your account.</p>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <input
                    type="text"
                    value={confirmationPhrase}
                    onChange={(e) => setConfirmationPhrase(e.target.value)}
                    placeholder="Type DELETE MY ACCOUNT"
                    className="flex-1 h-10 px-3 rounded-lg border border-secondary-200 text-sm text-foreground-900 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent"
                  />
                  <button
                    onClick={handleAccountDeletion}
                    disabled={confirmationPhrase !== 'DELETE MY ACCOUNT' || processing}
                    className="px-5 py-2.5 rounded-lg bg-red-500 text-white text-sm font-label font-medium hover:bg-red-600 transition-colors cursor-pointer disabled:opacity-40 whitespace-nowrap"
                  >
                    {processing ? 'Submitting...' : 'Confirm deletion'}
                  </button>
                </div>
                <button onClick={handleCancelDeletion} className="mt-3 text-xs text-foreground-400 hover:text-foreground-600 cursor-pointer">Cancel request</button>
              </div>
            )}

            {deletionStep === 'completed' && (
              <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
                <div className="flex items-center gap-2 mb-2"><i className="ri-check-line text-emerald-600" /><p className="text-sm font-label font-semibold text-emerald-700">Deletion request submitted</p></div>
                <p className="text-xs text-emerald-600">{deletionMsg}</p>
                <button onClick={() => setDeletionStep('confirm')} className="mt-3 text-xs text-emerald-700 underline cursor-pointer">Submit another request</button>
              </div>
            )}

            {deletionMsg && deletionStep !== 'completed' && (
              <p className={`mt-3 text-xs px-3 py-2 rounded-lg ${deletionMsg.includes('Failed') || deletionMsg.includes('error') ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>{deletionMsg}</p>
            )}
          </PrivacyCard>

          {/* Wedding Deletion (if owner) */}
          {isOwner && weddingId && (
            <PrivacyCard title="Delete wedding" description="Permanently delete this wedding and all associated data." icon="ri-delete-bin-6-line">
              <div className="p-4 rounded-lg bg-red-50 border border-red-200 mb-4">
                <h4 className="text-sm font-label font-semibold text-red-700 mb-2">This will permanently delete:</h4>
                <ul className="text-xs text-red-600 space-y-1 list-disc pl-4">
                  <li>All guest records and contact details</li>
                  <li>All invitations, tokens, and RSVP responses</li>
                  <li>All schedule events and timeline items</li>
                  <li>All budget records and supplier information</li>
                  <li>All seating plans and assignments</li>
                  <li>All gallery media and album configurations</li>
                  <li>All registry items and contribution records</li>
                  <li>All wedding website content</li>
                  <li>All tasks and planning data</li>
                </ul>
              </div>
              <p className="text-xs text-foreground-500 mb-4">Wedding deletion follows a staged workflow with a 30-day cooling-off period. You can cancel at any time before the scheduled deletion date.</p>
              <button onClick={() => navigate('/app/admin/data-protection')} className="px-4 py-2.5 rounded-lg border border-red-300 bg-white text-red-600 text-sm font-label font-medium hover:bg-red-50 transition-colors cursor-pointer whitespace-nowrap">
                <i className="ri-shield-check-line mr-2" />Go to Data Protection dashboard
              </button>
            </PrivacyCard>
          )}

          {/* Privacy info links */}
          <PrivacyCard title="Privacy information" description="Learn about how Vowora handles your data." icon="ri-shield-check-line">
            <div className="space-y-2">
              <Link to="/privacy" className="flex items-center justify-between py-2 text-sm text-foreground-700 hover:text-primary-600 cursor-pointer">Privacy Policy <i className="ri-arrow-right-line text-xs" /></Link>
              <Link to="/retention" className="flex items-center justify-between py-2 text-sm text-foreground-700 hover:text-primary-600 cursor-pointer">Data Retention Schedule <i className="ri-arrow-right-line text-xs" /></Link>
              <Link to="/terms" className="flex items-center justify-between py-2 text-sm text-foreground-700 hover:text-primary-600 cursor-pointer">Terms of Service <i className="ri-arrow-right-line text-xs" /></Link>
              <Link to="/dpa" className="flex items-center justify-between py-2 text-sm text-foreground-700 hover:text-primary-600 cursor-pointer">Data Processing Agreement <i className="ri-arrow-right-line text-xs" /></Link>
            </div>
          </PrivacyCard>
        </div>
      </div>
    </AppShell>
  );
}