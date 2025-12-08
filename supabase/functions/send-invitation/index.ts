import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import * as React from 'https://esm.sh/react@18.3.1';
import { renderToStaticMarkup } from 'https://esm.sh/react-dom@18.3.1/server';
import { Resend } from 'https://esm.sh/resend@4.0.0';
import { TeamInvitationEmail } from './_templates/team-invitation.tsx';

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;

    if (!user?.email) {
      throw new Error("User not authenticated");
    }

    const { teamId, email, role } = await req.json();

    if (!teamId || !email || !role) {
      return new Response(
        JSON.stringify({ error: "teamId, email et role sont requis" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Validation de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Format d'email invalide" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Vérifier que l'utilisateur est admin ou owner de cette team
    const { data: memberData, error: memberError } = await supabaseClient
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .single();

    console.log("User role check:", { userId: user.id, teamId, role: memberData?.role, error: memberError });

    const isAdmin = memberData?.role === 'owner' || memberData?.role === 'admin';

    if (memberError || !isAdmin) {
      console.error("Admin check failed:", memberError, "User role:", memberData?.role);
      return new Response(
        JSON.stringify({ error: "Vous devez être admin pour inviter des membres" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }

    // Vérifier si l'utilisateur essaie de s'inviter lui-même
    if (email === user.email) {
      return new Response(
        JSON.stringify({ error: "Vous ne pouvez pas vous inviter vous-même" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Vérifier si l'utilisateur est déjà membre de la team
    const { data: existingMember } = await supabaseClient
      .from('team_members')
      .select('id')
      .eq('team_id', teamId)
      .eq('user_id', (
        await supabaseClient
          .from('user_profiles')
          .select('user_id')
          .eq('email', email)
          .single()
      ).data?.user_id ?? '')
      .maybeSingle();

    if (existingMember) {
      return new Response(
        JSON.stringify({ error: "Cet utilisateur est déjà membre de l'équipe" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Vérifier s'il existe déjà une invitation pending pour cet email
    const { data: existingInvitation } = await supabaseClient
      .from('team_invitations')
      .select('id, token, role')
      .eq('team_id', teamId)
      .eq('email', email.toLowerCase().trim())
      .eq('status', 'pending')
      .maybeSingle();

    let invitation = existingInvitation;
    let isResend = false;

    if (existingInvitation) {
      // Une invitation existe déjà : on va juste renvoyer l'email
      console.log("Existing pending invitation found, will resend email:", existingInvitation.id);
      isResend = true;
    } else {
      // Créer une nouvelle invitation
      const { data: newInvitation, error: invitationError } = await supabaseClient
        .from('team_invitations')
        .insert({
          team_id: teamId,
          email: email.toLowerCase().trim(),
          role,
          invited_by: user.id,
        })
        .select()
        .single();

      if (invitationError) {
        console.error("Error creating invitation:", invitationError);
        throw invitationError;
      }

      invitation = newInvitation;
      console.log("New invitation created:", newInvitation.id);
    }

    // Générer le lien d'invitation
    const inviteUrl = `${req.headers.get("origin")}/invite?token=${invitation!.token}`;
    console.log("Invite URL generated:", inviteUrl, isResend ? "(resend)" : "(new)");

    // Récupérer le nom de la team et les infos de l'inviteur
    const { data: teamData } = await supabaseClient
      .from('teams')
      .select('name')
      .eq('id', teamId)
      .single();

    const { data: inviterData } = await supabaseClient
      .from('user_profiles')
      .select('full_name, email')
      .eq('user_id', user.id)
      .single();

    // Préparer les données pour l'email
    const teamName = teamData?.name || 'votre équipe';
    const inviterName = inviterData?.full_name || inviterData?.email || 'Un membre';
    console.log("Email data prepared:", { teamName, inviterName, role, targetEmail: email });

    // Générer le HTML de l'email avec React
    console.log("Starting React render...");
    let html: string;
    try {
      html = renderToStaticMarkup(
        React.createElement(TeamInvitationEmail, {
          inviteUrl,
          teamName,
          inviterName,
          role,
        })
      );
      console.log("React render successful, HTML length:", html.length);
    } catch (renderError) {
      console.error("React Email render failed:", renderError);
      throw new Error(`Email render failed: ${renderError}`);
    }

    // Envoyer l'email via Resend
    console.log("Sending email via Resend...");
    try {
      const { data: emailData, error: emailError } = await resend.emails.send({
        from: 'QuickQuick <noreply@quickie-video.com>',
        to: [email.toLowerCase().trim()],
        subject: `Invitation à rejoindre ${teamName} sur QuickQuick`,
        html,
      });

      if (emailError) {
        console.error('Resend error:', JSON.stringify(emailError));
        // On ne bloque pas si l'email échoue, on log juste l'erreur
      } else {
        console.log('Invitation email sent successfully:', { to: email, id: emailData?.id });
      }
    } catch (emailError) {
      console.error('Resend exception:', emailError);
      // On ne bloque pas si l'email échoue
    }

    return new Response(
      JSON.stringify({
        success: true,
        invitation,
        inviteUrl,
        message: "Invitation envoyée avec succès",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in send-invitation:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
