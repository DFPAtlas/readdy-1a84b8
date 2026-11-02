// Couple-facing: issue and list personal "find your table" codes for a published
// seating plan. Codes are derived from a server secret, so calling this again
// returns the same codes (reprint any time). Only hashes are stored. Guests who
// are no longer seated have their code revoked.
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { edgeGuestCorsHeaders } from "../_shared/guestAccess.ts";
import { entitlementErrorResponse, requireEntitlement } from "../_shared/requireEntitlement.ts";
import {
  deriveLookupCode,
  formatLookupCode,
  lookupCodeHash,
  seatingLookupSecret,
} from "../_shared/seatingLookup.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req: Request) => {
  const headers = { ...edgeGuestCorsHeaders(req), "Content-Type": "application/json" };
  const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);

  try {
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const auth = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authErr } = await auth.auth.getUser(
      (req.headers.get("Authorization") || "").replace(/^Bearer /i, ""),
    );
    if (authErr || !user) return reply({ error: "Sign in to continue." }, 401);

    const { wedding_id: weddingId, plan_id: planId } = await req.json().catch(() => ({}));
    if (typeof weddingId !== "string" || !UUID.test(weddingId) || typeof planId !== "string" || !UUID.test(planId)) {
      return reply({ error: "Invalid request." }, 400);
    }

    const { data: membership } = await db.from("wedding_members").select("role")
      .eq("wedding_id", weddingId).eq("user_id", user.id).eq("status", "active").maybeSingle();
    if (!membership || !["owner", "partner", "planner"].includes(membership.role)) {
      return reply({ error: "Only the couple or their planner can view lookup codes." }, 403);
    }
    await requireEntitlement(db, weddingId, "seating", membership.role);

    const { data: wedding } = await db.from("weddings").select("slug").eq("id", weddingId).maybeSingle();
    const { data: publication } = await db.from("seating_publications")
      .select("id, lookup_settings")
      .eq("wedding_id", weddingId).eq("seating_plan_id", planId).eq("status", "published")
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(1).maybeSingle();
    if (!publication || (publication.lookup_settings as Record<string, unknown> | null)?.mode !== "name_code") {
      return reply({ enabled: false, codes: [] });
    }

    const secret = seatingLookupSecret((name) => Deno.env.get(name));
    if (!secret) return reply({ error: "Table lookup is not configured." }, 500);

    const { data: assignments, error: assignErr } = await db.from("seating_assignments")
      .select("guest_id, table_id, seat_label").eq("plan_id", planId).eq("wedding_id", weddingId);
    if (assignErr) throw assignErr;
    const seated = (assignments || []).filter((a) => a.guest_id && a.table_id);
    const guestIds = [...new Set(seated.map((a) => a.guest_id as string))];
    const tableIds = [...new Set(seated.map((a) => a.table_id as string))];

    const [{ data: guests }, { data: tables }] = await Promise.all([
      guestIds.length ? db.from("guests").select("id, full_name").in("id", guestIds).eq("wedding_id", weddingId) : Promise.resolve({ data: [] }),
      tableIds.length ? db.from("seating_tables").select("id, table_number, name").in("id", tableIds) : Promise.resolve({ data: [] }),
    ]);
    const guestById = new Map((guests || []).map((g: { id: string; full_name: string }) => [g.id, g]));
    const tableById = new Map((tables || []).map((t: { id: string; table_number: number | null; name: string | null }) => [t.id, t]));

    const rows: Array<Record<string, unknown>> = [];
    const codes: Array<{ guest_name: string; table: string; seat_label: string | null; code: string }> = [];
    for (const a of seated) {
      const guest = guestById.get(a.guest_id as string);
      if (!guest || rows.some((r) => r.guest_id === guest.id)) continue;
      const code = await deriveLookupCode(secret, publication.id, guest.id);
      rows.push({
        wedding_id: weddingId, seating_plan_id: planId, publication_id: publication.id, guest_id: guest.id,
        code_hash: await lookupCodeHash(publication.id, code), status: "active", revoked_at: null,
      });
      const table = tableById.get(a.table_id as string);
      codes.push({
        guest_name: guest.full_name,
        table: table ? (table.table_number ? `Table ${table.table_number}${table.name ? ` (${table.name})` : ""}` : table.name || "") : "",
        seat_label: (a.seat_label as string | null) || null,
        code: formatLookupCode(code),
      });
    }

    if (rows.length) {
      const { error: upsertErr } = await db.from("seating_lookup_codes").upsert(rows, { onConflict: "publication_id,guest_id" });
      if (upsertErr) throw upsertErr;
    }
    // Revoke codes for guests who have since been unseated.
    let revoke = db.from("seating_lookup_codes").update({ status: "revoked", revoked_at: new Date().toISOString() })
      .eq("publication_id", publication.id).eq("status", "active");
    if (guestIds.length) revoke = revoke.not("guest_id", "in", `(${guestIds.join(",")})`);
    const { error: revokeErr } = await revoke;
    if (revokeErr) throw revokeErr;

    codes.sort((x, y) => x.guest_name.localeCompare(y.guest_name));
    return reply({ enabled: true, lookup_path: wedding?.slug ? `/w/${wedding.slug}/table-lookup` : null, codes });
  } catch (err) {
    const denied = entitlementErrorResponse(err, headers);
    if (denied) return denied;
    console.error("seating-lookup-codes error:", err instanceof Error ? err.message : err);
    return reply({ error: "Could not load lookup codes." }, 500);
  }
});
