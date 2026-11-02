// Public "find your table" lookup for the wedding website (/w/:slug/table-lookup).
// Anonymous: a guest proves who they are with their name plus a personal code
// that the couple shared. Reads run with the service role here so seating data is
// never exposed to anonymous table access. Every miss looks the same, and failed
// attempts are rate limited per browser fingerprint.
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { edgeGuestCorsHeaders, sha256Hex } from "../_shared/guestAccess.ts";
import { lookupCodeHash, normaliseGuestName, normaliseLookupCode } from "../_shared/seatingLookup.ts";

const MAX_FAILED_ATTEMPTS = 10;
const RATE_WINDOW_MINUTES = 15;

async function buildFingerprint(req: Request): Promise<string> {
  const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const ua = req.headers.get("user-agent") || "unknown";
  return await sha256Hex(`${ip}:${ua.slice(0, 64)}`);
}

Deno.serve(async (req: Request) => {
  const headers = { ...edgeGuestCorsHeaders(req), "Content-Type": "application/json" };
  const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const unavailable = { available: false };

  try {
    const body = await req.json().catch(() => ({}));
    const { action, slug } = body || {};
    if (typeof slug !== "string" || slug.length < 1 || slug.length > 160) return reply(unavailable);

    const { data: wedding } = await db.from("weddings")
      .select("id, partner_one_name, partner_two_name").eq("slug", slug).maybeSingle();
    if (!wedding) return reply(unavailable);

    // Public lookup is a paid seating feature and must be switched on at publish time.
    const { data: entitled, error: entitlementErr } = await db.rpc("require_wedding_feature", { p_wedding_id: wedding.id, p_feature: "seating" });
    if (entitlementErr || entitled !== true) return reply(unavailable);

    const { data: publication } = await db.from("seating_publications")
      .select("id, seating_plan_id, lookup_settings")
      .eq("wedding_id", wedding.id).eq("status", "published")
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(1).maybeSingle();
    const settings = (publication?.lookup_settings || {}) as Record<string, unknown>;
    if (!publication || settings.mode !== "name_code") return reply(unavailable);

    const couple = [wedding.partner_one_name, wedding.partner_two_name].filter(Boolean).join(" & ");
    if (action === "status") return reply({ available: true, couple });
    if (action !== "lookup") return reply({ error: "Unknown action" }, 400);

    const fingerprint = await buildFingerprint(req);
    const log = (event_type: string, result_type: string) =>
      db.from("seating_lookup_activity").insert({
        wedding_id: wedding.id, publication_id: publication.id, event_type, result_type,
        security_metadata: { fingerprint, method: "name_code" },
      });

    const since = new Date(Date.now() - RATE_WINDOW_MINUTES * 60 * 1000).toISOString();
    const { count: recentFailures } = await db.from("seating_lookup_activity")
      .select("id", { count: "exact", head: true })
      .eq("wedding_id", wedding.id).eq("event_type", "lookup_not_found")
      .eq("security_metadata->>fingerprint", fingerprint).gte("created_at", since);
    if ((recentFailures ?? 0) >= MAX_FAILED_ATTEMPTS) {
      await log("lookup_rate_limited", "rate_limited");
      return reply({ available: true, found: false, rate_limited: true });
    }

    const notFound = async () => {
      await log("lookup_not_found", "not_found");
      return reply({ available: true, found: false });
    };

    const code = normaliseLookupCode(body.code);
    const name = normaliseGuestName(body.name);
    if (!code || !name || name.length > 120) return await notFound();

    const { data: codeRow } = await db.from("seating_lookup_codes")
      .select("guest_id, expires_at")
      .eq("publication_id", publication.id)
      .eq("code_hash", await lookupCodeHash(publication.id, code))
      .eq("status", "active").maybeSingle();
    if (!codeRow || (codeRow.expires_at && new Date(codeRow.expires_at) <= new Date())) return await notFound();

    const { data: guest } = await db.from("guests")
      .select("full_name, preferred_name, last_name")
      .eq("id", codeRow.guest_id).eq("wedding_id", wedding.id).maybeSingle();
    const acceptedNames = guest
      ? [guest.full_name, [guest.preferred_name, guest.last_name].filter(Boolean).join(" ")].map(normaliseGuestName).filter(Boolean)
      : [];
    if (!acceptedNames.includes(name)) return await notFound();

    const { data: assignment } = await db.from("seating_assignments")
      .select("table_id, seating_seat_id, seat_label")
      .eq("plan_id", publication.seating_plan_id).eq("guest_id", codeRow.guest_id).maybeSingle();
    if (!assignment?.table_id) return await notFound();

    const { data: table } = await db.from("seating_tables")
      .select("table_number, name").eq("id", assignment.table_id).maybeSingle();
    let seatLabel: string | null = null;
    if (settings.reveal_seat !== false) {
      seatLabel = assignment.seat_label || null;
      if (!seatLabel && assignment.seating_seat_id) {
        const { data: seat } = await db.from("seating_seats").select("seat_label").eq("id", assignment.seating_seat_id).maybeSingle();
        seatLabel = seat?.seat_label || null;
      }
    }

    await log("lookup_found", "found");
    return reply({
      available: true,
      found: true,
      guest_name: guest!.full_name,
      table_number: table?.table_number || null,
      table_name: table?.name || "",
      seat_label: seatLabel,
    });
  } catch (err) {
    console.error("seating-table-lookup error:", err instanceof Error ? err.message : err);
    return reply({ error: "Lookup is temporarily unavailable." }, 500);
  }
});
