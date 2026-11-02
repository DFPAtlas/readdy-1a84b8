import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import QrCode from '@/components/feature/QrCode';
import { qrPngDataUrl, sharedPhotoUploadUrl } from '@/lib/sharedPhotoLink';
import type { GalleryAdminAlbum } from '@/types/gallery';

interface LinkRow {
  token: string;
  album_id: string | null;
  enabled: boolean;
}

interface Props {
  weddingId: string;
  albums: GalleryAdminAlbum[];
  showToast: (msg: string) => void;
}

/**
 * Couple controls for the wedding-wide photo upload link: one QR code guests can
 * scan (on the live wall or a printed card). Photos sent through it always wait in
 * the moderation queue.
 */
export default function SharedUploadLinkCard({ weddingId, albums, showToast }: Props) {
  const [link, setLink] = useState<LinkRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const usableAlbums = albums.filter((a) => !a.archived_at);

  const load = useCallback(async () => {
    const { data } = await supabase.from('gallery_shared_upload_links')
      .select('token, album_id, enabled').eq('wedding_id', weddingId).maybeSingle();
    setLink((data as LinkRow | null) || null);
    setLoading(false);
  }, [weddingId]);

  useEffect(() => { load(); }, [load]);

  const save = async (changes: Partial<Pick<LinkRow, 'album_id' | 'enabled'>>, done: string) => {
    setBusy(true);
    const query = link
      ? supabase.from('gallery_shared_upload_links').update(changes).eq('wedding_id', weddingId)
      : supabase.from('gallery_shared_upload_links').insert({ wedding_id: weddingId, album_id: usableAlbums[0]?.id ?? null, enabled: true, ...changes });
    const { error } = await query;
    setBusy(false);
    if (error) { showToast(error.message.includes('Upgrade') ? error.message : 'Could not update the photo link'); return; }
    showToast(done);
    await load();
  };

  const replaceLink = async () => {
    setBusy(true);
    const { error } = await supabase.rpc('rotate_gallery_shared_upload_link', { p_wedding_id: weddingId });
    setBusy(false);
    setConfirmReplace(false);
    if (error) { showToast('Could not replace the link'); return; }
    showToast('New link created — old QR codes no longer work');
    await load();
  };

  const url = link ? sharedPhotoUploadUrl(link.token) : '';

  const download = async () => {
    try {
      const href = await qrPngDataUrl(url);
      const a = document.createElement('a');
      a.href = href;
      a.download = 'wedding-photo-upload-qr.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      showToast('Could not create the QR image');
    }
  };

  return (
    <div className="bg-white border border-secondary-100 rounded-xl p-5">
      <h3 className="font-heading text-base font-semibold text-foreground-900 mb-1">Shared photo upload link</h3>
      <p className="text-xs text-foreground-500 mb-4">
        One QR code anyone at the wedding can scan to send you photos — show it on the live wall or print it on table cards.
        Every photo waits for your approval before it appears anywhere.
      </p>

      {loading ? (
        <p className="text-xs text-foreground-400">Loading…</p>
      ) : usableAlbums.length === 0 ? (
        <p className="text-xs text-foreground-600">Create an album first — shared photos are collected into an album you choose.</p>
      ) : !link ? (
        <button disabled={busy} onClick={() => save({}, 'Photo upload link created')}
          className="px-3 py-2 rounded-lg bg-primary-500 text-white text-xs font-label font-medium cursor-pointer disabled:opacity-60">
          <i className="ri-qr-code-line mr-1.5" />Create photo upload link
        </button>
      ) : (
        <div className="space-y-3">
          <label className="flex items-center justify-between text-xs text-foreground-700">
            <span>Accept photos through this link</span>
            <input type="checkbox" checked={link.enabled} disabled={busy}
              onChange={(e) => save({ enabled: e.target.checked }, e.target.checked ? 'Photo link switched on' : 'Photo link switched off')} />
          </label>
          <div>
            <label htmlFor="shared-upload-album" className="text-[11px] font-label text-foreground-500 mb-1 block">Collect photos into</label>
            <select id="shared-upload-album" value={link.album_id || ''} disabled={busy}
              onChange={(e) => save({ album_id: e.target.value || null }, 'Album updated')}
              className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm text-foreground-800 cursor-pointer">
              <option value="">Choose an album…</option>
              {usableAlbums.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
            </select>
            {!link.album_id && <p className="text-[11px] text-amber-700 mt-1">Choose an album to activate the link.</p>}
          </div>

          {link.enabled && link.album_id && (
            <>
              <QrCode value={url} label="QR code for the shared photo upload link" className="w-40 h-40 mx-auto [&>svg]:w-full [&>svg]:h-full" />
              <p className="text-[11px] text-foreground-500 break-all text-center">{url}</p>
              <div className="flex flex-wrap gap-2 justify-center">
                <button onClick={() => navigator.clipboard.writeText(url).then(() => showToast('Link copied'), () => showToast('Could not copy'))}
                  className="px-3 py-1.5 rounded-lg border border-secondary-200 text-xs text-foreground-700 cursor-pointer">
                  <i className="ri-file-copy-line mr-1" />Copy link
                </button>
                <button onClick={download} className="px-3 py-1.5 rounded-lg border border-secondary-200 text-xs text-foreground-700 cursor-pointer">
                  <i className="ri-download-line mr-1" />Download QR
                </button>
              </div>
            </>
          )}

          {confirmReplace ? (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
              <p className="mb-2">Replacing the link stops every existing QR code and copied link from working. Use this if the link has been shared somewhere it shouldn&apos;t be.</p>
              <div className="flex gap-2">
                <button disabled={busy} onClick={replaceLink} className="px-3 py-1.5 rounded-lg bg-amber-600 text-white cursor-pointer">Replace link</button>
                <button onClick={() => setConfirmReplace(false)} className="px-3 py-1.5 rounded-lg border border-amber-300 cursor-pointer">Cancel</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setConfirmReplace(true)} className="text-[11px] text-foreground-500 underline cursor-pointer">Replace link</button>
          )}
        </div>
      )}
    </div>
  );
}
