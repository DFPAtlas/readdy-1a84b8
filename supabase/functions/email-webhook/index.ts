import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature' };

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    const eventType = body?.type as string;
    const eventData = body?.data as Record<string, unknown>;

    if (!eventType || !eventData) {
      return new Response(JSON.stringify({ error: 'Invalid webhook payload' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const emailId = eventData.email_id as string;
    const recipientEmail = (eventData.to as string[])?.[0] || eventData.recipient as string || '';

    // Find the recipient record by resend_email_id
    if (emailId) {
      const { data: recipient } = await supabaseClient.from('email_campaign_recipients')
        .select('*').eq('resend_email_id', emailId).maybeSingle();

      if (recipient) {
        const updates: Record<string, unknown> = {};
        const now = new Date().toISOString();

        switch (eventType) {
          case 'email.delivered':
            updates.status = 'delivered';
            updates.delivered_at = now;
            break;
          case 'email.bounced':
            updates.status = 'bounced';
            updates.bounce_reason = eventData.bounce_reason || 'Unknown bounce reason';
            // Also add to suppressions
            await supabaseClient.from('email_suppressions').upsert({
              wedding_id: recipient.wedding_id,
              email: recipient.recipient_email,
              suppression_type: 'bounced',
              reason: `Bounce: ${eventData.bounce_reason || 'unknown'}`,
              resend_event_id: emailId,
            }, { onConflict: 'wedding_id,email' });
            break;
          case 'email.complained':
            updates.status = 'complained';
            updates.complaint_reason = 'Recipient marked as spam';
            await supabaseClient.from('email_suppressions').upsert({
              wedding_id: recipient.wedding_id,
              email: recipient.recipient_email,
              suppression_type: 'complained',
              reason: 'Recipient complained (marked as spam)',
              resend_event_id: emailId,
            }, { onConflict: 'wedding_id,email' });
            break;
          case 'email.opened':
            if (!recipient.opened_at) {
              updates.opened_at = now;
            }
            break;
          case 'email.clicked':
            if (!recipient.clicked_at) {
              updates.clicked_at = now;
            }
            break;
        }

        if (Object.keys(updates).length > 0) {
          await supabaseClient.from('email_campaign_recipients').update(updates).eq('id', recipient.id);

          // Update campaign-level stats
          if (['email.delivered','email.bounced','email.complained'].includes(eventType)) {
            const { data: campaign } = await supabaseClient.from('email_campaigns')
              .select('delivery_stats').eq('id', recipient.campaign_id).maybeSingle();
            if (campaign) {
              const stats = campaign.delivery_stats as Record<string, number> || { accepted: 0, delivered: 0, bounced: 0, complained: 0, failed: 0 };
              if (eventType === 'email.delivered') stats.delivered = (stats.delivered || 0) + 1;
              if (eventType === 'email.bounced') stats.bounced = (stats.bounced || 0) + 1;
              if (eventType === 'email.complained') stats.complained = (stats.complained || 0) + 1;
              await supabaseClient.from('email_campaigns').update({ delivery_stats: stats }).eq('id', recipient.campaign_id);
            }
          }

          // Log activity
          await supabaseClient.from('email_activity_log').insert({
            wedding_id: recipient.wedding_id,
            campaign_id: recipient.campaign_id,
            action: `webhook_${eventType.replace('email.', '')}`,
            details: { email_id: emailId, recipient_id: recipient.id, event: eventType },
          });
        }
      }
    }

    // Handle inbound unsubscribe
    if (recipientEmail && (eventType === 'email.complained' || eventType === 'email.bounced')) {
      // Already handled above via recipient lookup
    }

    return new Response(JSON.stringify({ received: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error';
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});