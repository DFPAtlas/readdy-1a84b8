import type * as React from "react";
import { useState, useRef, useCallback, type FormEvent } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useGuestPortal } from '@/hooks/useGuestPortal';
import type { GalleryData, GalleryAlbum, GalleryUploadSettings } from '@/types/access';
import { edgeFunctionUrl } from '@/lib/edgeFunctions';

const UPLOAD_URL = edgeFunctionUrl('guest-gallery-upload');
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function GuestGalleryUploadPage() {
  const { accessId } = useParams();
  const navigate = useNavigate();
  const { data, loading } = useGuestPortal();

  const [selectedAlbumId, setSelectedAlbumId] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [captions, setCaptions] = useState<Record<number, string>>({});
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<number, 'idle' | 'uploading' | 'done' | 'error'>>({});
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [successCount, setSuccessCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const gallery: GalleryData | null = data?.gallery ?? null;
  const albums: GalleryAlbum[] = gallery?.albums ?? [];
  const uploadSettings: GalleryUploadSettings | null = gallery?.upload_settings ?? null;

  const uploadableAlbums = albums.filter((a) => a.allow_uploads);
  const basePath = `/guest/${accessId}`;

  const now = new Date();
  let uploadState: 'disabled' | 'before_open' | 'open' | 'closed' = 'disabled';
  if (!uploadSettings || !uploadSettings.uploads_enabled) {
    uploadState = 'disabled';
  } else if (uploadSettings.opens_at && now < new Date(uploadSettings.opens_at)) {
    uploadState = 'before_open';
  } else if (uploadSettings.closes_at && now > new Date(uploadSettings.closes_at)) {
    uploadState = 'closed';
  } else {
    uploadState = 'open';
  }

  const maxFiles = uploadSettings?.max_files_per_batch || 10;
  const maxSize = uploadSettings?.max_file_size_bytes || 20971520;

  const validateFile = useCallback((f: File): string | null => {
    if (!ALLOWED_MIME_TYPES.includes(f.type)) {
      return `"${f.name}" is not a supported format. Please use JPG, PNG, or WebP.`;
    }
    if (f.size > maxSize) {
      const mb = (f.size / (1024 * 1024)).toFixed(1);
      return `"${f.name}" is ${mb} MB — maximum is ${(maxSize / 1048576).toFixed(0)} MB.`;
    }
    return null;
  }, [maxSize]);

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    setError('');
    const arr = Array.from(newFiles);
    if (files.length + arr.length > maxFiles) {
      setError(`You can upload up to ${maxFiles} files at a time.`);
      return;
    }
    const invalid = arr.map(validateFile).filter(Boolean);
    if (invalid.length > 0) {
      setError(invalid.join(' '));
      return;
    }
    setFiles((prev) => [...prev, ...arr]);
  }, [files.length, maxFiles, validateFile]);

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setCaptions((prev) => { const next = { ...prev }; delete next[index]; return next; });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedAlbumId || files.length === 0) return;

    setUploading(true);
    setError('');
    let count = 0;
    const progress = { ...uploadProgress };

    for (let i = 0; i < files.length; i++) {
      progress[i] = 'uploading';
      setUploadProgress({ ...progress });

      const formData = new FormData();
      formData.append('session_hash', accessId || '');
      formData.append('album_id', selectedAlbumId);
      formData.append('file', files[i]);
      if (captions[i]?.trim()) formData.append('title', captions[i].trim());

      try {
        const res = await fetch(UPLOAD_URL, { method: 'POST', body: formData });
        const result = await res.json();
        if (result.success) {
          progress[i] = 'done';
          count++;
        } else {
          progress[i] = 'error';
          if (!error) setError(result.error || 'Upload failed');
        }
      } catch {
        progress[i] = 'error';
        if (!error) setError('Could not connect to upload service.');
      }
      setUploadProgress({ ...progress });
    }

    setUploading(false);
    setSuccessCount(count);

    if (count === files.length) {
      setTimeout(() => navigate(`${basePath}/gallery/my-uploads`), 1500);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 md:py-14">
        <div className="animate-pulse space-y-4">
          <div className="h-9 w-40 bg-secondary-100 rounded-lg" />
          <div className="h-64 rounded-xl bg-secondary-100" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  if (uploadState === 'disabled' || uploadableAlbums.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="w-20 h-20 mx-auto flex items-center justify-center rounded-full bg-secondary-100 mb-6">
          <i className="ri-upload-cloud-2-line text-4xl text-secondary-400" />
        </div>
        <h1 className="font-heading text-3xl text-foreground-900 mb-3">Uploads not available</h1>
        <p className="text-sm text-foreground-500 mb-6">Guest photo uploads are not currently open.</p>
        <Link to={`${basePath}/gallery`} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap">
          <i className="ri-arrow-left-line" /> Back to Gallery
        </Link>
      </div>
    );
  }

  if (uploadState === 'before_open') {
    const opensDate = uploadSettings?.opens_at ? new Date(uploadSettings.opens_at).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'soon';
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="w-20 h-20 mx-auto flex items-center justify-center rounded-full bg-secondary-100 mb-6">
          <i className="ri-time-line text-4xl text-amber-400" />
        </div>
        <h1 className="font-heading text-3xl text-foreground-900 mb-3">Uploads opening soon</h1>
        <p className="text-sm text-foreground-500 mb-6">Guest uploads will open on {opensDate}.</p>
        <Link to={`${basePath}/gallery`} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap">
          <i className="ri-arrow-left-line" /> Back to Gallery
        </Link>
      </div>
    );
  }

  if (uploadState === 'closed') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="w-20 h-20 mx-auto flex items-center justify-center rounded-full bg-secondary-100 mb-6">
          <i className="ri-lock-line text-4xl text-secondary-400" />
        </div>
        <h1 className="font-heading text-3xl text-foreground-900 mb-3">Uploads closed</h1>
        <p className="text-sm text-foreground-500 mb-6">Guest uploads are now closed, but you can still enjoy the published gallery.</p>
        <Link to={`${basePath}/gallery`} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap">
          <i className="ri-arrow-left-line" /> Back to Gallery
        </Link>
      </div>
    );
  }

  const isAllDone = successCount > 0 && successCount === files.length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 md:py-14">
      <Link to={`${basePath}/gallery`} className="inline-flex items-center gap-1 text-xs text-foreground-400 hover:text-foreground-600 mb-4 cursor-pointer">
        <i className="ri-arrow-left-line text-[10px]" /> Gallery
      </Link>

      <h1 className="font-heading text-3xl text-foreground-900 mb-2">Upload Photos</h1>
      <p className="text-sm text-foreground-500 mb-8">Share your photos with the couple and other guests.</p>

      {isAllDone ? (
        <div className="text-center py-12">
          <div className="w-20 h-20 mx-auto flex items-center justify-center rounded-full bg-emerald-50 mb-6">
            <i className="ri-check-line text-4xl text-emerald-500" />
          </div>
          <h2 className="font-heading text-2xl text-foreground-900 mb-3">Upload complete!</h2>
          <p className="text-sm text-foreground-500 mb-6">{successCount} photo{successCount !== 1 ? 's' : ''} submitted for review.</p>
          <Link to={`${basePath}/gallery/my-uploads`} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap">
            <i className="ri-image-line" /> View my uploads
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Album picker */}
          <div>
            <label className="block text-sm font-label font-medium text-foreground-700 mb-2">Choose album</label>
            <select
              value={selectedAlbumId}
              onChange={(e) => setSelectedAlbumId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-secondary-200 text-sm text-foreground-900 bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-300"
              required
            >
              <option value="">Select an album...</option>
              {uploadableAlbums.map((a) => (
                <option key={a.id} value={a.id}>{a.title}</option>
              ))}
            </select>
          </div>

          {/* Drop zone */}
          <div
            className={`relative border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer ${
              dragOver ? 'border-primary-400 bg-primary-50/50' :
              files.length > 0 ? 'border-secondary-300 bg-secondary-50/30' :
              'border-secondary-200 hover:border-secondary-300 bg-background-50'
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
              multiple
              className="hidden"
              onChange={(e) => { if (e.target.files) addFiles(e.target.files); }}
            />
            <div className="w-16 h-16 mx-auto rounded-xl bg-secondary-100 flex items-center justify-center mb-3">
              <i className="ri-upload-cloud-2-line text-3xl text-foreground-350" />
            </div>
            <p className="text-sm text-foreground-600 mb-1">
              <span className="font-medium text-primary-600">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-foreground-400">JPG, PNG, or WebP &middot; Max {(maxSize / 1048576).toFixed(0)} MB each &middot; Up to {maxFiles} files</p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-100">
              <i className="ri-error-warning-line text-red-400 text-sm mt-0.5 flex-shrink-0" />
              <p className="text-xs text-red-600 leading-relaxed">{error}</p>
            </div>
          )}

          {/* File list */}
          {files.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-label font-medium text-foreground-700">{files.length} file{files.length !== 1 ? 's' : ''} selected</p>
              {files.map((file, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-secondary-100 bg-white">
                  <div className="w-12 h-12 rounded-lg bg-secondary-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground-800 truncate">{file.name}</p>
                    <p className="text-[10px] text-foreground-400">{(file.size / 1048576).toFixed(1)} MB</p>
                    <input
                      type="text"
                      value={captions[i] || ''}
                      onChange={(e) => setCaptions((prev) => ({ ...prev, [i]: e.target.value }))}
                      placeholder="Add a caption (optional)"
                      maxLength={100}
                      className="mt-1.5 w-full text-xs px-2 py-1.5 rounded border border-secondary-200 text-foreground-700 placeholder:text-foreground-350 focus:outline-none focus:ring-1 focus:ring-primary-300"
                    />
                  </div>
                  <div className="flex-shrink-0">
                    {uploadProgress[i] === 'uploading' ? (
                      <div className="w-6 h-6 rounded-full border-2 border-primary-200 border-t-primary-500 animate-spin" />
                    ) : uploadProgress[i] === 'done' ? (
                      <i className="ri-check-line text-emerald-500 text-lg" />
                    ) : uploadProgress[i] === 'error' ? (
                      <i className="ri-close-line text-red-400 text-lg" />
                    ) : (
                      <button type="button" onClick={() => removeFile(i)} className="w-6 h-6 flex items-center justify-center rounded text-foreground-400 hover:text-red-500 cursor-pointer" aria-label="Remove">
                        <i className="ri-close-line" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Privacy note */}
          <p className="text-[11px] text-foreground-350 leading-relaxed">
            Uploaded photos will be reviewed by the couple before appearing in the gallery. You can remove your pending uploads from My Uploads at any time.
          </p>

          {/* Submit */}
          <div className="flex items-center gap-3 pt-2">
            <Link to={`${basePath}/gallery`} className="flex-1 px-4 py-2.5 rounded-lg border border-secondary-200 text-sm font-label text-foreground-600 hover:bg-background-100 transition-colors cursor-pointer whitespace-nowrap text-center">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={!selectedAlbumId || files.length === 0 || uploading}
              className="flex-1 px-4 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-label font-medium hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer whitespace-nowrap"
            >
              {uploading ? (
                <span className="inline-flex items-center gap-2"><i className="ri-loader-4-line animate-spin" /> Uploading...</span>
              ) : (
                `Upload ${files.length} photo${files.length !== 1 ? 's' : ''}`
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}