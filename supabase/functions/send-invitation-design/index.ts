import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store, no-cache, must-revalidate",
  "Pragma": "no-cache",
};

// ── Types ──

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

interface SendResult {
  accepted: boolean;
  submissionId: string;
  sendLogIds: string[];
  guestIds: string[];
  acceptedCount: number;
  rejectedCount: number;
  rejectionReasons: string[];
  error?: string;
}

interface VerifiedSenderRow {
  id: string;
  user_id: string;
  email: string;
  display_name: string | null;
  is_verified: boolean;
}

interface InvitationDesignRow {
  id: string;
  user_id: string;
  title: string;
  document: unknown;
}

interface InvitationGuestRow {
  id: string;
  invitation_id: string;
  name: string | null;
  email: string | null;
}

// ── Validation ──

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
const MAX_RECIPIENTS = 100;
const MAX_EMAIL_LENGTH = 254;
const MAX_SUBJECT_LENGTH = 160;
const MAX_MESSAGE_LENGTH = 2000;

function isValidEmail(email: string): boolean {
  if (!email || email.length > MAX_EMAIL_LENGTH) return false;
  return EMAIL_REGEX.test(email);
}

function validateSendRequest(body: unknown): { valid: boolean; error?: string; request?: SendRequest } {
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
  const scheduledFor = typeof b.scheduledFor === "string" && b.scheduledFor ? b.scheduledFor : null;
  const timezone = typeof b.timezone === "string" ? b.timezone : "";
  const submissionId = typeof b.submissionId === "string" ? b.submissionId : "";

  if (!invitationId) return { valid: false, error: "Missing invitationId" };
  if (!senderId) return { valid: false, error: "Missing senderId" };
  if (!submissionId) return { valid: false, error: "Missing submissionId" };
  if (!subject) return { valid: false, error: "Subject is required" };
  if (subject.length > MAX_SUBJECT_LENGTH) return { valid: false, error: `Subject exceeds ${MAX_SUBJECT_LENGTH} characters` };
  if (message.length > MAX_MESSAGE_LENGTH) return { valid: false, error: `Message exceeds ${MAX_MESSAGE_LENGTH} characters` };
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

  if (unique.length === 0) return { valid: false, error: "No valid recipients" };
  if (unique.length > MAX_RECIPIENTS) return { valid: false, error: `Maximum ${MAX_RECIPIENTS} recipients allowed` };

  // Validate schedule
  if (mode === "scheduled") {
    if (!scheduledFor) return { valid: false, error: "Scheduled time is required" };
    const scheduledDate = new Date(scheduledFor);
    if (isNaN(scheduledDate.getTime())) return { valid: false, error: "Invalid scheduled date" };

    const now = new Date();
    const minTime = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes from now
    if (scheduledDate < minTime) return { valid: false, error: "Scheduled time must be at least 5 minutes in the future" };

    const maxTime = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 12 months
    if (scheduledDate > maxTime) return { valid: false, error: "Cannot schedule more than 12 months ahead" };
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

// ── Guest upsert ──

async function resolveGuestForEmail(
  supabase: ReturnType<typeof createClient>,
  invitationId: string,
  email: string,
): Promise<{ id: string; created: boolean }> {
  const normalized = email.trim().toLowerCase();

  // Try to find existing guest
  const { data: existing } = await supabase
    .from("invitation_guests")
    .select("id")
    .eq("invitation_id", invitationId)
    .eq("email", normalized)
    .maybeSingle();

  if (existing) {
    return { id: existing.id, created: false };
  }

  // Create new guest
  const { data: created, error: createErr } = await supabase
    .from("invitation_guests")
    .insert({
      invitation_id: invitationId,
      email: normalized,
      rsvp_status: "pending",
      plus_one: false,
    })
    .select("id")
    .single();

  if (createErr) {
    // Race condition — another request may have created it between our select and insert
    const { data: raceCheck } = await supabase
      .from("invitation_guests")
      .select("id")
      .eq("invitation_id", invitationId)
      .eq("email", normalized)
      .maybeSingle();

    if (raceCheck) {
      return { id: raceCheck.id, created: false };
    }

    throw new Error(`Failed to create guest: ${createErr.message}`);
  }

  return { id: created.id, created: true };
}

// ── Create send_log row ──

async function createSendLog(
  supabase: ReturnType<typeof createClient>,
  invitationId: string,
  guestId: string,
  channel: string,
  submissionId: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("send_log")
    .insert({
      invitation_id: invitationId,
      guest_id: guestId,
      channel,
      status: "queued",
      submission_id: submissionId,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to create send log: ${error.message}`);
  }

  return data.id;
}

// ── Main handler ──

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("VITE_PUBLIC_SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ── Auth ──
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Parse & validate body ──
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const validation = validateSendRequest(body);
    if (!validation.valid || !validation.request) {
      return new Response(JSON.stringify({ accepted: false, error: validation.error }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const request = validation.request;

    // ── Load invitation design ──
    const { data: design, error: designErr } = await supabase
      .from("invitation_designs")
      .select("id, user_id, title")
      .eq("id", request.invitationId)
      .maybeSingle();

    if (designErr || !design) {
      return new Response(JSON.stringify({ accepted: false, error: "Invitation not found or unavailable" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const designRow = design as InvitationDesignRow;

    // Verify ownership
    if (designRow.user_id !== user.id) {
      return new Response(JSON.stringify({ accepted: false, error: "Invitation not found or unavailable" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Verify sender ──
    const { data: sender, error: senderErr } = await supabase
      .from("verified_senders")
      .select("id, user_id, email, display_name, is_verified")
      .eq("id", request.senderId)
      .eq("user_id", user.id)
      .eq("is_verified", true)
      .maybeSingle();

    if (senderErr || !sender) {
      return new Response(JSON.stringify({ accepted: false, error: "Sender not found or not verified" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const senderRow = sender as VerifiedSenderRow;

    // ── Check n8n webhook URL ──
    const n8nWebhookUrl = Deno.env.get("N8N_SEND_WEBHOOK_URL");

    if (!n8nWebhookUrl) {
      return new Response(JSON.stringify({
        accepted: false,
        error: "Invitation sending is not configured",
        deploymentTodo: "Add N8N_SEND_WEBHOOK_URL to Supabase secrets",
      }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate n8n URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(n8nWebhookUrl);
    } catch {
      return new Response(JSON.stringify({ accepted: false, error: "Send service misconfigured" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (parsedUrl.protocol !== "https:") {
      const isProd = !n8nWebhookUrl.includes("localhost") && !n8nWebhookUrl.includes("127.0.0.1");
      if (isProd) {
        return new Response(JSON.stringify({ accepted: false, error: "Send service misconfigured: HTTPS required in production" }), {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ── Guest upsert ──
    const guestResults: Array<{ guestId: string; email: string; created: boolean }> = [];
    const guestErrors: string[] = [];

    for (const email of request.recipients) {
      try {
        const result = await resolveGuestForEmail(supabase, request.invitationId, email);
        guestResults.push({ guestId: result.id, email, created: result.created });
      } catch (err) {
        guestErrors.push(`${email}: ${err instanceof Error ? err.message : "Unknown error"}`);
      }
    }

    if (guestResults.length === 0) {
      return new Response(JSON.stringify({
        accepted: false,
        error: "Failed to prepare guests",
        rejectionReasons: guestErrors,
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Create send_log rows ──
    const sendLogIds: string[] = [];
    const logErrors: string[] = [];

    for (const gr of guestResults) {
      try {
        const logId = await createSendLog(supabase, request.invitationId, gr.guestId, "email", request.submissionId);
        sendLogIds.push(logId);
      } catch (err) {
        logErrors.push(`${gr.email}: ${err instanceof Error ? err.message : "Unknown error"}`);
      }
    }

    if (sendLogIds.length === 0) {
      return new Response(JSON.stringify({
        accepted: false,
        error: "Failed to create send logs",
        rejectionReasons: logErrors,
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Build n8n payload ──
    const n8nPayload = {
      event: "invitation.send.requested",
      version: 1,
      submissionId: request.submissionId,
      invitationId: request.invitationId,
      sender: {
        id: senderRow.id,
        email: senderRow.email,
        displayName: senderRow.display_name || senderRow.email,
      },
      recipients: guestResults.map((gr, i) => ({
        guestId: gr.guestId,
        email: gr.email,
        sendLogId: sendLogIds[i],
      })),
      subject: request.subject,
      message: request.message,
      delivery: {
        mode: request.mode,
        scheduledFor: request.scheduledFor,
        timezone: request.timezone,
      },
    };

    // ── Call n8n ──
    let n8nAccepted = false;
    let n8nError: string | undefined;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const n8nRes = await fetch(n8nWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(n8nPayload),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!n8nRes.ok) {
        n8nError = `Webhook returned status ${n8nRes.status}`;
      } else {
        const contentType = n8nRes.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const ack = await n8nRes.json();
          if (ack && typeof ack === "object" && ack.accepted === true && ack.submissionId === request.submissionId) {
            n8nAccepted = true;
          } else {
            n8nError = "Webhook did not confirm acceptance";
          }
        } else {
          n8nError = "Webhook returned non-JSON response";
        }
      }
    } catch (err) {
      n8nError = err instanceof Error ? err.message : "Webhook request failed";
    }

    // ── Build response ──
    const result: SendResult = {
      accepted: n8nAccepted,
      submissionId: request.submissionId,
      sendLogIds,
      guestIds: guestResults.map((g) => g.guestId),
      acceptedCount: n8nAccepted ? guestResults.length : 0,
      rejectedCount: n8nAccepted ? 0 : guestResults.length,
      rejectionReasons: [
        ...guestErrors,
        ...logErrors,
        ...(n8nError ? [n8nError] : []),
      ],
    };

    return new Response(JSON.stringify(result), {
      status: n8nAccepted ? 200 : 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-invitation-design error:", err);
    return new Response(JSON.stringify({
      accepted: false,
      error: err instanceof Error ? err.message : "Internal server error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
