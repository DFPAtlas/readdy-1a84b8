import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { Resend } from "npm:resend@6.13.0";
import {
  sha256Hex,
  newGuestSessionSecret,
  edgeGuestCorsHeaders,
} from "../_shared/guestAccess.ts";
const html = (value: unknown) =>
  String(value || "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
Deno.serve(async (req) => {
  const headers = {
    ...edgeGuestCorsHeaders(req),
    "Content-Type": "application/json",
  };
  const reply = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers });
  if (req.method === "OPTIONS") return reply({});
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  try {
    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const auth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const {
      data: { user },
      error,
    } = await auth.auth.getUser(
      (req.headers.get("Authorization") || "").replace(/^Bearer /i, ""),
    );
    if (error || !user) return reply({ error: "Sign in to continue." }, 401);
    const body = await req.json();
    if (body.action === "accept_invite") {
      if (
        typeof body.token !== "string" ||
        body.token.length < 32 ||
        body.token.length > 128
      )
        return reply({ error: "Invalid invitation." }, 400);
      const { data, error: acceptError } = await db.rpc(
        "accept_wedding_member_invitation",
        { p_token_hash: await sha256Hex(body.token), p_user_id: user.id },
      );
      if (acceptError)
        return reply(
          {
            error:
              "This invitation is unavailable, expired, or was sent to another email address.",
          },
          403,
        );
      return reply({ success: true, weddingId: data });
    }
    if (body.action !== "invite" && body.action !== "resend")
      return reply({ error: "Unknown action." }, 400);
    const { weddingId } = body;
    const { data: membership } = await db
      .from("wedding_members")
      .select("role")
      .eq("wedding_id", weddingId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();
    if (membership?.role !== "owner")
      return reply(
        {
          error: "Only the wedding owner can manage collaborator invitations.",
        },
        403,
      );
    let email = String(body.email || "")
      .trim()
      .toLowerCase();
    let role = body.role;
    let invitationId = body.invitationId;
    if (body.action === "resend") {
      const { data: invitation } = await db
        .from("wedding_member_invitations")
        .select("id, invited_email, role, status")
        .eq("id", invitationId)
        .eq("wedding_id", weddingId)
        .maybeSingle();
      if (!invitation || !["pending", "expired"].includes(invitation.status))
        return reply({ error: "Invitation cannot be resent." }, 400);
      email = invitation.invited_email;
      role = invitation.role;
    }
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      email.length > 254 ||
      !["partner", "planner", "collaborator", "viewer"].includes(role)
    )
      return reply(
        { error: "Enter a valid email address and collaborator role." },
        400,
      );
    const token = newGuestSessionSecret();
    const token_hash = await sha256Hex(token);
    const payload = {
      wedding_id: weddingId,
      email,
      invited_email: email,
      invited_by: user.id,
      role,
      token_hash,
      status: "pending",
      expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    };
    if (body.action === "resend") {
      const { error: saveError } = await db
        .from("wedding_member_invitations")
        .update(payload)
        .eq("id", invitationId)
        .eq("wedding_id", weddingId);
      if (saveError) throw saveError;
    } else {
      const { data: existing } = await db
        .from("wedding_member_invitations")
        .select("id")
        .eq("wedding_id", weddingId)
        .eq("invited_email", email)
        .eq("status", "pending")
        .maybeSingle();
      if (existing)
        return reply(
          { error: "An invitation is already pending for this email address." },
          409,
        );
      const { data, error: saveError } = await db
        .from("wedding_member_invitations")
        .insert(payload)
        .select("id")
        .single();
      if (saveError) throw saveError;
      invitationId = data.id;
    }
    const { data: wedding } = await db
      .from("weddings")
      .select("title")
      .eq("id", weddingId)
      .single();
    const site = new URL(
      Deno.env.get("PUBLIC_SITE_URL") || "https://vowora.uk",
    );
    const joinUrl = new URL(`/join/${token}`, site).toString();
    const apiKey = Deno.env.get("RESEND_API_KEY");
    const domain = Deno.env.get("RESEND_FROM_DOMAIN");
    let delivered = false;
    if (apiKey && domain) {
      const { error: deliveryError } = await new Resend(apiKey).emails.send({
        from: `Vowora <noreply@${domain}>`,
        to: [email],
        subject: `You're invited to ${wedding?.title || "a wedding"} on Vowora`,
        html: `<h1>You're invited</h1><p>Join ${html(wedding?.title)} as a ${html(role)}.</p><p><a href="${html(joinUrl)}">Accept invitation</a></p><p>Sign in with ${html(email)}. This invitation expires in seven days.</p>`,
      });
      delivered = !deliveryError;
    }
    return reply({ success: true, invitationId, delivered, joinUrl });
  } catch {
    return reply(
      { error: "The invitation could not be processed. Please retry." },
      500,
    );
  }
});
