import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppShell from '@/components/feature/AppShell';
import { supabase } from '@/lib/supabase';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import type { Guest, GuestHousehold } from '@/types/guest';
import { DELIVERY_METHOD_OPTIONS } from '@/types/guest';

export default function HouseholdNewEditPage() {
  const { householdId } = useParams();
  const navigate = useNavigate();
  const { weddingId } = useActiveWedding();
  const isEdit = !!householdId;
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [members, setMembers] = useState<Guest[]>([]);
  const [availableGuests, setAvailableGuests] = useState<Guest[]>([]);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [form, setForm] = useState({
    display_name: '',
    formal_invitation_name: '',
    informal_greeting: '',
    shared_email: '',
    shared_phone: '',
    address_line_1: '',
    address_line_2: '',
    city: '',
    county_or_region: '',
    postcode: '',
    country: 'United Kingdom',
    invitation_delivery_method: 'undecided',
    notes: '',
    status: 'active',
  });

  useEffect(() => {
    const load = async () => {
      const guestsRes = await supabase.from('guests').select('*').eq('wedding_id', weddingId).eq('status', 'active').order('full_name');
      setAvailableGuests((guestsRes.data || []) as Guest[]);

      if (isEdit && householdId) {
        const hRes = await supabase.from('guest_households').select('*').eq('id', householdId).eq('wedding_id', weddingId).maybeSingle();
        if (hRes.data) {
          const h = hRes.data;
          setForm({
            display_name: h.display_name || '',
            formal_invitation_name: h.formal_invitation_name || '',
            informal_greeting: h.informal_greeting || '',
            shared_email: h.shared_email || '',
            shared_phone: h.shared_phone || '',
            address_line_1: h.address_line_1 || '',
            address_line_2: h.address_line_2 || '',
            city: h.city || '',
            county_or_region: h.county_or_region || '',
            postcode: h.postcode || '',
            country: h.country || 'United Kingdom',
            invitation_delivery_method: h.invitation_delivery_method || 'undecided',
            notes: h.notes || '',
            status: h.status || 'active',
          });
        }
        const mRes = await supabase.from('guests').select('*').eq('household_id', householdId).eq('wedding_id', weddingId).order('full_name');
        setMembers((mRes.data || []) as Guest[]);
      }
      setLoading(false);
    };
    load();
  }, [isEdit, householdId]);

  const update = (field: string, value: string) => setForm((p) => ({ ...p, [field]: value }));

  const addMember = (guestId: string) => {
    const guest = availableGuests.find((g) => g.id === guestId);
    if (!guest || members.find((m) => m.id === guestId)) return;
    setMembers([...members, guest]);
  };

  const removeMember = (guestId: string) => setMembers(members.filter((m) => m.id !== guestId));

  const handleSave = async () => {
    if (!form.display_name.trim()) { setError('Display name is required'); return; }
    setSaving(true);
    setError('');

    if (isEdit && householdId) {
      const { error: e } = await supabase.from('guest_households').update(form).eq('id', householdId).eq('wedding_id', weddingId);
      if (e) { setError(e.message); setSaving(false); return; }
      await supabase.from('guests').update({ household_id: null }).eq('household_id', householdId).eq('wedding_id', weddingId);
    } else {
      const { data, error: e } = await supabase.from('guest_households').insert({ ...form, wedding_id: weddingId }).select('id').single();
      if (e) { setError(e.message); setSaving(false); return; }
    }

    const targetId = householdId || '';
    if (members.length > 0) {
      await supabase.from('guests').update({ household_id: targetId }).in('id', members.map((m) => m.id)).eq('wedding_id', weddingId);
    }

    setSaving(false);
    setFeedback({ type: 'success', message: isEdit ? 'Household updated' : 'Household created' });
    setTimeout(() => navigate(targetId ? `/app/guests/households/${targetId}` : '/app/guests/households'), 500);
  };

  if (loading) return <AppShell><div className="max-w-3xl mx-auto flex items-center justify-center py-20"><div className="flex items-center gap-3 text-foreground-500"><i className="ri-loader-4-line animate-spin text-xl" /><span className="text-sm">Loading...</span></div></div></AppShell>;

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto">
        {feedback && <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-label ${feedback.type === 'success' ? 'bg-accent-50 text-accent-700 border border-accent-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{feedback.message}</div>}
        {error && <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 text-red-700 border border-red-200 text-sm">{error}</div>}

        <div className="flex items-center justify-between mb-6">
          <h1 className="font-heading text-2xl text-foreground-900">{isEdit ? 'Edit household' : 'Add household'}</h1>
          <button onClick={() => navigate(isEdit ? `/app/guests/households/${householdId}` : '/app/guests/households')} className="btn-ghost text-sm cursor-pointer whitespace-nowrap"><i className="ri-arrow-left-line mr-1.5" />Back</button>
        </div>

        <div className="card-default space-y-6">
          <section>
            <h3 className="font-label text-sm font-semibold text-foreground-900 mb-4">Household information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-label text-foreground-600 mb-1.5">Display name <span className="text-red-500">*</span></label>
                <input type="text" className="input-field" value={form.display_name} onChange={(e) => update('display_name', e.target.value)} placeholder="e.g. The Patel Family" />
              </div>
              <div>
                <label className="block text-xs font-label text-foreground-600 mb-1.5">Formal invitation name</label>
                <input type="text" className="input-field" value={form.formal_invitation_name} onChange={(e) => update('formal_invitation_name', e.target.value)} placeholder="e.g. Mr and Mrs Patel and Family" />
              </div>
              <div>
                <label className="block text-xs font-label text-foreground-600 mb-1.5">Informal greeting</label>
                <input type="text" className="input-field" value={form.informal_greeting} onChange={(e) => update('informal_greeting', e.target.value)} placeholder="e.g. The Patels" />
              </div>
              <div>
                <label className="block text-xs font-label text-foreground-600 mb-1.5">Delivery method</label>
                <select className="input-field" value={form.invitation_delivery_method} onChange={(e) => update('invitation_delivery_method', e.target.value)}>
                  {DELIVERY_METHOD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-label text-foreground-600 mb-1.5">Shared email</label>
                <input type="email" className="input-field" value={form.shared_email} onChange={(e) => update('shared_email', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-label text-foreground-600 mb-1.5">Shared phone</label>
                <input type="tel" className="input-field" value={form.shared_phone} onChange={(e) => update('shared_phone', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              <div><label className="block text-xs font-label text-foreground-600 mb-1.5">Address line 1</label><input type="text" className="input-field" value={form.address_line_1} onChange={(e) => update('address_line_1', e.target.value)} /></div>
              <div><label className="block text-xs font-label text-foreground-600 mb-1.5">Address line 2</label><input type="text" className="input-field" value={form.address_line_2} onChange={(e) => update('address_line_2', e.target.value)} /></div>
              <div><label className="block text-xs font-label text-foreground-600 mb-1.5">Town / City</label><input type="text" className="input-field" value={form.city} onChange={(e) => update('city', e.target.value)} /></div>
              <div><label className="block text-xs font-label text-foreground-600 mb-1.5">County</label><input type="text" className="input-field" value={form.county_or_region} onChange={(e) => update('county_or_region', e.target.value)} /></div>
              <div><label className="block text-xs font-label text-foreground-600 mb-1.5">Postcode</label><input type="text" className="input-field" value={form.postcode} onChange={(e) => update('postcode', e.target.value)} /></div>
              <div><label className="block text-xs font-label text-foreground-600 mb-1.5">Country</label><input type="text" className="input-field" value={form.country} onChange={(e) => update('country', e.target.value)} /></div>
            </div>
            <div className="mt-4">
              <label className="block text-xs font-label text-foreground-600 mb-1.5">Notes</label>
              <textarea className="input-field min-h-[70px]" value={form.notes} onChange={(e) => update('notes', e.target.value)} />
            </div>
          </section>

          <section>
            <h3 className="font-label text-sm font-semibold text-foreground-900 mb-4">Members ({members.length})</h3>
            <div className="flex gap-2 mb-4">
              <select className="input-field text-sm flex-1" onChange={(e) => { if (e.target.value) { addMember(e.target.value); e.target.value = ''; } }}>
                <option value="">Add existing guest...</option>
                {availableGuests.filter((g) => !members.find((m) => m.id === g.id)).map((g) => (
                  <option key={g.id} value={g.id}>{g.full_name} {g.last_name} {g.relationship_label ? `(${g.relationship_label})` : ''}</option>
                ))}
              </select>
            </div>
            {members.length === 0 ? (
              <p className="text-sm text-foreground-400">No members yet. Add guests or <button onClick={() => navigate('/app/guests/new')} className="text-primary-600 hover:text-primary-700 cursor-pointer">create a new guest</button>.</p>
            ) : (
              <div className="space-y-2">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center justify-between px-3 py-2 bg-background-50 rounded-lg">
                    <span className="text-sm text-foreground-700">{m.preferred_name || m.full_name} {m.last_name} {m.guest_type === 'child' && <span className="text-xs text-accent-600 ml-1">(Child)</span>}</span>
                    <button onClick={() => removeMember(m.id)} className="text-xs text-red-500 hover:text-red-600 cursor-pointer">Remove</button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="flex items-center gap-3 justify-end mt-6">
          <button onClick={() => navigate(isEdit ? `/app/guests/households/${householdId}` : '/app/guests/households')} className="btn-outline text-sm cursor-pointer whitespace-nowrap">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary text-sm cursor-pointer whitespace-nowrap">
            {saving ? <><i className="ri-loader-4-line animate-spin mr-1.5" />Saving...</> : (isEdit ? 'Save changes' : 'Create household')}
          </button>
        </div>
      </div>
    </AppShell>
  );
}