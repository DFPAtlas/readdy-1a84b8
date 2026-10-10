import type * as React from "react";
import { useState, useMemo, useCallback, useRef } from 'react';
import type { GalleryAdminAsset, GalleryAdminAlbum } from '@/types/gallery';
import { MODERATION_STATUS_OPTIONS, SOURCE_TYPE_OPTIONS, MEDIA_TYPE_OPTIONS, ALLOWED_IMAGE_TYPES, ALLOWED_VIDEO_TYPES, MAX_BATCH_UPLOAD } from '@/types/gallery';

interface MediaTabProps {
  assets: GalleryAdminAsset[];
  albums: GalleryAdminAlbum[];
  saving: boolean;
  onDelete: (assetId: string) => Promise<void>;
  onArchive: (assetId: string) => Promise<void>;
  onToggleWall: (assetId: string) => Promise<void>;
  onBulkToggleWall: (assetIds: string[], visible: boolean) => Promise<void>;
  onUpdateCaption: (assetId: string, caption: string, albumId?: string) => Promise<void>;
  onMoveToAlbum: (assetIds: string[], albumId: string | null) => Promise<void>;
  onDownload: (assetId: string) => Promise<void>;
  onUpload: (files: File[], albumId: string, captions: string[]) => Promise<string[]>;
  showToast: (msg: string) => void;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return 'Unknown';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' });
}

export default function MediaTab({
  assets, albums, saving, onDelete, onArchive, onToggleWall, onBulkToggleWall,
  onUpdateCaption, onMoveToAlbum, onDownload, onUpload, showToast,
}: MediaTabProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [mediaFilter, setMediaFilter] = useState('all');
  const [albumFilter, setAlbumFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);

  // Upload state
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFiles, setUploadFilesState] = useState<File[]>([]);
  const [uploadCaptions, setUploadCaptions] = useState<string[]>([]);
  const [uploadAlbumId, setUploadAlbumId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [uploadAlbumWallVisible, setUploadAlbumWallVisible] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit state
  const [editingAsset, setEditingAsset] = useState<GalleryAdminAsset | null>(null);
  const [editCaption, setEditCaption] = useState('');
  const [editAlbum, setEditAlbum] = useState('');

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Rejection reason
  const [rejectReason, setRejectReason] = useState('');

  const filtered = useMemo(() => {
    let result = [...assets];
    if (statusFilter !== 'all') {
      if (statusFilter === 'on_wall') result = result.filter((a) => a.wall_visible);
      else result = result.filter((a) => a.moderation_status === statusFilter);
    }
    if (sourceFilter !== 'all') result = result.filter((a) => a.source_type === sourceFilter);
    if (mediaFilter !== 'all') {
      if (mediaFilter === 'image') result = result.filter((a) => a.mime_type?.startsWith('image/'));
      else if (mediaFilter === 'video') result = result.filter((a) => a.mime_type?.startsWith('video/'));
    }
    if (albumFilter !== 'all') result = result.filter((a) => a.album_id === albumFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((a) =>
        (a.title || a.caption || '').toLowerCase().includes(q) ||
        (a.album_title || '').toLowerCase().includes(q) ||
        (a.uploader_name || '').toLowerCase().includes(q)
      );
    }
    switch (sortBy) {
      case 'newest': result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); break;
      case 'oldest': result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()); break;
      case 'a-z': result.sort((a, b) => (a.title || '').localeCompare(b.title || '')); break;
      case 'largest': result.sort((a, b) => (b.file_size || 0) - (a.file_size || 0)); break;
    }
    return result;
  }, [assets, statusFilter, sourceFilter, mediaFilter, albumFilter, search, sortBy]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map((a) => a.id)));
  }, [filtered, selectedIds]);

  const handleUploadSubmit = async () => {
    if (uploadFiles.length === 0 || !uploadAlbumId) return;
    setUploading(true);
    setUploadProgress(0);
    const errors = await onUpload(uploadFiles, uploadAlbumId, uploadCaptions);
    setUploading(false);
    if (errors.length === 0) {
      showToast(`${uploadFiles.length} file(s) uploaded`);
      setShowUpload(false);
      setUploadFilesState([]);
      setUploadCaptions([]);
    } else {
      showToast(`${errors.length} error(s) during upload`);
    }
  };

  const handleDragFiles = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    const validFiles = files.filter((f) => {
      const allTypes = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];
      return allTypes.includes(f.type) || f.type === '';
    }).slice(0, MAX_BATCH_UPLOAD);
    setUploadFilesState(validFiles);
    setUploadCaptions(validFiles.map((f) => f.name.replace(/\.[^.]+$/, '')));
    if (albums.length > 0 && !uploadAlbumId) setUploadAlbumId(albums[0].id);
  };

  const statusColor = (status: string) => MODERATION_STATUS_OPTIONS.find((o) => o.value === status)?.color || 'bg-secondary-100 text-secondary-600';
  const statusLabel = (status: string) => {
    const map: Record<string, string> = { approved: 'Approved', awaiting_review: 'Awaiting', pending: 'Pending', scanning: 'Scanning', uploading: 'Uploading', rejected: 'Rejected', hidden: 'Hidden', held: 'Held', removed: 'Removed', failed: 'Failed' };
    return map[status] || status;
  };

  const bulkActions = selectedIds.size > 0 && (
    <div className="flex items-center gap-2 bg-primary-50 border border-primary-200 rounded-lg px-3 py-2 mb-4">
      <span className="text-xs font-label text-primary-700">{selectedIds.size} selected</span>
      <button onClick={() => { onBulkToggleWall(Array.from(selectedIds), true); showToast('Added to wall'); setSelectedIds(new Set()); }} className="text-[10px] px-2 py-1 rounded bg-primary-100 text-primary-700 font-label hover:bg-primary-200 cursor-pointer whitespace-nowrap">Add to wall</button>
      <button onClick={() => { onBulkToggleWall(Array.from(selectedIds), false); showToast('Removed from wall'); setSelectedIds(new Set()); }} className="text-[10px] px-2 py-1 rounded bg-secondary-100 text-secondary-600 font-label hover:bg-secondary-200 cursor-pointer whitespace-nowrap">Remove from wall</button>
      <button onClick={() => { onArchive(Array.from(selectedIds)[0]); showToast('Archived'); setSelectedIds(new Set()); }} className="text-[10px] px-2 py-1 rounded bg-red-50 text-red-600 font-label hover:bg-red-100 cursor-pointer whitespace-nowrap">Archive</button>
      <button onClick={() => setSelectedIds(new Set())} className="text-[10px] text-foreground-400 hover:text-foreground-600 cursor-pointer">Clear</button>
    </div>
  );

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex items-center gap-2 flex-1 bg-white border border-secondary-200 rounded-lg px-3 py-2">
          <i className="ri-search-line text-foreground-400 text-sm" />
          <input type="text" placeholder="Search by caption, album or uploader..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 bg-transparent text-sm text-foreground-800 placeholder-foreground-400 outline-none" />
          {search && <button onClick={() => setSearch('')} className="text-foreground-400 hover:text-foreground-600 cursor-pointer"><i className="ri-close-line text-sm" /></button>}
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-white border border-secondary-200 rounded-lg px-3 py-2 text-xs font-label text-foreground-700 cursor-pointer outline-none">
          {MODERATION_STATUS_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
        </select>
        <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className="bg-white border border-secondary-200 rounded-lg px-3 py-2 text-xs font-label text-foreground-700 cursor-pointer outline-none">
          {SOURCE_TYPE_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
        </select>
        <select value={mediaFilter} onChange={(e) => setMediaFilter(e.target.value)} className="bg-white border border-secondary-200 rounded-lg px-3 py-2 text-xs font-label text-foreground-700 cursor-pointer outline-none">
          {MEDIA_TYPE_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
        </select>
        <select value={albumFilter} onChange={(e) => setAlbumFilter(e.target.value)} className="bg-white border border-secondary-200 rounded-lg px-3 py-2 text-xs font-label text-foreground-700 cursor-pointer outline-none">
          <option value="all">All albums</option>
          {albums.map((a) => (<option key={a.id} value={a.id}>{a.title}</option>))}
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="bg-white border border-secondary-200 rounded-lg px-3 py-2 text-xs font-label text-foreground-700 cursor-pointer outline-none">
          <option value="newest">Newest</option><option value="oldest">Oldest</option>
          <option value="a-z">A-Z</option><option value="largest">Largest</option>
        </select>
        <div className="flex items-center gap-1">
          <button onClick={() => setViewMode('grid')} className={`w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer ${viewMode === 'grid' ? 'bg-primary-100 text-primary-600' : 'text-foreground-400 hover:bg-background-100'}`}>
            <i className="ri-layout-grid-line" />
          </button>
          <button onClick={() => setViewMode('list')} className={`w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer ${viewMode === 'list' ? 'bg-primary-100 text-primary-600' : 'text-foreground-400 hover:bg-background-100'}`}>
            <i className="ri-list-check" />
          </button>
          <button onClick={() => { setSelectMode(!selectMode); setSelectedIds(new Set()); }} className={`w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer ${selectMode ? 'bg-primary-100 text-primary-600' : 'text-foreground-400 hover:bg-background-100'}`}>
            <i className="ri-checkbox-multiple-line" />
          </button>
          <button onClick={() => { setShowUpload(true); if (albums.length > 0) setUploadAlbumId(albums[0].id); }} className="ml-2 px-3 py-2 rounded-lg bg-primary-500 text-background-50 text-xs font-label font-medium hover:bg-primary-600 cursor-pointer whitespace-nowrap transition-colors">
            <i className="ri-upload-cloud-2-line mr-1" />Upload
          </button>
        </div>
      </div>

      {bulkActions}

      {/* Empty */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-secondary-100 rounded-xl p-12 text-center">
          <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-background-100 text-foreground-300 mb-4">
            <i className="ri-image-line text-2xl" />
          </div>
          <p className="text-sm text-foreground-500 mb-2">No media found</p>
          <p className="text-xs text-foreground-400 mb-4">Upload your first wedding photos to get started.</p>
          <button onClick={() => setShowUpload(true)} className="px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-label font-medium hover:bg-primary-600 cursor-pointer whitespace-nowrap transition-colors">
            <i className="ri-upload-cloud-2-line mr-1" />Upload media
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid view */
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map((asset) => {
            const isVideo = asset.mime_type?.startsWith('video/');
            const isSelected = selectedIds.has(asset.id);
            return (
              <div key={asset.id} className={`bg-white border rounded-xl overflow-hidden group transition-all ${isSelected ? 'border-primary-400 ring-2 ring-primary-200' : 'border-secondary-100 hover:border-secondary-300'}`}>
                <div className="relative aspect-[4/3] bg-background-50 overflow-hidden">
                  {asset.signed_url ? (
                    isVideo ? (
                      <video src={asset.signed_url} className="w-full h-full object-cover" muted />
                    ) : (
                      <img src={asset.signed_url} alt={asset.title || ''} className="w-full h-full object-cover" loading="lazy" />
                    )
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-secondary-100">
                      <i className="ri-image-line text-3xl text-foreground-300" />
                    </div>
                  )}
                  {/* Selection checkbox */}
                  {selectMode && (
                    <button onClick={() => toggleSelect(asset.id)} className={`absolute top-2 left-2 w-6 h-6 rounded-md flex items-center justify-center cursor-pointer transition-colors ${isSelected ? 'bg-primary-500 text-white' : 'bg-white/80 text-foreground-400 hover:bg-white'}`}>
                      <i className={isSelected ? 'ri-check-line text-sm' : 'ri-checkbox-blank-line text-sm'} />
                    </button>
                  )}
                  {/* Badges */}
                  <div className="absolute top-2 right-2 flex items-center gap-1">
                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-label font-medium ${statusColor(asset.moderation_status)}`}>{statusLabel(asset.moderation_status)}</span>
                    {asset.wall_visible && <span className="px-1.5 py-0.5 rounded-full bg-primary-100 text-primary-700 text-[9px] font-label"><i className="ri-tv-line text-[8px]" /></span>}
                    {isVideo && <span className="px-1.5 py-0.5 rounded-full bg-secondary-100 text-secondary-700 text-[9px] font-label"><i className="ri-video-line text-[8px]" /></span>}
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-xs text-foreground-800 line-clamp-1 mb-1">{asset.title || 'Untitled'}</p>
                  <div className="flex items-center justify-between text-[10px] text-foreground-400">
                    <span>{asset.album_title || 'No album'}</span>
                    <span>{formatFileSize(asset.file_size)}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[9px] text-foreground-400">
                    <span>{asset.source_type === 'guest' ? (asset.uploader_name || 'Guest') : asset.source_type}</span>
                    <span>{formatDate(asset.created_at)}</span>
                  </div>
                  {/* Quick actions */}
                  <div className="flex items-center gap-1 mt-2 pt-2 border-t border-secondary-100">
                    {asset.moderation_status === 'approved' && (
                      <button onClick={() => { onToggleWall(asset.id); showToast(asset.wall_visible ? 'Removed from wall' : 'Added to wall'); }} className={`flex-1 text-[10px] py-1 rounded font-label cursor-pointer whitespace-nowrap transition-colors ${asset.wall_visible ? 'bg-primary-50 text-primary-600 hover:bg-primary-100' : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'}`}>
                        {asset.wall_visible ? 'On wall' : 'Wall +'}
                      </button>
                    )}
                    <button onClick={() => { onDownload(asset.id); }} className="text-[10px] py-1 px-2 rounded bg-secondary-100 text-secondary-600 font-label hover:bg-secondary-200 cursor-pointer whitespace-nowrap transition-colors">
                      <i className="ri-download-line" />
                    </button>
                    <button onClick={() => { setEditingAsset(asset); setEditCaption(asset.title || ''); setEditAlbum(asset.album_id || ''); }} className="text-[10px] py-1 px-2 rounded bg-secondary-100 text-secondary-600 font-label hover:bg-secondary-200 cursor-pointer whitespace-nowrap transition-colors">
                      <i className="ri-edit-line" />
                    </button>
                    <button onClick={() => setDeletingId(asset.id)} className="text-[10px] py-1 px-2 rounded bg-secondary-100 text-secondary-600 font-label hover:bg-red-50 hover:text-red-500 cursor-pointer whitespace-nowrap transition-colors">
                      <i className="ri-more-2-fill" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List view */
        <div className="bg-white border border-secondary-100 rounded-xl overflow-hidden">
          <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2.5 bg-background-100 text-[10px] font-label text-foreground-500 uppercase tracking-wider border-b border-secondary-100">
            <div className="col-span-5">Media</div>
            <div className="col-span-2">Date &amp; time</div>
            <div className="col-span-2">Album</div>
            <div className="col-span-1">Status</div>
            <div className="col-span-2">Actions</div>
          </div>
          {filtered.map((asset) => (
            <div key={asset.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-4 py-3 items-center border-b border-secondary-50 hover:bg-background-50 transition-colors">
              <div className="md:col-span-5 flex items-center gap-3">
                <div className="w-12 h-10 rounded-md bg-background-50 overflow-hidden flex-shrink-0">
                  {asset.signed_url ? <img src={asset.signed_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><i className="ri-image-line text-sm text-foreground-300" /></div>}
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-foreground-800 truncate">{asset.title || 'Untitled'}</p>
                  <p className="text-[10px] text-foreground-400">{formatFileSize(asset.file_size)} &middot; {asset.source_type}</p>
                </div>
              </div>
              <div className="md:col-span-2 text-xs text-foreground-500">{formatDate(asset.created_at)}</div>
              <div className="md:col-span-2 text-xs text-foreground-500">{asset.album_title || '—'}</div>
              <div className="md:col-span-1">
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-label ${statusColor(asset.moderation_status)}`}>{statusLabel(asset.moderation_status)}</span>
              </div>
              <div className="md:col-span-2 flex items-center gap-1">
                {asset.moderation_status === 'approved' && (
                  <button onClick={() => { onToggleWall(asset.id); showToast(asset.wall_visible ? 'Removed from wall' : 'Added to wall'); }} className="text-[10px] py-1 px-2 rounded bg-secondary-100 text-secondary-600 font-label hover:bg-secondary-200 cursor-pointer whitespace-nowrap">
                    {asset.wall_visible ? <><i className="ri-tv-line" /> Wall</> : 'Wall +'}
                  </button>
                )}
                <button onClick={() => onDownload(asset.id)} className="text-[10px] py-1 px-2 rounded bg-secondary-100 text-secondary-600 font-label hover:bg-secondary-200 cursor-pointer"><i className="ri-download-line" /></button>
                <button onClick={() => setDeletingId(asset.id)} className="text-[10px] py-1 px-2 rounded bg-secondary-100 text-secondary-600 font-label hover:bg-red-50 hover:text-red-500 cursor-pointer"><i className="ri-more-2-fill" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-foreground-400 text-center mt-8">
        {filtered.length} of {assets.length} media items
      </p>

      {/* Upload drawer */}
      {showUpload && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setShowUpload(false)} />
          <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white shadow-xl z-50 flex flex-col animate-[slideIn_0.25s_ease-out]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-secondary-100">
              <div>
                <h2 className="font-heading text-lg font-semibold text-foreground-900">Upload media</h2>
                <p className="text-xs text-foreground-400">{uploadFiles.length > 0 ? `${uploadFiles.length} file(s) selected` : 'Drag photos or videos here'}</p>
              </div>
              <button onClick={() => setShowUpload(false)} className="w-8 h-8 flex items-center justify-center rounded-md text-foreground-400 hover:bg-background-100 cursor-pointer"><i className="ri-close-line" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <label className="text-xs font-label font-medium text-foreground-600 mb-1.5 block">Album</label>
                <select value={uploadAlbumId} onChange={(e) => setUploadAlbumId(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-secondary-200 text-sm text-foreground-800 outline-none cursor-pointer">
                  <option value="">Select album...</option>
                  {albums.map((a) => (<option key={a.id} value={a.id}>{a.title}</option>))}
                </select>
              </div>
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${dragOver ? 'border-primary-400 bg-primary-50/50' : 'border-secondary-200 hover:border-secondary-300 bg-background-50'}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDragFiles}
                onClick={() => fileInputRef.current?.click()}
              >
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" multiple className="hidden" onChange={(e) => {
                  const files = Array.from(e.target.files || []).slice(0, MAX_BATCH_UPLOAD);
                  setUploadFilesState(files);
                  setUploadCaptions(files.map((f) => f.name.replace(/\.[^.]+$/, '')));
                }} />
                <div className="w-14 h-14 mx-auto rounded-xl bg-secondary-100 flex items-center justify-center mb-3">
                  <i className="ri-upload-cloud-2-line text-2xl text-foreground-350" />
                </div>
                <p className="text-sm text-foreground-600"><span className="font-medium text-primary-600">Click to upload</span> or drag and drop</p>
                <p className="text-xs text-foreground-400 mt-1">JPG, PNG, WebP, MP4, WebM &middot; Max {MAX_BATCH_UPLOAD} files</p>
              </div>
              {uploadFiles.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {uploadFiles.map((f, i) => (
                    <div key={i} className="flex items-center gap-3 bg-background-50 rounded-lg p-2">
                      <div className="w-10 h-8 rounded bg-secondary-100 flex items-center justify-center flex-shrink-0">
                        <i className={f.type.startsWith('video/') ? 'ri-video-line' : 'ri-image-line'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground-700 truncate">{f.name}</p>
                        <p className="text-[10px] text-foreground-400">{formatFileSize(f.size)}</p>
                      </div>
                      <input
                        type="text"
                        value={uploadCaptions[i] || ''}
                        onChange={(e) => {
                          const newCaptions = [...uploadCaptions];
                          newCaptions[i] = e.target.value;
                          setUploadCaptions(newCaptions);
                        }}
                        placeholder="Caption"
                        className="w-28 px-2 py-1 rounded border border-secondary-200 text-xs text-foreground-700 outline-none"
                      />
                      <button onClick={() => {
                        setUploadFilesState(uploadFiles.filter((_, j) => j !== i));
                        setUploadCaptions(uploadCaptions.filter((_, j) => j !== i));
                      }} className="text-foreground-400 hover:text-red-500 cursor-pointer">
                        <i className="ri-close-line" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <label className="flex items-center gap-2 text-xs text-foreground-600 cursor-pointer">
                <input type="checkbox" checked={uploadAlbumWallVisible} onChange={(e) => setUploadAlbumWallVisible(e.target.checked)} />
                Add to live wall after approval
              </label>
            </div>
            <div className="px-5 py-4 border-t border-secondary-100 flex items-center gap-3">
              <button onClick={() => setShowUpload(false)} className="flex-1 px-4 py-2.5 rounded-lg border border-secondary-200 text-sm font-label text-foreground-600 hover:bg-background-100 transition-colors cursor-pointer">Cancel</button>
              <button onClick={handleUploadSubmit} disabled={uploadFiles.length === 0 || !uploadAlbumId || uploading} className="flex-1 px-4 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-label font-medium hover:bg-primary-600 disabled:opacity-40 transition-colors cursor-pointer whitespace-nowrap">
                {uploading ? <><i className="ri-loader-4-line animate-spin mr-1" />Uploading...</> : `Upload ${uploadFiles.length} file(s)`}
              </button>
            </div>
          </div>
          <style>{`@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
        </>
      )}

      {/* Edit caption modal */}
      {editingAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setEditingAsset(null)}>
          <div className="bg-white rounded-xl w-full max-w-sm mx-4 p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-heading text-lg text-foreground-900 mb-4">Edit media</h3>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-label text-foreground-500 mb-1 block">Caption</label>
                <input type="text" value={editCaption} onChange={(e) => setEditCaption(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm outline-none" />
              </div>
              <div>
                <label className="text-[11px] font-label text-foreground-500 mb-1 block">Album</label>
                <select value={editAlbum} onChange={(e) => setEditAlbum(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm outline-none cursor-pointer">
                  <option value="">No album</option>
                  {albums.map((a) => (<option key={a.id} value={a.id}>{a.title}</option>))}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-4">
              <button onClick={() => setEditingAsset(null)} className="flex-1 py-2 rounded-lg border border-secondary-200 text-sm font-label text-foreground-600 cursor-pointer">Cancel</button>
              <button onClick={async () => { await onUpdateCaption(editingAsset.id, editCaption, editAlbum || undefined); showToast('Updated'); setEditingAsset(null); }} className="flex-1 py-2 rounded-lg bg-primary-500 text-white text-sm font-label font-medium cursor-pointer whitespace-nowrap">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDeletingId(null)}>
          <div className="bg-white rounded-xl w-full max-w-sm mx-4 p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-10 mx-auto rounded-full bg-red-50 flex items-center justify-center mb-3">
              <i className="ri-delete-bin-line text-red-500" />
            </div>
            <h3 className="font-heading text-lg text-foreground-900 text-center mb-2">Delete media?</h3>
            <p className="text-xs text-foreground-500 text-center mb-4">This will permanently delete the file from storage.</p>
            <div className="flex items-center gap-3">
              <button onClick={() => setDeletingId(null)} className="flex-1 py-2 rounded-lg border border-secondary-200 text-sm font-label text-foreground-600 cursor-pointer">Cancel</button>
              <button onClick={async () => { await onDelete(deletingId); showToast('Deleted'); setDeletingId(null); }} className="flex-1 py-2 rounded-lg bg-red-500 text-white text-sm font-label font-medium cursor-pointer whitespace-nowrap">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}