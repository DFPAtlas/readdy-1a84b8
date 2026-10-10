import { useState, useMemo, useCallback, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AppShell from '@/components/feature/AppShell';
import { supabase } from '@/lib/supabase';
import { isDemoMode, DEMO_CONFIG } from '@/demo/demoConfig';
import { useDemoDataSafe } from '@/demo/useDemoDataSafe';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import type { DemoGalleryItem } from '@/demo/demoTypes';

const ALBUM_LABELS: Record<string, string> = {
  'demo-album-engagement': 'Engagement Shoot',
  'demo-album-welcome': 'Welcome Drinks',
  'demo-album-ceremony': 'Ceremony',
  'demo-album-reception': 'Reception & Evening',
};

const STATUS_COLORS: Record<string, string> = {
  approved: 'bg-emerald-100 text-emerald-700',
  awaiting_review: 'bg-amber-100 text-amber-700',
  needs_review: 'bg-amber-100 text-amber-700',
  pending: 'bg-sky-100 text-sky-700',
  scanning: 'bg-indigo-100 text-indigo-700',
  uploading: 'bg-sky-100 text-sky-700',
  rejected: 'bg-red-100 text-red-700',
  hidden: 'bg-secondary-200 text-secondary-600',
  held: 'bg-orange-100 text-orange-700',
  removed: 'bg-red-100 text-red-700',
  failed: 'bg-red-100 text-red-700',
};

const STATUS_LABELS: Record<string, string> = {
  approved: 'Approved',
  awaiting_review: 'Awaiting review',
  needs_review: 'Awaiting review',
  pending: 'Pending scan',
  scanning: 'Scanning',
  uploading: 'Uploading',
  rejected: 'Rejected',
  hidden: 'Hidden',
  held: 'Held',
  removed: 'Removed',
  failed: 'Failed',
};

// ── Real (non-demo) gallery moderation ──

function useRealGalleryModeration(weddingId: string | null) {
  const [assets, setAssets] = useState<Record<string, unknown>[]>([]);
  const [albums, setAlbums] = useState<Record<string, unknown>[]>([]);
  const [rules, setRules] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!weddingId) { setLoading(false); return; }
    setLoading(true); setError('');
    try {
      const { data: assetData, error: assetErr } = await supabase
        .from('gallery_assets').select('*').eq('wedding_id', weddingId)
        .order('created_at', { ascending: false }).limit(100);
      if (assetErr) throw assetErr;
      const { data: albumData } = await supabase
        .from('gallery_albums').select('id, title').eq('wedding_id', weddingId).order('sort_order');
      const { data: rulesData } = await supabase
        .from('gallery_moderation_rules').select('*').eq('wedding_id', weddingId).maybeSingle();
      const signedAssets = await Promise.all((assetData || []).map(async (asset) => {
        const { data: signedUrl } = await supabase.storage.from('private').createSignedUrl(asset.storage_path as string, 3600);
        return { ...asset, signed_url: signedUrl?.signedUrl || '' };
      }));
      setAssets(signedAssets);
      setAlbums(albumData || []);
      setRules(rulesData || null);
    } catch { setError('Failed to load gallery assets'); }
    finally { setLoading(false); }
  }, [weddingId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!weddingId) return;
    const channel = supabase.channel(`gallery-mod-${weddingId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gallery_assets', filter: `wedding_id=eq.${weddingId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [weddingId, load]);

  const moderateAsset = useCallback(async (assetId: string, status: string, reason?: string) => {
    if (!weddingId) return;
    await supabase.from('gallery_assets').update({
      moderation_status: status, moderation_reason: reason || null,
      moderation_updated_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      ...(status === 'approved' ? { publication_status: 'published', published_at: new Date().toISOString() } : {}),
      ...(status === 'hidden' ? { wall_visible: false } : {}),
    }).eq('id', assetId).eq('wedding_id', weddingId);
    load();
  }, [weddingId, load]);

  const toggleWall = useCallback(async (assetId: string, currentVisible: boolean) => {
    if (!weddingId) return;
    await supabase.from('gallery_assets').update({
      wall_visible: !currentVisible,
      wall_added_at: !currentVisible ? new Date().toISOString() : null,
      moderation_updated_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }).eq('id', assetId).eq('wedding_id', weddingId);
    load();
  }, [weddingId, load]);

  const updateRules = useCallback(async (updates: Record<string, unknown>) => {
    if (!weddingId) return;
    const { data: existing } = await supabase.from('gallery_moderation_rules').select('id').eq('wedding_id', weddingId).maybeSingle();
    if (existing) await supabase.from('gallery_moderation_rules').update({ ...updates, updated_at: new Date().toISOString() }).eq('wedding_id', weddingId);
    else await supabase.from('gallery_moderation_rules').insert({ wedding_id: weddingId, ...updates });
    const { data: updated } = await supabase.from('gallery_moderation_rules').select('*').eq('wedding_id', weddingId).maybeSingle();
    setRules(updated || null);
  }, [weddingId]);

  return { assets, albums, rules, loading, error, load, moderateAsset, toggleWall, updateRules };
}

function RealGalleryControl({ weddingId }: { weddingId: string }) {
  const { assets, albums, rules, loading, error, moderateAsset, toggleWall, updateRules } = useRealGalleryModeration(weddingId);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [albumFilter, setAlbumFilter] = useState('all');
  const [showRules, setShowRules] = useState(false);
  const [toast, setToast] = useState('');
  const showToast = useCallback((msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); }, []);

  const filteredAssets = useMemo(() => {
    let result = assets;
    if (statusFilter !== 'all') {
      if (statusFilter === 'on_wall') result = result.filter((a) => a.wall_visible === true);
      else result = result.filter((a) => a.moderation_status === statusFilter);
    }
    if (albumFilter !== 'all') result = result.filter((a) => a.album_id === albumFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((a) =>
        ((a.title || a.caption || '') as string).toLowerCase().includes(q) ||
        (a.moderation_ai_label as string || '').toLowerCase().includes(q));
    }
    return result;
  }, [assets, statusFilter, albumFilter, search]);

  const counts = useMemo(() => ({
    total: assets.length,
    approved: assets.filter((a) => a.moderation_status === 'approved').length,
    awaiting: assets.filter((a) => ['awaiting_review', 'pending', 'scanning', 'uploading'].includes(a.moderation_status as string)).length,
    onWall: assets.filter((a) => a.wall_visible === true).length,
    hidden: assets.filter((a) => a.moderation_status === 'hidden').length,
    rejected: assets.filter((a) => a.moderation_status === 'rejected').length,
    held: assets.filter((a) => a.moderation_status === 'held').length,
  }), [assets]);

  if (loading) {
    return <AppShell><div className="max-w-6xl mx-auto py-20 text-center"><div className="w-10 h-10 mx-auto rounded-full border-2 border-secondary-200 border-t-primary-500 animate-spin mb-4" /><p className="text-sm text-foreground-500">Loading gallery assets...</p></div></AppShell>;
  }

  return (
    <AppShell>
      {toast && <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-lg bg-accent-500 text-white text-sm font-label font-medium shadow-lg whitespace-nowrap"><i className="ri-check-line mr-2" />{toast}</div>}
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-label text-foreground-400 uppercase tracking-wider mb-1">Gallery Control</p>
            <h1 className="font-heading text-2xl md:text-3xl text-foreground-900">Wedding Gallery</h1>
            <p className="text-sm text-foreground-500 mt-1">Review guest photos and control the live wall.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setShowRules(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-secondary-200 text-xs font-label text-foreground-600 hover:bg-background-100 transition-colors cursor-pointer whitespace-nowrap"><i className="ri-settings-3-line" /> Moderation rules</button>
          </div>
        </div>

        {error && <div className="mb-6 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">{error}</div>}

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
          {[
            { label: 'Total', value: counts.total, filter: 'all' },
            { label: 'Approved', value: counts.approved, color: 'text-emerald-600', filter: 'approved' },
            { label: 'Awaiting', value: counts.awaiting, color: 'text-amber-600', filter: 'awaiting_review' },
            { label: 'On wall', value: counts.onWall, color: 'text-primary-600', filter: 'on_wall' },
            { label: 'Hidden', value: counts.hidden, color: 'text-foreground-400', filter: 'hidden' },
            { label: 'Rejected', value: counts.rejected, color: 'text-red-600', filter: 'rejected' },
            { label: 'Held', value: counts.held, color: 'text-orange-600', filter: 'held' },
          ].map((card) => (
            <button key={card.label} onClick={() => setStatusFilter(card.filter)} className="bg-white border border-secondary-100 rounded-lg p-3 text-center cursor-pointer hover:border-secondary-300 transition-colors">
              <p className={`text-lg font-heading font-semibold ${card.color || 'text-foreground-900'}`}>{card.value}</p>
              <p className="text-[10px] text-foreground-500 font-label mt-0.5">{card.label}</p>
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex items-center gap-2 flex-1 bg-white border border-secondary-200 rounded-lg px-3 py-2">
            <i className="ri-search-line text-foreground-400 text-sm" />
            <input type="text" placeholder="Search by caption or AI label..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 bg-transparent text-sm text-foreground-800 placeholder-foreground-400 outline-none" />
            {search && <button onClick={() => setSearch('')} className="text-foreground-400 hover:text-foreground-600 cursor-pointer"><i className="ri-close-line text-sm" /></button>}
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-white border border-secondary-200 rounded-lg px-3 py-2 text-xs font-label text-foreground-700 cursor-pointer outline-none">
            <option value="all">All statuses</option>
            <option value="uploading">Uploading</option><option value="pending">Pending scan</option>
            <option value="scanning">Scanning</option><option value="awaiting_review">Awaiting review</option>
            <option value="approved">Approved</option><option value="held">Held</option>
            <option value="rejected">Rejected</option><option value="hidden">Hidden</option>
            <option value="on_wall">On live wall</option>
          </select>
          <select value={albumFilter} onChange={(e) => setAlbumFilter(e.target.value)} className="bg-white border border-secondary-200 rounded-lg px-3 py-2 text-xs font-label text-foreground-700 cursor-pointer outline-none">
            <option value="all">All albums</option>
            {albums.map((a: Record<string, unknown>) => (<option key={a.id as string} value={a.id as string}>{a.title as string}</option>))}
          </select>
        </div>

        {filteredAssets.length === 0 ? (
          <div className="bg-white border border-secondary-100 rounded-xl p-10 text-center">
            <div className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-background-100 text-foreground-300 mb-3"><i className="ri-image-line text-xl" /></div>
            <p className="text-sm text-foreground-500">No assets match your filters.</p>
            <button onClick={() => { setStatusFilter('all'); setAlbumFilter('all'); setSearch(''); }} className="text-xs text-primary-600 font-label hover:text-primary-700 mt-2 cursor-pointer whitespace-nowrap">Clear filters</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredAssets.map((asset) => {
              const a = asset as unknown as Record<string, unknown>;
              const status = (a.moderation_status as string) || 'pending';
              const isWall = a.wall_visible === true;
              const isVideo = (a.mime_type as string || '').startsWith('video/');
              const albumTitle = (albums.find((al: Record<string, unknown>) => al.id === a.album_id) as unknown as Record<string, unknown>)?.title || 'Unknown';
              return (
                <div key={a.id as string} className="bg-white border border-secondary-100 rounded-xl overflow-hidden group">
                  <div className="relative aspect-[4/3] bg-background-50 overflow-hidden">
                    {a.signed_url ? (isVideo ? <video src={a.signed_url as string} className="w-full h-full object-cover" muted /> : <img src={a.signed_url as string} alt={(a.title || a.caption || '') as string} className="w-full h-full object-cover" loading="lazy" />) : <div className="w-full h-full flex items-center justify-center bg-secondary-100"><i className="ri-image-line text-3xl text-foreground-300" /></div>}
                    <div className="absolute top-2 left-2 flex items-center gap-1">
                      <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-label font-medium ${STATUS_COLORS[status] || 'bg-secondary-100 text-secondary-600'}`}>{STATUS_LABELS[status] || status}</span>
                      {isWall && <span className="px-1.5 py-0.5 rounded-full bg-primary-100 text-primary-700 text-[9px] font-label"><i className="ri-tv-line text-[8px] mr-0.5" />Wall</span>}
                      {isVideo && <span className="px-1.5 py-0.5 rounded-full bg-secondary-100 text-secondary-700 text-[9px] font-label"><i className="ri-video-line text-[8px]" /></span>}
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="text-xs text-foreground-800 line-clamp-2 mb-1.5">{(a.title || a.caption || 'Untitled') as string}</p>
                    {a.moderation_ai_label && <p className="text-[9px] text-foreground-400 mb-1">AI: {(a.moderation_ai_label as string)}</p>}
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[9px] text-foreground-350">{String(albumTitle)}</span>
                      <span className="text-[9px] text-foreground-400">{new Date(a.created_at as string).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-2 pt-2 border-t border-secondary-100">
                      {['awaiting_review', 'pending', 'scanning', 'uploading', 'held'].includes(status) && (
                        <button onClick={() => { moderateAsset(a.id as string, 'approved'); showToast('Approved'); }} className="flex-1 text-[10px] py-1 rounded bg-emerald-50 text-emerald-600 font-label hover:bg-emerald-100 cursor-pointer whitespace-nowrap transition-colors">Approve</button>
                      )}
                      {status === 'approved' && (
                        <button onClick={() => { toggleWall(a.id as string, !!isWall); showToast(isWall ? 'Removed from wall' : 'Added to wall'); }} className={`flex-1 text-[10px] py-1 rounded font-label cursor-pointer whitespace-nowrap transition-colors ${isWall ? 'bg-primary-50 text-primary-600 hover:bg-primary-100' : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'}`}>{isWall ? 'On wall' : 'Add to wall'}</button>
                      )}
                      {status !== 'hidden' && status !== 'rejected' && (
                        <button onClick={() => { moderateAsset(a.id as string, 'hidden'); showToast('Hidden'); }} className="text-[10px] py-1 px-2 rounded bg-secondary-100 text-secondary-600 font-label hover:bg-secondary-200 cursor-pointer whitespace-nowrap transition-colors">Hide</button>
                      )}
                      {(status === 'hidden' || status === 'rejected') && (
                        <button onClick={() => { moderateAsset(a.id as string, 'awaiting_review'); showToast('Restored for review'); }} className="flex-1 text-[10px] py-1 rounded bg-secondary-50 text-secondary-600 font-label hover:bg-secondary-100 cursor-pointer whitespace-nowrap transition-colors">Restore</button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {showRules && rules && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowRules(false)}>
            <div className="bg-white rounded-xl w-full max-w-md mx-4 p-6 shadow-xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5"><h3 className="font-heading text-lg text-foreground-900">Moderation Rules</h3><button onClick={() => setShowRules(false)} className="w-8 h-8 flex items-center justify-center rounded-md text-foreground-400 hover:bg-background-100 cursor-pointer"><i className="ri-close-line" /></button></div>
              <p className="text-[10px] text-foreground-400 mb-4">AI scans all uploads before they appear in guest galleries. These rules let you fine-tune the behaviour.</p>
              <div className="space-y-3">
                {[{ key: 'manual_approval_required', label: 'Require manual approval' },{ key: 'auto_add_to_wall', label: 'Auto-add approved to wall' },{ key: 'photos_allowed', label: 'Allow photo uploads' },{ key: 'videos_allowed', label: 'Allow video uploads' },{ key: 'auto_approve_trusted_guests', label: 'Auto-approve trusted guests' },{ key: 'show_captions', label: 'Show captions' },{ key: 'show_uploader_names', label: 'Show uploader names' },{ key: 'allow_reporting', label: 'Allow guest reporting' },{ key: 'strip_metadata', label: 'Strip EXIF/location metadata' },{ key: 'retain_originals', label: 'Retain original files' }].map(({ key, label }) => (
                  <label key={key} className="flex items-center justify-between py-1.5 cursor-pointer"><span className="text-xs text-foreground-700">{label}</span>
                    <button onClick={() => updateRules({ [key]: !(rules[key as string] as boolean) })} className={`w-9 h-5 rounded-full relative transition-colors cursor-pointer ${rules[key as string] ? 'bg-primary-500' : 'bg-secondary-300'}`}><span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${rules[key as string] ? 'translate-x-4' : 'translate-x-0.5'}`} /></button>
                  </label>
                ))}
                <div className="pt-2 border-t border-secondary-100">
                  <label className="flex items-center justify-between py-1.5"><span className="text-xs text-foreground-700">Max uploads per guest</span>
                    <select value={rules.max_uploads_per_guest as number} onChange={(e) => updateRules({ max_uploads_per_guest: parseInt(e.target.value) })} className="px-2 py-1 rounded border border-secondary-200 text-xs text-foreground-700 outline-none cursor-pointer"><option value="10">10</option><option value="25">25</option><option value="50">50</option><option value="100">100</option></select>
                  </label>
                  <label className="flex items-center justify-between py-1.5"><span className="text-xs text-foreground-700">Wall delay (minutes)</span>
                    <select value={rules.wall_delay_minutes as number} onChange={(e) => updateRules({ wall_delay_minutes: parseInt(e.target.value) })} className="px-2 py-1 rounded border border-secondary-200 text-xs text-foreground-700 outline-none cursor-pointer"><option value="0">0 (immediate)</option><option value="5">5</option><option value="15">15</option><option value="30">30</option></select>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

// ── Demo gallery control (preserved) ──

function DemoGalleryControl() {
  const demo = useDemoDataSafe();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [albumFilter, setAlbumFilter] = useState('all');
  const [selectedItem, setSelectedItem] = useState<DemoGalleryItem | null>(null);
  const [editCaption, setEditCaption] = useState('');
  const [editAlbum, setEditAlbum] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectItemId, setRejectItemId] = useState('');
  const [addWallModal, setAddWallModal] = useState(false);
  const [addWallCaption, setAddWallCaption] = useState('');
  const [addWallAlbum, setAddWallAlbum] = useState('demo-album-reception');
  const [toast, setToast] = useState('');

  const items = demo?.state.galleryItems ?? [];
  const albums = demo?.state.galleryAlbums ?? [];
  const settings = demo?.state.gallerySettings;

  const showToast = useCallback((msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); }, []);

  const filteredItems = useMemo(() => {
    let result = items;
    if (statusFilter !== 'all') {
      if (statusFilter === 'on_wall') result = result.filter((i) => i.wall_visible);
      else if (statusFilter === 'reported') result = result.filter((i) => i.reported);
      else result = result.filter((i) => i.moderation_status === statusFilter);
    }
    if (albumFilter !== 'all') result = result.filter((i) => i.album_id === albumFilter);
    if (search) { const q = search.toLowerCase(); result = result.filter((i) => i.caption.toLowerCase().includes(q) || i.uploader_name.toLowerCase().includes(q) || (ALBUM_LABELS[i.album_id] || '').toLowerCase().includes(q)); }
    return result;
  }, [items, statusFilter, albumFilter, search]);

  const counts = useMemo(() => ({
    total: items.length, approved: items.filter((i) => i.moderation_status === 'approved').length,
    awaiting: items.filter((i) => i.moderation_status === 'needs_review').length,
    onWall: items.filter((i) => i.wall_visible).length, hidden: items.filter((i) => i.moderation_status === 'hidden').length,
    rejected: items.filter((i) => i.moderation_status === 'rejected').length, reported: items.filter((i) => i.reported).length,
  }), [items]);

  const handleApprove = useCallback((itemId: string) => { demo?.updateGalleryModeration(itemId, 'approved'); showToast('Photo approved'); }, [demo, showToast]);
  const handleHide = useCallback((itemId: string) => { demo?.updateGalleryModeration(itemId, 'hidden'); showToast('Photo hidden'); }, [demo, showToast]);
  const handleRestore = useCallback((itemId: string) => { demo?.updateGalleryModeration(itemId, 'needs_review'); showToast('Photo restored'); }, [demo, showToast]);
  const handleToggleWall = useCallback((itemId: string, current: boolean) => {
    if (!current) { const item = items.find((i) => i.id === itemId); if (item && item.moderation_status !== 'approved') { showToast('Only approved photos can appear on the wall'); return; } }
    demo?.toggleWallVisibility(itemId, !current); showToast(!current ? 'Added to live wall' : 'Removed from live wall');
  }, [demo, items, showToast]);
  const handleEditCaption = useCallback((itemId: string) => { demo?.editGalleryCaption(itemId, editCaption, editAlbum); setSelectedItem(null); showToast('Caption updated'); }, [demo, editCaption, editAlbum, showToast]);
  const handleDismissReport = useCallback((itemId: string) => { demo?.dismissGalleryReport(itemId); showToast('Report dismissed'); }, [demo, showToast]);
  const handleAddDemoPhoto = useCallback(() => {
    if (!demo) return;
    const newItem: DemoGalleryItem = { id: `demo-gallery-added-${Date.now()}`, wedding_id: demo.state.wedding.id, album_id: addWallAlbum, image_src: 'https://readdy.ai/api/search-image?query=Elegant%20wedding%20reception%20detail%20of%20champagne%20glasses%20on%20a%20beautifully%20decorated%20table%20with%20floral%20centerpieces%2C%20soft%20candlelight%2C%20romantic%20atmosphere%2C%20editorial%20fine%20art%20photography%2C%20warm%20golden%20tones&width=800&height=600&seq=wedora-demo-added-photo&orientation=landscape', caption: addWallCaption || 'A beautiful wedding moment', uploader_name: 'Wedding Admin', upload_time: new Date().toISOString(), moderation_status: 'approved', favourite_count: 0, reported: false, ai_label: 'Manual addition, simulated', wall_visible: true };
    demo.addGalleryItem(newItem); setAddWallModal(false); setAddWallCaption(''); showToast('Demo photo added');
  }, [demo, addWallAlbum, addWallCaption, showToast]);
  const handleReject = useCallback((itemId: string) => { if (!rejectReason) { setRejectItemId(itemId); return; } demo?.updateGalleryModeration(itemId, 'rejected'); setRejectItemId(''); setRejectReason(''); showToast('Photo rejected'); }, [demo, rejectReason, showToast]);

  if (!demo) return <AppShell><div className="max-w-6xl mx-auto py-20 text-center"><p className="text-sm text-foreground-500">Loading demo...</p></div></AppShell>;

  return (
    <AppShell>
      {toast && <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-lg bg-accent-500 text-white text-sm font-label font-medium shadow-lg whitespace-nowrap"><i className="ri-check-line mr-2" />{toast}</div>}
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div><p className="text-xs font-label text-foreground-400 uppercase tracking-wider mb-1">Gallery Control</p><h1 className="font-heading text-2xl md:text-3xl text-foreground-900">Wedding Gallery</h1><p className="text-sm text-foreground-500 mt-1">Review guest memories and control the live wall.</p><span className="inline-block mt-2 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-label">Demo Account</span></div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setAddWallModal(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary-500 text-background-50 text-xs font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"><i className="ri-add-line" /> Add demo photo</button>
            <Link to={`/live-wall/${DEMO_CONFIG.publicSlug}`} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-secondary-200 text-xs font-label text-foreground-600 hover:bg-background-100 transition-colors cursor-pointer whitespace-nowrap"><i className="ri-tv-line" /> Open live wall</Link>
            <Link to="/guest/demo-session/gallery" className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-secondary-200 text-xs font-label text-foreground-600 hover:bg-background-100 transition-colors cursor-pointer whitespace-nowrap"><i className="ri-eye-line" /> Preview guest gallery</Link>
            <button onClick={() => setShowSettings(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-secondary-200 text-xs font-label text-foreground-600 hover:bg-background-100 transition-colors cursor-pointer whitespace-nowrap"><i className="ri-settings-3-line" /> Settings</button>
            <button onClick={() => { if (window.confirm('Reset all gallery photos?')) { demo.resetGallery(); showToast('Gallery reset'); } }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 text-xs font-label text-red-600 hover:bg-red-50 transition-colors cursor-pointer whitespace-nowrap"><i className="ri-restart-line" /> Reset</button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
          {[{ label: 'Total', value: counts.total },{ label: 'Approved', value: counts.approved, color: 'text-emerald-600' },{ label: 'Awaiting', value: counts.awaiting, color: 'text-amber-600' },{ label: 'On wall', value: counts.onWall, color: 'text-primary-600' },{ label: 'Hidden', value: counts.hidden, color: 'text-foreground-400' },{ label: 'Rejected', value: counts.rejected, color: 'text-red-600' },{ label: 'Reported', value: counts.reported, color: 'text-red-500' }].map((card) => (
            <button key={card.label} onClick={() => setStatusFilter(card.label === 'On wall' ? 'on_wall' : card.label === 'Reported' ? 'reported' : card.label.toLowerCase())} className="bg-white border border-secondary-100 rounded-lg p-3 text-center cursor-pointer hover:border-secondary-300 transition-colors"><p className={`text-lg font-heading font-semibold ${card.color || 'text-foreground-900'}`}>{card.value}</p><p className="text-[10px] text-foreground-500 font-label mt-0.5">{card.label}</p></button>
          ))}</div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex items-center gap-2 flex-1 bg-white border border-secondary-200 rounded-lg px-3 py-2"><i className="ri-search-line text-foreground-400 text-sm" /><input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 bg-transparent text-sm text-foreground-800 placeholder-foreground-400 outline-none" /></div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-white border border-secondary-200 rounded-lg px-3 py-2 text-xs font-label text-foreground-700 cursor-pointer outline-none"><option value="all">All</option><option value="approved">Approved</option><option value="needs_review">Awaiting</option><option value="rejected">Rejected</option><option value="hidden">Hidden</option><option value="reported">Reported</option><option value="on_wall">On wall</option></select>
          <select value={albumFilter} onChange={(e) => setAlbumFilter(e.target.value)} className="bg-white border border-secondary-200 rounded-lg px-3 py-2 text-xs font-label text-foreground-700 cursor-pointer outline-none"><option value="all">All albums</option>{albums.map((a) => (<option key={a.id} value={a.id}>{a.name}</option>))}</select>
        </div>

        {filteredItems.length === 0 ? (
          <div className="bg-white border border-secondary-100 rounded-xl p-10 text-center"><div className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-background-100 text-foreground-300 mb-3"><i className="ri-image-line text-xl" /></div><p className="text-sm text-foreground-500">No photos match.</p></div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredItems.map((item) => (
              <div key={item.id} className="bg-white border border-secondary-100 rounded-xl overflow-hidden group">
                <div className="relative aspect-[4/3] bg-background-50 overflow-hidden">
                  <img src={item.image_src} alt={item.caption} className="w-full h-full object-cover" loading="lazy" />
                  <div className="absolute top-2 left-2 flex items-center gap-1"><span className={`px-1.5 py-0.5 rounded-full text-[9px] font-label font-medium ${STATUS_COLORS[item.moderation_status] || 'bg-secondary-100 text-secondary-600'}`}>{STATUS_LABELS[item.moderation_status] || item.moderation_status}</span>{item.wall_visible && <span className="px-1.5 py-0.5 rounded-full bg-primary-100 text-primary-700 text-[9px] font-label"><i className="ri-tv-line text-[8px] mr-0.5" />Wall</span>}</div>
                  {item.reported && <div className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center rounded-full bg-red-500 text-white"><i className="ri-flag-fill text-[10px]" /></div>}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center"><button onClick={() => { setSelectedItem(item); setEditCaption(item.caption); setEditAlbum(item.album_id); }} className="px-3 py-1.5 rounded-lg bg-white text-foreground-900 text-xs font-label font-medium hover:bg-white/90 transition-colors cursor-pointer whitespace-nowrap"><i className="ri-edit-line mr-1" />Manage</button></div>
                </div>
                <div className="p-3">
                  <p className="text-xs text-foreground-800 line-clamp-2 mb-1.5">{item.caption}</p>
                  <div className="flex items-center justify-between"><span className="text-[10px] text-foreground-400">{item.uploader_name}</span>{item.favourite_count > 0 && <span className="text-[10px] text-red-400"><i className="ri-heart-fill mr-0.5" />{item.favourite_count}</span>}</div>
                  <div className="flex items-center justify-between mt-1.5"><span className="text-[9px] text-foreground-350">{ALBUM_LABELS[item.album_id] || item.album_id}</span><span className="text-[9px] text-foreground-400">{new Date(item.upload_time).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span></div>
                  <div className="flex items-center gap-1 mt-2 pt-2 border-t border-secondary-100">
                    {item.moderation_status === 'needs_review' && <button onClick={() => handleApprove(item.id)} className="flex-1 text-[10px] py-1 rounded bg-emerald-50 text-emerald-600 font-label hover:bg-emerald-100 cursor-pointer whitespace-nowrap transition-colors">Approve</button>}
                    {item.moderation_status === 'approved' && <button onClick={() => handleToggleWall(item.id, item.wall_visible)} className={`flex-1 text-[10px] py-1 rounded font-label cursor-pointer whitespace-nowrap transition-colors ${item.wall_visible ? 'bg-primary-50 text-primary-600 hover:bg-primary-100' : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'}`}>{item.wall_visible ? 'On wall' : 'Add to wall'}</button>}
                    {item.moderation_status === 'approved' && !item.reported && <button onClick={() => handleHide(item.id)} className="text-[10px] py-1 px-2 rounded bg-secondary-100 text-secondary-600 font-label hover:bg-secondary-200 cursor-pointer whitespace-nowrap transition-colors">Hide</button>}
                    {item.moderation_status === 'hidden' && <button onClick={() => handleRestore(item.id)} className="flex-1 text-[10px] py-1 rounded bg-secondary-50 text-secondary-600 font-label hover:bg-secondary-100 cursor-pointer whitespace-nowrap transition-colors">Restore</button>}
                    {item.reported && <button onClick={() => handleDismissReport(item.id)} className="text-[10px] py-1 px-2 rounded bg-red-50 text-red-600 font-label hover:bg-red-100 cursor-pointer whitespace-nowrap transition-colors">Dismiss</button>}
                  </div>
                </div>
              </div>
            ))}</div>
        )}

        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowSettings(false)}><div className="bg-white rounded-xl w-full max-w-md mx-4 p-6 shadow-xl" onClick={(e) => e.stopPropagation()}><div className="flex items-center justify-between mb-5"><h3 className="font-heading text-lg text-foreground-900">Demo Settings</h3><button onClick={() => setShowSettings(false)} className="w-8 h-8 flex items-center justify-center rounded-md text-foreground-400 hover:bg-background-100 cursor-pointer"><i className="ri-close-line" /></button></div>
            <div className="space-y-3">{[{ key: 'guest_uploads_enabled', label: 'Guest uploads' },{ key: 'couple_approval_required', label: 'Require approval' },{ key: 'auto_add_to_wall', label: 'Auto-add to wall' },{ key: 'show_uploader_names', label: 'Show names' },{ key: 'allow_guest_downloads', label: 'Guest downloads' },{ key: 'allow_favourites', label: 'Favourites' },{ key: 'show_captions', label: 'Show captions' }].map(({ key, label }) => (
              <label key={key} className="flex items-center justify-between py-1.5 cursor-pointer"><span className="text-xs text-foreground-700">{label}</span><button onClick={() => demo.updateGallerySettings({ [key]: !(settings as unknown as Record<string, unknown>)[key] })} className={`w-9 h-5 rounded-full relative transition-colors cursor-pointer ${(settings as unknown as Record<string, unknown>)[key] ? 'bg-primary-500' : 'bg-secondary-300'}`}><span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${(settings as unknown as Record<string, unknown>)[key] ? 'translate-x-4' : 'translate-x-0.5'}`} /></button></label>
            ))}</div></div></div>
        )}

        {rejectItemId && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"><div className="bg-white rounded-xl w-full max-w-sm mx-4 p-6 shadow-xl"><h3 className="font-heading text-lg text-foreground-900 mb-3">Reject</h3><input type="text" placeholder="Reason" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm outline-none mb-4" /><button onClick={() => handleReject(rejectItemId)} className="px-4 py-1.5 rounded-lg bg-red-500 text-white text-xs font-label font-medium cursor-pointer whitespace-nowrap">Confirm</button></div></div>)}
      </div>
    </AppShell>
  );
}

// ── Main export ──

export default function GalleryControlPage() {
  const demo = useDemoDataSafe();
  const { wedding } = useActiveWedding();

  if (!isDemoMode || !demo) {
    if (wedding?.id) return <RealGalleryControl weddingId={wedding.id} />;
    return <AppShell><div className="max-w-6xl mx-auto text-center py-20"><p className="text-sm text-foreground-500">Gallery Control requires a wedding to be selected.</p></div></AppShell>;
  }

  return <DemoGalleryControl />;
}