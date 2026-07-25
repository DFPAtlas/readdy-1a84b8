import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppShell from '@/components/feature/AppShell';
import { supabase } from '@/lib/supabase';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import type { Invitation, InvitationTemplate } from '@/types/invitation';
import { DELIVERY_METHOD_OPTIONS } from '@/types/invitation';

export default function EditInvitationPage() {
  const { invitationId } = useParams();
  const navigate = useNavigate();
  const { weddingId } = useActiveWedding();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [templates, setTemplates] = useState<InvitationTemplate[]>([]);

  const [form, setForm] = useState({
    internal_name: '',
    formal_recipient_name: '',
    informal_greeting: '',
    delivery_method: 'email',
    template_id: '',
    language_code: 'en-GB',
    rsvp_deadline: '',
    notes: '',
  });

  useEffect(() => {
    if (!invitationId) return;
    (async () => {
      const [invRes, tmplRes] = await Promise.all([
        supabase.from('invitations').select('*').eq('id', invitationId).eq('wedding_id', weddingId).maybeSingle(),
        supabase.from('invitation_templates').select('*').eq('wedding_id', weddingId).eq('status', 'active'),
      ]);
      if (!invRes.data) { setLoading(false); return; }
      setInvitation(invRes.data as Invitation);
      setTemplates((tmplRes.data || []) as InvitationTemplate[]);
      const d = invRes.data;
      setForm({
        internal_name: d.internal_name || '',
        formal_recipient_name: d.formal_recipient_name || '',
        informal_greeting: d.informal_greeting || '',
        delivery_method: d.delivery_method || 'email',
        template_id: d.template_id || '',
        language_code: d.language_code || 'en-GB',
        rsvp_deadline: d.rsvp_deadline || '',
        notes: d.notes || '',
      });
      setLoading(false);
    })();
  }, [invitationId]);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.internal_name.trim()) { setError('Invitation name is required'); return; }

    setSaving(true);
    const { error: dbErr } = await supabase.from('invitations').update({
      internal_name: form.internal_name.trim(),
      formal_recipient_name: form.formal_recipient_name.trim() || null,
      informal_greeting: form.informal_greeting.trim() || null,
      delivery_method: form.delivery_method,
      template_id: form.template_id || null,
      language_code: form.language_code,
      rsvp_deadline: form.rsvp_deadline || null,
      notes: form.notes.trim() || null,
      updated_at: new Date().toISOString(),
    }).eq('id', invitationId);

    if (dbErr) { setError(dbErr.message); setSaving(false); return; }

    await supabase.from('invitation_activity_log').insert({
      wedding_id: weddingId,
      invitation_id: invitationId,
      action: 'edited',
      summary: 'Invitation details updated',
    });

    setSaving(false);
    navigate(`/app/invitations/${invitationId}`);
  };

  if (loading) return <AppShell><div className="max-w-3xl mx-auto flex items-center justify-center py-20"><div className="flex items-center gap-3 text-foreground-500"><i className="ri-loader-4-line animate-spin text-xl" /><span className="text-sm">Loading invitation...</span></div></div></AppShell>;
  if (!invitation) return <AppShell><div className="max-w-3xl mx-auto text-center py-20"><p className="text-sm text-red-600 mb-4">Invitation not found</p><button onClick={() => navigate('/app/invitations')} className="btn-outline text-sm cursor-pointer">Back</button></div></AppShell>;

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-heading text-2xl text-foreground-900">Edit invitation</h1>
            <p className="text-sm text-foreground-500 mt-1">{invitation.internal_name}</p>
          </div>
          <button onClick={() => navigate(`/app/invitations/${invitationId}`)} className="btn-ghost text-sm cursor-pointer whitespace-nowrap"><i className="ri-arrow-left-line mr-1.5" />Cancel</button>
        </div>

        {error && <div className="mb-4 px-4 py-3 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200">{error}</div>}

        <form onSubmit={handleSave} className="space-y-6">
          <div className="card-default">
            <h2 className="font-label text-sm font-semibold text-foreground-900 mb-4">Invitation details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Invitation name *</label>
                <input type="text" value={form.internal_name} onChange={(e) => handleChange('internal_name', e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Formal recipient line</label>
                <input type="text" value={form.formal_recipient_name} onChange={(e) => handleChange('formal_recipient_name', e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Informal greeting</label>
                <input type="text" value={form.informal_greeting} onChange={(e) => handleChange('informal_greeting', e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Delivery method</label>
                <select value={form.delivery_method} onChange={(e) => handleChange('delivery_method', e.target.value)} className="input-field">
                  {DELIVERY_METHOD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Template</label>
                <select value={form.template_id} onChange={(e) => handleChange('template_id', e.target.value)} className="input-field">
                  <option value="">No template</option>
                  {templates.map((t) => <option key={t.id} value={t.id}>{t.name}{t.is_default ? ' (default)' : ''}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">RSVP deadline</label>
                <input type="date" value={form.rsvp_deadline} onChange={(e) => handleChange('rsvp_deadline', e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Language</label>
                <select value={form.language_code} onChange={(e) => handleChange('language_code', e.target.value)} className="input-field">
                  <option value="en-GB">English (UK)</option>
                  <option value="en-US">English (US)</option>
                  <option value="fr">French</option>
                  <option value="es">Spanish</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Internal notes</label>
                <textarea value={form.notes} onChange={(e) => handleChange('notes', e.target.value)} rows={3} className="input-field resize-y" placeholder="Notes for your reference only" />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={() => navigate(`/app/invitations/${invitationId}`)} className="btn-ghost text-sm cursor-pointer whitespace-nowrap">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary text-sm py-2.5 px-6 cursor-pointer whitespace-nowrap disabled:opacity-50">
              {saving ? <><i className="ri-loader-4-line animate-spin mr-1.5" />Saving...</> : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}