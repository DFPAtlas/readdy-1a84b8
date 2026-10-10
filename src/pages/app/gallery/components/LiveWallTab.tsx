import { useActiveWedding } from '@/hooks/useActiveWedding';
import { useState, useMemo, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DEMO_CONFIG, isDemoMode } from '@/demo/demoConfig';
import type { GalleryAdminAsset, GalleryModerationRules } from '@/types/gallery';

interface LiveWallTabProps {
  assets: GalleryAdminAsset[];
  rules: GalleryModerationRules | null;
  saving: boolean;
  onToggleWall: (assetId: string) => Promise<void>;
  onBulkToggleWall: (assetIds: string[], visible: boolean) => Promise<void>;
  onUpdateRules: (updates: Partial<GalleryModerationRules>) => Promise<void>;
  showToast: (msg: string) => void;
}

const WALL_CONFIG_DEFAULTS = {
  enabled: false,
  photo_duration_ms: 5000,
  transition_style: 'fade' as const,
  shuffle: true,
  show_captions: true,
  show_couple_names: true,
  show_hashtag: true,
  hashtag: '',
  show_qr_upload: true,
  show_upload_count: true,
  background_style: 'gradient' as 'gradient' | 'solid' | 'blur',
  background_color: '#1a1a2e',
  show_logo: false,
  fullscreen_by_default: false,
  paused: false,
};

export default function LiveWallTab({ assets, rules, saving, onToggleWall, onBulkToggleWall, onUpdateRules, showToast }: LiveWallTabProps) {
  const [wallConfig, setWallConfig] = useState(WALL_CONFIG_DEFAULTS);
  const [selectedWallIds, setSelectedWallIds] = useState<Set<string>>(new Set());
  const [showPreview, setShowPreview] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);

  const wallAssets = useMemo(() =>
    assets.filter((a) => a.wall_visible && a.moderation_status === 'approved'),
  [assets]);

  const eligibleAssets = useMemo(() =>
    assets.filter((a) => a.moderation_status === 'approved'),
  [assets]);

  const notOnWall = useMemo(() =>
    eligibleAssets.filter((a) => !a.wall_visible),
  [eligibleAssets]);

  const toggleWallSelect = useCallback((id: string) => {
    setSelectedWallIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const { activeWedding } = useActiveWedding();
  const wallSlug = isDemoMode ? DEMO_CONFIG.publicSlug : activeWedding?.slug || '';
  useEffect(() => { setWallConfig({ ...WALL_CONFIG_DEFAULTS, ...((rules?.provider_config?.live_wall || {}) as Partial<typeof WALL_CONFIG_DEFAULTS>) }); }, [rules?.provider_config]);

  return (
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Wall config */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white border border-secondary-100 rounded-xl p-5">
            <h3 className="font-heading text-base font-semibold text-foreground-900 mb-4">Wall Controls</h3>
            <label className="flex gap-2 mb-3"><input type="checkbox" checked={wallConfig.enabled} onChange={e => setWallConfig(c => ({ ...c, enabled: e.target.checked }))}/>Enable the public photo wall</label>
            <p className="text-xs mb-4">Enabling the wall makes approved, published photos selected for the wall accessible through its link.</p>
            <button disabled={saving} className="underline mb-4" onClick={async () => { try { await onUpdateRules({ provider_config: { ...(rules?.provider_config || {}), live_wall: wallConfig } }); showToast('Wall settings saved'); } catch { showToast('Wall settings could not be saved'); } }}>{saving ? 'Saving…' : 'Save wall settings'}</button>

            <div className="space-y-3">
              {/* Pause / Resume */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setWallConfig((prev) => ({ ...prev, paused: !prev.paused }))}
                  className={`px-3 py-2 rounded-lg text-xs font-label font-medium cursor-pointer whitespace-nowrap transition-colors ${
                    wallConfig.paused ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                  }`}
                >
                  <i className={`${wallConfig.paused ? 'ri-play-line' : 'ri-pause-line'} mr-1`} />
                  {wallConfig.paused ? 'Resume' : 'Pause'}
                </button>
                <Link
                  to={`/live-wall/${wallSlug}`}
                  target="_blank"
                  className="px-3 py-2 rounded-lg bg-primary-500 text-white text-xs font-label font-medium hover:bg-primary-600 cursor-pointer whitespace-nowrap transition-colors"
                >
                  <i className="ri-tv-line mr-1" />Open wall
                </Link>
              </div>

              {/* Duration */}
              <div>
                <label className="text-[11px] font-label text-foreground-500 mb-1 block">Photo duration</label>
                <select
                  value={wallConfig.photo_duration_ms}
                  onChange={(e) => setWallConfig((prev) => ({ ...prev, photo_duration_ms: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm text-foreground-800 outline-none cursor-pointer"
                >
                  <option value="3000">3 seconds</option>
                  <option value="5000">5 seconds</option>
                  <option value="8000">8 seconds</option>
                  <option value="10000">10 seconds</option>
                  <option value="15000">15 seconds</option>
                </select>
              </div>

              {/* Transition */}
              <div>
                <label className="text-[11px] font-label text-foreground-500 mb-1 block">Transition style</label>
                <select
                  value={wallConfig.transition_style}
                  onChange={(e) => setWallConfig((prev) => ({ ...prev, transition_style: e.target.value as typeof wallConfig.transition_style }))}
                  className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm text-foreground-800 outline-none cursor-pointer"
                >
                  <option value="fade">Fade</option>
                  <option value="slide">Slide</option>
                  <option value="gentle_zoom">Gentle zoom</option>
                  <option value="none">None</option>
                </select>
              </div>

              {/* Toggles */}
              <label className="flex items-center justify-between py-1.5 cursor-pointer">
                <span className="text-xs text-foreground-700">Shuffle photos</span>
                <button onClick={() => setWallConfig((p) => ({ ...p, shuffle: !p.shuffle }))} className={`w-9 h-5 rounded-full relative transition-colors cursor-pointer ${wallConfig.shuffle ? 'bg-primary-500' : 'bg-secondary-300'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${wallConfig.shuffle ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
              </label>
              <label className="flex items-center justify-between py-1.5 cursor-pointer">
                <span className="text-xs text-foreground-700">Show captions</span>
                <button onClick={() => setWallConfig((p) => ({ ...p, show_captions: !p.show_captions }))} className={`w-9 h-5 rounded-full relative transition-colors cursor-pointer ${wallConfig.show_captions ? 'bg-primary-500' : 'bg-secondary-300'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${wallConfig.show_captions ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
              </label>
              <label className="flex items-center justify-between py-1.5 cursor-pointer">
                <span className="text-xs text-foreground-700">Show couple names</span>
                <button onClick={() => setWallConfig((p) => ({ ...p, show_couple_names: !p.show_couple_names }))} className={`w-9 h-5 rounded-full relative transition-colors cursor-pointer ${wallConfig.show_couple_names ? 'bg-primary-500' : 'bg-secondary-300'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${wallConfig.show_couple_names ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
              </label>

              {/* Hashtag */}
              <div>
                <label className="flex items-center justify-between py-1.5 cursor-pointer">
                  <span className="text-xs text-foreground-700">Show hashtag</span>
                  <button onClick={() => setWallConfig((p) => ({ ...p, show_hashtag: !p.show_hashtag }))} className={`w-9 h-5 rounded-full relative transition-colors cursor-pointer ${wallConfig.show_hashtag ? 'bg-primary-500' : 'bg-secondary-300'}`}>
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${wallConfig.show_hashtag ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                </label>
                {wallConfig.show_hashtag && (
                  <input type="text" value={wallConfig.hashtag} onChange={(e) => setWallConfig((p) => ({ ...p, hashtag: e.target.value }))} className="w-full px-3 py-1.5 rounded-lg border border-secondary-200 text-sm text-foreground-800 outline-none mt-1" />
                )}
              </div>

              <label className="flex items-center justify-between py-1.5 cursor-pointer">
                <span className="text-xs text-foreground-700">Show QR upload prompt</span>
                <button disabled={!isDemoMode} onClick={() => setWallConfig((p) => ({ ...p, show_qr_upload: !p.show_qr_upload }))} className={`w-9 h-5 rounded-full relative transition-colors cursor-pointer ${wallConfig.show_qr_upload ? 'bg-primary-500' : 'bg-secondary-300'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${wallConfig.show_qr_upload ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
              </label>

              <div>
                <label className="text-[11px] font-label text-foreground-500 mb-1 block">Background style</label>
                <select value={wallConfig.background_style} onChange={(e) => setWallConfig((p) => ({ ...p, background_style: e.target.value as typeof wallConfig.background_style }))} className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm text-foreground-800 outline-none cursor-pointer">
                  <option value="gradient">Gradient</option><option value="solid">Solid</option><option value="blur">Blurred</option>
                </select>
              </div>

              {wallConfig.background_style === 'solid' && (
                <div>
                  <label className="text-[11px] font-label text-foreground-500 mb-1 block">Background colour</label>
                  <input type="color" value={wallConfig.background_color} onChange={(e) => setWallConfig((p) => ({ ...p, background_color: e.target.value }))} className="w-full h-9 rounded-lg border border-secondary-200 cursor-pointer" />
                </div>
              )}

              {/* Stats */}
              <div className="pt-3 border-t border-secondary-100">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-foreground-500">On wall</span>
                  <span className="font-semibold text-foreground-900">{wallAssets.length} photos</span>
                </div>
                <div className="flex items-center justify-between text-xs mt-1">
                  <span className="text-foreground-500">Status</span>
                  <span className={`font-semibold ${wallConfig.paused ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {wallConfig.paused ? 'Paused' : 'Playing'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Auto-add rule */}
          <div className="bg-white border border-secondary-100 rounded-xl p-5">
            <h3 className="font-heading text-sm font-semibold text-foreground-900 mb-3">Moderation mode</h3>
            <label className="flex items-center justify-between py-1.5 cursor-pointer">
              <span className="text-xs text-foreground-700">Auto-add approved to wall</span>
              <button
                onClick={() => onUpdateRules({ auto_add_to_wall: !rules?.auto_add_to_wall })}
                className={`w-9 h-5 rounded-full relative transition-colors cursor-pointer ${rules?.auto_add_to_wall ? 'bg-primary-500' : 'bg-secondary-300'}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${rules?.auto_add_to_wall ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
            </label>
          </div>
        </div>

        {/* Right: Wall media grid */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading text-base font-semibold text-foreground-900">
              Wall photos ({wallAssets.length})
            </h3>
            {selectedWallIds.size > 0 && (
              <div className="flex items-center gap-2">
                <button onClick={() => { onBulkToggleWall(Array.from(selectedWallIds), false); setSelectedWallIds(new Set()); showToast('Removed from wall'); }} className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-label font-medium hover:bg-red-100 cursor-pointer whitespace-nowrap">Remove selected</button>
              </div>
            )}
          </div>

          {wallAssets.length === 0 ? (
            <div className="bg-white border border-secondary-100 rounded-xl p-12 text-center">
              <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-background-100 text-foreground-300 mb-4">
                <i className="ri-tv-line text-2xl" />
              </div>
              <p className="text-sm text-foreground-500 mb-2">No photos on the live wall</p>
              <p className="text-xs text-foreground-400">Approve photos and add them to the wall to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {wallAssets.map((asset) => {
                const isSelected = selectedWallIds.has(asset.id);
                return (
                  <div key={asset.id} className={`relative aspect-square rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${isSelected ? 'border-red-400' : 'border-transparent hover:border-primary-300'}`} onClick={() => toggleWallSelect(asset.id)}>
                    {asset.signed_url ? (
                      <img src={asset.signed_url} alt={asset.title || ''} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full bg-secondary-100 flex items-center justify-center"><i className="ri-image-line" /></div>
                    )}
                    {isSelected && (
                      <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                        <i className="ri-close-circle-fill text-white text-xl" />
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                      <p className="text-[9px] text-white line-clamp-1">{asset.title || 'Untitled'}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Not on wall */}
          {notOnWall.length > 0 && (
            <div className="mt-8">
              <h3 className="font-heading text-sm font-semibold text-foreground-900 mb-3 flex items-center gap-2">
                <i className="ri-image-add-line text-foreground-400" />
                Available to add ({notOnWall.length})
              </h3>
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {notOnWall.slice(0, 15).map((asset) => (
                  <button
                    key={asset.id}
                    onClick={() => { onToggleWall(asset.id); showToast('Added to wall'); }}
                    className="relative aspect-square rounded-lg overflow-hidden border border-secondary-200 hover:border-primary-400 cursor-pointer group"
                  >
                    {asset.signed_url ? (
                      <img src={asset.signed_url} alt={asset.title || ''} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" loading="lazy" />
                    ) : (
                      <div className="w-full h-full bg-secondary-100 flex items-center justify-center"><i className="ri-image-line" /></div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-8 h-8 rounded-full bg-primary-500 text-white flex items-center justify-center">
                        <i className="ri-add-line" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}