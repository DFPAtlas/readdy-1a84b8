
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { sha256Hex, validGuestSessionSecret } from "../_shared/guestAccess.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "private, no-store, no-cache, max-age=0",
};

// The browser holds the raw guest session credential; only its SHA-256 hash is
// stored in guest_access_sessions.session_hash, so hash before every lookup.


// Rate limiting: max 3 questions per hour per invitation
const MAX_QUESTIONS_PER_HOUR = 3;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = (Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_PUBLIC_SUPABASE_URL"))!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body = await req.json();
    const { session_hash, action, ...params } = body || {};

    if (!session_hash || typeof session_hash !== "string" || session_hash.length < 32) {
      return new Response(JSON.stringify({ ok: false, error: "invalid_session" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Verify session
    const { data: session, error: sessionErr } = await supabase
      .from("guest_access_sessions")
      .select("id, wedding_id, invitation_id, status")
      .eq("session_hash", await sha256Hex(session_hash))
      .eq("status", "active")
      .maybeSingle();

    if (sessionErr || !session) {
      return new Response(JSON.stringify({ ok: false, error: "invalid_session" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    switch (action) {
      // ── Ask a question ──
      case "ask_question": {
        const { guest_id, category, subject, message, preferred_response_method } = params;

        if (!guest_id || !subject || !message) {
          return new Response(JSON.stringify({ ok: false, error: "missing_fields" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // Verify guest belongs to this invitation
        const { data: recipient } = await supabase
          .from("invitation_recipients")
          .select("guest_id")
          .eq("invitation_id", session.invitation_id)
          .eq("guest_id", guest_id)
          .maybeSingle();

        if (!recipient) {
          return new Response(JSON.stringify({ ok: false, error: "not_authorised" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // Rate limiting: check how many questions in the last hour
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const { count, error: countErr } = await supabase
          .from("guest_questions")
          .select("*", { count: "exact", head: true })
          .eq("invitation_id", session.invitation_id)
          .gte("created_at", oneHourAgo);

        if (!countErr && (count || 0) >= MAX_QUESTIONS_PER_HOUR) {
          return new Response(JSON.stringify({ ok: false, error: "rate_limited", message: "You have reached the limit of questions you can submit. Please try again later." }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // Basic spam check: message length
        const trimmedMsg = (message as string).trim();
        if (trimmedMsg.length < 10) {
          return new Response(JSON.stringify({ ok: false, error: "message_too_short" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        if (trimmedMsg.length > 2000) {
          return new Response(JSON.stringify({ ok: false, error: "message_too_long" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const { error: insertErr } = await supabase
          .from("guest_questions")
          .insert({
            wedding_id: session.wedding_id,
            invitation_id: session.invitation_id,
            guest_id,
            category: category || "general",
            subject: (subject as string).trim().slice(0, 200),
            message: trimmedMsg,
            preferred_response_method: preferred_response_method || "portal",
            status: "pending",
          });

        if (insertErr) {
          return new Response(JSON.stringify({ ok: false, error: "insert_failed" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // ── FAQ feedback (helpful / not helpful) ──
      case "faq_feedback": {
        const { faq_id, guest_id, feedback_type } = params;

        if (!faq_id || !guest_id || !feedback_type) {
          return new Response(JSON.stringify({ ok: false, error: "missing_fields" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        if (!["helpful", "not_helpful"].includes(feedback_type as string)) {
          return new Response(JSON.stringify({ ok: false, error: "invalid_feedback_type" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // Verify FAQ exists and belongs to this wedding
        const { data: faq } = await supabase
          .from("wedding_faqs")
          .select("id")
          .eq("id", faq_id)
          .eq("wedding_id", session.wedding_id)
          .maybeSingle();

        if (!faq) {
          return new Response(JSON.stringify({ ok: false, error: "faq_not_found" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // Check if this guest already gave feedback on this FAQ
        const { data: existing } = await supabase
          .from("question_activity")
          .select("id, activity_type")
          .eq("faq_id", faq_id)
          .eq("invitation_id", session.invitation_id)
          .eq("guest_id", guest_id)
          .maybeSingle();

        if (existing) {
          // Can't change feedback
          return new Response(JSON.stringify({ ok: false, error: "already_submitted" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // Insert activity record
        const { error: actErr } = await supabase
          .from("question_activity")
          .insert({
            faq_id,
            invitation_id: session.invitation_id,
            guest_id,
            activity_type: feedback_type,
          });

        if (actErr) {
          return new Response(JSON.stringify({ ok: false, error: "insert_failed" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // Update count on FAQ
        const column = feedback_type === "helpful" ? "helpful_count" : "not_helpful_count";
        const { error: updateErr } = await supabase
          .rpc("increment_faq_counter", { p_faq_id: faq_id, p_column: column });

        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      default:
        return new Response(JSON.stringify({ ok: false, error: "unknown_action" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch (err) {
    console.error("guest-question-interact error:", err);
    return new Response(JSON.stringify({ ok: false, error: "server_error" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
