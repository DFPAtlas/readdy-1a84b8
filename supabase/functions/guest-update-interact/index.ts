
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { sha256Hex, validGuestSessionSecret } from "../_shared/guestAccess.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// The browser holds the raw guest session credential; only its SHA-256 hash is
// stored in guest_access_sessions.session_hash, so hash before every lookup.
function sha256(text: string): string {
  const data = new TextEncoder().encode(text);
  const hash = crypto.subtle.digestSync("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = (Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_PUBLIC_SUPABASE_URL"))!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body = await req.json();
    const { session_hash, action, update_id, guest_id, updates_enabled, email_notifications } = body || {};

    if (!session_hash || typeof session_hash !== "string" || session_hash.length < 32) {
      return new Response(JSON.stringify({ ok: false, error: "session_invalid" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: session, error: sessionErr } = await supabase
      .from("guest_access_sessions")
      .select("id, wedding_id, invitation_id")
      .eq("session_hash", await sha256Hex(session_hash))
      .eq("status", "active")
      .maybeSingle();

    if (sessionErr || !session) {
      return new Response(JSON.stringify({ ok: false, error: "session_invalid" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (guest_id) {
      const { data: recipient } = await supabase
        .from("invitation_recipients")
        .select("guest_id")
        .eq("invitation_id", session.invitation_id)
        .eq("guest_id", guest_id)
        .maybeSingle();

      if (!recipient) {
        return new Response(JSON.stringify({ ok: false, error: "not_authorised" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    switch (action) {
      case "mark_read": {
        if (!update_id || !guest_id) {
          return new Response(JSON.stringify({ ok: false, error: "missing_parameters" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const { error: upsertErr } = await supabase
          .from("guest_update_state")
          .upsert({
            update_id,
            guest_id,
            invitation_id: session.invitation_id,
            wedding_id: session.wedding_id,
            is_read: true,
            read_at: new Date().toISOString(),
            last_read_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: "update_id,guest_id" });

        if (upsertErr) {
          return new Response(JSON.stringify({ ok: false, error: upsertErr.message }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "mark_unread": {
        if (!update_id || !guest_id) {
          return new Response(JSON.stringify({ ok: false, error: "missing_parameters" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const { error: upsertErr } = await supabase
          .from("guest_update_state")
          .upsert({
            update_id,
            guest_id,
            invitation_id: session.invitation_id,
            wedding_id: session.wedding_id,
            is_read: false,
            read_at: null,
            last_read_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: "update_id,guest_id" });

        if (upsertErr) {
          return new Response(JSON.stringify({ ok: false, error: upsertErr.message }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "toggle_saved": {
        if (!update_id || !guest_id) {
          return new Response(JSON.stringify({ ok: false, error: "missing_parameters" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const { data: current } = await supabase
          .from("guest_update_state")
          .select("is_saved")
          .eq("update_id", update_id)
          .eq("guest_id", guest_id)
          .maybeSingle();

        const newSaved = !((current as { is_saved?: boolean } | null)?.is_saved);

        const { error: upsertErr } = await supabase
          .from("guest_update_state")
          .upsert({
            update_id,
            guest_id,
            invitation_id: session.invitation_id,
            wedding_id: session.wedding_id,
            is_saved: newSaved,
            saved_at: newSaved ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          }, { onConflict: "update_id,guest_id" });

        if (upsertErr) {
          return new Response(JSON.stringify({ ok: false, error: upsertErr.message }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        return new Response(JSON.stringify({ ok: true, is_saved: newSaved }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "mark_all_read": {
        if (!guest_id) {
          return new Response(JSON.stringify({ ok: false, error: "missing_parameters" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // Get all published updates for this wedding
        const now = new Date().toISOString();
        const { data: updates } = await supabase
          .from("wedding_updates")
          .select("id")
          .eq("wedding_id", session.wedding_id)
          .eq("status", "published")
          .lte("publish_at", now)
          .or("publish_at.is.null");

        if (updates && updates.length > 0) {
          const rows = updates.map((u: { id: string }) => ({
            update_id: u.id,
            guest_id,
            invitation_id: session.invitation_id,
            wedding_id: session.wedding_id,
            is_read: true,
            read_at: now,
            last_read_at: now,
            updated_at: now,
          }));

          const { error: upsertErr } = await supabase
            .from("guest_update_state")
            .upsert(rows, { onConflict: "update_id,guest_id" });

          if (upsertErr) {
            return new Response(JSON.stringify({ ok: false, error: upsertErr.message }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
        }

        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "dismiss_banner": {
        if (!update_id || !guest_id) {
          return new Response(JSON.stringify({ ok: false, error: "missing_parameters" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const { error: upsertErr } = await supabase
          .from("guest_update_state")
          .upsert({
            update_id,
            guest_id,
            invitation_id: session.invitation_id,
            wedding_id: session.wedding_id,
            is_read: true,
            read_at: new Date().toISOString(),
            last_read_at: new Date().toISOString(),
            dismissed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: "update_id,guest_id" });

        if (upsertErr) {
          return new Response(JSON.stringify({ ok: false, error: upsertErr.message }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "update_preferences": {
        if (!guest_id) {
          return new Response(JSON.stringify({ ok: false, error: "missing_parameters" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const { error: upsertErr } = await supabase
          .from("guest_notification_preferences")
          .upsert({
            wedding_id: session.wedding_id,
            invitation_id: session.invitation_id,
            guest_id,
            updates_enabled: updates_enabled !== undefined ? !!updates_enabled : true,
            email_notifications: email_notifications !== undefined ? !!email_notifications : false,
            updated_at: new Date().toISOString(),
          }, { onConflict: "invitation_id,guest_id" });

        if (upsertErr) {
          return new Response(JSON.stringify({ ok: false, error: upsertErr.message }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      default:
        return new Response(JSON.stringify({ ok: false, error: "unknown_action" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch (err) {
    console.error("guest-update-interact error:", err);
    return new Response(JSON.stringify({ ok: false, error: "unavailable" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
