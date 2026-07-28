import { useSearchParams, Link } from 'react-router-dom';

export default function ContributionCancelPage() {
  const [searchParams] = useSearchParams();
  const fundId = searchParams.get('fund_id');

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-secondary-100 text-foreground-400 mb-6">
          <i className="ri-close-line text-3xl" />
        </div>
        <h1 className="font-heading text-2xl text-foreground-900 mb-3">Contribution cancelled</h1>
        <p className="text-sm text-foreground-600 mb-6 leading-relaxed">
          No payment has been made. Your contribution was not submitted — feel free to try again whenever you&apos;re ready.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {fundId ? (
            <Link
              to={`/guest/${fundId}/gift-funding`}
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
            >
              <i className="ri-arrow-left-line" /> Return to fund
            </Link>
          ) : (
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
            >
              Back to home
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}