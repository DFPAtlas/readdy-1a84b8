import { Outlet } from 'react-router-dom';
import SubscriptionGuard from '@/components/feature/SubscriptionGuard';
import AuthGuard from '@/components/feature/AuthGuard';
import { usePrivateRouteSeo } from '@/hooks/usePrivateRouteSeo';

/**
 * Every authenticated screen sits under this layout, so the private metadata
 * contract (unique title + noindex, nofollow, no social preview tags) is
 * applied once here instead of in ~105 individual pages.
 */
export default function AuthLayout() {
  usePrivateRouteSeo();

  return (
    <AuthGuard>
      <SubscriptionGuard><Outlet /></SubscriptionGuard>
    </AuthGuard>
  );
}