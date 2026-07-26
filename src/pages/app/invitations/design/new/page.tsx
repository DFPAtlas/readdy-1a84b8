import { useNavigate } from 'react-router-dom';
import AppShell from '@/components/feature/AppShell';
import { useAuth } from '@/context/AuthProvider';
import { isDemoMode } from '@/demo/demoConfig';
import InvitationEditor from '@/pages/app/invitations/[invitationId]/edit/components/InvitationEditor';

export default function NewDesignPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading, isAuthenticated } = useAuth();

  const handleCreated = (newId: string) => {
    const base = (window as { __BASE_PATH__?: string }).__BASE_PATH__ || '';
    navigate(`${base}/app/invitations/${newId}/edit`, { replace: true });
  };

  if (authLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="flex items-center gap-3 text-foreground-500">
            <i className="ri-loader-4-line animate-spin text-xl" />
            <span className="text-sm font-label">Loading…</span>
          </div>
        </div>
      </AppShell>
    );
  }

  // Demo mode: skip auth check, use demo userId
  if (!isDemoMode && !isAuthenticated) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="text-center">
            <div className="w-14 h-14 mx-auto flex items-center justify-center rounded-full bg-amber-50 text-amber-500 mb-4">
              <i className="ri-lock-line text-2xl" />
            </div>
            <h2 className="font-heading text-lg text-foreground-900 mb-2">Sign in required</h2>
            <p className="text-sm text-foreground-500 mb-4">Please sign in to create invitation designs.</p>
          </div>
        </div>
      </AppShell>
    );
  }

  const effectiveUserId = isDemoMode ? 'demo-user' : (user?.id ?? null);

  return (
    <AppShell>
      <InvitationEditor
        invitationId={null}
        userId={effectiveUserId}
        onCreated={handleCreated}
      />
    </AppShell>
  );
}