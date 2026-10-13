import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { edgeGuestCorsHeaders } from "../_shared/guestAccess.ts";
Deno.serve(async (req) => {
  const headers = {
    ...edgeGuestCorsHeaders(req),
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  };
  const reply = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers });
  if (req.method === "OPTIONS") return reply({});
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  try {
    const { slug } = await req.json();
    if (typeof slug !== "string" || !/^[a-z0-9-]{1,160}$/.test(slug))
      return reply({ error: "Wall unavailable" }, 404);
    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: wedding } = await db
      .from("weddings")
      .select("id,title,hashtag")
      .eq("slug", slug)
      .maybeSingle();
    if (!wedding) return reply({ error: "Wall unavailable" }, 404);
    const [{ data: rules }, { data: portal }] = await Promise.all([
      db
        .from("gallery_moderation_rules")
        .select("provider_config")
        .eq("wedding_id", wedding.id)
        .maybeSingle(),
      db
        .from("guest_portal_settings")
        .select("portal_enabled,portal_closes_at")
        .eq("wedding_id", wedding.id)
        .maybeSingle(),
    ]);
    const config = rules?.provider_config?.live_wall;
    if (
      !config?.enabled ||
      !portal?.portal_enabled ||
      (portal.portal_closes_at &&
        new Date(portal.portal_closes_at) <= new Date())
    )
      return reply({ error: "Wall unavailable" }, 404);
    const { data: assets, error } = await db
      .from("gallery_assets")
      .select("id,caption,storage_path")
      .eq("wedding_id", wedding.id)
      .eq("moderation_status", "approved")
      .eq("wall_visible", true)
      .eq("publication_status", "published")
      .like("mime_type", "image/%")
      .order("wall_added_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    const photos = await Promise.all(
      (assets || []).map(async (asset) => {
        const { data } = await db.storage
          .from("private")
          .createSignedUrl(asset.storage_path, 300);
        return {
          id: asset.id,
          caption: config.show_captions ? asset.caption : null,
          url: data?.signedUrl,
        };
      }),
    );
    return reply({
      title: config.show_couple_names ? wedding.title : null,
      hashtag: config.show_hashtag ? config.hashtag || wedding.hashtag : null,
      background:
        config.background_style === "solid" &&
        /^#[0-9a-f]{6}$/i.test(config.background_color || "")
          ? config.background_color
          : config.background_style === "gradient"
            ? "linear-gradient(135deg,#1c1917,#44403c)"
            : "#000000",
      blur: config.background_style === "blur",
      shuffle: config.shuffle === true,
      transition: ["fade", "slide", "none"].includes(config.transition_style)
        ? config.transition_style
        : "none",
      paused: config.paused === true,
      duration: Math.max(
        2000,
        Math.min(30000, Number(config.photo_duration_ms) || 5000),
      ),
      photos: photos.filter((photo) => photo.url),
    });
  } catch {
    return reply({ error: "The photo wall could not be loaded." }, 503);
  }
});
