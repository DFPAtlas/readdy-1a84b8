import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ── Moderation provider interface (swap implementations behind this) ──

interface ModerationResult {
  status: "approved" | "rejected" | "held" | "manual_review" | "error";
  ai_label: string;
  reason_category?: string;
  reason_detail?: string;
  confidence: number;
  provider: string;
}

interface ContentScanner {
  scanImage(buffer: Uint8Array, mimeType: string, fileName: string): Promise<ModerationResult>;
  scanVideo(buffer: Uint8Array, mimeType: string, fileName: string, durationSeconds?: number): Promise<ModerationResult>;
}

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

// ── Simulated AI content scanner (provider abstraction) ──

async function simulateContentScan(
  buffer: Uint8Array,
  mimeType: string,
  _fileName: string,
  _durationSeconds?: number
): Promise<ModerationResult> {
  const fileSize = buffer.length;
  const isVideo = mimeType.startsWith("video/");

  // Deterministic but reasonable simulation of content scanning
  // In production, replace with actual AI provider (e.g., AWS Rekognition, Google Vision, Sightengine)

  // Simulate scanning delay
  await new Promise((r) => setTimeout(r, 200));

  // For the simulation: tiny files (< 1KB) or extremely large files (> 100MB) trigger review
  if (fileSize < 512) {
    return {
      status: "held",
      ai_label: "suspicious_tiny_file",
      reason_category: "file_integrity",
      reason_detail: "File appears corrupted or too small to contain valid image data",
      confidence: 0.95,
      provider: "wedora-simulated-scanner",
    };
  }

  if (fileSize > 100 * 1024 * 1024) {
    return {
      status: "manual_review",
      ai_label: "large_file",
      reason_category: "size_threshold",
      reason_detail: "File exceeds automated scan size threshold, requires manual review",
      confidence: 0.99,
      provider: "wedora-simulated-scanner",
    };
  }

  // Most content passes in simulation
  if (isVideo) {
    return {
      status: "approved",
      ai_label: "video_content_ok",
      reason_category: undefined,
      reason_detail: undefined,
      confidence: 0.92,
      provider: "wedora-simulated-scanner",
    };
  }

  return {
    status: "approved",
    ai_label: "image_content_ok",
    reason_category: undefined,
    reason_detail: undefined,
    confidence: 0.94,
    provider: "wedora-simulated-scanner",
  };
}

// ── Main handler ──

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("VITE_PUBLIC_SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body = await req.json();
    const { asset_id, wedding_id, action } = body || {};

    if (!asset_id || !wedding_id) {
      return new Response(JSON.stringify({ success: false, error: "Missing asset_id or wedding_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    // Update status to scanning
    await supabase.from("gallery_assets").update({
      moderation_status: "scanning",
      updated_at: new Date().toISOString(),
    }).eq("id", asset_id);

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
    const fileName = storagePath.split("/").pop() || "unknown";
    const duration = a.duration_seconds as number | undefined;

    // ── Step 1: File integrity / malware check ──
    const fileCheck = validateFileSafety(buffer, mimeType);
    if (!fileCheck.safe) {
      await supabase.from("gallery_assets").update({
        moderation_status: "rejected",
        moderation_reason: fileCheck.reason || "File failed safety validation",
        moderation_scanned_at: new Date().toISOString(),
        scanned_by: "wedora-file-validator",
        moderation_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", asset_id);

      return new Response(JSON.stringify({
        success: true,
        moderation_status: "rejected",
        reason: fileCheck.reason,
        provider: "wedora-file-validator",
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Step 2: Content safety scan ──
    let scanResult: ModerationResult;
    if (mimeType.startsWith("video/")) {
      scanResult = await simulateContentScan(buffer, mimeType, fileName, duration);
    } else {
      scanResult = await simulateContentScan(buffer, mimeType, fileName);
    }

    // ── Step 3: Fetch moderation rules ──
    const { data: rules } = await supabase
      .from("gallery_moderation_rules")
      .select("*")
      .eq("wedding_id", wedding_id)
      .maybeSingle();

    const moderationRules = rules as Record<string, unknown> | null;
    const manualApprovalRequired = moderationRules?.manual_approval_required !== false;
    const autoApproveTrusted = moderationRules?.auto_approve_trusted_guests === true;

    // Determine final status based on scan + rules
    let finalStatus: string;

    if (scanResult.status === "rejected" || scanResult.status === "held") {
      // AI flagged — reject or hold
      finalStatus = scanResult.status;
    } else if (scanResult.status === "manual_review") {
      finalStatus = "awaiting_review";
    } else if (scanResult.status === "approved") {
      if (manualApprovalRequired) {
        // Check if uploader is a trusted guest (couple-side upload or auto-approve list)
        if (autoApproveTrusted && a.source_type === "couple") {
          finalStatus = "approved";
        } else {
          finalStatus = "awaiting_review";
        }
      } else {
        finalStatus = "approved";
      }
    } else {
      finalStatus = "failed";
    }

    // ── Step 4: Update the asset ──
    await supabase.from("gallery_assets").update({
      moderation_status: finalStatus,
      moderation_ai_label: scanResult.ai_label,
      moderation_reason: scanResult.reason_detail || scanResult.reason_category || null,
      moderation_scanned_at: new Date().toISOString(),
      scanned_by: scanResult.provider,
      moderation_updated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      // If approved, also set wall_visible per rules
      ...(finalStatus === "approved" && moderationRules?.auto_add_to_wall ? {
        wall_visible: true,
        wall_added_at: new Date().toISOString(),
        published_at: new Date().toISOString(),
        publication_status: "published",
      } : finalStatus === "approved" ? {
        published_at: new Date().toISOString(),
        publication_status: "published",
      } : {}),
    }).eq("id", asset_id);

    // ── Step 5: Log audit event ──
    await supabase.from("invitation_activity_log").insert({
      wedding_id,
      event_type: "gallery_moderation",
      summary: `Asset ${asset_id} scanned: ${currentStatus} → ${finalStatus} (${scanResult.ai_label}) via ${scanResult.provider}`,
      actor_type: "system",
      security_metadata: {
        asset_id,
        scan_provider: scanResult.provider,
        confidence: scanResult.confidence,
        ai_label: scanResult.ai_label,
        file_size: buffer.length,
        mime_type: mimeType,
      },
    });

    return new Response(JSON.stringify({
      success: true,
      moderation_status: finalStatus,
      ai_label: scanResult.ai_label,
      confidence: scanResult.confidence,
      provider: scanResult.provider,
      reason: scanResult.reason_detail || null,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("gallery-moderate error:", err);
    return new Response(JSON.stringify({ success: false, error: "An unexpected error occurred during moderation." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
