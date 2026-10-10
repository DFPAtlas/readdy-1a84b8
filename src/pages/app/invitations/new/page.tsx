import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '@/components/feature/AppShell';
import { isDemoMode } from '@/demo/demoConfig';
import { useDemoDataSafe } from '@/demo/useDemoDataSafe';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { supabase } from '@/lib/supabase';
import type { InvitationTemplate } from '@/types/invitation';
import { INVITATION_TYPE_OPTIONS, DELIVERY_METHOD_OPTIONS } from '@/types/invitation';

interface GuestOption { id: string; full_name: string; last_name?: string; preferred_name?: string; email?: string; mobile_phone?: string; household_id?: string; invitation_group?: string; has_active_invitation: boolean; }
interface HouseholdOption { id: string; display_name: string; member_count: number; has_active_invitation: boolean; }

// ── Demo mode — show demo-unavailable with helpful guidance ──

function DemoNewInvitationPage() {
  const navigate = useNavigate();
  const demo = useDemoDataSafe();

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-heading text-2xl text-foreground-900">Create invitation</h1>
            <p className="text-sm text-foreground-500 mt-1">Demo Mode</p>
          </div>
          <button onClick={() => navigate('/app/invitations')} className="btn-ghost text-sm cursor-pointer whitespace-nowrap"><i className="ri-arrow-left-line mr-1.5" />Back</button>
        </div>

        <div className="card-default text-center py-16">
          <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-amber-50 text-amber-500 mb-5">
            <i className="ri-information-line text-3xl" />
          </div>
          <h2 className="font-heading text-lg text-foreground-900 mb-3">Demo Mode</h2>
          <p className="text-sm text-foreground-500 max-w-md mx-auto mb-6 leading-relaxed">
            The invitation creator is not available in Demo Mode. Instead, you can preview the existing demo invitations for Emma &amp; James, which include a ready-to-send invitation for Oliver Bennett.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button onClick={() => navigate('/app/invitations')} className="btn-primary text-sm py-2.5 px-5 cursor-pointer whitespace-nowrap">
              <i className="ri-mail-send-line mr-1.5" />View demo invitations
            </button>
            <button onClick={() => navigate('/app/invitations/demo-inv-bennett/preview')} className="btn-outline text-sm py-2.5 px-5 cursor-pointer whitespace-nowrap">
              <i className="ri-eye-line mr-1.5" />Preview Oliver's invitation
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

// ── Normal mode — existing Supabase page ──

function NormalNewInvitationPage() {
  const navigate = useNavigate();
  const { weddingId } = useActiveWedding();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [templates, setTemplates] = useState<InvitationTemplate[]>([]);
  const [defaultTemplateId, setDefaultTemplateId] = useState<string>('');
  const [guestSearch, setGuestSearch] = useState('');
  const [householdSearch, setHouseholdSearch] = useState('');
  const [guests, setGuests] = useState<GuestOption[]>([]);
  const [households, setHouseholds] = useState<HouseholdOption[]>([]);

  const [step, setStep] = useState(1);
  const [recipientType, setRecipientType] = useState('individual');
  const [selectedGuestIds, setSelectedGuestIds] = useState<string[]>([]);
  const [selectedHouseholdId, setSelectedHouseholdId] = useState('');
  const [selectedHousehold, setSelectedHousehold] = useState<HouseholdOption | null>(null);

  const [form, setForm] = useState({
    internal_name: '',
    formal_recipient_name: '',
    informal_greeting: '',
    delivery_method: 'email',
    template_id: '',
    language_code: 'en-GB',
    rsvp_deadline: '',
    notes: '',
    ceremony: true, reception: true, evening: true, welcome: false, dayAfter: false,
    plus_one_allowed: false,
  });

  useEffect(() => {
    (async () => {
      const [tRes] = await Promise.all([
        supabase.from('invitation_templates').select('*').eq('wedding_id', weddingId).eq('status', 'active'),
      ]);
      const tmpls = (tRes.data || []) as InvitationTemplate[];
      setTemplates(tmpls);
      const def = tmpls.find((t) => t.is_default);
      setDefaultTemplateId(def?.id || tmpls[0]?.id || '');
      setForm((prev) => ({ ...prev, template_id: def?.id || tmpls[0]?.id || '' }));
    })();
  }, []);

  useEffect(() => {
    if (recipientType === 'household') {
      (async () => {
        let q = supabase.from('guest_households').select('id, display_name').eq('wedding_id', weddingId).eq('status', 'active');
        if (householdSearch) q = q.ilike('display_name', `%${householdSearch}%`);
        const { data } = await q.limit(20);
        const hhOpts: HouseholdOption[] = [];
        for (const h of (data || [])) {
          const { count } = await supabase.from('guests').select('id', { count: 'exact', head: true }).eq('household_id', h.id).eq('status', 'active');
          const { data: existingInv } = await supabase.from('invitations').select('id').eq('household_id', h.id).in('status', ['draft', 'ready', 'sent']);
          hhOpts.push({ id: h.id, display_name: h.display_name, member_count: count || 0, has_active_invitation: (existingInv || []).length > 0 });
        }
        setHouseholds(hhOpts);
      })();
    } else {
      (async () => {
        let q = supabase.from('guests').select('id, full_name, last_name, preferred_name, email, mobile_phone, household_id, invitation_group').eq('wedding_id', weddingId).eq('status', 'active');
        if (guestSearch) q = q.or(`full_name.ilike.%${guestSearch}%,last_name.ilike.%${guestSearch}%,preferred_name.ilike.%${guestSearch}%`);
        const { data } = await q.limit(20);
        const gOpts: GuestOption[] = [];
        for (const g of (data || [])) {
          const { data: existingRecip } = await supabase.from('invitation_recipients').select('id').eq('guest_id', g.id);
          gOpts.push({ ...g, has_active_invitation: (existingRecip || []).length > 0 });
        }
        setGuests(gOpts);
      })();
    }
  }, [recipientType, guestSearch, householdSearch]);

  const toggleGuest = (id: string) => {
    setSelectedGuestIds((prev) => prev.includes(id) ? prev.filter((gid) => gid !== id) : [...prev, id]);
  };

  const selectHousehold = async (id: string) => {
    setSelectedHouseholdId(id);
    const hh = households.find((h) => h.id === id);
    setSelectedHousehold(hh || null);
    if (hh) {
      setForm((prev) => ({
        ...prev,
        internal_name: prev.internal_name || `Invitation for ${hh.display_name}`,
        formal_recipient_name: prev.formal_recipient_name || hh.display_name,
      }));
    }
  };

  const selectedGuests = guests.filter((g) => selectedGuestIds.includes(g.id));

  const handleSave = async (status: string) => {
    if (!form.internal_name.trim()) { setError('Invitation name is required'); return; }
    if (recipientType === 'household' && !selectedHouseholdId) { setError('Please select a household'); return; }
    if (recipientType !== 'household' && selectedGuestIds.length === 0) { setError('Please select at least one guest'); return; }

    setSaving(true);
    const { data: invData, error: invErr } = await supabase.from('invitations').insert({
      wedding_id: weddingId,
      household_id: recipientType === 'household' ? selectedHouseholdId : null,
      invitation_type: recipientType,
      internal_name: form.internal_name.trim(),
      formal_recipient_name: form.formal_recipient_name.trim() || null,
      informal_greeting: form.informal_greeting.trim() || null,
      delivery_method: form.delivery_method,
      template_id: form.template_id || null,
      language_code: form.language_code,
      rsvp_deadline: form.rsvp_deadline || null,
      status,
      notes: form.notes.trim() || null,
    }).select('id').single();

    if (invErr) { setError(invErr.message); setSaving(false); return; }

    const recipientGuests = recipientType === 'household'
      ? (await supabase.from('guests').select('id').eq('household_id', selectedHouseholdId).eq('status', 'active')).data || []
      : selectedGuestIds.map((id) => ({ id }));

    if (recipientGuests.length > 0) {
      await supabase.from('invitation_recipients').insert(
        recipientGuests.map((g: { id: string }) => ({
          wedding_id: weddingId,
          invitation_id: invData.id,
          guest_id: g.id,
          recipient_role: 'guest',
          ceremony_included: form.ceremony,
          reception_included: form.reception,
          evening_included: form.evening,
          welcome_event_included: form.welcome,
          day_after_event_included: form.dayAfter,
          plus_one_allowed: form.plus_one_allowed,
        }))
      );
    }

    await supabase.from('invitation_activity_log').insert({
      wedding_id: weddingId,
      invitation_id: invData.id,
      action: 'created',
      summary: `Invitation "${form.internal_name}" created as ${status}`,
    });

    setSaving(false);
    navigate('/app/invitations');
  };

  const displayName = (g: GuestOption) => g.preferred_name || g.full_name || 'Unnamed';

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-heading text-2xl text-foreground-900">Create invitation</h1>
            <p className="text-sm text-foreground-500 mt-1">Step {step} of 4</p>
          </div>
          <button onClick={() => navigate('/app/invitations')} className="btn-ghost text-sm cursor-pointer whitespace-nowrap"><i className="ri-arrow-left-line mr-1.5" />Cancel</button>
        </div>

        <div className="flex gap-2 mb-6">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className={`flex-1 h-1.5 rounded-full ${s <= step ? 'bg-primary-500' : 'bg-secondary-200'}`} />
          ))}
        </div>

        {error && <div className="mb-4 px-4 py-3 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200">{error}</div>}

        {step === 1 && (
          <div className="card-default">
            <h2 className="font-label text-sm font-semibold text-foreground-900 mb-4">What type of invitation is this?</h2>
            <div className="space-y-3">
              {INVITATION_TYPE_OPTIONS.map((opt) => (
                <button key={opt.value} onClick={() => { setRecipientType(opt.value); setSelectedGuestIds([]); setSelectedHouseholdId(''); setSelectedHousehold(null); }} className={`w-full text-left p-4 rounded-lg border-2 transition-colors cursor-pointer ${recipientType === opt.value ? 'border-primary-500 bg-primary-50/30' : 'border-secondary-200 hover:border-secondary-300'}`}>
                  <p className="text-sm font-label font-semibold text-foreground-900">{opt.label}</p>
                  <p className="text-xs text-foreground-500 mt-0.5">
                    {opt.value === 'household' && 'One invitation for the whole household'}
                    {opt.value === 'individual' && 'One invitation per person'}
                    {opt.value === 'couple' && 'One invitation for two people'}
                    {opt.value === 'wedding_party' && 'Invitation for a wedding-party member'}
                    {opt.value === 'special' && 'Supplier or special attendee'}
                  </p>
                </button>
              ))}
            </div>
            <div className="mt-6 text-right">
              <button onClick={() => { setStep(2); setError(''); }} className="btn-primary text-sm py-2.5 px-6 cursor-pointer whitespace-nowrap">Continue</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="card-default">
            <h2 className="font-label text-sm font-semibold text-foreground-900 mb-4">
              {recipientType === 'household' ? 'Select a household' : 'Select guests'}
            </h2>

            {recipientType === 'household' ? (
              <>
                <input type="text" value={householdSearch} onChange={(e) => setHouseholdSearch(e.target.value)} placeholder="Search households..." className="input-field mb-3" />
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {households.map((h) => (
                    <button key={h.id} onClick={() => selectHousehold(h.id)} className={`w-full text-left p-3 rounded-lg border transition-colors cursor-pointer ${selectedHouseholdId === h.id ? 'border-primary-500 bg-primary-50/30' : 'border-secondary-200 hover:border-secondary-300'}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-label text-foreground-900">{h.display_name}</p>
                          <p className="text-xs text-foreground-500">{h.member_count} member{h.member_count !== 1 ? 's' : ''}</p>
                        </div>
                        {h.has_active_invitation && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">Has active invitation</span>}
                      </div>
                    </button>
                  ))}
                  {households.length === 0 && <p className="text-sm text-foreground-400 text-center py-4">No households found.</p>}
                </div>
              </>
            ) : (
              <>
                <input type="text" value={guestSearch} onChange={(e) => setGuestSearch(e.target.value)} placeholder="Search guests by name..." className="input-field mb-3" />
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {guests.map((g) => (
                    <button key={g.id} onClick={() => toggleGuest(g.id)} className={`w-full text-left p-3 rounded-lg border transition-colors cursor-pointer ${selectedGuestIds.includes(g.id) ? 'border-primary-500 bg-primary-50/30' : 'border-secondary-200 hover:border-secondary-300'}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-label text-foreground-900">{displayName(g)} {g.last_name}</p>
                          <p className="text-xs text-foreground-500">
                            {[g.email, g.mobile_phone].filter(Boolean).join(' · ') || 'No contact'}
                            {g.invitation_group ? ` · ${g.invitation_group}` : ''}
                          </p>
                        </div>
                        {g.has_active_invitation && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">Has invitation</span>}
                      </div>
                    </button>
                  ))}
                  {guests.length === 0 && <p className="text-sm text-foreground-400 text-center py-4">No guests found. <button onClick={() => navigate('/app/guests/new')} className="text-primary-600 cursor-pointer">Add a guest</button> first.</p>}
                </div>
                {selectedGuestIds.length > 0 && (
                  <p className="text-xs text-primary-600 mt-2">{selectedGuestIds.length} guest{selectedGuestIds.length !== 1 ? 's' : ''} selected</p>
                )}
              </>
            )}

            <div className="flex items-center justify-between mt-6">
              <button onClick={() => setStep(1)} className="btn-ghost text-sm cursor-pointer whitespace-nowrap"><i className="ri-arrow-left-line mr-1.5" />Back</button>
              <button onClick={() => { if ((recipientType === 'household' && selectedHouseholdId) || (recipientType !== 'household' && selectedGuestIds.length > 0)) { setStep(3); setError(''); } else { setError('Please select at least one recipient'); } }} className="btn-primary text-sm py-2.5 px-6 cursor-pointer whitespace-nowrap">Continue</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div className="card-default">
              <h2 className="font-label text-sm font-semibold text-foreground-900 mb-4">Invitation details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Invitation name *</label>
                  <input type="text" value={form.internal_name} onChange={(e) => { setForm((p) => ({ ...p, internal_name: e.target.value })); setError(''); }} placeholder="e.g. Family invitation — Patel household" className="input-field" />
                </div>
                <div>
                  <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Formal recipient line</label>
                  <input type="text" value={form.formal_recipient_name} onChange={(e) => setForm((p) => ({ ...p, formal_recipient_name: e.target.value }))} placeholder="e.g. Mr and Mrs Patel and Family" className="input-field" />
                </div>
                <div>
                  <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Informal greeting</label>
                  <input type="text" value={form.informal_greeting} onChange={(e) => setForm((p) => ({ ...p, informal_greeting: e.target.value }))} placeholder="e.g. Dear Priya and family" className="input-field" />
                </div>
                <div>
                  <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Delivery method</label>
                  <select value={form.delivery_method} onChange={(e) => setForm((p) => ({ ...p, delivery_method: e.target.value }))} className="input-field">
                    {DELIVERY_METHOD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Template</label>
                  <select value={form.template_id} onChange={(e) => setForm((p) => ({ ...p, template_id: e.target.value }))} className="input-field">
                    <option value="">No template</option>
                    {templates.map((t) => <option key={t.id} value={t.id}>{t.name} {t.is_default ? '(default)' : ''}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">RSVP deadline</label>
                  <input type="date" value={form.rsvp_deadline} onChange={(e) => setForm((p) => ({ ...p, rsvp_deadline: e.target.value }))} className="input-field" />
                </div>
                <div>
                  <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Language</label>
                  <select value={form.language_code} onChange={(e) => setForm((p) => ({ ...p, language_code: e.target.value }))} className="input-field">
                    <option value="en-GB">English (UK)</option>
                    <option value="en-US">English (US)</option>
                    <option value="fr">French</option>
                    <option value="es">Spanish</option>
                    <option value="de">German</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Internal notes</label>
                  <textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={2} className="input-field resize-y" placeholder="Notes for your reference only" />
                </div>
              </div>
            </div>

            <div className="card-default">
              <h2 className="font-label text-sm font-semibold text-foreground-900 mb-4">Included events</h2>
              <div className="space-y-3">
                {[
                  { key: 'ceremony', label: 'Ceremony', icon: 'ri-heart-line' },
                  { key: 'reception', label: 'Reception', icon: 'ri-restaurant-line' },
                  { key: 'evening', label: 'Evening celebration', icon: 'ri-moon-line' },
                  { key: 'welcome', label: 'Welcome event', icon: 'ri-cup-line' },
                  { key: 'dayAfter', label: 'Day-after event', icon: 'ri-sun-line' },
                ].map((ev) => (
                  <label key={ev.key} className="flex items-center gap-3 p-3 rounded-lg border border-secondary-200 cursor-pointer hover:border-secondary-300 transition-colors">
                    <input type="checkbox" checked={Boolean(form[ev.key as keyof typeof form])} onChange={(e) => setForm((p) => ({ ...p, [ev.key]: e.target.checked }))} className="cursor-pointer" />
                    <i className={`${ev.icon} text-foreground-500`} />
                    <span className="text-sm text-foreground-700">{ev.label}</span>
                  </label>
                ))}
              </div>
              <label className="flex items-center gap-3 mt-4 p-3 rounded-lg border border-secondary-200 cursor-pointer hover:border-secondary-300 transition-colors">
                <input type="checkbox" checked={form.plus_one_allowed} onChange={(e) => setForm((p) => ({ ...p, plus_one_allowed: e.target.checked }))} className="cursor-pointer" />
                <i className="ri-user-add-line text-foreground-500" />
                <span className="text-sm text-foreground-700">Allow plus-one</span>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <button onClick={() => setStep(2)} className="btn-ghost text-sm cursor-pointer whitespace-nowrap"><i className="ri-arrow-left-line mr-1.5" />Back</button>
              <button onClick={() => { setStep(4); setError(''); }} className="btn-primary text-sm py-2.5 px-6 cursor-pointer whitespace-nowrap">Review</button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="card-default">
            <h2 className="font-label text-sm font-semibold text-foreground-900 mb-4">Review invitation</h2>

            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-xs text-foreground-500">Type</p><p className="text-foreground-900 capitalize">{recipientType}</p></div>
                <div><p className="text-xs text-foreground-500">Name</p><p className="text-foreground-900">{form.internal_name || '—'}</p></div>
                <div><p className="text-xs text-foreground-500">Recipient</p><p className="text-foreground-900">{form.formal_recipient_name || selectedHousehold?.display_name || selectedGuests.map((g) => displayName(g)).join(', ') || '—'}</p></div>
                <div><p className="text-xs text-foreground-500">Delivery</p><p className="text-foreground-900 capitalize">{form.delivery_method}</p></div>
                <div><p className="text-xs text-foreground-500">Template</p><p className="text-foreground-900">{templates.find((t) => t.id === form.template_id)?.name || 'None'}</p></div>
                <div><p className="text-xs text-foreground-500">RSVP deadline</p><p className="text-foreground-900">{form.rsvp_deadline ? new Date(form.rsvp_deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Not set'}</p></div>
              </div>

              <div>
                <p className="text-xs text-foreground-500 mb-1">Included events</p>
                <div className="flex flex-wrap gap-1.5">
                  {form.ceremony && <span className="px-2 py-0.5 rounded text-xs bg-accent-100 text-accent-700">Ceremony</span>}
                  {form.reception && <span className="px-2 py-0.5 rounded text-xs bg-primary-100 text-primary-700">Reception</span>}
                  {form.evening && <span className="px-2 py-0.5 rounded text-xs bg-secondary-100 text-secondary-700">Evening</span>}
                  {form.welcome && <span className="px-2 py-0.5 rounded text-xs bg-secondary-100 text-secondary-700">Welcome</span>}
                  {form.dayAfter && <span className="px-2 py-0.5 rounded text-xs bg-secondary-100 text-secondary-700">Day after</span>}
                  {form.plus_one_allowed && <span className="px-2 py-0.5 rounded text-xs bg-accent-100 text-accent-700">+1 allowed</span>}
                </div>
              </div>

              {recipientType !== 'household' && selectedGuests.length > 0 && (
                <div>
                  <p className="text-xs text-foreground-500 mb-1">Selected guests ({selectedGuests.length})</p>
                  <div className="space-y-1">
                    {selectedGuests.map((g) => (
                      <div key={g.id} className="text-sm text-foreground-700">{displayName(g)} {g.last_name} {g.has_active_invitation && <span className="text-[10px] text-amber-600 ml-1">(has existing invitation)</span>}</div>
                    ))}
                  </div>
                </div>
              )}

              {!form.internal_name && <p className="text-xs text-amber-600">Missing invitation name</p>}
              {!form.template_id && <p className="text-xs text-amber-600">No template selected</p>}
            </div>

            <div className="flex items-center justify-between mt-6 pt-4 border-t border-secondary-100">
              <button onClick={() => setStep(3)} className="btn-ghost text-sm cursor-pointer whitespace-nowrap"><i className="ri-arrow-left-line mr-1.5" />Back</button>
              <div className="flex items-center gap-2">
                <button onClick={() => handleSave('draft')} disabled={saving} className="btn-outline text-sm cursor-pointer whitespace-nowrap">{saving ? 'Saving...' : 'Save draft'}</button>
                <button onClick={() => handleSave('ready')} disabled={saving} className="btn-primary text-sm py-2.5 px-5 cursor-pointer whitespace-nowrap">{saving ? 'Saving...' : 'Save & mark ready'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

// ── Export ──

export default function NewInvitationPage() {
  if (isDemoMode) return <DemoNewInvitationPage />;
  return <NormalNewInvitationPage />;
}