// Public: the wedding-wide photo upload link opened from the live wall QR code.
//   JSON { action: "status", token }            -> what the upload page should show
//   multipart { token, name, caption?, file }   -> upload one photo
// Every photo uploaded this way waits in the couple's approval queue (it is never
// auto-approved or sent to the wall), attempts are rate limited per device, and the
// gallery storage limit is enforced by the database.
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.57.4";
import { edgeGuestCorsHeaders, sha256Hex } from "../_shared/guestAccess.ts";
import { entitlementErrorResponse, requireEntitlement } from "../_shared/requireEntitlement.ts";
import {
  SHARED_UPLOAD_DEVICE_LIMIT,
  SHARED_UPLOAD_WEDDING_LIMIT,
  cleanText,
  cleanUploaderName,
  maxUploadBytes,
  sniffImageType,
  uploadWindow,
  validSharedUploadToken,
} from "../_shared/sharedUpload.ts";

type Db = SupabaseClient;

async function fingerprintOf(req: Request): Promise<string> {
  const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const ua = req.headers.get("user-agent") || "unknown";
  return await sha256Hex(`${ip}:${ua.slice(0, 64)}`);
}

interface LinkState {
  weddingId: string;
  albumId: string;
  title: string;
  maxBytes: number;
  window: "open" | "not_open" | "closed";
  photosAllowed: boolean;
}

/** Null when the link does not exist, is switched off, or has no album. */
async function loadLink(db: Db, token: string): Promise<LinkState | null> {
  const { data: link } = await db.from("gallery_shared_upload_links")
    .select("wedding_id, album_id, enabled").eq("token", token).maybeSingle();
  if (!link || !link.enabled || !link.album_id) return null;
  const weddingId = link.wedding_id as string;
  const [{ data: wedding }, { data: album }, { data: rules }, { data: settings }] = await Promise.all([
    db.from("weddings").select("title, partner_one_name, partner_two_name").eq("id", weddingId).maybeSingle(),
    db.from("gallery_albums").select("id").eq("id", link.album_id).eq("wedding_id", weddingId).is("archived_at", null).maybeSingle(),
    db.from("gallery_moderation_rules").select("photos_allowed, max_file_size_bytes").eq("wedding_id", weddingId).maybeSingle(),
    db.from("gallery_upload_settings").select("opens_at, closes_at").eq("wedding_id", weddingId).maybeSingle(),
  ]);
  if (!wedding || !album) return null;
  const names = [wedding.partner_one_name, wedding.partner_two_name].filter(Boolean).join(" & ");
  return {
    weddingId,
    albumId: album.id as string,
    title: (wedding.title as string | null) || names || "Our wedding",
    maxBytes: maxUploadBytes(rules?.max_file_size_bytes),
    window: uploadWindow(settings?.opens_at as string | null, settings?.closes_at as string | null),
    photosAllowed: rules?.photos_allowed !== false,
  };
}

Deno.serve(async (req: Request) => {
  const headers = { ...edgeGuestCorsHeaders(req), "Content-Type": "application/json" };
  const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const unavailable = () => reply({ available: false, error: "This photo upload link isn't active. Please ask the couple for a new one." }, 404);

  try {
    const isJson = (req.headers.get("content-type") || "").includes("application/json");
    if (isJson) {
      const body = await req.json().catch(() => ({}));
      if (body?.action !== "status" || !validSharedUploadToken(body?.token)) return unavailable();
      const link = await loadLink(db, body.token);
      if (!link) return unavailable();
      await requireEntitlement(db, link.weddingId, "gallery");
      return reply({
        available: true,
        title: link.title,
        window: link.window,
        photos_allowed: link.photosAllowed,
        max_bytes: link.maxBytes,
        types: ["image/jpeg", "image/png", "image/webp"],
      });
    }

    const form = await req.formData().catch(() => null);
    const token = form?.get("token");
    if (!form || !validSharedUploadToken(token)) return unavailable();
    const link = await loadLink(db, token);
    if (!link) return unavailable();
    await requireEntitlement(db, link.weddingId, "gallery");

    const fingerprint = await fingerprintOf(req);
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const [{ count: deviceCount }, { count: weddingCount }] = await Promise.all([
      db.from("gallery_shared_upload_activity").select("id", { count: "exact", head: true })
        .eq("wedding_id", link.weddingId).eq("fingerprint", fingerprint).gte("created_at", since),
      db.from("gallery_shared_upload_activity").select("id", { count: "exact", head: true })
        .eq("wedding_id", link.weddingId).eq("outcome", "uploaded").gte("created_at", since),
    ]);
    if ((deviceCount ?? 0) >= SHARED_UPLOAD_DEVICE_LIMIT || (weddingCount ?? 0) >= SHARED_UPLOAD_WEDDING_LIMIT) {
      return new Response(JSON.stringify({ error: "Lots of photos are arriving right now. Please try again in a little while." }), {
        status: 429, headers: { ...headers, "Retry-After": "600" },
      });
    }
    const record = (outcome: string) =>
      db.from("gallery_shared_upload_activity").insert({ wedding_id: link.weddingId, fingerprint, outcome });

    if (link.window === "not_open") return reply({ error: "Photo uploads haven't opened yet." }, 403);
    if (link.window === "closed") return reply({ error: "Photo uploads have closed." }, 403);
    if (!link.photosAllowed) return reply({ error: "Photo uploads are switched off for this wedding." }, 403);

    const name = cleanUploaderName(form.get("name"));
    if (!name) return reply({ error: "Please add your name so the couple know who shared the photo." }, 400);
    const caption = cleanText(form.get("caption"), 200) || null;
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) return reply({ error: "Please choose a photo." }, 400);
    if (file.size > link.maxBytes) {
      await record("too_large");
      return reply({ error: `That photo is too large (max ${Math.floor(link.maxBytes / 1048576)} MB).` }, 413);
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const type = sniffImageType(bytes);
    if (!type) {
      await record("bad_type");
      return reply({ error: "Please upload a JPG, PNG or WebP photo." }, 415);
    }

    // Same raw-bytes SHA-256 as guest-gallery-upload, so duplicates match across both routes.
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), (b) => b.toString(16).padStart(2, "0")).join("");
    const { data: duplicate } = await db.from("gallery_assets").select("id")
      .eq("wedding_id", link.weddingId).eq("original_file_hash", hash).limit(1).maybeSingle();
    if (duplicate) {
      await record("duplicate");
      return reply({ error: "This photo has already been shared — thank you!" }, 409);
    }

    const ext = type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";
    const path = `galleries/${link.weddingId}/${link.albumId}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadErr } = await db.storage.from("private").upload(path, bytes, { contentType: type, upsert: false });
    if (uploadErr) {
      await record("storage_error");
      const full = /limit/i.test(uploadErr.message || "");
      console.error("gallery-shared-upload storage:", uploadErr.message);
      return reply({ error: full ? "The couple's photo storage is full." : "Upload failed. Please try again." }, full ? 507 : 500);
    }

    const { data: asset, error: insertErr } = await db.from("gallery_assets").insert({
      wedding_id: link.weddingId,
      album_id: link.albumId,
      title: caption || `Photo from ${name}`,
      caption,
      description: "Shared through the wedding photo link",
      storage_path: path,
      file_size: bytes.length,
      mime_type: type,
      moderation_status: "pending",
      original_file_hash: hash,
      metadata_stripped: false,
      source_type: "guest",
      publication_status: "draft",
      wall_visible: false,
      credit_name: name,
    }).select("id").single();
    if (insertErr || !asset) {
      await db.storage.from("private").remove([path]);
      await record("db_error");
      console.error("gallery-shared-upload insert:", insertErr?.message);
      return reply({ error: "Upload failed. Please try again." }, 500);
    }

    await record("uploaded");
    return reply({ success: true, id: asset.id });
  } catch (err) {
    if (entitlementErrorResponse(err, headers)) return unavailable();
    console.error("gallery-shared-upload error:", err instanceof Error ? err.message : err);
    return reply({ error: "Something went wrong. Please try again." }, 500);
  }
});
