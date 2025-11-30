import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

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
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
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

    // Vérifier que l'utilisateur est admin de cette team
    const { data: adminCheck, error: adminError } = await supabaseClient
      .rpc('is_team_admin', { _team_id: teamId });

    if (adminError || !adminCheck) {
      console.error("Admin check failed:", adminError);
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

    // TODO: Envoyer l'email d'invitation
    // Pour l'instant, on retourne juste le lien d'invitation
    const inviteUrl = `${req.headers.get("origin")}/invite?token=${invitation.token}`;

    return new Response(
      JSON.stringify({
        success: true,
        invitation,
        inviteUrl,
        message: "Invitation créée avec succès",
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
