import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '@/components/feature/AppShell';
import GuestFormFields from '@/components/feature/GuestFormFields';
import { supabase } from '@/lib/supabase';
import type { Guest, GuestHousehold, GuestTag } from '@/types/guest';
import { isDemoMode } from '@/demo/demoConfig';
import { useDemoDataSafe } from '@/demo/useDemoDataSafe';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { useGuestService } from '@/hooks/useGuestService';
import type { DemoGuest } from '@/demo/demoTypes';

// ── Adapter helpers ──

function demoHouseholdToGuestHousehold(h: { id: string; display_name: string; status: string }): GuestHousehold {
  return { id: h.id, wedding_id: '', display_name: h.display_name, invitation_delivery_method: 'email', status: h.status };
}

function deriveDemoTagsForForm(guest: Partial<DemoGuest>): { tags: GuestTag[]; selectedIds: string[] } {
  const allTags: GuestTag[] = [
    { id: 'tag-family', wedding_id: '', name: 'Family', colour_key: 'primary' },
    { id: 'tag-friends', wedding_id: '', name: 'Friends', colour_key: 'accent' },
    { id: 'tag-wedding-party', wedding_id: '', name: 'Wedding party', colour_key: 'primary' },
    { id: 'tag-work', wedding_id: '', name: 'Work', colour_key: 'secondary' },
    { id: 'tag-child', wedding_id: '', name: 'Child', colour_key: 'accent' },
    { id: 'tag-dietary', wedding_id: '', name: 'Dietary / Allergy', colour_key: 'secondary' },
    { id: 'tag-accessibility', wedding_id: '', name: 'Accessibility', colour_key: 'secondary' },
    { id: 'tag-vip', wedding_id: '', name: 'VIP', colour_key: 'primary' },
  ];

  const selected: string[] = [];
  if (guest.invitation_group === 'Family') selected.push('tag-family');
  if (guest.invitation_group === 'Friends') selected.push('tag-friends');
  if (guest.invitation_group === 'Wedding party' || guest.wedding_party_role) selected.push('tag-wedding-party');
  if (guest.invitation_group === 'Work') selected.push('tag-work');
  if (guest.guest_type === 'child') selected.push('tag-child');
  if (guest.dietary_requirements || guest.allergy_notes) selected.push('tag-dietary');
  if (guest.accessibility_needs || guest.accessibility_notes) selected.push('tag-accessibility');
  if (guest.wedding_party_role) selected.push('tag-vip');

  return { tags: allTags, selectedIds: selected };
}

function demoGuestToGuestForm(g: Partial<DemoGuest>): Partial<Guest> {
  return {
    full_name: g.full_name || '',
    last_name: g.last_name || '',
    preferred_name: g.preferred_name || '',
    title: g.title || '',
    guest_type: (g.guest_type as Guest['guest_type']) || 'adult',
    relationship_label: g.relationship_label || '',
    connection_group: g.connection_group || '',
    wedding_party_role: g.wedding_party_role || '',
    email: g.email || '',
    mobile_phone: g.mobile_phone || '',
    invitation_group: g.invitation_group || '',
    invite_preparation_status: (g.invite_preparation_status as Guest['invite_preparation_status']) || 'draft',
    ceremony_invited: g.ceremony_invited ?? true,
    reception_invited: g.reception_invited ?? true,
    evening_invited: g.evening_invited ?? true,
    plus_one_status: (g.plus_one_status as Guest['plus_one_status']) || 'none',
    dietary_requirements: g.dietary_requirements || '',
    allergy_notes: g.allergy_notes || '',
    accessibility_notes: g.accessibility_notes || g.accessibility_needs || '',
    mobility_transport_notes: g.mobility_transport_notes || '',
    child_notes: g.child_notes || '',
    private_notes: '',
    household_id: g.household_id || undefined,
    preferred_contact_method: (g.preferred_contact_method as Guest['preferred_contact_method']) || 'none',
    status: (g.status as Guest['status']) || 'active',
    pronouns: '',
    alternative_phone: '',
    address_line_1: '',
    address_line_2: '',
    city: '',
    county_or_region: '',
    postcode: '',
    country: 'United Kingdom',
    approved_additional_children: 0,
  };
}

function formToDemoGuest(form: Partial<Guest>, existing?: Partial<DemoGuest>): Partial<DemoGuest> {
  return {
    id: existing?.id || '',
    wedding_id: existing?.wedding_id || '',
    full_name: form.full_name || '',
    last_name: form.last_name || '',
    preferred_name: form.preferred_name || '',
    title: form.title || '',
    guest_type: (form.guest_type as DemoGuest['guest_type']) || 'adult',
    relationship_label: form.relationship_label || '',
    connection_group: form.connection_group || '',
    wedding_party_role: form.wedding_party_role || '',
    invitation_group: form.invitation_group || '',
    email: form.email || '',
    mobile_phone: form.mobile_phone || '',
    ceremony_invited: form.ceremony_invited ?? true,
    reception_invited: form.reception_invited ?? true,
    evening_invited: form.evening_invited ?? true,
    plus_one_status: (form.plus_one_status as DemoGuest['plus_one_status']) || 'none',
    named_plus_one_guest_id: '',
    plus_one_name: '',
    dietary_requirements: form.dietary_requirements || '',
    allergy_notes: form.allergy_notes || '',
    accessibility_notes: form.accessibility_notes || '',
    accessibility_needs: existing?.accessibility_needs || '',
    mobility_transport_notes: form.mobility_transport_notes || '',
    child_notes: form.child_notes || '',
    rsvp_status: (existing?.rsvp_status as DemoGuest['rsvp_status']) || 'pending',
    meal_choice: existing?.meal_choice || '',
    household_id: (form.household_id as string) || '',
    status: (form.status as DemoGuest['status']) || 'active',
    invite_preparation_status: form.invite_preparation_status || 'draft',
    preferred_contact_method: form.preferred_contact_method || 'email',
  };
}

// ── Demo Add Guest ──

function DemoAddGuestPage() {
  const navigate = useNavigate();
  const demo = useDemoDataSafe()!;
  const { state, addGuest, addDemoActivity, generateDemoId } = demo;

  const [form, setForm] = useState<Partial<Guest>>({
    full_name: '', last_name: '', preferred_name: '', title: '', guest_type: 'adult',
    relationship_label: '', connection_group: '', wedding_party_role: '',
    email: '', mobile_phone: '', alternative_phone: '', preferred_contact_method: 'none',
    invitation_group: '', invite_preparation_status: 'draft',
    ceremony_invited: true, reception_invited: true, evening_invited: true,
    plus_one_status: 'none', dietary_requirements: '', allergy_notes: '',
    accessibility_notes: '', mobility_transport_notes: '', child_notes: '', private_notes: '',
    household_id: undefined, status: 'active',
  });

  const households = state.households.map(demoHouseholdToGuestHousehold);
  const { tags, selectedIds } = deriveDemoTagsForForm({});
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(selectedIds);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleChange = (field: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.full_name?.trim()) errs.full_name = 'First name is required';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Invalid email format';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = (action: 'view' | 'addAnother') => {
    if (!validate()) return;
    setSaving(true);

    const newGuest: DemoGuest = {
      id: generateDemoId('demo-guest'),
      wedding_id: state.wedding.id,
      full_name: form.full_name || '',
      last_name: form.last_name || '',
      preferred_name: form.preferred_name || '',
      title: form.title || '',
      guest_type: (form.guest_type as DemoGuest['guest_type']) || 'adult',
      relationship_label: form.relationship_label || '',
      connection_group: form.connection_group || '',
      wedding_party_role: form.wedding_party_role || '',
      invitation_group: form.invitation_group || '',
      email: form.email || '',
      mobile_phone: form.mobile_phone || '',
      ceremony_invited: form.ceremony_invited ?? true,
      reception_invited: form.reception_invited ?? true,
      evening_invited: form.evening_invited ?? true,
      plus_one_status: (form.plus_one_status as DemoGuest['plus_one_status']) || 'none',
      named_plus_one_guest_id: '',
      plus_one_name: (form as Record<string, unknown>).plus_one_name as string || '',
      dietary_requirements: form.dietary_requirements || '',
      allergy_notes: form.allergy_notes || '',
      accessibility_notes: form.accessibility_notes || '',
      accessibility_needs: '',
      mobility_transport_notes: form.mobility_transport_notes || '',
      child_notes: form.child_notes || '',
      rsvp_status: 'pending',
      meal_choice: '',
      household_id: (form.household_id as string) || '',
      status: 'active',
      invite_preparation_status: form.invite_preparation_status || 'draft',
      preferred_contact_method: form.preferred_contact_method || 'none',
      tag_ids: selectedTagIds,
    };

    addGuest(newGuest);
    addDemoActivity({ id: generateDemoId('act'), timestamp: new Date().toISOString(), message: `${newGuest.full_name} ${newGuest.last_name} added to guest list`, category: 'guest', related_guest: newGuest.id, wedding_id: state.wedding.id });

    const displayName = newGuest.preferred_name || newGuest.full_name;

    setSaving(false);
    setFeedback({ type: 'success', message: `Demo: ${displayName} added` });

    setTimeout(() => {
      if (action === 'view') navigate(`/app/guests/${newGuest.id}`);
      else {
        setForm({ full_name: '', last_name: '', preferred_name: '', title: '', guest_type: 'adult', relationship_label: '', connection_group: '', wedding_party_role: '', email: '', mobile_phone: '', alternative_phone: '', preferred_contact_method: 'none', invitation_group: '', invite_preparation_status: 'draft', ceremony_invited: true, reception_invited: true, evening_invited: true, plus_one_status: 'none', dietary_requirements: '', allergy_notes: '', accessibility_notes: '', mobility_transport_notes: '', child_notes: '', private_notes: '', household_id: undefined, status: 'active' });
        setSelectedTagIds([]);
        setFeedback(null);
      }
    }, 500);
  };

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto">
        {feedback && <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-label ${feedback.type === 'success' ? 'bg-accent-50 text-accent-700 border border-accent-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{feedback.message}</div>}
        <div className="flex items-center justify-between mb-6">
          <div><h1 className="font-heading text-2xl text-foreground-900">Add guest</h1><p className="text-sm text-foreground-500 mt-1">Add one person to the guest list.</p></div>
          <button onClick={() => navigate(-1)} className="btn-ghost text-sm cursor-pointer whitespace-nowrap"><i className="ri-arrow-left-line mr-1.5" />Back</button>
        </div>
        <div className="card-default mb-6">
          <GuestFormFields form={form} onChange={handleChange} households={households} tags={tags} selectedTagIds={selectedTagIds} onTagToggle={(id) => setSelectedTagIds((prev) => prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id])} errors={fieldErrors} mode="add" />
        </div>
        <div className="flex flex-wrap items-center gap-3 justify-end">
          <button onClick={() => navigate('/app/guests')} className="btn-outline text-sm cursor-pointer whitespace-nowrap">Cancel</button>
          <button onClick={() => handleSave('addAnother')} disabled={saving} className="btn-outline text-sm cursor-pointer whitespace-nowrap">{saving ? <><i className="ri-loader-4-line animate-spin mr-1.5" />Saving...</> : <><i className="ri-add-line mr-1.5" />Save &amp; add another</>}</button>
          <button onClick={() => handleSave('view')} disabled={saving} className="btn-primary text-sm cursor-pointer whitespace-nowrap">{saving ? <><i className="ri-loader-4-line animate-spin mr-1.5" />Saving...</> : 'Save & view'}</button>
        </div>
      </div>
    </AppShell>
  );
}

// ── Original Supabase Add Guest ──

function NormalAddGuestPage() {
  const navigate = useNavigate();
  const svc = useGuestService();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [households, setHouseholds] = useState<GuestHousehold[]>([]);
  const [tags, setTags] = useState<GuestTag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [duplicateWarning, setDuplicateWarning] = useState<Guest[]>([]);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [pendingAction, setPendingAction] = useState<'view' | 'addAnother' | null>(null);

  const [form, setForm] = useState<Partial<Guest>>({
    full_name: '', last_name: '', preferred_name: '', title: '', pronouns: '', guest_type: 'adult',
    relationship_label: '', connection_group: '', wedding_party_role: '',
    email: '', mobile_phone: '', alternative_phone: '', preferred_contact_method: 'none',
    address_line_1: '', address_line_2: '', city: '', county_or_region: '', postcode: '', country: 'United Kingdom',
    invitation_group: '', invite_preparation_status: 'draft',
    ceremony_invited: true, reception_invited: true, evening_invited: true, plus_one_status: 'none',
    dietary_requirements: '', allergy_notes: '', accessibility_notes: '', mobility_transport_notes: '',
    child_notes: '', private_notes: '', household_id: undefined, status: 'active',
  });

  useEffect(() => {
    Promise.all([
      supabase.from('guest_households').select('*').eq('wedding_id', svc.weddingId).eq('status', 'active').order('display_name'),
      supabase.from('guest_tags').select('*').eq('wedding_id', svc.weddingId).order('name'),
    ]).then(([hRes, tRes]) => {
      setHouseholds((hRes.data || []) as GuestHousehold[]);
      setTags((tRes.data || []) as GuestTag[]);
    });
  }, [svc.weddingId]);

  const handleChange = (field: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.full_name?.trim()) errs.full_name = 'First name is required';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Invalid email format';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const persistGuest = async (action: 'view' | 'addAnother') => {
    // Remove id/wedding_id from payload
    const payload: Record<string, unknown> = { ...form };
    delete payload.id;
    delete payload.wedding_id;

    const newGuest = await svc.createGuest(payload as Partial<Guest>);
    if (!newGuest) { setError(svc.error || 'Failed to create guest'); setSaving(false); return; }

    // Assign tags
    if (selectedTagIds.length > 0) {
      await Promise.all(selectedTagIds.map((tid) => svc.assignTag(newGuest.id, tid)));
    }

    await svc.recordActivity('created', `${newGuest.full_name} ${newGuest.last_name || ''} added to guest list`, { guest_id: newGuest.id });

    setSaving(false);
    const displayName = newGuest.preferred_name || newGuest.full_name;
    setFeedback({ type: 'success', message: `${displayName} saved` });

    setTimeout(() => {
      if (action === 'view') navigate(`/app/guests/${newGuest.id}`);
      else {
        setForm({
          full_name: '', last_name: '', preferred_name: '', title: '', pronouns: '', guest_type: 'adult',
          relationship_label: '', connection_group: '', wedding_party_role: '',
          email: '', mobile_phone: '', alternative_phone: '', preferred_contact_method: 'none',
          address_line_1: '', address_line_2: '', city: '', county_or_region: '', postcode: '', country: 'United Kingdom',
          invitation_group: '', invite_preparation_status: 'draft',
          ceremony_invited: true, reception_invited: true, evening_invited: true, plus_one_status: 'none',
          dietary_requirements: '', allergy_notes: '', accessibility_notes: '', mobility_transport_notes: '',
          child_notes: '', private_notes: '', household_id: undefined, status: 'active',
        });
        setSelectedTagIds([]);
        setFeedback(null);
      }
    }, 500);
  };

  const handleSave = async (action: 'view' | 'addAnother') => {
    if (!validate()) return;
    setSaving(true);
    setError('');

    // Check duplicates
    const dup = await svc.checkDuplicates(form);
    if (dup.matches.length > 0) {
      setDuplicateWarning(dup.matches);
      setPendingAction(action);
      setShowDuplicateModal(true);
      setSaving(false);
      return;
    }

    await persistGuest(action);
  };

  const forceCreate = async () => {
    setShowDuplicateModal(false);
    setSaving(true);
    await persistGuest(pendingAction || 'view');
  };

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto">
        {feedback && <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-label ${feedback.type === 'success' ? 'bg-accent-50 text-accent-700 border border-accent-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{feedback.message}</div>}
        {error && <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 text-red-700 border border-red-200 text-sm">{error}</div>}
        <div className="flex items-center justify-between mb-6">
          <div><h1 className="font-heading text-2xl text-foreground-900">Add guest</h1><p className="text-sm text-foreground-500 mt-1">Add one person or start building a household.</p></div>
          <button onClick={() => navigate(-1)} className="btn-ghost text-sm cursor-pointer whitespace-nowrap"><i className="ri-arrow-left-line mr-1.5" />Back</button>
        </div>
        <div className="card-default mb-6">
          <GuestFormFields form={form} onChange={handleChange} households={households} tags={tags} selectedTagIds={selectedTagIds} onTagToggle={(id) => setSelectedTagIds((prev) => prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id])} errors={fieldErrors} mode="add" />
        </div>
        <div className="flex flex-wrap items-center gap-3 justify-end">
          <button onClick={() => navigate('/app/guests')} className="btn-outline text-sm cursor-pointer whitespace-nowrap">Cancel</button>
          <button onClick={() => handleSave('addAnother')} disabled={saving} className="btn-outline text-sm cursor-pointer whitespace-nowrap">{saving ? <><i className="ri-loader-4-line animate-spin mr-1.5" />Saving...</> : <><i className="ri-add-line mr-1.5" />Save &amp; add another</>}</button>
          <button onClick={() => handleSave('view')} disabled={saving} className="btn-primary text-sm cursor-pointer whitespace-nowrap">{saving ? <><i className="ri-loader-4-line animate-spin mr-1.5" />Saving...</> : 'Save & view'}</button>
        </div>

        {/* Duplicate warning modal */}
        {showDuplicateModal && (
          <>
            <div className="fixed inset-0 bg-black/30 z-50" onClick={() => setShowDuplicateModal(false)} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl" role="dialog" aria-modal="true">
                <div className="w-10 h-10 mx-auto flex items-center justify-center rounded-full bg-amber-100 text-amber-600 mb-4">
                  <i className="ri-error-warning-line text-lg" />
                </div>
                <h3 className="font-heading text-lg text-foreground-900 mb-2 text-center">Possible duplicates found</h3>
                <p className="text-sm text-foreground-500 mb-4 text-center">
                  {duplicateWarning.length} guest{duplicateWarning.length > 1 ? 's' : ''} with similar details already exist{duplicateWarning.length > 1 ? '' : 's'} in your guest list.
                </p>
                <div className="space-y-2 mb-5 max-h-40 overflow-y-auto">
                  {duplicateWarning.map((d) => (
                    <div key={d.id} className="flex items-center justify-between p-2.5 rounded-lg bg-background-50 border border-secondary-100">
                      <div>
                        <p className="text-sm text-foreground-800">{d.full_name} {d.last_name || ''}</p>
                        <p className="text-xs text-foreground-400">{d.email || d.mobile_phone || 'No contact'} &middot; {d.status}</p>
                      </div>
                      <button onClick={() => navigate(`/app/guests/${d.id}`)} className="text-xs text-primary-600 hover:text-primary-700 cursor-pointer whitespace-nowrap">View</button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-3 justify-end">
                  <button onClick={() => setShowDuplicateModal(false)} className="btn-outline text-sm cursor-pointer">Cancel</button>
                  <button onClick={forceCreate} className="btn-primary text-sm cursor-pointer">Create anyway</button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

export default function AddGuestPage() {
  const demoData = useDemoDataSafe();
  if (isDemoMode && demoData) return <DemoAddGuestPage />;
  return <NormalAddGuestPage />;
}