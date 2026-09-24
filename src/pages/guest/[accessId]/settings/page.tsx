import { useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useGuestPortal, clearGuestSession } from '@/hooks/useGuestPortal';
import type { GuestProfile, GuestNotificationPrefs } from '@/types/access';
import {
  SettingsSection,
  ProfileForm,
  NotificationPanel,
  LocalePanel,
  DataOverview,
  PrivacyActions,
  LeavePortalCard,
  SettingsSkeleton,
  SettingsDisabled,
  ToastMessage,
} from './components/SettingsComponents';
import { edgeFunctionUrl } from '@/lib/edgeFunctions';

const INTERACT_URL = edgeFunctionUrl('guest-settings-interact');

export default function GuestSettingsPage() {
  const { accessId } = useParams();
  const navigate = useNavigate();
  const { data, loading, error, refresh } = useGuestPortal();

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const callSettingsAPI = useCallback(async (action: string, payload: Record<string, unknown> = {}) => {
    if (!accessId) return { success: false, error: 'No session' };
    setSaving(true);
    try {
      const res = await fetch(INTERACT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_hash: accessId, action, ...payload }),
      });
      const result = await res.json();
      return result;
    } catch {
      return { success: false, error: 'Network error. Please try again.' };
    } finally {
      setSaving(false);
    }
  }, [accessId]);

  const handleProfileSave = useCallback(async (profileData: Record<string, string | undefined>) => {
    const result = await callSettingsAPI('update_profile', { profile: profileData });
    if (result.success) {
      showToast('Your details have been saved.', 'success');
      refresh();
    } else {
      showToast(result.error || 'Could not save your details.', 'error');
    }
  }, [callSettingsAPI, showToast, refresh]);

  const handleNotifToggle = useCallback(async (key: string, value: boolean) => {
    const result = await callSettingsAPI('update_notification_prefs', {
      notification_prefs: { [key]: value },
    });
    if (result.success) {
      refresh();
    } else {
      showToast(result.error || 'Could not update your preferences.', 'error');
      refresh();
    }
  }, [callSettingsAPI, showToast, refresh]);

  const handleLocaleUpdate = useCallback(async (key: string, value: string) => {
    const result = await callSettingsAPI('update_notification_prefs', {
      notification_prefs: { [key]: value },
    });
    if (result.success) {
      refresh();
    } else {
      showToast(result.error || 'Could not update your preferences.', 'error');
      refresh();
    }
  }, [callSettingsAPI, showToast, refresh]);

  const handleConsentToggle = useCallback(async (consentType: 'communication' | 'marketing', value: boolean) => {
    const result = await callSettingsAPI('update_consent', {
      consent: { consent_type: consentType, consented: value },
    });
    if (result.success) {
      refresh();
    } else {
      showToast(result.error || 'Could not update consent.', 'error');
      refresh();
    }
  }, [callSettingsAPI, showToast, refresh]);

  const handleRequestDownload = useCallback(async () => {
    const result = await callSettingsAPI('request_data_download');
    if (result.success) {
      showToast('Your download request has been submitted.', 'success');
      refresh();
    } else {
      showToast(result.error || 'Could not submit your request.', 'error');
    }
  }, [callSettingsAPI, showToast, refresh]);

  const handleRequestDeletion = useCallback(async () => {
    const result = await callSettingsAPI('request_deletion');
    if (result.success) {
      showToast('Your deletion request has been submitted.', 'success');
      refresh();
    } else {
      showToast(result.error || 'Could not submit your request.', 'error');
    }
  }, [callSettingsAPI, showToast, refresh]);

  const handleRequestCorrection = useCallback(async () => {
    const result = await callSettingsAPI('request_data_correction', {
      corrected_fields: { email: 'Please update' },
    });
    if (result.success) {
      showToast('Your correction request has been submitted.', 'success');
      refresh();
    } else {
      showToast(result.error || 'Could not submit your request.', 'error');
    }
  }, [callSettingsAPI, showToast, refresh]);

  const handleRemoveNotes = useCallback(async () => {
    const result = await callSettingsAPI('remove_optional_notes');
    if (result.success) {
      showToast('Your optional notes have been removed.', 'success');
      refresh();
    } else {
      showToast(result.error || 'Could not remove your notes.', 'error');
    }
  }, [callSettingsAPI, showToast, refresh]);

  const handleLeave = useCallback(() => {
    clearGuestSession();
    navigate('/');
  }, [navigate]);

  // Loading state
  if (loading) return <SettingsSkeleton />;

  // Error state
  if (error || !data) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-secondary-100 text-secondary-400 mb-4">
          <i className="ri-error-warning-line text-3xl" />
        </div>
        <h2 className="font-heading text-xl text-foreground-800 mb-2">Something went wrong</h2>
        <p className="text-sm text-foreground-500">{error || 'We could not load your settings.'}</p>
      </div>
    );
  }

  const settings = data.settings;
  const portalSettings = data.portal_settings;
  const basePath = `/guest/${accessId}`;

  // Settings disabled — check both settings_enabled (new) and show_settings (legacy)
  if (portalSettings && (portalSettings.settings_enabled === false || portalSettings.show_settings === false)) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-secondary-100 text-secondary-400 mb-4">
          <i className="ri-user-settings-line text-3xl" />
        </div>
        <h1 className="font-heading text-2xl text-foreground-900 mb-3">Guest Settings</h1>
        <p className="text-sm text-foreground-500 max-w-sm mx-auto leading-relaxed mb-6">
          Guest settings are not currently available. The couple may enable this feature closer to the wedding day.
        </p>
        <Link to={basePath} className="inline-flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 cursor-pointer whitespace-nowrap">
          <i className="ri-arrow-left-line" /> Return to dashboard
        </Link>
      </div>
    );
  }

  // No settings data yet
  if (!settings || !settings.profiles || settings.profiles.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-secondary-100 text-secondary-400 mb-4">
          <i className="ri-user-settings-line text-3xl" />
        </div>
        <h2 className="font-heading text-xl text-foreground-800 mb-2">No Profile Data</h2>
        <p className="text-sm text-foreground-500">We could not find your profile information for this invitation.</p>
      </div>
    );
  }

  const profile: GuestProfile = settings.profiles[0];
  const prefs: GuestNotificationPrefs = settings.notification_preferences?.[0] || {
    id: '',
    guest_id: '',
    updates_enabled: true,
    email_notifications: true,
    sms_enabled: false,
    important_only_updates: false,
    travel_updates: true,
    rsvp_reminders: true,
    gallery_notifications: true,
    language: 'en-GB',
    timezone: 'Europe/London',
  };

  const smsConfigured = portalSettings?.sms_configured === true;
  const privacyNoticeUrl = portalSettings?.privacy_notice_url ?? null;
  const contactRoute = portalSettings?.contact_route ?? null;

  const hasOptionalNotes = !!(profile.dietary_requirements || profile.allergy_notes || profile.accessibility_notes || profile.accessibility_needs);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
      {toast && (
        <ToastMessage message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
      )}

      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-foreground-900">Settings</h1>
        <p className="text-sm text-foreground-500 mt-1">Manage your profile, notifications and privacy.</p>
      </div>

      {/* Profile */}
      <SettingsSection icon="ri-user-3-line" title="Profile" description="Update how the couple see your details.">
        <ProfileForm profile={profile} onSave={handleProfileSave} saving={saving} />
      </SettingsSection>

      {/* Notifications */}
      <SettingsSection icon="ri-notification-4-line" title="Notifications" description="Choose which updates you would like to receive.">
        <NotificationPanel prefs={prefs} smsConfigured={smsConfigured} onToggle={handleNotifToggle} saving={saving} />
      </SettingsSection>

      {/* Language & Timezone */}
      <SettingsSection icon="ri-global-line" title="Language &amp; time zone" description="Set your preferred language and time zone.">
        <LocalePanel prefs={prefs} onUpdate={handleLocaleUpdate} saving={saving} />
      </SettingsSection>

      {/* Privacy */}
      <SettingsSection icon="ri-shield-keyhole-line" title="Privacy &amp; data" description="Manage your data and privacy preferences.">
        <div className="space-y-6">
          <DataOverview profile={profile} />
          <PrivacyActions
            consent={settings.consent}
            hasOptionalNotes={hasOptionalNotes}
            pendingRequests={settings.privacy_requests || []}
            privacyNoticeUrl={privacyNoticeUrl}
            contactRoute={contactRoute}
            onConsentToggle={handleConsentToggle}
            onRequestDownload={handleRequestDownload}
            onRequestDeletion={handleRequestDeletion}
            onRequestCorrection={handleRequestCorrection}
            onRemoveNotes={handleRemoveNotes}
            saving={saving}
          />
        </div>
      </SettingsSection>

      {/* Leave portal */}
      <SettingsSection icon="ri-logout-box-r-line" title="Leave guest portal">
        <LeavePortalCard onLeave={handleLeave} />
      </SettingsSection>

      <p className="text-[10px] text-foreground-300 text-center pt-4 pb-8">
        Settings changes are recorded for your privacy and security. The couple cannot see your notification preferences.
      </p>
    </div>
  );
}