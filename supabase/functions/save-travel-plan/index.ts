import { sha256Hex } from "../_shared/guestAccess.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
  "Cache-Control": "private, no-store, no-cache, max-age=0",
};

// The browser holds the raw guest session credential; only its SHA-256 hash is
// stored in guest_access_sessions.session_hash, so hash before every lookup.


type PlanType = "accommodation" | "transport" | "note";

interface RequestBody {
  session_hash: string;
  guest_id?: string;
  plan_type?: PlanType;
  plan_id?: string;
  place_id?: string;
  check_in_date?: string;
  check_out_date?: string;
  booking_reference?: string;
  transport_needs?: string;
  notes?: string;
  travel_method?: string;
  parking_required?: boolean;
  shuttle_required?: boolean;
}

const ALLOWED_PLAN_TYPES: PlanType[] = ["accommodation", "transport", "note"];

function jsonResponse(payload: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function validateSessionHash(hash: unknown): hash is string {
  return typeof hash === "string" && hash.length >= 32;
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function isDateString(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = (Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_PUBLIC_SUPABASE_URL"))!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body: RequestBody = await req.json();
    const { session_hash } = body;

    if (!validateSessionHash(session_hash)) {
      return jsonResponse({ success: false, error: "Invalid session" });
    }

    const { data: session, error: sessionErr } = await supabase
      .from("guest_access_sessions")
      .select("id, wedding_id, invitation_id")
      .eq("session_hash", await sha256Hex(session_hash))
      .eq("status", "active")
      .maybeSingle();

    if (sessionErr || !session) {
      return jsonResponse({ success: false, error: "Session invalid or expired" });
    }

    const weddingId = session.wedding_id as string;
    const invitationId = session.invitation_id as string;

    const { data: recipients } = await supabase
      .from("invitation_recipients")
      .select("guest_id")
      .eq("invitation_id", invitationId);

    const guestIds = (recipients ?? []).map((r: { guest_id: string }) => r.guest_id);
    const primaryGuestId = guestIds[0] ?? null;

    if (!primaryGuestId) {
      return jsonResponse({ success: false, error: "No guests found for this invitation" });
    }

    if (req.method === "DELETE") {
      const planId = body.plan_id;
      if (!isUuid(planId)) {
        return jsonResponse({ success: false, error: "Invalid plan reference" });
      }

      const { error: deleteErr } = await supabase
        .from("guest_travel_plans")
        .delete()
        .eq("id", planId)
        .eq("wedding_id", weddingId)
        .eq("invitation_id", invitationId);

      if (deleteErr) {
        console.error("save-travel-plan delete error:", deleteErr);
        return jsonResponse({ success: false, error: "Could not remove this plan. Please try again." });
      }

      return jsonResponse({ success: true, message: "Plan removed." });
    }

    if (req.method !== "POST") {
      return jsonResponse({ success: false, error: "Method not allowed" }, 405);
    }

    const planType = body.plan_type;
    if (!planType || !ALLOWED_PLAN_TYPES.includes(planType)) {
      return jsonResponse({ success: false, error: "Invalid plan type" });
    }

    const requestedGuestId = isUuid(body.guest_id) ? body.guest_id : null;
    const actingGuestId = requestedGuestId && guestIds.includes(requestedGuestId)
      ? requestedGuestId
      : primaryGuestId;

    if (body.check_in_date !== undefined && body.check_in_date !== "" && !isDateString(body.check_in_date)) {
      return jsonResponse({ success: false, error: "Invalid check-in date" });
    }
    if (body.check_out_date !== undefined && body.check_out_date !== "" && !isDateString(body.check_out_date)) {
      return jsonResponse({ success: false, error: "Invalid check-out date" });
    }
    if (
      isDateString(body.check_in_date) &&
      isDateString(body.check_out_date) &&
      new Date(body.check_out_date) <= new Date(body.check_in_date)
    ) {
      return jsonResponse({ success: false, error: "Check-out date must be after check-in date." });
    }

    const trimmed = (value: unknown, max: number): string | null => {
      if (typeof value !== "string") return null;
      const t = value.trim();
      return t.length === 0 ? null : t.slice(0, max);
    };

    const payload: Record<string, unknown> = {
      wedding_id: weddingId,
      invitation_id: invitationId,
      guest_id: actingGuestId,
      plan_type: planType,
      place_id: isUuid(body.place_id) ? body.place_id : null,
      check_in_date: isDateString(body.check_in_date) ? body.check_in_date : null,
      check_out_date: isDateString(body.check_out_date) ? body.check_out_date : null,
      booking_reference: trimmed(body.booking_reference, 120),
      transport_needs: trimmed(body.transport_needs, 1000),
      travel_method: trimmed(body.travel_method, 60),
      notes: trimmed(body.notes, 2000),
      parking_required: body.parking_required === true,
      shuttle_required: body.shuttle_required === true,
      updated_at: new Date().toISOString(),
    };

    if (isUuid(body.plan_id)) {
      const { data: updated, error: updateErr } = await supabase
        .from("guest_travel_plans")
        .update(payload)
        .eq("id", body.plan_id)
        .eq("wedding_id", weddingId)
        .eq("invitation_id", invitationId)
        .select("id")
        .maybeSingle();

      if (updateErr) {
        console.error("save-travel-plan update error:", updateErr);
        return jsonResponse({ success: false, error: "Could not save your plan. Please try again." });
      }
      if (!updated) {
        return jsonResponse({ success: false, error: "Plan not found" });
      }

      return jsonResponse({ success: true, message: "Plan updated.", plan_id: updated.id });
    }

    const { data: inserted, error: insertErr } = await supabase
      .from("guest_travel_plans")
      .insert(payload)
      .select("id")
      .maybeSingle();

    if (insertErr) {
      console.error("save-travel-plan insert error:", insertErr);
      return jsonResponse({ success: false, error: "Could not save your plan. Please try again." });
    }

    return jsonResponse({ success: true, message: "Plan saved.", plan_id: inserted?.id ?? null });
  } catch (err) {
    console.error("save-travel-plan error:", err);
    return jsonResponse({ success: false, error: "Something went wrong. Please try again." });
  }
});
