import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@3.2.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");

    if (!token) {
      return new Response(JSON.stringify({ error: "Missing auth token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid auth token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action } = body;

    if (action === "invite") {
      const { weddingId, email, role, token: inviteToken } = body;

      if (!weddingId || !email || !role || !inviteToken) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify the requester can manage members
      const { data: membership } = await supabaseClient
        .from("wedding_members")
        .select("role")
        .eq("wedding_id", weddingId)
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (!membership || !["owner", "partner"].includes(membership.role)) {
        return new Response(JSON.stringify({ error: "Not authorized to invite members" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get wedding and profile details for the email
      const [{ data: wedding }, { data: profile }] = await Promise.all([
        supabaseClient
          .from("weddings")
          .select("title, partner_one_name, partner_two_name, slug")
          .eq("id", weddingId)
          .single(),
        supabaseClient
          .from("profiles")
          .select("first_name, last_name, display_name")
          .eq("id", user.id)
          .single(),
      ]);

      const inviterName = profile
        ? (profile.display_name || `${profile.first_name || ""} ${profile.last_name || ""}`.trim())
        : "The wedding couple";

      const weddingName = wedding
        ? `${wedding.partner_one_name} & ${wedding.partner_two_name}`
        : wedding?.title || "the wedding";

      // Try to send email via Resend
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      const resendFromDomain = Deno.env.get("RESEND_FROM_DOMAIN");

      if (resendApiKey && resendFromDomain) {
        const resend = new Resend(resendApiKey);
        const acceptUrl = `${req.headers.get("origin") || ""}/invite/${inviteToken}`;

        try {
          await resend.emails.send({
            from: `Vowora <noreply@${resendFromDomain}>`,
            to: [email],
            subject: `${inviterName} invited you to collaborate on ${weddingName}`,
            html: `
              <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                <h1 style="color: #c4846d; font-size: 28px; margin-bottom: 24px;">You're invited!</h1>
                <p style="font-size: 16px; color: #333; line-height: 1.6;">
                  ${inviterName} has invited you to collaborate on <strong>${weddingName}</strong> as a <strong>${role}</strong>.
                </p>
                <p style="font-size: 16px; color: #333; line-height: 1.6;">
                  Vowora helps couples plan their perfect wedding — manage guests, seating, budget, travel, and more together.
                </p>
                <div style="margin: 32px 0;">
                  <a href="${acceptUrl}" style="background: #c4846d; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-size: 16px; display: inline-block;">
                    Accept Invitation
                  </a>
                </div>
                <p style="font-size: 13px; color: #888; margin-top: 40px;">
                  This invitation expires in 7 days. You'll need to create a Vowora account if you don't have one.
                </p>
              </div>
            `,
          });
        } catch (emailErr) {
          console.error("Resend error:", emailErr);
          // Don't fail the whole request — the invitation exists in the DB
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "accept_invite") {
      const { token: inviteToken } = body;

      if (!inviteToken) {
        return new Response(JSON.stringify({ error: "Missing invitation token" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Look up the invitation
      const { data: invitation, error: inviteErr } = await supabaseClient
        .from("wedding_member_invitations")
        .select("*")
        .eq("token", inviteToken)
        .eq("status", "pending")
        .maybeSingle();

      if (inviteErr || !invitation) {
        return new Response(JSON.stringify({ error: "Invalid or expired invitation" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check expiry
      if (new Date(invitation.expires_at) < new Date()) {
        await supabaseClient
          .from("wedding_member_invitations")
          .update({ status: "expired", updated_at: new Date().toISOString() })
          .eq("id", invitation.id);

        return new Response(JSON.stringify({ error: "This invitation has expired" }), {
          status: 410,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Add the user as a wedding member
      const { error: insertErr } = await supabaseClient
        .from("wedding_members")
        .insert({
          wedding_id: invitation.wedding_id,
          user_id: user.id,
          role: invitation.role,
          status: "active",
          invited_by: invitation.invited_by,
          invited_email: invitation.invited_email,
          accepted_at: new Date().toISOString(),
        });

      if (insertErr) {
        // If already a member (unique constraint), just mark invitation as accepted
        if (insertErr.code === "23505") {
          await supabaseClient
            .from("wedding_member_invitations")
            .update({ status: "accepted", accepted_by: user.id, accepted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
            .eq("id", invitation.id);
        } else {
          throw insertErr;
        }
      } else {
        // Mark invitation as accepted
        await supabaseClient
          .from("wedding_member_invitations")
          .update({ status: "accepted", accepted_by: user.id, accepted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq("id", invitation.id);
      }

      return new Response(JSON.stringify({ success: true, weddingId: invitation.wedding_id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("settings-invite-member error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});