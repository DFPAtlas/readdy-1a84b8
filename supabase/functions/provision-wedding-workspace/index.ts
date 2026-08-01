import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

const DEFAULT_ALLOWED_ORIGINS = [
  "https://wedora.uk",
  "https://www.wedora.uk",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

const RESERVED_SLUGS = new Set([
  "app", "admin", "api", "auth", "guest", "login", "signup",
  "support", "wedora", "dashboard", "settings", "onboarding",
  "reset-password", "forgot-password", "callback", "demo", "demo-start",
  "contact", "features", "pricing", "privacy", "terms", "about",
  "cookies", "subprocessors", "content-rules", "dpa", "retention",
  "unsubscribe", "live-wall", "invite", "w",
]);

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

type JsonRecord = Record<string, unknown>;

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return true;

  const configured = (Deno.env.get("ALLOWED_ORIGINS") || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const allowed = new Set([...DEFAULT_ALLOWED_ORIGINS, ...configured]);
  if (allowed.has(origin)) return true;

  try {
    const hostname = new URL(origin).hostname.toLowerCase();
    return hostname.endsWith(".helloreaddy.com") ||
      hostname.endsWith(".readdy.ai") ||
      hostname.endsWith(".readdy-site.link");
  } catch {
    return false;
  }
}

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin");
  return {
    "Access-Control-Allow-Origin": origin && isAllowedOrigin(origin) ? origin : "https://wedora.uk",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function jsonResponse(req: Request, status: number, body: JsonRecord): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(req),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function generateSlug(displayName: string): string {
  let slug = displayName
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (!slug) slug = "wedding";
  if (slug.length > 50) slug = slug.slice(0, 50).replace(/-$/, "");
  return RESERVED_SLUGS.has(slug) ? `${slug}-wedding` : slug;
}

function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: value }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function localDateTimeToUtcIso(date: string, time: string, timeZone: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match || !timeMatch) return null;

  const [, year, month, day] = match.map(Number);
  const [, hour, minute] = timeMatch.map(Number);
  const target = Date.UTC(year, month - 1, day, hour, minute, 0);

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const getOffset = (timestamp: number): number => {
    const parts = Object.fromEntries(
      formatter.formatToParts(new Date(timestamp))
        .filter((part) => part.type !== "literal")
        .map((part) => [part.type, Number(part.value)]),
    );
    const representedAsUtc = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    );
    return representedAsUtc - timestamp;
  };

  let utc = target - getOffset(target);
  utc = target - getOffset(utc);
  return new Date(utc).toISOString();
}

function validatePayload(input: unknown):
  | { valid: false; error: string }
  | { valid: true; payload: ProvisionPayload } {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { valid: false, error: "Invalid request body" };
  }

  const data = input as JsonRecord;
  const text = (key: string): string => typeof data[key] === "string" ? (data[key] as string).trim() : "";

  const partnerOneFirst = text("partner_one_first");
  const partnerOneLast = text("partner_one_last");
  const partnerTwoFirst = text("partner_two_first");
  const partnerTwoLast = text("partner_two_last");
  const weddingDate = text("wedding_date");
  const location = text("location");
  const ceremonyVenue = text("ceremony_venue");
  const receptionVenue = text("reception_venue");
  const ceremonyTime = text("ceremony_time") || "13:00";
  const receptionTime = text("reception_time") || "15:00";
  const timezone = text("timezone") || "Europe/London";
  const priorities = data.priorities;
  const guestEstimate = data.guest_estimate;
  const requestId = text("provisioning_request_id") || undefined;

  if (!partnerOneFirst) return { valid: false, error: "Partner one first name is required" };
  if (!partnerOneLast) return { valid: false, error: "Partner one last name is required" };
  if (!partnerTwoFirst) return { valid: false, error: "Partner two first name is required" };
  if (!partnerTwoLast) return { valid: false, error: "Partner two last name is required" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weddingDate)) return { valid: false, error: "A valid wedding date is required" };
  if (Number.isNaN(Date.parse(`${weddingDate}T00:00:00Z`))) return { valid: false, error: "A valid wedding date is required" };
  if (!location) return { valid: false, error: "Location is required" };
  if (!ceremonyVenue) return { valid: false, error: "Ceremony venue is required" };
  if (!receptionVenue) return { valid: false, error: "Reception venue is required" };
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(ceremonyTime)) return { valid: false, error: "Ceremony time is invalid" };
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(receptionTime)) return { valid: false, error: "Reception time is invalid" };
  if (typeof guestEstimate !== "number" || !Number.isFinite(guestEstimate) || guestEstimate < 1 || guestEstimate > 9999) {
    return { valid: false, error: "Guest estimate must be between 1 and 9,999" };
  }
  if (!Array.isArray(priorities) || priorities.some((item) => typeof item !== "string")) {
    return { valid: false, error: "Priorities must be an array of text values" };
  }
  if (priorities.length > 25) return { valid: false, error: "Too many planning priorities" };
  if (!isValidTimeZone(timezone)) return { valid: false, error: "Timezone is invalid" };
  if (requestId && (requestId.length > 128 || !/^[A-Za-z0-9._:-]+$/.test(requestId))) {
    return { valid: false, error: "Provisioning request ID is invalid" };
  }

  const lengthChecks: Array<[string, string, number]> = [
    [partnerOneFirst, "Partner one first name", 100],
    [partnerOneLast, "Partner one last name", 100],
    [partnerTwoFirst, "Partner two first name", 100],
    [partnerTwoLast, "Partner two last name", 100],
    [location, "Location", 500],
    [ceremonyVenue, "Ceremony venue", 300],
    [receptionVenue, "Reception venue", 300],
  ];
  for (const [value, label, max] of lengthChecks) {
    if (value.length > max) return { valid: false, error: `${label} is too long` };
  }

  const displayName = text("display_name") || `${partnerOneFirst} & ${partnerTwoFirst}`;
  if (displayName.length > 200) return { valid: false, error: "Wedding display name is too long" };

  return {
    valid: true,
    payload: {
      partner_one_first: partnerOneFirst,
      partner_one_last: partnerOneLast,
      partner_two_first: partnerTwoFirst,
      partner_two_last: partnerTwoLast,
      display_name: displayName,
      wedding_date: weddingDate,
      location,
      ceremony_venue: ceremonyVenue,
      ceremony_time: ceremonyTime,
      reception_venue: receptionVenue,
      reception_time: receptionTime,
      guest_estimate: Math.round(guestEstimate),
      priorities: priorities.map((item) => item.trim()).filter(Boolean),
      timezone,
      publish_website: data.publish_website === true,
      provisioning_request_id: requestId,
    },
  };
}

async function fetchWeddingSummary(supabase: SupabaseClient, weddingId: string) {
  const { data } = await supabase
    .from("weddings")
    .select("id, title, slug, partner_one_name, partner_two_name, wedding_date, status, timezone")
    .eq("id", weddingId)
    .maybeSingle();
  return data;
}

async function markRequest(
  supabase: SupabaseClient,
  requestId: string | undefined,
  values: JsonRecord,
): Promise<void> {
  if (!requestId) return;
  const { error } = await supabase
    .from("provisioning_requests")
    .update(values)
    .eq("request_id", requestId);
  if (error) console.error("provisioning request update failed", error);
}

async function rollbackWedding(supabase: SupabaseClient, weddingId: string | null): Promise<void> {
  if (!weddingId) return;
  const { error } = await supabase.from("weddings").delete().eq("id", weddingId);
  if (error) console.error("wedding rollback failed", error);
}

Deno.serve(async (req: Request) => {
  if (!isAllowedOrigin(req.headers.get("Origin"))) {
    return jsonResponse(req, 403, { success: false, error: "Origin is not allowed" });
  }

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }

  if (req.method !== "POST") {
    return jsonResponse(req, 405, { success: false, error: "Method not allowed" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return jsonResponse(req, 500, { success: false, error: "Service configuration error" });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const authHeader = req.headers.get("Authorization") || "";
  const tokenMatch = /^Bearer\s+(.+)$/i.exec(authHeader);
  if (!tokenMatch) {
    return jsonResponse(req, 401, { success: false, error: "Authentication required" });
  }

  const { data: authData, error: authError } = await supabase.auth.getUser(tokenMatch[1]);
  if (authError || !authData.user) {
    return jsonResponse(req, 401, { success: false, error: "Invalid or expired session" });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(req, 400, { success: false, error: "Invalid request body" });
  }

  const validation = validatePayload(body);
  if (!validation.valid) {
    return jsonResponse(req, 400, { success: false, error: validation.error });
  }

  const p = validation.payload;
  const user = authData.user;
  const userId = user.id;
  const now = new Date().toISOString();
  let weddingId: string | null = null;

  try {
    if (p.provisioning_request_id) {
      const { data: existingRequest, error: requestLookupError } = await supabase
        .from("provisioning_requests")
        .select("wedding_id, status, created_at")
        .eq("request_id", p.provisioning_request_id)
        .eq("user_id", userId)
        .maybeSingle();

      if (requestLookupError) throw requestLookupError;

      if (existingRequest?.status === "completed" && existingRequest.wedding_id) {
        const summary = await fetchWeddingSummary(supabase, existingRequest.wedding_id);
        return jsonResponse(req, 200, {
          success: true,
          already_provisioned: true,
          wedding_id: existingRequest.wedding_id,
          summary: summary || { wedding_id: existingRequest.wedding_id },
        });
      }

      if (existingRequest?.status === "pending") {
        const createdAt = new Date(existingRequest.created_at).getTime();
        if (Number.isFinite(createdAt) && Date.now() - createdAt < 10 * 60 * 1000) {
          return jsonResponse(req, 409, {
            success: false,
            error: "A provisioning request is already in progress. Please wait.",
          });
        }
        await markRequest(supabase, p.provisioning_request_id, {
          status: "failed",
          error_message: "Previous provisioning attempt expired",
          completed_at: now,
        });
      }
    }

    const { data: membership, error: membershipLookupError } = await supabase
      .from("wedding_members")
      .select("wedding_id")
      .eq("user_id", userId)
      .eq("role", "owner")
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (membershipLookupError) throw membershipLookupError;
    if (membership?.wedding_id) {
      const summary = await fetchWeddingSummary(supabase, membership.wedding_id);
      return jsonResponse(req, 200, {
        success: true,
        already_provisioned: true,
        wedding_id: membership.wedding_id,
        summary: summary || { wedding_id: membership.wedding_id },
      });
    }

    if (p.provisioning_request_id) {
      const { error: requestInsertError } = await supabase.from("provisioning_requests").insert({
        request_id: p.provisioning_request_id,
        user_id: userId,
        status: "pending",
        payload_summary: {
          display_name: p.display_name,
          wedding_date: p.wedding_date,
          location: p.location,
          guest_estimate: p.guest_estimate,
        },
        created_at: now,
      });
      if (requestInsertError) {
        console.error("provisioning request insert failed", requestInsertError);
        return jsonResponse(req, 409, {
          success: false,
          error: "This provisioning request has already been used. Please retry onboarding.",
        });
      }
    }

    const { error: profileError } = await supabase.from("profiles").upsert({
      id: userId,
      email: user.email,
      first_name: p.partner_one_first,
      last_name: p.partner_one_last,
      full_name: `${p.partner_one_first} ${p.partner_one_last}`,
      display_name: `${p.partner_one_first} ${p.partner_one_last}`,
      timezone: p.timezone,
      updated_at: now,
    }, { onConflict: "id" });
    if (profileError) throw new Error(`Profile upsert failed: ${profileError.message}`);

    const baseSlug = generateSlug(p.display_name);
    let wedding: JsonRecord | null = null;

    for (let attempt = 0; attempt < 20; attempt += 1) {
      const slug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt}`;
      const { data: createdWedding, error: weddingError } = await supabase
        .from("weddings")
        .insert({
          partner_one_name: p.partner_one_first,
          partner_two_name: p.partner_two_first,
          title: p.display_name,
          wedding_date: p.wedding_date,
          date_confirmed: true,
          location: p.location,
          estimated_guest_count: p.guest_estimate,
          status: "planning",
          slug,
          timezone: p.timezone,
          website_published: p.publish_website,
          created_by: userId,
          created_at: now,
          updated_at: now,
        })
        .select("id, title, slug, partner_one_name, partner_two_name, wedding_date, status, timezone")
        .single();

      if (!weddingError && createdWedding) {
        wedding = createdWedding as JsonRecord;
        weddingId = String(createdWedding.id);
        break;
      }
      if (weddingError?.code !== "23505") {
        throw new Error(`Wedding creation failed: ${weddingError?.message || "unknown error"}`);
      }
    }

    if (!wedding || !weddingId) throw new Error("Unable to generate a unique wedding URL");

    const { error: membershipError } = await supabase.from("wedding_members").insert({
      wedding_id: weddingId,
      user_id: userId,
      role: "owner",
      status: "active",
      accepted_at: now,
      created_at: now,
      updated_at: now,
    });
    if (membershipError) throw new Error(`Membership creation failed: ${membershipError.message}`);

    const sameVenue = p.ceremony_venue.toLowerCase() === p.reception_venue.toLowerCase();
    let ceremonyVenueId: string | null = null;
    let receptionVenueId: string | null = null;

    const { data: ceremonyVenue, error: ceremonyVenueError } = await supabase
      .from("wedding_venues")
      .insert({
        wedding_id: weddingId,
        venue_type: sameVenue ? "ceremony_reception" : "ceremony",
        name: p.ceremony_venue,
        city: p.location,
        country: "United Kingdom",
        sort_order: 1,
        created_at: now,
        updated_at: now,
      })
      .select("id")
      .single();
    if (ceremonyVenueError || !ceremonyVenue) {
      throw new Error(`Ceremony venue creation failed: ${ceremonyVenueError?.message || "unknown error"}`);
    }
    ceremonyVenueId = ceremonyVenue.id;

    if (sameVenue) {
      receptionVenueId = ceremonyVenueId;
    } else {
      const { data: receptionVenue, error: receptionVenueError } = await supabase
        .from("wedding_venues")
        .insert({
          wedding_id: weddingId,
          venue_type: "reception",
          name: p.reception_venue,
          city: p.location,
          country: "United Kingdom",
          sort_order: 2,
          created_at: now,
          updated_at: now,
        })
        .select("id")
        .single();
      if (receptionVenueError || !receptionVenue) {
        throw new Error(`Reception venue creation failed: ${receptionVenueError?.message || "unknown error"}`);
      }
      receptionVenueId = receptionVenue.id;
    }

    const ceremonyStartAt = localDateTimeToUtcIso(p.wedding_date, p.ceremony_time, p.timezone);
    const receptionStartAt = localDateTimeToUtcIso(p.wedding_date, p.reception_time, p.timezone);

    const { error: eventsError } = await supabase.from("wedding_events").insert([
      {
        wedding_id: weddingId,
        venue_id: ceremonyVenueId,
        name: "Wedding Ceremony",
        event_type: "ceremony",
        event_date: p.wedding_date,
        start_time: p.ceremony_time,
        start_at: ceremonyStartAt,
        visibility: "all_guests",
        is_public: p.publish_website,
        status: "draft",
        sort_order: 1,
        created_at: now,
        updated_at: now,
      },
      {
        wedding_id: weddingId,
        venue_id: receptionVenueId,
        name: "Wedding Reception",
        event_type: "reception",
        event_date: p.wedding_date,
        start_time: p.reception_time,
        start_at: receptionStartAt,
        visibility: "all_guests",
        is_public: p.publish_website,
        status: "draft",
        sort_order: 2,
        created_at: now,
        updated_at: now,
      },
      {
        wedding_id: weddingId,
        venue_id: receptionVenueId,
        name: "Evening Celebration",
        event_type: "evening",
        event_date: p.wedding_date,
        visibility: "all_guests",
        is_public: p.publish_website,
        status: "draft",
        sort_order: 3,
        created_at: now,
        updated_at: now,
      },
    ]);
    if (eventsError) throw new Error(`Wedding event creation failed: ${eventsError.message}`);

    const defaultCategories = [
      ["Venue", "venue", 35, 1],
      ["Catering", "catering", 20, 2],
      ["Photography", "photography", 8, 3],
      ["Entertainment", "entertainment", 8, 4],
      ["Flowers & Décor", "flowers_decor", 7, 5],
      ["Attire", "attire", 5, 6],
      ["Transport", "transport", 4, 7],
      ["Stationery", "stationery", 3, 8],
      ["Accommodation", "accommodation", 5, 9],
      ["Contingency", "contingency", 5, 10],
    ];

    const { error: categoriesError } = await supabase.from("budget_categories").insert(
      defaultCategories.map(([name, key, percentage, sortOrder]) => ({
        wedding_id: weddingId,
        name,
        category_key: key,
        suggested_percentage: percentage,
        planned_amount: 0,
        quoted_amount: 0,
        committed_amount: 0,
        paid_amount: 0,
        is_locked: false,
        is_default: true,
        sort_order: sortOrder,
        status: "active",
        created_at: now,
        updated_at: now,
      })),
    );
    if (categoriesError) throw new Error(`Budget setup failed: ${categoriesError.message}`);

    const portalEnabled = p.publish_website;
    const { error: portalSettingsError } = await supabase.from("guest_portal_settings").insert({
      wedding_id: weddingId,
      portal_enabled: portalEnabled,
      guest_account_optional: true,
      show_countdown: portalEnabled,
      show_travel: portalEnabled,
      show_updates: portalEnabled,
      show_contact_details: portalEnabled,
      venue_visibility_default: "included_guests",
      rsvp_enabled: portalEnabled,
      household_rsvp_enabled: true,
      require_meal_choices: false,
      allow_song_requests: false,
      allow_messages: false,
      show_transport: false,
      show_accommodation: false,
      show_registry: false,
      registry_enabled: false,
      show_gallery: false,
      show_questions: false,
      allow_guest_questions: false,
      show_contacts: portalEnabled,
      itinerary_enabled: portalEnabled,
      seating_enabled: false,
      settings_enabled: portalEnabled,
      show_location: portalEnabled,
      allow_late_rsvp: false,
      allow_rsvp_updates: true,
      created_at: now,
      updated_at: now,
    });
    if (portalSettingsError) throw new Error(`Guest portal setup failed: ${portalSettingsError.message}`);

    if (p.priorities.length > 0) {
      const { error: prioritiesError } = await supabase.from("wedding_elements").insert(
        p.priorities.map((priority) => ({
          wedding_id: weddingId,
          section: "planning_priorities",
          field_name: priority,
          field_value: "selected",
          created_at: now,
          updated_at: now,
        })),
      );
      if (prioritiesError) throw new Error(`Planning priorities setup failed: ${prioritiesError.message}`);
    }

    const { error: activityError } = await supabase.from("guest_activity_log").insert({
      wedding_id: weddingId,
      actor_user_id: userId,
      action: "workspace_provisioned",
      summary: "Wedding workspace created through onboarding",
      metadata: {
        partner_one: p.partner_one_first,
        partner_two: p.partner_two_first,
        guest_estimate: p.guest_estimate,
        priorities: p.priorities.length,
      },
      created_at: now,
    });
    if (activityError) console.error("workspace activity log failed", activityError);

    await markRequest(supabase, p.provisioning_request_id, {
      status: "completed",
      wedding_id: weddingId,
      error_message: null,
      completed_at: now,
    });

    return jsonResponse(req, 200, {
      success: true,
      already_provisioned: false,
      wedding_id: weddingId,
      summary: {
        ...wedding,
        wedding_id: weddingId,
        venues_created: sameVenue ? 1 : 2,
        events_created: 3,
        budget_categories_created: defaultCategories.length,
        priorities_stored: p.priorities.length,
        portal_enabled: portalEnabled,
      },
    });
  } catch (error) {
    console.error("provision-wedding-workspace failed", error);
    await rollbackWedding(supabase, weddingId);
    await markRequest(supabase, p.provisioning_request_id, {
      status: "failed",
      wedding_id: null,
      error_message: error instanceof Error ? error.message.slice(0, 500) : "Unknown provisioning error",
      completed_at: new Date().toISOString(),
    });
    return jsonResponse(req, 500, {
      success: false,
      error: "We could not finish setting up your wedding. Please try again.",
    });
  }
});
