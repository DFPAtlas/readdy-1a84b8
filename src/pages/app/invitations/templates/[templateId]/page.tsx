import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppShell from '@/components/feature/AppShell';
import { supabase } from '@/lib/supabase';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { useDemoDataSafe } from '@/demo/useDemoDataSafe';
import { isDemoMode } from '@/demo/demoConfig';
import type { InvitationTemplate } from '@/types/invitation';
import { STYLE_PRESET_PREVIEWS } from '@/types/invitation';

// ── Normal mode ──

function NormalTemplateDetailPage() {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const { weddingId } = useActiveWedding();
  const [loading, setLoading] = useState(true);
  const [template, setTemplate] = useState<InvitationTemplate | null>(null);
  const [usageCount, setUsageCount] = useState(0);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (!templateId) return;
    (async () => {
      try {
        const { data, error: dbErr } = await supabase.from('invitation_templates').select('*').eq('id', templateId).eq('wedding_id', weddingId).maybeSingle();
        if (dbErr) throw dbErr;
        if (!data) { setLoading(false); return; }
        setTemplate(data as InvitationTemplate);

        const { count } = await supabase.from('invitations').select('id', { count: 'exact', head: true }).eq('template_id', templateId);
        setUsageCount(count || 0);
      } catch (err: unknown) {
        /* ignore */
      } finally {
        setLoading(false);
      }
    })();
  }, [templateId]);

  const handleArchive = async () => {
    if (!template) return;
    const { error: e } = await supabase.from('invitation_templates').update({ status: 'archived', archived_at: new Date().toISOString() }).eq('id', template.id);
    if (e) { setFeedback({ type: 'error', message: 'Failed to archive' }); return; }
    setFeedback({ type: 'success', message: 'Template archived' });
    setTemplate({ ...template, status: 'archived', archived_at: new Date().toISOString() });
  };

  const handleRestore = async () => {
    if (!template) return;
    const { error: e } = await supabase.from('invitation_templates').update({ status: 'active', archived_at: null }).eq('id', template.id);
    if (e) { setFeedback({ type: 'error', message: 'Failed to restore' }); return; }
    setFeedback({ type: 'success', message: 'Template restored' });
    setTemplate({ ...template, status: 'active', archived_at: null });
  };

  const handleSetDefault = async () => {
    if (!template) return;
    await supabase.from('invitation_templates').update({ is_default: false }).eq('wedding_id', weddingId).eq('is_default', true);
    const { error: e } = await supabase.from('invitation_templates').update({ is_default: true }).eq('id', template.id);
    if (e) { setFeedback({ type: 'error', message: 'Failed to set default' }); return; }
    setFeedback({ type: 'success', message: 'Default template set' });
    setTemplate({ ...template, is_default: true });
  };

  if (loading) return <AppShell><div className="max-w-3xl mx-auto flex items-center justify-center py-20"><div className="flex items-center gap-3 text-foreground-500"><i className="ri-loader-4-line animate-spin text-xl" /><span className="text-sm">Loading template...</span></div></div></AppShell>;
  if (!template) return <AppShell><div className="max-w-3xl mx-auto text-center py-20"><p className="text-sm text-red-600 mb-4">Template not found</p><button onClick={() => navigate('/app/invitations/templates')} className="btn-outline text-sm cursor-pointer">Back to templates</button></div></AppShell>;

  const preview = STYLE_PRESET_PREVIEWS[template.style_preset] || STYLE_PRESET_PREVIEWS.classic;

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto">
        {feedback && (
          <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-label ${feedback.type === 'success' ? 'bg-accent-50 text-accent-700 border border-accent-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{feedback.message}</div>
        )}

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-heading text-2xl text-foreground-900">{template.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-foreground-500 capitalize">{template.style_preset}</span>
              {template.is_default && <span className="px-1.5 py-0.5 rounded text-[10px] bg-primary-100 text-primary-700">Default</span>}
              {template.status === 'archived' && <span className="px-1.5 py-0.5 rounded text-[10px] bg-secondary-200 text-secondary-700">Archived</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/app/invitations/templates')} className="btn-ghost text-sm cursor-pointer whitespace-nowrap"><i className="ri-arrow-left-line mr-1.5" />Back</button>
            <button onClick={() => navigate(`/app/invitations/templates/${templateId}/edit`)} className="btn-outline text-sm cursor-pointer whitespace-nowrap"><i className="ri-pencil-line mr-1.5" />Edit</button>
            {!template.is_default && <button onClick={handleSetDefault} className="btn-outline text-sm cursor-pointer whitespace-nowrap"><i className="ri-star-line mr-1.5" />Set default</button>}
            {template.status === 'active' ? (
              <button onClick={handleArchive} className="btn-outline text-sm text-red-500 border-red-200 hover:bg-red-50 cursor-pointer whitespace-nowrap"><i className="ri-archive-line mr-1.5" />Archive</button>
            ) : (
              <button onClick={handleRestore} className="btn-outline text-sm text-accent-600 border-accent-200 hover:bg-accent-50 cursor-pointer whitespace-nowrap"><i className="ri-refresh-line mr-1.5" />Restore</button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div className="md:col-span-3 space-y-6">
            <div className="card-default">
              <h3 className="font-label text-sm font-semibold text-foreground-900 mb-4">Invitation wording</h3>
              <dl className="space-y-3 text-sm">
                <div><dt className="text-xs text-foreground-500">Header</dt><dd className="text-foreground-900 mt-0.5">{template.header_text}</dd></div>
                <div><dt className="text-xs text-foreground-500">Main wording</dt><dd className="text-foreground-900 mt-0.5 whitespace-pre-wrap">{template.body_text}</dd></div>
                <div><dt className="text-xs text-foreground-500">Closing</dt><dd className="text-foreground-900 mt-0.5">{template.closing_text}</dd></div>
                <div><dt className="text-xs text-foreground-500">Footer</dt><dd className="text-foreground-900 mt-0.5">{template.footer_text}</dd></div>
                <div><dt className="text-xs text-foreground-500">RSVP button</dt><dd className="text-foreground-900 mt-0.5">{template.rsvp_button_label}</dd></div>
              </dl>
            </div>

            {template.description && (
              <div className="card-default">
                <h3 className="font-label text-sm font-semibold text-foreground-900 mb-2">Description</h3>
                <p className="text-sm text-foreground-600">{template.description}</p>
              </div>
            )}
          </div>

          <div className="md:col-span-2 space-y-6">
            <div className="card-default">
              <h3 className="font-label text-sm font-semibold text-foreground-900 mb-4">Live preview</h3>
              <div className={`rounded-xl px-6 py-10 md:py-14 text-center ${preview.bg} border ${preview.border} max-w-sm mx-auto`}>
                <div className={`w-10 h-px mx-auto mb-5 ${preview.text} opacity-25`} />
                <p className={`${preview.font} ${preview.text} text-lg md:text-xl tracking-wide mb-6 leading-snug`}>{template.header_text}</p>
                <p className={`${preview.font} ${preview.text} text-sm md:text-[15px] leading-[1.7] mb-6 whitespace-pre-wrap`}>{template.body_text}</p>
                <div className={`w-14 h-px mx-auto mb-6 ${preview.text} opacity-20`} />
                <p className={`${preview.font} ${preview.text} text-sm md:text-[15px] mb-5 leading-snug`}>{template.closing_text}</p>
                <p className="text-[11px] text-foreground-400 mb-7 tracking-wide">{template.footer_text}</p>
                <span className="inline-block px-7 py-2.5 bg-foreground-900 text-background-50 rounded-full text-xs font-label tracking-wider">
                  {template.rsvp_button_label}
                </span>
              </div>
              <p className="text-xs text-foreground-400 mt-3 text-center">Preview with sample data — tokens not resolved</p>
            </div>

            <div className="card-default">
              <h3 className="font-label text-sm font-semibold text-foreground-900 mb-3">Details</h3>
              <dl className="space-y-2 text-sm">
                <div><dt className="text-xs text-foreground-500">Type</dt><dd className="text-foreground-700 capitalize">{template.template_type}</dd></div>
                <div><dt className="text-xs text-foreground-500">Style</dt><dd className="text-foreground-700 capitalize">{template.style_preset}</dd></div>
                <div><dt className="text-xs text-foreground-500">Used by</dt><dd className="text-foreground-700">{usageCount} {usageCount === 1 ? 'invitation' : 'invitations'}</dd></div>
                <div><dt className="text-xs text-foreground-500">Created</dt><dd className="text-foreground-700">{template.created_at ? new Date(template.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</dd></div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

// ── Demo mode ──

function DemoTemplateDetailPage() {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const demo = useDemoDataSafe();

  const template = demo?.state.invitationTemplates.find((t) => t.id === templateId) ?? null;
  const usageCount = demo
    ? demo.state.invitations.filter((inv) => inv.template_id === templateId).length
    : 0;

  if (!demo) {
    return <AppShell><div className="max-w-3xl mx-auto flex items-center justify-center py-20"><p className="text-sm text-foreground-500">Demo data not available</p></div></AppShell>;
  }

  if (!template) {
    return (
      <AppShell>
        <div className="max-w-3xl mx-auto text-center py-20">
          <p className="text-sm text-red-600 mb-4">Template not found</p>
          <button onClick={() => navigate('/app/invitations/templates')} className="btn-outline text-sm cursor-pointer">Back to templates</button>
        </div>
      </AppShell>
    );
  }

  const preview = STYLE_PRESET_PREVIEWS[template.style_preset] || STYLE_PRESET_PREVIEWS.classic;

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-heading text-2xl text-foreground-900">{template.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-foreground-500 capitalize">{template.style_preset}</span>
              {template.is_default && <span className="px-1.5 py-0.5 rounded text-[10px] bg-primary-100 text-primary-700">Default</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-label">Demo Account</span>
            <button onClick={() => navigate('/app/invitations/templates')} className="btn-ghost text-sm cursor-pointer whitespace-nowrap"><i className="ri-arrow-left-line mr-1.5" />Back</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div className="md:col-span-3 space-y-6">
            <div className="card-default">
              <h3 className="font-label text-sm font-semibold text-foreground-900 mb-4">Invitation wording</h3>
              <dl className="space-y-3 text-sm">
                <div><dt className="text-xs text-foreground-500">Header</dt><dd className="text-foreground-900 mt-0.5">{template.header_text}</dd></div>
                <div><dt className="text-xs text-foreground-500">Main wording</dt><dd className="text-foreground-900 mt-0.5 whitespace-pre-wrap">{template.body_text}</dd></div>
                <div><dt className="text-xs text-foreground-500">Closing</dt><dd className="text-foreground-900 mt-0.5">{template.closing_text}</dd></div>
                <div><dt className="text-xs text-foreground-500">Footer</dt><dd className="text-foreground-900 mt-0.5">{template.footer_text}</dd></div>
                <div><dt className="text-xs text-foreground-500">RSVP button</dt><dd className="text-foreground-900 mt-0.5">{template.rsvp_button_label}</dd></div>
              </dl>
            </div>

            {template.description && (
              <div className="card-default">
                <h3 className="font-label text-sm font-semibold text-foreground-900 mb-2">Description</h3>
                <p className="text-sm text-foreground-600">{template.description}</p>
              </div>
            )}
          </div>

          <div className="md:col-span-2 space-y-6">
            <div className="card-default">
              <h3 className="font-label text-sm font-semibold text-foreground-900 mb-4">Live preview</h3>
              <div className={`rounded-xl px-6 py-10 md:py-14 text-center ${preview.bg} border ${preview.border} max-w-sm mx-auto`}>
                <div className={`w-10 h-px mx-auto mb-5 ${preview.text} opacity-25`} />
                <p className={`${preview.font} ${preview.text} text-lg md:text-xl tracking-wide mb-6 leading-snug`}>{template.header_text}</p>
                <p className={`${preview.font} ${preview.text} text-sm md:text-[15px] leading-[1.7] mb-6 whitespace-pre-wrap`}>{template.body_text}</p>
                <div className={`w-14 h-px mx-auto mb-6 ${preview.text} opacity-20`} />
                <p className={`${preview.font} ${preview.text} text-sm md:text-[15px] mb-5 leading-snug`}>{template.closing_text}</p>
                <p className="text-[11px] text-foreground-400 mb-7 tracking-wide">{template.footer_text}</p>
                <span className="inline-block px-7 py-2.5 bg-foreground-900 text-background-50 rounded-full text-xs font-label tracking-wider">
                  {template.rsvp_button_label}
                </span>
              </div>
              <p className="text-xs text-foreground-400 mt-3 text-center">Preview with sample data — tokens not resolved</p>
            </div>

            <div className="card-default">
              <h3 className="font-label text-sm font-semibold text-foreground-900 mb-3">Details</h3>
              <dl className="space-y-2 text-sm">
                <div><dt className="text-xs text-foreground-500">Type</dt><dd className="text-foreground-700 capitalize">{template.template_type}</dd></div>
                <div><dt className="text-xs text-foreground-500">Style</dt><dd className="text-foreground-700 capitalize">{template.style_preset}</dd></div>
                <div><dt className="text-xs text-foreground-500">Used by</dt><dd className="text-foreground-700">{usageCount} {usageCount === 1 ? 'invitation' : 'invitations'}</dd></div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

// ── Export ──

export default function TemplateDetailPage() {
  if (isDemoMode) return <DemoTemplateDetailPage />;
  return <NormalTemplateDetailPage />;
}