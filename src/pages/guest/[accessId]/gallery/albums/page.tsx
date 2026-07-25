import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useGuestPortal } from '@/hooks/useGuestPortal';
import type { GalleryAlbum, GalleryData } from '@/types/access';

const ALBUM_TYPE_ICONS: Record<string, string> = {
  couple: 'ri-hearts-line',
  engagement: 'ri-heart-2-line',
  venue: 'ri-building-4-line',
  wedding_day: 'ri-camera-line',
  guest_uploads: 'ri-upload-cloud-2-line',
  featured: 'ri-star-line',
  general: 'ri-image-line',
  preparation: 'ri-shirt-line',
  ceremony: 'ri-archive-line',
  reception: 'ri-cake-line',
  evening: 'ri-moon-line',
  wedding_party: 'ri-group-line',
  honeymoon: 'ri-plane-line',
  day_after: 'ri-sun-line',
  custom: 'ri-folder-line',
};

const ALBUM_TYPE_LABELS: Record<string, string> = {
  couple: 'Couple',
  engagement: 'Engagement',
  venue: 'Venue',
  wedding_day: 'Wedding Day',
  guest_uploads: 'Guest Uploads',
  featured: 'Featured',
  general: 'General',
  preparation: 'Preparation',
  ceremony: 'Ceremony',
  reception: 'Reception',
  evening: 'Evening',
  wedding_party: 'Wedding Party',
  honeymoon: 'Honeymoon',
  day_after: 'Day After',
  custom: 'Custom',
};

function formatDateGB(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function GuestGalleryAlbumsPage() {
  const { accessId } = useParams();
  const { data, loading } = useGuestPortal();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');

  const gallery: GalleryData | null = data?.gallery ?? null;
  const portalSettings = data?.portal_settings ?? null;
  const showGallery = portalSettings?.show_gallery !== false;

  const albums: GalleryAlbum[] = gallery?.albums ?? [];

  const typeOptions = useMemo(() => {
    const types = new Set(albums.map((a) => a.album_type));
    return ['all', ...Array.from(types)];
  }, [albums]);

  const filteredAlbums = useMemo(() => {
    let result = [...albums];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          (a.description || '').toLowerCase().includes(q) ||
          (a.name || '').toLowerCase().includes(q)
      );
    }

    if (typeFilter !== 'all') {
      result = result.filter((a) => a.album_type === typeFilter);
    }

    switch (sortBy) {
      case 'newest':
        result.sort((a, b) => new Date(b.published_at || '').getTime() - new Date(a.published_at || '').getTime());
        break;
      case 'oldest':
        result.sort((a, b) => new Date(a.published_at || '').getTime() - new Date(b.published_at || '').getTime());
        break;
      case 'a-z':
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'z-a':
        result.sort((a, b) => b.title.localeCompare(a.title));
        break;
    }

    return result;
  }, [albums, search, typeFilter, sortBy]);

  const basePath = `/guest/${accessId}`;

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10 md:py-14">
        <div className="animate-pulse space-y-6">
          <div className="h-9 w-40 bg-secondary-100 rounded-lg" />
          <div className="h-5 w-80 bg-secondary-100 rounded" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-64 rounded-xl bg-secondary-100" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data || !showGallery) return null;

  if (!gallery || albums.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center">
        <div className="w-20 h-20 mx-auto flex items-center justify-center rounded-full bg-secondary-100 mb-6">
          <i className="ri-folder-open-line text-4xl text-secondary-400" />
        </div>
        <h1 className="font-heading text-3xl text-foreground-900 mb-3">Photo Albums</h1>
        <p className="text-sm text-foreground-500 leading-relaxed max-w-md mx-auto mb-6">
          The couple haven&apos;t published any photo albums yet. Check back soon to browse their wedding memories.
        </p>
        <Link
          to={`${basePath}/gallery`}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
        >
          <i className="ri-arrow-left-line" /> Back to Gallery
        </Link>
      </div>
    );
  }

  const hasActiveFilters = search.trim() !== '' || typeFilter !== 'all';

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 md:py-14">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <Link to={`${basePath}/gallery`} className="inline-flex items-center gap-1 text-xs text-foreground-400 hover:text-foreground-600 mb-2 cursor-pointer">
            <i className="ri-arrow-left-line text-[10px]" /> Gallery
          </Link>
          <h1 className="font-heading text-3xl md:text-4xl text-foreground-900">Photo Albums</h1>
          <p className="text-sm text-foreground-500 mt-2">
            {albums.length} album{albums.length !== 1 ? 's' : ''}{' '}
            &middot; {gallery.total_assets} photo{gallery.total_assets !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 rounded-lg border border-secondary-200 text-sm text-foreground-700 bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-300"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="a-z">A to Z</option>
            <option value="z-a">Z to A</option>
          </select>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-foreground-350 text-sm" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search albums..."
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-secondary-200 text-sm text-foreground-900 placeholder:text-foreground-350 bg-white focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-300"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {typeOptions.map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-2 rounded-full text-xs font-label font-medium transition-colors cursor-pointer whitespace-nowrap border ${
                typeFilter === t
                  ? 'bg-primary-500 text-white border-primary-500'
                  : 'bg-white text-foreground-600 border-secondary-200 hover:border-secondary-300'
              }`}
            >
              {t === 'all' ? 'All types' : ALBUM_TYPE_LABELS[t] || t}
            </button>
          ))}
        </div>
        {hasActiveFilters && (
          <button
            onClick={() => { setSearch(''); setTypeFilter('all'); }}
            className="text-xs text-foreground-400 hover:text-foreground-600 cursor-pointer whitespace-nowrap"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Album Grid */}
      {filteredAlbums.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-secondary-100 mb-4">
            <i className="ri-search-line text-2xl text-foreground-350" />
          </div>
          <p className="text-sm text-foreground-500">No albums match your search or filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredAlbums.map((album) => (
            <Link
              key={album.id}
              to={`${basePath}/gallery/albums/${album.id}`}
              className="group bg-white rounded-xl border border-secondary-100 overflow-hidden hover:border-secondary-200 transition-all cursor-pointer"
            >
              {/* Cover */}
              <div className="aspect-[16/10] bg-secondary-50 overflow-hidden relative">
                {album.cover_signed_url ? (
                  <img
                    src={album.cover_signed_url}
                    alt={album.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <i className={`${ALBUM_TYPE_ICONS[album.album_type] || 'ri-folder-line'} text-4xl text-foreground-250`} />
                  </div>
                )}

                {/* New badge */}
                {album.has_new_images && (
                  <div className="absolute top-3 left-3 px-2 py-1 rounded-full bg-primary-500 text-white text-[10px] font-label font-semibold">
                    <i className="ri-sparkling-line mr-1" />New
                  </div>
                )}

                {/* Type badge */}
                <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-white/90 text-foreground-700 text-[10px] font-label backdrop-blur-sm">
                  {ALBUM_TYPE_LABELS[album.album_type] || album.album_type}
                </div>
              </div>

              {/* Info */}
              <div className="p-4">
                <h2 className="font-heading text-base font-semibold text-foreground-900 group-hover:text-primary-600 transition-colors">
                  {album.title}
                </h2>
                {album.description && (
                  <p className="text-xs text-foreground-500 mt-1 line-clamp-2">{album.description}</p>
                )}
                <div className="flex items-center gap-3 mt-3 text-[11px] text-foreground-400">
                  <span>
                    <i className="ri-camera-line mr-1" />
                    {album.asset_count} photo{album.asset_count !== 1 ? 's' : ''}
                  </span>
                  {album.published_at && (
                    <span>{formatDateGB(album.published_at)}</span>
                  )}
                </div>
                {album.allow_uploads && (
                  <div className="mt-2 inline-flex items-center gap-1 text-[10px] text-accent-600 font-medium">
                    <i className="ri-upload-cloud-2-line" /> Guest uploads open
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Back link */}
      <div className="mt-10 text-center">
        <Link
          to={`${basePath}/gallery`}
          className="inline-flex items-center gap-2 text-xs font-label text-foreground-400 hover:text-foreground-600 cursor-pointer"
        >
          <i className="ri-arrow-left-line" /> Back to Gallery
        </Link>
      </div>
    </div>
  );
}