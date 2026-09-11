import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { isDemoMode } from '@/demo/demoConfig';
import { useDemoDataSafe } from '@/demo/useDemoDataSafe';
import type { DemoGalleryItem } from '@/demo/demoTypes';
import type {
  GalleryAdminAsset,
  GalleryAdminAlbum,
  GalleryModerationRules,
  GalleryUploadSettings,
  GalleryModerationStatus,
  StorageUsage,
} from '@/types/gallery';

export interface UseGalleryAdminReturn {
  assets: GalleryAdminAsset[];
  albums: GalleryAdminAlbum[];
  rules: GalleryModerationRules | null;
  uploadSettings: GalleryUploadSettings | null;
  storageUsage: StorageUsage;
  loading: boolean;
  error: string;
  saving: boolean;
  refresh: () => Promise<void>;
  moderateAsset: (assetId: string, status: GalleryModerationStatus, reason?: string) => Promise<void>;
  bulkModerate: (assetIds: string[], status: GalleryModerationStatus, reason?: string) => Promise<void>;
  toggleWall: (assetId: string) => Promise<void>;
  bulkToggleWall: (assetIds: string[], visible: boolean) => Promise<void>;
  updateAssetCaption: (assetId: string, caption: string, albumId?: string) => Promise<void>;
  moveToAlbum: (assetIds: string[], albumId: string | null) => Promise<void>;
  archiveAsset: (assetId: string) => Promise<void>;
  deleteAsset: (assetId: string) => Promise<void>;
  updateRules: (updates: Partial<GalleryModerationRules>) => Promise<void>;
  uploadFiles: (files: File[], albumId: string, captions: string[]) => Promise<string[]>;
  downloadAsset: (assetId: string) => Promise<void>;
}

function useRealGalleryAdmin(weddingId: string | null): UseGalleryAdminReturn {
  const [assets, setAssets] = useState<GalleryAdminAsset[]>([]);
  const [albums, setAlbums] = useState<GalleryAdminAlbum[]>([]);
  const [rules, setRules] = useState<GalleryModerationRules | null>(null);
  const [uploadSettings, setUploadSettings] = useState<GalleryUploadSettings | null>(null);
  const [storageUsage, setStorageUsage] = useState<StorageUsage>({ total_bytes: 0, image_bytes: 0, video_bytes: 0, file_count: 0, largest_files: [], archived_bytes: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    if (!weddingId) { setLoading(false); return; }
    setLoading(true); setError('');
    try {
      const [assetRes, albumRes, rulesRes, uploadRes] = await Promise.all([
        supabase.from('gallery_assets').select('*').eq('wedding_id', weddingId).order('created_at', { ascending: false }).limit(200),
        supabase.from('gallery_albums').select('*').eq('wedding_id', weddingId).order('sort_order'),
        supabase.from('gallery_moderation_rules').select('*').eq('wedding_id', weddingId).maybeSingle(),
        supabase.from('gallery_upload_settings').select('*').eq('wedding_id', weddingId).maybeSingle(),
      ]);

      if (assetRes.error) throw assetRes.error;
      if (!mountedRef.current) return;

      // Generate signed URLs
      const signedAssets: GalleryAdminAsset[] = [];
      for (const a of (assetRes.data || [])) {
        let signedUrl = '';
        let thumbSignedUrl: string | null = null;
        try {
          const { data: u } = await supabase.storage.from('private').createSignedUrl(a.storage_path, 3600);
          signedUrl = u?.signedUrl || '';
        } catch { /* ignore */ }
        if (a.thumbnail_path) {
          try {
            const { data: tu } = await supabase.storage.from('private').createSignedUrl(a.thumbnail_path, 3600);
            thumbSignedUrl = tu?.signedUrl || null;
          } catch { /* ignore */ }
        }
        const album = (albumRes.data || []).find((al: Record<string, unknown>) => al.id === a.album_id);
        signedAssets.push({ ...a, signed_url: signedUrl, thumbnail_signed_url: thumbSignedUrl, album_title: album?.title || null } as GalleryAdminAsset);
      }

      const albumsWithCount: GalleryAdminAlbum[] = (albumRes.data || []).map((al: Record<string, unknown>) => ({
        ...al,
        asset_count: signedAssets.filter((a) => a.album_id === al.id).length,
      })) as GalleryAdminAlbum[];

      setAssets(signedAssets);
      setAlbums(albumsWithCount);
      setRules(rulesRes.data as GalleryModerationRules || null);
      setUploadSettings(uploadRes.data as GalleryUploadSettings || null);

      // Calculate storage
      const totalBytes = signedAssets.reduce((s, a) => s + (a.file_size || 0), 0);
      const imgBytes = signedAssets.filter((a) => a.mime_type?.startsWith('image/')).reduce((s, a) => s + (a.file_size || 0), 0);
      const vidBytes = signedAssets.filter((a) => a.mime_type?.startsWith('video/')).reduce((s, a) => s + (a.file_size || 0), 0);
      const largest = [...signedAssets].sort((a, b) => (b.file_size || 0) - (a.file_size || 0)).slice(0, 5).map((a) => ({ id: a.id, title: a.title, path: a.storage_path, size: a.file_size || 0 }));
      const archivedBytes = signedAssets.filter((a) => a.moderation_status === 'removed').reduce((s, a) => s + (a.file_size || 0), 0);
      setStorageUsage({ total_bytes: totalBytes, image_bytes: imgBytes, video_bytes: vidBytes, file_count: signedAssets.length, largest_files: largest, archived_bytes: archivedBytes });
    } catch (err) {
      if (mountedRef.current) setError(err instanceof Error ? err.message : 'Failed to load gallery');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [weddingId]);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => { mountedRef.current = false; };
  }, [load]);

  useEffect(() => {
    if (!weddingId) return;
    const channel = supabase.channel(`gallery-admin-${weddingId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gallery_assets', filter: `wedding_id=eq.${weddingId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [weddingId, load]);

  const moderateAsset = useCallback(async (assetId: string, status: GalleryModerationStatus, reason?: string) => {
    if (!weddingId) return;
    setSaving(true);
    try {
      const update: Record<string, unknown> = {
        moderation_status: status,
        moderation_reason: reason || null,
        moderation_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (status === 'approved') { update.publication_status = 'published'; update.published_at = new Date().toISOString(); }
      if (status === 'hidden') update.wall_visible = false;
      if (status === 'rejected') update.wall_visible = false;
      await supabase.from('gallery_assets').update(update).eq('id', assetId).eq('wedding_id', weddingId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update asset');
    } finally { setSaving(false); }
  }, [weddingId, load]);

  const bulkModerate = useCallback(async (assetIds: string[], status: GalleryModerationStatus, reason?: string) => {
    if (!weddingId || assetIds.length === 0) return;
    setSaving(true);
    try {
      const update: Record<string, unknown> = {
        moderation_status: status,
        moderation_reason: reason || null,
        moderation_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (status === 'approved') { update.publication_status = 'published'; update.published_at = new Date().toISOString(); }
      if (status === 'hidden' || status === 'rejected') update.wall_visible = false;
      await supabase.from('gallery_assets').update(update).in('id', assetIds).eq('wedding_id', weddingId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update assets');
    } finally { setSaving(false); }
  }, [weddingId, load]);

  const toggleWall = useCallback(async (assetId: string) => {
    if (!weddingId) return;
    const asset = assets.find((a) => a.id === assetId);
    if (!asset) return;
    const newState = !asset.wall_visible;
    if (newState && asset.moderation_status !== 'approved') return;
    setSaving(true);
    try {
      await supabase.from('gallery_assets').update({
        wall_visible: newState,
        wall_added_at: newState ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      }).eq('id', assetId).eq('wedding_id', weddingId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle wall');
    } finally { setSaving(false); }
  }, [weddingId, assets, load]);

  const bulkToggleWall = useCallback(async (assetIds: string[], visible: boolean) => {
    if (!weddingId || assetIds.length === 0) return;
    setSaving(true);
    try {
      await supabase.from('gallery_assets').update({
        wall_visible: visible,
        wall_added_at: visible ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      }).in('id', assetIds).eq('wedding_id', weddingId).eq('moderation_status', 'approved');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update wall');
    } finally { setSaving(false); }
  }, [weddingId, load]);

  const updateAssetCaption = useCallback(async (assetId: string, caption: string, albumId?: string) => {
    if (!weddingId) return;
    setSaving(true);
    try {
      const update: Record<string, unknown> = { title: caption, caption, updated_at: new Date().toISOString() };
      if (albumId !== undefined) update.album_id = albumId;
      await supabase.from('gallery_assets').update(update).eq('id', assetId).eq('wedding_id', weddingId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    } finally { setSaving(false); }
  }, [weddingId, load]);

  const moveToAlbum = useCallback(async (assetIds: string[], albumId: string | null) => {
    if (!weddingId || assetIds.length === 0) return;
    setSaving(true);
    try {
      await supabase.from('gallery_assets').update({ album_id: albumId, updated_at: new Date().toISOString() }).in('id', assetIds).eq('wedding_id', weddingId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to move assets');
    } finally { setSaving(false); }
  }, [weddingId, load]);

  const archiveAsset = useCallback(async (assetId: string) => {
    if (!weddingId) return;
    setSaving(true);
    try {
      await supabase.from('gallery_assets').update({ moderation_status: 'hidden' as GalleryModerationStatus, wall_visible: false, updated_at: new Date().toISOString() }).eq('id', assetId).eq('wedding_id', weddingId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to archive');
    } finally { setSaving(false); }
  }, [weddingId, load]);

  const deleteAsset = useCallback(async (assetId: string) => {
    if (!weddingId) return;
    setSaving(true);
    try {
      const asset = assets.find((a) => a.id === assetId);
      if (!asset) { setSaving(false); return; }
      // Delete DB row first
      await supabase.from('gallery_assets').delete().eq('id', assetId).eq('wedding_id', weddingId);
      // Then attempt storage cleanup (non-blocking)
      const paths = [asset.storage_path];
      if (asset.thumbnail_path) paths.push(asset.thumbnail_path);
      if (asset.preview_path) paths.push(asset.preview_path);
      supabase.storage.from('private').remove(paths).catch(() => {});
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    } finally { setSaving(false); }
  }, [weddingId, assets, load]);

  const updateRules = useCallback(async (updates: Partial<GalleryModerationRules>) => {
    if (!weddingId) return;
    setSaving(true);
    try {
      const { data: existing } = await supabase.from('gallery_moderation_rules').select('id').eq('wedding_id', weddingId).maybeSingle();
      if (existing) {
        await supabase.from('gallery_moderation_rules').update({ ...updates, updated_at: new Date().toISOString() }).eq('wedding_id', weddingId);
      } else {
        await supabase.from('gallery_moderation_rules').insert({ wedding_id: weddingId, ...updates });
      }
      const { data: updated } = await supabase.from('gallery_moderation_rules').select('*').eq('wedding_id', weddingId).maybeSingle();
      setRules(updated as GalleryModerationRules || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update rules');
    } finally { setSaving(false); }
  }, [weddingId]);

  const uploadFiles = useCallback(async (files: File[], albumId: string, captions: string[]): Promise<string[]> => {
    if (!weddingId) return [];
    const errors: string[] = [];
    setSaving(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const safeExt = ext.replace(/[^a-z0-9]/g, '');
        const fileName = `${crypto.randomUUID()}.${safeExt}`;
        const storagePath = `galleries/${weddingId}/${albumId}/${fileName}`;
        try {
          const { error: uploadErr } = await supabase.storage.from('private').upload(storagePath, file, { contentType: file.type, upsert: false });
          if (uploadErr) { errors.push(`${file.name}: ${uploadErr.message}`); continue; }
          const { error: insertErr } = await supabase.from('gallery_assets').insert({
            album_id: albumId,
            wedding_id: weddingId,
            title: captions[i] || file.name.replace(/\.[^.]+$/, ''),
            caption: captions[i] || null,
            storage_path: storagePath,
            file_size: file.size,
            mime_type: file.type,
            uploaded_by_user_id: (await supabase.auth.getUser()).data.user?.id || null,
            moderation_status: 'pending' as GalleryModerationStatus,
            source_type: 'couple',
            publication_status: 'draft',
          });
          if (insertErr) errors.push(`${file.name}: ${insertErr.message}`);
        } catch (e) {
          errors.push(`${file.name}: ${e instanceof Error ? e.message : 'Upload failed'}`);
        }
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally { setSaving(false); }
    return errors;
  }, [weddingId, load]);

  const downloadAsset = useCallback(async (assetId: string) => {
    const asset = assets.find((a) => a.id === assetId);
    if (!asset?.signed_url) return;
    const a = document.createElement('a');
    a.href = asset.signed_url;
    a.download = asset.title || 'wedding-media';
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [assets]);

  return { assets, albums, rules, uploadSettings, storageUsage, loading, error, saving, refresh: load, moderateAsset, bulkModerate, toggleWall, bulkToggleWall, updateAssetCaption, moveToAlbum, archiveAsset, deleteAsset, updateRules, uploadFiles, downloadAsset };
}

// ── Demo gallery admin ──

function useDemoGalleryAdmin(): UseGalleryAdminReturn {
  const demo = useDemoDataSafe();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const items = demo?.state.galleryItems ?? [];
  const demoAlbums = demo?.state.galleryAlbums ?? [];
  const demoSettings = demo?.state.gallerySettings;

  const assets: GalleryAdminAsset[] = useMemo(() => items.map((item: DemoGalleryItem): GalleryAdminAsset => ({
    id: item.id, wedding_id: item.wedding_id, album_id: item.album_id, title: item.caption, caption: item.caption,
    storage_path: '', thumbnail_path: null, preview_path: null, file_size: 1024 * 1024, mime_type: 'image/jpeg',
    width: 800, height: 600, duration_seconds: null,
    uploaded_by_user_id: null, uploaded_by_guest_id: item.uploader_name ? `demo-guest-${item.uploader_name}` : null,
    uploaded_by_invitation_id: null,
    moderation_status: item.moderation_status === 'needs_review' ? 'awaiting_review' : item.moderation_status as GalleryModerationStatus,
    moderation_ai_label: item.ai_label, moderation_reason: item.rejection_reason || null,
    moderation_scanned_at: item.upload_time, scanned_by: 'vowora-simulated',
    moderation_updated_by: null, moderation_updated_at: null,
    original_file_hash: null, metadata_stripped: true,
    source_type: item.uploader_name === 'Wedding Admin' || item.uploader_name === 'Bath Wedding Photography' ? 'couple' : 'guest',
    publication_status: item.moderation_status === 'approved' ? 'published' : 'draft',
    wall_visible: item.wall_visible, wall_added_at: item.wall_visible ? item.upload_time : null,
    published_at: item.moderation_status === 'approved' ? item.upload_time : null,
    captured_at: null, sort_order: 0, created_at: item.upload_time, updated_at: item.upload_time,
    signed_url: item.image_src, thumbnail_signed_url: item.image_src,
    album_title: demoAlbums.find((a) => a.id === item.album_id)?.name || null,
    uploader_name: item.uploader_name,
  })), [items, demoAlbums]);

  const albums: GalleryAdminAlbum[] = useMemo(() => demoAlbums.map((a) => ({
    id: a.id, wedding_id: a.wedding_id, title: a.name, description: a.description,
    cover_asset_id: null, allow_uploads: a.id === 'demo-album-reception',
    is_published: true, publish_at: null, sort_order: 0, created_by: null,
    created_at: '2027-01-01T00:00:00Z', updated_at: '2027-01-01T00:00:00Z', archived_at: null,
    asset_count: items.filter((i) => i.album_id === a.id).length,
    cover_signed_url: null,
  })), [demoAlbums, items]);

  const rules: GalleryModerationRules = {
    photos_allowed: true, videos_allowed: false, max_file_size_bytes: 100 * 1024 * 1024,
    max_uploads_per_guest: demoSettings?.guest_uploads_enabled ? 50 : 0,
    manual_approval_required: demoSettings?.couple_approval_required ?? true,
    auto_approve_trusted_guests: false,
    auto_add_to_wall: demoSettings?.auto_add_to_wall ?? false,
    allow_reporting: true, blocked_labels: null, provider_config: null,
  };

  const uploadSettings: GalleryUploadSettings = {
    uploads_enabled: demoSettings?.guest_uploads_enabled ?? true,
    max_file_size_bytes: 100 * 1024 * 1024,
    allowed_image_types: ['image/jpeg', 'image/png', 'image/webp'],
    allowed_video_types: ['video/mp4', 'video/webm'],
    max_uploads_per_guest: 50,
    require_metadata_consent: true,
  };

  const storageUsage: StorageUsage = {
    total_bytes: items.length * 3 * 1024 * 1024, image_bytes: items.length * 3 * 1024 * 1024, video_bytes: 0,
    file_count: items.length, largest_files: [], archived_bytes: 0,
  };

  const refresh = useCallback(async () => {}, []);
  const moderateAsset = useCallback(async (assetId: string, status: GalleryModerationStatus, reason?: string) => {
    setSaving(true);
    const demoStatus = status === 'awaiting_review' ? 'needs_review' : status;
    demo?.updateGalleryModeration(assetId, demoStatus as DemoGalleryItem['moderation_status']);
    await new Promise((r) => setTimeout(r, 200));
    setSaving(false);
  }, [demo]);
  const bulkModerate = useCallback(async (assetIds: string[], status: GalleryModerationStatus) => {
    setSaving(true);
    const demoStatus = status === 'awaiting_review' ? 'needs_review' : status;
    for (const id of assetIds) demo?.updateGalleryModeration(id, demoStatus as DemoGalleryItem['moderation_status']);
    await new Promise((r) => setTimeout(r, 200));
    setSaving(false);
  }, [demo]);
  const toggleWall = useCallback(async (assetId: string) => {
    const asset = assets.find((a) => a.id === assetId);
    if (asset) demo?.toggleWallVisibility(assetId, !asset.wall_visible);
    await new Promise((r) => setTimeout(r, 100));
  }, [demo, assets]);
  const bulkToggleWall = useCallback(async (assetIds: string[], visible: boolean) => {
    for (const id of assetIds) demo?.toggleWallVisibility(id, visible);
    await new Promise((r) => setTimeout(r, 100));
  }, [demo]);
  const updateAssetCaption = useCallback(async (assetId: string, caption: string, albumId?: string) => {
    demo?.editGalleryCaption(assetId, caption, albumId);
    await new Promise((r) => setTimeout(r, 100));
  }, [demo]);
  const moveToAlbum = useCallback(async (assetIds: string[], albumId: string | null) => {
    for (const id of assetIds) {
      if (albumId) demo?.editGalleryCaption(id, assets.find((a) => a.id === id)?.caption || '', albumId);
    }
    await new Promise((r) => setTimeout(r, 100));
  }, [demo, assets]);
  const archiveAsset = useCallback(async () => { setSaving(true); await new Promise((r) => setTimeout(r, 200)); setSaving(false); }, []);
  const deleteAsset = useCallback(async () => { setSaving(true); await new Promise((r) => setTimeout(r, 200)); setSaving(false); }, []);
  const updateRules = useCallback(async () => { await new Promise((r) => setTimeout(r, 100)); }, []);
  const uploadFiles = useCallback(async (files: File[], albumId: string, captions: string[]): Promise<string[]> => {
    for (let i = 0; i < files.length; i++) {
      if (!demo) return [];
      const f = files[i];
      demo.addGalleryItem({
        id: `demo-gallery-couple-${Date.now()}-${i}`,
        wedding_id: demo.state.wedding.id,
        album_id: albumId,
        image_src: URL.createObjectURL(f),
        caption: captions[i] || f.name,
        uploader_name: 'Wedding Admin',
        upload_time: new Date().toISOString(),
        moderation_status: 'approved',
        favourite_count: 0,
        reported: false,
        ai_label: 'Couple upload',
        wall_visible: true,
      });
    }
    return [];
  }, [demo]);
  const downloadAsset = useCallback((assetId: string) => {
    const asset = assets.find((a) => a.id === assetId);
    if (asset?.signed_url) window.open(asset.signed_url, '_blank');
  }, [assets]);

  return { assets, albums, rules, uploadSettings, storageUsage, loading, error, saving, refresh, moderateAsset, bulkModerate, toggleWall, bulkToggleWall, updateAssetCaption, moveToAlbum, archiveAsset, deleteAsset, updateRules, uploadFiles, downloadAsset };
}

export function useGalleryAdmin(weddingId: string | null): UseGalleryAdminReturn {
  const demo = useDemoDataSafe();
  const real = useRealGalleryAdmin(weddingId);
  const demoResult = useDemoGalleryAdmin();

  if (isDemoMode && demo) return demoResult;
  return real;
}