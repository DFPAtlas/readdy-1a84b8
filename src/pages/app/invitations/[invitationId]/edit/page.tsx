import { useParams, useNavigate } from 'react-router-dom';
import AppShell from '@/components/feature/AppShell';
import { useAuth } from '@/context/AuthProvider';
import { isDemoMode } from '@/demo/demoConfig';
import InvitationEditor from './components/InvitationEditor';

export default function EditInvitationPage() {
  const { invitationId } = useParams<{ invitationId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading, isAuthenticated } = useAuth();

  // ── Handle creation callback — navigate to the real URL ──

  const handleCreated = (newId: string) => {
    navigate(`/app/invitations/${newId}/edit`, { replace: true });
  };

  // ── Auth loading ──

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

  // ── Not authenticated (non-demo only) ──

  if (!isDemoMode && !isAuthenticated) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="text-center">
            <div className="w-14 h-14 mx-auto flex items-center justify-center rounded-full bg-amber-50 text-amber-500 mb-4">
              <i className="ri-lock-line text-2xl" />
            </div>
            <h2 className="font-heading text-lg text-foreground-900 mb-2">Sign in required</h2>
            <p className="text-sm text-foreground-500 mb-4">Please sign in to access the invitation editor.</p>
          </div>
        </div>
      </AppShell>
    );
  }

  const effectiveUserId = isDemoMode ? 'demo-user' : (user?.id ?? null);

  return (
    <AppShell>
      {/* Negative margins cancel AppShell's main padding so the editor fills the viewport */}
      <div className="-m-4 md:-m-6 lg:-m-8" style={{ height: 'calc(100vh - 64px)' }}>
        <InvitationEditor
          invitationId={invitationId ?? null}
          userId={effectiveUserId}
          onCreated={handleCreated}
        />
      </div>
    </AppShell>
  );
}