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
        systemPrompt = `Tu es un expert en génération vidéo IA pour Instagram Reels. 

PROCESSUS OBLIGATOIRE :
1. DÉCRIS d'abord ce que tu vois : personnage (genre, posture, tenue, expression), objets, décor, ambiance, couleurs
2. INTÈGRE ces éléments dans un prompt vidéo ULTRA-DYNAMIQUE

STYLE INSTAGRAM REELS :
- Mouvements de caméra RAPIDES (zoom punch, travelling rapide, rotation dynamique, dolly in brutal)
- Transitions BRUTALES et énergiques (cuts secs, jump cuts)
- Enchaînements de plans courts (2-3 secondes max par angle)
- Rythme soutenu et captivant dès la première seconde

Le prompt doit faire 200-250 caractères en FRANÇAIS et contenir :
- Description du sujet principal visible dans l'image
- Mouvements de caméra dynamiques et rapides
- Actions énergiques et engageantes
- Ambiance punchy

RÈGLES STRICTES :
- TOUJOURS terminer par "Sans son."
- PAS de hashtags ni de mots marketing
- Le prompt DOIT mentionner les éléments clés visibles dans l'image (personnage, objet, contexte)
- Répondre en FRANÇAIS

Exemple avec une image d'une femme tenant un sac :
"Femme stylée avec sac à main, zoom rapide sur son sourire puis travelling arrière dynamique. Cut brutal vers gros plan du sac, rotation 180°. Transitions punch énergiques, lumière chaude. Sans son."`;
        userPrompt = `DÉCRIS ce que tu vois dans cette image (personnage, objets, contexte, couleurs), puis génère un prompt ULTRA-DYNAMIQUE style Instagram Reels pour une vidéo en situation d'utilisation.

Contexte de marque : ${brandContext || 'Non spécifié'}`;
        break;
      case 'product':
        systemPrompt = `Tu es un expert en génération vidéo IA pour Instagram Reels.

PROCESSUS OBLIGATOIRE :
1. DÉCRIS d'abord le produit visible : forme, couleur, matériaux, détails, textures, contexte
2. INTÈGRE ces éléments dans un prompt vidéo ULTRA-DYNAMIQUE

STYLE INSTAGRAM REELS - PRODUIT :
- Mouvements RAPIDES (zoom burst sur les détails, rotation accélérée 360°, dolly punch)
- Transitions BRUTALES entre les angles (cuts secs, whip pan)
- Gros plans percutants sur textures et finitions
- Rythme soutenu avec cuts rapides toutes les 2 secondes

Le prompt doit faire 200-250 caractères en FRANÇAIS et contenir :
- Description précise du produit visible dans l'image
- Mouvements de caméra dynamiques premium
- Mise en valeur énergique des détails
- Ambiance haut de gamme mais punchy

RÈGLES STRICTES :
- TOUJOURS terminer par "Sans son."
- PAS de hashtags ni de mots marketing
- Le prompt DOIT décrire le produit réel visible (couleur, forme, matière)
- Répondre en FRANÇAIS

Exemple avec une image de montre :
"Montre argentée sur surface noire, rotation 360° rapide. Cut brutal zoom sur le cadran, reflets dynamiques. Transition punch vers bracelet, travelling accéléré. Style premium énergique. Sans son."`;
        userPrompt = `DÉCRIS ce produit visible dans l'image (forme, couleurs, matériaux, détails), puis génère un prompt ULTRA-DYNAMIQUE style Instagram pour une mise en avant premium.

Contexte de marque : ${brandContext || 'Non spécifié'}`;
        break;
      case 'testimonial':
        systemPrompt = `Tu es un expert en génération vidéo IA pour Instagram Reels.

PROCESSUS OBLIGATOIRE :
1. DÉCRIS d'abord ce que tu vois : personnage (genre, expression, posture), objet tenu, contexte, ambiance
2. INTÈGRE ces éléments dans un prompt vidéo ULTRA-DYNAMIQUE

STYLE INSTAGRAM REELS - UNBOXING/TÉMOIGNAGE :
- Mouvements RAPIDES et spontanés (caméra portée énergique, shake effect)
- Transitions BRUTALES entre réaction et produit (jump cuts, whip pan)
- Zooms punch sur les émotions et le produit
- Rythme ultra-dynamique façon créateur de contenu TikTok/Reels

Le prompt doit faire 200-250 caractères en FRANÇAIS et contenir :
- Description du personnage et de l'objet visible
- Actions rapides et authentiques
- Transitions énergiques
- Ambiance lifestyle dynamique

RÈGLES STRICTES :
- TOUJOURS terminer par "Sans son."
- PAS de hashtags ni de mots marketing
- Le prompt DOIT décrire ce qui est réellement visible (personnage, objet, expression)
- Répondre en FRANÇAIS

Exemple avec une image de personne avec un colis :
"Mains qui déchirent l'emballage, cut brutal vers visage surpris. Zoom punch sur le produit révélé, rotation rapide. Transitions énergiques, ambiance lifestyle authentique. Sans son."`;
        userPrompt = `DÉCRIS ce que tu vois dans cette image (personnage, expression, objet, contexte), puis génère un prompt ULTRA-DYNAMIQUE style Instagram pour une vidéo témoignage/unboxing.

Contexte de marque : ${brandContext || 'Non spécifié'}`;
        break;
      default:
        systemPrompt = `Tu es un expert en génération vidéo IA pour Instagram Reels.

PROCESSUS OBLIGATOIRE :
1. DÉCRIS d'abord ce que tu vois dans l'image (personnage, objets, contexte, couleurs)
2. INTÈGRE ces éléments dans un prompt vidéo ULTRA-DYNAMIQUE

STYLE INSTAGRAM :
- Mouvements de caméra RAPIDES (zoom punch, cuts brutaux, travelling dynamique)
- Transitions énergiques et percutantes
- Rythme soutenu dès la première seconde

Le prompt doit faire 200-250 caractères en FRANÇAIS.

RÈGLES :
- TOUJOURS terminer par "Sans son."
- PAS de hashtags
- Le prompt DOIT décrire ce qui est visible dans l'image
- Répondre en FRANÇAIS`;
        userPrompt = `DÉCRIS ce que tu vois dans cette image, puis génère un prompt ULTRA-DYNAMIQUE pour Instagram Reels.

Contexte de marque : ${brandContext || 'Non spécifié'}`;
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
          prompt: "Vidéo ultra-dynamique style Instagram Reels. Zoom rapide, cuts brutaux, transitions punch. Mouvements énergiques et captivants. Sans son.",
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
          prompt: "Vidéo ultra-dynamique style Instagram Reels. Zoom rapide, cuts brutaux, transitions punch. Mouvements énergiques et captivants. Sans son.",
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
        prompt: "Vidéo ultra-dynamique style Instagram Reels. Zoom rapide, cuts brutaux, transitions punch. Mouvements énergiques et captivants. Sans son.",
        fallback: true,
        error: (error as Error).message
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
