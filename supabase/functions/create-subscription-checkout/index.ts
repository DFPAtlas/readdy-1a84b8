import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import Stripe from "npm:stripe@22.6.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VALID_PLAN_KEYS = ['free', 'essential', 'complete', 'luxury'];

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: 'Stripe not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2026-08-26.dahlia" });
    const body = await req.json();
    const { planKey, weddingId, billingInterval = 'month' } = body;

    if (!planKey || !VALID_PLAN_KEYS.includes(planKey)) {
      return new Response(JSON.stringify({ error: 'Invalid plan' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify wedding membership
    const { data: membership, error: memErr } = await supabase
      .from('wedding_members')
      .select('id, role')
      .eq('wedding_id', weddingId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (memErr || membership?.role !== 'owner') {
      return new Response(JSON.stringify({ error: 'Not a member of this wedding' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: existingSubscription } = await supabase.from('wedora_subscriptions').select('status').eq('wedding_id', weddingId).maybeSingle();
    if (existingSubscription && ['active','trialing','past_due','unpaid'].includes(existingSubscription.status)) return new Response(JSON.stringify({ error: 'Manage your existing subscription in the billing portal to change plans.' }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    // Resolve plan from DB (server-side, never trust client price IDs)
    const { data: plan, error: planErr } = await supabase
      .from('wedora_subscription_plans')
      .select('*')
      .eq('plan_code', planKey)
      .eq('is_active', true)
      .maybeSingle();

    if (planErr || !plan) {
      return new Response(JSON.stringify({ error: 'Plan not found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!['month','year'].includes(billingInterval)) return new Response(JSON.stringify({error:'Invalid billing interval'}), {status:400,headers:{...corsHeaders,'Content-Type':'application/json'}});
    const stripePriceId = billingInterval === 'year' ? plan.stripe_yearly_price_id : plan.stripe_price_id;
    if (!stripePriceId) {
      return new Response(JSON.stringify({ error: 'Plan not available for purchase' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get or create Stripe customer
    let stripeCustomerId: string;
    const { data: existingCustomer } = await supabase
      .from('wedora_customers')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingCustomer?.stripe_customer_id) {
      stripeCustomerId = existingCustomer.stripe_customer_id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id },
      });
      stripeCustomerId = customer.id;

      await supabase.from('wedora_customers').upsert({
        user_id: user.id,
        stripe_customer_id: stripeCustomerId,
        email: user.email,
        stripe_account_id: plan.stripe_account_id,
      }, { onConflict: 'user_id' });
    }

    // Build success/cancel URLs
    const basePath = '';
    const origin = new URL(Deno.env.get('PUBLIC_SITE_URL') || 'https://vowora.uk').origin;
    const pathPrefix = basePath ? `/${basePath}` : '';

    const successUrl = `${origin}${pathPrefix}/app/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}${pathPrefix}/app/billing?checkout=cancelled`;

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      integration_identifier: "vowora_checkout_" + Array.from(crypto.getRandomValues(new Uint8Array(8)), byte => String.fromCharCode(97 + byte % 26)).join(""),
      customer: stripeCustomerId,
      mode: 'subscription',
      line_items: [{ price: stripePriceId, quantity: 1 }],
      subscription_data: {
        metadata: {
          user_id: user.id,
          wedding_id: weddingId,
          plan_key: planKey,
        },
        trial_period_days: plan.trial_days || undefined,
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        user_id: user.id,
        wedding_id: weddingId,
        plan_key: planKey,
      },
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
    });

    // Record pending checkout
    await supabase.from('wedora_subscriptions').upsert({
      user_id: user.id,
      wedding_id: weddingId,
      plan_id: plan.id,
      stripe_customer_id: stripeCustomerId,
      stripe_checkout_session_id: session.id,
      status: 'incomplete',
      quantity: 1,
    }, { onConflict: 'wedding_id' });

    return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Checkout error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});