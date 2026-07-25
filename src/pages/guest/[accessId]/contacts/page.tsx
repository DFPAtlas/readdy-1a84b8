import { useGuestPortal } from '@/hooks/useGuestPortal';
import type { WeddingContact } from '@/types/access';

// ── Skeleton ──

function ContactsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="bg-white rounded-xl border border-secondary-100 p-4 animate-pulse">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-secondary-200" />
            <div className="flex-1">
              <div className="h-4 w-24 bg-secondary-200 rounded mb-2" />
              <div className="h-3 w-32 bg-secondary-100 rounded" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-3 w-3/4 bg-secondary-100 rounded" />
            <div className="h-3 w-1/2 bg-secondary-100 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Empty state ──

function ContactsEmpty() {
  return (
    <div className="text-center py-16">
      <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-secondary-100 mb-4">
        <i className="ri-contacts-line text-3xl text-secondary-400" />
      </div>
      <h3 className="font-heading text-lg font-semibold text-foreground-900 mb-2">No contacts shared</h3>
      <p className="text-sm text-foreground-500 max-w-sm mx-auto">
        The couple haven&apos;t shared any contact details yet. Check back closer to the wedding day.
      </p>
    </div>
  );
}

// ── Disabled state ──

function ContactsDisabled() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16 text-center">
      <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-secondary-100 text-secondary-400 mb-4">
        <i className="ri-contacts-line text-3xl" />
      </div>
      <h1 className="font-heading text-2xl text-foreground-900 mb-3">Contacts</h1>
      <p className="text-sm text-foreground-500 leading-relaxed">
        Contacts are not currently available. The couple may share approved contacts closer to the wedding day.
      </p>
    </div>
  );
}

// ── Contact card ──

const ROLE_ICONS: Record<string, string> = {
  couple: 'ri-heart-line',
  planner: 'ri-calendar-check-line',
  coordinator: 'ri-list-check-3',
  venue: 'ri-building-line',
  transport: 'ri-bus-line',
  accommodation: 'ri-hotel-line',
  emergency: 'ri-alert-line',
};

function getRoleIcon(role: string): string {
  const lower = role.toLowerCase();
  for (const [key, icon] of Object.entries(ROLE_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return 'ri-user-line';
}

interface ContactCardProps {
  contact: WeddingContact;
}

function ContactCard({ contact }: ContactCardProps) {
  return (
    <div className={`bg-white rounded-xl border ${contact.is_emergency ? 'border-accent-200 bg-accent-50/20' : 'border-secondary-100'} p-4`}>
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
          contact.is_emergency ? 'bg-accent-100 text-accent-600' : 'bg-secondary-100 text-foreground-500'
        }`}>
          <i className={`${getRoleIcon(contact.role)} text-sm`} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-label text-sm font-semibold text-foreground-900">{contact.name}</h3>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-foreground-500">{contact.role}</span>
            {contact.is_emergency && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-accent-100 text-accent-700 text-[10px] font-label font-medium">
                <i className="ri-alert-line text-[9px]" /> Emergency
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {contact.phone && (
          <a
            href={`tel:${contact.phone.replace(/\s/g, '')}`}
            className="flex items-center gap-2 text-sm text-foreground-600 hover:text-primary-600 transition-colors cursor-pointer"
          >
            <i className="ri-phone-line text-foreground-400 w-5 text-center flex-shrink-0" />
            <span className="truncate">{contact.phone}</span>
          </a>
        )}
        {contact.email && (
          <a
            href={`mailto:${contact.email}`}
            className="flex items-center gap-2 text-sm text-foreground-600 hover:text-primary-600 transition-colors cursor-pointer"
          >
            <i className="ri-mail-line text-foreground-400 w-5 text-center flex-shrink-0" />
            <span className="truncate">{contact.email}</span>
          </a>
        )}
        {contact.availability && (
          <div className="flex items-start gap-2 text-sm text-foreground-500">
            <i className="ri-time-line text-foreground-400 w-5 text-center flex-shrink-0 mt-0.5" />
            <span>{contact.availability}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page ──

export default function GuestContactsPage() {
  const { data, loading, error } = useGuestPortal();

  // Loading
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        <div className="text-center mb-10">
          <div className="h-8 w-40 bg-secondary-200 rounded mx-auto mb-2 animate-pulse" />
          <div className="h-4 w-56 bg-secondary-100 rounded mx-auto animate-pulse" />
        </div>
        <ContactsSkeleton />
      </div>
    );
  }

  // Error
  if (error || !data) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="w-14 h-14 mx-auto flex items-center justify-center rounded-full bg-secondary-100 text-secondary-400 mb-4">
          <i className="ri-error-warning-line text-2xl" />
        </div>
        <p className="text-sm text-red-600">{error || 'Could not load contacts.'}</p>
      </div>
    );
  }

  const portalSettings = data.portal_settings;
  const contactsData = data.contacts;
  const contacts = contactsData?.contacts || [];

  // Disabled
  if (!portalSettings?.show_contacts) {
    return <ContactsDisabled />;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-heading text-3xl md:text-4xl text-foreground-900 mb-1">Contacts</h1>
        <p className="text-sm text-foreground-500">
          {contacts.length > 0
            ? `${contacts.length} approved contact${contacts.length !== 1 ? 's' : ''} — reach out if you need help`
            : 'Key people to reach if you have questions on the day'}
        </p>
      </div>

      {/* Emergency banner */}
      {contacts.some((c) => c.is_emergency) && (
        <div className="mb-6 p-4 rounded-xl bg-accent-50 border border-accent-200 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent-100 flex items-center justify-center flex-shrink-0">
            <i className="ri-alert-line text-sm text-accent-600" />
          </div>
          <div>
            <p className="text-sm font-label font-semibold text-accent-800 mb-0.5">Emergency contacts</p>
            <p className="text-xs text-accent-600 leading-relaxed">
              Look for contacts marked <strong>Emergency</strong> below. Only use these in genuine urgent situations on the wedding day.
            </p>
          </div>
        </div>
      )}

      {/* Contact cards */}
      {contacts.length === 0 ? (
        <ContactsEmpty />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {contacts.map((contact) => (
            <ContactCard key={contact.id} contact={contact} />
          ))}
        </div>
      )}

      {/* Privacy note */}
      <p className="text-center text-[11px] text-foreground-350 mt-8 max-w-md mx-auto leading-relaxed">
        Only approved contacts are shown. Personal details are never shared publicly.
      </p>
    </div>
  );
}