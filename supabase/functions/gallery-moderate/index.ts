import { requireEntitlement, entitlementErrorResponse } from '../_shared/requireEntitlement.ts';
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ── Deterministic file validation ──

function validateFileSafety(buffer: Uint8Array, mimeType: string): { safe: boolean; reason?: string } {
  // Check magic bytes to prevent MIME type spoofing
  const header = buffer.slice(0, 12);

  if (mimeType.startsWith("image/")) {
    const jpegMagic = header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF;
    const pngMagic = header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47;
    const webpMagic = header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46;
    const gifMagic = header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x38;

    if (!jpegMagic && !pngMagic && !webpMagic && !gifMagic) {
      return { safe: false, reason: "File magic bytes do not match any supported image format" };
    }
    return { safe: true };
  }

  if (mimeType.startsWith("video/")) {
    const mp4Magic = (header[4] === 0x66 && header[5] === 0x74 && header[6] === 0x79 && header[7] === 0x70);
    const webmMagic = header[0] === 0x1A && header[1] === 0x45 && header[2] === 0xDF && header[3] === 0xA3;

    if (!mp4Magic && !webmMagic) {
      return { safe: false, reason: "File magic bytes do not match any supported video format" };
    }
    return { safe: true };
  }

  return { safe: false, reason: `Unsupported MIME type: ${mimeType}` };
}

// ── Main handler ──

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = (Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_PUBLIC_SUPABASE_URL"))!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body = await req.json();
    const { asset_id, wedding_id } = body || {};

    if (!asset_id || !wedding_id) {
      return new Response(JSON.stringify({ success: false, error: "Missing asset_id or wedding_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let actorRole: string | undefined;
    const credential = (req.headers.get('Authorization') || '').replace(/^Bearer /i, '');
    if (credential !== supabaseKey) {
      const auth = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!);
      const { data: { user }, error: authError } = await auth.auth.getUser(credential);
      if (authError || !user) return new Response(JSON.stringify({ error: 'Sign in to continue.' }), { status: 401, headers: corsHeaders });
      const { data: member } = await supabase.from('wedding_members').select('role').eq('wedding_id', wedding_id).eq('user_id', user.id).eq('status', 'active').maybeSingle();
      if (!member || !['owner','partner','planner'].includes(member.role)) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: corsHeaders });
      actorRole = member.role;
    }
    await requireEntitlement(supabase, wedding_id, 'gallery', actorRole);

    // Fetch the asset
    const { data: asset, error: fetchErr } = await supabase
      .from("gallery_assets")
      .select("*")
      .eq("id", asset_id)
      .eq("wedding_id", wedding_id)
      .maybeSingle();

    if (fetchErr || !asset) {
      return new Response(JSON.stringify({ success: false, error: "Asset not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const a = asset as Record<string, unknown>;

    // Only scan assets in pending or uploading status
    const currentStatus = a.moderation_status as string;
    if (!["pending", "uploading", "processing"].includes(currentStatus)) {
      return new Response(JSON.stringify({
        success: true,
        idempotent: true,
        status: currentStatus,
        message: "Asset already processed",
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch the file from storage
    const storagePath = a.storage_path as string;
    const { data: fileData, error: downloadErr } = await supabase.storage
      .from("private")
      .download(storagePath);

    if (downloadErr || !fileData) {
      // Mark as failed
      await supabase.from("gallery_assets").update({
        moderation_status: "failed",
        moderation_reason: "Could not retrieve file for scanning",
        updated_at: new Date().toISOString(),
      }).eq("id", asset_id);

      return new Response(JSON.stringify({ success: false, error: "Could not download file for scanning" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const buffer = new Uint8Array(await fileData.arrayBuffer());
    const mimeType = (a.mime_type as string) || "image/jpeg";

    // ── Step 1: File integrity / malware check ──
    const fileCheck = validateFileSafety(buffer, mimeType);
    if (!fileCheck.safe) {
      await supabase.from("gallery_assets").update({
        moderation_status: "rejected",
        scan_status: "skipped",
        moderation_reason: fileCheck.reason || "File failed safety validation",
        moderation_scanned_at: new Date().toISOString(),
        scanned_by: "vowora-file-validator",
        moderation_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", asset_id);

      return new Response(JSON.stringify({
        success: true,
        moderation_status: "rejected",
        reason: fileCheck.reason,
        provider: "vowora-file-validator",
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Step 2: Content check ──
    // Guest photos are checked by Tron through gallery-scan-worker (queued by a
    // database trigger on upload) and stay in the approval queue until then.
    // Videos aren't checked automatically, so they go straight to the couple.
    if (mimeType.startsWith("video/")) {
      await supabase.from("gallery_assets").update({
        moderation_status: "awaiting_review",
        moderation_ai_label: "Video — please review",
        moderation_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", asset_id);
      return new Response(JSON.stringify({ success: true, moderation_status: "awaiting_review" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ success: true, moderation_status: currentStatus, queued: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const denied = entitlementErrorResponse(err, corsHeaders);
    if (denied) return denied;
    console.error("gallery-moderate error:", err);
    return new Response(JSON.stringify({ success: false, error: "An unexpected error occurred during moderation." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
