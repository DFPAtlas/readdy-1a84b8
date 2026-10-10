import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import Stripe from "npm:stripe@22.6.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = (Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_PUBLIC_SUPABASE_URL"))!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");

  if (!stripeKey || stripeKey === "sk_live_replace_me" || stripeKey === "sk_test_replace_me") {
    return new Response(
      JSON.stringify({ error: "Stripe is not configured. Connect Stripe in the Readdy dashboard." }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  // Separate anon client used only for verifying the caller's JWT; privileged
  // database operations must remain on the service-role client above.
  const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);
  const stripe = new Stripe(stripeKey, { apiVersion: "2026-08-26.dahlia" });

  try {
    const body = await req.json();
    const { action, wedding_id, refresh_account_id } = body;

    // Verify auth
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabaseAuth.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify wedding membership
    if (wedding_id) {
      const { data: member } = await supabase
        .from("wedding_members")
        .select("id")
        .eq("wedding_id", wedding_id)
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (!member) {
        return new Response(JSON.stringify({ error: "You are not a member of this wedding." }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ── GET STATUS ──
    if (action === "status") {
      const { data: account } = await supabase
        .from("gift_fund_accounts")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!account) {
        return new Response(JSON.stringify({
          status: "not_connected",
          onboarding_complete: false,
          charges_enabled: false,
          payouts_enabled: false,
          requirements_due: false,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Refresh from Stripe
      try {
        const sa = await stripe.accounts.retrieve(account.stripe_account_id);
        const updated = {
          onboarding_complete: sa.charges_enabled && sa.payouts_enabled && !sa.requirements?.currently_due?.length,
          charges_enabled: sa.charges_enabled,
          payouts_enabled: sa.payouts_enabled,
          requirements_due: (sa.requirements?.currently_due?.length || 0) > 0,
        };

        await supabase.from("gift_fund_accounts").update(updated).eq("id", account.id);

        let status = "not_connected";
        if (sa.charges_enabled && sa.payouts_enabled && !updated.requirements_due) {
          status = "ready";
        } else if (!sa.charges_enabled || !sa.payouts_enabled) {
          status = updated.requirements_due ? "action_required" : "onboarding";
        } else if (updated.requirements_due) {
          status = "action_required";
        }

        return new Response(JSON.stringify({
          status,
          onboarding_complete: updated.onboarding_complete,
          charges_enabled: updated.charges_enabled,
          payouts_enabled: updated.payouts_enabled,
          requirements_due: updated.requirements_due,
          account_id: account.stripe_account_id,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (stripeErr) {
        console.error("Stripe status refresh failed:", stripeErr);
        return new Response(JSON.stringify({
          status: "error",
          onboarding_complete: account.onboarding_complete,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          requirements_due: account.requirements_due,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // ── REFRESH STATUS (dedicated endpoint) ──
    if (action === "refresh") {
      const accountId = refresh_account_id;
      if (!accountId) {
        return new Response(JSON.stringify({ error: "Missing refresh_account_id" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: account } = await supabase
        .from("gift_fund_accounts")
        .select("*")
        .eq("stripe_account_id", accountId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!account) {
        return new Response(JSON.stringify({ error: "Account not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      try {
        const sa = await stripe.accounts.retrieve(accountId);
        const updated = {
          onboarding_complete: sa.charges_enabled && sa.payouts_enabled && !sa.requirements?.currently_due?.length,
          charges_enabled: sa.charges_enabled,
          payouts_enabled: sa.payouts_enabled,
          requirements_due: (sa.requirements?.currently_due?.length || 0) > 0,
        };

        await supabase.from("gift_fund_accounts").update(updated).eq("id", account.id);

        let status = "not_connected";
        if (sa.charges_enabled && sa.payouts_enabled && !updated.requirements_due) {
          status = "ready";
        } else if (updated.requirements_due) {
          status = "action_required";
        } else {
          status = "onboarding";
        }

        if (!sa.payouts_enabled) {
          status = "payouts_paused";
        }

        return new Response(JSON.stringify({
          status,
          onboarding_complete: updated.onboarding_complete,
          charges_enabled: updated.charges_enabled,
          payouts_enabled: updated.payouts_enabled,
          requirements_due: updated.requirements_due,
          account_id: accountId,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (stripeErr) {
        console.error("Stripe refresh failed:", stripeErr);
        return new Response(JSON.stringify({
          status: "error",
          error: "Could not refresh Stripe account status.",
        }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // ── START ONBOARDING ──
    if (action === "onboard") {
      if (!wedding_id) {
        return new Response(JSON.stringify({ error: "wedding_id is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if user already has a Connect account
      let { data: account } = await supabase
        .from("gift_fund_accounts")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      let stripeAccountId = "";

      if (account?.stripe_account_id) {
        stripeAccountId = account.stripe_account_id;
        // Verify it still exists in Stripe
        try {
          await stripe.accounts.retrieve(stripeAccountId);
        } catch {
          // Account deleted externally — create new
          account = null;
        }
      }

      if (!account || !stripeAccountId) {
        // Create new connected account (Express for simplicity — Destination charges model)
        const newAccount = await stripe.accounts.create({
          type: "express",
          country: "GB",
          email: user.email,
          capabilities: {
            transfers: { requested: true },
          },
          business_type: "individual",
          metadata: {
            user_id: user.id,
            platform: "vowora",
          },
        });

        stripeAccountId = newAccount.id;

        const { error: insertErr } = await supabase
          .from("gift_fund_accounts")
          .insert({
            user_id: user.id,
            stripe_account_id: stripeAccountId,
          });

        if (insertErr) {
          console.error("Failed to insert gift_fund_accounts:", insertErr);
          return new Response(JSON.stringify({ error: "Could not create account record." }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // Get the base path for return URL
      const origin = req.headers.get("origin") || "https://vowora.uk";
      const basePathHeader = req.headers.get("x-base-path") || "";
      const pathPrefix = basePathHeader ? `/${basePathHeader}` : "";

      const returnUrl = `${origin}${pathPrefix}/app/budget/gift-funding?stripe_return=true`;
      const refreshUrl = `${origin}${pathPrefix}/app/budget/gift-funding?stripe_return=true`;

      // Create account link for onboarding
      const accountLink = await stripe.accountLinks.create({
        account: stripeAccountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: "account_onboarding",
      });

      return new Response(JSON.stringify({
        url: accountLink.url,
        account_id: stripeAccountId,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Invalid action. Use: status, refresh, or onboard." }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("gift-fund-connect error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});