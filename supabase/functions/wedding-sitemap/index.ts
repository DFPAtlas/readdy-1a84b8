// Public sitemap of couple websites that opted in to search indexing.
// Listed in public/robots.txt (a sitemap on another host is accepted when the
// site's own robots.txt points to it). Read-only; no sign-in.
//   GET  /functions/v1/wedding-sitemap  -> application/xml urlset
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { buildWeddingSitemap, siteOrigin, type SitemapSite } from "../_shared/weddingSitemap.ts";

const EMPTY = buildWeddingSitemap([], "https://vowora.uk");

Deno.serve(async (req: Request) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
  }

  const origin = siteOrigin(Deno.env.get("PUBLIC_SITE_URL"));
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { data, error } = await db.rpc("indexable_wedding_sites", { p_limit: 50000 });
    if (error) throw error;
    const xml = buildWeddingSitemap((data || []) as SitemapSite[], origin);
    return new Response(req.method === "HEAD" ? null : xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        // Crawlers fetch rarely; an hour keeps new opt-ins quick to appear.
        "Cache-Control": "public, max-age=3600",
        "X-Robots-Tag": "noindex",
      },
    });
  } catch (err) {
    console.error("wedding-sitemap error:", err instanceof Error ? err.message : err);
    // A 5xx tells crawlers to come back later instead of dropping the URLs.
    return new Response(EMPTY, {
      status: 503,
      headers: { "Content-Type": "application/xml; charset=utf-8", "Retry-After": "3600", "Cache-Control": "no-store" },
    });
  }
});
