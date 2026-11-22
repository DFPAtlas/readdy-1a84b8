import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import Stripe from "npm:stripe@22.6.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Anon client ONLY verifies the caller's identity.
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

    // Service-role client for the billing read: `wedora_customers` is
    // select-only for authenticated users and the mapping row is written by the
    // checkout function, so we always resolve it from the verified session.
    const db = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: customer, error: customerErr } = await db
      .from('wedora_customers')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (customerErr) throw customerErr;

    if (!customer?.stripe_customer_id) {
      return json({ error: 'No billing account found' }, 404);
    }

    const origin = resolvePublicSiteOrigin(Deno.env.get('PUBLIC_SITE_URL'));
    const returnUrl = `${origin}/app/billing`;

    const session = await stripe.billingPortal.sessions.create({
      customer: customer.stripe_customer_id,
      return_url: returnUrl,
    });

    return json({ url: session.url });
  } catch (err) {
    console.error('Portal error:', err);
    return json({ error: 'Internal server error' }, 500);
  }
});
