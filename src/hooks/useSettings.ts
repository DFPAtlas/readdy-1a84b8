import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type {
  ProfileSettings,
  WeddingDetailsSettings,
  GuestPortalSettings,
  NotificationPreferences,
  PrivacySettings,
  BillingInfo,
  CollaboratorDisplay,
  MemberInvitation,
  ExportRequest,
  DeletionRequest,
} from '@/types/settings';
import type { WeddingRole, WeddingMembership } from '@/types/membership';

// ── Profile ──

export function useProfileSettings(userId: string | null) {
  const [profile, setProfile] = useState<ProfileSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const mountedRef = useRef(true);

  const fetch = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error: qe } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, display_name, avatar_url, phone, timezone')
        .eq('id', userId)
        .maybeSingle();

      if (!mountedRef.current) return;
      if (qe) throw qe;

      if (data) {
        setProfile({
          firstName: data.first_name || '',
          lastName: data.last_name || '',
          displayName: data.display_name || '',
          avatarUrl: data.avatar_url || '',
          email: data.email || '',
          phone: data.phone || '',
          timezone: data.timezone || 'Europe/London',
        });
      }
    } catch (err: unknown) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [userId]);

  const save = useCallback(async (updates: Partial<ProfileSettings>) => {
    if (!userId) throw new Error('Not authenticated');
    setSaving(true);
    try {
      const payload: Record<string, string> = {};
      if (updates.firstName !== undefined) payload.first_name = updates.firstName;
      if (updates.lastName !== undefined) payload.last_name = updates.lastName;
      if (updates.displayName !== undefined) payload.display_name = updates.displayName;
      if (updates.phone !== undefined) payload.phone = updates.phone;
      if (updates.timezone !== undefined) payload.timezone = updates.timezone;

      if (Object.keys(payload).length === 0) return;

      const { error: ue } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', userId);

      if (ue) throw ue;

      setProfile((prev) => prev ? { ...prev, ...updates } : null);
    } catch (err: unknown) {
      throw err instanceof Error ? err : new Error('Failed to save profile');
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  }, [userId]);

  useEffect(() => {
    mountedRef.current = true;
    fetch();
    return () => { mountedRef.current = false; };
  }, [fetch]);

  return { profile, loading, error, saving, save, refetch: fetch };
}

// ── Wedding Details ──

export function useWeddingSettings(weddingId: string | null) {
  const [wedding, setWedding] = useState<WeddingDetailsSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const mountedRef = useRef(true);

  const fetch = useCallback(async () => {
    if (!weddingId) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error: qe } = await supabase
        .from('weddings')
        .select('id, title, partner_one_name, partner_two_name, wedding_date, timezone, location, slug, contact_information, status')
        .eq('id', weddingId)
        .maybeSingle();

      if (!mountedRef.current) return;
      if (qe) throw qe;

      if (data) {
        setWedding({
          title: data.title || '',
          partnerOneName: data.partner_one_name || '',
          partnerTwoName: data.partner_two_name || '',
          weddingDate: data.wedding_date || '',
          timezone: data.timezone || 'Europe/London',
          location: data.location || '',
          slug: data.slug || '',
          contactInfo: data.contact_information || '',
          status: data.status || 'active',
        });
      }
    } catch (err: unknown) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : 'Failed to load wedding');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [weddingId]);

  const save = useCallback(async (updates: Partial<WeddingDetailsSettings>) => {
    if (!weddingId) throw new Error('No wedding selected');
    setSaving(true);
    try {
      const payload: Record<string, string | null> = {};
      if (updates.title !== undefined) payload.title = updates.title;
      if (updates.partnerOneName !== undefined) payload.partner_one_name = updates.partnerOneName;
      if (updates.partnerTwoName !== undefined) payload.partner_two_name = updates.partnerTwoName;
      if (updates.weddingDate !== undefined) payload.wedding_date = updates.weddingDate || null;
      if (updates.timezone !== undefined) payload.timezone = updates.timezone;
      if (updates.location !== undefined) payload.location = updates.location;
      if (updates.contactInfo !== undefined) payload.contact_information = updates.contactInfo;

      if (Object.keys(payload).length === 0) return;

      const { error: ue } = await supabase
        .from('weddings')
        .update(payload)
        .eq('id', weddingId);

      if (ue) throw ue;

      setWedding((prev) => prev ? { ...prev, ...updates } : null);
    } catch (err: unknown) {
      throw err instanceof Error ? err : new Error('Failed to save wedding');
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  }, [weddingId]);

  useEffect(() => {
    mountedRef.current = true;
    fetch();
    return () => { mountedRef.current = false; };
  }, [fetch]);

  return { wedding, loading, error, saving, save, refetch: fetch };
}

// ── Guest Portal Settings ──

export function useGuestPortalSettings(weddingId: string | null) {
  const [settings, setSettings] = useState<GuestPortalSettings>({
    guestPortalEnabled: true,
    galleryEnabled: true,
    itineraryEnabled: true,
    registryEnabled: true,
    seatingEnabled: false,
    travelEnabled: true,
    updatesEnabled: true,
    allowGuestUploads: true,
    requireUploadApproval: true,
    publishMode: 'draft',
    guestPasswordEnabled: false,
    guestPassword: '',
    showGuestCount: true,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const mountedRef = useRef(true);

  const fetch = useCallback(async () => {
    if (!weddingId) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error: qe } = await supabase
        .from('wedding_settings')
        .select('*')
        .eq('wedding_id', weddingId)
        .maybeSingle();

      if (!mountedRef.current) return;
      if (qe && qe.code !== 'PGRST116') throw qe;

      if (data) {
        setSettings({
          guestPortalEnabled: data.guest_portal_enabled ?? true,
          galleryEnabled: data.gallery_enabled ?? true,
          itineraryEnabled: data.itinerary_enabled ?? true,
          registryEnabled: data.registry_enabled ?? true,
          seatingEnabled: data.seating_enabled ?? false,
          travelEnabled: data.travel_enabled ?? true,
          updatesEnabled: data.updates_enabled ?? true,
          allowGuestUploads: data.allow_guest_uploads ?? true,
          requireUploadApproval: data.require_upload_approval ?? true,
          publishMode: data.publish_mode ?? 'draft',
          guestPasswordEnabled: data.guest_password_enabled ?? false,
          guestPassword: '',
          showGuestCount: data.show_guest_count ?? true,
        });
      }
    } catch (err: unknown) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : 'Failed to load portal settings');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [weddingId]);

  const save = useCallback(async (updates: Partial<GuestPortalSettings>) => {
    if (!weddingId) throw new Error('No wedding selected');
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      if (updates.guestPortalEnabled !== undefined) payload.guest_portal_enabled = updates.guestPortalEnabled;
      if (updates.galleryEnabled !== undefined) payload.gallery_enabled = updates.galleryEnabled;
      if (updates.itineraryEnabled !== undefined) payload.itinerary_enabled = updates.itineraryEnabled;
      if (updates.registryEnabled !== undefined) payload.registry_enabled = updates.registryEnabled;
      if (updates.seatingEnabled !== undefined) payload.seating_enabled = updates.seatingEnabled;
      if (updates.travelEnabled !== undefined) payload.travel_enabled = updates.travelEnabled;
      if (updates.updatesEnabled !== undefined) payload.updates_enabled = updates.updatesEnabled;
      if (updates.allowGuestUploads !== undefined) payload.allow_guest_uploads = updates.allowGuestUploads;
      if (updates.requireUploadApproval !== undefined) payload.require_upload_approval = updates.requireUploadApproval;
      if (updates.publishMode !== undefined) payload.publish_mode = updates.publishMode;
      if (updates.guestPasswordEnabled !== undefined) payload.guest_password_enabled = updates.guestPasswordEnabled;
      if (updates.showGuestCount !== undefined) payload.show_guest_count = updates.showGuestCount;

      const { data: existing } = await supabase
        .from('wedding_settings')
        .select('id')
        .eq('wedding_id', weddingId)
        .maybeSingle();

      if (existing) {
        const { error: ue } = await supabase
          .from('wedding_settings')
          .update(payload)
          .eq('wedding_id', weddingId);
        if (ue) throw ue;
      } else {
        const { error: ie } = await supabase
          .from('wedding_settings')
          .insert({ wedding_id: weddingId, ...payload });
        if (ie) throw ie;
      }

      setSettings((prev) => ({ ...prev, ...updates }));
    } catch (err: unknown) {
      throw err instanceof Error ? err : new Error('Failed to save portal settings');
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  }, [weddingId]);

  useEffect(() => {
    mountedRef.current = true;
    fetch();
    return () => { mountedRef.current = false; };
  }, [fetch]);

  return { settings, loading, error, saving, save, refetch: fetch };
}

// ── Notification Preferences ──

export function useNotificationPreferences(weddingId: string | null, userId: string | null) {
  const [prefs, setPrefs] = useState<NotificationPreferences>({
    emailRsvpAlerts: true,
    emailNewUploads: true,
    emailBudgetAlerts: false,
    emailWeeklyDigest: true,
    emailCampaignUpdates: true,
    smsRsvpAlerts: false,
    pushEnabled: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const mountedRef = useRef(true);

  const fetch = useCallback(async () => {
    if (!weddingId || !userId) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error: qe } = await supabase
        .from('wedding_notification_preferences')
        .select('*')
        .eq('wedding_id', weddingId)
        .eq('user_id', userId)
        .maybeSingle();

      if (!mountedRef.current) return;
      if (qe && qe.code !== 'PGRST116') throw qe;

      if (data) {
        setPrefs({
          emailRsvpAlerts: data.email_rsvp_alerts ?? true,
          emailNewUploads: data.email_new_uploads ?? true,
          emailBudgetAlerts: data.email_budget_alerts ?? false,
          emailWeeklyDigest: data.email_weekly_digest ?? true,
          emailCampaignUpdates: data.email_campaign_updates ?? true,
          smsRsvpAlerts: data.sms_rsvp_alerts ?? false,
          pushEnabled: data.push_enabled ?? false,
        });
      }
    } catch (err: unknown) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : 'Failed to load notification preferences');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [weddingId, userId]);

  const save = useCallback(async (updates: Partial<NotificationPreferences>) => {
    if (!weddingId || !userId) throw new Error('Missing wedding/user context');
    setSaving(true);
    try {
      const payload: Record<string, boolean> = {};
      if (updates.emailRsvpAlerts !== undefined) payload.email_rsvp_alerts = updates.emailRsvpAlerts;
      if (updates.emailNewUploads !== undefined) payload.email_new_uploads = updates.emailNewUploads;
      if (updates.emailBudgetAlerts !== undefined) payload.email_budget_alerts = updates.emailBudgetAlerts;
      if (updates.emailWeeklyDigest !== undefined) payload.email_weekly_digest = updates.emailWeeklyDigest;
      if (updates.emailCampaignUpdates !== undefined) payload.email_campaign_updates = updates.emailCampaignUpdates;
      if (updates.smsRsvpAlerts !== undefined) payload.sms_rsvp_alerts = updates.smsRsvpAlerts;
      if (updates.pushEnabled !== undefined) payload.push_enabled = updates.pushEnabled;

      if (Object.keys(payload).length === 0) return;

      const { data: existing } = await supabase
        .from('wedding_notification_preferences')
        .select('id')
        .eq('wedding_id', weddingId)
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        const { error: ue } = await supabase
          .from('wedding_notification_preferences')
          .update(payload)
          .eq('wedding_id', weddingId)
          .eq('user_id', userId);
        if (ue) throw ue;
      } else {
        const { error: ie } = await supabase
          .from('wedding_notification_preferences')
          .insert({ wedding_id: weddingId, user_id: userId, ...payload });
        if (ie) throw ie;
      }

      setPrefs((prev) => ({ ...prev, ...updates }));
    } catch (err: unknown) {
      throw err instanceof Error ? err : new Error('Failed to save notification preferences');
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  }, [weddingId, userId]);

  useEffect(() => {
    mountedRef.current = true;
    fetch();
    return () => { mountedRef.current = false; };
  }, [fetch]);

  return { prefs, loading, error, saving, save, refetch: fetch };
}

// ── Collaborators & Invitations ──

export function useCollaborators(weddingId: string | null) {
  const [collaborators, setCollaborators] = useState<CollaboratorDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetch = useCallback(async () => {
    if (!weddingId) { setLoading(false); return; }
    setLoading(true);
    try {
      // Fetch active members
      const { data: members, error: me } = await supabase
        .from('wedding_members')
        .select('*')
        .eq('wedding_id', weddingId);

      if (!mountedRef.current) return;
      if (me) throw me;

      // Fetch pending/active invitations
      const { data: invites, error: ie } = await supabase
        .from('wedding_member_invitations')
        .select('*')
        .eq('wedding_id', weddingId)
        .in('status', ['pending', 'accepted']);

      if (!mountedRef.current) return;
      if (ie) throw ie;

      const result: CollaboratorDisplay[] = [];

      // Active members
      for (const m of (members || []) as unknown as WeddingMembership[]) {
        // Get profile info for this user
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name, display_name, avatar_url, email')
          .eq('id', m.user_id)
          .maybeSingle();

        const name = profile
          ? (profile.display_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim())
          : m.invited_email || 'Unknown';

        result.push({
          id: m.id,
          userId: m.user_id,
          email: profile?.email || m.invited_email || null,
          name,
          role: m.role,
          status: m.status,
          isInvitation: false,
          invitationId: null,
          avatarUrl: profile?.avatar_url || null,
          invitedAt: m.created_at,
          acceptedAt: m.accepted_at,
          expiresAt: null,
        });
      }

      // Pending invitations
      for (const inv of (invites || []) as unknown as MemberInvitation[]) {
        // Don't duplicate if already accepted
        if (inv.status === 'accepted') {
          const alreadyExists = result.some((r) =>
            r.status === 'active' && r.email === inv.invited_email
          );
          if (alreadyExists) continue;
        }

        result.push({
          id: inv.id,
          userId: null,
          email: inv.invited_email,
          name: inv.invited_email,
          role: inv.role,
          status: inv.status,
          isInvitation: true,
          invitationId: inv.id,
          avatarUrl: null,
          invitedAt: inv.created_at,
          acceptedAt: inv.accepted_at,
          expiresAt: inv.expires_at,
        });
      }

      if (mountedRef.current) {
        setCollaborators(result);
      }
    } catch (err: unknown) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : 'Failed to load collaborators');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [weddingId]);

  const inviteCollaborator = useCallback(async (email: string, role: WeddingRole) => {
    if (!weddingId) throw new Error('No wedding selected');

    const { data: existingMember } = await supabase
      .from('wedding_members')
      .select('id')
      .eq('wedding_id', weddingId)
      .eq('invited_email', email)
      .maybeSingle();

    if (existingMember) throw new Error('This person is already a member of this wedding');

    const { data: existingInvite } = await supabase
      .from('wedding_member_invitations')
      .select('id')
      .eq('wedding_id', weddingId)
      .eq('invited_email', email)
      .eq('status', 'pending')
      .maybeSingle();

    if (existingInvite) throw new Error('An invitation is already pending for this email');

    // Generate a random token
    const token = crypto.randomUUID();

    const { error: ie } = await supabase
      .from('wedding_member_invitations')
      .insert({
        wedding_id: weddingId,
        invited_email: email,
        invited_by: (await supabase.auth.getSession()).data.session?.user?.id || '',
        role,
        token,
        status: 'pending',
      });

    if (ie) throw ie;

    // Try to send invitation email via Edge Function
    try {
      await supabase.functions.invoke('settings-invite-member', {
        body: { action: 'invite', weddingId, email, role, token },
      });
    } catch {
      // Email sending is best-effort; the invitation is still in the database
    }

    await fetch();
  }, [weddingId, fetch]);

  const revokeInvitation = useCallback(async (invitationId: string) => {
    if (!weddingId) throw new Error('No wedding selected');

    const { error: ue } = await supabase
      .from('wedding_member_invitations')
      .update({ status: 'revoked', updated_at: new Date().toISOString() })
      .eq('id', invitationId)
      .eq('wedding_id', weddingId);

    if (ue) throw ue;
    await fetch();
  }, [weddingId, fetch]);

  const removeCollaborator = useCallback(async (memberId: string) => {
    if (!weddingId) throw new Error('No wedding selected');

    const { error: de } = await supabase
      .from('wedding_members')
      .delete()
      .eq('id', memberId)
      .eq('wedding_id', weddingId);

    if (de) throw de;
    await fetch();
  }, [weddingId, fetch]);

  const changeRole = useCallback(async (memberId: string, isInvitation: boolean, newRole: WeddingRole) => {
    if (!weddingId) throw new Error('No wedding selected');

    if (isInvitation) {
      const { error: ue } = await supabase
        .from('wedding_member_invitations')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('id', memberId)
        .eq('wedding_id', weddingId);
      if (ue) throw ue;
    } else {
      const { error: ue } = await supabase
        .from('wedding_members')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('id', memberId)
        .eq('wedding_id', weddingId);
      if (ue) throw ue;
    }

    await fetch();
  }, [weddingId, fetch]);

  useEffect(() => {
    mountedRef.current = true;
    fetch();
    return () => { mountedRef.current = false; };
  }, [fetch]);

  return { collaborators, loading, error, fetch, inviteCollaborator, revokeInvitation, removeCollaborator, changeRole };
}

// ── Privacy Settings ──

export function usePrivacySettings(weddingId: string | null) {
  const [privacy, setPrivacy] = useState<PrivacySettings>({
    searchEngineIndexing: false,
    guestPortalPublic: true,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const mountedRef = useRef(true);

  const fetch = useCallback(async () => {
    if (!weddingId) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error: qe } = await supabase
        .from('wedding_settings')
        .select('search_engine_indexing, guest_portal_enabled')
        .eq('wedding_id', weddingId)
        .maybeSingle();

      if (!mountedRef.current) return;
      if (qe && qe.code !== 'PGRST116') throw qe;

      if (data) {
        setPrivacy({
          searchEngineIndexing: data.search_engine_indexing ?? false,
          guestPortalPublic: data.guest_portal_enabled ?? true,
        });
      }
    } catch (err: unknown) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : 'Failed to load privacy settings');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [weddingId]);

  const save = useCallback(async (updates: Partial<PrivacySettings>) => {
    if (!weddingId) throw new Error('No wedding selected');
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      if (updates.searchEngineIndexing !== undefined) payload.search_engine_indexing = updates.searchEngineIndexing;
      if (updates.guestPortalPublic !== undefined) payload.guest_portal_enabled = updates.guestPortalPublic;

      const { data: existing } = await supabase
        .from('wedding_settings')
        .select('id')
        .eq('wedding_id', weddingId)
        .maybeSingle();

      if (existing) {
        const { error: ue } = await supabase
          .from('wedding_settings')
          .update(payload)
          .eq('wedding_id', weddingId);
        if (ue) throw ue;
      } else {
        const { error: ie } = await supabase
          .from('wedding_settings')
          .insert({ wedding_id: weddingId, ...payload });
        if (ie) throw ie;
      }

      setPrivacy((prev) => ({ ...prev, ...updates }));
    } catch (err: unknown) {
      throw err instanceof Error ? err : new Error('Failed to save privacy settings');
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  }, [weddingId]);

  useEffect(() => {
    mountedRef.current = true;
    fetch();
    return () => { mountedRef.current = false; };
  }, [fetch]);

  return { privacy, loading, error, saving, save, refetch: fetch };
}

// ── Billing ──

export function useBilling(weddingId: string | null) {
  const [billing, setBilling] = useState<BillingInfo>({
    plan: 'free',
    status: 'active',
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    currentPeriodStart: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetch = useCallback(async () => {
    if (!weddingId) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error: qe } = await supabase
        .from('subscription_records')
        .select('*')
        .eq('wedding_id', weddingId)
        .maybeSingle();

      if (!mountedRef.current) return;
      if (qe && qe.code !== 'PGRST116') throw qe;

      if (data) {
        setBilling({
          plan: data.plan,
          status: data.status,
          stripeCustomerId: data.stripe_customer_id,
          stripeSubscriptionId: data.stripe_subscription_id,
          currentPeriodStart: data.current_period_start,
          currentPeriodEnd: data.current_period_end,
          cancelAtPeriodEnd: data.cancel_at_period_end,
        });
      }
    } catch (err: unknown) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : 'Failed to load billing info');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [weddingId]);

  useEffect(() => {
    mountedRef.current = true;
    fetch();
    return () => { mountedRef.current = false; };
  }, [fetch]);

  return { billing, loading, error, refetch: fetch };
}

// ── Data Management ──

export function useDataManagement(weddingId: string | null) {
  const [exports, setExports] = useState<ExportRequest[]>([]);
  const [deletion, setDeletion] = useState<DeletionRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetch = useCallback(async () => {
    if (!weddingId) { setLoading(false); return; }
    setLoading(true);
    try {
      const [{ data: exportData, error: ee }, { data: deletionData, error: de }] = await Promise.all([
        supabase.from('wedding_export_requests').select('*').eq('wedding_id', weddingId).order('created_at', { ascending: false }).limit(5),
        supabase.from('wedding_deletion_requests').select('*').eq('wedding_id', weddingId).in('status', ['pending', 'confirmed']).order('created_at', { ascending: false }).limit(1),
      ]);

      if (!mountedRef.current) return;
      if (ee) throw ee;
      if (de) throw de;

      setExports((exportData || []) as unknown as ExportRequest[]);
      setDeletion(((deletionData || [])[0] || null) as DeletionRequest | null);
    } catch (err: unknown) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : 'Failed to load data management info');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [weddingId]);

  const requestExport = useCallback(async () => {
    if (!weddingId) throw new Error('No wedding selected');
    const userId = (await supabase.auth.getSession()).data.session?.user?.id;
    if (!userId) throw new Error('Not authenticated');

    const { error: ie } = await supabase
      .from('wedding_export_requests')
      .insert({ wedding_id: weddingId, requested_by: userId, status: 'pending' });

    if (ie) throw ie;
    await fetch();
  }, [weddingId, fetch]);

  const requestDeletion = useCallback(async (reason: string, confirmationCode: string) => {
    if (!weddingId) throw new Error('No wedding selected');
    const userId = (await supabase.auth.getSession()).data.session?.user?.id;
    if (!userId) throw new Error('Not authenticated');

    // Only one active deletion request at a time
    const { data: existing } = await supabase
      .from('wedding_deletion_requests')
      .select('id')
      .eq('wedding_id', weddingId)
      .in('status', ['pending', 'confirmed'])
      .maybeSingle();

    if (existing) throw new Error('A deletion request is already in progress');

    const { error: ie } = await supabase
      .from('wedding_deletion_requests')
      .insert({
        wedding_id: weddingId,
        requested_by: userId,
        reason,
        confirmation_code: confirmationCode,
        status: 'pending',
      });

    if (ie) throw ie;
    await fetch();
  }, [weddingId, fetch]);

  const confirmDeletion = useCallback(async () => {
    if (!weddingId || !deletion) throw new Error('No deletion request to confirm');

    const { error: ue } = await supabase
      .from('wedding_deletion_requests')
      .update({ status: 'confirmed' })
      .eq('id', deletion.id);

    if (ue) throw ue;
    await fetch();
  }, [weddingId, deletion, fetch]);

  const cancelDeletion = useCallback(async () => {
    if (!weddingId || !deletion) throw new Error('No deletion request to cancel');

    const { error: ue } = await supabase
      .from('wedding_deletion_requests')
      .update({ status: 'cancelled' })
      .eq('id', deletion.id);

    if (ue) throw ue;
    await fetch();
  }, [weddingId, deletion, fetch]);

  useEffect(() => {
    mountedRef.current = true;
    fetch();
    return () => { mountedRef.current = false; };
  }, [fetch]);

  return { exports, deletion, loading, error, fetch, requestExport, requestDeletion, confirmDeletion, cancelDeletion };
}