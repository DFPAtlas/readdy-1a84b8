import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ── Valid payment status transitions ──
const VALID_TRANSITIONS: Record<string, string[]> = {
  "pending": ["processing", "failed", "cancelled"],
  "processing": ["paid", "failed", "cancelled"],
  "paid": ["refunded", "disputed"],
  "refunded": ["disputed"],
  "disputed": ["dispute_won", "dispute_lost"],
  "dispute_won": [],
  "dispute_lost": [],
  "failed": [],
  "cancelled": [],
};

function isValidTransition(from: string, to: string): boolean {
  const allowed = VALID_TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(to);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = (Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_PUBLIC_SUPABASE_URL"))!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!stripeKey || !webhookSecret) {
    return new Response(JSON.stringify({ error: "Stripe webhook not configured." }), {
      status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const stripe = new Stripe(stripeKey, { apiVersion: "2025-06-15.basil" });

  try {
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return new Response(JSON.stringify({ error: "Missing signature" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawBody = await req.text();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Check for duplicate event ──
    const { data: existingEvent } = await supabase
      .from("gift_fund_events")
      .select("id, processing_status")
      .eq("stripe_event_id", event.id)
      .maybeSingle();

    if (existingEvent) {
      if (existingEvent.processing_status === "processed") {
        return new Response(JSON.stringify({ received: true, status: "duplicate" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (existingEvent.processing_status === "failed") {
        // Retry processing
      } else {
        return new Response(JSON.stringify({ received: true, status: "already_received" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ── Record event ──
    let contributionId: string | null = null;

    // Extract contribution_id from event object metadata
    const obj = event.data.object as Record<string, unknown>;
    const metadata = (obj?.metadata || {}) as Record<string, string>;
    contributionId = metadata?.contribution_id || null;

    // For account.updated, we handle separately
    if (event.type === "account.updated") {
      const account = event.data.object as Stripe.Account;
      const userId = account.metadata?.user_id;

      if (userId) {
        const updated = {
          onboarding_complete: account.charges_enabled && account.payouts_enabled && !account.requirements?.currently_due?.length,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          requirements_due: (account.requirements?.currently_due?.length || 0) > 0,
        };

        await supabase
          .from("gift_fund_accounts")
          .update(updated)
          .eq("stripe_account_id", account.id)
          .eq("user_id", userId);
      }

      await supabase.from("gift_fund_events").insert({
        contribution_id: null,
        stripe_event_id: event.id,
        event_type: event.type,
        processing_status: "processed",
      });

      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Record the event
    const { error: eventInsertErr } = await supabase
      .from("gift_fund_events")
      .insert({
        contribution_id: contributionId || null,
        stripe_event_id: event.id,
        event_type: event.type,
        processing_status: "received",
      });

    if (eventInsertErr) {
      console.error("Failed to record event:", eventInsertErr);
    }

    // ── Process by event type ──

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const cId = session.metadata?.contribution_id;

        if (!cId) {
          await supabase.from("gift_fund_events").update({ processing_status: "skipped" }).eq("stripe_event_id", event.id);
          break;
        }

        // Load contribution
        const { data: contribution } = await supabase
          .from("gift_fund_contributions")
          .select("*")
          .eq("id", cId)
          .maybeSingle();

        if (!contribution) {
          await supabase.from("gift_fund_events").update({ processing_status: "failed" }).eq("stripe_event_id", event.id);
          break;
        }

        // Validate transition
        if (!isValidTransition(contribution.payment_status, "paid")) {
          console.warn(`Invalid transition for ${cId}: ${contribution.payment_status} -> paid`);
          await supabase.from("gift_fund_events").update({ processing_status: "skipped" }).eq("stripe_event_id", event.id);
          break;
        }

        // Verify metadata matches
        const verifyFundId = session.metadata?.fund_id;
        const verifyWeddingId = session.metadata?.wedding_id;

        if (verifyFundId !== contribution.fund_id || verifyWeddingId !== contribution.wedding_id) {
          console.error(`Metadata mismatch for contribution ${cId}`);
          await supabase.from("gift_fund_events").update({ processing_status: "failed" }).eq("stripe_event_id", event.id);
          break;
        }

        // Verify amount
        const expectedAmount = contribution.amount_minor;
        const actualAmount = session.amount_total;
        if (actualAmount !== expectedAmount) {
          console.error(`Amount mismatch for ${cId}: expected ${expectedAmount}, got ${actualAmount}`);
          await supabase.from("gift_fund_events").update({ processing_status: "failed" }).eq("stripe_event_id", event.id);
          break;
        }

        // Mark as paid
        const paymentIntentId = typeof session.payment_intent === "string"
          ? session.payment_intent
          : (session.payment_intent as Stripe.PaymentIntent)?.id || null;

        await supabase
          .from("gift_fund_contributions")
          .update({
            payment_status: "paid",
            stripe_payment_intent_id: paymentIntentId,
            paid_at: new Date().toISOString(),
          })
          .eq("id", cId);

        await supabase.from("gift_fund_events").update({ processing_status: "processed" }).eq("stripe_event_id", event.id);
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        const cId = session.metadata?.contribution_id;

        if (cId) {
          const { data: contribution } = await supabase
            .from("gift_fund_contributions")
            .select("payment_status")
            .eq("id", cId)
            .maybeSingle();

          if (contribution && contribution.payment_status === "processing") {
            await supabase
              .from("gift_fund_contributions")
              .update({ payment_status: "cancelled" })
              .eq("id", cId);
          }
        }

        await supabase.from("gift_fund_events").update({ processing_status: "processed" }).eq("stripe_event_id", event.id);
        break;
      }

      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const cId = pi.metadata?.contribution_id;

        if (cId) {
          const { data: contribution } = await supabase
            .from("gift_fund_contributions")
            .select("payment_status")
            .eq("id", cId)
            .maybeSingle();

          if (contribution && ["pending", "processing"].includes(contribution.payment_status)) {
            await supabase
              .from("gift_fund_contributions")
              .update({ payment_status: "failed" })
              .eq("id", cId);
          }
        }

        await supabase.from("gift_fund_events").update({ processing_status: "processed" }).eq("stripe_event_id", event.id);
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const cId = charge.metadata?.contribution_id;

        if (cId) {
          const { data: contribution } = await supabase
            .from("gift_fund_contributions")
            .select("*")
            .eq("id", cId)
            .maybeSingle();

          if (contribution && contribution.payment_status === "paid") {
            const refundedAmount = charge.amount_refunded;
            await supabase
              .from("gift_fund_contributions")
              .update({
                payment_status: refundedAmount >= contribution.amount_minor ? "refunded" : "paid",
                refunded_amount_minor: refundedAmount,
              })
              .eq("id", cId);
          }
        }

        await supabase.from("gift_fund_events").update({ processing_status: "processed" }).eq("stripe_event_id", event.id);
        break;
      }

      case "charge.dispute.created": {
        const dispute = event.data.object as Stripe.Dispute;
        const charge = dispute.charge as string;
        // Find contribution by payment intent from charge
        const { data: chargeObj } = await stripe.charges.retrieve(charge);
        const cId = chargeObj.metadata?.contribution_id;

        if (cId) {
          const { data: contribution } = await supabase
            .from("gift_fund_contributions")
            .select("payment_status")
            .eq("id", cId)
            .maybeSingle();

          if (contribution && contribution.payment_status === "paid") {
            await supabase
              .from("gift_fund_contributions")
              .update({ payment_status: "disputed" })
              .eq("id", cId);
          }
        }

        await supabase.from("gift_fund_events").update({ processing_status: "processed" }).eq("stripe_event_id", event.id);
        break;
      }

      case "charge.dispute.closed": {
        const dispute = event.data.object as Stripe.Dispute;
        const charge = dispute.charge as string;
        const { data: chargeObj } = await stripe.charges.retrieve(charge);
        const cId = chargeObj.metadata?.contribution_id;

        if (cId) {
          const newStatus = dispute.status === "won" ? "dispute_won" : "dispute_lost";
          await supabase
            .from("gift_fund_contributions")
            .update({ payment_status: newStatus })
            .eq("id", cId)
            .eq("payment_status", "disputed");
        }

        await supabase.from("gift_fund_events").update({ processing_status: "processed" }).eq("stripe_event_id", event.id);
        break;
      }

      default: {
        // Unhandled event type — mark as processed but do nothing
        await supabase.from("gift_fund_events").update({ processing_status: "processed" }).eq("stripe_event_id", event.id);
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("stripe-gift-fund-webhook error:", err);
    return new Response(JSON.stringify({ error: "Webhook processing error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
