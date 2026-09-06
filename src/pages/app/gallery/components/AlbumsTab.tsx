import { useState, useMemo, useCallback } from 'react';
import type { GalleryAdminAsset, GalleryAdminAlbum } from '@/types/gallery';
import type { UseGalleryAlbumsReturn } from '@/hooks/useGalleryAlbums';

interface AlbumsTabProps {
  albumHook: UseGalleryAlbumsReturn;
  assets: GalleryAdminAsset[];
  albums: GalleryAdminAlbum[];
  saving: boolean;
  showToast: (msg: string) => void;
}

export default function AlbumsTab({ albumHook, assets, albums, saving, showToast }: AlbumsTabProps) {
  const [editingAlbum, setEditingAlbum] = useState<GalleryAdminAlbum | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editAllowUploads, setEditAllowUploads] = useState(false);
  const [editPublished, setEditPublished] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [deleteAlbumId, setDeleteAlbumId] = useState<string | null>(null);
  const [deleteMoveTo, setDeleteMoveTo] = useState<string | null>(null);
  const [showCoverPicker, setShowCoverPicker] = useState<string | null>(null);

  const { createAlbum, updateAlbum, deleteAlbum, setCover, reorderAlbums } = albumHook;

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createAlbum({ title: newName, is_published: true, allow_uploads: false });
    setNewName('');
    setCreating(false);
    showToast('Album created');
  };

  const handleUpdate = async () => {
    if (!editingAlbum) return;
    await updateAlbum(editingAlbum.id, { title: editName, description: editDesc, allow_uploads: editAllowUploads, is_published: editPublished });
    setEditingAlbum(null);
    showToast('Album updated');
  };

  const handleDelete = async () => {
    if (!deleteAlbumId) return;
    await deleteAlbum(deleteAlbumId, deleteMoveTo);
    setDeleteAlbumId(null);
    setDeleteMoveTo(null);
    showToast('Album deleted');
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newOrder = [...albums];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    reorderAlbums(newOrder.map((a) => a.id));
    showToast('Album reordered');
  };

  const handleMoveDown = (index: number) => {
    if (index === albums.length - 1) return;
    const newOrder = [...albums];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    reorderAlbums(newOrder.map((a) => a.id));
    showToast('Album reordered');
  };

  const getCoverUrl = (album: GalleryAdminAlbum): string | null => {
    if (album.cover_asset_id) {
      const coverAsset = assets.find((a) => a.id === album.cover_asset_id);
      return coverAsset?.signed_url || coverAsset?.thumbnail_signed_url || null;
    }
    const firstAsset = assets.find((a) => a.album_id === album.id);
    return firstAsset?.signed_url || firstAsset?.thumbnail_signed_url || null;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-foreground-500">{albums.length} album{albums.length !== 1 ? 's' : ''}</p>
        <button
          onClick={() => { setCreating(true); setNewName(''); }}
          className="px-3 py-2 rounded-lg bg-primary-500 text-background-50 text-xs font-label font-medium hover:bg-primary-600 cursor-pointer whitespace-nowrap transition-colors"
        >
          <i className="ri-add-line mr-1" />Add album
        </button>
      </div>

      {albums.length === 0 ? (
        <div className="bg-white border border-secondary-100 rounded-xl p-12 text-center">
          <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-background-100 text-foreground-300 mb-4">
            <i className="ri-folder-open-line text-2xl" />
          </div>
          <p className="text-sm text-foreground-500 mb-2">No albums yet</p>
          <p className="text-xs text-foreground-400 mb-4">Create albums to organise your wedding photos.</p>
          <button onClick={() => setCreating(true)} className="px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-label font-medium hover:bg-primary-600 cursor-pointer whitespace-nowrap transition-colors">
            <i className="ri-add-line mr-1" />Create first album
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {albums.map((album, index) => {
            const coverUrl = getCoverUrl(album);
            return (
              <div key={album.id} className="bg-white border border-secondary-100 rounded-xl overflow-hidden group hover:border-secondary-300 transition-all">
                <div className="aspect-[16/10] bg-background-50 relative overflow-hidden">
                  {coverUrl ? (
                    <img src={coverUrl} alt={album.title} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <i className="ri-folder-line text-4xl text-foreground-250" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button onClick={() => { setShowCoverPicker(album.id); }} className="px-3 py-1.5 rounded-lg bg-white text-foreground-900 text-xs font-label font-medium hover:bg-white/90 cursor-pointer whitespace-nowrap">
                      <i className="ri-image-line mr-1" />Cover
                    </button>
                    <button onClick={() => { setEditingAlbum(album); setEditName(album.title); setEditDesc(album.description || ''); setEditAllowUploads(album.allow_uploads); setEditPublished(album.is_published); }} className="px-3 py-1.5 rounded-lg bg-white text-foreground-900 text-xs font-label font-medium hover:bg-white/90 cursor-pointer whitespace-nowrap">
                      <i className="ri-edit-line mr-1" />Edit
                    </button>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-heading text-base font-semibold text-foreground-900">{album.title}</h3>
                    {!album.is_published && (
                      <span className="px-1.5 py-0.5 rounded-full bg-secondary-100 text-secondary-600 text-[9px] font-label">Hidden</span>
                    )}
                    {album.allow_uploads && (
                      <span className="px-1.5 py-0.5 rounded-full bg-accent-100 text-accent-600 text-[9px] font-label">Uploads</span>
                    )}
                  </div>
                  {album.description && <p className="text-xs text-foreground-500 line-clamp-2 mb-2">{album.description}</p>}
                  <div className="flex items-center justify-between text-[11px] text-foreground-400 mt-2">
                    <span><i className="ri-image-line mr-1" />{album.asset_count} items</span>
                    <span>#{album.sort_order}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-3 pt-2 border-t border-secondary-100">
                    <button onClick={() => handleMoveUp(index)} disabled={index === 0} className="w-6 h-6 flex items-center justify-center rounded text-xs text-foreground-400 hover:bg-secondary-100 disabled:opacity-30 cursor-pointer" title="Move up">
                      <i className="ri-arrow-up-s-line" />
                    </button>
                    <button onClick={() => handleMoveDown(index)} disabled={index === albums.length - 1} className="w-6 h-6 flex items-center justify-center rounded text-xs text-foreground-400 hover:bg-secondary-100 disabled:opacity-30 cursor-pointer" title="Move down">
                      <i className="ri-arrow-down-s-line" />
                    </button>
                    <div className="flex-1" />
                    <button onClick={() => { setDeleteAlbumId(album.id); setDeleteMoveTo(null); }} className="text-[10px] px-2 py-1 rounded text-red-500 hover:bg-red-50 cursor-pointer whitespace-nowrap transition-colors">
                      <i className="ri-delete-bin-line mr-0.5" />Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create modal */}
      {creating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setCreating(false)}>
          <div className="bg-white rounded-xl w-full max-w-sm mx-4 p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-heading text-lg text-foreground-900 mb-4">Create album</h3>
            <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Album name" className="w-full px-3 py-2.5 rounded-lg border border-secondary-200 text-sm outline-none mb-4" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }} />
            <div className="flex items-center gap-3">
              <button onClick={() => setCreating(false)} className="flex-1 py-2 rounded-lg border border-secondary-200 text-sm font-label text-foreground-600 cursor-pointer">Cancel</button>
              <button onClick={handleCreate} disabled={!newName.trim()} className="flex-1 py-2 rounded-lg bg-primary-500 text-white text-sm font-label font-medium disabled:opacity-40 cursor-pointer whitespace-nowrap">Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editingAlbum && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setEditingAlbum(null)}>
          <div className="bg-white rounded-xl w-full max-w-md mx-4 p-6 shadow-xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-heading text-lg text-foreground-900 mb-4">Edit album</h3>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-label text-foreground-500 mb-1 block">Name <span className="text-red-400">*</span></label>
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm outline-none" />
              </div>
              <div>
                <label className="text-[11px] font-label text-foreground-500 mb-1 block">Description</label>
                <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm outline-none resize-none" />
              </div>
              <label className="flex items-center justify-between py-1.5 cursor-pointer">
                <span className="text-xs text-foreground-700">Allow guest uploads</span>
                <button onClick={() => setEditAllowUploads(!editAllowUploads)} className={`w-9 h-5 rounded-full relative transition-colors cursor-pointer ${editAllowUploads ? 'bg-primary-500' : 'bg-secondary-300'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${editAllowUploads ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
              </label>
              <label className="flex items-center justify-between py-1.5 cursor-pointer">
                <span className="text-xs text-foreground-700">Published</span>
                <button onClick={() => setEditPublished(!editPublished)} className={`w-9 h-5 rounded-full relative transition-colors cursor-pointer ${editPublished ? 'bg-primary-500' : 'bg-secondary-300'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${editPublished ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
              </label>
            </div>
            <div className="flex items-center gap-3 mt-4">
              <button onClick={() => setEditingAlbum(null)} className="flex-1 py-2 rounded-lg border border-secondary-200 text-sm font-label text-foreground-600 cursor-pointer">Cancel</button>
              <button onClick={handleUpdate} className="flex-1 py-2 rounded-lg bg-primary-500 text-white text-sm font-label font-medium cursor-pointer whitespace-nowrap">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteAlbumId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDeleteAlbumId(null)}>
          <div className="bg-white rounded-xl w-full max-w-sm mx-4 p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-10 mx-auto rounded-full bg-red-50 flex items-center justify-center mb-3">
              <i className="ri-delete-bin-line text-red-500" />
            </div>
            <h3 className="font-heading text-lg text-foreground-900 text-center mb-2">Delete album?</h3>
            <p className="text-xs text-foreground-500 text-center mb-4">Media in this album won&apos;t be deleted. You can move them first.</p>
            <div className="space-y-2 mb-4">
              <p className="text-[11px] font-label text-foreground-500">Move media to:</p>
              <select value={deleteMoveTo || ''} onChange={(e) => setDeleteMoveTo(e.target.value || null)} className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm outline-none cursor-pointer">
                <option value="">Remove from album</option>
                {albums.filter((a) => a.id !== deleteAlbumId).map((a) => (<option key={a.id} value={a.id}>{a.title}</option>))}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setDeleteAlbumId(null)} className="flex-1 py-2 rounded-lg border border-secondary-200 text-sm font-label text-foreground-600 cursor-pointer">Cancel</button>
              <button onClick={handleDelete} className="flex-1 py-2 rounded-lg bg-red-500 text-white text-sm font-label font-medium cursor-pointer whitespace-nowrap">Delete album</button>
            </div>
          </div>
        </div>
      )}

      {/* Cover picker */}
      {showCoverPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowCoverPicker(null)}>
          <div className="bg-white rounded-xl w-full max-w-lg mx-4 p-6 shadow-xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-heading text-lg text-foreground-900 mb-4">Choose cover image</h3>
            <div className="grid grid-cols-3 gap-3">
              {assets.filter((a) => a.album_id === showCoverPicker).map((asset) => (
                <button
                  key={asset.id}
                  onClick={async () => { await setCover(showCoverPicker, asset.id); setShowCoverPicker(null); showToast('Cover updated'); }}
                  className="aspect-[4/3] rounded-lg overflow-hidden border-2 border-transparent hover:border-primary-400 cursor-pointer transition-all"
                >
                  {asset.signed_url ? <img src={asset.signed_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-secondary-100 flex items-center justify-center"><i className="ri-image-line" /></div>}
                </button>
              ))}
            </div>
            {assets.filter((a) => a.album_id === showCoverPicker).length === 0 && (
              <p className="text-sm text-foreground-400 text-center py-8">No media in this album yet</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}