import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DELETION_TABLE_ORDER = [
  "guest_calendar_activity",
  "guest_seating_activity",
  "guest_consent_records",
  "guest_update_state",
  "guest_notification_preferences",
  "guest_portal_activity",
  "guest_access_sessions",
  "invitation_access_activity",
  "invitation_activity_log",
  "rsvp_custom_answers",
  "rsvp_event_responses",
  "rsvp_response_revisions",
  "rsvp_responses",
  "rsvp_submissions",
  "gift_contributions",
  "gift_contribution_events",
  "gift_item_reservations",
  "gift_registry_items",
  "gift_registries",
  "gift_fund_contributions",
  "gift_fund_events",
  "gift_fund_accounts",
  "gift_funds",
  "gallery_favourites",
  "gallery_album_read_state",
  "gallery_reports",
  "gallery_asset_derivatives",
  "gallery_assets",
  "gallery_album_audiences",
  "gallery_albums",
  "gallery_upload_settings",
  "gallery_moderation_rules",
  "wedding_update_read_states",
  "wedding_update_audiences",
  "wedding_update_attachments",
  "wedding_updates",
  "update_read_states",
  "invitation_guests",
  "invitation_recipients",
  "invitation_designs",
  "invitation_access_tokens",
  "invitations",
  "invitation_templates",
  "guest_question_activity",
  "guest_questions",
  "question_activity",
  "guest_tag_assignments",
  "guest_relationships",
  "guest_activity_log",
  "guests",
  "guest_households",
  "guest_tags",
  "guest_portal_settings",
  "guest_import_jobs",
  "seating_assignments",
  "seating_seats",
  "seating_room_objects",
  "seating_zones",
  "seating_groups",
  "seating_group_members",
  "seating_rules",
  "seating_conflicts",
  "seating_assistant_proposals",
  "seating_proposal_assignments",
  "seating_publications",
  "seating_export_jobs",
  "seating_report_templates",
  "seating_lookup_codes",
  "seating_lookup_activity",
  "seating_plan_versions",
  "seating_activity_log",
  "seating_plans",
  "seating_background_assets",
  "budget_payments",
  "budget_expenses",
  "budget_activity_log",
  "budget_scenarios",
  "supplier_budget_links",
  "supplier_activity_log",
  "supplier_documents",
  "supplier_quotes",
  "supplier_contacts",
  "wedding_suppliers",
  "budget_categories",
  "budgets",
  "wedding_task_items",
  "task_activity_log",
  "wedding_tasks",
  "wedding_export_requests",
  "wedding_deletion_requests",
  "wedding_styleboard",
  "wedding_elements",
  "wedding_notification_preferences",
  "wedding_faqs",
  "wedding_shuttles",
  "wedding_local_places",
  "wedding_event_audiences",
  "wedding_events",
  "wedding_schedule",
  "wedding_venues",
  "wedding_website_configs",
  "timeline_items",
  "wedding_contacts",
  "planning_priorities",
];

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Authentication required" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { action, request_id, wedding_id } = await req.json();

    if (!action || !request_id) {
      return new Response(JSON.stringify({ error: "Missing action or request_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Fetch privacy request ──
    const { data: privacyReq, error: reqError } = await supabase
      .from("privacy_requests")
      .select("*")
      .eq("id", request_id)
      .single();

    if (reqError || !privacyReq) {
      return new Response(JSON.stringify({ error: "Privacy request not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Verify ownership
    if (privacyReq.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Not authorised to process this request" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "cancel_deletion") {
      if (privacyReq.request_type !== "account_deletion" && privacyReq.request_type !== "wedding_deletion") {
        return new Response(JSON.stringify({ error: "Only deletion requests can be cancelled" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { error: updateError } = await supabase
        .from("privacy_requests")
        .update({ status: "cancelled" })
        .eq("id", request_id);

      if (updateError) throw updateError;

      return new Response(JSON.stringify({ success: true, message: "Deletion request cancelled" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "process_wedding_deletion") {
      const targetWeddingId = wedding_id || privacyReq.wedding_id;
      if (!targetWeddingId) {
        return new Response(JSON.stringify({ error: "Missing wedding_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Verify wedding ownership
      const { data: membership, error: membershipError } = await supabase
        .from("wedding_members")
        .select("role")
        .eq("wedding_id", targetWeddingId)
        .eq("user_id", user.id)
        .single();

      if (membershipError || !membership || membership.role !== "owner") {
        return new Response(JSON.stringify({ error: "Not the wedding owner" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Check for active subscription
      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("status")
        .eq("wedding_id", targetWeddingId)
        .maybeSingle();

      if (subscription && subscription.status === "active") {
        return new Response(JSON.stringify({ error: "Active subscription found — cancel billing before wedding deletion" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Update status to processing
      await supabase.from("privacy_requests").update({ status: "processing" }).eq("id", request_id);

      // Delete in safe order using service_role client
      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      let completed = 0;
      let failed = 0;
      const failures: string[] = [];

      for (const table of DELETION_TABLE_ORDER) {
        try {
          const { error: delError } = await adminClient
            .from(table)
            .delete()
            .eq("wedding_id", targetWeddingId);

          if (delError) {
            failed++;
            failures.push(`${table}: ${delError.message}`);
          } else {
            completed++;
          }
        } catch (e: unknown) {
          failed++;
          failures.push(`${table}: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
      }

      // Clean storage objects for this wedding
      try {
        const { data: storageFiles } = await adminClient.storage.from("private").list(`weddings/${targetWeddingId}`, { limit: 1000 });
        if (storageFiles && storageFiles.length > 0) {
          const paths = storageFiles.map((f: { name: string }) => `weddings/${targetWeddingId}/${f.name}`);
          await adminClient.storage.from("private").remove(paths);
        }
      } catch { /* storage cleanup is best-effort */ }

      // Update request status
      const finalStatus = failed === 0 ? "completed" : "failed";
      await supabase.from("privacy_requests").update({
        status: finalStatus,
        completed_at: new Date().toISOString(),
        safe_notes: privacyReq.safe_notes ? `${privacyReq.safe_notes} | Deleted ${completed} tables, ${failed} failures` : `Deleted ${completed} tables, ${failed} failures`,
        failure_reason: failures.length > 0 ? failures.join("; ") : null,
      }).eq("id", request_id);

      return new Response(JSON.stringify({
        success: finalStatus === "completed",
        completed,
        failed,
        failures: failures.length > 0 ? failures : undefined,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "process_account_deletion") {
      // Check if user owns weddings
      const { data: ownedWeddings } = await supabase
        .from("wedding_members")
        .select("wedding_id")
        .eq("user_id", user.id)
        .eq("role", "owner");

      if (ownedWeddings && ownedWeddings.length > 0) {
        return new Response(JSON.stringify({
          error: "Cannot delete account while owning weddings",
          owned_wedding_count: ownedWeddings.length,
          message: "Transfer ownership or delete all owned weddings first.",
        }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      await supabase.from("privacy_requests").update({ status: "processing" }).eq("id", request_id);

      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      // Remove profile and settings
      const profileTables = ["profiles", "user_settings", "notification_deliveries", "notifications"];
      let completed = 0;
      let failed = 0;
      const failures: string[] = [];

      for (const table of profileTables) {
        try {
          const { error: delError } = await adminClient.from(table).delete().eq("user_id", user.id);
          if (delError) { failed++; failures.push(`${table}: ${delError.message}`); }
          else { completed++; }
        } catch (e: unknown) {
          failed++;
          failures.push(`${table}: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
      }

      const finalStatus = failed === 0 ? "completed" : "failed";
      await supabase.from("privacy_requests").update({
        status: finalStatus,
        completed_at: new Date().toISOString(),
        failure_reason: failures.length > 0 ? failures.join("; ") : null,
      }).eq("id", request_id);

      return new Response(JSON.stringify({ success: finalStatus === "completed", completed, failed }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: unknown) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
