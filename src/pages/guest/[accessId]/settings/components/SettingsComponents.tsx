import { useState } from 'react';
import type { GuestProfile, GuestNotificationPrefs, GuestConsentState, PrivacyRequestItem } from '@/types/access';

// ── Section wrapper ──

export function SettingsSection({ icon, title, description, children }: {
  icon: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-xl border border-secondary-100 p-5 md:p-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-secondary-50 text-secondary-500 flex-shrink-0">
          <i className={`${icon} text-lg`} />
        </div>
        <div>
          <h2 className="font-heading text-base font-semibold text-foreground-900">{title}</h2>
          {description && <p className="text-sm text-foreground-500 mt-0.5">{description}</p>}
        </div>
      </div>
      <div className="pl-[52px]">
        {children}
      </div>
    </section>
  );
}

// ── Toggle switch ──

export function ToggleSwitch({ label, description, checked, onChange, disabled }: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className={`flex items-center justify-between gap-4 py-2.5 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
      <div className="min-w-0">
        <span className="text-sm font-medium text-foreground-800">{label}</span>
        {description && <p className="text-xs text-foreground-500 mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 cursor-pointer ${
          checked ? 'bg-primary-500' : 'bg-secondary-300'
        } ${disabled ? 'cursor-not-allowed' : ''}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`} />
      </button>
    </label>
  );
}

// ── Profile form ──

export function ProfileForm({ profile, onSave, saving }: {
  profile: GuestProfile;
  onSave: (data: { preferred_name?: string; email?: string; mobile_phone?: string; preferred_contact_method?: string }) => void;
  saving: boolean;
}) {
  const [preferredName, setPreferredName] = useState(profile.preferred_name || '');
  const [email, setEmail] = useState(profile.email || '');
  const [mobilePhone, setMobilePhone] = useState(profile.mobile_phone || '');
  const [contactMethod, setContactMethod] = useState(profile.preferred_contact_method || 'portal');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setMessage({ type: 'error', text: 'Please enter a valid email address.' });
      return;
    }
    if (preferredName.length > 100) {
      setMessage({ type: 'error', text: 'Preferred name must be under 100 characters.' });
      return;
    }

    onSave({ preferred_name: preferredName || undefined, email: email || undefined, mobile_phone: mobilePhone || undefined, preferred_contact_method: contactMethod });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {message && (
        <div className={`text-sm px-3 py-2 rounded-md ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
        }`}>
          {message.text}
        </div>
      )}

      <div>
        <label htmlFor="preferred-name" className="block text-sm font-medium text-foreground-700 mb-1">Preferred name</label>
        <input
          id="preferred-name"
          type="text"
          value={preferredName}
          onChange={(e) => setPreferredName(e.target.value)}
          maxLength={100}
          placeholder="How should we address you?"
          className="w-full px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 transition-colors"
        />
      </div>

      <div>
        <label htmlFor="settings-email" className="block text-sm font-medium text-foreground-700 mb-1">Email address</label>
        <input
          id="settings-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          className="w-full px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 transition-colors"
        />
      </div>

      <div>
        <label htmlFor="mobile-phone" className="block text-sm font-medium text-foreground-700 mb-1">Mobile telephone</label>
        <input
          id="mobile-phone"
          type="tel"
          value={mobilePhone}
          onChange={(e) => setMobilePhone(e.target.value)}
          placeholder="+44 7123 456789"
          className="w-full px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 transition-colors"
        />
      </div>

      <div>
        <label htmlFor="contact-method" className="block text-sm font-medium text-foreground-700 mb-1">Preferred contact method</label>
        <select
          id="contact-method"
          value={contactMethod}
          onChange={(e) => setContactMethod(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 transition-colors cursor-pointer"
        >
          <option value="portal">Portal messages</option>
          <option value="email">Email</option>
          <option value="telephone">Telephone</option>
          <option value="sms">SMS</option>
        </select>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-label font-medium hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer whitespace-nowrap"
        >
          {saving ? (
            <>
              <i className="ri-loader-4-line animate-spin text-sm" /> Saving...
            </>
          ) : (
            <>Save changes</>
          )}
        </button>
      </div>
    </form>
  );
}

// ── Notification preferences ──

export function NotificationPanel({ prefs, smsConfigured, onToggle, saving }: {
  prefs: GuestNotificationPrefs;
  smsConfigured: boolean;
  onToggle: (key: string, value: boolean) => void;
  saving: boolean;
}) {
  return (
    <div className="space-y-0 divide-y divide-secondary-100">
      <ToggleSwitch
        label="Email updates"
        description="Receive wedding updates via email"
        checked={prefs.email_notifications}
        onChange={(v) => onToggle('email_notifications', v)}
      />
      <ToggleSwitch
        label="SMS updates"
        description={smsConfigured ? 'Receive wedding updates via text message' : 'SMS notifications are not currently available'}
        checked={prefs.sms_enabled}
        onChange={(v) => onToggle('sms_enabled', v)}
        disabled={!smsConfigured}
      />
      <ToggleSwitch
        label="Important updates only"
        description="Only receive updates marked as important"
        checked={prefs.important_only_updates}
        onChange={(v) => onToggle('important_only_updates', v)}
      />
      <ToggleSwitch
        label="Travel updates"
        description="Notifications about travel arrangements and recommendations"
        checked={prefs.travel_updates}
        onChange={(v) => onToggle('travel_updates', v)}
      />
      <ToggleSwitch
        label="RSVP reminders"
        description="Reminders as the RSVP deadline approaches"
        checked={prefs.rsvp_reminders}
        onChange={(v) => onToggle('rsvp_reminders', v)}
      />
      <ToggleSwitch
        label="Gallery notifications"
        description="When new photos are added to the gallery"
        checked={prefs.gallery_notifications}
        onChange={(v) => onToggle('gallery_notifications', v)}
      />
    </div>
  );
}

// ── Language & timezone ──

export function LocalePanel({ prefs, onUpdate, saving }: {
  prefs: GuestNotificationPrefs;
  onUpdate: (key: string, value: string) => void;
  saving: boolean;
}) {
  const languages = [
    { code: 'en-GB', label: 'English (UK)' },
    { code: 'en-US', label: 'English (US)' },
    { code: 'fr', label: 'Français' },
    { code: 'de', label: 'Deutsch' },
    { code: 'es', label: 'Español' },
    { code: 'it', label: 'Italiano' },
    { code: 'pt', label: 'Português' },
    { code: 'nl', label: 'Nederlands' },
    { code: 'pl', label: 'Polski' },
  ];

  const timezones = [
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Europe/Madrid',
    'Europe/Rome',
    'Europe/Dublin',
    'Europe/Amsterdam',
    'Europe/Warsaw',
    'Europe/Lisbon',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Asia/Dubai',
    'Asia/Tokyo',
    'Asia/Singapore',
    'Australia/Sydney',
  ];

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="language" className="block text-sm font-medium text-foreground-700 mb-1">Language</label>
        <select
          id="language"
          value={prefs.language || 'en-GB'}
          onChange={(e) => onUpdate('language', e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 transition-colors cursor-pointer"
          disabled={saving}
        >
          {languages.map((l) => (
            <option key={l.code} value={l.code}>{l.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="timezone" className="block text-sm font-medium text-foreground-700 mb-1">Time zone</label>
        <select
          id="timezone"
          value={prefs.timezone || 'Europe/London'}
          onChange={(e) => onUpdate('timezone', e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 transition-colors cursor-pointer"
          disabled={saving}
        >
          {timezones.map((tz) => (
            <option key={tz} value={tz}>{tz}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

// ── Privacy: Your data card ──

export function DataOverview({ profile }: { profile: GuestProfile }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-foreground-600">Below is the information the couple hold about you for this invitation.</p>
      <div className="bg-secondary-50 rounded-lg p-4 space-y-2 text-sm">
        {profile.preferred_name && (
          <div className="flex justify-between">
            <span className="text-foreground-500">Preferred name</span>
            <span className="text-foreground-900 font-medium">{profile.preferred_name}</span>
          </div>
        )}
        {profile.email && (
          <div className="flex justify-between">
            <span className="text-foreground-500">Email</span>
            <span className="text-foreground-900 font-medium">{profile.email}</span>
          </div>
        )}
        {profile.mobile_phone && (
          <div className="flex justify-between">
            <span className="text-foreground-500">Mobile</span>
            <span className="text-foreground-900 font-medium">{profile.mobile_phone}</span>
          </div>
        )}
        {profile.preferred_contact_method && (
          <div className="flex justify-between">
            <span className="text-foreground-500">Contact method</span>
            <span className="text-foreground-900 font-medium capitalize">{profile.preferred_contact_method}</span>
          </div>
        )}
        {profile.dietary_requirements && (
          <div className="flex justify-between">
            <span className="text-foreground-500">Dietary requirements</span>
            <span className="text-foreground-900 font-medium">{profile.dietary_requirements}</span>
          </div>
        )}
        {profile.allergy_notes && (
          <div className="flex justify-between">
            <span className="text-foreground-500">Allergy notes</span>
            <span className="text-foreground-900 font-medium">{profile.allergy_notes}</span>
          </div>
        )}
        {profile.accessibility_notes && (
          <div className="flex justify-between">
            <span className="text-foreground-500">Accessibility notes</span>
            <span className="text-foreground-900 font-medium">{profile.accessibility_notes}</span>
          </div>
        )}
        {profile.accessibility_needs && (
          <div className="flex justify-between">
            <span className="text-foreground-500">Accessibility needs</span>
            <span className="text-foreground-900 font-medium">{profile.accessibility_needs}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Privacy action buttons ──

export function PrivacyActions({
  consent,
  hasOptionalNotes,
  pendingRequests,
  privacyNoticeUrl,
  contactRoute,
  onConsentToggle,
  onRequestDownload,
  onRequestDeletion,
  onRequestCorrection,
  onRemoveNotes,
  saving,
}: {
  consent: GuestConsentState;
  hasOptionalNotes: boolean;
  pendingRequests: PrivacyRequestItem[];
  privacyNoticeUrl?: string | null;
  contactRoute?: string | null;
  onConsentToggle: (type: 'communication' | 'marketing', value: boolean) => void;
  onRequestDownload: () => void;
  onRequestDeletion: () => void;
  onRequestCorrection: () => void;
  onRemoveNotes: () => void;
  saving: boolean;
}) {
  const hasPendingDeletion = pendingRequests.some((r) => r.request_type === 'data_deletion' && r.status === 'pending');
  const hasPendingDownload = pendingRequests.some((r) => r.request_type === 'data_download' && r.status === 'pending');
  const hasPendingCorrection = pendingRequests.some((r) => r.request_type === 'data_correction' && r.status === 'pending');

  return (
    <div className="space-y-6">
      {/* Consent toggles */}
      <div>
        <h3 className="text-sm font-semibold text-foreground-800 mb-2">Consent</h3>
        <div className="divide-y divide-secondary-100">
          <ToggleSwitch
            label="Wedding communication"
            description="Allow the couple to send you wedding-related messages"
            checked={consent.communication}
            onChange={(v) => onConsentToggle('communication', v)}
          />
          <ToggleSwitch
            label="Marketing"
            description="Separate consent for promotional or marketing communications"
            checked={consent.marketing}
            onChange={(v) => onConsentToggle('marketing', v)}
          />
        </div>
      </div>

      {/* Actions */}
      <div>
        <h3 className="text-sm font-semibold text-foreground-800 mb-3">Data rights</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <PrivacyActionButton
            icon="ri-download-2-line"
            label="Request data download"
            description="Receive a copy of your data"
            pending={hasPendingDownload}
            pendingLabel="Download requested"
            onClick={onRequestDownload}
            saving={saving}
          />
          <PrivacyActionButton
            icon="ri-edit-line"
            label="Correct my details"
            description="Submit a correction request"
            pending={hasPendingCorrection}
            pendingLabel="Correction requested"
            onClick={onRequestCorrection}
            saving={saving}
          />
          {hasOptionalNotes && (
            <PrivacyActionButton
              icon="ri-delete-back-line"
              label="Remove optional notes"
              description="Clear dietary/accessibility notes"
              onClick={onRemoveNotes}
              saving={saving}
            />
          )}
          <PrivacyActionButton
            icon="ri-delete-bin-line"
            label="Request deletion"
            description="Ask for your data to be erased"
            pending={hasPendingDeletion}
            pendingLabel="Deletion requested"
            onClick={onRequestDeletion}
            saving={saving}
            destructive
          />
        </div>
      </div>

      {/* Links */}
      {(privacyNoticeUrl || contactRoute) && (
        <div className="flex flex-wrap gap-3 text-xs">
          {privacyNoticeUrl && (
            <a
              href={privacyNoticeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-foreground-500 hover:text-primary-600 transition-colors cursor-pointer whitespace-nowrap"
            >
              <i className="ri-file-text-line" /> Privacy notice
            </a>
          )}
          {contactRoute && (
            <a
              href={contactRoute}
              className="inline-flex items-center gap-1 text-foreground-500 hover:text-primary-600 transition-colors cursor-pointer whitespace-nowrap"
            >
              <i className="ri-mail-line" /> Privacy contact
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function PrivacyActionButton({ icon, label, description, pending, pendingLabel, onClick, saving, destructive }: {
  icon: string;
  label: string;
  description: string;
  pending?: boolean;
  pendingLabel?: string;
  onClick: () => void;
  saving?: boolean;
  destructive?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={saving || pending}
      className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-colors cursor-pointer ${
        pending
          ? 'border-secondary-200 bg-secondary-50 cursor-not-allowed'
          : destructive
            ? 'border-red-200 bg-red-50/50 hover:bg-red-50 text-red-700'
            : 'border-secondary-200 bg-white hover:bg-secondary-50'
      }`}
    >
      <div className={`w-8 h-8 flex items-center justify-center rounded-md flex-shrink-0 ${
        pending ? 'bg-secondary-100 text-secondary-400' : destructive ? 'bg-red-100 text-red-500' : 'bg-secondary-50 text-secondary-500'
      }`}>
        <i className={icon} />
      </div>
      <div className="min-w-0">
        <span className="text-sm font-medium text-foreground-800">{pending && pendingLabel ? pendingLabel : label}</span>
        <p className="text-xs text-foreground-500 mt-0.5">{description}</p>
      </div>
    </button>
  );
}

// ── Leave portal ──

export function LeavePortalCard({ onLeave }: { onLeave: () => void }) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div className="bg-secondary-50 rounded-lg p-4 border border-secondary-200">
        <p className="text-sm text-foreground-700 mb-3">Leaving the guest portal will end your current session. You will need your invitation link to return.</p>
        <div className="flex items-center gap-2">
          <button
            onClick={onLeave}
            className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-label font-medium hover:bg-red-600 transition-colors cursor-pointer whitespace-nowrap"
          >
            Yes, leave portal
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="px-4 py-2 rounded-lg bg-white border border-secondary-200 text-sm font-label text-foreground-600 hover:bg-secondary-50 transition-colors cursor-pointer whitespace-nowrap"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="flex items-center gap-3 p-4 rounded-lg border border-secondary-200 bg-white hover:bg-secondary-50 transition-colors cursor-pointer w-full text-left"
    >
      <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-red-50 text-red-500 flex-shrink-0">
        <i className="ri-logout-box-line text-lg" />
      </div>
      <div>
        <span className="text-sm font-medium text-foreground-800">Leave guest portal</span>
        <p className="text-xs text-foreground-500 mt-0.5">End your session. You will need your invitation link to return.</p>
      </div>
      <i className="ri-arrow-right-s-line text-foreground-400 ml-auto" />
    </button>
  );
}

// ── Skeleton ──

export function SettingsSkeleton() {
  return (
    <div className="max-w-2xl mx-auto space-y-4 px-4 py-8">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white rounded-xl border border-secondary-100 p-5 md:p-6 animate-pulse">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-secondary-100" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 bg-secondary-100 rounded" />
              <div className="h-3 w-48 bg-secondary-100 rounded" />
            </div>
          </div>
          <div className="pl-[52px] space-y-3">
            {[1, 2, 3].map((j) => (
              <div key={j} className="h-8 bg-secondary-100 rounded-lg" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Disabled state ──

export function SettingsDisabled() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-secondary-100 text-secondary-400 mb-4">
        <i className="ri-settings-4-line text-3xl" />
      </div>
      <h2 className="font-heading text-xl text-foreground-800 mb-2">Settings Unavailable</h2>
      <p className="text-sm text-foreground-500">The couple have not enabled guest settings for this portal.</p>
    </div>
  );
}

// ── Toast message ──

export function ToastMessage({ message, type, onDismiss }: {
  message: string;
  type: 'success' | 'error';
  onDismiss: () => void;
}) {
  return (
    <div className={`fixed top-20 right-4 z-50 max-w-sm px-4 py-3 rounded-lg shadow-lg text-sm flex items-center gap-2 ${
      type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
    }`}>
      <i className={`${type === 'success' ? 'ri-check-line' : 'ri-close-line'}`} />
      <span className="flex-1">{message}</span>
      <button onClick={onDismiss} className="cursor-pointer opacity-70 hover:opacity-100">
        <i className="ri-close-line" />
      </button>
    </div>
  );
}