
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PLACE_TYPES_MAP: Record<string, string> = {
  hotel: "lodging",
  restaurant: "restaurant",
  cafe: "cafe",
  pub: "bar",
  taxi: "taxi_stand",
  railway_station: "train_station",
  parking: "parking",
  pharmacy: "pharmacy",
  supermarket: "supermarket",
  attraction: "tourist_attraction",
};

const CATEGORIES = [
  { key: "hotel", label: "Hotels", icon: "ri-hotel-line", types: ["lodging"] },
  { key: "restaurant", label: "Restaurants", icon: "ri-restaurant-line", types: ["restaurant"] },
  { key: "cafe", label: "Cafés", icon: "ri-cup-line", types: ["cafe"] },
  { key: "pub", label: "Pubs & Bars", icon: "ri-goblet-line", types: ["bar"] },
  { key: "taxi", label: "Taxis", icon: "ri-taxi-line", types: ["taxi_stand"] },
  { key: "railway_station", label: "Railway Stations", icon: "ri-train-line", types: ["train_station"] },
  { key: "parking", label: "Parking", icon: "ri-parking-box-line", types: ["parking"] },
  { key: "pharmacy", label: "Pharmacies", icon: "ri-medicine-bottle-line", types: ["pharmacy"] },
  { key: "supermarket", label: "Supermarkets", icon: "ri-shopping-basket-line", types: ["supermarket"] },
  { key: "attraction", label: "Attractions", icon: "ri-landscape-line", types: ["tourist_attraction"] },
];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = (Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_PUBLIC_SUPABASE_URL"))!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);
  const googleApiKey = Deno.env.get("GOOGLE_PLACES_API_KEY");

  try {
    const body = await req.json();
    const { action, wedding_id, venue_lat, venue_lng, radius_miles, category, place_id, query } = body || {};

    if (!wedding_id) {
      return new Response(JSON.stringify({ success: false, error: "wedding_id is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── ACTION: search nearby ──
    if (action === "search") {
      if (!googleApiKey) {
        return new Response(JSON.stringify({ success: false, error: "google_api_not_configured", message: "Google Places API key is not configured. Add it in Supabase Secrets as GOOGLE_PLACES_API_KEY." }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (!venue_lat || !venue_lng) {
        return new Response(JSON.stringify({ success: false, error: "venue_lat and venue_lng are required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const radiusMeters = Math.round((radius_miles || 5) * 1609.34);
      const types = category && PLACE_TYPES_MAP[category] ? PLACE_TYPES_MAP[category] : undefined;

      let url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${venue_lat},${venue_lng}&radius=${radiusMeters}&key=${googleApiKey}`;
      if (types) url += `&type=${types}`;
      if (query) url += `&keyword=${encodeURIComponent(query)}`;

      const resp = await fetch(url);
      const data = await resp.json();

      if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
        console.error("Google Places error:", data.status, data.error_message);
        return new Response(JSON.stringify({ success: false, error: "places_api_error", message: data.error_message || data.status }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const results = (data.results || []).map((p: Record<string, unknown>) => ({
        google_place_id: p.place_id,
        name: p.name,
        address_line_1: p.vicinity,
        latitude: p.geometry?.location?.lat ?? null,
        longitude: p.geometry?.location?.lng ?? null,
        provider_rating: p.rating?.toString() ?? null,
        review_count: p.user_ratings_total ?? null,
        price_level: p.price_level != null ? Array(Number(p.price_level) + 1).fill("£").join("") : null,
        place_types: p.types || [],
        photo_reference: p.photos?.[0]?.photo_reference || null,
        provider_data: {
          types: p.types,
          business_status: p.business_status,
          icon: p.icon,
        },
      }));

      // Cache results by storing google_place_id lookups
      return new Response(JSON.stringify({ success: true, results, total: results.length, categories: CATEGORIES }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── ACTION: get place photo URL ──
    if (action === "photo") {
      if (!googleApiKey) {
        return new Response(JSON.stringify({ success: false, error: "google_api_not_configured" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const photoRef = body.photo_reference;
      if (!photoRef) {
        return new Response(JSON.stringify({ success: false, error: "photo_reference is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const maxWidth = body.max_width || 800;
      const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${encodeURIComponent(photoRef)}&key=${googleApiKey}`;
      return new Response(JSON.stringify({ success: true, photo_url: photoUrl }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── ACTION: place details ──
    if (action === "details") {
      if (!googleApiKey) {
        return new Response(JSON.stringify({ success: false, error: "google_api_not_configured" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (!place_id) {
        return new Response(JSON.stringify({ success: false, error: "place_id is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const fields = "name,formatted_address,formatted_phone_number,website,opening_hours,rating,user_ratings_total,price_level,geometry,types,photos";
      const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(place_id)}&fields=${fields}&key=${googleApiKey}`;
      const resp = await fetch(detailsUrl);
      const data = await resp.json();

      if (data.status !== "OK") {
        return new Response(JSON.stringify({ success: false, error: "places_api_error", message: data.status }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const p = data.result;
      return new Response(JSON.stringify({
        success: true,
        place: {
          google_place_id: p.place_id,
          name: p.name,
          address_line_1: p.formatted_address,
          latitude: p.geometry?.location?.lat ?? null,
          longitude: p.geometry?.location?.lng ?? null,
          website: p.website || null,
          telephone: p.formatted_phone_number || null,
          opening_info: p.opening_hours?.weekday_text?.join("; ") || null,
          provider_rating: p.rating?.toString() ?? null,
          review_count: p.user_ratings_total ?? null,
          price_level: p.price_level != null ? Array(Number(p.price_level) + 1).fill("£").join("") : null,
          photo_reference: p.photos?.[0]?.photo_reference || null,
          place_types: p.types || [],
        },
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── ACTION: geocode ──
    if (action === "geocode") {
      if (!googleApiKey) {
        return new Response(JSON.stringify({ success: false, error: "google_api_not_configured" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const address = body.address;
      if (!address) {
        return new Response(JSON.stringify({ success: false, error: "address is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${googleApiKey}`;
      const resp = await fetch(geoUrl);
      const data = await resp.json();

      if (data.status !== "OK" || !data.results?.length) {
        return new Response(JSON.stringify({ success: false, error: "geocode_failed", message: data.status }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const loc = data.results[0].geometry.location;
      return new Response(JSON.stringify({
        success: true,
        result: {
          formatted_address: data.results[0].formatted_address,
          latitude: loc.lat,
          longitude: loc.lng,
          place_id: data.results[0].place_id,
        },
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: false, error: "invalid_action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("travel-places-discover error:", err);
    return new Response(JSON.stringify({ success: false, error: "internal_error", message: String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
