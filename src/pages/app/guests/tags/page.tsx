import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '@/components/feature/AppShell';
import { supabase } from '@/lib/supabase';
import type { GuestTag } from '@/types/guest';
import { TAG_COLOUR_OPTIONS, TAG_COLOUR_CLASSES } from '@/types/guest';
import { isDemoMode } from '@/demo/demoConfig';
import { useDemoDataSafe } from '@/demo/useDemoDataSafe';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { useGuestService } from '@/hooks/useGuestService';

const DEMO_TAGS: (GuestTag & { usage_count: number })[] = [
  { id: 'tag-family', wedding_id: '', name: 'Family', colour_key: 'primary', usage_count: 8 },
  { id: 'tag-wedding-party', wedding_id: '', name: 'Wedding party', colour_key: 'primary', usage_count: 6 },
  { id: 'tag-friends', wedding_id: '', name: 'Friends', colour_key: 'accent', usage_count: 6 },
  { id: 'tag-work', wedding_id: '', name: 'Work', colour_key: 'secondary', usage_count: 2 },
  { id: 'tag-child', wedding_id: '', name: 'Child', colour_key: 'accent', usage_count: 2 },
  { id: 'tag-dietary', wedding_id: '', name: 'Dietary / Allergy', colour_key: 'secondary', usage_count: 6 },
  { id: 'tag-accessibility', wedding_id: '', name: 'Accessibility', colour_key: 'secondary', usage_count: 2 },
  { id: 'tag-vip', wedding_id: '', name: 'VIP', colour_key: 'primary', usage_count: 6 },
];

function DemoTagsPage() {
  const navigate = useNavigate();
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', colour_key: 'secondary' });

  const handleCreate = () => {
    if (!form.name.trim()) return;
    setFeedback({ type: 'success', message: 'Demo: Tag created (session only)' });
    setShowForm(false);
    setForm({ name: '', colour_key: 'secondary' });
  };

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto">
        {feedback && <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-label flex items-center justify-between ${feedback.type === 'success' ? 'bg-accent-50 text-accent-700 border border-accent-200' : 'bg-red-50 text-red-700 border border-red-200'}`}><span>{feedback.message}</span><button onClick={() => setFeedback(null)} className="cursor-pointer ml-3"><i className="ri-close-line" /></button></div>}

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-heading text-2xl text-foreground-900">Tags</h1>
            <p className="text-sm text-foreground-500 mt-1">Create and manage tags to organise your guests.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/app/guests')} className="btn-ghost text-sm cursor-pointer whitespace-nowrap"><i className="ri-arrow-left-line mr-1.5" />Back</button>
            <button onClick={() => setShowForm(true)} className="btn-primary text-sm cursor-pointer whitespace-nowrap"><i className="ri-add-line mr-1.5" />Add tag</button>
          </div>
        </div>

        {showForm && (
          <div className="card-default mb-6">
            <h3 className="font-label text-sm font-semibold text-foreground-900 mb-4">New tag</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-label text-foreground-600 mb-1.5">Name <span className="text-red-500">*</span></label>
                <input type="text" className="input-field text-sm" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Immediate family" />
              </div>
              <div>
                <label className="block text-xs font-label text-foreground-600 mb-1.5">Colour</label>
                <select className="input-field text-sm" value={form.colour_key} onChange={(e) => setForm((p) => ({ ...p, colour_key: e.target.value }))}>
                  {TAG_COLOUR_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowForm(false)} className="btn-outline text-sm cursor-pointer">Cancel</button>
              <button onClick={handleCreate} className="btn-primary text-sm cursor-pointer">Create</button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {DEMO_TAGS.map((tag) => (
            <div key={tag.id} className="card-default">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-label whitespace-nowrap ${TAG_COLOUR_CLASSES[tag.colour_key] || 'bg-secondary-100 text-secondary-700'}`}>{tag.name}</span>
                </div>
                <span className="text-xs text-foreground-400">{tag.usage_count} used</span>
              </div>
              <div className="flex gap-2 pt-3 border-t border-secondary-100">
                <button onClick={() => setFeedback({ type: 'success', message: 'Demo: Tags are managed through guest records' })} className="text-xs text-primary-600 hover:text-primary-700 cursor-pointer">Edit</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

function NormalTagsPage() {
  const navigate = useNavigate();
  const svc = useGuestService();
  const [loading, setLoading] = useState(true);
  const [tags, setTags] = useState<(GuestTag & { usage_count: number })[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingTag, setEditingTag] = useState<GuestTag | null>(null);
  const [form, setForm] = useState({ name: '', description: '', colour_key: 'secondary' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchTags = async () => {
    setLoading(true);
    const tgs = await svc.listTags();
    // Fetch usage counts via assignments
    const tagIds = new Set(tgs.map((t) => t.id));
    const tagCounts: Record<string, number> = {};
    if (tagIds.size > 0) {
      const { data: assignments } = await supabase.from('guest_tag_assignments').select('tag_id').eq('wedding_id', svc.weddingId);
      (assignments || []).forEach((a: { tag_id: string }) => {
        if (tagIds.has(a.tag_id)) tagCounts[a.tag_id] = (tagCounts[a.tag_id] || 0) + 1;
      });
    }
    setTags(tgs.map((t) => ({ ...t, usage_count: tagCounts[t.id] || 0 })));
    setLoading(false);
  };

  useEffect(() => { fetchTags(); }, []);

  const resetForm = () => {
    setForm({ name: '', description: '', colour_key: 'secondary' });
    setEditingTag(null);
    setError('');
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Tag name is required'); return; }
    setSaving(true);
    setError('');
    try {
      if (editingTag) {
        const ok = await svc.updateTag(editingTag.id, { name: form.name.trim(), description: form.description || null, colour_key: form.colour_key });
        if (!ok) { setError('Failed to update tag'); return; }
        setFeedback({ type: 'success', message: 'Tag updated' });
        svc.recordActivity('updated_tag', `Tag "${form.name.trim()}" updated`);
      } else {
        const tag = await svc.createTag({ name: form.name.trim(), description: form.description || null, colour_key: form.colour_key });
        if (!tag) { setError('Failed to create tag'); return; }
        setFeedback({ type: 'success', message: 'Tag created' });
        svc.recordActivity('created_tag', `Tag "${form.name.trim()}" created`);
      }
      setShowForm(false);
      resetForm();
      await fetchTags();
    } catch {
      setError('An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (tag: GuestTag) => {
    if (!confirm(`Delete tag "${tag.name}"? This will remove it from all guests.`)) return;
    const ok = await svc.deleteTag(tag.id);
    if (!ok) { setFeedback({ type: 'error', message: 'Failed to delete tag' }); return; }
    setFeedback({ type: 'success', message: 'Tag deleted' });
    svc.recordActivity('deleted_tag', `Tag "${tag.name}" deleted`);
    await fetchTags();
  };

  const handleEdit = (tag: GuestTag) => {
    setEditingTag(tag);
    setForm({ name: tag.name, description: tag.description || '', colour_key: tag.colour_key });
    setShowForm(true);
    setError('');
  };

  if (loading) return <AppShell><div className="max-w-4xl mx-auto flex items-center justify-center py-20"><div className="flex items-center gap-3 text-foreground-500"><i className="ri-loader-4-line animate-spin text-xl" /><span className="text-sm">Loading tags...</span></div></div></AppShell>;

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto">
        {feedback && <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-label ${feedback.type === 'success' ? 'bg-accent-50 text-accent-700 border border-accent-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{feedback.message}</div>}
        <div className="flex items-center justify-between mb-6">
          <div><h1 className="font-heading text-2xl text-foreground-900">Tags</h1><p className="text-sm text-foreground-500 mt-1">Create and manage tags to organise your guests.</p></div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/app/guests')} className="btn-ghost text-sm cursor-pointer whitespace-nowrap"><i className="ri-arrow-left-line mr-1.5" />Back</button>
            <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary text-sm cursor-pointer whitespace-nowrap"><i className="ri-add-line mr-1.5" />Add tag</button>
          </div>
        </div>

        {showForm && (
          <div className="card-default mb-6">
            <h3 className="font-label text-sm font-semibold text-foreground-900 mb-4">{editingTag ? 'Edit tag' : 'New tag'}</h3>
            {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-label text-foreground-600 mb-1.5">Name <span className="text-red-500">*</span></label>
                <input type="text" className="input-field text-sm" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Immediate family" />
              </div>
              <div>
                <label className="block text-xs font-label text-foreground-600 mb-1.5">Colour</label>
                <select className="input-field text-sm" value={form.colour_key} onChange={(e) => setForm((p) => ({ ...p, colour_key: e.target.value }))}>
                  {TAG_COLOUR_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setShowForm(false); resetForm(); }} className="btn-outline text-sm cursor-pointer">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary text-sm cursor-pointer">
                {saving ? <><i className="ri-loader-4-line animate-spin mr-1.5" />Saving...</> : editingTag ? 'Save changes' : 'Create'}
              </button>
            </div>
          </div>
        )}

        {tags.length === 0 ? (
          <div className="card-default text-center py-16"><div className="w-14 h-14 mx-auto flex items-center justify-center rounded-full bg-secondary-100 text-secondary-500 mb-4"><i className="ri-price-tag-3-line text-2xl" /></div><h3 className="font-heading text-lg text-foreground-700 mb-2">No tags yet</h3><p className="text-sm text-foreground-500 mb-5">Tags help you group guests by category.</p></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tags.map((tag) => (
              <div key={tag.id} className="card-default">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2"><span className={`px-2.5 py-1 rounded-full text-xs font-label whitespace-nowrap ${TAG_COLOUR_CLASSES[tag.colour_key] || 'bg-secondary-100 text-secondary-700'}`}>{tag.name}</span></div>
                  <span className="text-xs text-foreground-400">{tag.usage_count} used</span>
                </div>
                {tag.description && <p className="text-xs text-foreground-500 mb-2">{tag.description}</p>}
                <div className="flex gap-2 pt-3 border-t border-secondary-100">
                  <button onClick={() => handleEdit(tag)} className="text-xs text-primary-600 hover:text-primary-700 cursor-pointer">Edit</button>
                  <button onClick={() => handleDelete(tag)} className="text-xs text-red-400 hover:text-red-600 cursor-pointer">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function TagsPage() {
  const demoData = useDemoDataSafe();
  if (isDemoMode && demoData) return <DemoTagsPage />;
  return <NormalTagsPage />;
}