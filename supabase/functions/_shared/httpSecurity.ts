/**
 * Shared HTTP hardening for every Edge Function.
 *
 * `secureServe(handler, options)` is a drop-in replacement for `Deno.serve(handler)`.
 * It leaves each function's own logic alone and post-processes the Response:
 *
 *  - CORS: a wildcard `Access-Control-Allow-Origin: *` is replaced by the request
 *    Origin only when that origin is trusted (vowora.uk, www.vowora.uk, plus the
 *    comma-separated ALLOWED_ORIGINS secret; localhost only when ENVIRONMENT is
 *    development/local). Untrusted origins get no ACAO header, so browsers block
 *    the read. Server-to-server callers (Stripe, Resend, cron) send no Origin and
 *    are unaffected. `cors: false` strips CORS headers entirely (webhooks, workers).
 *  - Security headers: nosniff, Referrer-Policy, X-Frame-Options, HSTS and, for
 *    non-HTML responses, a locked-down CSP.
 *  - Errors: an uncaught exception becomes a generic 500. Details go to the log only.
 */

type Handler = (req: Request) => Response | Promise<Response>;

export interface SecureServeOptions {
  /** false for endpoints that are never called from a browser (webhooks, workers). */
  cors?: boolean;
}

const PRODUCTION_ORIGINS = ["https://vowora.uk", "https://www.vowora.uk"];

function env(name: string): string {
  const deno = (globalThis as typeof globalThis & {
    Deno?: { env: { get(name: string): string | undefined } };
  }).Deno;
  try {
    return deno?.env.get(name) || "";
  } catch {
    return "";
  }
}

/** Pure helper (unit-tested): is `origin` trusted for browser calls? */
export function isTrustedOrigin(
  origin: string | null,
  configured = "",
  local = false,
): boolean {
  if (!origin) return false;
  const extra = configured.split(",").map((value) => value.trim()).filter(Boolean);
  return [...PRODUCTION_ORIGINS, ...extra].some((allowed) =>
    allowed === origin &&
    (/^https:\/\/[^/\s]+$/.test(allowed) ||
      (local && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(allowed)))
  ) || (local && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin));
}

export const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "DENY",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
};

const API_CSP = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'";

/** Pure helper (unit-tested): apply CORS and security headers to a set of headers. */
export function hardenHeaders(
  input: Headers,
  origin: string | null,
  options: { cors: boolean; configured: string; local: boolean },
): Headers {
  const headers = new Headers(input);
  if (!options.cors) {
    for (const name of [
      "Access-Control-Allow-Origin",
      "Access-Control-Allow-Headers",
      "Access-Control-Allow-Methods",
      "Access-Control-Allow-Credentials",
      "Access-Control-Max-Age",
    ]) headers.delete(name);
  } else if (headers.get("Access-Control-Allow-Origin") === "*") {
    headers.delete("Access-Control-Allow-Origin");
    if (isTrustedOrigin(origin, options.configured, options.local)) {
      headers.set("Access-Control-Allow-Origin", origin as string);
    }
    const vary = headers.get("Vary");
    if (!vary || !/\borigin\b/i.test(vary)) {
      headers.set("Vary", vary ? `${vary}, Origin` : "Origin");
    }
  }
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    if (!headers.has(name)) headers.set(name, value);
  }
  const type = headers.get("Content-Type") || "";
  if (!/text\/html/i.test(type) && !headers.has("Content-Security-Policy")) {
    headers.set("Content-Security-Policy", API_CSP);
  }
  return headers;
}

export function genericErrorResponse(cors: boolean): Response {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  };
  if (cors) headers["Access-Control-Allow-Origin"] = "*"; // narrowed by hardenHeaders
  return new Response(
    JSON.stringify({ error: "Something went wrong. Please try again." }),
    { status: 500, headers },
  );
}

export const MAX_JSON_BODY_BYTES = 1_000_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UUID_KEYS = ["wedding_id", "weddingId"];

/**
 * Pure helper (unit-tested): baseline validation of a JSON request body before
 * the function sees it. Returns an error message for a 400/413, or null.
 * Functions still validate their own fields; this guarantees malformed JSON and
 * malformed wedding ids are rejected as 400 rather than surfacing as a 500.
 */
export function baselineJsonError(text: string): { status: number; error: string } | null {
  if (new TextEncoder().encode(text).length > MAX_JSON_BODY_BYTES) {
    return { status: 413, error: "Request body is too large." };
  }
  if (!text.trim()) return null;
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return { status: 400, error: "Request body must be valid JSON." };
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { status: 400, error: "Request body must be a JSON object." };
  }
  for (const key of UUID_KEYS) {
    const value = (body as Record<string, unknown>)[key];
    if (value !== undefined && value !== null && value !== "" &&
      (typeof value !== "string" || !UUID.test(value))) {
      return { status: 400, error: `Invalid ${key}.` };
    }
  }
  return null;
}

function badRequest(status: number, error: string, cors: boolean): Response {
  const headers: Record<string, string> = { "Content-Type": "application/json", "Cache-Control": "no-store" };
  if (cors) headers["Access-Control-Allow-Origin"] = "*"; // narrowed by hardenHeaders
  return new Response(JSON.stringify({ error }), { status, headers });
}

async function preflightBody(req: Request, cors: boolean): Promise<Response | null> {
  // Webhooks (cors: false) must receive the untouched raw body for signature checks.
  if (!cors || !["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return null;
  if (!/application\/json/i.test(req.headers.get("content-type") || "")) return null;
  const declared = Number(req.headers.get("content-length") || 0);
  if (declared > MAX_JSON_BODY_BYTES) return badRequest(413, "Request body is too large.", cors);
  const problem = baselineJsonError(await req.clone().text());
  return problem ? badRequest(problem.status, problem.error, cors) : null;
}

export function secureHandler(handler: Handler, options: SecureServeOptions = {}): Handler {
  const cors = options.cors !== false;
  return async (req: Request) => {
    let response: Response;
    try {
      response = (await preflightBody(req, cors)) ?? await handler(req);
    } catch (error) {
      console.error("unhandled edge function error:", error instanceof Error ? error.message : String(error));
      response = genericErrorResponse(cors);
    }
    const headers = hardenHeaders(response.headers, req.headers.get("origin"), {
      cors,
      configured: env("ALLOWED_ORIGINS"),
      local: ["development", "local"].includes(env("ENVIRONMENT")),
    });
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  };
}

export function secureServe(handler: Handler, options: SecureServeOptions = {}) {
  const deno = (globalThis as typeof globalThis & {
    Deno: { serve(handler: Handler): unknown };
  }).Deno;
  return deno.serve(secureHandler(handler, options));
}
