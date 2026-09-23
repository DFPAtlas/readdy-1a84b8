/** Guest credentials are bearer secrets. Database columns named session_hash store only SHA-256 digests. */
export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

export function newGuestSessionSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
}

export function validGuestSessionSecret(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
}

export function guestCorsHeaders(origin: string | null, configured = "", local = false): Record<string, string> {
  const production = ["https://vowora.uk", "https://www.vowora.uk"];
  const extra = configured.split(",").map(value => value.trim()).filter(Boolean);
  const allowed = new Set([...production, ...extra].filter(value =>
    /^https:\/\/[^/]+$/.test(value) || (local && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(value))
  ));
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-idempotency-key",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Cache-Control": "private, no-store, no-cache, max-age=0",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "Vary": "Origin",
  };
  if (origin && allowed.has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

export function edgeGuestCorsHeaders(req: Request): Record<string, string> {
  return guestCorsHeaders(
    req.headers.get("origin"),
    Deno.env.get("ALLOWED_ORIGINS") || "",
    ["development", "local"].includes(Deno.env.get("ENVIRONMENT") || ""),
  );
}
