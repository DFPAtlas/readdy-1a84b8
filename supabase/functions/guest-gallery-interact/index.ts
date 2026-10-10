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

// ── Rate limiting ──

const rateLimitStore = new Map<string, { count: number; windowStart: number }>();

function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  if (!entry || now - entry.windowStart > windowMs) {
    rateLimitStore.set(key, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= maxRequests) return false;
  entry.count++;
  return true;
}

setInterval(() => {
  const cutoff = Date.now() - 10 * 60 * 1000;
  for (const [key, entry] of rateLimitStore) {
    if (entry.windowStart < cutoff) rateLimitStore.delete(key);
  }
}, 300000);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = (Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_PUBLIC_SUPABASE_URL"))!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);
  // Separate anon client used only to verify a caller's JWT for couple-only
  // actions; privileged database work stays on the service-role client.
  const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);

  try {
    const body = await req.json();
    const { session_hash, action, asset_id, reason, album_id, asset_ids, moderation_status } = body || {};

    if (!validGuestSessionSecret(session_hash) || !action) {
      return new Response(JSON.stringify({ success: false, error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate session
    const { data: session } = await supabase
      .from("guest_access_sessions")
      .select("id, wedding_id, invitation_id")
      .eq("session_hash", await sha256Hex(session_hash))
      .eq("status", "active")
      .maybeSingle();

    if (!session) {
      return new Response(JSON.stringify({ success: false, error: "Invalid session" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: recipients } = await supabase
      .from("invitation_recipients")
      .select("guest_id")
      .eq("invitation_id", session.invitation_id);

    const guestIds = (recipients || []).map((r: { guest_id: string }) => r.guest_id);
    const primaryGuestId = guestIds[0];

    // ── Favourite toggle ──
    if (action === "favourite_toggle") {
      if (!asset_id) {
        return new Response(JSON.stringify({ success: false, error: "Missing asset_id" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: asset } = await supabase
        .from("gallery_assets")
        .select("id, album_id")
        .eq("id", asset_id)
        .eq("wedding_id", session.wedding_id)
        .maybeSingle();

      if (!asset) {
        return new Response(JSON.stringify({ success: false, error: "Asset not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: existing } = await supabase
        .from("gallery_favourites")
        .select("id")
        .eq("asset_id", asset_id)
        .eq("guest_id", primaryGuestId)
        .maybeSingle();

      if (existing) {
        await supabase.from("gallery_favourites").delete().eq("id", (existing as { id: string }).id);
        return new Response(JSON.stringify({ success: true, favourited: false }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else {
        await supabase.from("gallery_favourites").insert({
          asset_id, guest_id: primaryGuestId, invitation_id: session.invitation_id, wedding_id: session.wedding_id,
        });
        return new Response(JSON.stringify({ success: true, favourited: true }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ── Report ──
    if (action === "report") {
      if (!asset_id) {
        return new Response(JSON.stringify({ success: false, error: "Missing asset_id" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
        return new Response(JSON.stringify({ success: false, error: "Please provide a reason for the report." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: asset } = await supabase
        .from("gallery_assets")
        .select("id")
        .eq("id", asset_id)
        .eq("wedding_id", session.wedding_id)
        .maybeSingle();

      if (!asset) {
        return new Response(JSON.stringify({ success: false, error: "Asset not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check reporting is allowed
      const { data: rules } = await supabase
        .from("gallery_moderation_rules")
        .select("allow_reporting")
        .eq("wedding_id", session.wedding_id)
        .maybeSingle();

      if (rules && (rules as { allow_reporting: boolean }).allow_reporting === false) {
        return new Response(JSON.stringify({ success: false, error: "Reporting is not available." }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Rate-limit: max 3 reports per guest per hour
      if (!checkRateLimit(`report:${primaryGuestId}`, 3, 3600000)) {
        return new Response(JSON.stringify({ success: false, error: "You have reached the report limit. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabase.from("gallery_reports").insert({
        asset_id, reported_by_guest_id: primaryGuestId, invitation_id: session.invitation_id, wedding_id: session.wedding_id,
        reason: reason.trim(), status: "pending",
      });

      return new Response(JSON.stringify({ success: true, reported: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Remove own pending upload ──
    if (action === "remove_upload") {
      if (!asset_id) {
        return new Response(JSON.stringify({ success: false, error: "Missing asset_id" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: asset } = await supabase
        .from("gallery_assets")
        .select("id, storage_path, thumbnail_path, moderation_status, uploaded_by_guest_id")
        .eq("id", asset_id)
        .eq("wedding_id", session.wedding_id)
        .maybeSingle();

      if (!asset) {
        return new Response(JSON.stringify({ success: false, error: "Asset not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const a = asset as { id: string; storage_path: string; thumbnail_path: string | null; moderation_status: string; uploaded_by_guest_id: string | null };
      const removable = ["pending", "awaiting_review", "failed", "uploading", "scanning", "held"].includes(a.moderation_status);
      if (!removable) {
        return new Response(JSON.stringify({ success: false, error: "Only pending uploads can be removed" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!a.uploaded_by_guest_id || !guestIds.includes(a.uploaded_by_guest_id)) {
        return new Response(JSON.stringify({ success: false, error: "You can only remove your own uploads" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const pathsToRemove = [a.storage_path];
      if (a.thumbnail_path) pathsToRemove.push(a.thumbnail_path);

      await supabase.storage.from("private").remove(pathsToRemove);
      await supabase.from("gallery_favourites").delete().eq("asset_id", a.id);
      await supabase.from("gallery_reports").delete().eq("asset_id", a.id);
      await supabase.from("gallery_asset_derivatives").delete().eq("gallery_asset_id", a.id);
      await supabase.from("gallery_assets").delete().eq("id", a.id);

      return new Response(JSON.stringify({ success: true, removed: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Mark album as read ──
    if (action === "mark_album_read") {
      if (!album_id) {
        return new Response(JSON.stringify({ success: false, error: "Missing album_id" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: existing } = await supabase
        .from("gallery_album_read_state")
        .select("id")
        .eq("album_id", album_id)
        .eq("guest_id", primaryGuestId)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("gallery_album_read_state")
          .update({ last_viewed_at: new Date().toISOString() })
          .eq("id", (existing as { id: string }).id);
      } else {
        await supabase.from("gallery_album_read_state").insert({
          album_id, guest_id: primaryGuestId, invitation_id: session.invitation_id, wedding_id: session.wedding_id,
          last_viewed_at: new Date().toISOString(),
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Wall toggle (couple-only via JWT) ──
    if (action === "wall_toggle") {
      if (!asset_id) {
        return new Response(JSON.stringify({ success: false, error: "Missing asset_id" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify caller is a wedding member via auth
      const authHeader = req.headers.get("authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ success: false, error: "Authentication required" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authErr } = await supabaseAuth.auth.getUser(token);

      if (authErr || !user) {
        return new Response(JSON.stringify({ success: false, error: "Invalid authentication" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: membership } = await supabase
        .from("wedding_members")
        .select("role")
        .eq("wedding_id", session.wedding_id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!membership || !["owner", "partner", "planner", "editor"].includes((membership as { role: string }).role)) {
        return new Response(JSON.stringify({ success: false, error: "Insufficient permissions" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: asset } = await supabase
        .from("gallery_assets")
        .select("id, wall_visible, moderation_status")
        .eq("id", asset_id)
        .eq("wedding_id", session.wedding_id)
        .maybeSingle();

      if (!asset) {
        return new Response(JSON.stringify({ success: false, error: "Asset not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const a = asset as { id: string; wall_visible: boolean; moderation_status: string };
      const newState = !a.wall_visible;

      if (newState && a.moderation_status !== "approved") {
        return new Response(JSON.stringify({ success: false, error: "Only approved photos can appear on the wall" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabase.from("gallery_assets").update({
        wall_visible: newState,
        wall_added_at: newState ? new Date().toISOString() : null,
        moderation_updated_by: user.id,
        moderation_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", a.id);

      // Audit log
      await supabase.from("invitation_activity_log").insert({
        wedding_id: session.wedding_id,
        event_type: "gallery_wall_toggle",
        summary: `Asset ${a.id} ${newState ? "added to" : "removed from"} live wall by ${user.email || user.id}`,
        actor_type: "couple",
        actor_user_id: user.id,
        security_metadata: { asset_id: a.id, wall_visible: newState },
      });

      return new Response(JSON.stringify({ success: true, wall_visible: newState }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Download tracking ──
    if (action === "download_track") {
      if (!asset_id) {
        return new Response(JSON.stringify({ success: false, error: "Missing asset_id" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: false, error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("guest-gallery-interact error:", err);
    return new Response(JSON.stringify({ success: false, error: "An unexpected error occurred." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
