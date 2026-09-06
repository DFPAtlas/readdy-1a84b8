import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { isDemoMode } from '@/demo/demoConfig';
import { useDemoDataSafe } from '@/demo/useDemoDataSafe';
import type { GalleryAdminAlbum, GalleryAdminAsset } from '@/types/gallery';

export interface UseGalleryAlbumsReturn {
  albums: GalleryAdminAlbum[];
  loading: boolean;
  saving: boolean;
  error: string;
  createAlbum: (data: Partial<GalleryAdminAlbum>) => Promise<string | null>;
  updateAlbum: (albumId: string, data: Partial<GalleryAdminAlbum>) => Promise<void>;
  deleteAlbum: (albumId: string, moveToAlbumId: string | null) => Promise<void>;
  setCover: (albumId: string, assetId: string) => Promise<void>;
  reorderAlbums: (albumIds: string[]) => Promise<void>;
}

function useRealGalleryAlbums(weddingId: string | null, albums: GalleryAdminAlbum[], refresh: () => Promise<void>): UseGalleryAlbumsReturn {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const createAlbum = useCallback(async (data: Partial<GalleryAdminAlbum>): Promise<string | null> => {
    if (!weddingId) return null;
    setSaving(true); setError('');
    try {
      const { data: created, error: insertErr } = await supabase.from('gallery_albums').insert({
        wedding_id: weddingId,
        title: data.title || 'New Album',
        description: data.description || null,
        allow_uploads: data.allow_uploads ?? false,
        is_published: data.is_published ?? true,
        sort_order: data.sort_order ?? albums.length + 1,
      }).select('id').single();
      if (insertErr) throw insertErr;
      await refresh();
      return (created as { id: string }).id;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create album');
      return null;
    } finally { setSaving(false); }
  }, [weddingId, albums.length, refresh]);

  const updateAlbum = useCallback(async (albumId: string, data: Partial<GalleryAdminAlbum>) => {
    if (!weddingId) return;
    setSaving(true); setError('');
    try {
      await supabase.from('gallery_albums').update({ ...data, updated_at: new Date().toISOString() }).eq('id', albumId).eq('wedding_id', weddingId);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update album');
    } finally { setSaving(false); }
  }, [weddingId, refresh]);

  const deleteAlbum = useCallback(async (albumId: string, moveToAlbumId: string | null) => {
    if (!weddingId) return;
    setSaving(true); setError('');
    try {
      if (moveToAlbumId) {
        await supabase.from('gallery_assets').update({ album_id: moveToAlbumId, updated_at: new Date().toISOString() }).eq('album_id', albumId).eq('wedding_id', weddingId);
      } else {
        await supabase.from('gallery_assets').update({ album_id: null, updated_at: new Date().toISOString() }).eq('album_id', albumId).eq('wedding_id', weddingId);
      }
      await supabase.from('gallery_albums').delete().eq('id', albumId).eq('wedding_id', weddingId);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete album');
    } finally { setSaving(false); }
  }, [weddingId, refresh]);

  const setCover = useCallback(async (albumId: string, assetId: string) => {
    if (!weddingId) return;
    setSaving(true); setError('');
    try {
      await supabase.from('gallery_albums').update({ cover_asset_id: assetId, updated_at: new Date().toISOString() }).eq('id', albumId).eq('wedding_id', weddingId);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set cover');
    } finally { setSaving(false); }
  }, [weddingId, refresh]);

  const reorderAlbums = useCallback(async (albumIds: string[]) => {
    if (!weddingId) return;
    setSaving(true); setError('');
    try {
      for (let i = 0; i < albumIds.length; i++) {
        await supabase.from('gallery_albums').update({ sort_order: i + 1 }).eq('id', albumIds[i]).eq('wedding_id', weddingId);
      }
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reorder');
    } finally { setSaving(false); }
  }, [weddingId, refresh]);

  return { albums, loading, saving, error, createAlbum, updateAlbum, deleteAlbum, setCover, reorderAlbums };
}

// ── Demo implementation ──

function useDemoGalleryAlbums(albums: GalleryAdminAlbum[]): UseGalleryAlbumsReturn {
  const demo = useDemoDataSafe();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const createAlbum = useCallback(async (): Promise<string | null> => 'demo-album-new', []);
  const updateAlbum = useCallback(async () => {}, []);
  const deleteAlbum = useCallback(async () => {}, []);
  const setCover = useCallback(async () => {}, []);
  const reorderAlbums = useCallback(async () => {}, []);
  return { albums, loading, saving, error, createAlbum, updateAlbum, deleteAlbum, setCover, reorderAlbums };
}

export function useGalleryAlbums(weddingId: string | null, albums: GalleryAdminAlbum[], refresh: () => Promise<void>): UseGalleryAlbumsReturn {
  const demo = useDemoDataSafe();
  const real = useRealGalleryAlbums(weddingId, albums, refresh);
  const demoResult = useDemoGalleryAlbums(albums);

  if (isDemoMode && demo) return demoResult;
  return real;
}