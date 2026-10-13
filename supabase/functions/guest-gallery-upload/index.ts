import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { sha256Hex, validGuestSessionSecret } from "../_shared/guestAccess.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];

// ── SHA-256 hashing ──

async function sha256(buffer: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", new Uint8Array(buffer));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// The browser holds the raw guest session credential; only its SHA-256 hash is
// stored in guest_access_sessions.session_hash, so hash before every lookup.
function sha256String(text: string): Promise<string> {
  return sha256(new TextEncoder().encode(text));
}

// ── Rate limiting store ──

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

// Cleanup every 5 minutes
setInterval(() => {
  const cutoff = Date.now() - 10 * 60 * 1000;
  for (const [key, entry] of rateLimitStore) {
    if (entry.windowStart < cutoff) rateLimitStore.delete(key);
  }
}, 300000);

// ── Main handler ──

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = (Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_PUBLIC_SUPABASE_URL"))!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const formData = await req.formData();
    const sessionHash = formData.get("session_hash") as string;
    const albumId = formData.get("album_id") as string;
    const title = (formData.get("title") as string) || null;
    const file = formData.get("file") as File | null;
    const consentMetadata = formData.get("consent_metadata") === "true";

    if (!validGuestSessionSecret(sessionHash) || !albumId || !file) {
      return new Response(JSON.stringify({ success: false, error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate session
    const { data: session } = await supabase
      .from("guest_access_sessions")
      .select("id, wedding_id, invitation_id")
      .eq("session_hash", await sha256Hex(sessionHash))
      .eq("status", "active")
      .maybeSingle();

    if (!session) {
      return new Response(JSON.stringify({ success: false, error: "Invalid session" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate album
    const { data: album } = await supabase
      .from("gallery_albums")
      .select("id, allow_uploads, wedding_id")
      .eq("id", albumId)
      .eq("wedding_id", session.wedding_id)
      .eq("is_published", true)
      .maybeSingle();

    if (!album || !(album as { allow_uploads: boolean }).allow_uploads) {
      return new Response(JSON.stringify({ success: false, error: "Uploads not allowed for this album" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch moderation rules
    const { data: rules } = await supabase
      .from("gallery_moderation_rules")
      .select("*")
      .eq("wedding_id", session.wedding_id)
      .maybeSingle();

    const modRules = rules as Record<string, unknown> | null;

    // Check media type rules
    const isVideo = file.type.startsWith("video/");
    if (isVideo && modRules?.videos_allowed === false) {
      return new Response(JSON.stringify({
        success: false,
        error: "Video uploads are not currently allowed for this wedding.",
      }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!isVideo && modRules?.photos_allowed === false) {
      return new Response(JSON.stringify({
        success: false,
        error: "Photo uploads are not currently allowed for this wedding.",
      }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return new Response(JSON.stringify({
        success: false,
        error: `File type "${file.type || "unknown"}" is not supported. Please upload ${ALLOWED_IMAGE_TYPES.map(t => t.split("/")[1].toUpperCase()).join(", ")} images or ${ALLOWED_VIDEO_TYPES.map(t => t.split("/")[1].toUpperCase()).join(", ")} videos.`,
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Validate file size
    const maxSize = (modRules?.max_file_size_bytes as number) || MAX_FILE_SIZE;
    if (file.size > maxSize) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      const maxMB = (maxSize / (1024 * 1024)).toFixed(0);
      return new Response(JSON.stringify({
        success: false,
        error: `File is ${sizeMB} MB — maximum allowed size is ${maxMB} MB.`,
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Rate limit per session (5 uploads per minute)
    const rateKey = `upload:${sessionHash}`;
    if (!checkRateLimit(rateKey, 5, 60000)) {
      return new Response(JSON.stringify({
        success: false,
        error: "You're uploading too quickly. Please wait a moment and try again.",
      }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "30" } });
    }

    // Check max uploads per guest
    if (modRules?.max_uploads_per_guest) {
      const maxUploads = modRules.max_uploads_per_guest as number;
      const { data: recipients } = await supabase
        .from("invitation_recipients")
        .select("guest_id")
        .eq("invitation_id", session.invitation_id);
      const guestIds = (recipients || []).map((r: { guest_id: string }) => r.guest_id);

      const { count: existingCount } = await supabase
        .from("gallery_assets")
        .select("id", { count: "exact", head: true })
        .eq("wedding_id", session.wedding_id)
        .in("uploaded_by_guest_id", guestIds);

      if ((existingCount || 0) >= maxUploads) {
        return new Response(JSON.stringify({
          success: false,
          error: `You've reached the maximum of ${maxUploads} uploads.`,
        }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Get guest IDs
    const { data: recipients } = await supabase
      .from("invitation_recipients")
      .select("guest_id")
      .eq("invitation_id", session.invitation_id);
    const guestIds = (recipients || []).map((r: { guest_id: string }) => r.guest_id);
    const primaryGuestId = guestIds[0];

    // Read file bytes
    const arrayBuffer = await file.arrayBuffer();
    const fileBytes = new Uint8Array(arrayBuffer);

    // Compute SHA-256 hash for duplicate detection
    const fileHash = await sha256(fileBytes);

    // Check for duplicate
    const { data: duplicate } = await supabase
      .from("gallery_assets")
      .select("id, moderation_status")
      .eq("wedding_id", session.wedding_id)
      .eq("original_file_hash", fileHash)
      .maybeSingle();

    if (duplicate) {
      return new Response(JSON.stringify({
        success: false,
        error: "This exact file has already been uploaded. Duplicate uploads are not allowed.",
        duplicate_asset_id: (duplicate as { id: string }).id,
      }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Build storage path
    const ext = file.name.split(".").pop()?.toLowerCase() || (isVideo ? "mp4" : "jpg");
    const safeExt = ext.replace(/[^a-z0-9]/g, "");
    const fileName = `${crypto.randomUUID()}.${safeExt}`;
    const storagePath = `galleries/${session.wedding_id}/${albumId}/${fileName}`;

    // ── Upload to private bucket ──
    const { error: uploadErr } = await supabase.storage
      .from("private")
      .upload(storagePath, fileBytes, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadErr) {
      console.error("Upload error:", uploadErr);
      return new Response(JSON.stringify({ success: false, error: "Failed to upload file. Please try again." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Insert asset record ──
    const { data: asset, error: insertErr } = await supabase
      .from("gallery_assets")
      .insert({
        album_id: albumId,
        wedding_id: session.wedding_id,
        title: title || file.name.replace(/\.[^.]+$/, ""),
        storage_path: storagePath,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by_guest_id: primaryGuestId || null,
        uploaded_by_invitation_id: session.invitation_id,
        moderation_status: "pending",
        original_file_hash: fileHash,
        metadata_stripped: !consentMetadata,
        source_type: "guest",
        publication_status: "draft",
      })
      .select("*")
      .single();

    if (insertErr) {
      console.error("Insert error:", insertErr);
      await supabase.storage.from("private").remove([storagePath]);
      return new Response(JSON.stringify({ success: false, error: "Failed to save upload record." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate signed URL
    const { data: signedUrlData } = await supabase.storage
      .from("private")
      .createSignedUrl(storagePath, 3600);

    // ── Trigger moderation scan (non-blocking fire-and-forget) ──
    const moderateUrl = `${supabaseUrl}/functions/v1/gallery-moderate`;
    const modPayload = {
      asset_id: (asset as { id: string }).id,
      wedding_id: session.wedding_id,
      action: "scan",
    };

    // Fire and forget — don't block the upload response
    fetch(moderateUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify(modPayload),
    }).catch((e) => console.error("Moderation trigger failed:", e));

    return new Response(JSON.stringify({
      success: true,
      asset: {
        id: (asset as { id: string }).id,
        title: (asset as { title?: string }).title,
        storage_path: (asset as { storage_path: string }).storage_path,
        mime_type: (asset as { mime_type: string }).mime_type,
        file_size: (asset as { file_size: number }).file_size,
        moderation_status: "pending",
        signed_url: signedUrlData?.signedUrl || "",
        created_at: (asset as { created_at: string }).created_at,
      },
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("guest-gallery-upload error:", err);
    return new Response(JSON.stringify({ success: false, error: "An unexpected error occurred." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
