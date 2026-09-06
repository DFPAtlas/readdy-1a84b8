import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.21.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Plan key mapping from Stripe product IDs
async function resolvePlanKey(supabase: ReturnType<typeof createClient>, productId: string): Promise<string | null> {
  const { data } = await supabase
    .from('wedora_subscription_plans')
    .select('plan_code')
    .eq('stripe_product_id', productId)
    .maybeSingle();
  return data?.plan_code || null;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only accept POST for webhooks
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    if (!stripeKey || !webhookSecret) {
      console.error('Missing Stripe configuration');
      return new Response(JSON.stringify({ error: 'Not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' });
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return new Response(JSON.stringify({ error: 'Missing signature' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.text();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // No auth for webhooks — use the service role client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Idempotency check
    const { data: existingEvent } = await supabase
      .from('wedora_billing_events')
      .select('id')
      .eq('stripe_event_id', event.id)
      .maybeSingle();

    if (existingEvent) {
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Record event
    await supabase.from('wedora_billing_events').insert({
      stripe_event_id: event.id,
      event_type: event.type,
      processing_status: 'processing',
      payload_summary: { type: event.type },
      received_at: new Date().toISOString(),
    });

    let weddingId: string | null = null;
    let userId: string | null = null;

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          userId = session.metadata?.user_id || null;
          weddingId = session.metadata?.wedding_id || null;
          const planKey = session.metadata?.plan_key || null;
          const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id || null;
          const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id || null;

          if (subscriptionId && customerId && planKey && userId && weddingId) {
            // Get subscription details from Stripe
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            const planId = await resolvePlanKey(supabase, subscription.items.data[0]?.price?.product as string);

            await supabase.from('wedora_subscriptions').upsert({
              user_id: userId,
              wedding_id: weddingId,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              stripe_checkout_session_id: session.id,
              status: subscription.status,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
              trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
              cancel_at_period_end: subscription.cancel_at_period_end,
              cancelled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
              ended_at: subscription.ended_at ? new Date(subscription.ended_at * 1000).toISOString() : null,
            }, { onConflict: 'stripe_subscription_id' });

            // Also update subscription_records for backward compatibility
            await supabase.from('subscription_records').upsert({
              user_id: userId,
              wedding_id: weddingId,
              plan: planId || planKey,
              status: subscription.status,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              cancel_at_period_end: subscription.cancel_at_period_end,
            }, { onConflict: 'stripe_subscription_id' });
          }
          break;
        }

        case 'customer.subscription.updated':
        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          const metadata = subscription.metadata || {};
          userId = metadata.user_id || null;
          weddingId = metadata.wedding_id || null;

          if (subscription.id) {
            const updates: Record<string, unknown> = {
              status: subscription.status,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              cancel_at_period_end: subscription.cancel_at_period_end,
              cancelled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
              ended_at: subscription.ended_at ? new Date(subscription.ended_at * 1000).toISOString() : null,
              trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
              trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
            };

            await supabase.from('wedora_subscriptions')
              .update(updates)
              .eq('stripe_subscription_id', subscription.id);

            // Sync subscription_records
            const planId = await resolvePlanKey(supabase, subscription.items.data[0]?.price?.product as string);
            await supabase.from('subscription_records')
              .update({
                status: subscription.status,
                plan: planId || undefined,
                current_period_start: updates.current_period_start as string,
                current_period_end: updates.current_period_end as string,
                cancel_at_period_end: subscription.cancel_at_period_end,
              })
              .eq('stripe_subscription_id', subscription.id);
          }
          break;
        }

        case 'invoice.paid': {
          const invoice = event.data.object as Stripe.Invoice;
          // Mark billing event as linked if we have context
          if (invoice.subscription) {
            const { data: sub } = await supabase
              .from('wedora_subscriptions')
              .select('id, user_id, wedding_id')
              .eq('stripe_subscription_id', invoice.subscription as string)
              .maybeSingle();

            if (sub) {
              await supabase.from('wedora_billing_events')
                .update({
                  user_id: sub.user_id,
                  wedding_id: sub.wedding_id,
                  subscription_id: sub.id,
                })
                .eq('stripe_event_id', event.id);
            }
          }
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice;
          if (invoice.subscription) {
            const { data: sub } = await supabase
              .from('wedora_subscriptions')
              .select('id, user_id, wedding_id')
              .eq('stripe_subscription_id', invoice.subscription as string)
              .maybeSingle();

            if (sub) {
              await supabase.from('wedora_billing_events')
                .update({
                  user_id: sub.user_id,
                  wedding_id: sub.wedding_id,
                  subscription_id: sub.id,
                })
                .eq('stripe_event_id', event.id);
            }
          }
          break;
        }

        default:
          // Unhandled event — still mark as processed
          break;
      }

      // Mark event as processed
      await supabase.from('wedora_billing_events')
        .update({
          processing_status: 'processed',
          user_id: userId || undefined,
          wedding_id: weddingId || undefined,
          processed_at: new Date().toISOString(),
        })
        .eq('stripe_event_id', event.id);

    } catch (processingErr) {
      console.error('Processing error:', processingErr);
      await supabase.from('wedora_billing_events')
        .update({
          processing_status: 'failed',
          error_message: processingErr instanceof Error ? processingErr.message : 'Unknown error',
        })
        .eq('stripe_event_id', event.id);

      return new Response(JSON.stringify({ error: 'Processing failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Webhook error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
