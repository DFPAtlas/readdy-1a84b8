import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthProvider';
import { isDemoMode } from '@/demo/demoConfig';
import { useWeddingEntitlements } from '@/hooks/useWeddingEntitlements';
import { paidRouteFeature } from '@/lib/paidRoutes';
import { FEATURE_PLANS, type PaidFeature } from '../../../supabase/functions/_shared/entitlementConfig';
import AppShell from './AppShell';
function PaidRoute({ feature, children }: { feature: PaidFeature; children: ReactNode }) {
  const { data, loading, error, refresh } = useWeddingEntitlements();
  if (loading) return <AppShell><p role="status" className="p-8 text-foreground-500">Checking your subscription…</p></AppShell>;
  const expired = data?.planKey !== 'free' && data?.accessUntil && Date.parse(data.accessUntil) <= Date.now();
  if (data?.features[feature] === true && !expired && !error) return <>{children}</>;
  const plan = FEATURE_PLANS[feature];
  return <AppShell><div className="max-w-xl mx-auto p-8 bg-background-50 border border-secondary-200 rounded-xl">
    <h1 className="text-2xl font-heading mb-3">{error ? 'Unable to check access' : 'Upgrade to unlock this feature'}</h1>
    <p className="text-foreground-600 mb-6">{error || `This feature requires Vowora ${plan.charAt(0).toUpperCase() + plan.slice(1)} or above. Your saved data stays safe when your plan changes.`}</p>
    {error && <button onClick={refresh} className="mr-4 underline">Retry</button>}
    <Link to="/app/billing" className="inline-block px-5 py-3 bg-primary-500 text-white rounded-lg">View plans</Link>
    <Link to="/app/dashboard" className="ml-4 underline">Dashboard</Link>
  </div></AppShell>;
}
export default function SubscriptionGuard({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { isDemoSession } = useAuth();
  const feature = paidRouteFeature(pathname);
  if (!feature || isDemoSession || isDemoMode) return <>{children}</>;
  return <PaidRoute feature={feature}>{children}</PaidRoute>;
}
