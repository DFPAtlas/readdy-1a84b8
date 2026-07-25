import { useState, useEffect } from 'react';
import type { EmailTemplate, CampaignFormData, ContentBlock, AudienceFilter } from '@/types/emailCampaigns';
import { TEMPLATE_TYPE_LABELS, EMPTY_CAMPAIGN_FORM } from '@/types/emailCampaigns';

interface Props {
  templates: EmailTemplate[];
  initialData?: CampaignFormData;
  onSave: (data: CampaignFormData) => void;
  onClose: () => void;
  onTestSend?: () => void;
  onBuildRecipients?: (filter: AudienceFilter) => Promise<number>;
  onSchedule?: (data: CampaignFormData) => void;
  isSaving?: boolean;
  isTestSending?: boolean;
  isNew?: boolean;
}

export default function CampaignEditor({ templates, initialData, onSave, onClose, onTestSend, onBuildRecipients, onSchedule, isSaving, isTestSending, isNew }: Props) {
  const [form, setForm] = useState<CampaignFormData>(initialData || EMPTY_CAMPAIGN_FORM);
  const [activeTab, setActiveTab] = useState<'content' | 'audience' | 'schedule'>('content');
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [buildingRecipients, setBuildingRecipients] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [confirmTestOpen, setConfirmTestOpen] = useState(false);

  useEffect(() => {
    if (initialData) setForm(initialData);
  }, [initialData]);

  const updateField = <K extends keyof CampaignFormData>(key: K, value: CampaignFormData[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const applyTemplate = (template: EmailTemplate) => {
    const parsed: ContentBlock[] = typeof template.content_blocks === 'string'
      ? JSON.parse(template.content_blocks as string)
      : (template.content_blocks as unknown as ContentBlock[]);

    setForm((f) => ({
      ...f,
      template_id: template.id,
      subject: template.subject_template,
      preheader: template.preheader_template,
      sender_name: template.sender_name,
      reply_to_email: template.reply_to_email,
      content_blocks: parsed,
      brand_primary_color: template.brand_primary_color,
      brand_secondary_color: template.brand_secondary_color,
      brand_accent_color: template.brand_accent_color,
      brand_font_family: template.brand_font_family,
    }));
  };

  const updateBlock = (index: number, field: string, value: string) => {
    const blocks = [...form.content_blocks];
    blocks[index] = { ...blocks[index], [field]: value };
    setForm((f) => ({ ...f, content_blocks: blocks }));
  };

  const addBlock = (type: ContentBlock['type']) => {
    const newBlock: ContentBlock = type === 'heading' ? { type, content: '', level: 2 }
      : type === 'button' ? { type, label: '', url: '', variant: 'primary' }
      : type === 'image' ? { type, src: '', alt: '' }
      : type === 'divider' ? { type }
      : type === 'spacer' ? { type, content: '20px' }
      : { type, content: '' };

    setForm((f) => ({ ...f, content_blocks: [...f.content_blocks, newBlock] }));
  };

  const removeBlock = (index: number) => {
    if (form.content_blocks.length <= 1) return;
    setForm((f) => ({ ...f, content_blocks: f.content_blocks.filter((_, i) => i !== index) }));
  };

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    const blocks = [...form.content_blocks];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= blocks.length) return;
    [blocks[index], blocks[newIndex]] = [blocks[newIndex], blocks[index]];
    setForm((f) => ({ ...f, content_blocks: blocks }));
  };

  const toggleAudienceFilter = (key: keyof AudienceFilter, value: string | boolean) => {
    const filter = { ...form.audience_filter };
    if (typeof value === 'boolean') {
      filter[key] = value;
    } else if (key === 'rsvp_status') {
      const arr = filter.rsvp_status || [];
      filter.rsvp_status = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
    }
    setForm((f) => ({ ...f, audience_filter: filter }));
  };

  const handleBuildRecipients = async () => {
    if (!onBuildRecipients) return;
    setBuildingRecipients(true);
    try {
      const count = await onBuildRecipients(form.audience_filter);
      setRecipientCount(count);
    } catch {
      // error handled by parent
    } finally {
      setBuildingRecipients(false);
    }
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.subject.trim()) return;
    onSave(form);
  };

  const handleTestSend = () => {
    setConfirmTestOpen(true);
  };

  const confirmTest = () => {
    setConfirmTestOpen(false);
    onTestSend?.();
  };

  const renderPreview = () => {
    const blocks = form.content_blocks;
    const p = form.brand_primary_color;
    const s = form.brand_secondary_color;

    return (
      <div className="bg-white rounded-lg border border-secondary-200 overflow-hidden" style={{ fontFamily: form.brand_font_family }}>
        <div className="p-4 text-center text-white font-semibold text-lg" style={{ background: p }}>{form.subject || 'Email Subject'}</div>
        <div className="p-5 space-y-3">
          <p className="text-foreground-600 text-sm">Dear Guest,</p>
          {blocks.map((block, i) => {
            if (block.type === 'heading') return <h3 key={i} className="font-semibold text-foreground-900" style={{ fontSize: block.level === 1 ? '20px' : block.level === 2 ? '16px' : '14px' }}>{block.content || 'Heading'}</h3>;
            if (block.type === 'paragraph') return <p key={i} className="text-foreground-600 text-sm leading-relaxed">{block.content || 'Your message goes here...'}</p>;
            if (block.type === 'button') return <div key={i} className="text-center py-2"><span className="inline-block px-6 py-2 rounded-md text-white text-sm font-semibold" style={{ background: block.variant === 'primary' ? p : 'transparent', color: block.variant === 'primary' ? '#fff' : p, border: block.variant === 'primary' ? 'none' : `2px solid ${p}` }}>{block.label || 'Button'}</span></div>;
            if (block.type === 'image') return <div key={i} className="text-center py-2"><div className="inline-block bg-background-200 rounded-lg" style={{ width: '100%', height: '120px' }}><p className="text-foreground-400 text-xs pt-12">Image placeholder</p></div></div>;
            if (block.type === 'divider') return <hr key={i} className="border-foreground-200" />;
            if (block.type === 'spacer') return <div key={i} style={{ height: block.content || '20px' }} />;
            return null;
          })}
        </div>
        <div className="p-4 text-center text-foreground-400 text-xs" style={{ background: s }}>
          <p>Sent by {form.sender_name || 'Wedora'}</p>
          <p className="mt-1">Unsubscribe from future emails</p>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
        <div className="bg-white rounded-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden shadow-lg flex flex-col" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-secondary-100 flex-shrink-0">
            <h3 className="font-heading text-lg text-foreground-900">{isNew ? 'Create campaign' : 'Edit campaign'}</h3>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-md text-foreground-400 hover:bg-background-100 cursor-pointer">
              <i className="ri-close-line" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 px-6 py-2 border-b border-secondary-100 flex-shrink-0 bg-background-50">
            {(['content', 'audience', 'schedule'] as const).map((tab) => (
              <button key={tab} onClick={() => { setActiveTab(tab); setPreviewMode(false); }}
                className={`px-4 py-1.5 text-xs font-label font-medium rounded-full cursor-pointer whitespace-nowrap transition-colors ${activeTab === tab ? 'bg-primary-500 text-white' : 'text-foreground-500 hover:bg-background-200'}`}>
                {tab === 'content' ? 'Content' : tab === 'audience' ? 'Audience' : 'Schedule'}
              </button>
            ))}
            <div className="flex-1" />
            <button onClick={() => setPreviewMode(!previewMode)}
              className={`px-3 py-1.5 text-xs font-label font-medium rounded-full cursor-pointer whitespace-nowrap transition-colors ${previewMode ? 'bg-accent-500 text-white' : 'text-foreground-500 hover:bg-background-200'}`}>
              <i className={`${previewMode ? 'ri-edit-line' : 'ri-eye-line'} mr-1`} />{previewMode ? 'Edit' : 'Preview'}
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6">
            {previewMode ? (
              <div className="max-w-lg mx-auto">{renderPreview()}</div>
            ) : (
              <>
                {/* Content Tab */}
                {activeTab === 'content' && (
                  <div className="space-y-5">
                    {/* Campaign name & template */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Campaign name *</label>
                        <input type="text" value={form.name} onChange={(e) => updateField('name', e.target.value)} placeholder="e.g. Save the Date — Spring 2027" className="input-field" />
                      </div>
                      <div>
                        <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Template</label>
                        <select value={form.template_id || ''} onChange={(e) => {
                          const t = templates.find((tp) => tp.id === e.target.value);
                          if (t) applyTemplate(t); else updateField('template_id', null);
                        }} className="input-field cursor-pointer">
                          <option value="">Custom</option>
                          {templates.map((t) => (
                            <option key={t.id} value={t.id}>{TEMPLATE_TYPE_LABELS[t.template_type] || t.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Sender details */}
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Sender name</label>
                        <input type="text" value={form.sender_name} onChange={(e) => updateField('sender_name', e.target.value)} placeholder="Emma &amp; James" className="input-field" />
                      </div>
                      <div>
                        <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Sender email</label>
                        <input type="email" value={form.sender_email} onChange={(e) => updateField('sender_email', e.target.value)} placeholder="noreply@yourdomain.com" className="input-field" />
                      </div>
                      <div>
                        <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Reply-to</label>
                        <input type="email" value={form.reply_to_email} onChange={(e) => updateField('reply_to_email', e.target.value)} placeholder="hello@yourdomain.com" className="input-field" />
                      </div>
                    </div>

                    {/* Subject / preheader */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Subject line *</label>
                        <input type="text" value={form.subject} onChange={(e) => updateField('subject', e.target.value)} placeholder="Save the Date — We're Getting Married!" className="input-field" />
                      </div>
                      <div>
                        <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Preheader text</label>
                        <input type="text" value={form.preheader} onChange={(e) => updateField('preheader', e.target.value)} placeholder="Preview text shown in inbox" className="input-field" />
                      </div>
                    </div>

                    {/* Content blocks */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-label font-medium text-foreground-700">Content blocks</label>
                        <div className="flex items-center gap-1">
                          {(['heading','paragraph','button','image','divider','spacer'] as const).map((type) => (
                            <button key={type} onClick={() => addBlock(type)}
                              className="px-2 py-1 text-[10px] text-foreground-500 hover:bg-background-200 rounded cursor-pointer whitespace-nowrap font-label"
                              title={`Add ${type}`}>
                              + {type.charAt(0).toUpperCase() + type.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {form.content_blocks.map((block, i) => (
                          <div key={i} className="flex items-start gap-2 p-2 rounded-lg border border-secondary-100 bg-background-50 group">
                            <div className="flex flex-col gap-0.5 pt-1">
                              <button onClick={() => moveBlock(i, 'up')} disabled={i === 0} className="w-5 h-5 flex items-center justify-center text-foreground-400 hover:text-foreground-600 cursor-pointer disabled:opacity-30"><i className="ri-arrow-up-s-line text-xs" /></button>
                              <button onClick={() => moveBlock(i, 'down')} disabled={i === form.content_blocks.length - 1} className="w-5 h-5 flex items-center justify-center text-foreground-400 hover:text-foreground-600 cursor-pointer disabled:opacity-30"><i className="ri-arrow-down-s-line text-xs" /></button>
                            </div>
                            <span className="text-[10px] font-label text-foreground-400 pt-1.5 w-14 flex-shrink-0">{block.type}</span>
                            <div className="flex-1">
                              {block.type === 'heading' && (
                                <div className="flex gap-2">
                                  <select value={block.level || 2} onChange={(e) => updateBlock(i, 'level', e.target.value)} className="w-16 text-xs py-1 border border-secondary-200 rounded bg-white cursor-pointer flex-shrink-0">
                                    <option value={1}>H1</option><option value={2}>H2</option><option value={3}>H3</option>
                                  </select>
                                  <input type="text" value={block.content || ''} onChange={(e) => updateBlock(i, 'content', e.target.value)} placeholder="Heading text" className="text-xs py-1 px-2 border border-secondary-200 rounded flex-1" />
                                </div>
                              )}
                              {block.type === 'paragraph' && (
                                <textarea value={block.content || ''} onChange={(e) => updateBlock(i, 'content', e.target.value)} rows={2} placeholder="Paragraph text" className="text-xs py-1 px-2 border border-secondary-200 rounded w-full resize-none" />
                              )}
                              {block.type === 'button' && (
                                <div className="flex gap-2">
                                  <input type="text" value={block.label || ''} onChange={(e) => updateBlock(i, 'label', e.target.value)} placeholder="Button label" className="text-xs py-1 px-2 border border-secondary-200 rounded flex-1" />
                                  <input type="text" value={block.url || ''} onChange={(e) => updateBlock(i, 'url', e.target.value)} placeholder="URL" className="text-xs py-1 px-2 border border-secondary-200 rounded flex-1" />
                                  <select value={block.variant || 'primary'} onChange={(e) => updateBlock(i, 'variant', e.target.value)} className="w-24 text-xs py-1 border border-secondary-200 rounded bg-white cursor-pointer flex-shrink-0">
                                    <option value="primary">Primary</option><option value="secondary">Outline</option>
                                  </select>
                                </div>
                              )}
                              {block.type === 'image' && (
                                <input type="text" value={block.src || ''} onChange={(e) => updateBlock(i, 'src', e.target.value)} placeholder="Image URL" className="text-xs py-1 px-2 border border-secondary-200 rounded w-full" />
                              )}
                              {block.type === 'spacer' && (
                                <input type="text" value={block.content || '20px'} onChange={(e) => updateBlock(i, 'content', e.target.value)} placeholder="Height (e.g. 20px)" className="text-xs py-1 px-2 border border-secondary-200 rounded w-32" />
                              )}
                              {block.type === 'divider' && (
                                <p className="text-xs text-foreground-400 py-1">Horizontal divider line</p>
                              )}
                            </div>
                            <button onClick={() => removeBlock(i)} className="w-5 h-5 flex items-center justify-center text-foreground-400 hover:text-red-500 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"><i className="ri-close-line text-xs" /></button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* CTA */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">CTA button label</label>
                        <input type="text" value={form.cta_label} onChange={(e) => updateField('cta_label', e.target.value)} placeholder="e.g. View our wedding website" className="input-field" />
                      </div>
                      <div>
                        <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">CTA button URL</label>
                        <input type="text" value={form.cta_url} onChange={(e) => updateField('cta_url', e.target.value)} placeholder="https://..." className="input-field" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Audience Tab */}
                {activeTab === 'audience' && (
                  <div className="space-y-5">
                    <div>
                      <h4 className="text-sm font-label font-semibold text-foreground-800 mb-3">Filter by RSVP status</h4>
                      <div className="flex flex-wrap gap-2">
                        {['pending','accepted','declined','maybe'].map((status) => (
                          <button key={status} onClick={() => toggleAudienceFilter('rsvp_status', status)}
                            className={`px-3 py-1.5 text-xs rounded-full cursor-pointer whitespace-nowrap font-label transition-colors ${(form.audience_filter.rsvp_status || []).includes(status) ? 'bg-primary-500 text-white' : 'bg-background-200 text-foreground-600 hover:bg-background-300'}`}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-label font-semibold text-foreground-800 mb-3">Filter by invitation</h4>
                      <div className="flex flex-wrap gap-2">
                        {(['ceremony_invited','reception_invited','evening_invited'] as const).map((key) => (
                          <button key={key} onClick={() => toggleAudienceFilter(key, !form.audience_filter[key])}
                            className={`px-3 py-1.5 text-xs rounded-full cursor-pointer whitespace-nowrap font-label transition-colors ${form.audience_filter[key] ? 'bg-primary-500 text-white' : 'bg-background-200 text-foreground-600 hover:bg-background-300'}`}>
                            {key === 'ceremony_invited' ? 'Ceremony guests' : key === 'reception_invited' ? 'Reception guests' : 'Evening guests'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-secondary-100">
                      <div className="flex items-center gap-3">
                        <button onClick={handleBuildRecipients} disabled={buildingRecipients}
                          className="px-4 py-2 bg-secondary-500 text-white rounded-lg text-xs font-label font-semibold hover:bg-secondary-600 disabled:opacity-50 cursor-pointer whitespace-nowrap">
                          <i className={`${buildingRecipients ? 'ri-loader-4-line animate-spin' : 'ri-user-search-line'} mr-1.5`} />
                          {buildingRecipients ? 'Building...' : 'Build recipient list'}
                        </button>
                        {recipientCount !== null && (
                          <span className="text-sm text-foreground-600">
                            <i className="ri-check-line text-emerald-600 mr-1" />
                            <strong>{recipientCount}</strong> recipients ready
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-foreground-400 mt-2">Recipients with invalid or suppressed emails will be automatically excluded.</p>
                    </div>
                  </div>
                )}

                {/* Schedule Tab */}
                {activeTab === 'schedule' && (
                  <div className="space-y-5">
                    <div>
                      <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Schedule send (optional)</label>
                      <input type="datetime-local" value={form.schedule_at ? form.schedule_at.slice(0, 16) : ''}
                        onChange={(e) => updateField('schedule_at', e.target.value ? new Date(e.target.value).toISOString() : null)}
                        className="input-field max-w-xs cursor-pointer" />
                      <p className="text-xs text-foreground-400 mt-1">Leave empty to send immediately after review.</p>
                    </div>

                    {/* Brand colours */}
                    <div>
                      <h4 className="text-sm font-label font-semibold text-foreground-800 mb-3">Brand colours</h4>
                      <div className="grid grid-cols-4 gap-3">
                        <div>
                          <label className="block text-xs text-foreground-500 mb-1">Primary</label>
                          <input type="color" value={form.brand_primary_color} onChange={(e) => updateField('brand_primary_color', e.target.value)} className="w-full h-8 rounded cursor-pointer border border-secondary-200" />
                        </div>
                        <div>
                          <label className="block text-xs text-foreground-500 mb-1">Secondary bg</label>
                          <input type="color" value={form.brand_secondary_color} onChange={(e) => updateField('brand_secondary_color', e.target.value)} className="w-full h-8 rounded cursor-pointer border border-secondary-200" />
                        </div>
                        <div>
                          <label className="block text-xs text-foreground-500 mb-1">Accent</label>
                          <input type="color" value={form.brand_accent_color} onChange={(e) => updateField('brand_accent_color', e.target.value)} className="w-full h-8 rounded cursor-pointer border border-secondary-200" />
                        </div>
                        <div>
                          <label className="block text-xs text-foreground-500 mb-1">Font</label>
                          <select value={form.brand_font_family} onChange={(e) => updateField('brand_font_family', e.target.value)} className="input-field text-xs cursor-pointer">
                            <option value="Georgia, serif">Georgia (serif)</option>
                            <option value="'Helvetica Neue', Arial, sans-serif">Helvetica</option>
                            <option value="'Playfair Display', serif">Playfair Display</option>
                            <option value="'Lora', serif">Lora</option>
                            <option value="'Cormorant Garamond', serif">Cormorant</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-secondary-100 flex-shrink-0 bg-background-50">
            <div className="flex items-center gap-2">
              {onTestSend && (
                <button onClick={handleTestSend} disabled={isTestSending}
                  className="px-4 py-2 text-sm font-label text-foreground-600 hover:bg-background-200 rounded-lg cursor-pointer whitespace-nowrap disabled:opacity-50">
                  <i className={`${isTestSending ? 'ri-loader-4-line animate-spin' : 'ri-mail-send-line'} mr-1.5`} />
                  {isTestSending ? 'Sending...' : 'Send test'}
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={onClose} className="px-4 py-2 text-sm font-label text-foreground-600 hover:bg-background-100 rounded-lg cursor-pointer whitespace-nowrap">Cancel</button>
              {onSchedule && (
                <button onClick={() => onSchedule(form)} disabled={isSaving || !form.name.trim() || !form.subject.trim()}
                  className="px-5 py-2 bg-secondary-500 text-white rounded-lg text-sm font-label font-semibold hover:bg-secondary-600 disabled:opacity-40 cursor-pointer whitespace-nowrap">
                  <i className="ri-time-line mr-1.5" />Schedule
                </button>
              )}
              <button onClick={handleSave} disabled={isSaving || !form.name.trim() || !form.subject.trim()}
                className="px-5 py-2 bg-primary-500 text-white rounded-lg text-sm font-label font-semibold hover:bg-primary-600 disabled:opacity-40 cursor-pointer whitespace-nowrap">
                <i className={`${isSaving ? 'ri-loader-4-line animate-spin' : 'ri-save-line'} mr-1.5`} />
                {isSaving ? 'Saving...' : 'Save campaign'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Test send confirmation */}
      {confirmTestOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" onClick={() => setConfirmTestOpen(false)}>
          <div className="bg-white rounded-xl w-full max-w-sm mx-4 p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 flex items-center justify-center rounded-full bg-amber-100 text-amber-600"><i className="ri-mail-send-line text-lg" /></div>
              <div><h4 className="font-label font-semibold text-foreground-900 text-sm">Send test email?</h4><p className="text-xs text-foreground-500">A test will be sent to your email address only.</p></div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmTestOpen(false)} className="px-4 py-2 text-sm text-foreground-600 hover:bg-background-100 rounded-lg cursor-pointer whitespace-nowrap">Cancel</button>
              <button onClick={confirmTest} className="px-4 py-2 bg-primary-500 text-white rounded-lg text-sm font-label font-semibold hover:bg-primary-600 cursor-pointer whitespace-nowrap">
                <i className="ri-check-line mr-1" />Confirm send
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}