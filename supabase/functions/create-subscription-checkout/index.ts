import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import Stripe from "npm:stripe@22.6.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VALID_PLAN_KEYS = ['free', 'essential', 'complete', 'luxury'];

// A subscription in one of these states must be changed in the Stripe billing
// portal, not by opening a second Checkout Session.
const MANAGED_IN_PORTAL_STATUSES = ['active', 'trialing', 'past_due', 'unpaid', 'paused'];

// Only HTTP(S) origins are valid for public links and hosted checkout redirects.
function resolvePublicSiteOrigin(configured: string | undefined): string {
  try {
    const url = new URL(configured?.trim() || 'https://vowora.uk');
    if ((url.protocol === 'https:' || url.protocol === 'http:') && !url.username && !url.password) return url.origin;
  } catch { /* Invalid deployment configuration uses the canonical public site. */ }
  return 'https://vowora.uk';
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      console.error('Missing Supabase environment configuration');
      return json({ error: 'Server not configured' }, 500);
    }

    // The anon client is used ONLY to verify the caller's JWT.
    const auth = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authErr } = await auth.auth.getUser();
    if (authErr || !user) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      return json({ error: 'Stripe not configured' }, 500);
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2026-08-26.dahlia" });
    const body = await req.json();
    const { planKey, weddingId, billingInterval = 'month' } = body;

    if (!planKey || !VALID_PLAN_KEYS.includes(planKey)) {
      return json({ error: 'Invalid plan' }, 400);
    }
    if (!weddingId || typeof weddingId !== 'string') {
      return json({ error: 'Missing wedding' }, 400);
    }
    if (!['month', 'year'].includes(billingInterval)) {
      return json({ error: 'Invalid billing interval' }, 400);
    }

    // Verify wedding ownership with the *user-scoped* client (RLS applies).
    const { data: membership, error: memErr } = await auth
      .from('wedding_members')
      .select('id, role')
      .eq('wedding_id', weddingId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (memErr || membership?.role !== 'owner') {
      return json({ error: 'Not a member of this wedding' }, 403);
    }

    // Billing tables are read-only for authenticated users under RLS, so all
    // privileged reads/writes below run through a service-role client scoped to
    // the membership we just verified server-side.
    const db = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: existingSubscription, error: existingSubErr } = await db
      .from('wedora_subscriptions')
      .select('status,stripe_subscription_id,trial_start')
      .eq('wedding_id', weddingId)
      .maybeSingle();
    if (existingSubErr) throw existingSubErr;

    if (existingSubscription && MANAGED_IN_PORTAL_STATUSES.includes(existingSubscription.status)) {
      return json({ error: 'Manage your existing subscription in the billing portal to change plans.' }, 409);
    }

    // Resolve plan from the database (server-side, never trust client price IDs).
    const { data: plan, error: planErr } = await db
      .from('wedora_subscription_plans')
      .select('*')
      .eq('plan_code', planKey)
      .eq('is_active', true)
      .maybeSingle();

    if (planErr || !plan) {
      return json({ error: 'Plan not found' }, 400);
    }

    const stripePriceId = billingInterval === 'year' ? plan.stripe_yearly_price_id : plan.stripe_price_id;
    if (!stripePriceId) {
      return json({ error: 'Plan not available for purchase' }, 400);
    }

    // Get or create the Stripe customer, then persist the mapping.
    let stripeCustomerId: string;
    const { data: existingCustomer, error: customerReadErr } = await db
      .from('wedora_customers')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (customerReadErr) throw customerReadErr;

    if (existingCustomer?.stripe_customer_id) {
      stripeCustomerId = existingCustomer.stripe_customer_id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id },
      });
      stripeCustomerId = customer.id;

      const { error: customerWriteErr } = await db.from('wedora_customers').upsert({
        user_id: user.id,
        stripe_customer_id: stripeCustomerId,
        email: user.email,
        stripe_account_id: plan.stripe_account_id,
      }, { onConflict: 'user_id' });
      if (customerWriteErr) throw customerWriteErr;
    }

    // Build success/cancel URLs
    const origin = resolvePublicSiteOrigin(Deno.env.get('PUBLIC_SITE_URL'));

    const successUrl = `${origin}/app/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}/app/billing?checkout=cancelled`;

    // Trials are introductory: changing/restarting a subscription must not reset a paid trial.
    const { data: previousTrials, error: trialHistoryError } = await db
      .from('wedora_subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .not('stripe_subscription_id', 'is', null)
      .limit(1);
    const { data: legacyTrials, error: legacyTrialError } = await db
      .from('subscription_records')
      .select('id')
      .eq('user_id', user.id)
      .not('stripe_subscription_id', 'is', null)
      .limit(1);
    if (trialHistoryError || legacyTrialError) throw new Error('Unable to check introductory trial eligibility.');
    const trialEligible = !previousTrials?.length && !legacyTrials?.length && !existingSubscription?.trial_start;

    // Short idempotency window: a double-click or retried request within the same
    // minute returns the same Checkout Session instead of creating a second one.
    const idempotencyWindow = Math.floor(Date.now() / 60000);
    const idempotencyKey = `checkout:${weddingId}:${planKey}:${billingInterval}:${user.id}:${idempotencyWindow}`;

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
        trial_period_days: trialEligible ? plan.trial_days || undefined : undefined,
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
    }, { idempotencyKey });

    // Record pending checkout (service role — the authenticated role has no write policy here).
    const { error: pendingErr } = await db.from('wedora_subscriptions').upsert({
      user_id: user.id,
      wedding_id: weddingId,
      plan_id: plan.id,
      stripe_customer_id: stripeCustomerId,
      stripe_checkout_session_id: session.id,
      status: 'incomplete',
      quantity: 1,
    }, { onConflict: 'wedding_id' });
    if (pendingErr) throw pendingErr;

    return json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('Checkout error:', err);
    return json({ error: 'Internal server error' }, 500);
  }
});
