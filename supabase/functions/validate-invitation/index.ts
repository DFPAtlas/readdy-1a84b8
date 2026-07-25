
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const securityHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  "Pragma": "no-cache",
  "Expires": "0",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
};

const RATE_WINDOW_MINUTES = 15;
const MAX_FAILED_ATTEMPTS = 5;
const SESSION_DURATION_DAYS = 7;

function sha256(text: string): string {
  const data = new TextEncoder().encode(text);
  const hash = crypto.subtle.digestSync("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function buildFingerprint(req: Request): string {
  const ip = req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  const ua = req.headers.get("user-agent") || "unknown";
  return sha256(`${ip}:${ua.slice(0, 64)}`);
}

function genericError(reason: string) {
  return { valid: false, reason };
}

function allHeaders(): Record<string, string> {
  return { ...corsHeaders, ...securityHeaders };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: allHeaders() });
  }

  const supabaseUrl = Deno.env.get("VITE_PUBLIC_SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const fingerprint = buildFingerprint(req);

  try {
    const body = await req.json();
    const { rawToken } = body || {};

    if (!rawToken || typeof rawToken !== "string" || rawToken.length < 12) {
      await logAnonActivity(supabase, fingerprint, "invalid_token_format", "Token missing or too short");
      return new Response(JSON.stringify(genericError("invalid_link")), {
        status: 200,
        headers: { ...allHeaders(), "Content-Type": "application/json" },
      });
    }

    // --- Rate limiting ---
    const windowStart = new Date(Date.now() - RATE_WINDOW_MINUTES * 60 * 1000).toISOString();

    const { count: recentFailures, error: rateErr } = await supabase
      .from("invitation_access_activity")
      .select("id", { count: "exact", head: true })
      .eq("event_type", "validation_failed")
      .gte("created_at", windowStart)
      .filter("security_metadata->>fingerprint", "eq", fingerprint);

    if (!rateErr && recentFailures !== null && recentFailures >= MAX_FAILED_ATTEMPTS) {
      await logAnonActivity(supabase, fingerprint, "rate_limited", "Too many failed attempts");
      return new Response(JSON.stringify(genericError("invalid_link")), {
        status: 200,
        headers: { ...allHeaders(), "Content-Type": "application/json" },
      });
    }

    const tokenHash = sha256(rawToken);

    // Find active token
    const { data: accessToken, error: tokenErr } = await supabase
      .from("invitation_access_tokens")
      .select("*")
      .eq("token_hash", tokenHash)
      .eq("status", "active")
      .maybeSingle();

    if (tokenErr || !accessToken) {
      // Check if token was revoked
      const { data: revokedToken } = await supabase
        .from("invitation_access_tokens")
        .select("status, revoked_at")
        .eq("token_hash", tokenHash)
        .maybeSingle();

      const failReason = revokedToken?.status === "revoked" ? "revoked" : "not_found";
      await logAnonActivity(supabase, fingerprint, "validation_failed", `Token ${failReason}`, revokedToken?.status === "revoked" ? { token_status: "revoked" } : undefined);

      return new Response(JSON.stringify(genericError("invalid_link")), {
        status: 200,
        headers: { ...allHeaders(), "Content-Type": "application/json" },
      });
    }

    // Check token expiry
    if (accessToken.expires_at && new Date(accessToken.expires_at) < new Date()) {
      await supabase
        .from("invitation_access_tokens")
        .update({ status: "expired" })
        .eq("id", accessToken.id);

      await logWeddingActivity(supabase, accessToken.wedding_id, accessToken.invitation_id, accessToken.id, "token_expired", "Token expired", fingerprint);

      return new Response(JSON.stringify(genericError("expired")), {
        status: 200,
        headers: { ...allHeaders(), "Content-Type": "application/json" },
      });
    }

    // Get invitation — idempotency: always returns same data for same token
    const { data: invitation, error: invErr } = await supabase
      .from("invitations")
      .select("*, template:invitation_templates(id, name, style_preset, header_text, body_text, closing_text, footer_text, rsvp_button_label, image_url, theme_config)")
      .eq("id", accessToken.invitation_id)
      .maybeSingle();

    if (invErr || !invitation) {
      await logWeddingActivity(supabase, accessToken.wedding_id, accessToken.invitation_id, accessToken.id, "validation_failed", "Invitation not found", fingerprint);
      return new Response(JSON.stringify(genericError("invalid_link")), {
        status: 200,
        headers: { ...allHeaders(), "Content-Type": "application/json" },
      });
    }

    if (invitation.status === "cancelled" || invitation.status === "archived") {
      await logWeddingActivity(supabase, accessToken.wedding_id, accessToken.invitation_id, accessToken.id, "access_denied_cancelled", "Invitation cancelled or archived", fingerprint);
      return new Response(JSON.stringify(genericError("cancelled")), {
        status: 200,
        headers: { ...allHeaders(), "Content-Type": "application/json" },
      });
    }

    // Get wedding
    const { data: wedding, error: wedErr } = await supabase
      .from("weddings")
      .select("id, partner_one_name, partner_two_name, title, wedding_date, dress_code, welcome_message, contact_information, parking_notes, accessibility_notes, children_policy, plus_one_policy")
      .eq("id", accessToken.wedding_id)
      .maybeSingle();

    if (wedErr || !wedding) {
      return new Response(JSON.stringify(genericError("invalid_link")), {
        status: 200,
        headers: { ...allHeaders(), "Content-Type": "application/json" },
      });
    }

    // Check portal availability
    const { data: portalSettings } = await supabase
      .from("guest_portal_settings")
      .select("*")
      .eq("wedding_id", accessToken.wedding_id)
      .maybeSingle();

    if (portalSettings && !portalSettings.portal_enabled) {
      return new Response(JSON.stringify(genericError("portal_disabled")), {
        status: 200,
        headers: { ...allHeaders(), "Content-Type": "application/json" },
      });
    }

    if (portalSettings?.portal_closes_at) {
      const closeDate = new Date(portalSettings.portal_closes_at);
      if (new Date() >= closeDate) {
        return new Response(JSON.stringify(genericError("portal_closed")), {
          status: 200,
          headers: { ...allHeaders(), "Content-Type": "application/json" },
        });
      }
    }

    // Check for existing active session (idempotency — reuse if exists)
    const { data: existingSession } = await supabase
      .from("guest_access_sessions")
      .select("id, session_hash, created_at, last_seen_at")
      .eq("access_token_id", accessToken.id)
      .eq("status", "active")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let sessionHash: string;

    if (existingSession) {
      // Reuse existing session — touch last_seen_at
      sessionHash = existingSession.session_hash;
      await supabase
        .from("guest_access_sessions")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", existingSession.id);
    } else {
      // Create new session
      const rawSessionId = crypto.randomUUID();
      sessionHash = sha256(rawSessionId);
      const expiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000).toISOString();
      const now = new Date().toISOString();

      const { error: sessionErr } = await supabase
        .from("guest_access_sessions")
        .insert({
          wedding_id: accessToken.wedding_id,
          invitation_id: accessToken.invitation_id,
          access_token_id: accessToken.id,
          session_hash: sessionHash,
          status: "active",
          expires_at: expiresAt,
          created_at: now,
          last_seen_at: now,
        });

      if (sessionErr) {
        console.error("Session creation failed:", sessionErr);
        return new Response(JSON.stringify(genericError("unavailable")), {
          status: 200,
          headers: { ...allHeaders(), "Content-Type": "application/json" },
        });
      }

      await supabase.from("guest_portal_activity").insert({
        wedding_id: accessToken.wedding_id,
        invitation_id: accessToken.invitation_id,
        access_token_id: accessToken.id,
        actor_type: "guest",
        event_type: "session_created",
        summary: "Guest portal session created",
        security_metadata: { fingerprint },
      });
    }

    // Update token last_used_at
    await supabase
      .from("invitation_access_tokens")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", accessToken.id);

    // Log access granted
    await logWeddingActivity(supabase, accessToken.wedding_id, accessToken.invitation_id, accessToken.id, "access_granted", "Guest accessed invitation", fingerprint);

    // Get recipients
    const { data: recipients } = await supabase
      .from("invitation_recipients")
      .select("guest_id, guest:guests(id, full_name, preferred_name), recipient_role, ceremony_included, reception_included, evening_included, welcome_event_included, day_after_event_included, plus_one_allowed")
      .eq("invitation_id", invitation.id);

    // Get events
    const { data: events } = await supabase
      .from("wedding_events")
      .select("*, venue:wedding_venues(id, name, address_line_1, city, postcode, country)")
      .eq("wedding_id", accessToken.wedding_id)
      .eq("status", "active")
      .in("visibility", ["public", "invitation_holders"]);

    const filteredEvents = (events || []).map((evt) => ({
      id: evt.id,
      event_type: evt.event_type,
      name: evt.name,
      description: evt.description,
      start_at: evt.start_at,
      end_at: evt.end_at,
      dress_code: evt.dress_code,
      arrival_notes: evt.arrival_notes,
      venue: evt.venue
        ? {
            id: evt.venue.id,
            name: evt.venue.name,
            address_line_1: evt.venue.address_line_1,
            city: evt.venue.city,
            postcode: evt.venue.postcode,
            country: evt.venue.country,
          }
        : null,
    }));

    const guestRecipients = (recipients || []).map((r) => ({
      guest_id: r.guest_id,
      guest_name: r.guest?.full_name || "Guest",
      preferred_name: r.guest?.preferred_name || null,
      recipient_role: r.recipient_role,
      ceremony_included: r.ceremony_included,
      reception_included: r.reception_included,
      evening_included: r.evening_included,
      welcome_event_included: r.welcome_event_included,
      day_after_event_included: r.day_after_event_included,
      plus_one_allowed: r.plus_one_allowed,
    }));

    const data = {
      wedding: {
        id: wedding.id,
        partner_one_name: wedding.partner_one_name,
        partner_two_name: wedding.partner_two_name,
        title: wedding.title,
        wedding_date: wedding.wedding_date,
        dress_code: wedding.dress_code,
        welcome_message: wedding.welcome_message,
        contact_information: wedding.contact_information,
        parking_notes: wedding.parking_notes,
        accessibility_notes: wedding.accessibility_notes,
        children_policy: wedding.children_policy,
        plus_one_policy: wedding.plus_one_policy,
      },
      invitation: {
        id: invitation.id,
        formal_recipient_name: invitation.formal_recipient_name,
        informal_greeting: invitation.informal_greeting,
        invitation_type: invitation.invitation_type,
        rsvp_deadline: invitation.rsvp_deadline,
        status: invitation.status,
        template: invitation.template,
      },
      recipients: guestRecipients,
      events: filteredEvents,
      portal_settings: portalSettings
        ? {
            portal_enabled: portalSettings.portal_enabled,
            show_countdown: portalSettings.show_countdown,
            show_travel: portalSettings.show_travel,
            show_updates: portalSettings.show_updates,
            show_contact_details: portalSettings.show_contact_details,
            custom_guest_message: portalSettings.custom_guest_message,
            portal_closes_at: portalSettings.portal_closes_at,
          }
        : null,
    };

    return new Response(
      JSON.stringify({
        valid: true,
        data,
        session_id: sessionHash,
      }),
      {
        status: 200,
        headers: { ...allHeaders(), "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("validate-invitation error:", err);
    try {
      await supabase.from("invitation_access_activity").insert({
        wedding_id: "00000000-0000-0000-0000-000000000000",
        invitation_id: "00000000-0000-0000-0000-000000000000",
        actor_type: "system",
        event_type: "edge_function_error",
        summary: "Unexpected error in validate-invitation",
        security_metadata: { fingerprint, error: String(err).slice(0, 256) },
      });
    } catch { /* best effort */ }
    return new Response(JSON.stringify(genericError("unavailable")), {
      status: 200,
      headers: { ...allHeaders(), "Content-Type": "application/json" },
    });
  }
});

async function logAnonActivity(
  supabase: ReturnType<typeof createClient>,
  fingerprint: string,
  eventType: string,
  summary: string,
  extra?: Record<string, unknown>,
) {
  try {
    await supabase.from("invitation_access_activity").insert({
      wedding_id: "00000000-0000-0000-0000-000000000000",
      invitation_id: "00000000-0000-0000-0000-000000000000",
      actor_type: "unknown",
      event_type: eventType,
      summary,
      security_metadata: { fingerprint, ...(extra || {}) },
    });
  } catch { /* best effort */ }
}

async function logWeddingActivity(
  supabase: ReturnType<typeof createClient>,
  weddingId: string,
  invitationId: string,
  accessTokenId: string,
  eventType: string,
  summary: string,
  fingerprint: string,
) {
  try {
    await supabase.from("invitation_access_activity").insert({
      wedding_id: weddingId,
      invitation_id: invitationId,
      access_token_id: accessTokenId,
      actor_type: "guest",
      event_type: eventType,
      summary,
      security_metadata: { fingerprint },
    });
  } catch { /* best effort */ }
}
