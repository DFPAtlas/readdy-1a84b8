import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppShell from '@/components/feature/AppShell';
import GuestFormFields from '@/components/feature/GuestFormFields';
import { supabase } from '@/lib/supabase';
import type { Guest, GuestHousehold, GuestTag } from '@/types/guest';
import { isDemoMode } from '@/demo/demoConfig';
import { useDemoDataSafe } from '@/demo/useDemoDataSafe';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import type { DemoGuest } from '@/demo/demoTypes';

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

function demoGuestToGuestForm(g: DemoGuest): Partial<Guest> {
  return {
    full_name: g.full_name, last_name: g.last_name, preferred_name: g.preferred_name, title: g.title,
    guest_type: g.guest_type as Guest['guest_type'],
    relationship_label: g.relationship_label, connection_group: g.connection_group,
    wedding_party_role: g.wedding_party_role, email: g.email, mobile_phone: g.mobile_phone,
    invitation_group: g.invitation_group,
    invite_preparation_status: g.invite_preparation_status as Guest['invite_preparation_status'],
    ceremony_invited: g.ceremony_invited, reception_invited: g.reception_invited,
    evening_invited: g.evening_invited,
    plus_one_status: g.plus_one_status as Guest['plus_one_status'],
    dietary_requirements: g.dietary_requirements, allergy_notes: g.allergy_notes,
    accessibility_notes: g.accessibility_notes || g.accessibility_needs,
    mobility_transport_notes: g.mobility_transport_notes, child_notes: g.child_notes,
    household_id: g.household_id || undefined,
    preferred_contact_method: g.preferred_contact_method as Guest['preferred_contact_method'],
    status: g.status as Guest['status'],
  };
}

// ── Demo Edit Guest ──

function DemoEditGuestPage() {
  const { guestId } = useParams();
  const navigate = useNavigate();
  const demo = useDemoDataSafe()!;
  const { state, updateGuest, addDemoActivity, generateDemoId } = demo;

  const guest = useMemo(() => state.guests.find((g) => g.id === guestId), [state.guests, guestId]);
  const households = state.households.map(demoHouseholdToGuestHousehold);

  const [form, setForm] = useState<Partial<Guest>>(() => guest ? demoGuestToGuestForm(guest) : {});
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(() => {
    if (!guest) return [];
    return deriveDemoTagsForForm(guest).selectedIds;
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!guest) {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto text-center py-20">
          <p className="text-sm text-red-600 mb-4">Guest not found</p>
          <button onClick={() => navigate('/app/guests')} className="btn-outline text-sm cursor-pointer">Back to guests</button>
        </div>
      </AppShell>
    );
  }

  const { tags } = deriveDemoTagsForForm(guest);

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

  const handleSave = () => {
    if (!validate() || !guestId) return;
    setSaving(true);

    updateGuest(guestId, {
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
      plus_one_name: (form as Record<string, unknown>).plus_one_name as string || '',
      dietary_requirements: form.dietary_requirements || '',
      allergy_notes: form.allergy_notes || '',
      accessibility_notes: form.accessibility_notes || '',
      mobility_transport_notes: form.mobility_transport_notes || '',
      child_notes: form.child_notes || '',
      household_id: (form.household_id as string) || '',
      invite_preparation_status: form.invite_preparation_status || 'draft',
      preferred_contact_method: form.preferred_contact_method || 'none',
      tag_ids: selectedTagIds,
    });

    addDemoActivity({ id: generateDemoId('act'), timestamp: new Date().toISOString(), message: `${form.full_name} ${form.last_name}'s details updated`, category: 'guest', related_guest: guestId, wedding_id: state.wedding.id });

    setSaving(false);
    setFeedback({ type: 'success', message: 'Demo: Guest updated' });
    setTimeout(() => navigate(`/app/guests/${guestId}`), 500);
  };

  const displayName = form.preferred_name || form.full_name || 'Guest';

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto">
        {feedback && <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-label ${feedback.type === 'success' ? 'bg-accent-50 text-accent-700 border border-accent-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{feedback.message}</div>}
        <div className="flex items-center justify-between mb-6">
          <div><h1 className="font-heading text-2xl text-foreground-900">Edit guest</h1><p className="text-sm text-foreground-500 mt-1">{displayName} {form.last_name}</p></div>
          <button onClick={() => navigate(`/app/guests/${guestId}`)} className="btn-ghost text-sm cursor-pointer whitespace-nowrap"><i className="ri-arrow-left-line mr-1.5" />Back</button>
        </div>
        <div className="card-default mb-6">
          <GuestFormFields form={form} onChange={handleChange} households={households} tags={tags} selectedTagIds={selectedTagIds} onTagToggle={(id) => setSelectedTagIds((prev) => prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id])} errors={fieldErrors} mode="edit" />
        </div>
        <div className="flex items-center gap-3 justify-end">
          <button onClick={() => navigate(`/app/guests/${guestId}`)} className="btn-outline text-sm cursor-pointer whitespace-nowrap">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary text-sm cursor-pointer whitespace-nowrap">{saving ? <><i className="ri-loader-4-line animate-spin mr-1.5" />Saving...</> : 'Save changes'}</button>
        </div>
      </div>
    </AppShell>
  );
}

// ── Original Supabase Edit Guest ──

function NormalEditGuestPage() {
  const { guestId } = useParams();
  const navigate = useNavigate();
  const { weddingId } = useActiveWedding();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<Partial<Guest>>({});
  const [households, setHouseholds] = useState<GuestHousehold[]>([]);
  const [tags, setTags] = useState<GuestTag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (!guestId) return;
    let cancelled = false;
    const fetchAll = async () => {
      try {
        const [gRes, hRes, tRes, taRes] = await Promise.all([
          supabase.from('guests').select('*').eq('id', guestId).eq('wedding_id', weddingId).maybeSingle(),
          supabase.from('guest_households').select('*').eq('wedding_id', weddingId).eq('status', 'active').order('display_name'),
          supabase.from('guest_tags').select('*').eq('wedding_id', weddingId).order('name'),
          supabase.from('guest_tag_assignments').select('tag_id').eq('guest_id', guestId),
        ]);
        if (cancelled) return;
        if (gRes.error) throw gRes.error;
        if (!gRes.data) { setError('Guest not found'); setLoading(false); return; }
        setForm(gRes.data as Guest);
        setHouseholds((hRes.data || []) as GuestHousehold[]);
        setTags((tRes.data || []) as GuestTag[]);
        setSelectedTagIds((taRes.data || []).map((t: { tag_id: string }) => t.tag_id));
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchAll();
    return () => { cancelled = true; };
  });

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

  const handleSave = async () => {
    if (!validate() || !guestId) return;
    setSaving(true);
    const { error: e } = await supabase.from('guests').update(form).eq('id', guestId).eq('wedding_id', weddingId);
    if (e) { setError(e.message); setSaving(false); return; }
    await supabase.from('guest_tag_assignments').delete().eq('guest_id', guestId);
    if (selectedTagIds.length > 0) await supabase.from('guest_tag_assignments').insert(selectedTagIds.map((tid) => ({ wedding_id: weddingId, guest_id: guestId, tag_id: tid })));
    setSaving(false);
    setFeedback({ type: 'success', message: 'Guest updated' });
    setTimeout(() => navigate(`/app/guests/${guestId}`), 500);
  };

  if (loading) return <AppShell><div className="max-w-4xl mx-auto flex items-center justify-center py-20"><div className="flex items-center gap-3 text-foreground-500"><i className="ri-loader-4-line animate-spin text-xl" /><span className="text-sm">Loading...</span></div></div></AppShell>;
  if (error) return <AppShell><div className="max-w-4xl mx-auto text-center py-20"><p className="text-sm text-red-600 mb-4">{error}</p><button onClick={() => navigate('/app/guests')} className="btn-outline text-sm cursor-pointer">Back to guests</button></div></AppShell>;

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto">
        {feedback && <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-label ${feedback.type === 'success' ? 'bg-accent-50 text-accent-700 border border-accent-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{feedback.message}</div>}
        <div className="flex items-center justify-between mb-6">
          <div><h1 className="font-heading text-2xl text-foreground-900">Edit guest</h1><p className="text-sm text-foreground-500 mt-1">{form.preferred_name || form.full_name} {form.last_name}</p></div>
          <button onClick={() => navigate(`/app/guests/${guestId}`)} className="btn-ghost text-sm cursor-pointer whitespace-nowrap"><i className="ri-arrow-left-line mr-1.5" />Back</button>
        </div>
        <div className="card-default mb-6">
          <GuestFormFields form={form} onChange={handleChange} households={households} tags={tags} selectedTagIds={selectedTagIds} onTagToggle={(id) => setSelectedTagIds((prev) => prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id])} errors={fieldErrors} mode="edit" />
        </div>
        <div className="flex items-center gap-3 justify-end">
          <button onClick={() => navigate(`/app/guests/${guestId}`)} className="btn-outline text-sm cursor-pointer whitespace-nowrap">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary text-sm cursor-pointer whitespace-nowrap">{saving ? <><i className="ri-loader-4-line animate-spin mr-1.5" />Saving...</> : 'Save changes'}</button>
        </div>
      </div>
    </AppShell>
  );
}

export default function EditGuestPage() {
  const demoData = useDemoDataSafe();
  if (isDemoMode && demoData) return <DemoEditGuestPage />;
  return <NormalEditGuestPage />;
}