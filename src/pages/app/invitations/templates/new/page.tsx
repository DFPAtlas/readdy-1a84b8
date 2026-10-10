import type * as React from "react";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '@/components/feature/AppShell';
import { supabase } from '@/lib/supabase';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { STYLE_PRESET_OPTIONS, TEMPLATE_TYPE_OPTIONS, TOKEN_LIST } from '@/types/invitation';

export default function NewTemplatePage() {
  const navigate = useNavigate();
  const { weddingId } = useActiveWedding();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showTokens, setShowTokens] = useState(false);

  const [form, setForm] = useState({
    name: '',
    description: '',
    template_type: 'standard',
    style_preset: 'classic',
    header_text: 'You are invited',
    body_text: 'Together with their families, {{couple_names}} invite you to celebrate their wedding.',
    closing_text: 'We look forward to celebrating with you',
    footer_text: 'Please respond by {{rsvp_deadline}}',
    rsvp_button_label: 'RSVP',
  });

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const insertToken = (field: string, token: string) => {
    setForm((prev) => ({ ...prev, [field]: prev[field as keyof typeof prev] + ' ' + token }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Template name is required'); return; }
    if (!form.body_text.trim()) { setError('Invitation wording is required'); return; }

    setSaving(true);
    const { error: dbErr } = await supabase.from('invitation_templates').insert({
      wedding_id: weddingId,
      name: form.name.trim(),
      description: form.description.trim() || null,
      template_type: form.template_type,
      style_preset: form.style_preset,
      header_text: form.header_text.trim(),
      body_text: form.body_text.trim(),
      closing_text: form.closing_text.trim(),
      footer_text: form.footer_text.trim(),
      rsvp_button_label: form.rsvp_button_label.trim(),
      is_default: false,
      status: 'active',
    });
    setSaving(false);

    if (dbErr) { setError(dbErr.message || 'Failed to create template'); return; }
    navigate('/app/invitations/templates');
  };

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-heading text-2xl text-foreground-900">Create template</h1>
            <p className="text-sm text-foreground-500 mt-1">Design a reusable invitation template with personalisation tokens</p>
          </div>
          <button onClick={() => navigate('/app/invitations/templates')} className="btn-ghost text-sm cursor-pointer whitespace-nowrap"><i className="ri-arrow-left-line mr-1.5" />Cancel</button>
        </div>

        {error && <div className="mb-4 px-4 py-3 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200">{error}</div>}

        <form onSubmit={handleSave} className="space-y-6">
          <div className="card-default">
            <h2 className="font-label text-sm font-semibold text-foreground-900 mb-4">Template details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Template name *</label>
                <input type="text" value={form.name} onChange={(e) => handleChange('name', e.target.value)} placeholder="e.g. Classic Floral" className="input-field" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Description</label>
                <input type="text" value={form.description} onChange={(e) => handleChange('description', e.target.value)} placeholder="Brief description for your reference" className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Type</label>
                <select value={form.template_type} onChange={(e) => handleChange('template_type', e.target.value)} className="input-field">
                  {TEMPLATE_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Style preset</label>
                <select value={form.style_preset} onChange={(e) => handleChange('style_preset', e.target.value)} className="input-field">
                  {STYLE_PRESET_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="card-default">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-label text-sm font-semibold text-foreground-900">Invitation wording</h2>
              <button type="button" onClick={() => setShowTokens(!showTokens)} className="text-xs text-primary-600 hover:text-primary-700 cursor-pointer flex items-center gap-1">
                <i className={`ri-${showTokens ? 'close' : 'add'}-line text-sm`} />Personalisation tokens
              </button>
            </div>

            {showTokens && (
              <div className="mb-4 p-3 bg-secondary-50 rounded-lg">
                <p className="text-xs text-foreground-500 mb-2">Click a token to insert it at the cursor position in the field you last focused. Tokens are replaced with real guest and wedding data when invitations are sent.</p>
                <div className="flex flex-wrap gap-1.5">
                  {TOKEN_LIST.map((t) => (
                    <button key={t.token} type="button" onClick={() => insertToken('body_text', t.token)} className="px-2 py-1 rounded text-[11px] bg-white border border-secondary-200 text-foreground-600 hover:border-primary-300 hover:text-primary-700 cursor-pointer whitespace-nowrap">{t.token}</button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Header text</label>
                <input type="text" value={form.header_text} onChange={(e) => handleChange('header_text', e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Main invitation wording *</label>
                <textarea value={form.body_text} onChange={(e) => handleChange('body_text', e.target.value)} rows={4} className="input-field resize-y" />
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Closing text</label>
                <input type="text" value={form.closing_text} onChange={(e) => handleChange('closing_text', e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Footer text</label>
                <input type="text" value={form.footer_text} onChange={(e) => handleChange('footer_text', e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">RSVP button label</label>
                <input type="text" value={form.rsvp_button_label} onChange={(e) => handleChange('rsvp_button_label', e.target.value)} className="input-field" />
              </div>
            </div>
          </div>

          <div className="card-default">
            <h2 className="font-label text-sm font-semibold text-foreground-900 mb-4">Preview</h2>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-8 max-w-md mx-auto text-center">
              <p className="font-serif text-amber-800 text-lg mb-3">{form.header_text}</p>
              <p className="font-serif text-amber-700 text-sm leading-relaxed mb-4 whitespace-pre-wrap">{form.body_text}</p>
              <p className="font-serif text-amber-800 text-sm mb-4">{form.closing_text}</p>
              <p className="text-xs text-amber-500 mb-6">{form.footer_text}</p>
              <span className="inline-block px-6 py-2.5 bg-amber-800 text-amber-50 rounded-full text-sm font-label">{form.rsvp_button_label}</span>
            </div>
            <p className="text-xs text-foreground-400 text-center mt-3">Preview only — token values shown as placeholders</p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={() => navigate('/app/invitations/templates')} className="btn-ghost text-sm cursor-pointer whitespace-nowrap">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary text-sm py-2.5 px-6 cursor-pointer whitespace-nowrap disabled:opacity-50">
              {saving ? <><i className="ri-loader-4-line animate-spin mr-1.5" />Saving...</> : 'Create template'}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}