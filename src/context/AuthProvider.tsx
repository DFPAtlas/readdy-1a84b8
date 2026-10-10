import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { isDemoMode } from '@/demo/demoConfig';
import { accountDestination } from '@/lib/signupIntent';
import { mapAuthError, safeAuthLog } from '@/lib/authErrors';
import type { User, Session } from '@supabase/supabase-js';

// ── Profile type ──

export interface AuthProfile {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

// ── Context shape ──

export interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: AuthProfile | null;
  loading: boolean;
  profileLoading: boolean;
  authError: string | null;
  isAuthenticated: boolean;
  isDemoSession: boolean;
  signUp: (email: string, password: string, metadata?: { first_name?: string; last_name?: string; selected_plan?: string; signup_return_to?: string; marketing_consent?: boolean }) => Promise<{ success: boolean; needsVerification: boolean }>;
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<boolean>;
  updatePassword: (newPassword: string) => Promise<boolean>;
  refreshProfile: () => Promise<void>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ──

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  // ── Demo mode bypass ──
  const isDemoSession = isDemoMode;

  // ── Load profile from DB ──
  const loadProfile = useCallback(async (userId: string) => {
    setProfileLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!mountedRef.current) return;

      if (error) {
        safeAuthLog('loadProfile', error);
        // If profile doesn't exist yet (new signup), don't treat as error
        if (error.code === 'PGRST116') {
          setProfile(null);
          return;
        }
        throw error;
      }

      setProfile(data as AuthProfile | null);
    } catch (err) {
      safeAuthLog('loadProfile exception', err);
      setProfile(null);
    } finally {
      if (mountedRef.current) setProfileLoading(false);
    }
  }, []);

  // ── Refresh profile (public) ──
  const refreshProfile = useCallback(async () => {
    if (!user?.id) return;
    await loadProfile(user.id);
  }, [user, loadProfile]);

  // ── Initial session load + subscribe to changes ──
  useEffect(() => {
    mountedRef.current = true;

    const initSession = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (!mountedRef.current) return;

        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          loadProfile(currentSession.user.id);
        }
      } catch (err) {
        safeAuthLog('initSession', err);
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    };

    initSession();

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mountedRef.current) return;
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        loadProfile(newSession.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  // ── Auth actions ──

  const clearAuthError = useCallback(() => setAuthError(null), []);

  const signUp = useCallback(async (
    email: string,
    password: string,
    metadata?: { first_name?: string; last_name?: string; selected_plan?: string; signup_return_to?: string; marketing_consent?: boolean }
  ): Promise<{ success: boolean; needsVerification: boolean }> => {
    setAuthError(null);

    const displayName = metadata?.first_name && metadata?.last_name
      ? `${metadata.first_name} ${metadata.last_name}`
      : undefined;

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: metadata?.first_name || '',
            last_name: metadata?.last_name || '',
            display_name: displayName || '',
            selected_plan: metadata?.selected_plan || 'free',
            signup_return_to: metadata?.signup_return_to || '',
            marketing_consent: metadata?.marketing_consent === true,
            marketing_consent_at: new Date().toISOString(),
          },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(accountDestination(metadata))}`,
        },
      });

      if (error) {
        setAuthError(mapAuthError(error));
        return { success: false, needsVerification: false };
      }

      // Check if email confirmation is required
      const needsVerification = data?.user?.identities?.length === 0 ||
        (data?.user && !data?.session);

      return { success: true, needsVerification };
    } catch (err) {
      setAuthError(mapAuthError(err));
      return { success: false, needsVerification: false };
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<boolean> => {
    setAuthError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setAuthError(mapAuthError(error));
        return false;
      }

      // State will update via onAuthStateChange
      return true;
    } catch (err) {
      setAuthError(mapAuthError(err));
      return false;
    }
  }, []);

  const signOut = useCallback(async () => {
    setAuthError(null);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        safeAuthLog('signOut', error);
        // Fallback: clear local state even if server call fails
      }
    } catch (err) {
      safeAuthLog('signOut exception', err);
    } finally {
      setUser(null);
      setSession(null);
      setProfile(null);
    }
  }, []);

  const requestPasswordReset = useCallback(async (email: string): Promise<boolean> => {
    setAuthError(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      // Don't reveal whether email exists — always return true
      if (error) {
        safeAuthLog('requestPasswordReset', error);
      }
      return true;
    } catch (err) {
      safeAuthLog('requestPasswordReset exception', err);
      return true; // Neutral response
    }
  }, []);

  const updatePassword = useCallback(async (newPassword: string): Promise<boolean> => {
    setAuthError(null);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) {
        setAuthError(mapAuthError(error));
        return false;
      }

      return true;
    } catch (err) {
      setAuthError(mapAuthError(err));
      return false;
    }
  }, []);

  const isAuthenticated = !isDemoMode && !!user && !!session;

  const value: AuthContextValue = {
    user,
    session,
    profile,
    loading,
    profileLoading,
    authError,
    isAuthenticated,
    isDemoSession,
    signUp,
    signIn,
    signOut,
    requestPasswordReset,
    updatePassword,
    refreshProfile,
    clearAuthError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ── Hook ──

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default AuthProvider;