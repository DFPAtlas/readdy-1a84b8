import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// ── CORS allowlist (environment-driven) ──
// Replaces the previous wildcard. Configure additional origins with the
// GUEST_ALLOWED_ORIGINS env var (comma-separated); local development origins
// are included by default (or alongside an explicit list with ALLOW_LOCAL_ORIGINS=true).
const VOWORA_PRODUCTION_ORIGINS = ["https://vowora.uk", "https://www.vowora.uk"];
const GUEST_LOCAL_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
];

function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/+$/, "");
}

function allowedGuestOrigins(): string[] {
  const configured = (Deno.env.get("GUEST_ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map(normalizeOrigin)
    .filter(Boolean);
  const base = configured.length > 0 ? configured : [...VOWORA_PRODUCTION_ORIGINS];
  const includeLocal = configured.length === 0 || Deno.env.get("ALLOW_LOCAL_ORIGINS") === "true";
  return Array.from(new Set(includeLocal ? [...base, ...GUEST_LOCAL_ORIGINS] : base));
}

function buildCorsHeaders(req: Request): Record<string, string> {
  const requestOrigin = normalizeOrigin(req.headers.get("origin") ?? "");
  const allowed = allowedGuestOrigins();
  const allowOrigin = requestOrigin && allowed.includes(requestOrigin)
    ? requestOrigin
    : (allowed[0] ?? VOWORA_PRODUCTION_ORIGINS[0]);
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-idempotency-key",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Cache-Control": "private, no-store, no-cache, max-age=0",
    "Vary": "Origin",
  };
}

// ── Rate limiting ──
const RATE_WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10;
const rateStore = new Map<string, { count: number; resetAt: number }>();

function sha256(text: string): string {
  const data = new TextEncoder().encode(text);
  const hash = crypto.subtle.digestSync("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function buildFingerprint(req: Request): string {
  const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const ua = req.headers.get("user-agent") || "unknown";
  return sha256(`${ip}:${ua.slice(0, 64)}`);
}

function checkRateLimit(fp: string): boolean {
  const now = Date.now();
  const entry = rateStore.get(fp);
  if (!entry || now > entry.resetAt) {
    rateStore.set(fp, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_REQUESTS_PER_WINDOW) return false;
  entry.count++;
  return true;
}

// Clean up old rate entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of rateStore) { if (now > v.resetAt) rateStore.delete(k); }
}, 300_000);

interface RsvpEventPayload {
  event_id: string;
  attendance_status: 'attending' | 'not_attending' | 'maybe' | 'pending';
  meal_option_id?: string;
}

interface StructuredDietary {
  preference?: string | null;
  preference_other?: string | null;
  allergies?: string[];
  allergy_other?: string | null;
  allergy_severity?: string | null;
  cross_contamination_concern?: boolean;
  additional_notes?: string | null;
}

interface StructuredAccessibility {
  step_free_access?: boolean;
  wheelchair_space?: boolean;
  accessible_toilet?: boolean;
  carer_attending?: boolean;
  hearing_support?: boolean;
  visual_support?: boolean;
  quiet_area?: boolean;
  seating_support?: boolean;
  mobility_transport?: boolean;
  other_notes?: string | null;
}

interface GuestRsvpPayload {
  response_status: 'attending' | 'not_attending' | 'maybe' | 'pending';
  ceremony_attending?: boolean;
  reception_attending?: boolean;
  evening_attending?: boolean;
  welcome_attending?: boolean;
  day_after_attending?: boolean;
  event_responses?: RsvpEventPayload[];
  plus_one_confirmed?: boolean;
  plus_one_name?: string | null;
  children_attending_count?: number;
  children_names?: string | null;
  meal_choice?: string | null;
  dietary_requirements?: string | null;
  allergy_notes?: string | null;
  accessibility_notes?: string | null;
  structured_dietary?: StructuredDietary;
  structured_accessibility?: StructuredAccessibility;
  transport_status?: string | null;
  accommodation_status?: string | null;
  song_request?: string | null;
  message_to_couple?: string | null;
  custom_answers?: Array<{
    question_key: string;
    question_label: string;
    answer: string;
    answer_type: string;
  }>;
}

interface RsvpSubmissionPayload {
  session_hash: string;
  idempotency_key?: string;
  guest_responses: Record<string, GuestRsvpPayload>;
  save_draft?: boolean;
}

Deno.serve(async (req: Request) => {
  const corsHeaders = buildCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const fingerprint = buildFingerprint(req);
  if (!checkRateLimit(fingerprint)) {
    return new Response(
      JSON.stringify({ success: false, error: "Too many requests. Please wait a moment and try again." }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const supabaseUrl = (Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_PUBLIC_SUPABASE_URL"))!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body: RsvpSubmissionPayload = await req.json();
    const { session_hash, guest_responses, save_draft, idempotency_key } = body;

    // ── Validate session ──
    if (!session_hash || typeof session_hash !== "string" || session_hash.length < 32) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid session." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: session, error: sessionErr } = await supabase
      .from("guest_access_sessions")
      .select("*")
      .eq("session_hash", sha256(session_hash))
      .eq("status", "active")
      .maybeSingle();

    if (sessionErr || !session) {
      return new Response(
        JSON.stringify({ success: false, error: "Your session has expired. Please use your invitation link again." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (session.expires_at && new Date(session.expires_at) < new Date()) {
      await supabase.from("guest_access_sessions").update({ status: "expired", ended_at: new Date().toISOString() }).eq("id", session.id);
      return new Response(
        JSON.stringify({ success: false, error: "Your session has expired. Please use your invitation link again." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const weddingId = session.wedding_id;
    const invitationId = session.invitation_id;

    // ── Idempotency check ──
    if (idempotency_key && !save_draft) {
      const idempotencyHash = sha256(`${invitationId}:${idempotency_key}`);
      const { data: existingCheck } = await supabase
        .from("rsvp_submissions")
        .select("id, status")
        .eq("invitation_id", invitationId)
        .eq("status", "submitted")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingCheck) {
        // Idempotent — return existing result
        return new Response(
          JSON.stringify({
            success: true,
            message: "Your RSVP has already been received.",
            submission_id: existingCheck.id,
            is_update: false,
            is_late: false,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // ── Fetch invitation + portal settings ──
    const { data: invitation } = await supabase
      .from("invitations")
      .select("rsvp_deadline, status")
      .eq("id", invitationId)
      .maybeSingle();

    const { data: portalSettings } = await supabase
      .from("guest_portal_settings")
      .select("rsvp_enabled, household_rsvp_enabled, require_meal_choices, meal_options, allow_late_rsvp, allow_rsvp_updates, rsvp_questions_locked_after, dietary_options, allergy_labels")
      .eq("wedding_id", weddingId)
      .maybeSingle();

    if (!portalSettings?.rsvp_enabled) {
      return new Response(
        JSON.stringify({ success: false, error: "RSVPs are not currently open." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Check deadline ──
    let isLate = false;
    if (invitation?.rsvp_deadline && !save_draft) {
      const deadline = new Date(invitation.rsvp_deadline);
      deadline.setHours(23, 59, 59, 999);
      if (new Date() > deadline) {
        isLate = true;
        if (!portalSettings.allow_late_rsvp) {
          return new Response(
            JSON.stringify({ success: false, error: "The RSVP deadline has passed. Please contact the couple directly." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }
    }

    // ── Fetch recipients for this invitation ──
    const { data: recipients } = await supabase
      .from("invitation_recipients")
      .select("guest_id, recipient_role, ceremony_included, reception_included, evening_included, welcome_event_included, day_after_event_included, plus_one_allowed")
      .eq("invitation_id", invitationId);

    const recipientMap = new Map<string, Record<string, unknown>>();
    (recipients || []).forEach((r) => recipientMap.set(r.guest_id, r as unknown as Record<string, unknown>));

    // ── Fetch guests ──
    const guestIds = Object.keys(guest_responses);
    const { data: guests } = await supabase
      .from("guests")
      .select("id, full_name, plus_one_allowed, plus_one_status, named_plus_one_guest_id, approved_additional_children, age_band, household_id")
      .in("id", guestIds);

    const guestMap = new Map<string, Record<string, unknown>>();
    (guests || []).forEach((g) => guestMap.set(g.id, g as unknown as Record<string, unknown>));

    // ── Validate each guest belongs to this invitation ──
    for (const gId of guestIds) {
      if (!recipientMap.has(gId)) {
        return new Response(
          JSON.stringify({ success: false, error: `Guest is not authorised for this invitation.` }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // ── Validate per-guest data ──
    for (const [gId, rsvp] of Object.entries(guest_responses)) {
      const recipient = recipientMap.get(gId);
      const guest = guestMap.get(gId);
      if (!recipient || !guest) continue;

      const validStatuses = ["attending", "not_attending", "maybe", "pending"];
      if (!validStatuses.includes(rsvp.response_status)) {
        return new Response(
          JSON.stringify({ success: false, error: "Invalid response status." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Validate event access
      const eventFlags: Record<string, string> = {
        ceremony_attending: "ceremony_included",
        reception_attending: "reception_included",
        evening_attending: "evening_included",
        welcome_attending: "welcome_event_included",
        day_after_attending: "day_after_event_included",
      };

      for (const [flag, includedField] of Object.entries(eventFlags)) {
        if ((rsvp as Record<string, unknown>)[flag] === true && !recipient[includedField]) {
          return new Response(
            JSON.stringify({ success: false, error: `You are not invited to that event.` }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }

      // At least one event selected
      if (rsvp.response_status === "attending" && !save_draft) {
        const eventsSelected = Object.entries(eventFlags).some(([flag]) => {
          const val = (rsvp as Record<string, unknown>)[flag];
          return val === true && recipient[eventFlags[flag]] === true;
        });
        if (!eventsSelected) {
          return new Response(
            JSON.stringify({ success: false, error: `Please select at least one event for ${guest.full_name || "guest"}.` }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }

      // Plus-one validation
      if (rsvp.plus_one_confirmed) {
        if (!recipient.plus_one_allowed) {
          return new Response(
            JSON.stringify({ success: false, error: "A plus-one has not been approved for this invitation." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        if (guest.plus_one_status === "approved_unnamed" && !rsvp.plus_one_name?.trim()) {
          return new Response(
            JSON.stringify({ success: false, error: "Please provide your plus-one's name." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }

      // Children validation
      if (rsvp.children_attending_count && rsvp.children_attending_count > 0) {
        const maxChildren = (guest.approved_additional_children as number) || 0;
        if (rsvp.children_attending_count > maxChildren) {
          return new Response(
            JSON.stringify({ success: false, error: `A maximum of ${maxChildren} child${maxChildren === 1 ? "" : "ren"} has been approved.` }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }

      // Meal validation
      if (rsvp.response_status === "attending" && portalSettings.require_meal_choices && !save_draft) {
        if (!rsvp.meal_choice?.trim()) {
          return new Response(
            JSON.stringify({ success: false, error: `Please select a meal choice.` }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        const options: string[] = portalSettings.meal_options || [];
        if (options.length > 0 && !options.includes(rsvp.meal_choice)) {
          return new Response(
            JSON.stringify({ success: false, error: "Please select a valid meal option." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }
    }

    // ── Find or create submission ──
    const submittingGuestId = guestIds[0];

    const { data: existingSubmission } = await supabase
      .from("rsvp_submissions")
      .select("id, revision, status, submitted_at")
      .eq("invitation_id", invitationId)
      .eq("submitted_by_guest_id", submittingGuestId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let submissionId: string;
    let revisionNumber: number;
    const isResubmission = existingSubmission?.status === "submitted" && !save_draft;

    if (existingSubmission) {
      submissionId = existingSubmission.id;
      revisionNumber = (existingSubmission.revision || 1) + (save_draft ? 0 : 1);

      await supabase.from("rsvp_submissions")
        .update({
          status: save_draft ? "draft" : (isResubmission ? "updated" : "submitted"),
          revision: revisionNumber,
          is_late: isLate,
          submitted_at: save_draft ? existingSubmission.submitted_at : new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", submissionId);
    } else {
      const { data: newSub } = await supabase
        .from("rsvp_submissions")
        .insert({
          wedding_id: weddingId,
          invitation_id: invitationId,
          submitted_by_guest_id: submittingGuestId,
          status: save_draft ? "draft" : "submitted",
          revision: 1,
          is_late: isLate,
          started_at: new Date().toISOString(),
          submitted_at: save_draft ? null : new Date().toISOString(),
        })
        .select("id, revision")
        .single();

      if (!newSub) throw new Error("Failed to create submission");
      submissionId = newSub.id;
      revisionNumber = 1;
    }

    // ── Save revision snapshot ──
    if (!save_draft) {
      // Build safe snapshot (strip any raw tokens)
      const safeSnapshot: Record<string, unknown> = {};
      for (const [gId, gr] of Object.entries(guest_responses)) {
        safeSnapshot[gId] = {
          response_status: gr.response_status,
          events: { ceremony: gr.ceremony_attending, reception: gr.reception_attending, evening: gr.evening_attending, welcome: gr.welcome_attending, day_after: gr.day_after_attending },
          plus_one: gr.plus_one_confirmed ? (gr.plus_one_name || "confirmed") : "none",
          meal: gr.meal_choice || "none",
          dietary: gr.structured_dietary || { preference: gr.dietary_requirements },
          accessibility: gr.structured_accessibility || { notes: gr.accessibility_notes },
          transport: gr.transport_status || "unspecified",
          accommodation: gr.accommodation_status || "unspecified",
        };
      }
      await supabase.from("rsvp_response_revisions").insert({
        wedding_id: weddingId,
        invitation_id: invitationId,
        submission_id: submissionId,
        revision_number: revisionNumber,
        snapshot_data: safeSnapshot,
        change_summary: isResubmission ? "RSVP response updated" : "RSVP response submitted",
      });
    }

    // ── Upsert each guest's RSVP response ──
    const responseIds: Record<string, string> = {};
    for (const [gId, rsvp] of Object.entries(guest_responses)) {
      const { data: existingRes } = await supabase
        .from("rsvp_responses")
        .select("id, submitted_at, is_draft")
        .eq("wedding_id", weddingId)
        .eq("invitation_id", invitationId)
        .eq("guest_id", gId)
        .maybeSingle();

      const guest = guestMap.get(gId);
      const rsvpPayload = {
        wedding_id: weddingId,
        invitation_id: invitationId,
        guest_id: gId,
        household_id: guest?.household_id || null,
        submission_id: submissionId,
        response_status: rsvp.response_status,
        ceremony_attending: rsvp.ceremony_attending ?? false,
        reception_attending: rsvp.reception_attending ?? false,
        evening_attending: rsvp.evening_attending ?? false,
        welcome_attending: rsvp.welcome_attending ?? false,
        day_after_attending: rsvp.day_after_attending ?? false,
        plus_one_confirmed: rsvp.plus_one_confirmed ?? false,
        plus_one_name: rsvp.plus_one_name || null,
        children_attending_count: rsvp.children_attending_count ?? 0,
        children_names: rsvp.children_names || null,
        meal_choice: rsvp.meal_choice || null,
        dietary_requirements: rsvp.dietary_requirements || null,
        allergy_notes: rsvp.allergy_notes || null,
        accessibility_notes: rsvp.accessibility_notes || null,
        transport_status: rsvp.transport_status || null,
        accommodation_status: rsvp.accommodation_status || null,
        song_request: rsvp.song_request || null,
        message_to_couple: rsvp.message_to_couple || null,
        submitted_by: submittingGuestId,
        updated_at: new Date().toISOString(),
        is_draft: save_draft ?? false,
        submitted_at: save_draft ? (existingRes?.submitted_at || null) : (existingRes?.submitted_at || new Date().toISOString()),
      };

      let responseId: string;
      if (existingRes) {
        const { data: updated } = await supabase
          .from("rsvp_responses")
          .update(rsvpPayload)
          .eq("id", existingRes.id)
          .select("id")
          .single();
        if (!updated) throw new Error("Failed to update RSVP");
        responseId = updated.id;
      } else {
        const { data: inserted } = await supabase
          .from("rsvp_responses")
          .insert(rsvpPayload)
          .select("id")
          .single();
        if (!inserted) throw new Error("Failed to create RSVP");
        responseId = inserted.id;
      }
      responseIds[gId] = responseId;

      // ── Store structured dietary as JSONB on the response ──
      if (rsvp.structured_dietary) {
        const sd = rsvp.structured_dietary;
        // Store structured dietary in a format the existing columns can handle
        const dietaryParts: string[] = [];
        if (sd.preference) dietaryParts.push(`Preference: ${sd.preference}${sd.preference_other ? ` (${sd.preference_other})` : ''}`);
        if (sd.allergies && sd.allergies.length > 0) dietaryParts.push(`Allergies: ${[...sd.allergies, sd.allergy_other].filter(Boolean).join(', ')}`);
        if (sd.allergy_severity) dietaryParts.push(`Severity: ${sd.allergy_severity}`);
        if (sd.cross_contamination_concern) dietaryParts.push('Cross-contamination concern');
        if (sd.additional_notes) dietaryParts.push(sd.additional_notes);
        if (dietaryParts.length > 0) {
          await supabase.from("rsvp_responses").update({ dietary_requirements: dietaryParts.join('; ') }).eq("id", responseId);
        }
      }

      if (rsvp.structured_accessibility) {
        const sa = rsvp.structured_accessibility;
        const accParts: string[] = [];
        if (sa.step_free_access) accParts.push('Step-free access');
        if (sa.wheelchair_space) accParts.push('Wheelchair space');
        if (sa.accessible_toilet) accParts.push('Accessible toilet');
        if (sa.carer_attending) accParts.push('Carer attending');
        if (sa.hearing_support) accParts.push('Hearing support');
        if (sa.visual_support) accParts.push('Visual support');
        if (sa.quiet_area) accParts.push('Quiet area preferred');
        if (sa.seating_support) accParts.push('Seating support');
        if (sa.mobility_transport) accParts.push('Mobility/transport assistance');
        if (sa.other_notes) accParts.push(sa.other_notes);
        if (accParts.length > 0) {
          await supabase.from("rsvp_responses").update({ accessibility_notes: accParts.join('; ') }).eq("id", responseId);
        }
      }

      // ── Sync custom answers ──
      if (rsvp.custom_answers?.length) {
        await supabase.from("rsvp_custom_answers").delete().eq("response_id", responseId);

        const answers = rsvp.custom_answers.map((a) => ({
          wedding_id: weddingId,
          response_id: responseId,
          guest_id: gId,
          question_key: a.question_key,
          question_label: a.question_label,
          answer: a.answer,
          answer_type: a.answer_type,
          updated_at: new Date().toISOString(),
        }));
        await supabase.from("rsvp_custom_answers").insert(answers);
      }

      // ── Sync event responses ──
      if (rsvp.event_responses && rsvp.event_responses.length > 0) {
        await supabase.from("rsvp_event_responses").delete().eq("guest_id", gId).eq("invitation_id", invitationId);

        const eventRows = rsvp.event_responses.map((er) => ({
          wedding_id: weddingId,
          invitation_id: invitationId,
          submission_id: submissionId,
          guest_id: gId,
          event_id: er.event_id,
          attendance_status: er.attendance_status,
          meal_option_id: er.meal_option_id || null,
          updated_at: new Date().toISOString(),
        }));
        await supabase.from("rsvp_event_responses").insert(eventRows);
      }

      // ── Update guest rsvp_status ──
      if (!save_draft) {
        await supabase.from("guests").update({ rsvp_status: rsvp.response_status, updated_at: new Date().toISOString() }).eq("id", gId);

        // ── Create plus-one guest record ──
        if (rsvp.plus_one_confirmed && rsvp.plus_one_name?.trim() && guest?.plus_one_status === "approved_unnamed") {
          const { data: existingPlusOne } = await supabase
            .from("guests")
            .select("id")
            .eq("wedding_id", weddingId)
            .eq("status", "active")
            .or(`named_plus_one_guest_id.eq.${gId},full_name.like.${rsvp.plus_one_name.trim()}`)
            .maybeSingle();

          if (!existingPlusOne) {
            const { data: newPlusOne } = await supabase
              .from("guests")
              .insert({
                wedding_id: weddingId,
                full_name: rsvp.plus_one_name.trim(),
                guest_type: "plus_one",
                rsvp_status: "attending",
                relationship_label: `Plus-one of ${guest.full_name || "guest"}`,
                plus_one_allowed: false,
                approved_additional_children: 0,
                status: "active",
                household_id: guest.household_id || null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .select("id")
              .single();

            if (newPlusOne) {
              await supabase.from("guests")
                .update({ plus_one_name: rsvp.plus_one_name.trim(), plus_one_status: "confirmed", named_plus_one_guest_id: newPlusOne.id, updated_at: new Date().toISOString() })
                .eq("id", gId);

              await supabase.from("invitation_recipients").insert({
                wedding_id: weddingId,
                invitation_id: invitationId,
                guest_id: newPlusOne.id,
                recipient_role: "plus_one",
                ceremony_included: recipientMap.get(gId)?.ceremony_included || false,
                reception_included: recipientMap.get(gId)?.reception_included || false,
                evening_included: recipientMap.get(gId)?.evening_included || false,
                welcome_event_included: recipientMap.get(gId)?.welcome_event_included || false,
                day_after_event_included: recipientMap.get(gId)?.day_after_event_included || false,
                plus_one_allowed: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              });
            }
          }
        }
      }
    }

    // ── Log activity ──
    const activitySummary = save_draft
      ? "RSVP draft saved"
      : isResubmission
        ? `RSVP response updated (revision ${revisionNumber})`
        : `RSVP response submitted${isLate ? " (late)" : " (on time)"}`;

    await supabase.from("guest_portal_activity").insert({
      wedding_id: weddingId,
      invitation_id: invitationId,
      session_id: session.id,
      actor_type: "guest",
      event_type: save_draft ? "rsvp_draft_saved" : isResubmission ? "rsvp_updated" : "rsvp_submitted",
      summary: activitySummary,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: save_draft
          ? "Your draft has been saved."
          : isResubmission
            ? "Your RSVP has been updated. Thank you!"
            : "Thank you! Your RSVP has been received.",
        submission_id: submissionId,
        is_update: isResubmission,
        is_late: isLate,
        response_ids: responseIds,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("submit-rsvp error:", err instanceof Error ? err.message : String(err));
    return new Response(
      JSON.stringify({ success: false, error: "Something went wrong. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
