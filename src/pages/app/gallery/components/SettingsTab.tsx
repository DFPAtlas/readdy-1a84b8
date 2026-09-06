import { useState } from 'react';
import type { GalleryModerationRules, GalleryUploadSettings, StorageUsage } from '@/types/gallery';

interface SettingsTabProps {
  rules: GalleryModerationRules | null;
  uploadSettings: GalleryUploadSettings | null;
  storageUsage: StorageUsage;
  saving: boolean;
  onUpdateRules: (updates: Partial<GalleryModerationRules>) => Promise<void>;
  showToast: (msg: string) => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export default function SettingsTab({ rules, uploadSettings, storageUsage, saving, onUpdateRules, showToast }: SettingsTabProps) {
  const [galleryTitle, setGalleryTitle] = useState('Wedding Gallery');
  const [galleryIntro, setGalleryIntro] = useState('Browse photos from our special day shared by us and our guests.');
  const [uploadInstructions, setUploadInstructions] = useState('Share your favourite moments! Photos will be reviewed before appearing.');
  const [privacyNotice, setPrivacyNotice] = useState('Your photos will only be visible to other wedding guests through this gallery.');
  const [closedMessage, setClosedMessage] = useState('The gallery is now closed. Thank you for sharing your memories!');
  const [uploadDeadline, setUploadDeadline] = useState('');

  const defaultRules: GalleryModerationRules = {
    photos_allowed: true,
    videos_allowed: false,
    max_file_size_bytes: 100 * 1024 * 1024,
    max_uploads_per_guest: 50,
    manual_approval_required: true,
    auto_approve_trusted_guests: false,
    auto_add_to_wall: false,
    allow_reporting: true,
    blocked_labels: null,
    provider_config: null,
  };

  const r = rules || defaultRules;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Gallery settings */}
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-white border border-secondary-100 rounded-xl p-5">
          <h3 className="font-heading text-base font-semibold text-foreground-900 mb-4">Gallery settings</h3>

          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-label text-foreground-500 mb-1 block">Gallery title</label>
              <input type="text" value={galleryTitle} onChange={(e) => setGalleryTitle(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm outline-none" />
            </div>
            <div>
              <label className="text-[11px] font-label text-foreground-500 mb-1 block">Introduction</label>
              <textarea value={galleryIntro} onChange={(e) => setGalleryIntro(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm outline-none resize-none" />
            </div>
            <div>
              <label className="text-[11px] font-label text-foreground-500 mb-1 block">Upload instructions</label>
              <textarea value={uploadInstructions} onChange={(e) => setUploadInstructions(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm outline-none resize-none" />
            </div>
            <div>
              <label className="text-[11px] font-label text-foreground-500 mb-1 block">Privacy notice</label>
              <textarea value={privacyNotice} onChange={(e) => setPrivacyNotice(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm outline-none resize-none" />
            </div>
            <div>
              <label className="text-[11px] font-label text-foreground-500 mb-1 block">Closed gallery message</label>
              <textarea value={closedMessage} onChange={(e) => setClosedMessage(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm outline-none resize-none" />
            </div>
            <div>
              <label className="text-[11px] font-label text-foreground-500 mb-1 block">Upload closing date</label>
              <input type="date" value={uploadDeadline} onChange={(e) => setUploadDeadline(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm outline-none" />
            </div>

            <button
              onClick={() => showToast('Settings saved')}
              className="px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-label font-medium hover:bg-primary-600 cursor-pointer whitespace-nowrap transition-colors mt-2"
            >
              Save settings
            </button>
          </div>
        </div>
      </div>

      {/* Right sidebar: moderation rules + storage */}
      <div className="space-y-4">
        {/* Moderation rules */}
        <div className="bg-white border border-secondary-100 rounded-xl p-5">
          <h3 className="font-heading text-sm font-semibold text-foreground-900 mb-4">Moderation rules</h3>
          <div className="space-y-2">
            {[
              { key: 'manual_approval_required', label: 'Require manual approval' },
              { key: 'auto_add_to_wall', label: 'Auto-add approved to wall' },
              { key: 'photos_allowed', label: 'Allow photo uploads' },
              { key: 'videos_allowed', label: 'Allow video uploads' },
              { key: 'auto_approve_trusted_guests', label: 'Auto-approve trusted guests' },
              { key: 'allow_reporting', label: 'Allow guest reporting' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center justify-between py-1.5 cursor-pointer">
                <span className="text-xs text-foreground-700">{label}</span>
                <button
                  onClick={() => onUpdateRules({ [key]: !(r[key as keyof GalleryModerationRules] as boolean) })}
                  className={`w-9 h-5 rounded-full relative transition-colors cursor-pointer ${r[key as keyof GalleryModerationRules] ? 'bg-primary-500' : 'bg-secondary-300'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${r[key as keyof GalleryModerationRules] ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
              </label>
            ))}
            <div className="pt-2 border-t border-secondary-100">
              <label className="flex items-center justify-between py-1.5">
                <span className="text-xs text-foreground-700">Max uploads per guest</span>
                <select
                  value={r.max_uploads_per_guest}
                  onChange={(e) => onUpdateRules({ max_uploads_per_guest: parseInt(e.target.value) })}
                  className="px-2 py-1 rounded border border-secondary-200 text-xs text-foreground-700 outline-none cursor-pointer"
                >
                  <option value="10">10</option><option value="25">25</option><option value="50">50</option><option value="100">100</option>
                </select>
              </label>
              <label className="flex items-center justify-between py-1.5">
                <span className="text-xs text-foreground-700">Max file size</span>
                <select
                  value={r.max_file_size_bytes}
                  onChange={(e) => onUpdateRules({ max_file_size_bytes: parseInt(e.target.value) })}
                  className="px-2 py-1 rounded border border-secondary-200 text-xs text-foreground-700 outline-none cursor-pointer"
                >
                  <option value="20971520">20 MB</option><option value="52428800">50 MB</option><option value="104857600">100 MB</option><option value="209715200">200 MB</option>
                </select>
              </label>
            </div>
          </div>
        </div>

        {/* Storage usage */}
        <div className="bg-white border border-secondary-100 rounded-xl p-5">
          <h3 className="font-heading text-sm font-semibold text-foreground-900 mb-4">Storage usage</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-foreground-500">Total used</span>
              <span className="font-semibold text-foreground-900">{formatBytes(storageUsage.total_bytes)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-foreground-500"><i className="ri-image-line mr-1" />Images</span>
              <span className="text-foreground-700">{formatBytes(storageUsage.image_bytes)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-foreground-500"><i className="ri-video-line mr-1" />Videos</span>
              <span className="text-foreground-700">{formatBytes(storageUsage.video_bytes)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-foreground-500">Files</span>
              <span className="text-foreground-700">{storageUsage.file_count}</span>
            </div>
            {/* Progress bar */}
            <div className="pt-1">
              <div className="w-full h-2 bg-secondary-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (storageUsage.total_bytes / (500 * 1024 * 1024)) * 100)}%` }}
                />
              </div>
              <p className="text-[9px] text-foreground-400 mt-1">500 MB plan limit</p>
            </div>
          </div>

          {/* Largest files */}
          {storageUsage.largest_files.length > 0 && (
            <div className="mt-4 pt-3 border-t border-secondary-100">
              <p className="text-[10px] font-label text-foreground-500 mb-2">Largest files</p>
              <div className="space-y-1.5">
                {storageUsage.largest_files.map((f) => (
                  <div key={f.id} className="flex items-center justify-between text-[10px]">
                    <span className="text-foreground-600 truncate max-w-[150px]">{f.title || 'Untitled'}</span>
                    <span className="text-foreground-400">{formatBytes(f.size)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}