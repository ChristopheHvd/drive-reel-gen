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

    const { imageId, promptType = 'situation' } = await req.json();

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

    // Adapter le system prompt selon le type
    let systemPrompt = '';
    let userPrompt = '';

    switch (promptType) {
      case 'situation':
        systemPrompt = `Tu es un expert en génération vidéo IA. Analyse l'image et génère un prompt de 200-250 caractères en FRANÇAIS pour créer une vidéo promotionnelle.

Le prompt doit UNIQUEMENT contenir des instructions techniques visuelles :
- Mouvements de caméra (zoom lent, travelling, rotation, plan rapproché)
- Actions dans la scène (main qui prend le produit, utilisation naturelle, interaction)
- Éclairage (lumière naturelle, douce, chaude, dramatique)
- Ambiance et rythme (mouvement fluide, transition douce, dynamique)

IMPORTANT : 
- PAS de hashtags ni de mots marketing
- UNIQUEMENT des instructions de mouvement et visuelles
- Répondre en FRANÇAIS

Exemple : "Travelling avant lent vers le produit sur une table en bois. Une main le saisit délicatement et le fait tourner. Lumière naturelle chaude venant de la gauche. Mouvement fluide et élégant."`;
        userPrompt = `Analyse cette image et génère un prompt technique pour une vidéo en situation d'utilisation. ${brandContext}`;
        break;
      case 'product':
        systemPrompt = `Tu es un expert en génération vidéo IA. Analyse l'image et génère un prompt de 200-250 caractères en FRANÇAIS pour une vidéo de mise en avant produit premium.

Le prompt doit UNIQUEMENT contenir des instructions techniques visuelles :
- Mouvements de caméra (rotation 360°, zoom sur détails, plan orbital)
- Mise en valeur (reflets, textures, matériaux, finitions)
- Éclairage studio (éclairage trois points, contre-jour, softbox)
- Style cinématographique (élégant, professionnel, premium)

IMPORTANT : 
- PAS de hashtags ni de mots marketing
- UNIQUEMENT des instructions de mouvement et visuelles
- Répondre en FRANÇAIS

Exemple : "Rotation 360° lente du produit sur surface noire réfléchissante. Éclairage studio avec contre-jour doux sur les contours. Mouvement cinématique fluide, ambiance premium."`;
        userPrompt = `Analyse cette image et génère un prompt technique pour une mise en avant produit professionnelle. ${brandContext}`;
        break;
      case 'testimonial':
        systemPrompt = `Tu es un expert en génération vidéo IA. Analyse l'image et génère un prompt de 200-250 caractères en FRANÇAIS pour une vidéo dynamique style témoignage/unboxing.

Le prompt doit UNIQUEMENT contenir des instructions techniques visuelles :
- Mouvements de caméra (caméra portée, zoom rapide, transitions)
- Actions humaines (mains qui déballent, réaction, présentation)
- Éclairage naturel (lumière du jour, ambiance authentique, lifestyle)
- Dynamisme (rythme rapide, énergie, transitions fluides)

IMPORTANT : 
- PAS de hashtags ni de mots marketing
- UNIQUEMENT des instructions de mouvement et visuelles
- Répondre en FRANÇAIS

Exemple : "Mains qui déballent le produit avec enthousiasme. Zoom rapide sur la révélation du produit. Lumière naturelle du jour, ambiance lifestyle authentique. Énergie dynamique avec transitions fluides."`;
        userPrompt = `Analyse cette image et génère un prompt technique pour une vidéo témoignage/unboxing dynamique. ${brandContext}`;
        break;
      default:
        systemPrompt = `Tu es un expert en génération vidéo IA. Analyse l'image et génère un prompt de 200-250 caractères en FRANÇAIS pour créer une vidéo Instagram Reels dynamique.

Le prompt doit contenir des instructions visuelles claires : mouvements de caméra, actions, éclairage, ambiance.

IMPORTANT : 
- PAS de hashtags ni de mots marketing
- UNIQUEMENT des instructions techniques visuelles
- Répondre en FRANÇAIS`;
        userPrompt = `Analyse cette image et génère un prompt technique pour une vidéo Instagram Reels. ${brandContext}`;
    }

    console.log('Calling Lovable AI for prompt generation...', { promptType });

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
            content: systemPrompt
          },
          {
            role: 'user',
            content: [
              { 
                type: 'text', 
                text: userPrompt
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
