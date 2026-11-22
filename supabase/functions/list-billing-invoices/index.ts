import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import Stripe from "npm:stripe@22.6.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const INVOICE_STATUSES = ['paid', 'open', 'void', 'uncollectible', 'draft'] as const;
type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

function normalizeStatus(status: string | null): InvoiceStatus {
  if (status && (INVOICE_STATUSES as readonly string[]).includes(status)) {
    return status as InvoiceStatus;
  }
  return 'draft';
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

    const db = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Customer is always resolved from the verified session, never the request body.
    const { data: customer, error: customerErr } = await db
      .from('wedora_customers')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (customerErr) throw customerErr;

    if (!customer?.stripe_customer_id) {
      return json({ invoices: [] });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2026-08-26.dahlia" });
    const list = await stripe.invoices.list({
      customer: customer.stripe_customer_id,
      limit: 24,
    });

    const invoices = list.data.map((invoice) => {
      const line = invoice.lines?.data?.[0];
      const fallbackDate = new Date(invoice.created * 1000).toISOString();
      const periodStart = line?.period?.start
        ? new Date(line.period.start * 1000).toISOString()
        : fallbackDate;
      const periodEnd = line?.period?.end
        ? new Date(line.period.end * 1000).toISOString()
        : fallbackDate;

      return {
        id: invoice.id,
        number: invoice.number || invoice.id,
        description: line?.description || 'Vowora subscription',
        amountMinor: invoice.amount_paid ?? invoice.amount_due ?? invoice.total ?? 0,
        currency: invoice.currency || 'gbp',
        status: normalizeStatus(invoice.status),
        invoiceDate: new Date((invoice.status_transitions?.paid_at ?? invoice.created) * 1000).toISOString(),
        periodStart,
        periodEnd,
        hostedUrl: invoice.hosted_invoice_url ?? null,
        pdfUrl: invoice.invoice_pdf ?? null,
      };
    });

    return json({ invoices });
  } catch (err) {
    console.error('Invoice list error:', err);
    return json({ error: 'Internal server error' }, 500);
  }
});
