import type { GiftFundListItem } from '@/types/giftFunding';

interface GiftFundSummarySectionProps {
  funds: GiftFundListItem[];
  onManage: () => void;
}

export default function GiftFundSummarySection({ funds, onManage }: GiftFundSummarySectionProps) {
  const formatGBP = (n: number) => `£${n.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;

  const totalRaised = funds.reduce((s, f) => s + f.raised_amount_minor, 0);
  const totalContributors = funds.reduce((s, f) => s + f.contributor_count, 0);
  const totalTarget = funds.reduce((s, f) => s + (f.target_amount_minor || 0), 0);
  const overallPct = totalTarget > 0 ? Math.min(100, Math.round((totalRaised / totalTarget) * 100)) : null;

  const categoryLabels: Record<string, string> = {
    honeymoon: 'Honeymoon',
    new_home: 'New Home',
    furniture: 'Furniture',
    wedding: 'Wedding',
    experiences: 'Experiences',
    charity: 'Charity',
    future_together: 'Future Together',
    custom: 'Custom',
  };

  const categoryIcons: Record<string, string> = {
    honeymoon: 'ri-plane-line',
    new_home: 'ri-home-4-line',
    furniture: 'ri-sofa-line',
    wedding: 'ri-cake-line',
    experiences: 'ri-compass-3-line',
    charity: 'ri-heart-pulse-line',
    future_together: 'ri-rocket-line',
    custom: 'ri-heart-line',
  };

  if (funds.length === 0) {
    return (
      <div className="card-default mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <i className="ri-hand-heart-line text-sm" />
            </div>
            <h2 className="font-label text-sm font-semibold text-foreground-900">Gift Fund Contributions</h2>
          </div>
        </div>
        <div className="text-center py-6">
          <div className="w-10 h-10 mx-auto flex items-center justify-center rounded-full bg-background-100 text-foreground-300 mb-2">
            <i className="ri-hand-heart-line text-lg" />
          </div>
          <p className="text-sm text-foreground-500 mb-1">No gift funds set up yet</p>
          <p className="text-xs text-foreground-400 mb-3">Let guests contribute towards your honeymoon, new home, or experiences.</p>
          <button onClick={onManage} className="btn-outline text-xs py-1.5 cursor-pointer whitespace-nowrap">
            Set up gift fund
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card-default mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <i className="ri-hand-heart-line text-sm" />
          </div>
          <h2 className="font-label text-sm font-semibold text-foreground-900">Gift Fund Contributions</h2>
        </div>
        <button onClick={onManage} className="text-xs text-primary-600 hover:text-primary-700 font-label cursor-pointer whitespace-nowrap">
          Manage gift fund <i className="ri-arrow-right-line ml-0.5" />
        </button>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="p-3 rounded-xl bg-emerald-50/60">
          <p className="text-lg font-heading font-semibold text-emerald-700">{formatGBP(totalRaised)}</p>
          <p className="text-xs text-emerald-600 font-label mt-0.5">Total raised</p>
        </div>
        <div className="p-3 rounded-xl bg-background-100">
          <p className="text-lg font-heading font-semibold text-foreground-900">{funds.length}</p>
          <p className="text-xs text-foreground-500 font-label mt-0.5">Active {funds.length === 1 ? 'fund' : 'funds'}</p>
        </div>
        <div className="p-3 rounded-xl bg-background-100">
          <p className="text-lg font-heading font-semibold text-foreground-900">{totalContributors}</p>
          <p className="text-xs text-foreground-500 font-label mt-0.5">{totalContributors === 1 ? 'Contributor' : 'Contributors'}</p>
        </div>
      </div>

      {/* Overall progress (only if there are targets) */}
      {overallPct !== null && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-foreground-500">Overall progress</span>
            <span className="text-xs font-label font-semibold text-foreground-900">{overallPct}% of {formatGBP(totalTarget)}</span>
          </div>
          <div className="w-full h-2 bg-secondary-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${overallPct}%` }} />
          </div>
        </div>
      )}

      {/* Per-fund breakdown */}
      <div className="space-y-3">
        {funds.slice(0, 4).map((f) => {
          const pct = f.target_amount_minor && f.target_amount_minor > 0
            ? Math.min(100, Math.round((f.raised_amount_minor / f.target_amount_minor) * 100))
            : null;
          return (
            <div key={f.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-background-50 hover:bg-background-100 transition-colors">
              <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 flex-shrink-0">
                <i className={`${categoryIcons[f.category] || 'ri-heart-line'} text-sm`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-label text-foreground-800 truncate">{f.title}</span>
                  <span className="text-xs font-label text-foreground-600 whitespace-nowrap ml-2">
                    {formatGBP(f.raised_amount_minor)}
                    {f.target_amount_minor ? ` / ${formatGBP(f.target_amount_minor)}` : ''}
                  </span>
                </div>
                {pct !== null && (
                  <div className="w-full h-1.5 bg-secondary-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                )}
                {pct === null && (
                  <p className="text-xs text-foreground-400">{f.contributor_count} {f.contributor_count === 1 ? 'contribution' : 'contributions'} · open-ended</p>
                )}
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-foreground-400">{categoryLabels[f.category] || f.category}</span>
                  {pct !== null && <span className="text-xs text-foreground-400">{f.contributor_count} {f.contributor_count === 1 ? 'contributor' : 'contributors'}</span>}
                </div>
              </div>
            </div>
          );
        })}
        {funds.length > 4 && (
          <p className="text-xs text-foreground-400 pl-10">+{funds.length - 4} more {funds.length - 4 === 1 ? 'fund' : 'funds'}</p>
        )}
      </div>
    </div>
  );
}