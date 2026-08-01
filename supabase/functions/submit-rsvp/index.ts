import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const MAX_REQUESTS_PER_MINUTE = 12;
const VALID_STATUSES = new Set(["attending", "not_attending", "maybe", "pending"]);
const EVENT_FLAGS: Record<string, string> = {
  ceremony_attending: "ceremony_included",
  reception_attending: "reception_included",
  evening_attending: "evening_included",
  welcome_attending: "welcome_event_included",
  day_after_attending: "day_after_event_included",
};

function allowedOrigins(): string[] {
  return (Deno.env.get("ALLOWED_ORIGINS") || "https://wedora.uk,https://www.wedora.uk,http://localhost:5173")
    .split(",").map((value) => value.trim()).filter(Boolean);
}

function headers(req: Request): Record<string, string> {
  const origin = req.headers.get("origin");
  const allowed = allowedOrigins();
  return {
    "Access-Control-Allow-Origin": origin && allowed.includes(origin) ? origin : allowed[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-idempotency-key",
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

function text(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned ? cleaned.slice(0, max) : null;
}

function boolean(value: unknown): boolean {
  return value === true;
}

function safeObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: headers(req) });
  if (req.method !== "POST") return reply(req, { success: false, error: "Method not allowed." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return reply(req, { success: false, error: "Service unavailable." }, 503);

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const fp = await fingerprint(req);

  try {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return reply(req, { success: false, error: "Invalid request." }, 400);
    }

    const rawSession = typeof body.session_hash === "string" ? body.session_hash.trim() : "";
    const guestResponses = safeObject(body.guest_responses);
    const saveDraft = body.save_draft === true;
    if (rawSession.length < 32 || rawSession.length > 512 || Object.keys(guestResponses).length === 0 || Object.keys(guestResponses).length > 50) {
      return reply(req, { success: false, error: "Invalid RSVP request." }, 400);
    }

    const minuteAgo = new Date(Date.now() - 60_000).toISOString();
    const { count: recentRequests } = await supabase.from("guest_access_security_events")
      .select("id", { head: true, count: "exact" })
      .eq("fingerprint_hash", fp).eq("event_type", "rsvp_request").gte("created_at", minuteAgo);
    if ((recentRequests || 0) >= MAX_REQUESTS_PER_MINUTE) {
      return reply(req, { success: false, error: "Too many requests. Please wait a moment and try again." }, 429);
    }
    await supabase.from("guest_access_security_events").insert({
      fingerprint_hash: fp,
      event_type: "rsvp_request",
      source: "submit_rsvp",
      metadata: { guest_count: Object.keys(guestResponses).length, save_draft: saveDraft },
    });

    const sessionHash = await sha256(rawSession);
    const { data: session, error: sessionError } = await supabase.from("guest_access_sessions")
      .select("id, wedding_id, invitation_id, access_token_id, status, expires_at, access_token:invitation_access_tokens(id, status, expires_at)")
      .eq("session_hash", sessionHash).eq("status", "active").maybeSingle();
    if (sessionError || !session) {
      return reply(req, { success: false, error: "Your session has expired. Please use your invitation link again." }, 401);
    }

    const now = new Date();
    const accessToken = Array.isArray(session.access_token) ? session.access_token[0] : session.access_token;
    if ((session.expires_at && new Date(session.expires_at) <= now) || !accessToken || accessToken.status !== "active" ||
      (accessToken.expires_at && new Date(accessToken.expires_at) <= now)) {
      await supabase.from("guest_access_sessions").update({ status: "expired", ended_at: now.toISOString() }).eq("id", session.id);
      return reply(req, { success: false, error: "Your session has expired. Please use your invitation link again." }, 401);
    }

    const [{ data: invitation }, { data: settings }, { data: recipientRows }] = await Promise.all([
      supabase.from("invitations").select("id, wedding_id, rsvp_deadline, status").eq("id", session.invitation_id).maybeSingle(),
      supabase.from("guest_portal_settings")
        .select("rsvp_enabled, household_rsvp_enabled, require_meal_choices, meal_options, allow_late_rsvp, allow_rsvp_updates, rsvp_questions_locked_after")
        .eq("wedding_id", session.wedding_id).maybeSingle(),
      supabase.from("invitation_recipients")
        .select("guest_id, recipient_role, ceremony_included, reception_included, evening_included, welcome_event_included, day_after_event_included, plus_one_allowed")
        .eq("invitation_id", session.invitation_id),
    ]);

    if (!invitation || invitation.wedding_id !== session.wedding_id || ["cancelled", "archived"].includes(invitation.status)) {
      return reply(req, { success: false, error: "This invitation is no longer available." }, 400);
    }
    if (!settings?.rsvp_enabled) return reply(req, { success: false, error: "RSVPs are not currently open." }, 400);

    const guestIds = Object.keys(guestResponses);
    if (guestIds.length > 1 && !settings.household_rsvp_enabled) {
      return reply(req, { success: false, error: "Household RSVP is not enabled for this wedding." }, 400);
    }

    const recipientMap = new Map<string, Record<string, unknown>>();
    for (const recipient of recipientRows || []) recipientMap.set(recipient.guest_id, recipient as Record<string, unknown>);
    if (guestIds.some((guestId) => !recipientMap.has(guestId))) {
      return reply(req, { success: false, error: "A guest is not authorised for this invitation." }, 403);
    }

    const { data: guestRows } = await supabase.from("guests")
      .select("id, wedding_id, household_id, full_name, plus_one_status, plus_one_allowed, approved_additional_children")
      .in("id", guestIds).eq("wedding_id", session.wedding_id);
    const guestMap = new Map<string, Record<string, unknown>>();
    for (const guest of guestRows || []) guestMap.set(guest.id, guest as Record<string, unknown>);
    if (guestMap.size !== guestIds.length) return reply(req, { success: false, error: "Guest details could not be verified." }, 403);

    let isLate = false;
    if (!saveDraft && invitation.rsvp_deadline) {
      const deadline = new Date(`${invitation.rsvp_deadline}T23:59:59.999`);
      if (now > deadline) {
        isLate = true;
        if (!settings.allow_late_rsvp) {
          return reply(req, { success: false, error: "The RSVP deadline has passed. Please contact the couple directly." }, 400);
        }
      }
    }

    const submittingGuestId = guestIds[0];
    const { data: latestSubmission } = await supabase.from("rsvp_submissions")
      .select("id, status, revision, submitted_at, created_at")
      .eq("invitation_id", session.invitation_id)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    const hasSubmittedBefore = !!latestSubmission && ["submitted", "updated"].includes(latestSubmission.status);
    if (!saveDraft && hasSubmittedBefore && !settings.allow_rsvp_updates) {
      return reply(req, { success: false, error: "RSVP updates are no longer allowed. Please contact the couple directly." }, 400);
    }

    const suppliedKey = text(body.idempotency_key, 200) || text(req.headers.get("x-idempotency-key"), 200);
    const derivedKey = suppliedKey || await sha256(JSON.stringify({ invitation: session.invitation_id, guestResponses, saveDraft }));
    const idempotencyKeyHash = await sha256(`${session.invitation_id}:${derivedKey}`);
    if (!saveDraft) {
      const { data: previous } = await supabase.from("rsvp_submissions")
        .select("id, status, is_late, revision")
        .eq("invitation_id", session.invitation_id)
        .eq("idempotency_key_hash", idempotencyKeyHash)
        .maybeSingle();
      if (previous) {
        return reply(req, {
          success: true,
          message: "Your RSVP has already been received.",
          submission_id: previous.id,
          is_update: previous.status === "updated",
          is_late: previous.is_late,
          idempotent_replay: true,
        });
      }
    }

    const eventIds = new Set<string>();
    for (const [guestId, rawResponse] of Object.entries(guestResponses)) {
      const response = safeObject(rawResponse);
      const recipient = recipientMap.get(guestId)!;
      const guest = guestMap.get(guestId)!;
      const status = typeof response.response_status === "string" ? response.response_status : "";
      if (!VALID_STATUSES.has(status)) return reply(req, { success: false, error: "Invalid response status." }, 400);

      for (const [responseField, recipientField] of Object.entries(EVENT_FLAGS)) {
        if (boolean(response[responseField]) && recipient[recipientField] !== true) {
          return reply(req, { success: false, error: "You are not invited to one of the selected events." }, 400);
        }
      }
      if (!saveDraft && status === "attending") {
        const selected = Object.keys(EVENT_FLAGS).some((field) => boolean(response[field]));
        const customSelected = Array.isArray(response.event_responses) && response.event_responses.some((item) => safeObject(item).attendance_status === "attending");
        if (!selected && !customSelected) {
          return reply(req, { success: false, error: `Please select at least one event for ${guest.full_name || "this guest"}.` }, 400);
        }
      }

      if (boolean(response.plus_one_confirmed)) {
        if (recipient.plus_one_allowed !== true && guest.plus_one_allowed !== true) {
          return reply(req, { success: false, error: "A plus-one has not been approved for this invitation." }, 400);
        }
        if (guest.plus_one_status === "approved_unnamed" && !text(response.plus_one_name, 200)) {
          return reply(req, { success: false, error: "Please provide your plus-one's name." }, 400);
        }
      }

      const childCount = Number.isInteger(response.children_attending_count) ? Number(response.children_attending_count) : 0;
      if (childCount < 0 || childCount > Number(guest.approved_additional_children || 0)) {
        return reply(req, { success: false, error: "The number of attending children exceeds the approved allowance." }, 400);
      }

      const mealChoice = text(response.meal_choice, 200);
      if (!saveDraft && status === "attending" && settings.require_meal_choices) {
        if (!mealChoice) return reply(req, { success: false, error: "Please select a meal choice." }, 400);
        const options = Array.isArray(settings.meal_options) ? settings.meal_options as string[] : [];
        if (options.length && !options.includes(mealChoice)) return reply(req, { success: false, error: "Please select a valid meal option." }, 400);
      }

      const customAnswers = Array.isArray(response.custom_answers) ? response.custom_answers : [];
      if (customAnswers.length > 30) return reply(req, { success: false, error: "Too many custom answers were submitted." }, 400);
      const eventResponses = Array.isArray(response.event_responses) ? response.event_responses : [];
      if (eventResponses.length > 30) return reply(req, { success: false, error: "Too many event responses were submitted." }, 400);
      for (const rawEvent of eventResponses) {
        const event = safeObject(rawEvent);
        if (typeof event.event_id === "string") eventIds.add(event.event_id);
        if (!VALID_STATUSES.has(String(event.attendance_status || ""))) {
          return reply(req, { success: false, error: "Invalid event response." }, 400);
        }
      }
    }

    if (eventIds.size) {
      const { data: validEvents } = await supabase.from("wedding_events").select("id").eq("wedding_id", session.wedding_id).in("id", [...eventIds]);
      if ((validEvents || []).length !== eventIds.size) return reply(req, { success: false, error: "An event could not be verified." }, 400);
    }

    const nextRevision = (latestSubmission?.revision || 0) + (saveDraft && latestSubmission?.status === "draft" ? 0 : 1);
    let submissionId: string;
    let isUpdate = hasSubmittedBefore;

    if (saveDraft && latestSubmission?.status === "draft") {
      const { data: updated, error } = await supabase.from("rsvp_submissions").update({
        revision: Math.max(1, nextRevision),
        is_late: false,
        updated_at: now.toISOString(),
      }).eq("id", latestSubmission.id).select("id").single();
      if (error || !updated) throw error || new Error("Draft update failed");
      submissionId = updated.id;
      isUpdate = false;
    } else {
      const { data: inserted, error } = await supabase.from("rsvp_submissions").insert({
        wedding_id: session.wedding_id,
        invitation_id: session.invitation_id,
        submitted_by_guest_id: submittingGuestId,
        status: saveDraft ? "draft" : (hasSubmittedBefore ? "updated" : "submitted"),
        revision: Math.max(1, nextRevision),
        is_late: isLate,
        started_at: now.toISOString(),
        submitted_at: saveDraft ? null : now.toISOString(),
        idempotency_key_hash: saveDraft ? null : idempotencyKeyHash,
      }).select("id").single();
      if (error || !inserted) throw error || new Error("Submission insert failed");
      submissionId = inserted.id;
    }

    const responseIds: Record<string, string> = {};
    const snapshot: Record<string, unknown> = {};

    for (const [guestId, rawResponse] of Object.entries(guestResponses)) {
      const response = safeObject(rawResponse);
      const guest = guestMap.get(guestId)!;
      const structuredDietary = safeObject(response.structured_dietary);
      const structuredAccessibility = safeObject(response.structured_accessibility);
      const responsePayload = {
        wedding_id: session.wedding_id,
        invitation_id: session.invitation_id,
        guest_id: guestId,
        household_id: guest.household_id || null,
        submission_id: submissionId,
        response_status: response.response_status,
        ceremony_attending: boolean(response.ceremony_attending),
        reception_attending: boolean(response.reception_attending),
        evening_attending: boolean(response.evening_attending),
        welcome_attending: boolean(response.welcome_attending),
        day_after_attending: boolean(response.day_after_attending),
        plus_one_confirmed: boolean(response.plus_one_confirmed),
        plus_one_name: text(response.plus_one_name, 200),
        children_attending_count: Number.isInteger(response.children_attending_count) ? Number(response.children_attending_count) : 0,
        children_names: text(response.children_names, 500),
        meal_choice: text(response.meal_choice, 200),
        dietary_requirements: text(response.dietary_requirements, 2000),
        allergy_notes: text(response.allergy_notes, 2000),
        accessibility_notes: text(response.accessibility_notes, 2000),
        structured_dietary: Object.keys(structuredDietary).length ? structuredDietary : null,
        structured_accessibility: Object.keys(structuredAccessibility).length ? structuredAccessibility : null,
        transport_status: text(response.transport_status, 100),
        accommodation_status: text(response.accommodation_status, 100),
        song_request: text(response.song_request, 500),
        message_to_couple: text(response.message_to_couple, 3000),
        submitted_by: submittingGuestId,
        is_draft: saveDraft,
        submitted_at: saveDraft ? null : now.toISOString(),
        updated_at: now.toISOString(),
      };

      const { data: savedResponse, error: responseError } = await supabase.from("rsvp_responses")
        .upsert(responsePayload, { onConflict: "wedding_id,invitation_id,guest_id" })
        .select("id").single();
      if (responseError || !savedResponse) throw responseError || new Error("RSVP response save failed");
      responseIds[guestId] = savedResponse.id;

      await supabase.from("rsvp_custom_answers").delete().eq("response_id", savedResponse.id);
      const customAnswers = (Array.isArray(response.custom_answers) ? response.custom_answers : [])
        .map((rawAnswer) => safeObject(rawAnswer))
        .map((answer) => ({
          wedding_id: session.wedding_id,
          response_id: savedResponse.id,
          guest_id: guestId,
          question_key: text(answer.question_key, 150),
          question_label: text(answer.question_label, 300),
          answer: text(answer.answer, 2000),
          answer_type: text(answer.answer_type, 50) || "text",
          updated_at: now.toISOString(),
        }))
        .filter((answer) => answer.question_key && answer.question_label && answer.answer);
      if (customAnswers.length) {
        const { error } = await supabase.from("rsvp_custom_answers").insert(customAnswers);
        if (error) throw error;
      }

      await supabase.from("rsvp_event_responses").delete().eq("invitation_id", session.invitation_id).eq("guest_id", guestId);
      const eventResponses = (Array.isArray(response.event_responses) ? response.event_responses : [])
        .map((rawEvent) => safeObject(rawEvent))
        .filter((event) => typeof event.event_id === "string")
        .map((event) => ({
          wedding_id: session.wedding_id,
          invitation_id: session.invitation_id,
          submission_id: submissionId,
          guest_id: guestId,
          event_id: event.event_id,
          attendance_status: event.attendance_status,
          meal_option_id: text(event.meal_option_id, 150),
          updated_at: now.toISOString(),
        }));
      if (eventResponses.length) {
        const { error } = await supabase.from("rsvp_event_responses").insert(eventResponses);
        if (error) throw error;
      }

      if (!saveDraft) {
        const guestUpdate: Record<string, unknown> = {
          rsvp_status: response.response_status,
          updated_at: now.toISOString(),
        };
        if (boolean(response.plus_one_confirmed)) {
          guestUpdate.plus_one_name = text(response.plus_one_name, 200);
          guestUpdate.plus_one_status = "confirmed";
        }
        const { error } = await supabase.from("guests").update(guestUpdate).eq("id", guestId).eq("wedding_id", session.wedding_id);
        if (error) throw error;
      }

      snapshot[guestId] = {
        response_status: response.response_status,
        ceremony_attending: boolean(response.ceremony_attending),
        reception_attending: boolean(response.reception_attending),
        evening_attending: boolean(response.evening_attending),
        welcome_attending: boolean(response.welcome_attending),
        day_after_attending: boolean(response.day_after_attending),
        plus_one_confirmed: boolean(response.plus_one_confirmed),
        children_attending_count: responsePayload.children_attending_count,
        meal_choice: responsePayload.meal_choice,
        structured_dietary: responsePayload.structured_dietary,
        structured_accessibility: responsePayload.structured_accessibility,
      };
    }

    if (!saveDraft) {
      const { error } = await supabase.from("rsvp_response_revisions").insert({
        wedding_id: session.wedding_id,
        invitation_id: session.invitation_id,
        submission_id: submissionId,
        revision_number: Math.max(1, nextRevision),
        snapshot_data: snapshot,
        change_summary: isUpdate ? "RSVP response updated" : "RSVP response submitted",
      });
      if (error) throw error;
    }

    await Promise.all([
      supabase.from("guest_access_sessions").update({ last_seen_at: now.toISOString() }).eq("id", session.id),
      supabase.from("guest_portal_activity").insert({
        wedding_id: session.wedding_id,
        invitation_id: session.invitation_id,
        session_id: session.id,
        guest_id: submittingGuestId,
        actor_type: "guest",
        event_type: saveDraft ? "rsvp_draft_saved" : (isUpdate ? "rsvp_updated" : "rsvp_submitted"),
        summary: saveDraft ? "RSVP draft saved" : (isUpdate ? "RSVP response updated" : "RSVP response submitted"),
        metadata: { fingerprint_hash: fp, revision: Math.max(1, nextRevision), is_late: isLate },
      }),
    ]);

    return reply(req, {
      success: true,
      message: saveDraft ? "Your draft has been saved." : (isUpdate ? "Your RSVP has been updated. Thank you!" : "Thank you! Your RSVP has been received."),
      submission_id: submissionId,
      is_update: isUpdate,
      is_late: isLate,
      response_ids: responseIds,
    });
  } catch (error) {
    console.error("submit-rsvp failed", error instanceof Error ? error.message : String(error));
    return reply(req, { success: false, error: "Something went wrong. Please try again." }, 500);
  }
});
