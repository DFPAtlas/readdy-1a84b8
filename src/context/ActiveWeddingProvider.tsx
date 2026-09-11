import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthProvider';
import { isDemoMode, DEMO_CONFIG } from '@/demo/demoConfig';
import { getPermissions } from '@/lib/permissions';
import type {
  AccessibleWedding,
  ActiveWeddingState,
  WeddingMembership,
  WeddingPermissions,
  WeddingRole,
} from '@/types/membership';

// ── Re-export compatible ActiveWedding type ──

export interface ActiveWedding {
  id: string;
  title: string;
  partner_one_name: string;
  partner_two_name: string;
  wedding_date: string | null;
  slug: string;
  status: string;
  role?: WeddingRole;
  membershipStatus?: string;
}

export type WeddingState = ActiveWeddingState;

// ── Local storage key ──

const STORAGE_KEY = 'vowora.activeWeddingId';

// ── Context shape ──

export interface ActiveWeddingContextValue {
  weddings: AccessibleWedding[];
  wedding: ActiveWedding | null;
  activeWedding: AccessibleWedding | null;
  activeMembership: WeddingMembership | null;
  weddingId: string | null;
  activeWeddingId: string | null;
  role: WeddingRole | null;
  permissions: WeddingPermissions;
  weddingState: ActiveWeddingState;
  loading: boolean;
  error: string | null;
  selectWedding: (weddingId: string) => Promise<void>;
  refetch: () => Promise<void>;
  refreshWeddings: () => Promise<void>;
  clearActiveWedding: () => void;
}

const ActiveWeddingContext = createContext<ActiveWeddingContextValue | null>(null);

// ── Result row from joined query ──

interface MembershipRow {
  id: string;
  wedding_id: string;
  user_id: string;
  role: WeddingRole;
  status: string;
  invited_by: string | null;
  invited_email: string | null;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
  weddings: {
    id: string;
    title: string;
    partner_one_name: string;
    partner_two_name: string;
    wedding_date: string | null;
    slug: string;
    status: string;
  } | null;
}

// ── Helpers ──

function accessibleToActive(wedding: AccessibleWedding): ActiveWedding {
  return {
    id: wedding.id,
    title: wedding.title,
    partner_one_name: wedding.partner_one_name,
    partner_two_name: wedding.partner_two_name,
    wedding_date: wedding.wedding_date,
    slug: wedding.slug,
    status: wedding.status,
    role: wedding.role,
    membershipStatus: wedding.membershipStatus,
  };
}

function rowToMembership(row: MembershipRow): WeddingMembership {
  return {
    id: row.id,
    wedding_id: row.wedding_id,
    user_id: row.user_id,
    role: row.role,
    status: row.status as WeddingMembership['status'],
    invited_by: row.invited_by,
    invited_email: row.invited_email,
    accepted_at: row.accepted_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// ── Provider ──

export function ActiveWeddingProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading, isDemoSession } = useAuth();

  const [weddings, setWeddings] = useState<AccessibleWedding[]>([]);
  const [activeWedding, setActiveWedding] = useState<AccessibleWedding | null>(null);
  const [activeMembership, setActiveMembership] = useState<WeddingMembership | null>(null);
  const [weddingState, setWeddingState] = useState<ActiveWeddingState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const mountedRef = useRef(true);
  const initialisedRef = useRef(false);

  // ── Fetch memberships + weddings ──

  const fetchWeddings = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);
    setWeddingState('loading');

    try {
      const { data, error: queryErr } = await supabase
        .from('wedding_members')
        .select(`
          id,
          wedding_id,
          user_id,
          role,
          status,
          invited_by,
          invited_email,
          accepted_at,
          created_at,
          updated_at,
          weddings!inner (
            id,
            title,
            partner_one_name,
            partner_two_name,
            wedding_date,
            slug,
            status
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (!mountedRef.current) return;

      if (queryErr) {
        if (queryErr.code === '42P01') {
          setWeddings([]);
          setActiveWedding(null);
          setActiveMembership(null);
          setWeddingState('no_wedding');
          setLoading(false);
          return;
        }
        throw queryErr;
      }

      const rows = (data || []) as unknown as MembershipRow[];

      const accessible: AccessibleWedding[] = [];
      for (const m of rows) {
        const w = m.weddings;
        if (!w) continue;
        accessible.push({
          id: w.id,
          title: w.title || '',
          partner_one_name: w.partner_one_name || '',
          partner_two_name: w.partner_two_name || '',
          wedding_date: w.wedding_date,
          slug: w.slug || '',
          status: w.status || 'active',
          role: m.role,
          membershipStatus: m.status as WeddingMembership['status'],
        });
      }

      setWeddings(accessible);

      if (accessible.length === 0) {
        setActiveWedding(null);
        setActiveMembership(null);
        setWeddingState('no_wedding');
      } else if (accessible.length === 1) {
        const only = accessible[0];
        setActiveWedding(only);
        setActiveMembership(rowToMembership(rows[0]));
        localStorage.setItem(STORAGE_KEY, only.id);
        setWeddingState('ready');
      } else {
        const storedId = localStorage.getItem(STORAGE_KEY);
        const matched = storedId ? accessible.find((w) => w.id === storedId) : null;

        if (matched) {
          const matchedRow = rows.find((m) => m.wedding_id === matched.id);
          setActiveWedding(matched);
          setActiveMembership(matchedRow ? rowToMembership(matchedRow) : null);
          setWeddingState('ready');
        } else {
          localStorage.removeItem(STORAGE_KEY);
          setActiveWedding(null);
          setActiveMembership(null);
          setWeddingState('no_wedding');
        }
      }
    } catch (err: unknown) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : 'Failed to load wedding memberships');
      setWeddingState('error');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [user?.id]);

  // ── Initial load ──

  useEffect(() => {
    mountedRef.current = true;

    if (authLoading) return;
    if (initialisedRef.current) return;

    if (isDemoSession) {
      setLoading(false);
      setWeddingState('ready');
      return;
    }

    if (!user?.id) {
      setLoading(false);
      setWeddingState('no_wedding');
      return;
    }

    initialisedRef.current = true;
    fetchWeddings();

    return () => {
      mountedRef.current = false;
    };
  }, [authLoading, user?.id, isDemoSession, fetchWeddings]);

  // ── Select wedding ──

  const selectWedding = useCallback(async (weddingId: string) => {
    const matched = weddings.find((w) => w.id === weddingId);
    if (!matched) {
      setError('You do not have access to this wedding.');
      setWeddingState('access_denied');
      return;
    }

    try {
      const { data, error: queryErr } = await supabase
        .from('wedding_members')
        .select('id, wedding_id, user_id, role, status, invited_by, invited_email, accepted_at, created_at, updated_at')
        .eq('wedding_id', weddingId)
        .eq('user_id', user!.id)
        .eq('status', 'active')
        .maybeSingle();

      if (!mountedRef.current) return;

      if (queryErr || !data) {
        localStorage.removeItem(STORAGE_KEY);
        setActiveWedding(null);
        setActiveMembership(null);
        setWeddingState('access_denied');
        setError('You no longer have access to this wedding.');
        setWeddings((prev) => prev.filter((w) => w.id !== weddingId));
        return;
      }

      const m = data as unknown as WeddingMembership;
      setActiveWedding(matched);
      setActiveMembership(m);
      localStorage.setItem(STORAGE_KEY, weddingId);
      setWeddingState('ready');
      setError(null);
    } catch (err: unknown) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : 'Failed to select wedding');
    }
  }, [weddings, user]);

  const refreshWeddings = useCallback(async () => {
    initialisedRef.current = false;
    await fetchWeddings();
  }, [fetchWeddings]);

  const clearActiveWedding = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setActiveWedding(null);
    setActiveMembership(null);
    setWeddingState('no_wedding');
  }, []);

  // ── Derived values ──

  const role = activeWedding?.role || null;
  const permissions = getPermissions(role);
  const wedding = activeWedding ? accessibleToActive(activeWedding) : null;
  const weddingId = activeWedding?.id || null;

  const value: ActiveWeddingContextValue = {
    weddings,
    wedding,
    activeWedding,
    activeMembership,
    weddingId,
    activeWeddingId: weddingId,
    role,
    permissions,
    weddingState,
    loading,
    error,
    selectWedding,
    refetch: refreshWeddings,
    refreshWeddings,
    clearActiveWedding,
  };

  return (
    <ActiveWeddingContext.Provider value={value}>
      {children}
    </ActiveWeddingContext.Provider>
  );
}

// ── Hook ──

export function useActiveWedding(): ActiveWeddingContextValue {
  const ctx = useContext(ActiveWeddingContext);

  if (!ctx) {
    if (isDemoMode) {
      const demoWedding: ActiveWedding = {
        id: DEMO_CONFIG.weddingId,
        title: 'Emma & James',
        partner_one_name: 'Emma',
        partner_two_name: 'James',
        wedding_date: '2027-04-24',
        slug: DEMO_CONFIG.publicSlug,
        status: 'active',
        role: 'owner',
        membershipStatus: 'active',
      };
      return {
        weddings: [],
        wedding: demoWedding,
        activeWedding: null,
        activeMembership: null,
        weddingId: DEMO_CONFIG.weddingId,
        activeWeddingId: DEMO_CONFIG.weddingId,
        role: 'owner',
        permissions: getPermissions('owner'),
        weddingState: 'ready',
        loading: false,
        error: null,
        selectWedding: async () => {},
        refetch: async () => {},
        refreshWeddings: async () => {},
        clearActiveWedding: () => {},
      };
    }
    throw new Error('useActiveWedding must be used within an ActiveWeddingProvider');
  }
  return ctx;
}

// ── Standalone helpers ──

export function setActiveWeddingId(id: string): void {
  localStorage.setItem(STORAGE_KEY, id);
}

export function clearActiveWedding(): void {
  localStorage.removeItem(STORAGE_KEY);
}