import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "private, no-store, no-cache, max-age=0",
};

interface RequestBody {
  session_hash: string;
  action: "update_profile" | "update_notification_prefs" | "update_consent" | "request_data_download" | "request_deletion" | "request_data_correction" | "remove_optional_notes";
  profile?: {
    preferred_name?: string;
    email?: string;
    mobile_phone?: string;
    preferred_contact_method?: string;
  };
  notification_prefs?: {
    updates_enabled?: boolean;
    email_notifications?: boolean;
    sms_enabled?: boolean;
    important_only_updates?: boolean;
    travel_updates?: boolean;
    rsvp_reminders?: boolean;
    gallery_notifications?: boolean;
    language?: string;
    timezone?: string;
  };
  consent?: {
    consent_type: "communication" | "marketing";
    consented: boolean;
  };
  notes?: string;
  corrected_fields?: Record<string, string>;
}

function validateSessionHash(hash: unknown): hash is string {
  return typeof hash === "string" && hash.length >= 32;
}

function validateProfile(profile: unknown): { valid: boolean; error?: string } {
  if (!profile || typeof profile !== "object") return { valid: false, error: "Profile data is required" };
  const p = profile as Record<string, unknown>;
  if (p.preferred_name !== undefined && (typeof p.preferred_name !== "string" || (p.preferred_name as string).length > 100)) return { valid: false, error: "Preferred name must be under 100 characters" };
  if (p.email !== undefined && (typeof p.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email as string) || (p.email as string).length > 255)) return { valid: false, error: "Please enter a valid email address" };
  if (p.mobile_phone !== undefined && typeof p.mobile_phone !== "string") return { valid: false, error: "Invalid phone number" };
  if (p.preferred_contact_method !== undefined && !["portal", "email", "telephone", "sms"].includes(p.preferred_contact_method as string)) return { valid: false, error: "Invalid contact method" };
  return { valid: true };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("VITE_PUBLIC_SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body: RequestBody = await req.json();
    const { session_hash, action } = body;

    if (!validateSessionHash(session_hash)) {
      return new Response(JSON.stringify({ success: false, error: "Invalid session" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: session, error: sessionErr } = await supabase
      .from("guest_access_sessions")
      .select("id, wedding_id, invitation_id")
      .eq("session_hash", session_hash)
      .eq("status", "active")
      .maybeSingle();

    if (sessionErr || !session) {
      return new Response(JSON.stringify({ success: false, error: "Session invalid or expired" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const weddingId = session.wedding_id;
    const invitationId = session.invitation_id;

    // Get guest IDs for this invitation
    const { data: recipients } = await supabase
      .from("invitation_recipients")
      .select("guest_id")
      .eq("invitation_id", invitationId);

    if (!recipients || recipients.length === 0) {
      return new Response(JSON.stringify({ success: false, error: "No guests found for this invitation" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const guestIds = recipients.map((r: { guest_id: string }) => r.guest_id);
    // Use the first guest as the primary actor for audit records
    const primaryGuestId = guestIds[0];

    switch (action) {
      // ── Update Profile ──
      case "update_profile": {
        const profileValidation = validateProfile(body.profile);
        if (!profileValidation.valid) {
          return new Response(JSON.stringify({ success: false, error: profileValidation.error }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const profile = body.profile!;
        const updates: Record<string, string> = {};
        const changedFields: string[] = [];

        if (profile.preferred_name !== undefined) { updates.preferred_name = profile.preferred_name; changedFields.push("preferred_name"); }
        if (profile.email !== undefined) { updates.email = profile.email; changedFields.push("email"); }
        if (profile.mobile_phone !== undefined) { updates.mobile_phone = profile.mobile_phone; changedFields.push("mobile_phone"); }
        if (profile.preferred_contact_method !== undefined) { updates.preferred_contact_method = profile.preferred_contact_method; changedFields.push("preferred_contact_method"); }

        if (changedFields.length === 0) {
          return new Response(JSON.stringify({ success: true, message: "No changes to save" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // Update all guests on this invitation
        const { error: updateErr } = await supabase
          .from("guests")
          .update({ ...updates, updated_at: new Date().toISOString() })
          .in("id", guestIds)
          .eq("wedding_id", weddingId);

        if (updateErr) {
          console.error("Profile update error:", updateErr);
          return new Response(JSON.stringify({ success: false, error: "Could not save your details. Please try again." }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // Audit: record profile changes (field names only, no values)
        await supabase.from("profile_change_records").insert({
          wedding_id: weddingId,
          invitation_id: invitationId,
          guest_id: primaryGuestId,
          changed_fields: changedFields,
          field_summary: `Updated: ${changedFields.join(", ")}`,
        });

        return new Response(JSON.stringify({ success: true, message: "Your details have been saved." }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // ── Update Notification Preferences ──
      case "update_notification_prefs": {
        const prefs = body.notification_prefs;
        if (!prefs || typeof prefs !== "object") {
          return new Response(JSON.stringify({ success: false, error: "Preferences are required" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const allowedFields = ["updates_enabled", "email_notifications", "sms_enabled", "important_only_updates", "travel_updates", "rsvp_reminders", "gallery_notifications", "language", "timezone"];
        const updatePayload: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(prefs)) {
          if (allowedFields.includes(key)) {
            updatePayload[key] = value;
          }
        }

        if (Object.keys(updatePayload).length === 0) {
          return new Response(JSON.stringify({ success: true, message: "No preference changes" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        updatePayload.updated_at = new Date().toISOString();

        // Upsert preference for each guest
        for (const gId of guestIds) {
          const { data: existing } = await supabase
            .from("guest_notification_preferences")
            .select("id")
            .eq("invitation_id", invitationId)
            .eq("guest_id", gId)
            .eq("wedding_id", weddingId)
            .maybeSingle();

          if (existing) {
            await supabase.from("guest_notification_preferences").update(updatePayload).eq("id", (existing as { id: string }).id);
          } else {
            await supabase.from("guest_notification_preferences").insert({
              wedding_id: weddingId,
              invitation_id: invitationId,
              guest_id: gId,
              ...updatePayload,
            });
          }
        }

        return new Response(JSON.stringify({ success: true, message: "Preferences saved." }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // ── Update Consent ──
      case "update_consent": {
        const consent = body.consent;
        if (!consent || !["communication", "marketing"].includes(consent.consent_type)) {
          return new Response(JSON.stringify({ success: false, error: "Invalid consent type" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // Upsert consent for primary guest
        const { data: existing } = await supabase
          .from("guest_consent_records")
          .select("id")
          .eq("wedding_id", weddingId)
          .eq("invitation_id", invitationId)
          .eq("guest_id", primaryGuestId)
          .eq("consent_type", consent.consent_type)
          .maybeSingle();

        if (existing) {
          await supabase.from("guest_consent_records")
            .update({ consented: consent.consented, recorded_at: new Date().toISOString() })
            .eq("id", (existing as { id: string }).id);
        } else {
          await supabase.from("guest_consent_records").insert({
            wedding_id: weddingId,
            invitation_id: invitationId,
            guest_id: primaryGuestId,
            consent_type: consent.consent_type,
            consented: consent.consented,
          });
        }

        return new Response(JSON.stringify({ success: true, message: "Consent preference saved." }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // ── Request Data Download ──
      case "request_data_download": {
        const { error: insertErr } = await supabase.from("privacy_requests").insert({
          wedding_id: weddingId,
          invitation_id: invitationId,
          guest_id: primaryGuestId,
          request_type: "data_download",
          status: "pending",
          notes: body.notes || null,
        });

        if (insertErr) {
          return new Response(JSON.stringify({ success: false, error: "Could not submit your request. Please try again." }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        return new Response(JSON.stringify({ success: true, message: "Your data download request has been submitted. The couple will process it shortly." }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // ── Request Deletion ──
      case "request_deletion": {
        const { error: insertErr } = await supabase.from("privacy_requests").insert({
          wedding_id: weddingId,
          invitation_id: invitationId,
          guest_id: primaryGuestId,
          request_type: "data_deletion",
          status: "pending",
          notes: body.notes || null,
        });

        if (insertErr) {
          return new Response(JSON.stringify({ success: false, error: "Could not submit your request. Please try again." }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        return new Response(JSON.stringify({ success: true, message: "Your data deletion request has been submitted for review. We will follow up with you." }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // ── Request Data Correction ──
      case "request_data_correction": {
        if (!body.corrected_fields || Object.keys(body.corrected_fields).length === 0) {
          return new Response(JSON.stringify({ success: false, error: "Please specify the fields you would like corrected" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const { error: insertErr } = await supabase.from("privacy_requests").insert({
          wedding_id: weddingId,
          invitation_id: invitationId,
          guest_id: primaryGuestId,
          request_type: "data_correction",
          status: "pending",
          corrected_fields: body.corrected_fields,
          notes: body.notes || null,
        });

        if (insertErr) {
          return new Response(JSON.stringify({ success: false, error: "Could not submit your correction request. Please try again." }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        return new Response(JSON.stringify({ success: true, message: "Your correction request has been submitted for review." }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // ── Remove Optional Notes ──
      case "remove_optional_notes": {
        const { error: updateErr } = await supabase
          .from("guests")
          .update({
            dietary_requirements: null,
            allergy_notes: null,
            accessibility_notes: null,
            accessibility_needs: null,
            updated_at: new Date().toISOString(),
          })
          .in("id", guestIds)
          .eq("wedding_id", weddingId);

        if (updateErr) {
          return new Response(JSON.stringify({ success: false, error: "Could not remove your notes. Please try again." }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // Record the privacy request and profile change
        await supabase.from("privacy_requests").insert({
          wedding_id: weddingId,
          invitation_id: invitationId,
          guest_id: primaryGuestId,
          request_type: "remove_optional_notes",
          status: "completed",
          notes: "Dietary requirements, allergy notes and accessibility notes removed at guest request",
        });

        await supabase.from("profile_change_records").insert({
          wedding_id: weddingId,
          invitation_id: invitationId,
          guest_id: primaryGuestId,
          changed_fields: ["dietary_requirements", "allergy_notes", "accessibility_notes", "accessibility_needs"],
          field_summary: "Removed optional dietary, allergy and accessibility notes",
        });

        return new Response(JSON.stringify({ success: true, message: "Your optional notes have been removed." }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      default:
        return new Response(JSON.stringify({ success: false, error: "Unknown action" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch (err) {
    console.error("guest-settings-interact error:", err);
    return new Response(JSON.stringify({ success: false, error: "Something went wrong. Please try again." }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
