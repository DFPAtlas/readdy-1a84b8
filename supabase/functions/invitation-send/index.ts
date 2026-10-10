import { sha256Hex } from "../_shared/guestAccess.ts";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store, no-cache, must-revalidate",
  "Pragma": "no-cache",
};

const RATE_WINDOW_SECONDS = 60;
const MAX_SENDS_PER_WINDOW = 20;

interface InvitationRecipientRow {
  id: string;
  guest_id: string;
  guest: { id: string; full_name: string; last_name?: string; preferred_name?: string; email?: string; mobile_phone?: string } | null;
  recipient_role: string;
  ceremony_included: boolean;
  reception_included: boolean;
  evening_included: boolean;
  welcome_event_included: boolean;
  day_after_event_included: boolean;
  plus_one_allowed: boolean;
}

interface InvitationRow {
  delivery_attempts?: number;
  id: string;
  wedding_id: string;
  internal_name: string;
  formal_recipient_name?: string;
  informal_greeting?: string;
  invitation_type: string;
  delivery_method: string;
  rsvp_deadline?: string;
  status: string;
  template?: {
    id: string;
    name: string;
    style_preset: string;
    header_text?: string;
    body_text?: string;
    closing_text?: string;
    footer_text?: string;
    rsvp_button_label?: string;
    image_url?: string;
    theme_config?: Record<string, unknown>;
  } | null;
  household?: { id: string; display_name: string } | null;
}

interface WeddingRow {
  id: string;
  partner_one_name: string;
  partner_two_name: string;
  title: string;
  wedding_date: string;
  dress_code?: string;
  contact_information?: string;
}



function generateToken(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function buildFingerprint(req: Request): Promise<string> {
  const ip = req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  const ua = req.headers.get("user-agent") || "unknown";
  return await sha256Hex(`${ip}:${ua.slice(0, 64)}`);
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function buildInvitationHtml(
  invitation: InvitationRow,
  wedding: WeddingRow,
  token: string,
  recipients: InvitationRecipientRow[],
): string {
  const inviteUrl = `${Deno.env.get("PUBLIC_SITE_URL") || "https://vowora.uk"}/invite/${token}`;
  const preset = invitation.template?.style_preset || "minimal";
  const isDark = preset === "editorial";

  const primaryColor = "#9b7b5e";
  const accentColor = isDark ? "#78716c" : "#c9a87c";
  const bgColor = isDark ? "#f5f0eb" : "#fefcf8";
  const textColor = isDark ? "#44403c" : "#5c4a3a";
  const borderColor = isDark ? "#d6cfc7" : "#e8dccf";

  const dateDisplay = formatDate(wedding.wedding_date);
  const rsvpDeadlineDisplay = formatDate(invitation.rsvp_deadline);
  const guestNames = recipients
    .filter((r) => r.guest)
    .map((r) => r.guest!.preferred_name || r.guest!.full_name)
    .join(", ");

  const hasCeremony = recipients.some((r) => r.ceremony_included);
  const hasReception = recipients.some((r) => r.reception_included);
  const hasEvening = recipients.some((r) => r.evening_included);

  const headerText = invitation.template?.header_text || "You are invited";
  const bodyText = invitation.template?.body_text ||
    `Together with their families, ${wedding.partner_one_name} and ${wedding.partner_two_name} invite you to celebrate their wedding.`;
  const closingText = invitation.template?.closing_text || "With love and excitement,";
  const footerText = invitation.template?.footer_text || "This is a private invitation.";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Wedding Invitation</title>
</head>
<body style="margin:0;padding:0;background-color:${bgColor};font-family:Georgia,'Times New Roman',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:${bgColor};padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;border:1px solid ${borderColor};max-width:600px;">
          <!-- Header -->
          <tr>
            <td style="padding:50px 40px 30px 40px;text-align:center;">
              <p style="font-family:Georgia,serif;font-size:32px;color:${textColor};margin:0 0 8px 0;line-height:1.2;">
                ${escapeHtml(wedding.partner_one_name)} <span style="font-size:22px;font-weight:300;">&amp;</span> ${escapeHtml(wedding.partner_two_name)}
              </p>
              ${dateDisplay ? `<p style="font-family:Georgia,serif;font-size:13px;color:${accentColor};text-transform:uppercase;letter-spacing:3px;margin:0;">${escapeHtml(dateDisplay)}</p>` : ""}
            </td>
          </tr>

          <!-- Decor -->
          <tr>
            <td style="text-align:center;padding:0 40px 30px 40px;">
              <table cellpadding="0" cellspacing="0" align="center">
                <tr>
                  <td style="width:50px;height:1px;background-color:${accentColor};opacity:0.4;"></td>
                  <td style="width:16px;text-align:center;color:${accentColor};font-size:16px;padding:0 10px;">&#10084;</td>
                  <td style="width:50px;height:1px;background-color:${accentColor};opacity:0.4;"></td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main content -->
          <tr>
            <td style="padding:0 40px 30px 40px;text-align:center;">
              <p style="font-family:Georgia,serif;font-size:20px;color:${textColor};margin:0 0 12px 0;">${escapeHtml(headerText)}</p>

              ${invitation.formal_recipient_name ? `<p style="font-family:Georgia,serif;font-size:16px;color:${textColor};margin:0 0 8px 0;">${escapeHtml(invitation.formal_recipient_name)}</p>` : ""}
              ${invitation.informal_greeting ? `<p style="font-family:Georgia,serif;font-size:14px;color:${accentColor};margin:0 0 16px 0;">Dear ${escapeHtml(invitation.informal_greeting)},</p>` : ""}

              <p style="font-family:Georgia,serif;font-size:14px;color:${textColor};line-height:1.7;margin:0 0 24px 0;">${escapeHtml(bodyText)}</p>

              ${guestNames ? `<p style="font-family:Georgia,serif;font-size:13px;color:${textColor};margin:0 0 24px 0;">Invited: ${escapeHtml(guestNames)}</p>` : ""}
            </td>
          </tr>

          <!-- Events -->
          ${(hasCeremony || hasReception || hasEvening) ? `
          <tr>
            <td style="padding:0 40px 24px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                ${hasCeremony ? `<tr><td style="padding:12px 0;border-top:1px solid ${borderColor};"><span style="font-family:Georgia,serif;font-size:11px;color:${accentColor};text-transform:uppercase;letter-spacing:2px;">Ceremony</span><br><span style="font-family:Georgia,serif;font-size:14px;color:${textColor};">1:00 PM</span></td></tr>` : ""}
                ${hasReception ? `<tr><td style="padding:12px 0;border-top:1px solid ${borderColor};"><span style="font-family:Georgia,serif;font-size:11px;color:${accentColor};text-transform:uppercase;letter-spacing:2px;">Reception</span><br><span style="font-family:Georgia,serif;font-size:14px;color:${textColor};">3:00 PM</span></td></tr>` : ""}
                ${hasEvening ? `<tr><td style="padding:12px 0;border-top:1px solid ${borderColor};"><span style="font-family:Georgia,serif;font-size:11px;color:${accentColor};text-transform:uppercase;letter-spacing:2px;">Evening Celebration</span><br><span style="font-family:Georgia,serif;font-size:14px;color:${textColor};">7:00 PM</span></td></tr>` : ""}
              </table>
            </td>
          </tr>
          ` : ""}

          <!-- RSVP deadline -->
          ${rsvpDeadlineDisplay ? `
          <tr>
            <td style="padding:0 40px 24px 40px;text-align:center;">
              <span style="display:inline-block;padding:8px 20px;border-radius:50px;background-color:${bgColor};font-family:Georgia,serif;font-size:12px;color:${textColor};">Kindly respond by ${escapeHtml(rsvpDeadlineDisplay)}</span>
            </td>
          </tr>
          ` : ""}

          <!-- CTA -->
          <tr>
            <td style="padding:0 40px 30px 40px;text-align:center;">
              <a href="${inviteUrl}" style="display:inline-block;padding:14px 36px;background-color:${primaryColor};color:#ffffff;text-decoration:none;border-radius:8px;font-family:Georgia,serif;font-size:15px;font-weight:600;">
                View invitation &amp; RSVP
              </a>
            </td>
          </tr>

          <!-- Closing -->
          <tr>
            <td style="padding:0 40px 30px 40px;text-align:center;">
              <p style="font-family:Georgia,serif;font-size:13px;color:${textColor};font-style:italic;margin:0;">${escapeHtml(closingText)}</p>
              <p style="font-family:Georgia,serif;font-size:14px;color:${textColor};margin:4px 0 0 0;">${escapeHtml(wedding.partner_one_name)} &amp; ${escapeHtml(wedding.partner_two_name)}</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;background-color:${bgColor};border-radius:0 0 16px 16px;text-align:center;">
              <p style="font-family:Georgia,serif;font-size:11px;color:#a09080;margin:0 0 6px 0;">${escapeHtml(footerText)}</p>
              <p style="font-family:Georgia,serif;font-size:10px;color:#c0b0a0;margin:0;">
                This invitation was sent by ${escapeHtml(wedding.partner_one_name)} &amp; ${escapeHtml(wedding.partner_two_name)}${wedding.contact_information ? ` &middot; ${escapeHtml(wedding.contact_information)}` : ""}
                <br>If you no longer wish to receive wedding communications, please contact the couple directly.
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

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildPlainText(
  invitation: InvitationRow,
  wedding: WeddingRow,
  token: string,
): string {
  const inviteUrl = `${Deno.env.get("PUBLIC_SITE_URL") || "https://vowora.uk"}/invite/${token}`;
  const lines: string[] = [];
  lines.push(`${wedding.partner_one_name} & ${wedding.partner_two_name}`);
  if (wedding.wedding_date) lines.push(formatDate(wedding.wedding_date));
  lines.push("");
  lines.push(`Dear ${invitation.informal_greeting || invitation.formal_recipient_name || "Guest"},`);
  lines.push("");
  lines.push("You are invited to celebrate with us.");
  lines.push("");
  if (invitation.rsvp_deadline) lines.push(`Please RSVP by ${formatDate(invitation.rsvp_deadline)}.`);
  lines.push("");
  lines.push(`View your invitation: ${inviteUrl}`);
  lines.push("");
  lines.push(`With love, ${wedding.partner_one_name} & ${wedding.partner_two_name}`);
  return lines.join("\n");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = (Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_PUBLIC_SUPABASE_URL"))!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);
  // Separate anon client used only to verify the caller's JWT; privileged
  // database operations stay on the service-role client above.
  const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);

  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const resendFromDomain = Deno.env.get("RESEND_FROM_DOMAIN");

  const fingerprint = await buildFingerprint(req);

  try {
    // Verify JWT
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabaseAuth.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action, invitation_id, invitation_ids } = body || {};

    // ── Rate limit ──
    const rateStart = new Date(Date.now() - RATE_WINDOW_SECONDS * 1000).toISOString();
    const { count: recentSends } = await supabase
      .from("invitation_access_activity")
      .select("id", { count: "exact", head: true })
      .eq("event_type", "invitation_sent")
      .gte("created_at", rateStart)
      .filter("security_metadata->>fingerprint", "eq", fingerprint);

    if (recentSends && recentSends >= MAX_SENDS_PER_WINDOW) {
      return new Response(JSON.stringify({ error: "rate_limited", message: "Too many invitation sends. Please wait a moment." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Send individual ──
    if (action === "send_individual" && invitation_id) {
      return await handleSendIndividual(supabase, invitation_id, user.id, fingerprint, resendApiKey, resendFromDomain);
    }

    // ── Send bulk ──
    if (action === "send_bulk" && invitation_ids && Array.isArray(invitation_ids)) {
      return await handleSendBulk(supabase, invitation_ids, user.id, fingerprint, resendApiKey, resendFromDomain);
    }

    // ── Resend ──
    if (action === "resend" && invitation_id) {
      return await handleResend(supabase, invitation_id, user.id, fingerprint, resendApiKey, resendFromDomain);
    }

    // ── Preview token (generate but don't send) ──
    if (action === "generate_token" && invitation_id) {
      return await handleGenerateToken(supabase, invitation_id, user.id);
    }

    return new Response(JSON.stringify({ error: "invalid_action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("invitation-send error:", err);
    return new Response(JSON.stringify({ error: "internal_error", message: "An unexpected error occurred" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function handleSendIndividual(
  supabase: SupabaseClient,
  invitationId: string,
  userId: string,
  fingerprint: string,
  resendApiKey: string | undefined,
  resendFromDomain: string | undefined,
): Promise<Response> {
  // Fetch invitation with template and household
  const { data: invitation, error: invErr } = await supabase
    .from("invitations")
    .select("*, template:invitation_templates(id, name, style_preset, header_text, body_text, closing_text, footer_text, rsvp_button_label, image_url, theme_config), household:guest_households(id, display_name)")
    .eq("id", invitationId)
    .maybeSingle();

  if (invErr || !invitation) {
    return jsonResponse({ error: "not_found", message: "Invitation not found" });
  }

  const inv = invitation as unknown as InvitationRow;

  // Verify wedding membership and edit permissions
  const { data: membership } = await supabase
    .from("wedding_members")
    .select("role")
    .eq("wedding_id", inv.wedding_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!membership || !["owner", "partner", "planner", "editor"].includes(membership.role)) {
    return jsonResponse({ error: "forbidden", message: "You don't have permission to send this invitation" });
  }

  // Check invitation is in 'ready' status
  if (inv.status !== "ready") {
    return jsonResponse({ error: "invalid_status", message: "Only ready invitations can be sent" });
  }

  // Get recipients
  const { data: recipients } = await supabase
    .from("invitation_recipients")
    .select("id, guest_id, guest:guests(id, full_name, last_name, preferred_name, email, mobile_phone), recipient_role, ceremony_included, reception_included, evening_included, welcome_event_included, day_after_event_included, plus_one_allowed")
    .eq("invitation_id", invitationId);

  if (!recipients || recipients.length === 0) {
    return jsonResponse({ error: "no_recipients", message: "This invitation has no recipients" });
  }

  const recipientList = recipients as unknown as InvitationRecipientRow[];

  // Get recipient emails
  const emails = recipientList
    .map((r) => r.guest?.email)
    .filter((e): e is string => !!e && e.includes("@"));

  if (emails.length === 0) {
    // Update delivery status to show missing contact
    await supabase.from("invitations").update({
      delivery_status: "failed",
      last_delivery_error: "No valid email addresses for recipients",
      delivery_attempts: (inv.delivery_attempts || 0) + 1,
    }).eq("id", invitationId);

    await logActivity(supabase, inv.wedding_id, invitationId, "delivery_failed", "No valid email addresses", fingerprint);
    return jsonResponse({ error: "no_email", message: "None of the recipients have a valid email address" });
  }

  // Get wedding info
  const { data: wedding } = await supabase
    .from("weddings")
    .select("id, partner_one_name, partner_two_name, title, wedding_date, dress_code, contact_information")
    .eq("id", inv.wedding_id)
    .maybeSingle();

  if (!wedding) {
    return jsonResponse({ error: "wedding_not_found", message: "Wedding not found" });
  }

  const wed = wedding as unknown as WeddingRow;

  // Generate token
  const rawToken = generateToken();
  const tokenHash = await sha256Hex(rawToken);

  // Store token
  const { error: tokenErr } = await supabase
    .from("invitation_access_tokens")
    .insert({
      wedding_id: inv.wedding_id,
      invitation_id: invitationId,
      token_hash: tokenHash,
      token_version: 1,
      status: "active",
      delivery_channel: "email",
      created_by: userId,
      created_at: new Date().toISOString(),
    });

  if (tokenErr) {
    console.error("Token creation failed:", tokenErr);
    return jsonResponse({ error: "token_failed", message: "Failed to generate access token" });
  }

  // Build email
  const html = buildInvitationHtml(inv, wed, rawToken, recipientList);
  const plainText = buildPlainText(inv, wed, rawToken);

  // Get primary recipient email
  const primaryRecipient = recipientList.find((r) => r.recipient_role === "primary") || recipientList[0];
  const toEmail = primaryRecipient.guest?.email || emails[0];
  const toName = primaryRecipient.guest?.preferred_name || primaryRecipient.guest?.full_name || "Guest";

  // Deduplicate recipient emails (CC any additional guests)
  const additionalEmails = emails.filter((e) => e !== toEmail);

  // Send via Resend
  if (!resendApiKey || !resendFromDomain) {
    // No Resend configured — mark as needs manual delivery
    await supabase.from("invitations").update({
      status: "sent",
      delivery_status: "pending",
      sent_at: new Date().toISOString(),
      delivery_attempts: (inv.delivery_attempts || 0) + 1,
      last_delivery_error: "Resend not configured — token generated but email not sent",
    }).eq("id", invitationId);

    await logActivity(supabase, inv.wedding_id, invitationId, "token_generated", "Token generated (Resend not configured)", fingerprint);

    const siteUrl = Deno.env.get("PUBLIC_SITE_URL") || "https://vowora.uk";
    const inviteUrl = `${siteUrl}/invite/${rawToken}`;
    return jsonResponse({
      success: true,
      warning: "resend_not_configured",
      message: "Invitation token generated but email could not be sent. Use the copy link feature to share manually.",
      invite_url: inviteUrl,
    });
  }

  const fromAddress = `noreply@${resendFromDomain}`;

  try {
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: `${wed.partner_one_name} & ${wed.partner_two_name} <${fromAddress}>`,
        to: [`${toName} <${toEmail}>`],
        ...(additionalEmails.length > 0 ? { cc: additionalEmails.map((e) => e) } : {}),
        subject: `You're invited — ${wed.partner_one_name} & ${wed.partner_two_name}`,
        html,
        text: plainText,
        reply_to: fromAddress,
        tags: [{ name: "type", value: "wedding_invitation" }, { name: "wedding_id", value: inv.wedding_id }],
      }),
    });

    const resendBody = await resendRes.json();

    if (resendRes.ok && resendBody.id) {
      // Success
      await supabase.from("invitations").update({
        status: "sent",
        delivery_status: "delivered",
        sent_at: new Date().toISOString(),
        delivery_attempts: (inv.delivery_attempts || 0) + 1,
        resend_email_id: resendBody.id,
        last_delivery_error: null,
      }).eq("id", invitationId);

      // Update token with campaign reference
      await supabase.from("invitation_access_tokens").update({
        sent_via_campaign_id: null,
      }).eq("token_hash", tokenHash).eq("invitation_id", invitationId);

      await logActivity(supabase, inv.wedding_id, invitationId, "invitation_sent", `Invitation sent to ${toEmail}${additionalEmails.length > 0 ? ` + ${additionalEmails.length} more` : ""}`, fingerprint);

      return jsonResponse({
        success: true,
        message: `Invitation sent to ${toEmail}`,
        resend_email_id: resendBody.id,
      });
    } else {
      // Resend API returned an error
      console.error("Resend API error:", resendBody);
      await supabase.from("invitations").update({
        delivery_status: "failed",
        last_delivery_error: JSON.stringify(resendBody).slice(0, 500),
        delivery_attempts: (inv.delivery_attempts || 0) + 1,
      }).eq("id", invitationId);

      await logActivity(supabase, inv.wedding_id, invitationId, "delivery_failed", `Resend API error: ${JSON.stringify(resendBody).slice(0, 200)}`, fingerprint);

      return jsonResponse({ error: "resend_failed", message: "Email service returned an error", details: String(resendBody).slice(0, 300) });
    }
  } catch (sendErr) {
    console.error("Resend send error:", sendErr);
    await supabase.from("invitations").update({
      delivery_status: "failed",
      last_delivery_error: String(sendErr).slice(0, 500),
      delivery_attempts: (inv.delivery_attempts || 0) + 1,
    }).eq("id", invitationId);

    await logActivity(supabase, inv.wedding_id, invitationId, "delivery_failed", String(sendErr).slice(0, 200), fingerprint);

    return jsonResponse({ error: "send_failed", message: "Failed to send invitation email" });
  }
}

async function handleSendBulk(
  supabase: SupabaseClient,
  invitationIds: string[],
  userId: string,
  fingerprint: string,
  resendApiKey: string | undefined,
  resendFromDomain: string | undefined,
): Promise<Response> {
  const results: Array<{ id: string; success: boolean; error?: string }> = [];
  let successCount = 0;
  let failCount = 0;

  // Validate all invitation IDs first
  if (invitationIds.length > 50) {
    return jsonResponse({ error: "too_many", message: "Maximum 50 invitations per bulk send" });
  }

  for (const invId of invitationIds) {
    try {
      const resp = await handleSendIndividual(supabase, invId, userId, fingerprint, resendApiKey, resendFromDomain);
      const body = await resp.json();
      if (body.success) {
        results.push({ id: invId, success: true });
        successCount++;
      } else {
        results.push({ id: invId, success: false, error: body.message || body.error });
        failCount++;
      }
    } catch (err) {
      results.push({ id: invId, success: false, error: String(err).slice(0, 200) });
      failCount++;
    }

    // Small delay between bulk sends to avoid hitting provider rate limits
    if (invitationIds.length > 1) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  return jsonResponse({
    success: true,
    total: invitationIds.length,
    sent: successCount,
    failed: failCount,
    results,
  });
}

async function handleResend(
  supabase: SupabaseClient,
  invitationId: string,
  userId: string,
  fingerprint: string,
  resendApiKey: string | undefined,
  resendFromDomain: string | undefined,
): Promise<Response> {
  // Revoke existing active tokens
  await supabase
    .from("invitation_access_tokens")
    .update({
      status: "revoked",
      revoked_at: new Date().toISOString(),
      revoked_by: userId,
      rotation_reason: "resend",
    })
    .eq("invitation_id", invitationId)
    .eq("status", "active");

  // Reset invitation to ready so it can be sent again
  await supabase.from("invitations").update({
    status: "ready",
    delivery_status: null,
    last_delivery_error: null,
    resend_email_id: null,
  }).eq("id", invitationId);

  await logActivity(supabase, (await supabase.from("invitations").select("wedding_id").eq("id", invitationId).maybeSingle()).data?.wedding_id || "00000000-0000-0000-0000-000000000000", invitationId, "token_rotated", "Previous tokens revoked for resend", fingerprint);

  // Now send again
  return await handleSendIndividual(supabase, invitationId, userId, fingerprint, resendApiKey, resendFromDomain);
}

async function handleGenerateToken(
  supabase: SupabaseClient,
  invitationId: string,
  userId: string,
): Promise<Response> {
  const { data: invitation } = await supabase
    .from("invitations")
    .select("wedding_id")
    .eq("id", invitationId)
    .maybeSingle();

  if (!invitation) {
    return jsonResponse({ error: "not_found", message: "Invitation not found" });
  }

  // Check for existing active token
  const { data: existingToken } = await supabase
    .from("invitation_access_tokens")
    .select("id, token_version, created_at")
    .eq("invitation_id", invitationId)
    .eq("status", "active")
    .maybeSingle();

  if (existingToken) {
    return jsonResponse({
      success: true,
      message: "Active token already exists",
      token_version: existingToken.token_version,
    });
  }

  // Generate new token
  const rawToken = generateToken();
  const tokenHash = await sha256Hex(rawToken);

  await supabase.from("invitation_access_tokens").insert({
    wedding_id: invitation.wedding_id,
    invitation_id: invitationId,
    token_hash: tokenHash,
    token_version: 1,
    status: "active",
    delivery_channel: "copy_link",
    created_by: userId,
    created_at: new Date().toISOString(),
  });

  const siteUrl = Deno.env.get("PUBLIC_SITE_URL") || "https://vowora.uk";
  const inviteUrl = `${siteUrl}/invite/${rawToken}`;

  return jsonResponse({
    success: true,
    message: "Token generated",
    invite_url: inviteUrl,
  });
}

async function logActivity(
  supabase: SupabaseClient,
  weddingId: string,
  invitationId: string,
  eventType: string,
  summary: string,
  fingerprint: string,
) {
  try {
    await supabase.from("invitation_access_activity").insert({
      wedding_id: weddingId,
      invitation_id: invitationId,
      actor_type: "couple",
      event_type: eventType,
      summary,
      security_metadata: { fingerprint },
    });
  } catch {
    // Best effort
  }
}

function jsonResponse(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}