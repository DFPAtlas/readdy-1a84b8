import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '@/components/feature/AppShell';
import { supabase } from '@/lib/supabase';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { useDemoDataSafe } from '@/demo/useDemoDataSafe';
import { isDemoMode } from '@/demo/demoConfig';
import type { InvitationTemplate } from '@/types/invitation';
import { STYLE_PRESET_PREVIEWS } from '@/types/invitation';
import type { DemoInvitationTemplate } from '@/demo/demoTypes';

// ── Normal mode ──

function NormalTemplatesPage() {
  const navigate = useNavigate();
  const { weddingId, loading: contextLoading } = useActiveWedding();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [templates, setTemplates] = useState<InvitationTemplate[]>([]);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchTemplates = useCallback(async () => {
    if (!weddingId) return;
    try {
      setLoading(true);
      setError('');

      const { data, error: dbErr } = await supabase
        .from('invitation_templates')
        .select('*')
        .eq('wedding_id', weddingId)
        .order('created_at', { ascending: false });

      if (dbErr) throw dbErr;

      const tmpls: InvitationTemplate[] = [];
      for (const t of (data || [])) {
        const { count: usageCount } = await supabase
          .from('invitations')
          .select('id', { count: 'exact', head: true })
          .eq('template_id', t.id);

        tmpls.push({ ...t, usage_count: usageCount || 0 });
      }
      setTemplates(tmpls);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, [weddingId]);

  useEffect(() => {
    if (contextLoading) return;
    if (!weddingId) {
      setLoading(false);
      return;
    }
    fetchTemplates();
  }, [weddingId, contextLoading, fetchTemplates]);

  const handleArchive = async (id: string) => {
    const { error: e } = await supabase.from('invitation_templates').update({ status: 'archived', archived_at: new Date().toISOString() }).eq('id', id);
    if (e) { setFeedback({ type: 'error', message: 'Failed to archive' }); return; }
    setFeedback({ type: 'success', message: 'Template archived' });
    setTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, status: 'archived', archived_at: new Date().toISOString() } : t)));
  };

  const handleRestore = async (id: string) => {
    const { error: e } = await supabase.from('invitation_templates').update({ status: 'active', archived_at: null }).eq('id', id);
    if (e) { setFeedback({ type: 'error', message: 'Failed to restore' }); return; }
    setFeedback({ type: 'success', message: 'Template restored' });
    setTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, status: 'active', archived_at: null } : t)));
  };

  const handleSetDefault = async (id: string) => {
    await supabase.from('invitation_templates').update({ is_default: false }).eq('wedding_id', weddingId).eq('is_default', true);
    const { error: e } = await supabase.from('invitation_templates').update({ is_default: true }).eq('id', id);
    if (e) { setFeedback({ type: 'error', message: 'Failed to set default' }); return; }
    setFeedback({ type: 'success', message: 'Default template set' });
    setTemplates((prev) => prev.map((t) => ({ ...t, is_default: t.id === id })));
  };

  const handleDuplicate = async (src: InvitationTemplate) => {
    const { error: e } = await supabase.from('invitation_templates').insert({
      wedding_id: weddingId,
      name: `${src.name} (copy)`,
      description: src.description,
      template_type: src.template_type,
      style_preset: src.style_preset,
      header_text: src.header_text,
      body_text: src.body_text,
      closing_text: src.closing_text,
      footer_text: src.footer_text,
      rsvp_button_label: src.rsvp_button_label,
      is_default: false,
      status: 'active',
    }).select('id').single();
    if (e) { setFeedback({ type: 'error', message: 'Failed to duplicate' }); return; }
    setFeedback({ type: 'success', message: 'Template duplicated' });
    fetchTemplates();
  };

  if (contextLoading || loading) return <AppShell><div className="max-w-5xl mx-auto flex items-center justify-center py-20"><div className="flex items-center gap-3 text-foreground-500"><i className="ri-loader-4-line animate-spin text-xl" /><span className="text-sm">Loading templates...</span></div></div></AppShell>;
  if (error) return <AppShell><div className="max-w-5xl mx-auto text-center py-20"><p className="text-sm text-red-600 mb-4">{error}</p><button onClick={() => fetchTemplates()} className="btn-outline text-sm cursor-pointer">Try again</button></div></AppShell>;

  const activeTemplates = templates.filter((t) => t.status === 'active');
  const archivedTemplates = templates.filter((t) => t.status === 'archived');

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto">
        {feedback && (
          <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-label ${feedback.type === 'success' ? 'bg-accent-50 text-accent-700 border border-accent-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{feedback.message}</div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="font-heading text-2xl text-foreground-900">Invitation templates</h1>
            <p className="text-sm text-foreground-500 mt-1">Create and manage reusable invitation designs for your wedding</p>
          </div>
          <button onClick={() => navigate('/app/invitations/templates/new')} className="btn-primary text-sm py-2.5 px-4 cursor-pointer whitespace-nowrap"><i className="ri-add-line mr-1.5" />Create template</button>
        </div>

        {activeTemplates.length === 0 && archivedTemplates.length === 0 ? (
          <div className="card-default text-center py-16">
            <div className="w-14 h-14 mx-auto flex items-center justify-center rounded-full bg-secondary-100 text-secondary-400 mb-4"><i className="ri-layout-line text-2xl" /></div>
            <h3 className="font-label text-sm font-semibold text-foreground-900 mb-2">No templates yet</h3>
            <p className="text-sm text-foreground-500 mb-6">Create your first invitation template to get started. Templates let you reuse invitation designs across guests and households.</p>
            <button onClick={() => navigate('/app/invitations/templates/new')} className="btn-outline text-sm cursor-pointer">Create your first template</button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
              {activeTemplates.map((tpl) => {
                const preview = STYLE_PRESET_PREVIEWS[tpl.style_preset] || STYLE_PRESET_PREVIEWS.classic;
                return (
                  <div key={tpl.id} className="card-default group cursor-pointer" onClick={() => navigate(`/app/invitations/templates/${tpl.id}`)}>
                    <div className={`rounded-lg p-5 mb-4 ${preview.bg} border ${preview.border}`}>
                      <p className={`${preview.font} text-xs ${preview.text} text-center leading-relaxed`}>
                        <span className="block text-lg mb-1">✿</span>
                        {tpl.header_text}<br />
                        <span className="text-[10px] opacity-70">{tpl.body_text.slice(0, 80)}{tpl.body_text.length > 80 ? '...' : ''}</span>
                      </p>
                    </div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-label text-sm font-semibold text-foreground-900">{tpl.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-foreground-500 capitalize">{tpl.style_preset}</span>
                          {tpl.is_default && <span className="px-1.5 py-0.5 rounded text-[10px] bg-primary-100 text-primary-700">Default</span>}
                        </div>
                        <p className="text-xs text-foreground-400 mt-1">{tpl.usage_count || 0} {tpl.usage_count === 1 ? 'invitation' : 'invitations'}</p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); navigate(`/app/invitations/templates/${tpl.id}/edit`); }} className="w-7 h-7 flex items-center justify-center rounded-md text-foreground-400 hover:text-foreground-700 hover:bg-background-100 cursor-pointer" title="Edit"><i className="ri-pencil-line text-sm" /></button>
                        <button onClick={(e) => { e.stopPropagation(); handleDuplicate(tpl); }} className="w-7 h-7 flex items-center justify-center rounded-md text-foreground-400 hover:text-foreground-700 hover:bg-background-100 cursor-pointer" title="Duplicate"><i className="ri-file-copy-line text-sm" /></button>
                        {!tpl.is_default && <button onClick={(e) => { e.stopPropagation(); handleSetDefault(tpl.id); }} className="w-7 h-7 flex items-center justify-center rounded-md text-foreground-400 hover:text-accent-600 hover:bg-accent-50 cursor-pointer" title="Set as default"><i className="ri-star-line text-sm" /></button>}
                        <button onClick={(e) => { e.stopPropagation(); handleArchive(tpl.id); }} className="w-7 h-7 flex items-center justify-center rounded-md text-foreground-400 hover:text-red-500 hover:bg-red-50 cursor-pointer" title="Archive"><i className="ri-archive-line text-sm" /></button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {archivedTemplates.length > 0 && (
              <div>
                <h2 className="font-label text-sm font-semibold text-foreground-500 mb-3">Archived</h2>
                <div className="space-y-2">
                  {archivedTemplates.map((tpl) => (
                    <div key={tpl.id} className="flex items-center justify-between px-4 py-3 bg-background-50 rounded-lg">
                      <div>
                        <span className="text-sm font-label text-foreground-500">{tpl.name}</span>
                        <span className="text-xs text-foreground-400 ml-2 capitalize">{tpl.style_preset}</span>
                      </div>
                      <button onClick={() => handleRestore(tpl.id)} className="text-xs text-accent-600 hover:text-accent-700 cursor-pointer">Restore</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <div className="mt-8">
          <button onClick={() => navigate('/app/invitations')} className="btn-ghost text-sm cursor-pointer whitespace-nowrap"><i className="ri-arrow-left-line mr-1.5" />Back to invitations</button>
        </div>
      </div>
    </AppShell>
  );
}

// ── Demo mode ──

function DemoTemplatesPage() {
  const navigate = useNavigate();
  const demo = useDemoDataSafe();

  const templates = demo?.state.invitationTemplates ?? [];
  const invitations = demo?.state.invitations ?? [];

  // Compute usage count: how many invitations reference each template
  const templatesWithUsage = useMemo(() => {
    return templates.map((tpl) => {
      const count = invitations.filter((inv) => inv.template_id === tpl.id).length;
      return { ...tpl, usage_count: count };
    });
  }, [templates, invitations]);

  if (!demo) {
    return <AppShell><div className="max-w-5xl mx-auto flex items-center justify-center py-20"><p className="text-sm text-foreground-500">Demo data not available</p></div></AppShell>;
  }

  const activeTemplates = templatesWithUsage.filter((t) => t.status === 'active');
  const archivedTemplates = templatesWithUsage.filter((t) => t.status === 'archived');

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="font-heading text-2xl text-foreground-900">Invitation templates</h1>
            <p className="text-sm text-foreground-500 mt-1">Browse and preview invitation designs for Emma &amp; James.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-label">Demo Account</span>
            <button onClick={() => navigate('/app/invitations/templates/new')} className="btn-primary text-sm py-2.5 px-4 cursor-pointer whitespace-nowrap"><i className="ri-add-line mr-1.5" />Create template</button>
          </div>
        </div>

        {activeTemplates.length === 0 ? (
          <div className="card-default text-center py-16">
            <div className="w-14 h-14 mx-auto flex items-center justify-center rounded-full bg-secondary-100 text-secondary-400 mb-4"><i className="ri-layout-line text-2xl" /></div>
            <h3 className="font-label text-sm font-semibold text-foreground-900 mb-2">No templates yet</h3>
            <p className="text-sm text-foreground-500 mb-6">Create your first invitation template to get started.</p>
            <button onClick={() => navigate('/app/invitations/templates/new')} className="btn-outline text-sm cursor-pointer">Create your first template</button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
              {activeTemplates.map((tpl) => {
                const preview = STYLE_PRESET_PREVIEWS[tpl.style_preset] || STYLE_PRESET_PREVIEWS.classic;
                return (
                  <div key={tpl.id} className="card-default group cursor-pointer" onClick={() => navigate(`/app/invitations/templates/${tpl.id}`)}>
                    <div className={`rounded-lg p-5 mb-4 ${preview.bg} border ${preview.border}`}>
                      <p className={`${preview.font} text-xs ${preview.text} text-center leading-relaxed`}>
                        <span className="block text-lg mb-1">✿</span>
                        {tpl.header_text}<br />
                        <span className="text-[10px] opacity-70">{tpl.body_text.slice(0, 80)}{tpl.body_text.length > 80 ? '...' : ''}</span>
                      </p>
                    </div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-label text-sm font-semibold text-foreground-900">{tpl.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-foreground-500 capitalize">{tpl.style_preset}</span>
                          {tpl.is_default && <span className="px-1.5 py-0.5 rounded text-[10px] bg-primary-100 text-primary-700">Default</span>}
                        </div>
                        <p className="text-xs text-foreground-400 mt-1">{tpl.usage_count || 0} {tpl.usage_count === 1 ? 'invitation' : 'invitations'}</p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); navigate(`/app/invitations/templates/${tpl.id}`); }} className="w-7 h-7 flex items-center justify-center rounded-md text-foreground-400 hover:text-foreground-700 hover:bg-background-100 cursor-pointer" title="View"><i className="ri-eye-line text-sm" /></button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {archivedTemplates.length > 0 && (
              <div>
                <h2 className="font-label text-sm font-semibold text-foreground-500 mb-3">Archived</h2>
                <div className="space-y-2">
                  {archivedTemplates.map((tpl) => (
                    <div key={tpl.id} className="flex items-center justify-between px-4 py-3 bg-background-50 rounded-lg">
                      <div>
                        <span className="text-sm font-label text-foreground-500">{tpl.name}</span>
                        <span className="text-xs text-foreground-400 ml-2 capitalize">{tpl.style_preset}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <div className="mt-8">
          <button onClick={() => navigate('/app/invitations')} className="btn-ghost text-sm cursor-pointer whitespace-nowrap"><i className="ri-arrow-left-line mr-1.5" />Back to invitations</button>
        </div>
      </div>
    </AppShell>
  );
}

// ── Export ──

export default function TemplatesPage() {
  if (isDemoMode) return <DemoTemplatesPage />;
  return <NormalTemplatesPage />;
}