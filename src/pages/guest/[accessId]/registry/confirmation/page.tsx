import { useGuestPortal } from '@/hooks/useGuestPortal';
import { Link, useParams } from 'react-router-dom';

export default function GuestContributionConfirmationPage() {
  const { data, loading } = useGuestPortal();
  const { accessId } = useParams<{ accessId: string }>();
  const basePath = accessId ? `/guest/${accessId}` : '';

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 animate-pulse space-y-6 text-center">
        <div className="w-20 h-20 rounded-full bg-secondary-100 mx-auto" />
        <div className="h-6 w-48 bg-secondary-100 rounded mx-auto" />
        <div className="h-4 w-64 bg-secondary-100 rounded mx-auto" />
      </div>
    );
  }

  if (!data) return null;

  const registry = data.registry;
  const myContributions = registry?.my_contributions || [];
  const latestContribution = myContributions.length > 0 ? myContributions[myContributions.length - 1] : null;
  const confirmedContributions = myContributions.filter((c) => c.status === 'confirmed');
  const pendingContributions = myContributions.filter((c) => c.status === 'pending' || c.status === 'draft');

  const wedding = data.wedding;

  return (
    <div className="max-w-lg mx-auto px-4 py-14 text-center">
      {/* Success icon */}
      <div className="w-20 h-20 mx-auto flex items-center justify-center rounded-full bg-emerald-50 mb-6">
        <i className="ri-check-line text-4xl text-emerald-500" />
      </div>

      <h1 className="font-heading text-3xl text-foreground-900 mb-3">
        {confirmedContributions.length > 0 ? "Thank you for your contribution" : "Contribution received"}
      </h1>

      <p className="text-sm text-foreground-500 mb-8 leading-relaxed">
        {confirmedContributions.length > 0
          ? "Your generosity means the world to the couple. They will be notified of your gift."
          : "Your contribution is being processed. You will receive confirmation once it is complete."}
      </p>

      {/* Latest contribution summary */}
      {latestContribution && (
        <div className="bg-white rounded-xl border border-secondary-100 p-5 mb-8 text-left">
          <p className="text-xs font-label font-semibold text-foreground-800 mb-3">Contribution summary</p>
          <div className="space-y-2 text-sm">
            {latestContribution.item_id && (
              <div className="flex justify-between">
                <span className="text-foreground-500">Gift/Fund</span>
                <span className="text-foreground-900 font-medium">Selected gift</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-foreground-500">Amount</span>
              <span className="text-foreground-900 font-semibold">
                {new Intl.NumberFormat('en-GB', { style: 'currency', currency: latestContribution.currency || 'GBP' }).format(latestContribution.amount)}
              </span>
            </div>
            {latestContribution.is_anonymous && (
              <div className="flex justify-between">
                <span className="text-foreground-500">Privacy</span>
                <span className="text-foreground-400 italic">Anonymous</span>
              </div>
            )}
            {latestContribution.message && (
              <div className="pt-2 border-t border-secondary-100">
                <p className="text-xs text-foreground-500">Your message:</p>
                <p className="text-sm text-foreground-700 italic mt-0.5">&ldquo;{latestContribution.message}&rdquo;</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pending notice */}
      {pendingContributions.length > 0 && (
        <div className="bg-amber-50 rounded-lg p-4 border border-amber-100 mb-8">
          <div className="flex items-center gap-2 text-amber-700 mb-1">
            <i className="ri-time-line text-sm" />
            <span className="text-xs font-label font-medium">Confirming your contribution</span>
          </div>
          <p className="text-xs text-amber-600">This may take a few moments. Do not refresh the page or navigate away.</p>
        </div>
      )}

      {/* Next actions */}
      <div className="space-y-3">
        <Link
          to={`${basePath}/registry`}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
        >
          <i className="ri-gift-line" /> Return to registry
        </Link>
        <br />
        <Link
          to={`${basePath}`}
          className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 cursor-pointer whitespace-nowrap"
        >
          <i className="ri-arrow-left-s-line text-xs" /> Back to dashboard
        </Link>
      </div>

      <p className="text-center text-[10px] text-foreground-350 mt-10 max-w-sm mx-auto leading-relaxed">
        Your contribution details are private and only visible to you and the couple. A confirmation email will be sent if the communications system is configured.
      </p>

      <p className="text-xs text-foreground-400 mt-4">&mdash; {wedding.partner_one_name} &amp; {wedding.partner_two_name}</p>
    </div>
  );
}