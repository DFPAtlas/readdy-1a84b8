import { useState } from 'react';
import { useGuestPortal } from '@/hooks/useGuestPortal';
import { useParams, Link } from 'react-router-dom';
import { formatMinor } from '@/lib/budgetMoney';
import type { CurrencyCode } from '@/lib/budgetMoney';
import type { GiftFundLight } from '@/types/access';

function FundCard({ fund, basePath, coupleAccountReady }: { fund: GiftFundLight; basePath: string; coupleAccountReady: boolean }) {
  const progress = fund.target_amount_minor
    ? Math.min((fund.raised_amount_minor / fund.target_amount_minor) * 100, 100)
    : 0;
  const hasTarget = fund.target_amount_minor != null && fund.target_amount_minor > 0;

  return (
    <Link
      to={`${basePath}/gift-funding/${fund.id}`}
      className="group bg-white rounded-xl border border-secondary-100 overflow-hidden hover:border-primary-200 transition-all cursor-pointer flex flex-col"
    >
      <div className="relative w-full h-44 bg-background-50 overflow-hidden flex-shrink-0">
        {fund.cover_image_path ? (
          <img src={fund.cover_image_path} alt={fund.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-primary-50 flex items-center justify-center">
              <i className="ri-heart-line text-2xl text-primary-400" />
            </div>
          </div>
        )}
        <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-white/90 text-foreground-600 text-[10px] font-label border border-secondary-100 capitalize">
          {fund.category}
        </span>
        {fund.closes_at && new Date(fund.closes_at) > new Date() && (
          <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-label border border-amber-200">
            Closes {new Date(fund.closes_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          </span>
        )}
      </div>
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-heading text-sm font-semibold text-foreground-900 mb-1 group-hover:text-primary-600 transition-colors">{fund.title}</h3>
        {fund.description && (
          <p className="text-xs text-foreground-500 line-clamp-2 mb-3">{fund.description}</p>
        )}
        <div className="mt-auto space-y-2">
          {hasTarget ? (
            <>
              <div className="flex items-end justify-between">
                <span className="text-sm font-semibold text-foreground-900">
                  {formatMinor(fund.raised_amount_minor, 'GBP' as CurrencyCode)}
                </span>
                <span className="text-xs text-foreground-400">
                  of {formatMinor(fund.target_amount_minor, 'GBP' as CurrencyCode)}
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-secondary-100 overflow-hidden">
                <div className="h-full rounded-full bg-accent-500 transition-all" style={{ width: `${progress}%` }} />
              </div>
              <div className="flex items-center justify-between text-[10px] text-foreground-400">
                <span>{Math.round(progress)}% funded</span>
                <span>{fund.contributor_count} {fund.contributor_count === 1 ? 'gift' : 'gifts'}</span>
              </div>
            </>
          ) : (
            <div>
              <span className="text-sm font-semibold text-foreground-900">
                {formatMinor(fund.raised_amount_minor, 'GBP' as CurrencyCode)}
              </span>
              <span className="text-xs text-foreground-400 ml-2">raised from {fund.contributor_count} {fund.contributor_count === 1 ? 'gift' : 'gifts'}</span>
            </div>
          )}

          {coupleAccountReady ? (
            <span className="inline-flex items-center gap-1 text-xs font-label text-primary-600 group-hover:text-primary-700 whitespace-nowrap">
              Contribute <i className="ri-arrow-right-line text-[10px]" />
            </span>
          ) : (
            <span className="text-[10px] text-amber-600 font-label">
              <i className="ri-time-line mr-1" /> Contributions not yet available
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function GuestGiftFundingPage() {
  const { data, loading } = useGuestPortal();
  const { accessId } = useParams<{ accessId: string }>();
  const basePath = accessId ? `/guest/${accessId}` : '';

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10 md:py-14 animate-pulse space-y-8">
        <div className="text-center space-y-3">
          <div className="h-8 w-48 bg-secondary-100 rounded-lg mx-auto" />
          <div className="h-4 w-80 bg-secondary-100 rounded mx-auto" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1,2,3].map((i) => <div key={i} className="h-52 bg-secondary-100 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const giftFunds = data.giftFunds;
  const settings = data.portal_settings || {};
  const showRegistry = settings.show_registry !== false;

  if (!showRegistry || !giftFunds || giftFunds.funds.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10 md:py-14">
        <div className="text-center py-16">
          <div className="w-20 h-20 mx-auto flex items-center justify-center rounded-full bg-secondary-100 mb-6">
            <i className="ri-heart-line text-4xl text-secondary-400" />
          </div>
          <h1 className="font-heading text-3xl text-foreground-900 mb-3">Gift Fund</h1>
          <p className="text-sm text-foreground-500 max-w-md mx-auto">
            The couple haven&apos;t set up their gift fund yet. Your presence at their wedding is the greatest gift of all.
          </p>
        </div>
      </div>
    );
  }

  const totalRaised = giftFunds.funds.reduce((sum, f) => sum + f.raised_amount_minor, 0);

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 md:py-14">
      <div className="text-center mb-12">
        <h1 className="font-heading text-3xl md:text-4xl text-foreground-900 mb-3">Gift Fund</h1>
        <p className="text-sm text-foreground-500 max-w-lg mx-auto mb-4">
          A voluntary gift contribution for the couple. Your generosity helps them start their new life together.
        </p>
        {giftFunds.funds.length > 1 && (
          <p className="text-xs text-foreground-400">
            {formatMinor(totalRaised, 'GBP' as CurrencyCode)} raised across {giftFunds.funds.length} fund{giftFunds.funds.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {!giftFunds.couple_account_ready && (
        <div className="max-w-lg mx-auto mb-8">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
              <i className="ri-time-line text-lg text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-label font-semibold text-amber-800">Online contributions coming soon</p>
              <p className="text-xs text-amber-600 mt-0.5">The couple are setting up their payment account. You can browse funds below and contribute once everything is ready.</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {giftFunds.funds.map((fund) => (
          <FundCard key={fund.id} fund={fund} basePath={basePath} coupleAccountReady={giftFunds.couple_account_ready} />
        ))}
      </div>

      <p className="text-center text-[11px] text-foreground-350 mt-10 max-w-md mx-auto leading-relaxed">
        Gift contributions are voluntary payments to the couple and do not provide ownership, financial returns or rewards.
        Your name and message visibility is controlled by your chosen privacy setting.
      </p>
    </div>
  );
}