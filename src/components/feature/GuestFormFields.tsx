import type { Guest, GuestHousehold, GuestTag } from '@/types/guest';
import { GUEST_TYPE_OPTIONS, PLUS_ONE_STATUS_OPTIONS, INVITE_STATUS_OPTIONS, INVITATION_GROUP_OPTIONS, CONTACT_METHOD_OPTIONS } from '@/types/guest';

interface GuestFormFieldsProps {
  form: Partial<Guest>;
  onChange: (field: string, value: unknown) => void;
  households: GuestHousehold[];
  tags: GuestTag[];
  selectedTagIds: string[];
  onTagToggle: (tagId: string) => void;
  errors: Record<string, string>;
  mode: 'add' | 'edit';
}

export default function GuestFormFields({ form, onChange, households, tags, selectedTagIds, onTagToggle, errors, mode }: GuestFormFieldsProps) {
  const fieldClass = (name: string) => `input-field ${errors[name] ? 'border-red-400 focus:border-red-400 focus:ring-red-200/50' : ''}`;

  return (
    <div className="space-y-8">
      {/* Identity */}
      <section>
        <h3 className="font-label text-sm font-semibold text-foreground-900 mb-4 flex items-center gap-2">
          <i className="ri-user-line text-foreground-500" />
          Identity
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-label text-foreground-600 mb-1.5">First name <span className="text-red-500">*</span></label>
            <input type="text" className={fieldClass('full_name')} value={form.full_name || ''} onChange={(e) => onChange('full_name', e.target.value)} placeholder="e.g. Emma" />
            {errors.full_name && <p className="text-xs text-red-500 mt-1">{errors.full_name}</p>}
          </div>
          <div>
            <label className="block text-xs font-label text-foreground-600 mb-1.5">Last name</label>
            <input type="text" className="input-field" value={form.last_name || ''} onChange={(e) => onChange('last_name', e.target.value)} placeholder="e.g. Williams" />
          </div>
          <div>
            <label className="block text-xs font-label text-foreground-600 mb-1.5">Preferred name</label>
            <input type="text" className="input-field" value={form.preferred_name || ''} onChange={(e) => onChange('preferred_name', e.target.value)} placeholder="What they go by" />
          </div>
          <div>
            <label className="block text-xs font-label text-foreground-600 mb-1.5">Title</label>
            <input type="text" className="input-field" value={form.title || ''} onChange={(e) => onChange('title', e.target.value)} placeholder="Mr, Mrs, Dr..." />
          </div>
          <div>
            <label className="block text-xs font-label text-foreground-600 mb-1.5">Pronouns</label>
            <input type="text" className="input-field" value={form.pronouns || ''} onChange={(e) => onChange('pronouns', e.target.value)} placeholder="e.g. she/her" />
          </div>
          <div>
            <label className="block text-xs font-label text-foreground-600 mb-1.5">Guest type</label>
            <select className="input-field" value={form.guest_type || 'adult'} onChange={(e) => onChange('guest_type', e.target.value)}>
              {GUEST_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-label text-foreground-600 mb-1.5">Relationship to couple</label>
            <input type="text" className="input-field" value={form.relationship_label || ''} onChange={(e) => onChange('relationship_label', e.target.value)} placeholder="e.g. Mother of the bride" />
          </div>
          <div>
            <label className="block text-xs font-label text-foreground-600 mb-1.5">Connection / side</label>
            <input type="text" className="input-field" value={form.connection_group || ''} onChange={(e) => onChange('connection_group', e.target.value)} placeholder="e.g. Bride's family" />
          </div>
          <div>
            <label className="block text-xs font-label text-foreground-600 mb-1.5">Wedding party role</label>
            <input type="text" className="input-field" value={form.wedding_party_role || ''} onChange={(e) => onChange('wedding_party_role', e.target.value)} placeholder="e.g. Best Man, Maid of Honour" />
          </div>
        </div>
        <p className="text-xs text-foreground-400 mt-3 italic">Only add information needed to support the guest. Restrict access to wedding collaborators who require it.</p>
      </section>

      {/* Contact */}
      <section>
        <h3 className="font-label text-sm font-semibold text-foreground-900 mb-4 flex items-center gap-2">
          <i className="ri-mail-line text-foreground-500" />
          Contact
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-label text-foreground-600 mb-1.5">Email</label>
            <input type="email" className={fieldClass('email')} value={form.email || ''} onChange={(e) => onChange('email', e.target.value)} placeholder="guest@email.com" />
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
          </div>
          <div>
            <label className="block text-xs font-label text-foreground-600 mb-1.5">Mobile telephone</label>
            <input type="tel" className={fieldClass('mobile_phone')} value={form.mobile_phone || ''} onChange={(e) => onChange('mobile_phone', e.target.value)} placeholder="+44 7700 900000" />
            {errors.mobile_phone && <p className="text-xs text-red-500 mt-1">{errors.mobile_phone}</p>}
          </div>
          <div>
            <label className="block text-xs font-label text-foreground-600 mb-1.5">Alternative telephone</label>
            <input type="tel" className="input-field" value={form.alternative_phone || ''} onChange={(e) => onChange('alternative_phone', e.target.value)} placeholder="Landline or work number" />
          </div>
          <div>
            <label className="block text-xs font-label text-foreground-600 mb-1.5">Preferred contact method</label>
            <select className="input-field" value={form.preferred_contact_method || 'none'} onChange={(e) => onChange('preferred_contact_method', e.target.value)}>
              {CONTACT_METHOD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
          <div>
            <label className="block text-xs font-label text-foreground-600 mb-1.5">Address line 1</label>
            <input type="text" className="input-field" value={form.address_line_1 || ''} onChange={(e) => onChange('address_line_1', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-label text-foreground-600 mb-1.5">Address line 2</label>
            <input type="text" className="input-field" value={form.address_line_2 || ''} onChange={(e) => onChange('address_line_2', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-label text-foreground-600 mb-1.5">Town / City</label>
            <input type="text" className="input-field" value={form.city || ''} onChange={(e) => onChange('city', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-label text-foreground-600 mb-1.5">County / Region</label>
            <input type="text" className="input-field" value={form.county_or_region || ''} onChange={(e) => onChange('county_or_region', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-label text-foreground-600 mb-1.5">Postcode</label>
            <input type="text" className="input-field" value={form.postcode || ''} onChange={(e) => onChange('postcode', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-label text-foreground-600 mb-1.5">Country</label>
            <input type="text" className="input-field" value={form.country || 'United Kingdom'} onChange={(e) => onChange('country', e.target.value)} />
          </div>
        </div>
      </section>

      {/* Invitation planning */}
      <section>
        <h3 className="font-label text-sm font-semibold text-foreground-900 mb-4 flex items-center gap-2">
          <i className="ri-mail-send-line text-foreground-500" />
          Invitation planning
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-label text-foreground-600 mb-1.5">Invitation group</label>
            <select className="input-field" value={form.invitation_group || ''} onChange={(e) => onChange('invitation_group', e.target.value)}>
              <option value="">—</option>
              {INVITATION_GROUP_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-label text-foreground-600 mb-1.5">Invite preparation</label>
            <select className="input-field" value={form.invite_preparation_status || 'draft'} onChange={(e) => onChange('invite_preparation_status', e.target.value)}>
              {INVITE_STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-label text-foreground-600 mb-1.5">Plus-one</label>
            <select className="input-field" value={form.plus_one_status || 'none'} onChange={(e) => onChange('plus_one_status', e.target.value)}>
              {PLUS_ONE_STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          {(form.plus_one_status === 'named' || form.plus_one_status === 'allowed') && (
            <div>
              <label className="block text-xs font-label text-foreground-600 mb-1.5">Plus-one name</label>
              <input type="text" className="input-field" value={(form as unknown as Record<string, unknown>).plus_one_name as string || ''} onChange={(e) => onChange('plus_one_name', e.target.value)} placeholder="Full name of plus-one" />
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-6 mt-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.ceremony_invited !== false} onChange={(e) => onChange('ceremony_invited', e.target.checked)} className="w-4 h-4 rounded border-secondary-300 text-primary-500 focus:ring-primary-400" />
            <span className="text-sm text-foreground-700">Ceremony</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.reception_invited !== false} onChange={(e) => onChange('reception_invited', e.target.checked)} className="w-4 h-4 rounded border-secondary-300 text-primary-500 focus:ring-primary-400" />
            <span className="text-sm text-foreground-700">Reception</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.evening_invited !== false} onChange={(e) => onChange('evening_invited', e.target.checked)} className="w-4 h-4 rounded border-secondary-300 text-primary-500 focus:ring-primary-400" />
            <span className="text-sm text-foreground-700">Evening celebration</span>
          </label>
        </div>
      </section>

      {/* Household & Tags */}
      <section>
        <h3 className="font-label text-sm font-semibold text-foreground-900 mb-4 flex items-center gap-2">
          <i className="ri-home-4-line text-foreground-500" />
          Household &amp; Tags
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-label text-foreground-600 mb-1.5">Household</label>
            <select className="input-field" value={form.household_id || ''} onChange={(e) => onChange('household_id', e.target.value || null)}>
              <option value="">No household</option>
              {households.map((h) => <option key={h.id} value={h.id}>{h.display_name}</option>)}
            </select>
          </div>
        </div>
        {tags.length > 0 && (
          <div>
            <label className="block text-xs font-label text-foreground-600 mb-2">Tags</label>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => {
                const active = selectedTagIds.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => onTagToggle(tag.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-label transition-colors cursor-pointer whitespace-nowrap ${
                      active
                        ? tag.colour_key === 'primary'
                          ? 'bg-primary-500 text-white'
                          : tag.colour_key === 'accent'
                          ? 'bg-accent-500 text-white'
                          : 'bg-secondary-500 text-white'
                        : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'
                    }`}
                  >
                    {tag.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Requirements & Notes */}
      <section>
        <h3 className="font-label text-sm font-semibold text-foreground-900 mb-4 flex items-center gap-2">
          <i className="ri-sticky-note-line text-foreground-500" />
          Requirements &amp; Notes
        </h3>
        <p className="text-xs text-foreground-400 mb-3 italic">Only add information needed to support the guest. Restrict access to wedding collaborators who require it.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-label text-foreground-600 mb-1.5">Dietary notes</label>
            <textarea className="input-field min-h-[70px]" value={form.dietary_requirements || ''} onChange={(e) => onChange('dietary_requirements', e.target.value)} placeholder="Vegetarian, vegan, halal..." />
          </div>
          <div>
            <label className="block text-xs font-label text-foreground-600 mb-1.5">Allergy notes</label>
            <textarea className="input-field min-h-[70px]" value={form.allergy_notes || ''} onChange={(e) => onChange('allergy_notes', e.target.value)} placeholder="Nut allergy, lactose intolerant..." />
          </div>
          <div>
            <label className="block text-xs font-label text-foreground-600 mb-1.5">Accessibility notes</label>
            <textarea className="input-field min-h-[70px]" value={form.accessibility_notes || form.accessibility_needs || ''} onChange={(e) => onChange('accessibility_notes', e.target.value)} placeholder="Wheelchair access, hearing loop..." />
          </div>
          <div>
            <label className="block text-xs font-label text-foreground-600 mb-1.5">Mobility / Transport notes</label>
            <textarea className="input-field min-h-[70px]" value={form.mobility_transport_notes || ''} onChange={(e) => onChange('mobility_transport_notes', e.target.value)} placeholder="Requires transport, walking distance concerns..." />
          </div>
          <div>
            <label className="block text-xs font-label text-foreground-600 mb-1.5">Child-related notes</label>
            <textarea className="input-field min-h-[70px]" value={form.child_notes || ''} onChange={(e) => onChange('child_notes', e.target.value)} placeholder="High chair, kids'' meal..." />
          </div>
          <div>
            <label className="block text-xs font-label text-foreground-600 mb-1.5">Private internal notes</label>
            <textarea className="input-field min-h-[70px]" value={form.private_notes || ''} onChange={(e) => onChange('private_notes', e.target.value)} placeholder="Only visible to wedding organisers..." />
          </div>
        </div>
      </section>
    </div>
  );
}