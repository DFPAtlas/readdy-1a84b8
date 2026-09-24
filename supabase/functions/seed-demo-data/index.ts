
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function sha256(text: string): string {
  const data = new TextEncoder().encode(text);
  const hash = crypto.subtle.digestSync("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const WEDDING_ID = "00000000-0000-0000-0000-000000000001";
const INVITATION_ID = "3c744b56-c37b-44a9-b1a9-8cf73bdc41ad";
const SEATING_PLAN_ID = "a8b43062-761d-43a2-8dec-decde6100df9";
const DEMO_TOKEN = "DEMO-VOWORA-2026";
const VENUE_CHURCH = "2af954be-3170-4c2e-a49c-322bc5921c0e";
const VENUE_ORANGERY = "d5ca9248-848d-47d9-b182-746d70c3183c";

const GUESTS = {
  priya: "5b5817b4-c66f-471d-b99b-a8837e042b31",
  raj: "e64c4909-3c10-4d04-83e5-3fa54f5e68c1",
  anika: "66b94c44-bd3b-48f5-a859-685f99ad43f3",
  rohan: "0b8537e9-2ef8-4bc8-9a36-0713824bb8bd",
};

const CEREMONY_EVENT = "ffa1096a-118d-4c1f-8b67-3d98e64fc4f8";
const RECEPTION_EVENT = "df6f0aab-573a-40ee-97cd-364a862b2565";
const EVENING_EVENT = "b2db65d5-9fb7-43b4-abf4-2aa68d8cbc09";
const WELCOME_EVENT = "3a77c7f8-33e4-4c79-bb0d-0a9b25d92b0a";
const FAREWELL_EVENT = "b24822bb-6bc7-4de2-b5f4-65d9f770d357";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = (Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_PUBLIC_SUPABASE_URL"))!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const tokenHash = sha256(DEMO_TOKEN);
    const now = new Date().toISOString();

    // ──────────────────────────────────────
    // 1. Create demo access token
    // ──────────────────────────────────────
    const { data: existingToken } = await supabase
      .from("invitation_access_tokens")
      .select("id")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    let accessTokenId: string;
    if (existingToken) {
      accessTokenId = existingToken.id;
      await supabase
        .from("invitation_access_tokens")
        .update({ status: "active", expires_at: "2027-12-31T23:59:59Z" })
        .eq("id", accessTokenId);
    } else {
      const { data: newToken } = await supabase
        .from("invitation_access_tokens")
        .insert({
          wedding_id: WEDDING_ID,
          invitation_id: INVITATION_ID,
          token_hash: tokenHash,
          token_version: 1,
          status: "active",
          expires_at: "2027-12-31T23:59:59Z",
          created_by: "00000000-0000-0000-0000-000000000000",
        })
        .select("id")
        .single();
      accessTokenId = newToken!.id;
    }

    // ──────────────────────────────────────
    // 2. Link venues to events
    // ──────────────────────────────────────
    await supabase.from("wedding_events").update({ venue_id: VENUE_CHURCH }).eq("id", CEREMONY_EVENT);
    await supabase.from("wedding_events").update({ venue_id: VENUE_ORANGERY }).eq("id", RECEPTION_EVENT);
    await supabase.from("wedding_events").update({ venue_id: VENUE_ORANGERY }).eq("id", EVENING_EVENT);

    // ──────────────────────────────────────
    // 3. Seed gallery albums
    // ──────────────────────────────────────
    const albums = [
      { name: "Engagement Photos", album_type: "engagement", description: "Our favourite moments from the proposal and engagement shoot in the Cotswolds.", sort_order: 1 },
      { name: "The Ceremony", album_type: "ceremony", description: "Beautiful moments from our wedding ceremony at St Mary's Church.", sort_order: 2, linked_event_id: CEREMONY_EVENT },
      { name: "Wedding Breakfast & Speeches", album_type: "reception", description: "The wedding breakfast, heartfelt speeches and cake cutting.", sort_order: 3, linked_event_id: RECEPTION_EVENT },
      { name: "Evening Celebrations", album_type: "evening", description: "Dancing, live band and celebration into the night.", sort_order: 4, linked_event_id: EVENING_EVENT },
      { name: "Welcome Drinks", album_type: "custom", description: "A relaxed evening before the big day at The Marlborough Tavern.", sort_order: 5, linked_event_id: WELCOME_EVENT },
    ];

    const albumIds: Record<string, string> = {};

    for (const album of albums) {
      const { data: existing } = await supabase
        .from("gallery_albums")
        .select("id")
        .eq("wedding_id", WEDDING_ID)
        .eq("name", album.name)
        .maybeSingle();

      if (existing) {
        albumIds[album.name] = existing.id;
        await supabase.from("gallery_albums").update({
          description: album.description,
          album_type: album.album_type,
          publication_status: "published",
          visibility: "all_guests",
          sort_order: album.sort_order,
          linked_event_id: album.linked_event_id || null,
          downloads_enabled: true,
          sharing_enabled: true,
          published_at: now,
        }).eq("id", existing.id);
      } else {
        const { data: created } = await supabase.from("gallery_albums").insert({
          wedding_id: WEDDING_ID,
          name: album.name,
          description: album.description,
          album_type: album.album_type,
          cover_asset_id: null,
          publication_status: "published",
          visibility: "all_guests",
          sort_order: album.sort_order,
          linked_event_id: album.linked_event_id || null,
          downloads_enabled: true,
          sharing_enabled: true,
          published_at: now,
          created_by: "00000000-0000-0000-0000-000000000000",
        }).select("id").single();
        albumIds[album.name] = created!.id;
      }
    }

    // ──────────────────────────────────────
    // 4. Seed gallery assets (representative photos via Stable Diffusion URLs)
    // ──────────────────────────────────────
    const assetData = [
      { album: "Engagement Photos", caption: "The moment James proposed at sunset in the Cotswolds", credit: "Sarah Harper Photography", sort: 1 },
      { album: "Engagement Photos", caption: "Celebrating with champagne after she said yes", credit: "Sarah Harper Photography", sort: 2 },
      { album: "Engagement Photos", caption: "Walking through lavender fields at golden hour", credit: "Sarah Harper Photography", sort: 3 },
      { album: "The Ceremony", caption: "Emma arriving at St Mary's Church with her father", credit: "Sarah Harper Photography", sort: 1 },
      { album: "The Ceremony", caption: "The first look as Emma walks down the aisle", credit: "Sarah Harper Photography", sort: 2 },
      { album: "The Ceremony", caption: "Exchanging rings at the altar", credit: "Sarah Harper Photography", sort: 3 },
      { album: "Wedding Breakfast & Speeches", caption: "The Orangery set for the wedding breakfast", credit: "Sarah Harper Photography", sort: 1 },
      { album: "Wedding Breakfast & Speeches", caption: "Best man's speech — tears and laughter", credit: "Sarah Harper Photography", sort: 2 },
      { album: "Wedding Breakfast & Speeches", caption: "Cutting the three-tier cake", credit: "Sarah Harper Photography", sort: 3 },
      { album: "Evening Celebrations", caption: "First dance as Mr and Mrs Williams", credit: "Sarah Harper Photography", sort: 1 },
      { album: "Evening Celebrations", caption: "The live band getting everyone on the dance floor", credit: "Sarah Harper Photography", sort: 2 },
      { album: "Welcome Drinks", caption: "Relaxed evening at The Marlborough Tavern", credit: "James' brother Tom", sort: 1 },
    ];

    for (const asset of assetData) {
      const albumId = albumIds[asset.album];
      if (!albumId) continue;

      const { data: existingAsset } = await supabase
        .from("gallery_assets")
        .select("id")
        .eq("album_id", albumId)
        .eq("caption", asset.caption)
        .maybeSingle();

      if (existingAsset) {
        await supabase.from("gallery_assets").update({
          publication_status: "published",
          moderation_status: "approved",
          source_type: "couple",
          caption: asset.caption,
          credit_name: asset.credit,
          credit_visibility: "public",
          sort_order: asset.sort,
          downloads_enabled: true,
          sharing_enabled: true,
          published_at: now,
          mime_type: "image/jpeg",
          file_size: 2400000,
          width: 1600,
          height: 1067,
          storage_path: `demo/gallery/${albumId}/${asset.sort}.jpg`,
        }).eq("id", existingAsset.id);
      } else {
        await supabase.from("gallery_assets").insert({
          wedding_id: WEDDING_ID,
          album_id: albumId,
          title: asset.caption,
          description: null,
          storage_path: `demo/gallery/${albumId}/${asset.sort}.jpg`,
          mime_type: "image/jpeg",
          file_size: 2400000,
          width: 1600,
          height: 1067,
          source_type: "couple",
          caption: asset.caption,
          credit_name: asset.credit,
          credit_visibility: "public",
          moderation_status: "approved",
          publication_status: "published",
          sort_order: asset.sort,
          downloads_enabled: true,
          sharing_enabled: true,
          published_at: now,
        });
      }
    }

    // ──────────────────────────────────────
    // 5. Seed gift registry
    // ──────────────────────────────────────
    const { data: existingRegistry } = await supabase
      .from("gift_registries")
      .select("id")
      .eq("wedding_id", WEDDING_ID)
      .maybeSingle();

    let registryId: string;
    if (existingRegistry) {
      registryId = existingRegistry.id;
    } else {
      const { data: newRegistry } = await supabase.from("gift_registries").insert({
        wedding_id: WEDDING_ID,
        name: "Emma & James Wedding Gift List",
        registry_type: "mixed",
        title: "Our Wedding Gift List",
        description: "Your presence at our wedding is the greatest gift. If you'd like to honour us with something more, we've put together a few ideas below.",
        thank_you_message: "Thank you so much for your generosity — it means the world to us.",
        currency: "GBP",
        enabled: true,
        group_gifting_enabled: true,
        show_donors_publicly: true,
        show_amounts_publicly: false,
        status: "published",
        sort_order: 1,
        opens_at: "2026-01-01T00:00:00Z",
        closes_at: "2027-06-01T00:00:00Z",
        allow_anonymous: true,
      }).select("id").single();
      registryId = newRegistry!.id;
    }

    const giftItems = [
      { title: "KitchenAid Stand Mixer", description: "The pistachio green one we've been eyeing for years — perfect for our Sunday baking tradition.", price: 449, category: "kitchen", is_featured: true, sort: 1 },
      { title: "Le Creuset Casserole Dish", description: "A timeless piece for slow-cooked Sunday roasts and winter stews.", price: 285, category: "kitchen", sort: 2, allow_group_gifting: true },
      { title: "Honeymoon — Safari Experience", description: "A three-day safari in the Serengeti during our Tanzania honeymoon.", price: 1800, category: "experiences", is_featured: true, sort: 3, allow_group_gifting: true },
      { title: "John Lewis Bed Linen Set", description: "Egyptian cotton, 400 thread count — because adulting means caring about thread count.", price: 120, category: "home", sort: 4 },
      { title: "Smeg Two-Slice Toaster", description: "In cream, to match the kitchen we're planning. The little things make a home.", price: 160, category: "kitchen", sort: 5 },
      { title: "Dinner Party Fund", description: "Help us host our first dinner party as newlyweds — we promise to send photos.", price: 250, category: "funds", is_featured: true, sort: 6, allow_group_gifting: true },
      { title: "RHS Garden Membership", description: "A year of botanical garden visits — for weekends exploring together.", price: 65, category: "experiences", sort: 7 },
      { title: "Wedgwood Dinner Set", description: "A classic 12-piece set in white china — for all the dinner parties to come.", price: 380, category: "home", sort: 8, allow_group_gifting: true },
    ];

    for (const gift of giftItems) {
      const { data: existingGift } = await supabase
        .from("gift_registry_items")
        .select("id")
        .eq("registry_id", registryId)
        .eq("title", gift.title)
        .maybeSingle();

      if (existingGift) {
        await supabase.from("gift_registry_items").update({
          description: gift.description,
          price: gift.price,
          category: gift.category,
          is_featured: gift.is_featured || false,
          sort_order: gift.sort,
          currency: "GBP",
          status: "published",
          allow_group_gifting: gift.allow_group_gifting || false,
        }).eq("id", existingGift.id);
      } else {
        await supabase.from("gift_registry_items").insert({
          registry_id: registryId,
          wedding_id: WEDDING_ID,
          title: gift.title,
          description: gift.description,
          price: gift.price,
          category: gift.category,
          is_featured: gift.is_featured || false,
          sort_order: gift.sort,
          currency: "GBP",
          status: "published",
          allow_group_gifting: gift.allow_group_gifting || false,
        });
      }
    }

    // ──────────────────────────────────────
    // 6. Seed more updates
    // ──────────────────────────────────────
    const moreUpdates = [
      { title: "Important — Ceremony Time Change", summary: "The ceremony will now start at 1:30pm instead of 1:00pm. Please arrive by 1:00pm.", category: "schedule", priority: "important", linked_event_id: CEREMONY_EVENT },
      { title: "Weather Update — Bring a Wrap!", summary: "Forecast shows a cool evening — we recommend bringing a light wrap or jacket for the Orangery gardens.", category: "weather", priority: "standard" },
      { title: "Parking at the Orangery", summary: "Complimentary parking is available at the Royal Crescent car park. Please display the wedding parking pass (attached).", category: "parking", priority: "standard", related_route: "travel" },
      { title: "Wedding Gallery Now Live!", summary: "Browse photos from our engagement shoot and the big day. Guest uploads are open — share your favourite moments!", category: "gallery", priority: "standard", related_route: "gallery" },
    ];

    for (const update of moreUpdates) {
      const { data: existingUpdate } = await supabase
        .from("wedding_updates")
        .select("id")
        .eq("wedding_id", WEDDING_ID)
        .eq("title", update.title)
        .maybeSingle();

      if (!existingUpdate) {
        await supabase.from("wedding_updates").insert({
          wedding_id: WEDDING_ID,
          title: update.title,
          summary: update.summary,
          content_data: JSON.stringify([{ type: "paragraph", text: update.summary }]),
          category: update.category,
          priority: update.priority,
          status: "published",
          publish_at: now,
          linked_event_id: update.linked_event_id || null,
          related_route: update.related_route || null,
          dismissible: update.priority !== "emergency",
          published_at: now,
          created_by: "00000000-0000-0000-0000-000000000000",
        });
      }
    }

    // ──────────────────────────────────────
    // 7. Seed travel / local places
    // ──────────────────────────────────────
    const places = [
      { name: "The Marlborough Tavern", place_type: "restaurant", city: "Bath", description: "A charming gastropub serving seasonal British food. Where we're hosting welcome drinks.", is_approved: true, sort: 1 },
      { name: "The Royal Crescent Hotel", place_type: "hotel", city: "Bath", description: "Five-star luxury hotel overlooking the Royal Crescent — a short walk from the Orangery.", is_approved: true, sort: 2 },
      { name: "Bath Spa Railway Station", place_type: "transport", city: "Bath", description: "Direct trains from London Paddington (90 minutes). Taxis available at the rank.", is_approved: true, sort: 3 },
      { name: "Thermae Bath Spa", place_type: "attraction", city: "Bath", description: "Britain's only natural thermal spa — treat yourself to the rooftop pool with views over Bath.", is_approved: true, sort: 4 },
      { name: "The Pump Room", place_type: "restaurant", city: "Bath", description: "Elegant Georgian dining room — perfect for afternoon tea the day after the wedding.", is_approved: true, sort: 5 },
    ];

    for (const place of places) {
      const { data: existingPlace } = await supabase
        .from("wedding_local_places")
        .select("id")
        .eq("wedding_id", WEDDING_ID)
        .eq("name", place.name)
        .maybeSingle();

      if (!existingPlace) {
        await supabase.from("wedding_local_places").insert({
          wedding_id: WEDDING_ID,
          name: place.name,
          place_type: place.place_type,
          city: place.city,
          country: "United Kingdom",
          description: place.description,
          is_approved: place.is_approved,
          approval_status: "approved",
          sort_order: place.sort,
          visibility: "all_guests",
        });
      }
    }

    // ──────────────────────────────────────
    // 8. Seed seating tables and assignments
    // ──────────────────────────────────────
    // First create tables if they don't exist
    const tableDefs = [
      { name: "Table 1 — The Orangery Window", capacity: 8, shape: "round", table_number: 1, sort: 1 },
      { name: "Table 2 — The Garden View", capacity: 8, shape: "round", table_number: 2, sort: 2 },
      { name: "Table 3 — The Bridal Party", capacity: 10, shape: "rectangle", table_number: 3, sort: 3 },
    ];

    const tableIds: Record<string, string> = {};

    for (const td of tableDefs) {
      const { data: existingTable } = await supabase
        .from("seating_tables")
        .select("id")
        .eq("plan_id", SEATING_PLAN_ID)
        .eq("table_number", td.table_number)
        .maybeSingle();

      if (existingTable) {
        tableIds[td.name] = existingTable.id;
      } else {
        const { data: newTable } = await supabase.from("seating_tables").insert({
          plan_id: SEATING_PLAN_ID,
          wedding_id: WEDDING_ID,
          name: td.name,
          shape: td.shape,
          capacity: td.capacity,
          table_number: td.table_number,
          sort_order: td.sort,
        }).select("id").single();
        if (newTable) tableIds[td.name] = newTable.id;
      }
    }

    // Create seat assignments
    const assignments = [
      { table: "Table 1 — The Orangery Window", guest: GUESTS.priya, guest_name: "Priya Patel", seat: 1 },
      { table: "Table 1 — The Orangery Window", guest: GUESTS.raj, guest_name: "Raj Patel", seat: 2 },
      { table: "Table 2 — The Garden View", guest: GUESTS.anika, guest_name: "Anika Patel", seat: 3 },
      { table: "Table 2 — The Garden View", guest: GUESTS.rohan, guest_name: "Rohan Patel", seat: 4 },
    ];

    for (const assign of assignments) {
      const tableId = tableIds[assign.table];
      if (!tableId) continue;

      const { data: existingAssign } = await supabase
        .from("seating_assignments")
        .select("id")
        .eq("plan_id", SEATING_PLAN_ID)
        .eq("guest_id", assign.guest)
        .maybeSingle();

      if (!existingAssign) {
        await supabase.from("seating_assignments").insert({
          plan_id: SEATING_PLAN_ID,
          wedding_id: WEDDING_ID,
          table_id: tableId,
          guest_id: assign.guest,
          seat_label: `Seat ${assign.seat}`,
          assignment_status: "confirmed",
        });
      }
    }

    // ──────────────────────────────────────
    // 9. Publish the seating plan
    // ──────────────────────────────────────
    await supabase.from("seating_plans").update({ status: "published" }).eq("id", SEATING_PLAN_ID);

    // Enable seating in portal settings if needed
    await supabase.from("guest_portal_settings").update({
      seating_enabled: true,
      seating_reveal_at: "2026-08-01T00:00:00Z",
      show_seat_number: true,
      show_room_map: true,
    }).eq("wedding_id", WEDDING_ID);

    // ──────────────────────────────────────
    // Done!
    // ──────────────────────────────────────
    return new Response(
      JSON.stringify({
        success: true,
        demo_url: `/invite/${DEMO_TOKEN}`,
        demo_token: DEMO_TOKEN,
        message: "Demo account seeded! Visit /invite/DEMO-VOWORA-2026 to access the guest portal as the Patel family.",
        summary: {
          wedding: "Emma & James",
          guest_family: "The Patel Family (Priya, Raj, Anika, Rohan)",
          albums_created: albums.length,
          gallery_photos: assetData.length,
          gift_registry_items: giftItems.length,
          updates_total: moreUpdates.length + 3, // 3 existing + new ones
          travel_places: places.length,
          seating_tables: tableDefs.length,
          seating_assignments: assignments.length,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("seed-demo-data error:", err);
    return new Response(
      JSON.stringify({ success: false, error: String(err).slice(0, 500) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
