
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ── Reserved slugs ──
const RESERVED_SLUGS = [
  "app", "admin", "api", "auth", "guest", "login", "signup",
  "support", "wedora", "dashboard", "settings", "onboarding",
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
  const pl = data.partner_one_last as string;
  const tf = data.partner_two_first as string;
  const tl = data.partner_two_last as string;
  const dn = data.display_name as string;
  const wd = data.wedding_date as string;
  const loc = data.location as string;
  const cv = data.ceremony_venue as string;
  const ct = data.ceremony_time as string;
  const rv = data.reception_venue as string;
  const rt = data.reception_time as string;
  const ge = data.guest_estimate as number;
  const pr = data.priorities as string[];
  const tz = (data.timezone as string) || "Europe/London";
  const pub = data.publish_website === true;

  if (!pf || typeof pf !== "string" || pf.trim().length === 0) return { valid: false, error: "Partner one first name is required" };
  if (!pl || typeof pl !== "string" || pl.trim().length === 0) return { valid: false, error: "Partner one last name is required" };
  if (!tf || typeof tf !== "string" || tf.trim().length === 0) return { valid: false, error: "Partner two first name is required" };
  if (!tl || typeof tl !== "string" || tl.trim().length === 0) return { valid: false, error: "Partner two last name is required" };
  if (!wd || typeof wd !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(wd)) return { valid: false, error: "A valid wedding date is required" };
  if (!loc || typeof loc !== "string" || loc.trim().length === 0) return { valid: false, error: "Location is required" };
  if (!cv || typeof cv !== "string" || cv.trim().length === 0) return { valid: false, error: "Ceremony venue is required" };
  if (!rv || typeof rv !== "string" || rv.trim().length === 0) return { valid: false, error: "Reception venue is required" };
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
    const supabaseUrl = Deno.env.get("VITE_PUBLIC_SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ── 1. Validate JWT ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: verifyErr } = await supabase.auth.getUser(token);

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
    const now = new Date().toISOString();

    // ── 3. Idempotency check — request ID dedup ──
    const provisionReqId = p.provisioning_request_id;
    
    if (provisionReqId) {
      const { data: existingReq } = await supabase
        .from("provisioning_requests")
        .select("id, wedding_id, status")
        .eq("request_id", provisionReqId)
        .maybeSingle();

      if (existingReq && existingReq.status === "completed" && existingReq.wedding_id) {
        // Already provisioned — return the existing wedding
        const { data: existingWedding } = await supabase
          .from("weddings")
          .select("id, title, slug, partner_one_name, partner_two_name, wedding_date, status")
          .eq("id", existingReq.wedding_id)
          .maybeSingle();

        return new Response(
          JSON.stringify({
            success: true,
            already_provisioned: true,
            wedding_id: existingReq.wedding_id,
            summary: {
              wedding_id: existingReq.wedding_id,
              title: existingWedding?.title || "",
              slug: existingWedding?.slug || "",
              partner_one_name: existingWedding?.partner_one_name || "",
              partner_two_name: existingWedding?.partner_two_name || "",
              wedding_date: existingWedding?.wedding_date || null,
              status: existingWedding?.status || "",
            },
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      if (existingReq && existingReq.status === "pending") {
        // Request in progress — return conflict
        return new Response(
          JSON.stringify({ success: false, error: "A provisioning request is already in progress. Please wait." }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // ── 4. Check existing owner membership ──
    const { data: existingMembership } = await supabase
      .from("wedding_members")
      .select("wedding_id, weddings!inner(id, title, slug, partner_one_name, partner_two_name, wedding_date, status)")
      .eq("user_id", userId)
      .eq("role", "owner")
      .eq("status", "active")
      .maybeSingle();

    if (existingMembership) {
      const w = existingMembership.weddings as unknown as Record<string, unknown>;
      return new Response(
        JSON.stringify({
          success: true,
          already_provisioned: true,
          wedding_id: existingMembership.wedding_id,
          summary: {
            wedding_id: existingMembership.wedding_id,
            title: w?.title || "",
            slug: w?.slug || "",
            partner_one_name: w?.partner_one_name || "",
            partner_two_name: w?.partner_two_name || "",
            wedding_date: w?.wedding_date || null,
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── 5. Insert pending provisioning request ──
    if (provisionReqId) {
      await supabase.from("provisioning_requests").insert({
        request_id: provisionReqId,
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
    }

    // ── 6. Upsert profile ──
    const { error: profileErr } = await supabase
      .from("profiles")
      .upsert({
        id: userId,
        email: user.email,
        first_name: p.partner_one_first,
        last_name: p.partner_one_last,
        display_name: p.display_name,
        updated_at: now,
      }, { onConflict: "id" });

    if (profileErr) {
      console.error("profile upsert error:", profileErr);
      if (provisionReqId) {
        await supabase.from("provisioning_requests").update({ status: "failed", error_message: "Profile upsert failed", completed_at: now }).eq("request_id", provisionReqId);
      }
      return new Response(
        JSON.stringify({ success: false, error: "Failed to save profile details. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── 7. Generate unique slug ──
    const baseSlug = generateSlug(p.display_name);
    const { data: existingSlugs } = await supabase
      .from("weddings")
      .select("slug");

    const usedSlugs = (existingSlugs || []).map((w: { slug: string }) => w.slug).filter(Boolean);
    const slug = generateUniqueSlug(baseSlug, usedSlugs);

    // ── 8. Create wedding ──
    const { data: wedding, error: weddingErr } = await supabase
      .from("weddings")
      .insert({
        partner_one_name: p.partner_one_first,
        partner_two_name: p.partner_two_first,
        title: p.display_name,
        wedding_date: p.wedding_date,
        date_confirmed: false,
        location: p.location,
        estimated_guest_count: p.guest_estimate,
        status: "planning",
        slug,
        timezone: p.timezone,
        created_by: userId,
        created_at: now,
        updated_at: now,
      })
      .select("id, title, slug, partner_one_name, partner_two_name, wedding_date, status, timezone")
      .single();

    if (weddingErr || !wedding) {
      console.error("wedding create error:", weddingErr);
      if (provisionReqId) {
        await supabase.from("provisioning_requests").update({ status: "failed", error_message: "Wedding creation failed", completed_at: now }).eq("request_id", provisionReqId);
      }
      return new Response(
        JSON.stringify({ success: false, error: "Failed to create wedding. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const weddingId = wedding.id;

    // ── 9. Create owner membership ──
    const { error: memberErr } = await supabase
      .from("wedding_members")
      .insert({
        wedding_id: weddingId,
        user_id: userId,
        role: "owner",
        status: "active",
        accepted_at: now,
        created_at: now,
        updated_at: now,
      });

    if (memberErr) {
      console.error("membership create error:", memberErr);
      await supabase.from("weddings").delete().eq("id", weddingId);
      if (provisionReqId) {
        await supabase.from("provisioning_requests").update({ status: "failed", error_message: "Membership creation failed", completed_at: now }).eq("request_id", provisionReqId);
      }
      return new Response(
        JSON.stringify({ success: false, error: "Failed to set up wedding access. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── 10. Create ceremony venue ──
    let ceremonyVenueId: string | null = null;
    const { data: ceremonyVenue, error: ceremonyVErr } = await supabase
      .from("wedding_venues")
      .insert({
        wedding_id: weddingId,
        venue_type: "ceremony",
        name: p.ceremony_venue,
        city: p.location,
        country: "United Kingdom",
        created_at: now,
      })
      .select("id")
      .single();

    if (ceremonyVErr) {
      console.error("ceremony venue error:", ceremonyVErr);
    } else {
      ceremonyVenueId = ceremonyVenue.id;
    }

    // ── 11. Create reception venue ──
    let receptionVenueId: string | null = null;
    const sameVenue = p.ceremony_venue.toLowerCase() === p.reception_venue.toLowerCase();
    
    if (sameVenue && ceremonyVenueId) {
      await supabase
        .from("wedding_venues")
        .update({ venue_type: "ceremony_reception" })
        .eq("id", ceremonyVenueId);
      receptionVenueId = ceremonyVenueId;
    } else {
      const { data: receptionVenue, error: receptionVErr } = await supabase
        .from("wedding_venues")
        .insert({
          wedding_id: weddingId,
          venue_type: "reception",
          name: p.reception_venue,
          city: p.location,
          country: "United Kingdom",
          created_at: now,
        })
        .select("id")
        .single();

      if (receptionVErr) {
        console.error("reception venue error:", receptionVErr);
      } else {
        receptionVenueId = receptionVenue.id;
      }
    }

    // ── 12. Create wedding events ──
    const ceremonyStartAt = p.wedding_date && p.ceremony_time
      ? `${p.wedding_date}T${p.ceremony_time}:00.000Z`
      : null;

    await supabase.from("wedding_events").insert({
      wedding_id: weddingId,
      event_type: "ceremony",
      name: "Wedding Ceremony",
      start_at: ceremonyStartAt || undefined,
      venue_id: ceremonyVenueId || undefined,
      visibility: "all_guests",
      status: "draft",
      created_at: now,
      updated_at: now,
    });

    const receptionStartAt = p.wedding_date && p.reception_time
      ? `${p.wedding_date}T${p.reception_time}:00.000Z`
      : null;

    await supabase.from("wedding_events").insert({
      wedding_id: weddingId,
      event_type: "reception",
      name: "Wedding Reception",
      start_at: receptionStartAt || undefined,
      venue_id: receptionVenueId || undefined,
      visibility: "all_guests",
      status: "draft",
      created_at: now,
      updated_at: now,
    });

    await supabase.from("wedding_events").insert({
      wedding_id: weddingId,
      event_type: "evening",
      name: "Evening Celebration",
      visibility: "all_guests",
      status: "draft",
      created_at: now,
      updated_at: now,
    });

    // ── 13. Create default budget categories ──
    const budgetCategories = [
      { name: "Venue", key: "venue", pct: 35, sort: 1 },
      { name: "Catering", key: "catering", pct: 20, sort: 2 },
      { name: "Photography", key: "photography", pct: 8, sort: 3 },
      { name: "Entertainment", key: "entertainment", pct: 8, sort: 4 },
      { name: "Flowers & Décor", key: "flowers_decor", pct: 7, sort: 5 },
      { name: "Attire", key: "attire", pct: 5, sort: 6 },
      { name: "Transport", key: "transport", pct: 4, sort: 7 },
      { name: "Stationery", key: "stationery", pct: 3, sort: 8 },
      { name: "Accommodation", key: "accommodation", pct: 5, sort: 9 },
      { name: "Contingency", key: "contingency", pct: 5, sort: 10 },
    ];

    for (const cat of budgetCategories) {
      await supabase.from("budget_categories").insert({
        wedding_id: weddingId,
        name: cat.name,
        category_key: cat.key,
        suggested_percentage: cat.pct,
        planned_amount: 0,
        quoted_amount: 0,
        committed_amount: 0,
        paid_amount: 0,
        is_locked: false,
        is_default: true,
        sort_order: cat.sort,
        status: "active",
        created_at: now,
        updated_at: now,
      });
    }

    // ── 14. Create guest portal settings ──
    const portalEnabled = p.publish_website;
    await supabase.from("guest_portal_settings").insert({
      wedding_id: weddingId,
      portal_enabled: portalEnabled,
      guest_account_optional: true,
      show_countdown: portalEnabled,
      show_travel: portalEnabled,
      show_updates: portalEnabled,
      show_contact_details: portalEnabled,
      show_gallery: portalEnabled,
      show_registry: portalEnabled,
      show_questions: portalEnabled,
      show_contacts: portalEnabled,
      show_settings: portalEnabled,
      venue_visibility_default: portalEnabled ? "public" : "private",
      itinerary_enabled: portalEnabled,
      seating_enabled: portalEnabled,
      settings_enabled: portalEnabled,
      show_location: portalEnabled,
      rsvp_enabled: portalEnabled,
      household_rsvp_enabled: false,
      require_meal_choices: false,
      allow_guest_questions: false,
      allow_song_requests: false,
      allow_messages: false,
      show_transport: false,
      show_accommodation: false,
      registry_enabled: false,
      sms_configured: false,
      allow_late_rsvp: false,
      allow_rsvp_updates: true,
      created_at: now,
      updated_at: now,
    });

    // ── 15. Store planning priorities as wedding_elements ──
    for (const priority of p.priorities) {
      if (typeof priority === "string" && priority.trim().length > 0) {
        await supabase.from("wedding_elements").insert({
          wedding_id: weddingId,
          section: "planning_priorities",
          field_name: priority.trim(),
          field_value: "selected",
          created_at: now,
          updated_at: now,
        });
      }
    }

    // ── 16. Log audit entry ──
    await supabase.from("guest_activity_log").insert({
      wedding_id: weddingId,
      activity_type: "workspace_provisioned",
      description: "Wedding workspace created via onboarding",
      metadata: { partner_one: p.partner_one_first, partner_two: p.partner_two_first, guest_estimate: p.guest_estimate, priorities: p.priorities.length },
      created_at: now,
    });

    // ── 17. Mark profile onboarding complete ──
    await supabase
      .from("profiles")
      .update({
        onboarding_completed: true,
        updated_at: now,
      })
      .eq("id", userId);

    // ── 18. Mark provisioning request complete ──
    if (provisionReqId) {
      await supabase.from("provisioning_requests").update({ status: "completed", wedding_id: weddingId, completed_at: now }).eq("request_id", provisionReqId);
    }

    // ── 19. Return success ──
    return new Response(
      JSON.stringify({
        success: true,
        already_provisioned: false,
        wedding_id: weddingId,
        summary: {
          wedding_id: weddingId,
          title: wedding.title,
          slug: wedding.slug,
          partner_one_name: wedding.partner_one_name,
          partner_two_name: wedding.partner_two_name,
          wedding_date: wedding.wedding_date,
          status: wedding.status,
          timezone: wedding.timezone,
          venues_created: sameVenue ? 1 : 2,
          events_created: 3,
          budget_categories_created: budgetCategories.length,
          priorities_stored: p.priorities.length,
          portal_enabled: portalEnabled,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );

  } catch (err) {
    console.error("provision-wedding-workspace unexpected error:", err);
    return new Response(
      JSON.stringify({ success: false, error: "Something went wrong. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
