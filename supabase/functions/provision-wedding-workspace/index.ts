import { weddingLocalToUtc } from '../_shared/weddingTime.ts';

import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ── Reserved slugs ──
const RESERVED_SLUGS = [
  "app", "admin", "api", "auth", "guest", "login", "signup",
  "support", "vowora", "wedora", "dashboard", "settings", "onboarding",
  "reset-password", "forgot-password", "callback", "demo", "demo-start",
  "contact", "features", "pricing", "privacy", "terms", "about",
];

// ── Slug generation ──
function generateSlug(displayName: string): string {
  let slug = displayName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (slug.length === 0) slug = "wedding";
  if (slug.length > 50) slug = slug.substring(0, 50).replace(/-$/, "");
  return slug;
}

function generateUniqueSlug(baseSlug: string, attempts: string[]): string {
  if (!attempts.includes(baseSlug) && !RESERVED_SLUGS.includes(baseSlug)) {
    return baseSlug;
  }
  for (let i = 1; i < 100; i++) {
    const candidate = `${baseSlug}-${i}`;
    if (!attempts.includes(candidate)) return candidate;
  }
  return `${baseSlug}-${Date.now().toString(36)}`;
}

// ── Validate payload ──
interface ProvisionPayload {
  partner_one_first: string;
  partner_one_last: string;
  partner_two_first: string;
  partner_two_last: string;
  display_name: string;
  wedding_date: string;
  location: string;
  ceremony_venue: string;
  ceremony_time: string;
  reception_venue: string;
  reception_time: string;
  guest_estimate: number;
  priorities: string[];
  timezone: string;
  publish_website: boolean;
  provisioning_request_id?: string;
}

function validatePayload(p: unknown): { valid: false; error: string } | { valid: true; payload: ProvisionPayload } {
  const data = p as Record<string, unknown>;
  
  if (!data || typeof data !== "object") return { valid: false, error: "Invalid request body" };
  
  const pf = data.partner_one_first as string;
  const pl = typeof data.partner_one_last === "string" ? data.partner_one_last as string : "";
  const tf = data.partner_two_first as string;
  const tl = typeof data.partner_two_last === "string" ? data.partner_two_last as string : "";
  const dn = data.display_name as string;
  const wd = typeof data.wedding_date === "string" ? data.wedding_date as string : "";
  const loc = typeof data.location === "string" ? data.location as string : "";
  const cv = typeof data.ceremony_venue === "string" ? data.ceremony_venue as string : "";
  const ct = data.ceremony_time as string;
  const rv = typeof data.reception_venue === "string" ? data.reception_venue as string : "";
  const rt = data.reception_time as string;
  const ge = data.guest_estimate as number;
  const pr = data.priorities as string[];
  const tz = (data.timezone as string) || "Europe/London";
  const pub = data.publish_website === true;

  if (!pf || typeof pf !== "string" || pf.trim().length === 0) return { valid: false, error: "Partner one first name is required" };
  if (!tf || typeof tf !== "string" || tf.trim().length === 0) return { valid: false, error: "Partner two first name is required" };
  if (wd && !/^\d{4}-\d{2}-\d{2}$/.test(wd)) return { valid: false, error: "A valid wedding date is required" };
  if (typeof ge !== "number" || ge < 1 || ge > 9999) return { valid: false, error: "Guest estimate must be between 1 and 9,999" };
  if (!Array.isArray(pr)) return { valid: false, error: "Priorities must be an array" };

  if (pf.trim().length > 100) return { valid: false, error: "First name is too long" };
  if (pl.trim().length > 100) return { valid: false, error: "Last name is too long" };
  if (tf.trim().length > 100) return { valid: false, error: "Partner two first name is too long" };
  if (tl.trim().length > 100) return { valid: false, error: "Partner two last name is too long" };
  if (loc.trim().length > 500) return { valid: false, error: "Location is too long" };
  if (cv.trim().length > 300) return { valid: false, error: "Ceremony venue name is too long" };
  if (rv.trim().length > 300) return { valid: false, error: "Reception venue name is too long" };

  return {
    valid: true,
    payload: {
      partner_one_first: pf.trim(),
      partner_one_last: pl.trim(),
      partner_two_first: tf.trim(),
      partner_two_last: tl.trim(),
      display_name: (dn || `${pf.trim()} & ${tf.trim()}`).trim(),
      wedding_date: wd,
      location: loc.trim(),
      ceremony_venue: cv.trim(),
      ceremony_time: ct || "13:00",
      reception_venue: rv.trim(),
      reception_time: rt || "15:00",
      guest_estimate: Math.round(ge),
      priorities: pr,
      timezone: tz,
      publish_website: pub,
      provisioning_request_id: (data.provisioning_request_id as string) || undefined,
    },
  };
}

// ── Main handler ──

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const supabaseUrl = (Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_PUBLIC_SUPABASE_URL"))!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    // Separate anon client used only for verifying the caller's JWT; privileged
    // database operations must remain on the service-role client above.
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);

    // ── 1. Validate JWT ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: verifyErr } = await supabaseAuth.auth.getUser(token);

    if (verifyErr || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid or expired session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const userId = user.id;

    // ── 2. Parse and validate payload ──
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const validation = validatePayload(body);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ success: false, error: validation.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const p = validation.payload;
    let ceremony: string | null = null, reception: string | null = null;
    try {
      Intl.DateTimeFormat('en-GB',{timeZone:p.timezone});
      if (p.wedding_date) { ceremony=weddingLocalToUtc(p.wedding_date,p.ceremony_time,p.timezone); reception=weddingLocalToUtc(p.wedding_date,p.reception_time,p.timezone); }
    } catch { return new Response(JSON.stringify({success:false,error:'Please check the wedding date, times and timezone.'}),{status:400,headers:{...corsHeaders,'Content-Type':'application/json'}}); }
    const {data,error} = await supabase.rpc('provision_customer_workspace',{p_user:user.id,p_payload:p,p_ceremony:ceremony,p_reception:reception});
    if (error) throw error;
    return new Response(JSON.stringify(data),{headers:{...corsHeaders,'Content-Type':'application/json'}});

  } catch (err) {
    console.error("provision-wedding-workspace unexpected error:", err);
    return new Response(
      JSON.stringify({ success: false, error: "Something went wrong. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
