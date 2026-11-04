// Server-to-server endpoint for Tron, DFG's own server, which runs the photo
// safety checks on its GPU. Tron calls out to this function; nothing calls Tron.
//   { action: "health" }                    -> queue size (check the secret works)
//   { action: "claim", limit?: 1..25 }      -> photos to check, with 10-minute download links
//   { action: "result", asset_id, verdict: "clean"|"flagged"|"error", labels?, score?, model?, reason? }
// Every request must send the shared secret in the x-worker-secret header
// (GALLERY_SCAN_WORKER_SECRET). Moderation rules are applied in the database by
// record_gallery_scan(); a failed or missing check never approves anything.
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { claimLimit, parseScanResult, secretsMatch } from "../_shared/scanWorker.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const expected = Deno.env.get("GALLERY_SCAN_WORKER_SECRET");
  if (!expected) return json({ error: "Scan worker is not configured" }, 503);
  if (!secretsMatch(req.headers.get("x-worker-secret"), expected)) return json({ error: "Unauthorized" }, 401);

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  try {
    const body = await req.json().catch(() => null);
    const action = body?.action;

    if (action === "health") {
      const { count, error } = await db.from("gallery_assets").select("id", { count: "exact", head: true })
        .in("scan_status", ["queued", "claimed"]);
      if (error) throw error;
      return json({ ok: true, waiting: count ?? 0 });
    }

    if (action === "claim") {
      const { data, error } = await db.rpc("claim_gallery_scans", { p_limit: claimLimit(body?.limit) });
      if (error) throw error;
      const rows = (data || []) as Array<{ asset_id: string; wedding_id: string; storage_path: string; mime_type: string }>;
      const items = [];
      for (const row of rows) {
        const { data: signed } = await db.storage.from("private").createSignedUrl(row.storage_path, 600);
        if (!signed?.signedUrl) {
          await db.rpc("record_gallery_scan", { p_asset_id: row.asset_id, p_verdict: "error" });
          continue;
        }
        items.push({ asset_id: row.asset_id, mime_type: row.mime_type, url: signed.signedUrl });
      }
      return json({ items });
    }

    if (action === "result") {
      const result = parseScanResult(body);
      if (!result) return json({ error: "Invalid result" }, 400);
      const { data, error } = await db.rpc("record_gallery_scan", {
        p_asset_id: result.asset_id,
        p_verdict: result.verdict,
        p_labels: result.labels,
        p_score: result.score,
        p_model: result.model ? `tron:${result.model}` : "tron",
        p_reason: result.reason,
      });
      if (error) throw error;
      return json({ ok: true, status: data });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    console.error("gallery-scan-worker error:", err instanceof Error ? err.message : err);
    return json({ error: "Server error" }, 500);
  }
});
