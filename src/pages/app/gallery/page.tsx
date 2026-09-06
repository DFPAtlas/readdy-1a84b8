import { useState, useCallback, useMemo, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { useGalleryAdmin } from '@/hooks/useGalleryAdmin';
import { useGalleryAlbums } from '@/hooks/useGalleryAlbums';
import { useDemoDataSafe } from '@/demo/useDemoDataSafe';
import { isDemoMode, DEMO_CONFIG } from '@/demo/demoConfig';
import MediaTab from './components/MediaTab';
import AlbumsTab from './components/AlbumsTab';
import ModerationTab from './components/ModerationTab';
import LiveWallTab from './components/LiveWallTab';
import SettingsTab from './components/SettingsTab';
import GallerySkeleton from './components/GallerySkeleton';

const TABS = [
  { key: 'media', label: 'Media', icon: 'ri-image-line' },
  { key: 'albums', label: 'Albums', icon: 'ri-folder-line' },
  { key: 'moderation', label: 'Moderation', icon: 'ri-shield-check-line' },
  { key: 'live-wall', label: 'Live Wall', icon: 'ri-tv-line' },
  { key: 'settings', label: 'Settings', icon: 'ri-settings-3-line' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export default function GalleryHubPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as TabKey | null;
  const activeTab: TabKey = TABS.some((t) => t.key === tabParam) ? tabParam! : 'media';

  const { weddingId } = useActiveWedding();
  const demo = useDemoDataSafe();
  const {
    assets, albums, rules, uploadSettings, storageUsage,
    loading, error, saving,
    refresh, moderateAsset, bulkModerate, toggleWall, bulkToggleWall,
    updateAssetCaption, moveToAlbum, archiveAsset, deleteAsset,
    updateRules, uploadFiles, downloadAsset,
  } = useGalleryAdmin(weddingId);

  const albumHook = useGalleryAlbums(weddingId, albums, refresh);
  const [toast, setToast] = useState('');
  const showToast = useCallback((msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); }, []);

  const setTab = useCallback((tab: TabKey) => {
    setSearchParams({ tab }, { replace: true });
  }, [setSearchParams]);

  const counts = useMemo(() => ({
    total: assets.length,
    published: assets.filter((a) => a.publication_status === 'published').length,
    awaiting: assets.filter((a) => ['awaiting_review', 'pending', 'scanning', 'uploading'].includes(a.moderation_status)).length,
    onWall: assets.filter((a) => a.wall_visible).length,
    albums: albums.length,
    storageUsed: formatBytes(storageUsage.total_bytes),
  }), [assets, albums, storageUsage]);

  if (loading) {
    return <GallerySkeleton />;
  }

  const previewGuestUrl = isDemoMode ? '/guest/demo-session/gallery' : null;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-lg bg-accent-500 text-white text-sm font-label font-medium shadow-lg whitespace-nowrap animate-[fadeIn_0.2s_ease-out]">
          <i className="ri-check-line mr-2" />{toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <p className="text-xs font-label text-foreground-400 uppercase tracking-wider mb-1">Wedding memories</p>
          <h1 className="font-heading text-2xl md:text-3xl text-foreground-900">Gallery</h1>
          <p className="text-sm text-foreground-500 mt-1 max-w-lg">
            Manage media, organise albums, review guest uploads and control the live photo wall.
          </p>
          {isDemoMode && (
            <span className="inline-block mt-2 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-label">Demo Account</span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {previewGuestUrl && (
            <Link
              to={previewGuestUrl}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-secondary-200 text-xs font-label text-foreground-600 hover:bg-background-100 transition-colors cursor-pointer whitespace-nowrap"
            >
              <i className="ri-eye-line" /> Preview guest gallery
            </Link>
          )}
          <Link
            to={`/live-wall/${DEMO_CONFIG.publicSlug}`}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-secondary-200 text-xs font-label text-foreground-600 hover:bg-background-100 transition-colors cursor-pointer whitespace-nowrap"
          >
            <i className="ri-tv-line" /> Open live wall
          </Link>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {[
          { label: 'Total media', value: counts.total, icon: 'ri-image-line', color: 'text-foreground-900' },
          { label: 'Published', value: counts.published, icon: 'ri-check-double-line', color: 'text-emerald-600' },
          { label: 'Awaiting review', value: counts.awaiting, icon: 'ri-time-line', color: 'text-amber-600' },
          { label: 'On live wall', value: counts.onWall, icon: 'ri-tv-line', color: 'text-primary-600' },
          { label: 'Storage used', value: counts.storageUsed, icon: 'ri-hard-drive-2-line', color: 'text-foreground-600' },
        ].map((card) => (
          <div key={card.label} className="bg-white border border-secondary-100 rounded-lg p-3 text-center">
            <p className={`text-lg font-heading font-semibold ${card.color}`}>{card.value}</p>
            <p className="text-[10px] text-foreground-500 font-label mt-0.5 flex items-center justify-center gap-1">
              <i className={`${card.icon} text-[10px]`} />{card.label}
            </p>
          </div>
        ))}
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-6 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={refresh} className="text-xs font-label text-red-600 hover:text-red-700 underline cursor-pointer">Retry</button>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex items-center gap-1 mb-6 border-b border-secondary-200 overflow-x-auto">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          let badge: number | null = null;
          if (tab.key === 'moderation') badge = counts.awaiting || null;
          return (
            <button
              key={tab.key}
              onClick={() => setTab(tab.key)}
              className={`relative flex items-center gap-1.5 px-4 py-2.5 text-sm font-label transition-colors cursor-pointer whitespace-nowrap border-b-2 -mb-[1px] ${
                isActive
                  ? 'text-primary-600 border-primary-500 font-medium'
                  : 'text-foreground-500 border-transparent hover:text-foreground-700 hover:border-secondary-300'
              }`}
            >
              <i className={`${tab.icon} text-sm`} />
              {tab.label}
              {badge !== null && badge > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[9px] font-bold">{badge}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="min-h-[400px]">
        {activeTab === 'media' && (
          <MediaTab
            assets={assets}
            albums={albums}
            saving={saving}
            onDelete={deleteAsset}
            onArchive={archiveAsset}
            onToggleWall={toggleWall}
            onBulkToggleWall={bulkToggleWall}
            onUpdateCaption={updateAssetCaption}
            onMoveToAlbum={moveToAlbum}
            onDownload={downloadAsset}
            onUpload={uploadFiles}
            showToast={showToast}
          />
        )}
        {activeTab === 'albums' && (
          <AlbumsTab
            albumHook={albumHook}
            assets={assets}
            albums={albums}
            saving={saving || albumHook.saving}
            showToast={showToast}
          />
        )}
        {activeTab === 'moderation' && (
          <ModerationTab
            assets={assets}
            albums={albums}
            saving={saving}
            onModerate={moderateAsset}
            onBulkModerate={bulkModerate}
            onToggleWall={toggleWall}
            showToast={showToast}
          />
        )}
        {activeTab === 'live-wall' && (
          <LiveWallTab
            assets={assets}
            rules={rules}
            saving={saving}
            onToggleWall={toggleWall}
            onBulkToggleWall={bulkToggleWall}
            onUpdateRules={updateRules}
            showToast={showToast}
          />
        )}
        {activeTab === 'settings' && (
          <SettingsTab
            rules={rules}
            uploadSettings={uploadSettings}
            storageUsage={storageUsage}
            saving={saving}
            onUpdateRules={updateRules}
            showToast={showToast}
          />
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}