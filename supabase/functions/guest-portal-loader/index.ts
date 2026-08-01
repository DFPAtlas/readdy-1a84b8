import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

function allowedOrigins(): string[] {
  return (Deno.env.get("ALLOWED_ORIGINS") || "https://wedora.uk,https://www.wedora.uk,http://localhost:5173")
    .split(",").map((value) => value.trim()).filter(Boolean);
}

function headers(req: Request): Record<string, string> {
  const origin = req.headers.get("origin");
  const allowed = allowedOrigins();
  return {
    "Access-Control-Allow-Origin": origin && allowed.includes(origin) ? origin : allowed[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Cache-Control": "private, no-store, no-cache, max-age=0",
    "Content-Type": "application/json",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "Vary": "Origin",
  };
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function fingerprint(req: Request): Promise<string> {
  const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  return sha256(`${ip}:${(req.headers.get("user-agent") || "unknown").slice(0, 180)}`);
}

function reply(req: Request, body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: headers(req) });
}

function eventFlag(eventType: string): string | null {
  return ({
    ceremony: "ceremony_included",
    reception: "reception_included",
    evening: "evening_included",
    welcome: "welcome_event_included",
    day_after: "day_after_event_included",
    farewell: "day_after_event_included",
  } as Record<string, string>)[eventType] || null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: headers(req) });
  if (req.method !== "POST") return reply(req, { valid: false, error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return reply(req, { valid: false, error: "unavailable" }, 503);

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const fp = await fingerprint(req);

  try {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return reply(req, { valid: false, error: "session_invalid" });
    }

    const rawSession = typeof body.session_hash === "string" ? body.session_hash.trim() : "";
    if (rawSession.length < 32 || rawSession.length > 512) {
      await supabase.from("guest_access_security_events").insert({
        fingerprint_hash: fp,
        event_type: "invalid_session_format",
        source: "guest_portal_loader",
        metadata: { length: rawSession.length },
      });
      return reply(req, { valid: false, error: "session_invalid" });
    }

    const sessionHash = await sha256(rawSession);
    const { data: session, error: sessionError } = await supabase
      .from("guest_access_sessions")
      .select("id, wedding_id, invitation_id, access_token_id, status, expires_at, last_seen_at, access_token:invitation_access_tokens(id, status, expires_at)")
      .eq("session_hash", sessionHash)
      .eq("status", "active")
      .maybeSingle();

    if (sessionError || !session) {
      await supabase.from("guest_access_security_events").insert({
        fingerprint_hash: fp,
        event_type: "session_not_found",
        source: "guest_portal_loader",
      });
      return reply(req, { valid: false, error: "session_invalid" });
    }

    const accessToken = Array.isArray(session.access_token) ? session.access_token[0] : session.access_token;
    const now = new Date();
    if (session.expires_at && new Date(session.expires_at) <= now) {
      await supabase.from("guest_access_sessions").update({ status: "expired", ended_at: now.toISOString() }).eq("id", session.id);
      return reply(req, { valid: false, error: "session_expired" });
    }
    if (!accessToken || accessToken.status !== "active" || (accessToken.expires_at && new Date(accessToken.expires_at) <= now)) {
      await supabase.from("guest_access_sessions").update({ status: "ended", ended_at: now.toISOString() }).eq("id", session.id);
      return reply(req, { valid: false, error: "session_invalid" });
    }

    const [weddingResult, invitationResult, settingsResult, recipientsResult] = await Promise.all([
      supabase.from("weddings")
        .select("id, partner_one_name, partner_two_name, title, wedding_date, dress_code, welcome_message, contact_information, parking_notes, accessibility_notes, children_policy, plus_one_policy, timezone, slug, hero_image_url")
        .eq("id", session.wedding_id).maybeSingle(),
      supabase.from("invitations")
        .select("id, formal_recipient_name, informal_greeting, invitation_type, rsvp_deadline, status, delivery_status, sent_at, template:invitation_templates(id, name, style_preset, header_text, body_text, closing_text, footer_text, rsvp_button_label, image_url, theme_config)")
        .eq("id", session.invitation_id).maybeSingle(),
      supabase.from("guest_portal_settings").select("*").eq("wedding_id", session.wedding_id).maybeSingle(),
      supabase.from("invitation_recipients")
        .select("guest_id, recipient_role, ceremony_included, reception_included, evening_included, welcome_event_included, day_after_event_included, plus_one_allowed, child_invitation_notes, guest:guests(id, full_name, preferred_name, household_id, plus_one_allowed, plus_one_name, plus_one_status, named_plus_one_guest_id, approved_additional_children, age_band, child_notes)")
        .eq("invitation_id", session.invitation_id),
    ]);

    const wedding = weddingResult.data;
    const invitation = invitationResult.data;
    const portalSettings = settingsResult.data;
    if (!wedding || !invitation || ["cancelled", "archived"].includes(invitation.status)) {
      return reply(req, { valid: false, error: "session_invalid" });
    }
    if (portalSettings?.portal_enabled === false) return reply(req, { valid: false, error: "portal_disabled" });
    if (portalSettings?.portal_closes_at && new Date(portalSettings.portal_closes_at) <= now) {
      return reply(req, { valid: false, error: "portal_closed" });
    }

    const recipients = (recipientsResult.data || []).map((row) => {
      const guest = Array.isArray(row.guest) ? row.guest[0] : row.guest;
      return {
        guest_id: row.guest_id,
        guest_name: guest?.full_name || "Guest",
        preferred_name: guest?.preferred_name || null,
        household_id: guest?.household_id || null,
        recipient_role: row.recipient_role,
        ceremony_included: row.ceremony_included,
        reception_included: row.reception_included,
        evening_included: row.evening_included,
        welcome_event_included: row.welcome_event_included,
        day_after_event_included: row.day_after_event_included,
        plus_one_allowed: row.plus_one_allowed,
        plus_one_name: guest?.plus_one_name || null,
        plus_one_status: guest?.plus_one_status || null,
        named_plus_one_guest_id: guest?.named_plus_one_guest_id || null,
        approved_additional_children: guest?.approved_additional_children || 0,
        age_band: guest?.age_band || null,
        child_notes: guest?.child_notes || row.child_invitation_notes || null,
      };
    });
    const guestIds = recipients.map((recipient) => recipient.guest_id);
    const householdIds = recipients.map((recipient) => recipient.household_id).filter(Boolean) as string[];

    const { data: eventRows } = await supabase.from("wedding_events")
      .select("id, wedding_id, venue_id, name, event_type, event_date, start_time, end_time, description, guest_description, start_at, end_at, visibility, reveal_at, dress_code, arrival_notes, arrival_offset_minutes, parking_notes, transport_notes, accessibility_notes, children_notes, status, published_at, venue:wedding_venues(id, name, address_line_1, address_line_2, city, county_or_region, postcode, country, latitude, longitude)")
      .eq("wedding_id", session.wedding_id)
      .neq("status", "archived")
      .order("start_at", { ascending: true, nullsFirst: false });

    const eventIds = (eventRows || []).map((event) => event.id);
    const { data: audienceRows } = eventIds.length
      ? await supabase.from("wedding_event_audiences").select("event_id, audience_type, audience_reference_id").in("event_id", eventIds)
      : { data: [] as Array<{ event_id: string; audience_type: string; audience_reference_id: string | null }> };

    const audiences = new Map<string, Array<{ audience_type: string; audience_reference_id: string | null }>>();
    for (const row of audienceRows || []) {
      const current = audiences.get(row.event_id) || [];
      current.push(row);
      audiences.set(row.event_id, current);
    }

    const events = (eventRows || []).filter((event) => {
      if (event.visibility === "hidden") return false;
      if (event.visibility === "reveal_on_date" && event.reveal_at && now < new Date(event.reveal_at)) return false;
      if (event.visibility === "included_guests") {
        const flag = eventFlag(event.event_type);
        if (flag && !recipients.some((recipient) => (recipient as Record<string, unknown>)[flag] === true)) return false;
      }
      const rules = audiences.get(event.id) || [];
      if (rules.length === 0) return true;
      return rules.some((rule) => {
        if (["all", "public"].includes(rule.audience_type)) return true;
        if (rule.audience_type === "invitation") return rule.audience_reference_id === session.invitation_id;
        if (rule.audience_type === "guest") return !!rule.audience_reference_id && guestIds.includes(rule.audience_reference_id);
        if (rule.audience_type === "household") return !!rule.audience_reference_id && householdIds.includes(rule.audience_reference_id);
        return false;
      });
    });

    const { data: responseRows } = guestIds.length
      ? await supabase.from("rsvp_responses").select("*").eq("invitation_id", session.invitation_id).in("guest_id", guestIds)
      : { data: [] as Array<Record<string, unknown>> };
    const responseIds = (responseRows || []).map((response) => response.id as string);
    const [{ data: answerRows }, { data: eventResponseRows }, { data: submission }] = await Promise.all([
      responseIds.length
        ? supabase.from("rsvp_custom_answers").select("response_id, question_key, question_label, answer, answer_type").in("response_id", responseIds)
        : Promise.resolve({ data: [] }),
      guestIds.length
        ? supabase.from("rsvp_event_responses").select("id, guest_id, event_id, attendance_status, meal_option_id, created_at, updated_at").eq("invitation_id", session.invitation_id).in("guest_id", guestIds)
        : Promise.resolve({ data: [] }),
      supabase.from("rsvp_submissions").select("id, status, revision, is_late, started_at, submitted_at, created_at, updated_at")
        .eq("invitation_id", session.invitation_id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);

    const rsvpResponses: Record<string, unknown> = {};
    for (const response of responseRows || []) {
      rsvpResponses[String(response.guest_id)] = {
        ...response,
        custom_answers: (answerRows || []).filter((answer) => answer.response_id === response.id),
        event_responses: (eventResponseRows || []).filter((eventResponse) => eventResponse.guest_id === response.guest_id),
      };
    }

    const nowIso = now.toISOString();
    const { data: updateRows } = await supabase.from("wedding_updates")
      .select("id, title, body, update_type, status, is_pinned, publish_at, published_at, expires_at, created_at, updated_at")
      .eq("wedding_id", session.wedding_id)
      .eq("status", "published")
      .or(`publish_at.is.null,publish_at.lte.${nowIso}`)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

    const updates = (updateRows || [])
      .filter((update) => !update.expires_at || new Date(update.expires_at) > now)
      .map((update) => ({
        id: update.id,
        title: update.title,
        content: update.body,
        body: update.body,
        category: update.update_type,
        update_type: update.update_type,
        update_date: update.published_at || update.publish_at || update.created_at,
        created_at: update.created_at,
        is_important: update.is_pinned,
        is_pinned: update.is_pinned,
        priority: update.is_pinned ? "important" : "standard",
        summary: update.body.length > 180 ? `${update.body.slice(0, 177)}...` : update.body,
        is_read: false,
        is_saved: false,
      }));

    const { data: venueRows } = await supabase.from("wedding_venues")
      .select("id, name, venue_type, address_line_1, address_line_2, city, county_or_region, postcode, country, latitude, longitude")
      .eq("wedding_id", session.wedding_id).order("sort_order");

    let seating: Record<string, unknown> | null = null;
    if (portalSettings?.seating_enabled && (!portalSettings.seating_reveal_at || now >= new Date(portalSettings.seating_reveal_at))) {
      const { data: publication } = await supabase.from("seating_publications")
        .select("id, seating_plan_id, linked_event_id, publication_revision, published_at")
        .eq("wedding_id", session.wedding_id).eq("status", "published").is("disabled_at", null)
        .order("published_at", { ascending: false }).limit(1).maybeSingle();
      if (publication && guestIds.length) {
        const { data: assignment } = await supabase.from("seating_assignments")
          .select("guest_id, table_id, seating_seat_id, seat_label")
          .eq("plan_id", publication.seating_plan_id).in("guest_id", guestIds).limit(1).maybeSingle();
        if (assignment) {
          const [{ data: table }, { data: seat }] = await Promise.all([
            supabase.from("seating_tables").select("id, name, table_number, shape").eq("id", assignment.table_id).maybeSingle(),
            assignment.seating_seat_id
              ? supabase.from("seating_seats").select("id, seat_label, seat_number").eq("id", assignment.seating_seat_id).maybeSingle()
              : Promise.resolve({ data: null }),
          ]);
          seating = { publication, assignment, table, seat };
        }
      }
    }

    const safeSettings = portalSettings ? {
      ...portalSettings,
      show_settings: portalSettings.settings_enabled,
      sms_configured: false,
    } : null;

    await Promise.all([
      supabase.from("guest_access_sessions").update({ last_seen_at: nowIso }).eq("id", session.id),
      supabase.from("guest_portal_activity").insert({
        wedding_id: session.wedding_id,
        invitation_id: session.invitation_id,
        session_id: session.id,
        actor_type: "guest",
        event_type: "portal_loaded",
        summary: "Guest portal data loaded",
        metadata: { fingerprint_hash: fp },
      }),
    ]);

    return reply(req, {
      valid: true,
      wedding_id: session.wedding_id,
      data: {
        wedding,
        invitation,
        recipients,
        events,
        portal_settings: safeSettings,
        rsvp_responses: rsvpResponses,
        rsvp_submission: submission || null,
        seating,
        updates: { items: updates, unread_count: updates.length },
        wedding_venues: venueRows || [],
        registry: null,
        gift_funds: null,
        gallery: null,
        questions: null,
        contacts: null,
        settings: null,
        local_places: [],
        accommodation_plans: [],
        travel_plans: [],
        saved_locations: [],
        shuttles: [],
        shuttle_requests: [],
        location_event_links: [],
        travel_updates: [],
      },
    });
  } catch (error) {
    console.error("guest-portal-loader failed", error instanceof Error ? error.message : String(error));
    return reply(req, { valid: false, error: "unavailable" }, 503);
  }
});
