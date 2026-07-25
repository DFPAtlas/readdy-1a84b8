import { Outlet } from 'react-router-dom';
import AuthGuard from '@/components/feature/AuthGuard';

export default function AuthLayout() {
  return (
    <AuthGuard>
      <Outlet />
    </AuthGuard>
  );
}