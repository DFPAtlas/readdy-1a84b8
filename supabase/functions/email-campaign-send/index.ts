import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };

interface RequestBody {
  action: 'build_recipients' | 'test' | 'send' | 'schedule';
  campaign_id: string;
  wedding_id: string;
  audience_filter?: Record<string, unknown>;
}

function buildEmailHtml(campaign: Record<string, unknown>, recipientName: string): string {
  const blocks = (campaign.content_blocks as Array<Record<string, unknown>>) || [];
  const primary = (campaign.brand_primary_color as string) || '#D4A574';
  const secondary = (campaign.brand_secondary_color as string) || '#F5F0EB';
  const accent = (campaign.brand_accent_color as string) || '#C9A96E';
  const fontFamily = (campaign.brand_font_family as string) || 'Georgia, serif';
  const subject = (campaign.subject as string) || '';
  const preheader = (campaign.preheader as string) || '';
  const ctaLabel = (campaign.cta_label as string) || '';
  const ctaUrl = (campaign.cta_url as string) || '';

  const renderBlock = (block: Record<string, unknown>): string => {
    const type = block.type as string;
    const content = (block.content as string) || '';

    switch (type) {
      case 'heading': {
        const level = (block.level as number) || 1;
        const size = level === 1 ? '28px' : level === 2 ? '22px' : '18px';
        return `<h${level} style="font-family:${fontFamily};color:#3D3226;font-size:${size};margin:0 0 12px 0;line-height:1.3;">${escapeHtml(content)}</h${level}>`;
      }
      case 'paragraph':
        return `<p style="font-family:${fontFamily};color:#5C4F42;font-size:15px;line-height:1.7;margin:0 0 16px 0;">${escapeHtml(content).replace(/\n/g, '<br/>')}</p>`;
      case 'image': {
        const src = (block.src as string) || '';
        const alt = (block.alt as string) || '';
        if (!src) return '';
        return `<div style="margin:16px 0;text-align:center;"><img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" style="max-width:100%;height:auto;border-radius:8px;" /></div>`;
      }
      case 'button': {
        const label = (block.label as string) || ctaLabel;
        const url = (block.url as string) || ctaUrl;
        const variant = (block.variant as string) || 'primary';
        const bgColor = variant === 'primary' ? primary : 'transparent';
        const textColor = variant === 'primary' ? '#FFFFFF' : primary;
        const border = variant === 'primary' ? 'none' : `2px solid ${primary}`;
        if (!label || !url) return '';
        return `<div style="margin:20px 0;text-align:center;"><a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 32px;background:${bgColor};color:${textColor};font-family:${fontFamily};font-size:15px;font-weight:bold;text-decoration:none;border-radius:6px;border:${border};text-align:center;">${escapeHtml(label)}</a></div>`;
      }
      case 'divider':
        return `<hr style="border:none;border-top:1px solid ${secondary};margin:20px 0;" />`;
      case 'spacer':
        return `<div style="height:${(block.content as string) || '20px'};">&nbsp;</div>`;
      default:
        return '';
    }
  };

  const blocksHtml = blocks.map(renderBlock).join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head><body style="margin:0;padding:0;background-color:#FAF8F5;">
<div style="max-width:600px;margin:0 auto;background:#FFFFFF;">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(preheader)}</div>` : ''}
  <div style="background:${primary};padding:40px 30px;text-align:center;">
    <h1 style="font-family:${fontFamily};color:#FFFFFF;font-size:24px;margin:0;font-weight:normal;">${escapeHtml(subject)}</h1>
  </div>
  <div style="padding:30px;">
    <p style="font-family:${fontFamily};color:#5C4F42;font-size:15px;line-height:1.7;margin:0 0 20px 0;">Dear ${escapeHtml(recipientName)},</p>
    ${blocksHtml}
  </div>
  <div style="padding:20px 30px;background:${secondary};font-family:${fontFamily};color:#8C7B6E;font-size:12px;line-height:1.6;text-align:center;">
    <p style="margin:0 0 4px 0;">This email was sent by ${escapeHtml((campaign.sender_name as string) || '')}</p>
    <p style="margin:0 0 4px 0;">You are receiving this because you are a guest of our wedding.</p>
    <p style="margin:0;"><a href="{{unsubscribe_url}}" style="color:${accent};text-decoration:underline;">Unsubscribe</a> from future wedding emails.</p>
  </div>
</div></body></html>`;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function buildPlainText(campaign: Record<string, unknown>, recipientName: string): string {
  const blocks = (campaign.content_blocks as Array<Record<string, unknown>>) || [];
  const ctaLabel = (campaign.cta_label as string) || '';
  const ctaUrl = (campaign.cta_url as string) || '';

  let text = `Dear ${recipientName},\n\n`;

  for (const block of blocks) {
    const type = block.type as string;
    const content = (block.content as string) || '';
    switch (type) {
      case 'heading': text += `${content}\n${'='.repeat(content.length)}\n\n`; break;
      case 'paragraph': text += `${content}\n\n`; break;
      case 'button': {
        const label = (block.label as string) || ctaLabel;
        const url = (block.url as string) || ctaUrl;
        if (label && url) text += `${label}: ${url}\n\n`;
        break;
      }
      case 'image': text += `[Image: ${(block.alt as string) || ''}]\n\n`; break;
      case 'divider': text += `---\n\n`; break;
    }
  }

  text += `\n--\nSent by ${(campaign.sender_name as string) || ''}\n`;
  text += `To unsubscribe: {{unsubscribe_url}}\n`;

  return text;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authErr } = await supabaseClient.auth.getUser();
    if (authErr || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const body: RequestBody = await req.json();
    const { action, campaign_id, wedding_id, audience_filter } = body;

    // Verify membership
    const { data: membership } = await supabaseClient.from('wedding_members')
      .select('role').eq('wedding_id', wedding_id).eq('user_id', user.id).maybeSingle();
    if (!membership || !['owner','partner','planner','collaborator'].includes(membership.role)) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Get campaign
    const { data: campaign, error: campErr } = await supabaseClient.from('email_campaigns')
      .select('*').eq('id', campaign_id).eq('wedding_id', wedding_id).maybeSingle();
    if (campErr || !campaign) return new Response(JSON.stringify({ error: 'Campaign not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    const RESEND_FROM_DOMAIN = Deno.env.get('RESEND_FROM_DOMAIN');

    // ── ACTION: build_recipients ──
    if (action === 'build_recipients') {
      const filter = audience_filter || (campaign.audience_filter as Record<string, unknown>) || {};
      const guestIds = (filter.guest_ids as string[]) || [];
      const householdIds = (filter.household_ids as string[]) || [];
      const rsvpStatuses = (filter.rsvp_status as string[]) || [];
      const guestTags = (filter.guest_tags as string[]) || [];
      const excludeIds = (filter.exclude_ids as string[]) || [];

      // Delete existing recipients for this campaign
      await supabaseClient.from('email_campaign_recipients').delete().eq('campaign_id', campaign_id);

      // Get suppressed emails
      const { data: suppressions } = await supabaseClient.from('email_suppressions')
        .select('email').eq('wedding_id', wedding_id);
      const suppressedEmails = new Set((suppressions || []).map((s: { email: string }) => s.email.toLowerCase()));

      // Build guest query
      let query = supabaseClient.from('guests').select('id,full_name,email,rsvp_status,household_id,ceremony_invited,reception_invited,evening_invited')
        .eq('wedding_id', wedding_id).not('email', 'is', null).neq('email', '');

      if (guestIds.length > 0) query = query.in('id', guestIds);
      if (rsvpStatuses.length > 0) query = query.in('rsvp_status', rsvpStatuses);
      if (filter.ceremony_invited !== undefined) query = query.eq('ceremony_invited', filter.ceremony_invited);
      if (filter.reception_invited !== undefined) query = query.eq('reception_invited', filter.reception_invited);
      if (filter.evening_invited !== undefined) query = query.eq('evening_invited', filter.evening_invited);

      const { data: guests, error: guestErr } = await query;
      if (guestErr) throw guestErr;

      // Also get households if requested
      let householdGuests: Array<{ id: string; full_name: string; email: string; rsvp_status: string; household_id: string; ceremony_invited: boolean; reception_invited: boolean; evening_invited: boolean }> = [];
      if (householdIds.length > 0) {
        const { data: hg } = await supabaseClient.from('guests').select('id,full_name,email,rsvp_status,household_id,ceremony_invited,reception_invited,evening_invited')
          .eq('wedding_id', wedding_id).in('household_id', householdIds).not('email', 'is', null).neq('email', '');
        if (hg) householdGuests = hg as typeof householdGuests;
      }

      // Deduplicate by email
      const seen = new Set<string>();
      const recipients: Array<{ campaign_id: string; wedding_id: string; guest_id: string | null; household_id: string | null; recipient_email: string; recipient_name: string; recipient_type: string; status: string }> = [];

      const allGuests = [...(guests || []), ...householdGuests];
      for (const g of allGuests) {
        const email = (g.email as string).toLowerCase().trim();
        if (!email || seen.has(email)) continue;
        if (excludeIds.includes(g.id)) continue;

        const isSuppressed = suppressedEmails.has(email);
        seen.add(email);

        recipients.push({
          campaign_id,
          wedding_id,
          guest_id: g.id,
          household_id: g.household_id || null,
          recipient_email: email,
          recipient_name: (g.full_name as string) || '',
          recipient_type: 'guest',
          status: isSuppressed ? 'suppressed' : 'pending',
        });
      }

      if (recipients.length > 0) {
        const { error: insErr } = await supabaseClient.from('email_campaign_recipients').insert(recipients);
        if (insErr) throw insErr;
      }

      // Update campaign recipient count
      await supabaseClient.from('email_campaigns').update({ recipient_count: recipients.length }).eq('id', campaign_id);

      return new Response(JSON.stringify({ recipient_count: recipients.length }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── ACTION: test ──
    if (action === 'test') {
      if (!RESEND_API_KEY || !RESEND_FROM_DOMAIN) {
        return new Response(JSON.stringify({ error: 'Email service not configured. Please set up Resend domain first.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const fromAddress = `noreply@${RESEND_FROM_DOMAIN}`;
      const senderEmail = (campaign.sender_email as string) || fromAddress;

      const html = buildEmailHtml(campaign, user.email || 'Test Recipient');
      const text = buildPlainText(campaign, user.email || 'Test Recipient');

      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: `${campaign.sender_name || 'Wedora'} <${senderEmail}>`,
          to: [user.email],
          subject: `[TEST] ${campaign.subject}`,
          html,
          text,
          reply_to: (campaign.reply_to_email as string) || senderEmail,
        }),
      });

      if (!resendRes.ok) {
        const errText = await resendRes.text();
        throw new Error(`Resend error: ${errText}`);
      }

      await supabaseClient.from('email_activity_log').insert({
        wedding_id,
        campaign_id,
        actor_id: user.id,
        action: 'test_sent',
        details: { to: user.email },
      });

      return new Response(JSON.stringify({ success: true, message: `Test email sent to ${user.email}` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── ACTION: send ──
    if (action === 'send') {
      if (!RESEND_API_KEY || !RESEND_FROM_DOMAIN) {
        return new Response(JSON.stringify({ error: 'Email service not configured. Please set up Resend domain first.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Get pending recipients
      const { data: recipients, error: recErr } = await supabaseClient.from('email_campaign_recipients')
        .select('*').eq('campaign_id', campaign_id).in('status', ['pending', 'queued']);
      if (recErr) throw recErr;

      if (!recipients || recipients.length === 0) {
        return new Response(JSON.stringify({ error: 'No recipients to send to. Build your recipient list first.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Update status to sending
      await supabaseClient.from('email_campaigns').update({ status: 'sending' }).eq('id', campaign_id);

      const fromAddress = `noreply@${RESEND_FROM_DOMAIN}`;
      const senderEmail = (campaign.sender_email as string) || fromAddress;
      const stats = { accepted: 0, delivered: 0, bounced: 0, complained: 0, failed: 0 };

      // Send to each recipient (batch via Resend)
      for (const rec of recipients) {
        try {
          const html = buildEmailHtml(campaign, rec.recipient_name || 'Guest');
          const text = buildPlainText(campaign, rec.recipient_name || 'Guest');

          // Replace unsubscribe placeholder with actual unsubscribe URL
          const unsubUrl = `${req.headers.get('origin') || ''}/unsubscribe?wedding=${wedding_id}&email=${encodeURIComponent(rec.recipient_email)}`;
          const finalHtml = html.replace(/\{\{unsubscribe_url\}\}/g, unsubUrl);
          const finalText = text.replace(/\{\{unsubscribe_url\}\}/g, unsubUrl);

          const resendRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: `${campaign.sender_name || 'Wedora'} <${senderEmail}>`,
              to: [rec.recipient_email],
              subject: (campaign.subject as string) || '',
              html: finalHtml,
              text: finalText,
              reply_to: (campaign.reply_to_email as string) || senderEmail,
              headers: { 'X-Wedding-Id': wedding_id, 'X-Campaign-Id': campaign_id, 'X-Recipient-Id': rec.id },
            }),
          });

          if (resendRes.ok) {
            const resendData = await resendRes.json();
            await supabaseClient.from('email_campaign_recipients').update({
              status: 'accepted',
              resend_email_id: resendData.id || null,
            }).eq('id', rec.id);
            stats.accepted++;
          } else {
            const errText = await resendRes.text();
            await supabaseClient.from('email_campaign_recipients').update({
              status: 'failed',
              last_error: errText.slice(0, 500),
              retry_count: (rec.retry_count || 0) + 1,
            }).eq('id', rec.id);
            stats.failed++;
          }
        } catch (sendErr: unknown) {
          const msg = sendErr instanceof Error ? sendErr.message : 'Unknown error';
          await supabaseClient.from('email_campaign_recipients').update({
            status: 'failed',
            last_error: msg.slice(0, 500),
            retry_count: (rec.retry_count || 0) + 1,
          }).eq('id', rec.id);
          stats.failed++;
        }
      }

      const finalStatus = stats.failed === 0 ? 'sent' : 'partial_failure';
      await supabaseClient.from('email_campaigns').update({
        status: finalStatus,
        sent_at: new Date().toISOString(),
        delivery_stats: stats,
      }).eq('id', campaign_id);

      await supabaseClient.from('email_activity_log').insert({
        wedding_id,
        campaign_id,
        actor_id: user.id,
        action: 'campaign_sent',
        details: { recipient_count: recipients.length, stats },
      });

      return new Response(JSON.stringify({ success: true, status: finalStatus, stats }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error';
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});