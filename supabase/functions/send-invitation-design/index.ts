import { unsubscribeUrl } from "../_shared/unsubscribe.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { edgeGuestCorsHeaders, sha256Hex } from "../_shared/guestAccess.ts";
interface SendRequest {
  invitationId: string;
  senderId: string;
  recipients: string[];
  subject: string;
  message: string;
  mode: "now" | "scheduled";
  scheduledFor: string | null;
  timezone: string;
  submissionId: string;
}

// ── Validation ──

const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
const MAX_RECIPIENTS = 100;
const MAX_EMAIL_LENGTH = 254;
const MAX_SUBJECT_LENGTH = 160;
const MAX_MESSAGE_LENGTH = 2000;

function isValidEmail(email: string): boolean {
  if (!email || email.length > MAX_EMAIL_LENGTH) return false;
  return EMAIL_REGEX.test(email);
}

function validateSendRequest(body: unknown): {
  valid: boolean;
  error?: string;
  request?: SendRequest;
} {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Invalid request body" };
  }

  const b = body as Record<string, unknown>;

  const invitationId = typeof b.invitationId === "string" ? b.invitationId : "";
  const senderId = typeof b.senderId === "string" ? b.senderId : "";
  const recipients = Array.isArray(b.recipients) ? b.recipients : [];
  const subject = typeof b.subject === "string" ? b.subject.trim() : "";
  const message = typeof b.message === "string" ? b.message : "";
  const mode = b.mode === "now" || b.mode === "scheduled" ? b.mode : "";
  const scheduledFor =
    typeof b.scheduledFor === "string" && b.scheduledFor
      ? b.scheduledFor
      : null;
  const timezone = typeof b.timezone === "string" ? b.timezone : "";
  const submissionId = typeof b.submissionId === "string" ? b.submissionId : "";

  if (!invitationId) return { valid: false, error: "Missing invitationId" };
  if (!senderId) return { valid: false, error: "Missing senderId" };
  if (!/^[a-zA-Z0-9-]{8,80}$/.test(submissionId))
    return { valid: false, error: "Missing submissionId" };
  if (!subject) return { valid: false, error: "Subject is required" };
  if (subject.length > MAX_SUBJECT_LENGTH)
    return {
      valid: false,
      error: `Subject exceeds ${MAX_SUBJECT_LENGTH} characters`,
    };
  if (message.length > MAX_MESSAGE_LENGTH)
    return {
      valid: false,
      error: `Message exceeds ${MAX_MESSAGE_LENGTH} characters`,
    };
  if (!mode) return { valid: false, error: "Invalid mode" };

  // Validate recipients
  const validRecipients: string[] = [];
  for (const r of recipients) {
    if (typeof r !== "string") continue;
    const normalized = r.trim().toLowerCase();
    if (!normalized) continue;
    if (!isValidEmail(normalized)) continue;
    validRecipients.push(normalized);
  }

  // Deduplicate
  const unique = [...new Set(validRecipients)];

  if (unique.length === 0)
    return { valid: false, error: "No valid recipients" };
  if (unique.length > MAX_RECIPIENTS)
    return {
      valid: false,
      error: `Maximum ${MAX_RECIPIENTS} recipients allowed`,
    };

  // Validate schedule
  if (mode === "scheduled") {
    if (!scheduledFor)
      return { valid: false, error: "Scheduled time is required" };
    const scheduledDate = new Date(scheduledFor);
    if (isNaN(scheduledDate.getTime()))
      return { valid: false, error: "Invalid scheduled date" };

    const now = new Date();
    const minTime = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes from now
    if (scheduledDate < minTime)
      return {
        valid: false,
        error: "Scheduled time must be at least 5 minutes in the future",
      };

    const maxTime = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 12 months
    if (scheduledDate > maxTime)
      return { valid: false, error: "Cannot schedule more than 30 days ahead" };
  }

  // Validate timezone
  if (!timezone) return { valid: false, error: "Timezone is required" };
  try {
    Intl.DateTimeFormat("en-US", { timeZone: timezone });
  } catch {
    return { valid: false, error: "Invalid timezone" };
  }

  return {
    valid: true,
    request: {
      invitationId,
      senderId,
      recipients: unique,
      subject,
      message,
      mode,
      scheduledFor,
      timezone,
      submissionId,
    },
  };
}

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
Deno.serve(async (req: Request) => {
  const headers = {
    ...edgeGuestCorsHeaders(req),
    "Content-Type": "application/json",
  };
  const reply = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers });
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  try {
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const db = createClient(Deno.env.get("SUPABASE_URL") || "", serviceKey);
    const {
      data: { user },
      error: authError,
    } = await db.auth.getUser(
      (req.headers.get("authorization") || "").replace(/^Bearer /, ""),
    );
    if (authError || !user)
      return reply({ accepted: false, error: "Please sign in again" }, 401);
    const validation = validateSendRequest(await req.json());
    if (!validation.request)
      return reply({ accepted: false, error: validation.error }, 400);
    const request = validation.request;
    const { data: design, error: designError } = await db
      .from("invitation_designs")
      .select("id,wedding_id,title")
      .eq("id", request.invitationId)
      .single();
    if (designError || !design)
      return reply(
        { accepted: false, error: "Invitation design unavailable" },
        404,
      );
    const { data: member } = await db
      .from("wedding_members")
      .select("role")
      .eq("wedding_id", design.wedding_id)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();
    if (!member || !["owner", "partner", "planner"].includes(member.role))
      return reply(
        { accepted: false, error: "Your role cannot send invitations" },
        403,
      );
    const { data: sender } = await db
      .from("verified_senders")
      .select("email,display_name")
      .eq("id", request.senderId)
      .eq("wedding_id", design.wedding_id)
      .eq("is_verified", true)
      .maybeSingle();
    if (!sender)
      return reply(
        { accepted: false, error: "Choose a verified sender for this wedding" },
        400,
      );
    const apiKey = Deno.env.get("RESEND_API_KEY");
    const site = new URL(
      Deno.env.get("PUBLIC_SITE_URL") || "https://vowora.uk",
    );
    if (!apiKey || site.protocol !== "https:")
      return reply(
        { accepted: false, error: "Invitation sending is not configured" },
        503,
      );
    const { data: guests, error: guestError } = await db
      .from("guests")
      .select("id,email,full_name")
      .eq("wedding_id", design.wedding_id)
      .is("archived_at", null)
      .in("email", request.recipients);
    if (guestError) throw guestError;
    const sendLogIds: string[] = [],
      guestIds: string[] = [],
      rejectionReasons: string[] = [];
    let acceptedCount = 0;
    const signingKey = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(
        Deno.env.get("INVITATION_LINK_SECRET") || serviceKey,
      ),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    for (const email of request.recipients) {
      const matches = (guests || []).filter(
        (g) => g.email?.toLowerCase() === email,
      );
      if (matches.length !== 1) {
        rejectionReasons.push(
          `${email}: add a unique guest record with this email before sending.`,
        );
        continue;
      }
      const guest = matches[0];
      try {
        const rawToken = Array.from(
          new Uint8Array(
            await crypto.subtle.sign(
              "HMAC",
              signingKey,
              new TextEncoder().encode(
                `vowora-invitation/v1/${design.wedding_id}/${request.submissionId}/${guest.id}`,
              ),
            ),
          ),
          (b) => b.toString(16).padStart(2, "0"),
        ).join("");
        const { data: prepared, error: prepareError } = await db.rpc(
          "prepare_design_invitation_send",
          {
            p_design: design.id,
            p_guest: guest.id,
            p_submission: request.submissionId,
            p_token_hash: await sha256Hex(rawToken),
            p_actor: user.id,
          },
        );
        if (prepareError) throw prepareError;
        const log = prepared as {
          log_id: string;
          invitation_id: string;
          status: string;
          created_at: string;
          resend_email_id: string | null;
        };
        sendLogIds.push(log.log_id);
        guestIds.push(guest.id);
        if (log.resend_email_id) {
          acceptedCount++;
          continue;
        }
        // The provider's idempotency window is 24 hours. Never retry an uncertain old send with a fresh key.
        if (
          Date.now() - new Date(log.created_at).getTime() >
          23 * 60 * 60 * 1000
        )
          throw new Error(
            "This send is too old to retry safely. Check its delivery status before making a new send.",
          );
        const link = `${site.origin}/invite/${rawToken}`;
        const preferences = await unsubscribeUrl(design.wedding_id, email);
        const payload = {
          from: `${(sender.display_name || "Wedding invitation").replace(/[<>\r\n]/g, "")} <${sender.email}>`,
          to: [email],
          subject: request.subject,
          text: `${request.message}\n\nView your invitation and RSVP: ${link}\nEmail preferences: ${preferences}`,
          html: `<p>${escapeHtml(request.message).replace(/\n/g, "<br>")}</p><p><a href="${link}">View your invitation and RSVP</a></p><p><a href="${escapeHtml(preferences)}">Stop wedding emails</a></p>`,
          headers: { "List-Unsubscribe": `<${preferences}>` },
          ...(request.mode === "scheduled"
            ? { scheduled_at: request.scheduledFor }
            : {}),
        };
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "Idempotency-Key": `invitation/${log.log_id}`,
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(15000),
        });
        const result = await response.json();
        if (!response.ok || !result.id)
          throw new Error(
            result.message || "Email provider did not accept this invitation",
          );
        const { error: logError } = await db
          .from("send_log")
          .update({
            status: request.mode === "scheduled" ? "scheduled" : "sent",
            resend_email_id: result.id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", log.log_id);
        if (logError) throw logError;
        const { error: invError } = await db
          .from("invitations")
          .update({
            status: "sent",
            delivery_status:
              request.mode === "scheduled" ? "scheduled" : "sent",
            delivery_method: "email",
          })
          .eq("id", log.invitation_id);
        if (invError) throw invError;
        acceptedCount++;
      } catch (error) {
        rejectionReasons.push(
          `${email}: ${error instanceof Error ? error.message : "Sending failed"}`,
        );
      }
    }
    return reply(
      {
        accepted: acceptedCount > 0,
        submissionId: request.submissionId,
        sendLogIds,
        guestIds,
        acceptedCount,
        rejectedCount: request.recipients.length - acceptedCount,
        rejectionReasons,
        ...(!acceptedCount
          ? { error: rejectionReasons[0] || "No invitations accepted" }
          : {}),
      },
      acceptedCount ? 200 : 422,
    );
  } catch (error) {
    console.error("Invitation send failed", error);
    return reply(
      {
        accepted: false,
        error: "Invitation sending failed. Please retry the same submission.",
      },
      500,
    );
  }
});
