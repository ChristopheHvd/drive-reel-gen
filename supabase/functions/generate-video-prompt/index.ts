import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authentifier l'utilisateur
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Non authentifié' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Authentification invalide' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { imageId } = await req.json();

    if (!imageId) {
      return new Response(JSON.stringify({ error: 'imageId requis' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Récupérer le team_id
    const { data: teamMember } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', user.id)
      .single();

    if (!teamMember) {
      return new Response(JSON.stringify({ error: 'Équipe non trouvée' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Récupérer l'image
    const { data: image, error: imageError } = await supabase
      .from('images')
      .select('*')
      .eq('id', imageId)
      .eq('team_id', teamMember.team_id)
      .single();

    if (imageError || !image) {
      return new Response(JSON.stringify({ error: 'Image non trouvée' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Générer signed URL
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('team-images')
      .createSignedUrl(image.storage_path, 3600);

    if (signedUrlError || !signedUrlData) {
      return new Response(JSON.stringify({ error: 'Impossible de générer l\'URL de l\'image' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Récupérer brand profile (optionnel)
    const { data: brandProfile } = await supabase
      .from('brand_profiles')
      .select('*')
      .eq('team_id', teamMember.team_id)
      .single();

    const brandContext = brandProfile 
      ? `Marque: ${brandProfile.company_name}. ${brandProfile.business_description || ''}` 
      : '';

    console.log('Calling Lovable AI for prompt generation...');

    // Appel Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'Tu es un expert en marketing Instagram. Génère un prompt court (max 150 caractères) et percutant pour créer une vidéo Instagram Reels dynamique et engageante basée sur l\'image fournie.'
          },
          {
            role: 'user',
            content: [
              { 
                type: 'text', 
                text: `Analyse cette image et propose un prompt pour générer une vidéo Instagram. ${brandContext}` 
              },
              { 
                type: 'image_url', 
                image_url: { url: signedUrlData.signedUrl } 
              }
            ]
          }
        ]
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Lovable AI error:', errorText);
      
      // Fallback sur prompt par défaut
      return new Response(
        JSON.stringify({ 
          prompt: "Génère une vidéo sympa, très dynamique, respectant les codes d'Instagram",
          fallback: true
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const generatedPrompt = aiData.choices?.[0]?.message?.content;

    if (!generatedPrompt) {
      console.error('No prompt in AI response');
      return new Response(
        JSON.stringify({ 
          prompt: "Génère une vidéo sympa, très dynamique, respectant les codes d'Instagram",
          fallback: true
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generated prompt:', generatedPrompt);

    return new Response(
      JSON.stringify({ prompt: generatedPrompt.trim() }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    
    // Fallback sur prompt par défaut en cas d'erreur
    return new Response(
      JSON.stringify({ 
        prompt: "Génère une vidéo sympa, très dynamique, respectant les codes d'Instagram",
        fallback: true,
        error: (error as Error).message
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
