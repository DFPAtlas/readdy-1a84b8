import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.57.4";
import Stripe from "npm:stripe@22.6.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Plan key mapping from Stripe product IDs
async function resolvePlanKey(supabase: SupabaseClient, productId: string): Promise<string | null> {
  const { data } = await supabase
    .from('wedora_subscription_plans')
    .select('plan_code')
    .eq('stripe_product_id', productId)
    .maybeSingle().throwOnError();
  return data?.plan_code || null;
}

Deno.serve(async (req: Request) => {
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

    const stripe = new Stripe(stripeKey, { apiVersion: "2026-08-26.dahlia" });
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
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret, undefined, Stripe.createSubtleCryptoProvider());
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
      .select('id, processing_status')
      .eq('stripe_event_id', event.id)
      .maybeSingle().throwOnError();

    if (existingEvent?.processing_status === 'processed') {
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Record event
    const { error: recordError } = await supabase.from('wedora_billing_events').upsert({
      stripe_event_id: event.id,
      event_type: event.type,
      processing_status: 'processing',
      payload_summary: { type: event.type },
      received_at: new Date().toISOString(),
    }, { onConflict: 'stripe_event_id' }).throwOnError();
    if (recordError) throw recordError;

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
            if (!planId) throw new Error('Subscription product has no configured Vowora plan');
            const {data:resolvedRow}=await supabase.from('wedora_subscription_plans').select('id').eq('plan_code',planId).single().throwOnError();

            await supabase.from('wedora_subscriptions').upsert({
              user_id: userId,
              wedding_id: weddingId,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              stripe_checkout_session_id: session.id,
              plan_key: planId,
              plan_id: resolvedRow.id,
              billing_interval: subscription.items.data[0].price.recurring?.interval || 'month',
              status: subscription.status,
              current_period_start: new Date(subscription.items.data[0].current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.items.data[0].current_period_end * 1000).toISOString(),
              trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
              trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
              cancel_at_period_end: subscription.cancel_at_period_end,
              cancelled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
              ended_at: subscription.ended_at ? new Date(subscription.ended_at * 1000).toISOString() : null,
            }, { onConflict: 'wedding_id' }).throwOnError();

            // Also update subscription_records for backward compatibility
            await supabase.from('subscription_records').upsert({
              user_id: userId,
              wedding_id: weddingId,
              plan: planId || planKey,
              status: subscription.status,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              current_period_start: new Date(subscription.items.data[0].current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.items.data[0].current_period_end * 1000).toISOString(),
              cancel_at_period_end: subscription.cancel_at_period_end,
            }, { onConflict: 'wedding_id' }).throwOnError();
          }
          break;
        }

        case 'customer.subscription.updated':
        case 'customer.subscription.deleted': {
          const subscription = await stripe.subscriptions.retrieve((event.data.object as Stripe.Subscription).id);
          const metadata = subscription.metadata || {};
          userId = metadata.user_id || null;
          weddingId = metadata.wedding_id || null;

          if (subscription.id) {
            const resolvedPlan = await resolvePlanKey(supabase, subscription.items.data[0]?.price?.product as string);
            if (!resolvedPlan) throw new Error('Subscription product has no configured Vowora plan');
            const {data:resolvedRow}=await supabase.from('wedora_subscription_plans').select('id').eq('plan_code',resolvedPlan).single().throwOnError();
            const updates: Record<string, unknown> = {
              plan_key: resolvedPlan,
              plan_id: resolvedRow.id,
              billing_interval: subscription.items.data[0].price.recurring?.interval || 'month',
              status: subscription.status,
              current_period_start: new Date(subscription.items.data[0].current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.items.data[0].current_period_end * 1000).toISOString(),
              cancel_at_period_end: subscription.cancel_at_period_end,
              cancelled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
              ended_at: subscription.ended_at ? new Date(subscription.ended_at * 1000).toISOString() : null,
              trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
              trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
            };

            await supabase.from('wedora_subscriptions')
              .update(updates)
              .eq('stripe_subscription_id', subscription.id).throwOnError();

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
              .eq('stripe_subscription_id', subscription.id).throwOnError();
          }
          break;
        }

        case 'invoice.paid': {
          const invoice = event.data.object as Stripe.Invoice;
          // Mark billing event as linked if we have context
          if (invoice.parent?.subscription_details?.subscription) {
            const { data: sub } = await supabase
              .from('wedora_subscriptions')
              .select('id, user_id, wedding_id')
              .eq('stripe_subscription_id', invoice.parent?.subscription_details?.subscription as string)
              .maybeSingle().throwOnError();

            if (sub) {
              await supabase.from('wedora_billing_events')
                .update({
                  user_id: sub.user_id,
                  wedding_id: sub.wedding_id,
                  subscription_id: sub.id,
                })
                .eq('stripe_event_id', event.id).throwOnError();
            }
          }
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice;
          if (invoice.parent?.subscription_details?.subscription) {
            const { data: sub } = await supabase
              .from('wedora_subscriptions')
              .select('id, user_id, wedding_id')
              .eq('stripe_subscription_id', invoice.parent?.subscription_details?.subscription as string)
              .maybeSingle().throwOnError();

            if (sub) {
              await supabase.from('wedora_billing_events')
                .update({
                  user_id: sub.user_id,
                  wedding_id: sub.wedding_id,
                  subscription_id: sub.id,
                })
                .eq('stripe_event_id', event.id).throwOnError();
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
        .eq('stripe_event_id', event.id).throwOnError();

    } catch (processingErr) {
      console.error('Processing error:', processingErr);
      await supabase.from('wedora_billing_events')
        .update({
          processing_status: 'failed',
          error_message: processingErr instanceof Error ? processingErr.message : 'Unknown error',
        })
        .eq('stripe_event_id', event.id).throwOnError();

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
