import { useState, useEffect, useCallback, useRef, type FormEvent } from 'react';
import type { GalleryAlbum, GalleryAsset } from '@/types/access';
import { edgeFunctionUrl } from '@/lib/edgeFunctions';

// ── Album type config ──

export const ALBUM_TYPE_ICONS: Record<string, string> = {
  couple: 'ri-hearts-line',
  engagement: 'ri-heart-2-line',
  venue: 'ri-building-4-line',
  wedding_day: 'ri-camera-line',
  guest_uploads: 'ri-upload-cloud-2-line',
  featured: 'ri-star-line',
  general: 'ri-image-line',
};

// ── Lightbox ──

interface LightboxProps {
  assets: GalleryAsset[];
  currentIndex: number;
  album: GalleryAlbum;
  onClose: () => void;
  onNavigate: (index: number) => void;
  onFavourite: (assetId: string) => void;
  onReport: (assetId: string) => void;
}

export function Lightbox({ assets, currentIndex, album, onClose, onNavigate, onFavourite, onReport }: LightboxProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showReportInput, setShowReportInput] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportSubmitted, setReportSubmitted] = useState(false);

  const currentAsset = assets[currentIndex];
  const totalCount = assets.length;

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && currentIndex > 0) onNavigate(currentIndex - 1);
      if (e.key === 'ArrowRight' && currentIndex < totalCount - 1) onNavigate(currentIndex + 1);
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [currentIndex, totalCount, onClose, onNavigate]);

  useEffect(() => {
    setImageLoaded(false);
    setShowReportInput(false);
    setReportSubmitted(false);
    setReportReason('');
  }, [currentIndex]);

  const handleDownload = () => {
    if (!currentAsset?.signed_url) return;
    const a = document.createElement('a');
    a.href = currentAsset.signed_url;
    a.download = currentAsset.title || 'wedding-photo';
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleShare = async () => {
    if (!currentAsset?.signed_url) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: currentAsset.title || 'Wedding photo',
          url: currentAsset.signed_url,
        });
      } catch { /* user cancelled */ }
    } else {
      try {
        await navigator.clipboard.writeText(currentAsset.signed_url);
      } catch { /* clipboard failed */ }
    }
  };

  const handleReportSubmit = () => {
    if (!reportReason.trim() || !currentAsset) return;
    onReport(currentAsset.id);
    setReportSubmitted(true);
    setShowReportInput(false);
  };

  if (!currentAsset) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col" role="dialog" aria-label="Image lightbox">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 text-white/80">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-sm font-label text-white/60 truncate">
            {currentIndex + 1} / {totalCount}
          </span>
          {currentAsset.title && (
            <span className="text-sm text-white/80 truncate hidden sm:inline">{currentAsset.title}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {album.allow_favourites && (
            <button
              onClick={() => onFavourite(currentAsset.id)}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label={currentAsset.is_favourited ? 'Remove from favourites' : 'Add to favourites'}
            >
              <i className={`${currentAsset.is_favourited ? 'ri-heart-fill text-red-400' : 'ri-heart-line'} text-lg`} />
            </button>
          )}
          {album.allow_downloads && (
            <button
              onClick={handleDownload}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Download image"
            >
              <i className="ri-download-line text-lg" />
            </button>
          )}
          {album.allow_sharing && (
            <button
              onClick={handleShare}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Share image"
            >
              <i className="ri-share-line text-lg" />
            </button>
          )}
          <button
            onClick={() => setShowReportInput(!showReportInput)}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-white/40 hover:text-white/70 hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Report content"
          >
            <i className="ri-flag-line text-lg" />
          </button>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer ml-2"
            aria-label="Close lightbox"
          >
            <i className="ri-close-line text-xl" />
          </button>
        </div>
      </div>

      {/* Report input */}
      {showReportInput && !reportSubmitted && (
        <div className="mx-auto w-full max-w-md px-4 mb-2">
          <div className="flex items-center gap-2 bg-white/10 rounded-lg p-2">
            <input
              type="text"
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="Why are you reporting this?"
              maxLength={200}
              className="flex-1 bg-transparent text-white text-sm placeholder:text-white/30 outline-none px-2"
              onKeyDown={(e) => { if (e.key === 'Enter') handleReportSubmit(); }}
            />
            <button
              onClick={handleReportSubmit}
              disabled={!reportReason.trim()}
              className="px-3 py-1.5 rounded-md bg-white/20 text-white text-xs font-label disabled:opacity-30 cursor-pointer whitespace-nowrap"
            >
              Report
            </button>
          </div>
        </div>
      )}
      {reportSubmitted && (
        <div className="mx-auto w-full max-w-md px-4 mb-2">
          <p className="text-center text-xs text-white/50">Thank you — your report has been submitted.</p>
        </div>
      )}

      {/* Image area */}
      <div className="flex-1 flex items-center justify-center px-2 relative min-h-0">
        {/* Left nav */}
        {currentIndex > 0 && (
          <button
            onClick={() => onNavigate(currentIndex - 1)}
            className="absolute left-2 md:left-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-colors cursor-pointer"
            aria-label="Previous image"
          >
            <i className="ri-arrow-left-s-line text-xl" />
          </button>
        )}

        {/* Image */}
        <div className="relative max-w-full max-h-full">
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-10 h-10 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />
            </div>
          )}
          <img
            src={currentAsset.signed_url}
            alt={currentAsset.title || 'Wedding gallery photo'}
            className={`max-w-full max-h-[75vh] object-contain transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImageLoaded(true)}
          />
        </div>

        {/* Right nav */}
        {currentIndex < totalCount - 1 && (
          <button
            onClick={() => onNavigate(currentIndex + 1)}
            className="absolute right-2 md:right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-colors cursor-pointer"
            aria-label="Next image"
          >
            <i className="ri-arrow-right-s-line text-xl" />
          </button>
        )}
      </div>

      {/* Bottom info */}
      <div className="px-4 py-3 text-center">
        {currentAsset.description && (
          <p className="text-sm text-white/50 leading-relaxed max-w-lg mx-auto">{currentAsset.description}</p>
        )}
        {currentAsset.uploaded_by_guest_id && (
          <p className="text-xs text-white/30 mt-1">Guest upload</p>
        )}
      </div>

      {/* Thumbnail strip */}
      {totalCount > 1 && (
        <div className="px-4 pb-3 overflow-x-auto">
          <div className="flex items-center gap-2 justify-center">
            {assets.map((asset, i) => (
              <button
                key={asset.id}
                onClick={() => onNavigate(i)}
                className={`flex-shrink-0 w-14 h-10 rounded-md overflow-hidden border-2 transition-all cursor-pointer ${
                  i === currentIndex ? 'border-white scale-110' : 'border-white/20 opacity-50 hover:opacity-80'
                }`}
              >
                <img
                  src={asset.signed_url}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Upload Modal ──

interface UploadModalProps {
  albumId: string;
  albumTitle: string;
  sessionHash: string;
  onClose: () => void;
  onSuccess: () => void;
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 20 * 1024 * 1024;

export function UploadModal({ albumId, albumTitle, sessionHash, onClose, onSuccess }: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (f: File): string | null => {
    if (!ALLOWED_MIME_TYPES.includes(f.type)) {
      return 'Only JPG, PNG, and WebP images are supported. HEIC files are not currently accepted.';
    }
    if (f.size > MAX_FILE_SIZE) {
      const mb = (f.size / (1024 * 1024)).toFixed(1);
      return `File is ${mb} MB — the maximum is 20 MB.`;
    }
    return null;
  };

  const handleFileSelect = (f: File) => {
    setError('');
    const validationError = validateFile(f);
    if (validationError) {
      setError(validationError);
      setFile(null);
      return;
    }
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFileSelect(droppedFile);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('session_hash', sessionHash);
      formData.append('album_id', albumId);
      formData.append('file', file);
      if (title.trim()) formData.append('title', title.trim());

      const res = await fetch(
        edgeFunctionUrl('guest-gallery-upload'),
        { method: 'POST', body: formData }
      );

      const result = await res.json();
      if (!result.success) {
        setError(result.error || 'Upload failed. Please try again.');
        setUploading(false);
        return;
      }

      onSuccess();
    } catch {
      setError('Could not connect to the upload service. Please try again.');
      setUploading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div
          className="bg-white rounded-2xl w-full max-w-md shadow-lg overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-secondary-100">
            <div>
              <h2 className="font-heading text-lg font-semibold text-foreground-900">Upload photo</h2>
              <p className="text-xs text-foreground-400">{albumTitle}</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-400 hover:bg-background-100 cursor-pointer"
              aria-label="Close"
            >
              <i className="ri-close-line" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-label font-medium text-foreground-700 mb-1.5">
                Title <span className="text-foreground-350 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
                placeholder="A name for this photo"
                className="w-full px-3 py-2.5 rounded-lg border border-secondary-200 text-sm text-foreground-900 placeholder:text-foreground-350 bg-white focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-300 transition-colors"
              />
            </div>

            {/* Drop zone */}
            <div
              className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
                dragOver
                  ? 'border-primary-400 bg-primary-50/50'
                  : file
                    ? 'border-secondary-300 bg-secondary-50/30'
                    : 'border-secondary-200 hover:border-secondary-300 bg-background-50'
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelect(f);
                }}
              />

              {file ? (
                <div className="space-y-2">
                  <div className="w-14 h-14 mx-auto rounded-xl bg-primary-50 flex items-center justify-center">
                    <i className="ri-image-line text-2xl text-primary-400" />
                  </div>
                  <p className="text-sm font-medium text-foreground-900 truncate">{file.name}</p>
                  <p className="text-xs text-foreground-400">
                    {(file.size / (1024 * 1024)).toFixed(1)} MB &middot; {file.type.split('/')[1]?.toUpperCase()}
                  </p>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                    className="text-xs text-foreground-400 hover:text-foreground-600 underline cursor-pointer"
                  >
                    Choose a different file
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="w-14 h-14 mx-auto rounded-xl bg-secondary-100 flex items-center justify-center">
                    <i className="ri-upload-cloud-2-line text-2xl text-foreground-350" />
                  </div>
                  <p className="text-sm text-foreground-600">
                    <span className="font-medium text-primary-600">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-foreground-400">JPG, PNG, or WebP &middot; Max 20 MB</p>
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-100">
                <i className="ri-error-warning-line text-red-400 text-sm mt-0.5 flex-shrink-0" />
                <p className="text-xs text-red-600 leading-relaxed">{error}</p>
              </div>
            )}

            {/* Note */}
            <p className="text-[11px] text-foreground-350 leading-relaxed">
              Uploaded photos will be reviewed by the couple before appearing in the gallery. You can remove your pending upload at any time.
            </p>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-lg border border-secondary-200 text-sm font-label text-foreground-600 hover:bg-background-100 transition-colors cursor-pointer whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!file || uploading}
                className="flex-1 px-4 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-label font-medium hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer whitespace-nowrap"
              >
                {uploading ? (
                  <span className="inline-flex items-center gap-2">
                    <i className="ri-loader-4-line animate-spin" /> Uploading...
                  </span>
                ) : (
                  'Upload photo'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

// ── Pending Upload Card ──

interface PendingCardProps {
  asset: GalleryAsset;
  onRemove: (assetId: string) => void;
}

export function PendingUploadCard({ asset, onRemove }: PendingCardProps) {
  return (
    <div className="relative rounded-xl overflow-hidden bg-background-50 border border-dashed border-amber-200 group">
      <div className="aspect-[4/3] relative">
        {asset.signed_url ? (
          <img
            src={asset.signed_url}
            alt={asset.title || 'Pending upload'}
            className="w-full h-full object-cover opacity-60"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-secondary-100">
            <i className="ri-image-line text-3xl text-foreground-300" />
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="px-3 py-1.5 rounded-full bg-amber-100 border border-amber-200 text-amber-700 text-xs font-label font-medium whitespace-nowrap">
            <i className="ri-time-line mr-1" /> Pending review
          </div>
        </div>
      </div>
      <div className="p-3 flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground-700 truncate">{asset.title || 'Untitled'}</p>
        </div>
        <button
          onClick={() => onRemove(asset.id)}
          className="w-7 h-7 flex items-center justify-center rounded-md text-foreground-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer flex-shrink-0"
          aria-label="Remove upload"
        >
          <i className="ri-delete-bin-line text-sm" />
        </button>
      </div>
    </div>
  );
}

// ── Gallery Skeleton ──

export function GallerySkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-9 w-24 rounded-full bg-secondary-100 flex-shrink-0" />
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="aspect-[4/3] rounded-xl bg-secondary-100" />
        ))}
      </div>
    </div>
  );
}

// ── Gallery Empty ──

export function GalleryEmpty() {
  return (
    <div className="text-center py-16 px-4">
      <div className="w-20 h-20 mx-auto flex items-center justify-center rounded-full bg-secondary-100 mb-6">
        <i className="ri-image-line text-4xl text-secondary-400" />
      </div>
      <h2 className="font-heading text-2xl text-foreground-900 mb-3">No photos yet</h2>
      <p className="text-sm text-foreground-500 leading-relaxed max-w-sm mx-auto">
        The couple haven&apos;t shared any photos in this album yet. Check back later!
      </p>
    </div>
  );
}

// ── Gallery Disabled ──

export function GalleryDisabled() {
  return (
    <div className="text-center py-16 px-4">
      <div className="w-20 h-20 mx-auto flex items-center justify-center rounded-full bg-secondary-100 mb-6">
        <i className="ri-image-line text-4xl text-secondary-400" />
      </div>
      <h2 className="font-heading text-2xl text-foreground-900 mb-3">Gallery not available</h2>
      <p className="text-sm text-foreground-500 leading-relaxed max-w-sm mx-auto">
        The couple have chosen not to share their wedding gallery through the portal at this time.
      </p>
    </div>
  );
}