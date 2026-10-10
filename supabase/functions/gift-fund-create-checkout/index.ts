import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { sha256Hex, validGuestSessionSecret } from "../_shared/guestAccess.ts";
import Stripe from "npm:stripe@22.6.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// The browser holds the raw guest session credential; only its SHA-256 hash is
// stored in guest_access_sessions.session_hash, so hash before every lookup.


// ── Validation ──

const MIN_AMOUNT_MINOR = 100;   // £1.00
const MAX_AMOUNT_MINOR = 500000; // £5,000.00
const MESSAGE_MAX_LENGTH = 500;
const FUND_TITLE_MAX = 80;

function sanitizeText(text: string | null | undefined, maxLen: number): string | null {
  if (!text) return null;
  const cleaned = text.replace(/[\u0000-\u001F\u007F-\u009F]/g, "").trim();
  if (cleaned.length === 0) return null;
  if (cleaned.length > maxLen) return cleaned.slice(0, maxLen);
  return cleaned;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = (Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_PUBLIC_SUPABASE_URL"))!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");

  if (!stripeKey || stripeKey === "sk_live_replace_me" || stripeKey === "sk_test_replace_me") {
    return new Response(
      JSON.stringify({ error: "Stripe is not configured." }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const stripe = new Stripe(stripeKey, { apiVersion: "2026-08-26.dahlia" });

  try {
    const body = await req.json();
    const {
      fund_id,
      amount_minor,
      contributor_name,
      contributor_email,
      message,
      visibility,
      session_hash, // guest portal session
    } = body;

    // ── Validate fund_id ──
    if (!fund_id || typeof fund_id !== "string") {
      return new Response(JSON.stringify({ error: "Invalid fund." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Validate amount ──
    if (!amount_minor || typeof amount_minor !== "number" || !Number.isInteger(amount_minor)) {
      return new Response(JSON.stringify({ error: "Invalid amount." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (amount_minor < MIN_AMOUNT_MINOR || amount_minor > MAX_AMOUNT_MINOR) {
      return new Response(JSON.stringify({
        error: `Amount must be between £${(MIN_AMOUNT_MINOR / 100).toFixed(0)} and £${(MAX_AMOUNT_MINOR / 100).toFixed(0)}.`,
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Validate visibility ──
    if (!["public", "name_only", "anonymous"].includes(visibility || "")) {
      return new Response(JSON.stringify({ error: "Invalid visibility setting." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Validate message ──
    const cleanMsg = sanitizeText(message, MESSAGE_MAX_LENGTH);
    if (message && !cleanMsg) {
      return new Response(JSON.stringify({ error: "Invalid message." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Validate contributor name ──
    const cleanName = sanitizeText(contributor_name, 120);
    if (contributor_name && !cleanName) {
      return new Response(JSON.stringify({ error: "Invalid name." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Validate email ──
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cleanEmail = contributor_email?.trim().toLowerCase() || null;
    if (cleanEmail && !emailRegex.test(cleanEmail)) {
      return new Response(JSON.stringify({ error: "Invalid email address." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Look up guest if session_hash provided ──
    let guestId: string | null = null;
    let weddingId: string | null = null;

    if (session_hash && validGuestSessionSecret(session_hash)) {
      const { data: session } = await supabase
        .from("guest_access_sessions")
        .select("wedding_id, invitation_id, expires_at")
        .eq("session_hash", await sha256Hex(session_hash))
        .eq("status", "active")
        .maybeSingle();

      if (session && session.expires_at && new Date(session.expires_at) > new Date()) {
        weddingId = session.wedding_id;
        // Get guest from invitation
        const { data: recipients } = await supabase
          .from("invitation_recipients")
          .select("guest_id")
          .eq("invitation_id", session.invitation_id)
          .limit(1);
        if (recipients && recipients.length > 0) {
          guestId = recipients[0].guest_id;
        }
      }
    }

    // ── Load and validate fund ──
    const { data: fund, error: fundErr } = await supabase
      .from("gift_funds")
      .select("*")
      .eq("id", fund_id)
      .maybeSingle();

    if (fundErr || !fund) {
      return new Response(JSON.stringify({ error: "Fund not found." }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!weddingId || weddingId !== fund.wedding_id) {
      return new Response(JSON.stringify({ error: "Open the gift fund through your active wedding invitation." }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!fund.is_active) {
      return new Response(JSON.stringify({ error: "This fund is no longer accepting contributions." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!fund.is_public) {
      return new Response(JSON.stringify({ error: "This fund is not publicly available." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (fund.closes_at && new Date(fund.closes_at) <= new Date()) {
      return new Response(JSON.stringify({ error: "This fund has closed." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify fund currency is GBP
    if (fund.currency !== "gbp") {
      return new Response(JSON.stringify({ error: "Only GBP contributions are accepted." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    weddingId = weddingId || fund.wedding_id;

    // ── Verify owner has a ready Connect account ──
    const { data: connectAccount } = await supabase
      .from("gift_fund_accounts")
      .select("*")
      .eq("user_id", fund.user_id)
      .maybeSingle();

    if (!connectAccount || !connectAccount.stripe_account_id) {
      return new Response(JSON.stringify({ error: "The couple's payment account is not set up yet." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!connectAccount.charges_enabled) {
      return new Response(JSON.stringify({ error: "The couple's payment account is still being verified." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Create pending contribution record ──
    const contributionId = crypto.randomUUID();
    const { error: insertErr } = await supabase
      .from("gift_fund_contributions")
      .insert({
        id: contributionId,
        fund_id: fund.id,
        wedding_id: weddingId,
        guest_id: guestId,
        contributor_name: cleanName,
        contributor_email: cleanEmail,
        message: cleanMsg,
        amount_minor,
        currency: "gbp",
        payment_status: "pending",
        visibility,
        refunded_amount_minor: 0,
      });

    if (insertErr) {
      console.error("Failed to create contribution:", insertErr);
      return new Response(JSON.stringify({ error: "Could not create contribution record." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Build origin URLs ──
    const origin = new URL(Deno.env.get("PUBLIC_SITE_URL") || "https://vowora.uk").origin;
    const basePathHeader = "";
    const pathPrefix = basePathHeader ? `/${basePathHeader}` : "";

    const successUrl = `${origin}${pathPrefix}/guest/fund/contribution/success?contribution_id=${contributionId}`;
    const cancelUrl = `${origin}${pathPrefix}/guest/fund/contribution/cancel?contribution_id=${contributionId}&fund_id=${fund.id}`;

    // ── Compute application fee (0% — Vowora takes no cut) ──
    const applicationFee = 0;

    // ── Create Stripe Checkout Session ──
    // Using destination charges: payment goes to platform, then transferred to connected account.
    // With application_fee_amount = 0 and transfer_data, the full amount goes to the couple.
    const session = await stripe.checkout.sessions.create({
      integration_identifier: "vowora_checkout_" + Array.from(crypto.getRandomValues(new Uint8Array(8)), byte => String.fromCharCode(97 + byte % 26)).join(""),
      mode: "payment",
      line_items: [{
        price_data: {
          currency: "gbp",
          product_data: {
            name: `Gift: ${fund.title.slice(0, 80)}`,
            description: "A voluntary gift contribution for the couple. No ownership, financial returns or rewards.",
          },
          unit_amount: amount_minor,
        },
        quantity: 1,
      }],
      payment_intent_data: {
        application_fee_amount: applicationFee,
        transfer_data: {
          destination: connectAccount.stripe_account_id,
        },
        metadata: {
          contribution_id: contributionId,
          fund_id: fund.id,
          wedding_id: weddingId,
        },
      },
      metadata: {
        contribution_id: contributionId,
        fund_id: fund.id,
        wedding_id: weddingId,
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: cleanEmail || undefined,
      expires_at: Math.floor(Date.now() / 1000) + 1800, // 30 minutes
    }, {
      idempotencyKey: contributionId,
    });

    // ── Update contribution with checkout session ID ──
    await supabase
      .from("gift_fund_contributions")
      .update({
        stripe_checkout_session_id: session.id,
        payment_status: "processing",
      })
      .eq("id", contributionId);

    return new Response(JSON.stringify({
      url: session.url,
      session_id: session.id,
      contribution_id: contributionId,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("gift-fund-create-checkout error:", err);
    return new Response(JSON.stringify({ error: "Could not create payment session. Please try again." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});