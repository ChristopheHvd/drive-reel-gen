import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import * as React from 'https://esm.sh/react@18.3.1';
import { Resend } from 'https://esm.sh/resend@4.0.0';
import { renderAsync } from 'https://esm.sh/@react-email/components@0.0.22';
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
      .select('id, status')
      .eq('team_id', teamId)
      .eq('email', email)
      .eq('status', 'pending')
      .maybeSingle();

    if (existingInvitation) {
      return new Response(
        JSON.stringify({ error: "Une invitation est déjà en attente pour cet email" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Créer l'invitation
    const { data: invitation, error: invitationError } = await supabaseClient
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

    console.log("Invitation created:", invitation.id);

    // Générer le lien d'invitation
    const inviteUrl = `${req.headers.get("origin")}/invite?token=${invitation.token}`;

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

    // Générer le HTML de l'email avec React Email
    const html = await renderAsync(
      React.createElement(TeamInvitationEmail, {
        inviteUrl,
        teamName,
        inviterName,
        role,
      })
    );

    // Envoyer l'email via Resend
    try {
      const { error: emailError } = await resend.emails.send({
        from: 'QuickQuick <onboarding@resend.dev>',
        to: [email.toLowerCase().trim()],
        subject: `Invitation à rejoindre ${teamName} sur QuickQuick`,
        html,
      });

      if (emailError) {
        console.error('Error sending email:', emailError);
        // On ne bloque pas si l'email échoue, on log juste l'erreur
      } else {
        console.log('Invitation email sent to:', email);
      }
    } catch (emailError) {
      console.error('Error sending email:', emailError);
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
