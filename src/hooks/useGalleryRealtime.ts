import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { edgeFunctionUrl } from '@/lib/edgeFunctions';

export interface WallAsset {
  id: string;
  title: string | null;
  caption: string | null;
  signed_url: string;
  thumbnail_signed_url: string | null;
  mime_type: string;
  credit_name: string | null;
  credit_visibility: string | null;
  uploaded_by_guest_id: string | null;
  wall_added_at: string;
  created_at: string;
  duration_seconds: number | null;
}

interface GalleryRealtimeState {
  wallAssets: WallAsset[];
  loading: boolean;
  error: string;
  lastEvent: string | null;
  refresh: () => Promise<void>;
}

export function useGalleryRealtime(weddingId: string | null, accessId?: string): GalleryRealtimeState {
  const [wallAssets, setWallAssets] = useState<WallAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastEvent, setLastEvent] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const mountedRef = useRef(true);

  const loadWallAssets = useCallback(async () => {
    if (!weddingId) {
      setLoading(false);
      return;
    }

    try {
      // Use the loader for guest portal, or direct query for public wall
      if (accessId) {
        const res = await fetch(
          edgeFunctionUrl('guest-portal-loader'),
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_hash: accessId }),
          }
        );
        const result = await res.json();
        if (result.valid && result.data?.gallery?.albums) {
          const allApproved: WallAsset[] = [];
          for (const album of result.data.gallery.albums) {
            for (const asset of album.assets) {
              if (asset.moderation_status === 'approved' && asset.wall_visible) {
                allApproved.push({
                  id: asset.id,
                  title: asset.title,
                  caption: asset.caption || asset.title,
                  signed_url: asset.signed_url,
                  thumbnail_signed_url: asset.thumbnail_signed_url,
                  mime_type: asset.mime_type,
                  credit_name: asset.credit_name,
                  credit_visibility: asset.credit_visibility,
                  uploaded_by_guest_id: asset.uploaded_by_guest_id,
                  wall_added_at: asset.wall_added_at || asset.published_at || asset.created_at,
                  created_at: asset.created_at,
                  duration_seconds: asset.duration_seconds,
                });
              }
            }
          }
          if (mountedRef.current) {
            setWallAssets(allApproved.sort((a, b) => new Date(b.wall_added_at).getTime() - new Date(a.wall_added_at).getTime()));
          }
        }
      } else {
        // Public wall: fetch directly from DB
        const { data: assets, error: fetchErr } = await supabase
          .from('gallery_assets')
          .select('id, title, caption, storage_path, thumbnail_path, mime_type, credit_name, credit_visibility, uploaded_by_guest_id, wall_added_at, created_at, duration_seconds')
          .eq('wedding_id', weddingId)
          .eq('moderation_status', 'approved')
          .eq('wall_visible', true)
          .order('wall_added_at', { ascending: false });

        if (fetchErr) throw fetchErr;

        // Generate signed URLs for each asset
        const signedAssets: WallAsset[] = [];
        for (const asset of (assets || [])) {
          const { data: signedUrlData } = await supabase.storage
            .from('private')
            .createSignedUrl(asset.storage_path, 3600);

          let thumbUrl: string | null = null;
          if (asset.thumbnail_path) {
            const { data: thumbData } = await supabase.storage
              .from('private')
              .createSignedUrl(asset.thumbnail_path, 3600);
            thumbUrl = thumbData?.signedUrl || null;
          }

          signedAssets.push({
            id: asset.id,
            title: asset.title,
            caption: asset.caption || asset.title,
            signed_url: signedUrlData?.signedUrl || '',
            thumbnail_signed_url: thumbUrl,
            mime_type: asset.mime_type,
            credit_name: asset.credit_name,
            credit_visibility: asset.credit_visibility,
            uploaded_by_guest_id: asset.uploaded_by_guest_id,
            wall_added_at: asset.wall_added_at || asset.created_at,
            created_at: asset.created_at,
            duration_seconds: asset.duration_seconds,
          });
        }

        if (mountedRef.current) {
          setWallAssets(signedAssets);
        }
      }
    } catch (err) {
      if (mountedRef.current) {
        setError('Failed to load wall assets');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [weddingId, accessId]);

  // Initial load
  useEffect(() => {
    mountedRef.current = true;
    loadWallAssets();
    return () => { mountedRef.current = false; };
  }, [loadWallAssets]);

  // Realtime subscription for approved+wall_visible assets
  useEffect(() => {
    if (!weddingId) return;

    const channel = supabase
      .channel(`gallery-wall-${weddingId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gallery_assets',
          filter: `wedding_id=eq.${weddingId}`,
        },
        (payload) => {
          const newAsset = payload.new as Record<string, unknown> | null;
          const oldAsset = payload.old as Record<string, unknown> | null;

          if (payload.eventType === 'INSERT' && newAsset) {
            // Only add if approved + wall_visible
            if (newAsset.moderation_status === 'approved' && newAsset.wall_visible === true) {
              setLastEvent(`new_asset:${newAsset.id}`);
              loadWallAssets();
            }
          } else if (payload.eventType === 'UPDATE' && newAsset) {
            const wasOnWall = oldAsset?.moderation_status === 'approved' && oldAsset?.wall_visible === true;
            const isOnWall = newAsset.moderation_status === 'approved' && newAsset.wall_visible === true;
            const statusChanged = oldAsset?.moderation_status !== newAsset.moderation_status;
            const wallChanged = oldAsset?.wall_visible !== newAsset.wall_visible;

            if (wasOnWall !== isOnWall || statusChanged || wallChanged) {
              setLastEvent(`update:${newAsset.id}`);
              loadWallAssets();
            }
          } else if (payload.eventType === 'DELETE') {
            if (oldAsset?.wall_visible === true) {
              setLastEvent(`remove:${oldAsset.id}`);
              loadWallAssets();
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn('Gallery realtime channel error, will retry');
          setTimeout(() => {
            if (mountedRef.current) channel.subscribe();
          }, 3000);
        }
        if (status === 'SUBSCRIBED') {
          // Realtime connection established
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [weddingId, loadWallAssets]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await loadWallAssets();
  }, [loadWallAssets]);

  return { wallAssets, loading, error, lastEvent, refresh };
}