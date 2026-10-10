import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { edgeGuestCorsHeaders } from "../_shared/guestAccess.ts";
import { unsubscribeToken } from "../_shared/unsubscribe.ts";
Deno.serve(async (req) => {
  const headers = {
    ...edgeGuestCorsHeaders(req),
    "Content-Type": "application/json",
  };
  const reply = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers });
  if (req.method === "OPTIONS") return reply({});
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  try {
    const { wedding, email, token } = await req.json();
    if (
      typeof wedding !== "string" ||
      !/^[a-f0-9-]{36}$/i.test(wedding) ||
      typeof email !== "string" ||
      email.length > 254 ||
      typeof token !== "string" ||
      !/^[a-f0-9]{64}$/.test(token)
    )
      return reply(
        { error: "Use the preferences link from your wedding email." },
        400,
      );
    const secret =
      Deno.env.get("EMAIL_PREFERENCE_SECRET") ||
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
      "";
    if (!secret) return reply({ error: "Email preferences unavailable" }, 503);
    const expected = await unsubscribeToken(wedding, email, secret);
    let difference = 0;
    for (let i = 0; i < 64; i++)
      difference |= expected.charCodeAt(i) ^ token.charCodeAt(i);
    if (difference)
      return reply({ error: "This preferences link is invalid." }, 403);
    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    await db
      .from("email_suppressions")
      .upsert(
        {
          wedding_id: wedding,
          email: email.trim().toLowerCase(),
          suppression_type: "unsubscribed",
          source: "signed_preferences_link",
          suppressed_at: new Date().toISOString(),
        },
        { onConflict: "wedding_id,email" },
      )
      .throwOnError();
    return reply({ success: true });
  } catch {
    return reply(
      { error: "Your preferences could not be saved. Please retry." },
      500,
    );
  }
});
