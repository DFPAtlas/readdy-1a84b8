import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.57.4";
import Stripe from "npm:stripe@22.6.0";
import { secureServe } from "../_shared/httpSecurity.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type PlanInfo = { id: string; planCode: string; name: string };

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function subscriptionProductId(subscription: Stripe.Subscription): string | null {
  const product = subscription.items.data[0]?.price?.product;
  if (!product) return null;
  return typeof product === 'string' ? product : product.id;
}

/**
 * Resolve a plan from its Stripe product id.
 * Returns `null` (instead of throwing) when a product is not mapped yet, so a
 * permanently unprocessable event cannot make Stripe retry for days.
 */
async function resolvePlan(supabase: SupabaseClient, productId: string | null): Promise<PlanInfo | null> {
  if (!productId) return null;
  const { data, error } = await supabase
    .from('wedora_subscription_plans')
    .select('id, plan_code, name')
    .eq('stripe_product_id', productId)
    .limit(1);
  if (error) throw error;
  const row = data?.[0];
  if (!row) return null;
  return { id: row.id, planCode: row.plan_code, name: row.name || row.plan_code };
}

function subscriptionSnapshot(subscription: Stripe.Subscription, plan: PlanInfo | null): Record<string, unknown> {
  const item = subscription.items.data[0];
  const snapshot: Record<string, unknown> = {
    status: subscription.status,
    billing_interval: item?.price?.recurring?.interval || 'month',
    cancel_at_period_end: subscription.cancel_at_period_end,
    stripe_customer_id: typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer?.id ?? null,
    cancelled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
    ended_at: subscription.ended_at ? new Date(subscription.ended_at * 1000).toISOString() : null,
    trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
    trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
  };
  if (item?.current_period_start) {
    snapshot.current_period_start = new Date(item.current_period_start * 1000).toISOString();
  }
  if (item?.current_period_end) {
    snapshot.current_period_end = new Date(item.current_period_end * 1000).toISOString();
  }
  if (plan) {
    snapshot.plan_key = plan.planCode;
    snapshot.plan_id = plan.id;
  }
  return snapshot;
}

/**
 * Write subscription state, tolerating out-of-order delivery.
 * Stripe does not guarantee that `checkout.session.completed` arrives before
 * `customer.subscription.*`. When no row matches by subscription id we attach
 * the state via the metadata written at checkout time.
 */
async function applySubscriptionState(
  supabase: SupabaseClient,
  subscription: Stripe.Subscription,
  plan: PlanInfo | null,
  overrides: Record<string, unknown> = {},
): Promise<{ attached: boolean }> {
  const snapshot = { ...subscriptionSnapshot(subscription, plan), ...overrides };

  const { data: existing, error: readError } = await supabase
    .from('wedora_subscriptions')
    .select('id')
    .eq('stripe_subscription_id', subscription.id)
    .limit(1);
  if (readError) throw readError;

  if (existing && existing.length > 0) {
    const { error } = await supabase
      .from('wedora_subscriptions')
      .update(snapshot)
      .eq('id', existing[0].id);
    if (error) throw error;
    return { attached: true };
  }

  const metadata = subscription.metadata || {};
  const userId = metadata.user_id || null;
  const weddingId = metadata.wedding_id || null;
  if (!userId || !weddingId) {
    return { attached: false };
  }

  const { error } = await supabase.from('wedora_subscriptions').upsert({
    ...snapshot,
    user_id: userId,
    wedding_id: weddingId,
    stripe_subscription_id: subscription.id,
  }, { onConflict: 'wedding_id' });
  if (error) throw error;
  return { attached: true };
}

/**
 * Atomically claim an event. Returns false when another invocation already owns
 * (or already finished) this event id, which keeps concurrent retries safe.
 */
async function claimEvent(supabase: SupabaseClient, event: Stripe.Event): Promise<boolean> {
  const { error: insertError } = await supabase
    .from('wedora_billing_events')
    .insert({
      stripe_event_id: event.id,
      event_type: event.type,
      processing_status: 'received',
      payload_summary: { type: event.type },
      received_at: new Date().toISOString(),
    });
  // 23505 = duplicate key: the row already exists and belongs to another attempt.
  if (insertError && insertError.code !== '23505') throw insertError;

  const { data: claimed, error: claimError } = await supabase
    .from('wedora_billing_events')
    .update({ processing_status: 'processing', received_at: new Date().toISOString() })
    .eq('stripe_event_id', event.id)
    .in('processing_status', ['received', 'failed'])
    .select('id')
    .limit(1);
  if (claimError) throw claimError;
  return Boolean(claimed && claimed.length > 0);
}

function invoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const raw = invoice.parent?.subscription_details?.subscription;
  if (!raw) return null;
  return typeof raw === 'string' ? raw : raw.id;
}

secureServe(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    if (!stripeKey || !webhookSecret) {
      console.error('Missing Stripe configuration');
      return json({ error: 'Not configured' }, 500);
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2026-08-26.dahlia" });
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return json({ error: 'Missing signature' }, 400);
    }

    // Raw body MUST be read before signature verification.
    const body = await req.text();
    let event: Stripe.Event;

    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret, undefined, Stripe.createSubtleCryptoProvider());
    } catch {
      return json({ error: 'Invalid signature' }, 400);
    }

    // No auth for webhooks — use the service role client.
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const claimed = await claimEvent(supabase, event);
    if (!claimed) {
      return json({ received: true, duplicate: true });
    }

    let weddingId: string | null = null;
    let userId: string | null = null;
    let needsMapping = false;

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          userId = session.metadata?.user_id || null;
          weddingId = session.metadata?.wedding_id || null;
          const planKey = session.metadata?.plan_key || null;
          const subscriptionId = typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription?.id ?? null;
          const customerId = typeof session.customer === 'string'
            ? session.customer
            : session.customer?.id ?? null;

          if (subscriptionId && customerId && userId && weddingId) {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            const plan = await resolvePlan(supabase, subscriptionProductId(subscription));
            if (!plan) needsMapping = true;

            const { error: subError } = await supabase.from('wedora_subscriptions').upsert({
              ...subscriptionSnapshot(subscription, plan),
              user_id: userId,
              wedding_id: weddingId,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              stripe_checkout_session_id: session.id,
            }, { onConflict: 'wedding_id' });
            if (subError) throw subError;

            // Backward-compatible mirror.
            const item = subscription.items.data[0];
            const { error: recordError } = await supabase.from('subscription_records').upsert({
              user_id: userId,
              wedding_id: weddingId,
              plan: plan?.planCode || planKey,
              status: subscription.status,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              current_period_start: item?.current_period_start
                ? new Date(item.current_period_start * 1000).toISOString()
                : null,
              current_period_end: item?.current_period_end
                ? new Date(item.current_period_end * 1000).toISOString()
                : null,
              cancel_at_period_end: subscription.cancel_at_period_end,
            }, { onConflict: 'wedding_id' });
            if (recordError) throw recordError;
          }
          break;
        }

        case 'customer.subscription.updated':
        case 'customer.subscription.deleted': {
          const eventSubscription = event.data.object as Stripe.Subscription;

          // Re-read to guarantee the freshest state; fall back to the event payload.
          let subscription = eventSubscription;
          try {
            subscription = await stripe.subscriptions.retrieve(eventSubscription.id);
          } catch (retrieveError) {
            console.error('Subscription retrieval failed, using event payload:', retrieveError);
          }

          const plan = await resolvePlan(supabase, subscriptionProductId(subscription));
          if (!plan) needsMapping = true;

          // Read the state we already stored so the confirmation email is sent
          // only on the transition into a scheduled cancellation — not on every
          // later update while the cancellation is still pending.
          let previousCancelAtPeriodEnd = false;
          let previousPeriodEnd: string | null = null;
          let previousPlanKey: string | null = null;
          let previousUserId: string | null = null;
          let previousWeddingId: string | null = null;
          try {
            const { data: previousRows } = await supabase
              .from('wedora_subscriptions')
              .select('cancel_at_period_end, user_id, wedding_id, plan_key, current_period_end')
              .eq('stripe_subscription_id', eventSubscription.id)
              .limit(1);
            const previousRow = previousRows?.[0];
            if (previousRow) {
              previousCancelAtPeriodEnd = Boolean(previousRow.cancel_at_period_end);
              previousPeriodEnd = previousRow.current_period_end ?? null;
              previousPlanKey = previousRow.plan_key ?? null;
              previousUserId = previousRow.user_id ?? null;
              previousWeddingId = previousRow.wedding_id ?? null;
            }
          } catch (previousError) {
            console.error('Previous subscription state read failed:', previousError);
          }

          const result = await applySubscriptionState(supabase, subscription, plan);
          if (!result.attached) needsMapping = true;

          userId = subscription.metadata?.user_id || previousUserId || userId;
          weddingId = subscription.metadata?.wedding_id || previousWeddingId || weddingId;

          const item = subscription.items.data[0];
          const { error: recordError } = await supabase
            .from('subscription_records')
            .update({
              status: subscription.status,
              plan: plan?.planCode,
              current_period_start: item?.current_period_start
                ? new Date(item.current_period_start * 1000).toISOString()
                : undefined,
              current_period_end: item?.current_period_end
                ? new Date(item.current_period_end * 1000).toISOString()
                : undefined,
              cancel_at_period_end: subscription.cancel_at_period_end,
            })
            .eq('stripe_subscription_id', subscription.id);
          if (recordError) throw recordError;

          const cancellationJustScheduled =
            event.type === 'customer.subscription.updated' &&
            subscription.cancel_at_period_end === true &&
            !previousCancelAtPeriodEnd &&
            subscription.status !== 'canceled' &&
            subscription.status !== 'incomplete_expired';

          if (cancellationJustScheduled && userId) {
            const accessEndsAt = item?.current_period_end
              ? new Date(item.current_period_end * 1000).toISOString()
              : previousPeriodEnd;
            try {
              await sendCancellationScheduledEmail(supabase, {
                userId,
                weddingId,
                stripeSubscriptionId: subscription.id,
                planName: plan?.name || previousPlanKey || 'subscription',
                accessEndsAt,
                billingInterval: item?.price?.recurring?.interval || null,
              });
            } catch (emailError) {
              // A failed email must never fail the webhook: Stripe would retry
              // the whole event for days.
              console.error('Cancellation confirmation email failed:', emailError);
            }
          }
          break;
        }

        case 'invoice.paid':
        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice;
          const subscriptionId = invoiceSubscriptionId(invoice);

          if (subscriptionId) {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            const plan = await resolvePlan(supabase, subscriptionProductId(subscription));
            if (!plan) needsMapping = true;

            // A failed payment must immediately reflect past_due so entitlements
            // and the billing page are not stale until the next subscription event.
            const overrides = event.type === 'invoice.payment_failed'
              ? { status: 'past_due' as const }
              : {};

            const result = await applySubscriptionState(supabase, subscription, plan, overrides);
            if (!result.attached) needsMapping = true;

            userId = subscription.metadata?.user_id || userId;
            weddingId = subscription.metadata?.wedding_id || weddingId;

            const { data: linked } = await supabase
              .from('wedora_subscriptions')
              .select('id, user_id, wedding_id')
              .eq('stripe_subscription_id', subscriptionId)
              .maybeSingle();

            if (linked) {
              userId = linked.user_id || userId;
              weddingId = linked.wedding_id || weddingId;
              const { error: linkError } = await supabase.from('wedora_billing_events')
                .update({
                  user_id: linked.user_id,
                  wedding_id: linked.wedding_id,
                  subscription_id: linked.id,
                })
                .eq('stripe_event_id', event.id);
              if (linkError) throw linkError;
            }
          }
          break;
        }

        default:
          // Unhandled event types are recorded and acknowledged.
          break;
      }

      const { error: finalizeError } = await supabase.from('wedora_billing_events')
        .update({
          processing_status: needsMapping ? 'needs_mapping' : 'processed',
          user_id: userId || undefined,
          wedding_id: weddingId || undefined,
          processed_at: new Date().toISOString(),
        })
        .eq('stripe_event_id', event.id);
      if (finalizeError) throw finalizeError;

      if (needsMapping) {
        console.error(`Billing event ${event.id} (${event.type}) needs manual plan/user mapping.`);
      }

    } catch (processingErr) {
      // 500 so Stripe retries; the event id stays claimable via 'failed'.
      console.error('Processing error:', processingErr);
      await supabase.from('wedora_billing_events')
        .update({
          processing_status: 'failed',
          error_message: processingErr instanceof Error ? processingErr.message : 'Unknown error',
        })
        .eq('stripe_event_id', event.id);

      return json({ error: 'Processing failed' }, 500);
    }

    return json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    return json({ error: 'Internal server error' }, 500);
  }
}, { cors: false });

// ────────────────────────────────────────────────────────────────────────────
// Cancellation confirmation email (Resend)
// ────────────────────────────────────────────────────────────────────────────

interface CancellationEmailInput {
  userId: string;
  weddingId: string | null;
  stripeSubscriptionId: string;
  planName: string;
  accessEndsAt: string | null;
  billingInterval: string | null;
}

function escapeHtmlText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatLongDate(iso: string | null): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Europe/London',
    });
  } catch {
    return '';
  }
}

function billingEmailOrigin(): string {
  try {
    const url = new URL(Deno.env.get('PUBLIC_SITE_URL')?.trim() || 'https://vowora.uk');
    if ((url.protocol === 'https:' || url.protocol === 'http:') && !url.username && !url.password) {
      return url.origin;
    }
  } catch {
    /* fall through to the canonical origin */
  }
  return 'https://vowora.uk';
}

function buildCancellationEmailHtml(params: {
  firstName: string;
  planName: string;
  accessEndsLabel: string;
  accessEndsFallback: string;
  billingUrl: string;
  supportUrl: string;
}): string {
  const { firstName, planName, accessEndsLabel, accessEndsFallback, billingUrl, supportUrl } = params;
  const endLabel = escapeHtmlText(accessEndsLabel || accessEndsFallback);
  const greeting = firstName ? `Hi ${escapeHtmlText(firstName)},` : 'Hello,';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <title>Cancellation confirmed</title>
</head>
<body style="margin:0;padding:0;background-color:#f7f3ee;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Your access ends on ${endLabel}.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f3ee;padding:36px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background-color:#ffffff;border:1px solid #ece3d8;border-radius:14px;overflow:hidden;">
          <tr>
            <td style="padding:26px 32px;border-bottom:1px solid #f0e7dc;">
              <span style="font-family:Georgia,'Times New Roman',serif;font-size:19px;letter-spacing:0.14em;text-transform:uppercase;color:#8d6e52;">Vowora</span>
              <span style="float:right;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#a99c8d;padding-top:6px;">Billing</span>
            </td>
          </tr>
          <tr>
            <td style="padding:34px 32px 8px 32px;">
              <h1 style="margin:0 0 10px 0;font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:1.3;color:#3f3a35;font-weight:normal;">Your cancellation is confirmed</h1>
              <p style="margin:0;font-size:14px;line-height:1.7;color:#6b6157;">${greeting}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 32px 0 32px;">
              <p style="margin:0;font-size:14px;line-height:1.75;color:#6b6157;">
                We have scheduled the cancellation of your subscription. Your <strong style="color:#3f3a35;">${escapeHtmlText(planName)}</strong> plan stays active until <strong style="color:#3f3a35;">${endLabel}</strong>.
                Keep this email — it is your written record of the end date.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:22px 32px 0 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#faf6f1;border:1px solid #ece3d8;border-radius:10px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <p style="margin:0 0 4px 0;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:#a99c8d;">Access ends</p>
                    <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:20px;color:#3f3a35;">${endLabel}</p>
                    <p style="margin:10px 0 0 0;font-size:12px;color:#8a7f72;">Plan: <span style="color:#3f3a35;">${escapeHtmlText(planName)}</span></p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px 0 32px;">
              <p style="margin:0 0 10px 0;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#a99c8d;">What happens next</p>
              <ul style="margin:0;padding:0 0 0 18px;font-size:14px;line-height:1.8;color:#6b6157;">
                <li>You keep every paid feature until ${endLabel}.</li>
                <li>You will not be charged again for this subscription.</li>
                <li>After that date you move to the Free plan. Your guests, schedule, seating plans and photos stay saved.</li>
              </ul>
            </td>
          </tr>
          <tr>
            <td style="padding:26px 32px 0 32px;">
              <p style="margin:0 0 16px 0;font-size:14px;line-height:1.75;color:#6b6157;">
                Changed your mind? You can reactivate any time before ${endLabel} and keep your plan, billing date and data exactly as they are.
              </p>
              <a href="${billingUrl}" style="display:inline-block;padding:13px 26px;background-color:#8d6e52;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">Reactivate subscription</a>
            </td>
          </tr>
          <tr>
            <td style="padding:26px 32px 30px 32px;">
              <p style="margin:0;font-size:12px;line-height:1.7;color:#8a7f72;">
                Manage or reactivate your plan any time from <a href="${billingUrl}" style="color:#8d6e52;text-decoration:underline;">Plans &amp; Billing</a>.
                Questions about this change? <a href="${supportUrl}" style="color:#8d6e52;text-decoration:underline;">Contact support</a>.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 32px;background-color:#faf6f1;border-top:1px solid #f0e7dc;">
              <p style="margin:0;font-size:11px;line-height:1.7;color:#a99c8d;">
                You are receiving this because a subscription change was made on your Vowora account. Billing is processed securely by Stripe.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildCancellationEmailText(params: {
  firstName: string;
  planName: string;
  accessEndsLabel: string;
  accessEndsFallback: string;
  billingUrl: string;
  supportUrl: string;
}): string {
  const { firstName, planName, accessEndsLabel, accessEndsFallback, billingUrl, supportUrl } = params;
  const endLabel = accessEndsLabel || accessEndsFallback;
  return [
    'Your cancellation is confirmed',
    '',
    firstName ? `Hi ${firstName},` : 'Hello,',
    '',
    `We have scheduled the cancellation of your ${planName} plan. Your access continues until ${endLabel}. Keep this email as your written record of that date.`,
    '',
    `Access ends: ${endLabel}`,
    `Plan: ${planName}`,
    '',
    'What happens next:',
    `- You keep every paid feature until ${endLabel}.`,
    '- You will not be charged again for this subscription.',
    '- After that date you move to the Free plan. Your data stays saved.',
    '',
    `Changed your mind? Reactivate any time before ${endLabel}: ${billingUrl}`,
    '',
    `Contact support: ${supportUrl}`,
    '',
    'Billing is processed securely by Stripe.',
  ].join('\n');
}

async function logCancellationEmail(
  supabase: SupabaseClient,
  input: CancellationEmailInput,
  outcome: 'sent' | 'failed' | 'skipped',
  details: Record<string, unknown>,
): Promise<void> {
  if (!input.weddingId) return;
  try {
    await supabase.from('email_activity_log').insert({
      wedding_id: input.weddingId,
      action: 'billing_cancellation_scheduled',
      details: {
        outcome,
        plan_name: input.planName,
        access_ends_at: input.accessEndsAt,
        stripe_subscription_id: input.stripeSubscriptionId,
        ...details,
      },
    });
  } catch (logError) {
    console.error('Cancellation email log failed:', logError);
  }
}

async function sendCancellationScheduledEmail(
  supabase: SupabaseClient,
  input: CancellationEmailInput,
): Promise<void> {
  const origin = billingEmailOrigin();
  const billingUrl = `${origin}/app/billing`;
  const supportUrl = `${origin}/app/support`;
  const accessEndsLabel = formatLongDate(input.accessEndsAt);
  const accessEndsFallback = 'the end of your current billing period';

  let recipientEmail: string | null = null;
  let firstName = '';
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, first_name, display_name')
      .eq('user_id', input.userId)
      .maybeSingle();
    recipientEmail = profile?.email?.trim() || null;
    firstName = (profile?.first_name || profile?.display_name || '').trim();
  } catch (profileError) {
    console.error('Cancellation email: profile lookup failed:', profileError);
  }

  if (!recipientEmail) {
    await logCancellationEmail(supabase, input, 'skipped', { reason: 'no_profile_email' });
    return;
  }

  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const resendFromDomain = Deno.env.get('RESEND_FROM_DOMAIN');
  if (!resendApiKey || !resendFromDomain) {
    console.warn('Cancellation email skipped: RESEND_API_KEY / RESEND_FROM_DOMAIN not configured');
    await logCancellationEmail(supabase, input, 'failed', { reason: 'resend_not_configured' });
    return;
  }

  const fromAddress = `noreply@${resendFromDomain}`;
  const subject = accessEndsLabel
    ? `Cancellation confirmed — ${input.planName} access ends ${accessEndsLabel}`
    : `Cancellation confirmed — ${input.planName}`;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: `Vowora Billing <${fromAddress}>`,
        to: [recipientEmail],
        reply_to: fromAddress,
        subject,
        html: buildCancellationEmailHtml({
          firstName,
          planName: input.planName,
          accessEndsLabel,
          accessEndsFallback,
          billingUrl,
          supportUrl,
        }),
        text: buildCancellationEmailText({
          firstName,
          planName: input.planName,
          accessEndsLabel,
          accessEndsFallback,
          billingUrl,
          supportUrl,
        }),
        tags: [
          { name: 'type', value: 'subscription_cancellation' },
          { name: 'stripe_subscription_id', value: input.stripeSubscriptionId },
        ],
      }),
    });

    const rawBody = await response.text();
    let emailId: string | null = null;
    try {
      const parsed = rawBody ? JSON.parse(rawBody) : null;
      emailId = parsed?.id ?? null;
    } catch {
      /* a non-JSON body is treated as a failure below */
    }

    if (!response.ok || !emailId) {
      console.error('Cancellation email failed:', response.status, rawBody?.slice(0, 300));
      await logCancellationEmail(supabase, input, 'failed', {
        status: response.status,
        error: rawBody?.slice(0, 300) || 'unknown_error',
      });
      return;
    }

    await logCancellationEmail(supabase, input, 'sent', {
      resend_email_id: emailId,
      to: recipientEmail,
    });
  } catch (error) {
    console.error('Cancellation email error:', error);
    await logCancellationEmail(supabase, input, 'failed', {
      error: error instanceof Error ? error.message : 'unknown_error',
    });
  }
}
