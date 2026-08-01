import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const RATE_WINDOW_MINUTES = 15;
const MAX_FAILED_ATTEMPTS = 8;
const SESSION_DURATION_DAYS = 7;

function allowedOrigins(): string[] {
  const configured = Deno.env.get("ALLOWED_ORIGINS");
  return (configured || "https://wedora.uk,https://www.wedora.uk,http://localhost:5173")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function headers(req: Request): Record<string, string> {
  const origin = req.headers.get("origin");
  const allowed = allowedOrigins();
  return {
    "Access-Control-Allow-Origin": origin && allowed.includes(origin) ? origin : allowed[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Cache-Control": "no-store, no-cache, must-revalidate",
    "Pragma": "no-cache",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Robots-Tag": "noindex, nofollow, noarchive",
    "Content-Type": "application/json",
    "Vary": "Origin",
  };
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function randomSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

async function fingerprint(req: Request): Promise<string> {
  const ip = req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  const userAgent = (req.headers.get("user-agent") || "unknown").slice(0, 180);
  return sha256(`${ip}:${userAgent}`);
}

function reply(req: Request, body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: headers(req) });
}

function visibleEvent(
  event: Record<string, unknown>,
  recipients: Array<Record<string, unknown>>,
): boolean {
  if (event.status === "archived" || event.visibility === "hidden") return false;
  if (event.visibility === "reveal_on_date" && event.reveal_at) {
    if (new Date() < new Date(String(event.reveal_at))) return false;
  }
  if (event.visibility !== "included_guests") return true;

  const fieldByType: Record<string, string> = {
    ceremony: "ceremony_included",
    reception: "reception_included",
    evening: "evening_included",
    welcome: "welcome_event_included",
    day_after: "day_after_event_included",
    farewell: "day_after_event_included",
  };
  const field = fieldByType[String(event.event_type || "")];
  return !field || recipients.some((recipient) => recipient[field] === true);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: headers(req) });
  if (req.method !== "POST") return reply(req, { valid: false, reason: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("validate-invitation: Supabase environment is incomplete");
    return reply(req, { valid: false, reason: "unavailable" }, 503);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const fp = await fingerprint(req);

  const logSecurity = async (
    eventType: string,
    metadata: Record<string, unknown> = {},
    weddingId?: string,
    invitationId?: string,
  ) => {
    const { error } = await supabase.from("guest_access_security_events").insert({
      fingerprint_hash: fp,
      event_type: eventType,
      source: "validate_invitation",
      wedding_id: weddingId || null,
      invitation_id: invitationId || null,
      metadata,
    });
    if (error) console.error("validate-invitation security log failed", error.message);
  };

  try {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      await logSecurity("invalid_json");
      return reply(req, { valid: false, reason: "invalid_link" });
    }

    const rawToken = typeof body.rawToken === "string" ? body.rawToken.trim() : "";
    if (rawToken.length < 24 || rawToken.length > 512) {
      await logSecurity("invalid_token_format", { length: rawToken.length });
      return reply(req, { valid: false, reason: "invalid_link" });
    }

    const since = new Date(Date.now() - RATE_WINDOW_MINUTES * 60_000).toISOString();
    const { count } = await supabase
      .from("guest_access_security_events")
      .select("id", { head: true, count: "exact" })
      .eq("fingerprint_hash", fp)
      .in("event_type", ["invalid_token_format", "token_not_found", "token_revoked"])
      .gte("created_at", since);

    if ((count || 0) >= MAX_FAILED_ATTEMPTS) {
      await logSecurity("rate_limited");
      return reply(req, { valid: false, reason: "invalid_link" }, 429);
    }

    const tokenHash = await sha256(rawToken);
    const { data: accessToken, error: tokenError } = await supabase
      .from("invitation_access_tokens")
      .select("id, wedding_id, invitation_id, status, expires_at")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (tokenError) throw tokenError;
    if (!accessToken) {
      await logSecurity("token_not_found");
      return reply(req, { valid: false, reason: "invalid_link" });
    }
    if (accessToken.status === "revoked") {
      await logSecurity("token_revoked", {}, accessToken.wedding_id, accessToken.invitation_id);
      return reply(req, { valid: false, reason: "invalid_link" });
    }
    if (accessToken.status !== "active") {
      return reply(req, { valid: false, reason: accessToken.status === "expired" ? "expired" : "invalid_link" });
    }
    if (accessToken.expires_at && new Date(accessToken.expires_at) <= new Date()) {
      await supabase.from("invitation_access_tokens").update({ status: "expired" }).eq("id", accessToken.id);
      await logSecurity("token_expired", {}, accessToken.wedding_id, accessToken.invitation_id);
      return reply(req, { valid: false, reason: "expired" });
    }

    const [{ data: invitation, error: invitationError }, { data: wedding, error: weddingError }, { data: portalSettings }] = await Promise.all([
      supabase
        .from("invitations")
        .select("id, wedding_id, formal_recipient_name, informal_greeting, invitation_type, rsvp_deadline, status, template:invitation_templates(id, name, style_preset, header_text, body_text, closing_text, footer_text, rsvp_button_label, image_url, theme_config)")
        .eq("id", accessToken.invitation_id)
        .maybeSingle(),
      supabase
        .from("weddings")
        .select("id, partner_one_name, partner_two_name, title, wedding_date, dress_code, welcome_message, contact_information, parking_notes, accessibility_notes, children_policy, plus_one_policy")
        .eq("id", accessToken.wedding_id)
        .maybeSingle(),
      supabase
        .from("guest_portal_settings")
        .select("portal_enabled, show_countdown, show_travel, show_updates, show_contact_details, custom_guest_message, portal_closes_at")
        .eq("wedding_id", accessToken.wedding_id)
        .maybeSingle(),
    ]);

    if (invitationError || weddingError || !invitation || !wedding) {
      await logSecurity("invitation_data_missing", {}, accessToken.wedding_id, accessToken.invitation_id);
      return reply(req, { valid: false, reason: "invalid_link" });
    }
    if (["cancelled", "archived"].includes(invitation.status)) {
      return reply(req, { valid: false, reason: "cancelled" });
    }
    if (portalSettings?.portal_enabled === false) {
      return reply(req, { valid: false, reason: "portal_disabled" });
    }
    if (portalSettings?.portal_closes_at && new Date(portalSettings.portal_closes_at) <= new Date()) {
      return reply(req, { valid: false, reason: "portal_closed" });
    }

    const { data: recipientRows, error: recipientError } = await supabase
      .from("invitation_recipients")
      .select("guest_id, recipient_role, ceremony_included, reception_included, evening_included, welcome_event_included, day_after_event_included, plus_one_allowed, guest:guests(id, full_name, preferred_name)")
      .eq("invitation_id", invitation.id);
    if (recipientError) throw recipientError;
    if (!recipientRows || recipientRows.length === 0) {
      return reply(req, { valid: false, reason: "invalid_link" });
    }

    const recipients = recipientRows.map((row) => {
      const guest = Array.isArray(row.guest) ? row.guest[0] : row.guest;
      return {
        guest_id: row.guest_id,
        guest_name: guest?.full_name || "Guest",
        preferred_name: guest?.preferred_name || null,
        recipient_role: row.recipient_role,
        ceremony_included: row.ceremony_included,
        reception_included: row.reception_included,
        evening_included: row.evening_included,
        welcome_event_included: row.welcome_event_included,
        day_after_event_included: row.day_after_event_included,
        plus_one_allowed: row.plus_one_allowed,
      } as Record<string, unknown>;
    });

    const { data: eventRows } = await supabase
      .from("wedding_events")
      .select("id, event_type, name, description, start_at, end_at, dress_code, arrival_notes, visibility, reveal_at, status, venue:wedding_venues(id, name, address_line_1, city, postcode, country)")
      .eq("wedding_id", accessToken.wedding_id)
      .neq("status", "archived")
      .order("start_at", { ascending: true, nullsFirst: false });

    const events = (eventRows || []).filter((event) => visibleEvent(event as Record<string, unknown>, recipients));

    const rawSessionSecret = randomSecret();
    const sessionHash = await sha256(rawSessionSecret);
    const tokenExpiry = accessToken.expires_at ? new Date(accessToken.expires_at).getTime() : Number.POSITIVE_INFINITY;
    const normalExpiry = Date.now() + SESSION_DURATION_DAYS * 86_400_000;
    const expiresAt = new Date(Math.min(tokenExpiry, normalExpiry)).toISOString();
    const now = new Date().toISOString();

    const { data: session, error: sessionError } = await supabase
      .from("guest_access_sessions")
      .insert({
        wedding_id: accessToken.wedding_id,
        invitation_id: accessToken.invitation_id,
        access_token_id: accessToken.id,
        session_hash: sessionHash,
        status: "active",
        created_at: now,
        last_seen_at: now,
        expires_at: expiresAt,
      })
      .select("id")
      .single();
    if (sessionError || !session) throw sessionError || new Error("Session creation failed");

    await Promise.all([
      supabase.from("invitation_access_tokens").update({ last_used_at: now }).eq("id", accessToken.id),
      supabase.from("invitation_access_activity").insert({
        wedding_id: accessToken.wedding_id,
        invitation_id: accessToken.invitation_id,
        access_token_id: accessToken.id,
        actor_type: "guest",
        event_type: "access_granted",
        summary: "Invitation token validated",
        security_metadata: { fingerprint_hash: fp },
      }),
      supabase.from("guest_portal_activity").insert({
        wedding_id: accessToken.wedding_id,
        invitation_id: accessToken.invitation_id,
        session_id: session.id,
        actor_type: "guest",
        event_type: "session_created",
        summary: "Guest portal session created",
        metadata: { fingerprint_hash: fp },
      }),
    ]);

    return reply(req, {
      valid: true,
      session_id: rawSessionSecret,
      data: {
        wedding,
        invitation,
        recipients,
        events,
        portal_settings: portalSettings || null,
      },
    });
  } catch (error) {
    console.error("validate-invitation failed", error instanceof Error ? error.message : String(error));
    await logSecurity("function_error", { message: error instanceof Error ? error.message.slice(0, 300) : "unknown" });
    return reply(req, { valid: false, reason: "unavailable" }, 503);
  }
});
