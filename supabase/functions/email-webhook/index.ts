import { Webhook } from "npm:svix@1.99.1";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
Deno.serve(async (req) => {
  if (req.method !== "POST")
    return new Response("Method not allowed", { status: 405 });
  const secret = Deno.env.get("RESEND_WEBHOOK_SECRET");
  if (!secret)
    return new Response("Webhook is not configured", { status: 503 });
  const eventId = req.headers.get("svix-id") || "";
  let event: {
    type: string;
    data: { email_id?: string; bounce_reason?: string };
  };
  try {
    event = new Webhook(secret).verify(await req.text(), {
      "svix-id": eventId,
      "svix-timestamp": req.headers.get("svix-timestamp") || "",
      "svix-signature": req.headers.get("svix-signature") || "",
    }) as typeof event;
  } catch {
    return new Response("Invalid webhook signature", { status: 401 });
  }
  if (!event?.data?.email_id || typeof event.type !== "string")
    return new Response("Invalid event", { status: 400 });
  try {
    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    await db
      .rpc("apply_email_delivery_event", {
        p_event_id: eventId,
        p_email_id: event.data.email_id,
        p_type: event.type,
        p_reason: event.data.bounce_reason || event.type,
      })
      .throwOnError();
    return Response.json({ received: true });
  } catch {
    return new Response("Delivery event could not be recorded", {
      status: 500,
    });
  }
});
