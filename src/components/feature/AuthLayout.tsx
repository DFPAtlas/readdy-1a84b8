import { Outlet } from 'react-router-dom';
import SubscriptionGuard from '@/components/feature/SubscriptionGuard';
import AuthGuard from '@/components/feature/AuthGuard';

export default function AuthLayout() {
  return (
    <AuthGuard>
      <SubscriptionGuard><Outlet /></SubscriptionGuard>
    </AuthGuard>
  );
}