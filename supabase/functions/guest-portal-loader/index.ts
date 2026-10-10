import { oneRelation } from "../_shared/relations.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { edgeGuestCorsHeaders, sha256Hex, validGuestSessionSecret } from "../_shared/guestAccess.ts";





async function buildFingerprint(req: Request): Promise<string> {
  const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const ua = req.headers.get("user-agent") || "unknown";
  return await sha256Hex(`${ip}:${ua.slice(0, 64)}`);
}

function isEventVisibleToGuest(visibility: string, revealAt: string | null, eventType: string, recipients: Array<{ ceremony_included: boolean; reception_included: boolean; evening_included: boolean; welcome_event_included: boolean; day_after_event_included: boolean; invitation_group?: string }>): boolean {
  const now = new Date();
  switch (visibility) {
    case "public": return true;
    case "invitation_holders": return true;
    case "hidden": return false;
    case "reveal_on_date": if (!revealAt) return true; return now >= new Date(revealAt);
    case "included_guests": {
      const map: Record<string, keyof typeof recipients[0]> = { ceremony: "ceremony_included", reception: "reception_included", evening: "evening_included", welcome: "welcome_event_included", day_after: "day_after_event_included" };
      const key = map[eventType]; if (!key) return true;
      return recipients.some((r) => r[key] === true);
    }
    default: return false;
  }
}

function formatCompanionName(guest: { full_name: string; preferred_name: string | null }, format: string): string {
  switch (format) {
    case "first_names_only": return guest.preferred_name || guest.full_name.split(" ")[0] || guest.full_name;
    case "preferred_names": return guest.preferred_name || guest.full_name;
    case "full_names":
    default: return guest.full_name;
  }
}

Deno.serve(async (req: Request) => {
  const corsHeaders = edgeGuestCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response(null, { status: 405, headers: corsHeaders });
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);
  const fingerprint = await buildFingerprint(req);

  try {
    const body = await req.json();
    const { session_hash } = body || {};
    if (!validGuestSessionSecret(session_hash)) {
      return new Response(JSON.stringify({ valid: false, error: "session_invalid" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: session, error: sessionErr } = await supabase.from("guest_access_sessions").select("*, access_token:invitation_access_tokens(id, wedding_id, invitation_id, status, expires_at)").eq("session_hash", await sha256Hex(session_hash)).eq("status", "active").maybeSingle();
    if (sessionErr || !session) return new Response(JSON.stringify({ valid: false, error: "session_invalid" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (session.expires_at && new Date(session.expires_at) < new Date()) {
      await supabase.from("guest_access_sessions").update({ status: "expired", ended_at: new Date().toISOString() }).eq("id", session.id);
      return new Response(JSON.stringify({ valid: false, error: "session_expired" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!session.access_token || session.access_token.status !== "active" || session.access_token.wedding_id !== session.wedding_id || session.access_token.invitation_id !== session.invitation_id || (session.access_token.expires_at && new Date(session.access_token.expires_at) <= new Date())) {
      await supabase.from("guest_access_sessions").update({ status: "ended", ended_at: new Date().toISOString() }).eq("id", session.id);
      return new Response(JSON.stringify({ valid: false, error: "session_invalid" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: wedding } = await supabase.from("weddings").select("id, partner_one_name, partner_two_name, title, wedding_date, dress_code, welcome_message, contact_information, parking_notes, accessibility_notes, children_policy, plus_one_policy, hashtag, timezone").eq("id", session.wedding_id).maybeSingle();
    if (!wedding) return new Response(JSON.stringify({ valid: false, error: "session_invalid" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: invitation } = await supabase.from("invitations").select("id, formal_recipient_name, informal_greeting, invitation_type, rsvp_deadline, status, template:invitation_templates(id, name, style_preset, header_text, body_text, closing_text, footer_text)").eq("id", session.invitation_id).eq("wedding_id", session.wedding_id).maybeSingle();
    if (!invitation) return new Response(JSON.stringify({ valid: false, error: "session_invalid" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: recipients } = await supabase.from("invitation_recipients").select("guest_id, guest:guests(id, full_name, preferred_name, household_id, plus_one_allowed, plus_one_name, plus_one_status, named_plus_one_guest_id, approved_additional_children, age_band, child_notes), recipient_role, ceremony_included, reception_included, evening_included, welcome_event_included, day_after_event_included, plus_one_allowed").eq("invitation_id", session.invitation_id).eq("wedding_id", session.wedding_id);

    const { data: portalSettings } = await supabase.from("guest_portal_settings").select("*").eq("wedding_id", session.wedding_id).maybeSingle();
    if (portalSettings?.portal_closes_at && new Date() >= new Date(portalSettings.portal_closes_at)) return new Response(JSON.stringify({ valid: false, error: "portal_closed" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (portalSettings && portalSettings.portal_enabled === false) return new Response(JSON.stringify({ valid: false, error: "portal_disabled" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const guestRecipients = (recipients || []).flatMap((r) => {
      const guest = oneRelation(r.guest);
      if (!guest) return [];
      return { guest_id: r.guest_id, guest_name: guest.full_name || "Guest", preferred_name: guest.preferred_name || null, recipient_role: r.recipient_role, ceremony_included: r.ceremony_included, reception_included: r.reception_included, evening_included: r.evening_included, welcome_event_included: r.welcome_event_included, day_after_event_included: r.day_after_event_included, plus_one_allowed: r.plus_one_allowed, plus_one_status: guest.plus_one_status || null, plus_one_name: guest.plus_one_name || null, approved_additional_children: guest.approved_additional_children || 0, age_band: guest.age_band || null, household_id: guest.household_id || null };
    });
    const guestIds = guestRecipients.map((r) => r.guest_id);
    const householdIds = [...new Set(guestRecipients.map((r) => r.household_id).filter(Boolean))] as string[];

    const { data: allEvents } = await supabase.from("wedding_events").select("*, venue:wedding_venues(id, name, address_line_1, city, county_or_region, postcode, country)").eq("wedding_id", session.wedding_id).neq("visibility", "hidden");
    const eventIds = (allEvents || []).map((e) => e.id);
    const { data: allAudiences } = eventIds.length > 0 ? await supabase.from("wedding_event_audiences").select("event_id, audience_type, invitation_id, guest_id, household_id, invitation_group").in("event_id", eventIds) : { data: [] };
    const audienceMap = new Map<string, Array<Record<string, unknown>>>();
    (allAudiences || []).forEach((a: Record<string, unknown>) => { const arr = audienceMap.get(a.event_id as string) || []; arr.push(a); audienceMap.set(a.event_id as string, arr); });
    function hasAudienceAccess(eventId: string): boolean {
      const audiences = audienceMap.get(eventId); if (!audiences || audiences.length === 0) return true;
      for (const a of audiences) { if (a.audience_type === "invitation" && a.invitation_id === session.invitation_id) return true; if (a.audience_type === "guest" && guestIds.includes(a.guest_id as string)) return true; if (a.audience_type === "household" && householdIds.includes(a.household_id as string)) return true; }
      return false;
    }

    const now = new Date();
    const { data: publishedUpdates } = await supabase.from("wedding_updates").select("id, title, content, update_date, created_at, category, is_important, priority, summary, related_itinerary_event_id, related_travel_item_id").eq("wedding_id", session.wedding_id).eq("status", "published").lte("publish_at", now.toISOString()).or("publish_at.is.null").order("created_at", { ascending: false });
    const updatesByEvent = new Map<string, Array<Record<string, unknown>>>();
    (publishedUpdates || []).forEach((u) => { if (u.related_itinerary_event_id) { const arr = updatesByEvent.get(u.related_itinerary_event_id as string) || []; arr.push(u); updatesByEvent.set(u.related_itinerary_event_id as string, arr); } });

    const filteredEvents = (allEvents || []).filter((evt) => { if (!isEventVisibleToGuest(evt.visibility, evt.reveal_at, evt.event_type, guestRecipients)) return false; if (!hasAudienceAccess(evt.id)) return false; if (!["published","active"].includes(evt.status)) return false; return true; }).map((evt) => {
      const linkedUpdates = (updatesByEvent.get(evt.id) || []).map((u) => ({ id: u.id, title: u.title, content: u.content, update_date: u.update_date, created_at: u.created_at, category: u.category, priority: u.priority || "standard", is_important: !!(u.is_important), summary: u.summary || null, is_read: false, read_at: null, is_saved: false, image_url: null, related_itinerary_event_id: u.related_itinerary_event_id, related_travel_item_id: u.related_travel_item_id || null }));
      return { id: evt.id, event_type: evt.event_type, name: evt.name, description: evt.guest_description || null, guest_description: evt.guest_description, start_at: evt.start_at, end_at: evt.end_at, visibility: evt.visibility, reveal_at: evt.reveal_at, dress_code: evt.dress_code, arrival_notes: evt.arrival_notes, arrival_offset_minutes: evt.arrival_offset_minutes, parking_notes: evt.parking_notes, transport_notes: evt.transport_notes, accessibility_notes: evt.accessibility_notes, children_notes: evt.children_notes, status: evt.status, published_at: evt.published_at, venue: evt.venue ? { id: evt.venue.id, name: evt.venue.name, address_line_1: evt.venue.address_line_1, city: evt.venue.city, county_or_region: evt.venue.county_or_region, postcode: evt.venue.postcode, country: evt.venue.country } : null, linked_updates: linkedUpdates.length > 0 ? linkedUpdates : undefined };
    });

    // RSVP
    const { data: rsvpData } = await supabase.from("rsvp_responses").select("*").eq("invitation_id", session.invitation_id);
    let customAnswers: Record<string, unknown>[] = [];
    if (rsvpData && rsvpData.length > 0) { const responseIds = rsvpData.map((r) => r.id); const { data: answers } = await supabase.from("rsvp_custom_answers").select("*").in("response_id", responseIds); customAnswers = answers || []; }
    const { data: eventResponses } = guestIds.length > 0 ? await supabase.from("rsvp_event_responses").select("*").eq("invitation_id", session.invitation_id).eq("wedding_id", session.wedding_id).in("guest_id", guestIds) : { data: [] };
    const eventResponsesByGuest = new Map<string, Array<Record<string, unknown>>>();
    (eventResponses || []).forEach((er) => { const arr = eventResponsesByGuest.get(er.guest_id as string) || []; arr.push(er); eventResponsesByGuest.set(er.guest_id as string, arr); });
    const { data: rsvpSubmission } = await supabase.from("rsvp_submissions").select("*").eq("invitation_id", session.invitation_id).eq("wedding_id", session.wedding_id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    const rsvpMap: Record<string, unknown> = {};
    (rsvpData || []).forEach((r) => {
      const guestEventResponses = (eventResponsesByGuest.get(r.guest_id as string) || []).map((er) => ({ id: er.id, event_id: er.event_id, attendance_status: er.attendance_status, meal_option_id: er.meal_option_id, created_at: er.created_at, updated_at: er.updated_at }));
      rsvpMap[r.guest_id as string] = { id: r.id, submission_id: r.submission_id || null, response_status: r.response_status, ceremony_attending: r.ceremony_attending, reception_attending: r.reception_attending, evening_attending: r.evening_attending, welcome_attending: r.welcome_attending, day_after_attending: r.day_after_attending, plus_one_confirmed: r.plus_one_confirmed, plus_one_name: r.plus_one_name, children_attending_count: r.children_attending_count, children_names: r.children_names, meal_choice: r.meal_choice, dietary_requirements: r.dietary_requirements, allergy_notes: r.allergy_notes, accessibility_notes: r.accessibility_notes, transport_status: r.transport_status, accommodation_status: r.accommodation_status, song_request: r.song_request, message_to_couple: r.message_to_couple, submitted_at: r.submitted_at, is_draft: r.is_draft, custom_answers: customAnswers.filter((a) => a.response_id === r.id).map((a) => ({ question_key: a.question_key, question_label: a.question_label, answer: a.answer, answer_type: a.answer_type })), event_responses: guestEventResponses.length > 0 ? guestEventResponses : undefined };
    });

    // Seating
    const seatingRevealAt = portalSettings?.seating_reveal_at || null;
    const seatingEmergencyDisabled = portalSettings?.seating_emergency_disabled === true;
    const isBeforeSeatingReveal = seatingRevealAt ? now < new Date(seatingRevealAt) : false;
    let seatingData: Record<string, unknown> | null = null;
    if (!isBeforeSeatingReveal && !seatingEmergencyDisabled) {
      const { data: publication } = await supabase.from("seating_publications").select("id, status, seating_plan_id, seating_plan_version_id, linked_event_id, audience_settings, lookup_settings, publication_revision, published_at").eq("wedding_id", session.wedding_id).eq("status", "published").is("disabled_at", null).order("published_at", { ascending: false }).limit(1).maybeSingle();
      if (publication) {
        const audience = (publication.audience_settings || {}) as Record<string, unknown>;
        const revealAt = audience.reveal_at as string | null;
        if (!(audience.emergency_disable === true) && (!revealAt || now >= new Date(revealAt))) {
          const { data: assignments } = await supabase.from("seating_assignments").select("table_id, seating_seat_id, guest_id").eq("plan_id", publication.seating_plan_id).in("guest_id", guestIds);
          const myAssignment = assignments?.find((a) => guestIds.includes(a.guest_id));
          if (myAssignment) {
            const { data: table } = await supabase.from("seating_tables").select("id, table_number, name, shape, colour, capacity, zone").eq("id", myAssignment.table_id).maybeSingle();
            let seat = null;
            if (myAssignment.seating_seat_id) { const { data: seatRow } = await supabase.from("seating_seats").select("id, seat_label, seat_number").eq("id", myAssignment.seating_seat_id).maybeSingle(); seat = seatRow; }
            const showSeatNumbers = portalSettings?.show_seat_number !== false;
            const showCompanions = portalSettings?.show_table_companions === true;
            const companionFormat = (portalSettings?.companion_name_format as string) || "full_names";
            const showCompanionSeatLabels = portalSettings?.show_companion_seat_labels === true;
            const showRoomMap = portalSettings?.show_room_map !== false;
            const showFloorPlanBg = portalSettings?.show_floor_plan_background === true;
            const showEntranceRoute = portalSettings?.show_entrance_route === true;
            let companions: Array<{ full_name: string; preferred_name: string | null; display_name: string; seat_label: string | null }> = [];
            if (showCompanions && table && companionFormat !== "hidden") {
              const { data: tableAssignments } = await supabase.from("seating_assignments").select("guest_id, seating_seat_id, guest:guests!inner(id, full_name, preferred_name)").eq("plan_id", publication.seating_plan_id).eq("table_id", myAssignment.table_id);
              for (const ta of (tableAssignments || [])) {
                const taGuest = oneRelation(ta.guest);
                if (!taGuest) continue;
                if (ta.guest_id === myAssignment.guest_id) continue;
                let cl: string | null = null;
                if (showCompanionSeatLabels && ta.seating_seat_id) { const { data: cs } = await supabase.from("seating_seats").select("seat_label").eq("id", ta.seating_seat_id).maybeSingle(); cl = cs?.seat_label || null; }
                companions.push({ full_name: taGuest.full_name || "Guest", preferred_name: taGuest.preferred_name || null, display_name: formatCompanionName({ full_name: taGuest.full_name, preferred_name: taGuest.preferred_name }, companionFormat), seat_label: cl });
              }
            }
            let mapData: Record<string, unknown> | null = null;
            if (showRoomMap) {
              const { data: plan } = await supabase.from("seating_plans").select("id, canvas_width, canvas_height, background_asset_id, background_opacity").eq("id", publication.seating_plan_id).maybeSingle();
              const { data: allTables } = await supabase.from("seating_tables").select("id, table_number, name, shape, position_x, position_y, width, height, rotation, colour, capacity, zone").eq("plan_id", publication.seating_plan_id).is("archived_at", null);
              const gtId = table?.id;
              const { data: roomObjects } = await supabase.from("seating_room_objects").select("id, object_type, name, x_position, y_position, width, height, rotation, style_key, visible").eq("seating_plan_id", publication.seating_plan_id).is("archived_at", null).neq("visible", false);
              const { data: zones } = await supabase.from("seating_zones").select("id, name, description, style_key, visible").eq("seating_plan_id", publication.seating_plan_id).neq("visible", false);
              let backgroundAsset: Record<string, unknown> | null = null;
              if (showFloorPlanBg && plan?.background_asset_id) {
                const { data: bg } = await supabase.from("seating_background_assets").select("id, storage_path, width, height, x_position, y_position, opacity, visible").eq("id", plan.background_asset_id).maybeSingle();
                if (bg?.storage_path) { const { data: signed } = await supabase.storage.from("private").createSignedUrl(bg.storage_path, 3600); backgroundAsset = { id: bg.id, storage_path: bg.storage_path, signed_url: signed?.signedUrl || null, width: bg.width, height: bg.height, x_position: bg.x_position, y_position: bg.y_position, opacity: bg.opacity, visible: bg.visible }; }
              }
              mapData = { tables: (allTables || []).map((t) => ({ id: t.id, table_number: t.table_number, name: t.name, shape: t.shape, position_x: Number(t.position_x), position_y: Number(t.position_y), width: Number(t.width), height: Number(t.height), rotation: Number(t.rotation), colour: t.colour, capacity: t.capacity, is_guest_table: t.id === gtId, zone: t.zone || null })), room_objects: (roomObjects || []).map((ro) => ({ id: ro.id, object_type: ro.object_type, name: ro.name, x_position: Number(ro.x_position), y_position: Number(ro.y_position), width: Number(ro.width), height: Number(ro.height), rotation: ro.rotation, style_key: ro.style_key, visible: ro.visible })), zones: (zones || []).map((z) => ({ id: z.id, name: z.name, description: z.description, style_key: z.style_key, visible: z.visible })), background_asset: backgroundAsset, canvas_width: plan?.canvas_width || 1200, canvas_height: plan?.canvas_height || 800 };
            }
            seatingData = { publication: { id: publication.id, status: publication.status, publication_revision: publication.publication_revision, published_at: publication.published_at, linked_event_id: publication.linked_event_id }, table: table ? { id: table.id, table_number: table.table_number, name: table.name, shape: table.shape, colour: table.colour, capacity: table.capacity } : null, seat: seat && showSeatNumbers ? { id: seat.id, seat_label: seat.seat_label, seat_number: seat.seat_number } : null, companions, lookup_settings: { reveal_companions: showCompanions, show_seat_numbers: showSeatNumbers, companion_name_format: companionFormat, show_companion_seat_labels: showCompanionSeatLabels, show_room_map: showRoomMap, show_floor_plan_background: showFloorPlanBg, show_entrance_route: showEntranceRoute }, wedding_day_note: portalSettings?.seating_guest_message || null, is_before_reveal: false, is_emergency_disabled: false, zone: table ? table.zone || null : null, map_data: mapData, updated_at: publication.published_at };
          }
        }
      }
    }
    if (!seatingData) { seatingData = { publication: null, table: null, seat: null, companions: [], lookup_settings: { reveal_companions: false, show_seat_numbers: true, companion_name_format: "full_names", show_companion_seat_labels: false, show_room_map: true, show_floor_plan_background: false, show_entrance_route: false }, wedding_day_note: null, is_before_reveal: isBeforeSeatingReveal, is_emergency_disabled: seatingEmergencyDisabled, zone: null, map_data: null, updated_at: null, all_events_past: false }; }

    // Registry
    let registryData: Record<string, unknown> | null = null;
    const { data: registries } = await supabase.from("gift_registries").select("*").eq("wedding_id", session.wedding_id).eq("status", "published");
    if (registries && registries.length > 0) {
      const allRegistryIds = registries.map((r) => r.id);
      const { data: allItems } = await supabase.from("gift_registry_items").select("*").in("registry_id", allRegistryIds).eq("status", "published").order("sort_order").order("created_at");
      const allItemIds = (allItems || []).map((i) => i.id);
      let allContributions: Record<string, unknown>[] = [];
      if (allItemIds.length > 0) { const { data: contribs } = await supabase.from("gift_contributions").select("*").in("item_id", allItemIds).eq("status", "confirmed"); allContributions = contribs || []; }
      const { data: myReservations } = await supabase.from("gift_item_reservations").select("*").eq("invitation_id", session.invitation_id).in("guest_id", guestIds).eq("status", "active");
      const { data: myContributions } = await supabase.from("gift_contributions").select("*").eq("invitation_id", session.invitation_id).in("guest_id", guestIds);
      const registryList = registries.map((reg) => {
        const regItems = (allItems || []).filter((i) => i.registry_id === reg.id);
        const regItemIds = regItems.map((i) => i.id);
        const regContributions = allContributions.filter((c) => regItemIds.includes(c.item_id as string));
        const items = regItems.map((item) => {
          const itemContribs = regContributions.filter((c) => c.item_id === item.id);
          const contributedTotal = itemContribs.filter((c) => c.status === "confirmed").reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
          return { id: item.id, title: item.title, description: item.description, image: item.image, price: Number(item.price) || null, target_amount: Number(item.target_amount) || null, guide_amount: Number(item.guide_amount) || null, currency: item.currency || "GBP", is_featured: !!(item.is_featured), allow_group_gifting: !!(item.allow_group_gifting), allow_reservation: !!(item.allow_reservation), show_progress: !!(item.show_progress), status: item.status || "published", contributed_total: contributedTotal, contributor_count: itemContribs.filter((c) => c.status === "confirmed").length };
        });
        return { id: reg.id, enabled: !!(reg.enabled), registry_type: reg.registry_type, name: reg.name || null, description: reg.description || null, presence_message: reg.presence_message || null, currency: reg.currency || "GBP", hero_image_url: reg.hero_image_url || null, status: reg.status || "published", items };
      });
      registryData = { registries: registryList, my_reservations: (myReservations || []).map((r) => ({ id: r.id, registry_item_id: r.registry_item_id, guest_id: r.guest_id, status: r.status, reserved_at: r.reserved_at, expires_at: r.expires_at })), my_contributions: (myContributions || []).map((c) => ({ id: c.id, item_id: c.item_id, guest_id: c.guest_id, amount: Number(c.amount) || 0, currency: c.currency || "GBP", is_anonymous: !!(c.is_anonymous), status: c.status || "pending" })), payment_provider_available: false };
    }

    // ── GIFT FUNDING (Stripe Connect) ──
    let giftFundData: Record<string, unknown> | null = null;
    const { data: activeFunds } = await supabase
      .from("gift_funds")
      .select("*")
      .eq("wedding_id", session.wedding_id)
      .eq("is_active", true)
      .eq("is_public", true)
      .order("created_at", { ascending: false });

    if (activeFunds && activeFunds.length > 0) {
      const fundIds = activeFunds.map((f) => f.id);

      const CONFIRMED_STATUSES = ["paid", "partially_refunded", "dispute_won"];
      const { data: allContributions } = await supabase
        .from("gift_fund_contributions")
        .select("*")
        .in("fund_id", fundIds)
        .in("payment_status", CONFIRMED_STATUSES)
        .order("paid_at", { ascending: false });

      let coupleAccountReady = false;
      const { data: connectAcct } = await supabase
        .from("gift_fund_accounts")
        .select("charges_enabled, payouts_enabled, requirements_due")
        .eq("wedding_id", session.wedding_id)
        .maybeSingle();
      coupleAccountReady = !!(connectAcct?.charges_enabled && connectAcct?.payouts_enabled && !connectAcct?.requirements_due);

      const contribsByFund = new Map<string, Array<Record<string, unknown>>>();
      (allContributions || []).forEach((c) => {
        const arr = contribsByFund.get(c.fund_id as string) || [];
        arr.push(c);
        contribsByFund.set(c.fund_id as string, arr);
      });

      const funds = activeFunds.map((fund) => {
        const fundContribs = contribsByFund.get(fund.id as string) || [];
        const raisedAmount = fundContribs.reduce((sum, c) => sum + (Number(c.amount_minor) || 0) - (Number(c.refunded_amount_minor) || 0), 0);
        const paidContribs = fundContribs;

        const recentContributions = paidContribs.slice(0, 5).map((c) => {
          const visibility = (c.visibility as string) || "name_only";
          return {
            id: c.id,
            contributor_name: c.contributor_name || null,
            message: c.message || null,
            amount_minor: Number(c.amount_minor) || 0,
            visibility,
            paid_at: c.paid_at || null,
            display_name: visibility === "public" ? (c.contributor_name || null) : null,
            display_amount_minor: visibility === "public" ? (Number(c.amount_minor) || 0) : null,
            display_message: visibility === "public" ? (c.message || null) : null,
          };
        });

        return {
          id: fund.id,
          wedding_id: fund.wedding_id,
          title: fund.title,
          description: fund.description || null,
          category: fund.category || "custom",
          target_amount_minor: fund.target_amount_minor ? Number(fund.target_amount_minor) : null,
          currency: fund.currency || "gbp",
          cover_image_path: fund.cover_image_path || null,
          is_active: !!(fund.is_active),
          is_public: !!(fund.is_public),
          show_total_raised: !!(fund.show_total_raised),
          show_contributor_names: fund.show_contributor_names !== false,
          closes_at: fund.closes_at || null,
          created_at: fund.created_at,
          raised_amount_minor: raisedAmount,
          contributor_count: paidContribs.length,
          recent_contributions: recentContributions,
        };
      });

      giftFundData = { funds, couple_account_ready: coupleAccountReady };
    } else {
      giftFundData = { funds: [], couple_account_ready: false };
    }

    // Gallery
    let galleryData: Record<string, unknown> | null = null;
    const { data: albums } = await supabase.from("gallery_albums").select("*").eq("wedding_id", session.wedding_id).in("publication_status", ["published", "scheduled"]).order("sort_order").order("created_at");
    if (albums && albums.length > 0) {
      const albumIds = albums.map((a) => a.id);
      const { data: gAudiences } = await supabase.from("gallery_album_audiences").select("*").eq("wedding_id", session.wedding_id).in("album_id", albumIds);
      const audMap = new Map<string, Array<Record<string, unknown>>>();
      (gAudiences || []).forEach((aud) => { const arr = audMap.get(aud.album_id as string) || []; arr.push(aud); audMap.set(aud.album_id as string, arr); });
      function canViewAlbum(album: Record<string, unknown>): boolean {
        const v = album.visibility || "all_guests"; const ra = album.reveal_at as string | null;
        if (v === "hidden") return false;
        if (v === "hidden_until_date" && ra) return now >= new Date(ra);
        if (v === "all_guests") return true;
        const auds = audMap.get(album.id as string); if (!auds || auds.length === 0) return true;
        for (const a of auds) { if (a.audience_type === "invitation" && a.invitation_id === session.invitation_id) return true; if (a.audience_type === "guest" && guestIds.includes(a.guest_id as string)) return true; if (a.audience_type === "household" && householdIds.includes(a.household_id as string)) return true; }
        return false;
      }
      const visibleAlbums = albums.filter((a) => canViewAlbum(a));
      const visibleAlbumIds = visibleAlbums.map((a) => a.id);
      const { data: allAssets } = await supabase.from("gallery_assets").select("*").eq("wedding_id", session.wedding_id).in("album_id", visibleAlbumIds).order("sort_order").order("created_at");
      const approvedAssets = (allAssets || []).filter((a) => a.moderation_status === "approved" || a.publication_status === "published");
      const myUploads = (allAssets || []).filter((a) => a.uploaded_by_guest_id && guestIds.includes(a.uploaded_by_guest_id as string) && a.moderation_status !== "approved" && a.publication_status !== "published");
      const visibleAssets = [...approvedAssets, ...myUploads];
      const signedUrlMap = new Map<string, string>(); const thumbUrlMap = new Map<string, string>();
      const B = 50;
      for (let i = 0; i < visibleAssets.length; i += B) { const batch = visibleAssets.slice(i, i + B); const paths = batch.map((a) => a.storage_path as string).filter(Boolean); if (paths.length > 0) { const { data: su } = await supabase.storage.from("private").createSignedUrls(paths, 3600); if (su) for (const s of su) { if (s.signedUrl && s.path) signedUrlMap.set(s.path, s.signedUrl); } } }
      for (let i = 0; i < visibleAssets.length; i += B) { const batch = visibleAssets.slice(i, i + B); const tps = batch.map((a) => a.thumbnail_path as string).filter(Boolean); if (tps.length > 0) { const { data: tu } = await supabase.storage.from("private").createSignedUrls(tps, 3600); if (tu) for (const t of tu) { if (t.signedUrl && t.path) thumbUrlMap.set(t.path, t.signedUrl); } } }
      const coverPaths = visibleAlbums.map((a) => a.cover_image_path as string).filter(Boolean);
      const coverUrlMap = new Map<string, string>();
      if (coverPaths.length > 0) { const { data: cu } = await supabase.storage.from("private").createSignedUrls(coverPaths, 3600); if (cu) for (const c of cu) { if (c.signedUrl && c.path) coverUrlMap.set(c.path, c.signedUrl); } }
      const { data: favourites } = await supabase.from("gallery_favourites").select("asset_id").eq("invitation_id", session.invitation_id).in("guest_id", guestIds);
      const favIds = new Set((favourites || []).map((f) => f.asset_id));
      const primaryGuestId = guestIds[0];
      const { data: readStates } = await supabase.from("gallery_album_read_state").select("*").eq("invitation_id", session.invitation_id).in("guest_id", guestIds);
      const readMap = new Map<string, string>();
      (readStates || []).forEach((rs) => { const k = `${rs.album_id}_${rs.guest_id}`; const e = readMap.get(k); if (!e || (rs.last_viewed_at as string) > e) readMap.set(k, rs.last_viewed_at as string); });
      const { data: uploadSettings } = await supabase.from("gallery_upload_settings").select("*").eq("wedding_id", session.wedding_id).maybeSingle();
      const albumMap = new Map<string, { album: Record<string, unknown>; assets: Record<string, unknown>[] }>();
      for (const alb of visibleAlbums) albumMap.set(alb.id, { album: alb as Record<string, unknown>, assets: [] });
      for (const asset of visibleAssets) {
        const entry = albumMap.get(asset.album_id as string); if (!entry) continue;
        const a = asset as Record<string, unknown>;
        entry.assets.push({ id: a.id, title: a.title || null, description: a.description || null, caption: a.caption || null, credit_name: a.credit_name || null, credit_visibility: a.credit_visibility || "private", source_type: a.source_type || "couple", storage_path: a.storage_path, mime_type: a.mime_type, file_size: a.file_size, width: a.width || null, height: a.height || null, moderation_status: a.moderation_status, is_featured: !!(a.is_featured), publication_status: a.publication_status || "published", downloads_enabled: a.downloads_enabled !== false, sharing_enabled: a.sharing_enabled !== false, uploaded_by_guest_id: a.uploaded_by_guest_id || null, is_favourited: favIds.has(a.id as string), signed_url: signedUrlMap.get(a.storage_path as string) || "", thumbnail_signed_url: a.thumbnail_path ? (thumbUrlMap.get(a.thumbnail_path as string) || null) : null, published_at: a.published_at || a.created_at, created_at: a.created_at });
      }
      const galleryAlbums = Array.from(albumMap.values()).map((entry) => {
        const alb = entry.album; const lv = readMap.get(`${alb.id}_${primaryGuestId}`);
        const hasNew = lv ? entry.assets.some((a) => a.published_at && new Date(a.published_at as string) > new Date(lv as string)) : entry.assets.length > 0;
        return { id: alb.id, title: alb.title, name: alb.name || null, description: alb.description || null, album_type: alb.album_type, cover_image_path: alb.cover_image_path || null, cover_signed_url: alb.cover_image_path ? (coverUrlMap.get(alb.cover_image_path as string) || null) : null, sort_order: alb.sort_order || 0, allow_downloads: alb.downloads_enabled !== false && !!(alb.allow_downloads), allow_favourites: !!(alb.allow_favourites), allow_sharing: alb.sharing_enabled !== false && !!(alb.allow_sharing), allow_uploads: !!(alb.allow_uploads), downloads_enabled: alb.downloads_enabled !== false, sharing_enabled: alb.sharing_enabled !== false, linked_event_id: alb.linked_event_id || null, visibility: alb.visibility || "all_guests", reveal_at: alb.reveal_at || null, publication_status: alb.publication_status || "published", published_at: alb.created_at, archived_at: alb.archived_at || null, last_viewed_at: lv || null, has_new_images: hasNew, asset_count: entry.assets.length, assets: entry.assets };
      }).filter((a) => a.asset_count > 0 || a.allow_uploads);
      const featuredAlbum = galleryAlbums.find((a) => a.album_type === "featured") || galleryAlbums[0] || null;
      const allApproved = galleryAlbums.flatMap((a) => a.assets).filter((a) => a.moderation_status === "approved");
      const recentPhotos = allApproved.sort((a, b) => new Date(b.created_at as string).getTime() - new Date(a.created_at as string).getTime()).slice(0, 12);
      galleryData = { albums: galleryAlbums, total_assets: visibleAssets.filter((a) => a.moderation_status === "approved").length, upload_settings: uploadSettings ? { id: uploadSettings.id, wedding_id: uploadSettings.wedding_id, uploads_enabled: !!(uploadSettings.uploads_enabled), opens_at: uploadSettings.opens_at || null, closes_at: uploadSettings.closes_at || null, moderation_mode: uploadSettings.moderation_mode || "require_approval", max_files_per_batch: uploadSettings.max_files_per_batch || 10, max_files_per_guest: uploadSettings.max_files_per_guest || 50, max_file_size_bytes: uploadSettings.max_file_size_bytes || 20971520, guest_credit_default: uploadSettings.guest_credit_default || "private" } : null, my_uploads_count: myUploads.length, my_favourites_count: favIds.size, featured_album: featuredAlbum, recent_photos: recentPhotos, couple_message: portalSettings?.gallery_guest_message || null };
    }

    // Questions, Contacts, Settings, Travel
    const { data: faqs } = await supabase.from("wedding_faqs").select("*").eq("wedding_id", session.wedding_id).eq("status", "published").order("sort_order");
    const { data: myQuestions } = await supabase.from("guest_questions").select("*").eq("wedding_id", session.wedding_id).eq("invitation_id", session.invitation_id).order("created_at", { ascending: false });
    // Load feedback for this invitation's guests to set my_feedback
    const faqIds = (faqs || []).map((f) => f.id);
    let feedbackMap = new Map<string, string>();
    if (faqIds.length > 0 && guestIds.length > 0) {
      const { data: feedbackRows } = await supabase.from("question_activity").select("faq_id, activity_type").eq("invitation_id", session.invitation_id).in("guest_id", guestIds).in("faq_id", faqIds);
      (feedbackRows || []).forEach((fb: Record<string, unknown>) => { if (fb.faq_id) feedbackMap.set(fb.faq_id as string, fb.activity_type as string); });
    }
    const questionsData = { faqs: (faqs || []).map((f) => ({ id: f.id, category: f.category || "general", question: f.question, answer: f.answer, sort_order: f.sort_order || 0, helpful_count: f.helpful_count || 0, not_helpful_count: f.not_helpful_count || 0, my_feedback: (feedbackMap.get(f.id) as "helpful" | "not_helpful") || null, related_links: f.related_links || [] })), my_questions: (myQuestions || []).map((q) => ({ id: q.id, category: q.category || "general", subject: q.subject, message: q.message, preferred_response_method: q.preferred_response_method || "portal", status: q.status || "pending", answer: q.response || null, answered_at: q.responded_at || null, created_at: q.created_at })), total_faqs: (faqs || []).length };
    const { data: contacts } = await supabase.from("wedding_contacts").select("*").eq("wedding_id", session.wedding_id).eq("is_published", true).order("sort_order");
    const contactsData = contacts && contacts.length > 0 ? { contacts: contacts.map((c) => ({ id: c.id, name: c.name, role: c.role, phone: c.phone || null, email: c.email || null, availability: c.availability || null, is_emergency: !!(c.is_emergency) })), total: contacts.length } : null;
    const { data: guestProfiles } = await supabase.from("guests").select("id, preferred_name, email, mobile_phone, alternative_phone, preferred_contact_method, dietary_requirements, allergy_notes, accessibility_notes, accessibility_needs").in("id", guestIds).eq("wedding_id", session.wedding_id);
    const { data: notifPrefs } = await supabase.from("guest_notification_preferences").select("*").eq("invitation_id", session.invitation_id).in("guest_id", guestIds);
    const settingsData = { profiles: (guestProfiles || []).map((gp) => ({ guest_id: gp.id, preferred_name: gp.preferred_name || null, email: gp.email || null, mobile_phone: gp.mobile_phone || null, alternative_phone: gp.alternative_phone || null, preferred_contact_method: gp.preferred_contact_method || null, dietary_requirements: gp.dietary_requirements || null, allergy_notes: gp.allergy_notes || null, accessibility_notes: gp.accessibility_notes || null, accessibility_needs: gp.accessibility_needs || null })), notification_preferences: (notifPrefs || []).map((p) => ({ id: p.id, guest_id: p.guest_id, updates_enabled: !!(p.updates_enabled), email_notifications: !!(p.email_notifications), sms_enabled: !!(p.sms_enabled), important_only_updates: !!(p.important_only_updates), travel_updates: p.travel_updates !== false, rsvp_reminders: p.rsvp_reminders !== false, gallery_notifications: p.gallery_notifications !== false, language: (p.language as string) || "en-GB", timezone: (p.timezone as string) || "Europe/London" })), consent: { communication: true, marketing: false }, privacy_requests: [] };
    const { data: localPlaces } = await supabase.from("wedding_local_places").select("*").eq("wedding_id", session.wedding_id).eq("is_approved", true).order("sort_order");
    const { data: travelPlans } = await supabase.from("guest_travel_plans").select("*").eq("invitation_id", session.invitation_id);

    await supabase.from("guest_access_sessions").update({ last_seen_at: new Date().toISOString() }).eq("id", session.id);

    return new Response(JSON.stringify({ valid: true, data: { wedding: { ...wedding, timezone: wedding.timezone || "Europe/London" }, invitation: { id: invitation.id, formal_recipient_name: invitation.formal_recipient_name, informal_greeting: invitation.informal_greeting, invitation_type: invitation.invitation_type, rsvp_deadline: invitation.rsvp_deadline, status: invitation.status, template: invitation.template }, recipients: guestRecipients, events: filteredEvents, portal_settings: portalSettings, rsvp_responses: rsvpMap, rsvp_submission: rsvpSubmission || null, seating: seatingData, registry: registryData, gift_funds: giftFundData, gallery: galleryData, questions: questionsData, contacts: contactsData, settings: settingsData, local_places: (localPlaces || []).map((lp) => ({ id: lp.id, name: lp.name, place_type: lp.place_type, address_line_1: lp.address_line_1, city: lp.city, postcode: lp.postcode, country: lp.country, description: lp.description, image_url: lp.image_url, website: lp.website, telephone: lp.telephone, sort_order: lp.sort_order })), travel_plans: (travelPlans || []).map((tp) => ({ id: tp.id, guest_id: tp.guest_id, plan_type: tp.plan_type, place_id: tp.place_id, check_in_date: tp.check_in_date, check_out_date: tp.check_out_date, notes: tp.notes, created_at: tp.created_at })), travel_venue_links: [], travel_updates: [] }, wedding_id: session.wedding_id }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("guest-portal-loader error:", err);
    return new Response(JSON.stringify({ valid: false, error: "unavailable" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});