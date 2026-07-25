import { useGuestPortal } from '@/hooks/useGuestPortal';
import { Link, useParams } from 'react-router-dom';

export default function GuestCharitiesPage() {
  const { data, loading } = useGuestPortal();
  const { accessId } = useParams<{ accessId: string }>();
  const basePath = accessId ? `/guest/${accessId}` : '';

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10 md:py-14 animate-pulse space-y-6">
        <div className="h-7 w-40 bg-secondary-100 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[1,2].map((i) => <div key={i} className="h-52 bg-secondary-100 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const registry = data.registry;
  const charityRegistries = registry?.registries?.filter(
    (r) => r.registry_type === 'charity'
  ) || [];

  const allCharities = charityRegistries.flatMap((r) =>
    (r.items || []).map((i) => ({
      ...i,
      currency: i.currency || r.currency || 'GBP',
      registryTitle: r.title,
      registryDesc: r.description,
      regExternalUrl: r.external_url,
    }))
  );

  if (allCharities.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10 md:py-14">
        <Link to={`${basePath}/registry`} className="text-xs text-primary-600 hover:text-primary-700 cursor-pointer whitespace-nowrap mb-6 inline-flex items-center gap-1">
          <i className="ri-arrow-left-s-line" /> Back to registry
        </Link>
        <div className="text-center py-16">
          <div className="w-20 h-20 mx-auto flex items-center justify-center rounded-full bg-secondary-100 mb-6">
            <i className="ri-heart-pulse-line text-4xl text-secondary-400" />
          </div>
          <h1 className="font-heading text-2xl text-foreground-900 mb-3">No charities listed</h1>
          <p className="text-sm text-foreground-500 max-w-sm mx-auto">The couple haven&apos;t added any charity links yet.</p>
        </div>
      </div>
    );
  }

  const primary = charityRegistries[0];

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 md:py-14">
      <Link to={`${basePath}/registry`} className="text-xs text-primary-600 hover:text-primary-700 cursor-pointer whitespace-nowrap mb-6 inline-flex items-center gap-1">
        <i className="ri-arrow-left-s-line" /> Back to registry
      </Link>

      <div className="text-center mb-10">
        {primary?.cover_image && (
          <img src={primary.cover_image} alt="" className="w-24 h-24 rounded-full object-cover mx-auto mb-4" loading="lazy" />
        )}
        <h1 className="font-heading text-3xl text-foreground-900 mb-3">{primary?.title || 'Charities we support'}</h1>
        <p className="text-sm text-foreground-500 max-w-lg mx-auto">
          {primary?.description || 'In lieu of gifts, the couple would be honoured if you would consider supporting these causes that are close to their hearts.'}
        </p>
      </div>

      <div className="space-y-4 max-w-2xl mx-auto">
        {allCharities.map((charity) => (
          <div key={charity.id} className="bg-white rounded-xl border border-secondary-100 overflow-hidden hover:border-primary-200 transition-all">
            <div className="flex flex-col sm:flex-row">
              {charity.image && (
                <div className="w-full sm:w-40 h-36 sm:h-auto flex-shrink-0 bg-background-50 overflow-hidden">
                  <img src={charity.image} alt={charity.title} className="w-full h-full object-cover" loading="lazy" />
                </div>
              )}
              <div className="p-5 flex flex-col flex-1 min-w-0">
                <h2 className="font-heading text-base font-semibold text-foreground-900 mb-1">{charity.title}</h2>
                {charity.description && (
                  <p className="text-xs text-foreground-500 leading-relaxed mb-3">{charity.description}</p>
                )}
                {charity.why_couple_chose && (
                  <div className="bg-secondary-50 rounded-lg p-3 mb-3">
                    <p className="text-xs text-foreground-600 italic">&ldquo;{charity.why_couple_chose}&rdquo;</p>
                  </div>
                )}
                <div className="mt-auto flex items-center gap-3 flex-wrap">
                  {charity.external_url && (
                    <a
                      href={charity.external_url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      Donate <i className="ri-arrow-right-up-line text-xs" />
                    </a>
                  )}
                  {charity.regExternalUrl && !charity.external_url && (
                    <a
                      href={charity.regExternalUrl}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      Donate <i className="ri-arrow-right-up-line text-xs" />
                    </a>
                  )}
                  {charity.provider && (
                    <span className="text-[11px] text-foreground-400">via {charity.provider}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Disclaimer */}
      <p className="text-center text-[10px] text-foreground-350 mt-8 max-w-md mx-auto leading-relaxed">
        Clicking a donate link will take you to the charity&apos;s official page. Wedora does not process charity donations directly and is not responsible for third-party content.
      </p>
    </div>
  );
}