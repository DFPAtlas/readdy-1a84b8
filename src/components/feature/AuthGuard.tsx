import PlatformAdminGuard from './PlatformAdminGuard';
import type * as React from "react";
import { useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthProvider';
import { isDemoMode } from '@/demo/demoConfig';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { loading, profileLoading, isAuthenticated, isDemoSession, profile } = useAuth();
  const location = useLocation();

  // ── Demo mode: always allow ──
  if (isDemoMode || isDemoSession) {
    return <>{children}</>;
  }

  // ── Auth loading: branded spinner ──
  if (loading) {
    return (
      <div className="min-h-screen bg-background-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-primary-50 text-primary-500 mb-4">
            <i className="ri-loader-4-line animate-spin text-2xl" />
          </div>
          <p className="text-sm text-foreground-500 font-label">Loading your account...</p>
        </div>
      </div>
    );
  }

  // ── No session: redirect to login ──
  if (!isAuthenticated) {
    const returnTo = location.pathname + location.search;
    const params = new URLSearchParams();
    if (returnTo !== '/login' && returnTo !== '/signup') {
      params.set('redirect', returnTo);
    }
    const redirectPath = `/login${params.toString() ? `?${params.toString()}` : ''}`;
    return <Navigate to={redirectPath} replace />;
  }

  // ── Profile loading ──
  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-primary-50 text-primary-500 mb-4">
            <i className="ri-loader-4-line animate-spin text-2xl" />
          </div>
          <p className="text-sm text-foreground-500 font-label">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (location.pathname.startsWith('/app/admin/')) return <PlatformAdminGuard>{children}</PlatformAdminGuard>;

  if (['/app/support','/app/account/privacy'].includes(location.pathname)) return <>{children}</>;

  // ── Onboarding incomplete → redirect ──
  if (!profile?.onboarding_completed) {
    // Don't redirect if already on onboarding
    if (location.pathname === '/app/onboarding') {
      return <>{children}</>;
    }
    return <Navigate to="/app/onboarding" replace />;
  }

  // ── All good ──
  return <>{children}</>;
}