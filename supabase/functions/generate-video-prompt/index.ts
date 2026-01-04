import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Tool definition for structured output - separates analysis from final prompt
const tools = [
  {
    type: "function",
    function: {
      name: "generate_video_prompt",
      description: "Génère un prompt vidéo basé sur l'analyse d'une image",
      parameters: {
        type: "object",
        properties: {
          image_analysis: {
            type: "string",
            description: "Description détaillée de ce qui est visible dans l'image (personnage, objets, contexte, couleurs). Usage interne uniquement, ne sera PAS affiché à l'utilisateur."
          },
          video_prompt: {
            type: "string",
            description: "Le prompt final pour générer la vidéo Instagram Reels. 200-250 caractères en français, ultra-dynamique, décrivant les mouvements de caméra et transitions, terminant TOUJOURS par 'Sans son.'"
          }
        },
        required: ["image_analysis", "video_prompt"],
        additionalProperties: false
      }
    }
  }
];

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

    // Adapter le system prompt selon le type - simplifié car le format est forcé par le tool
    let systemPrompt = '';
    let userPrompt = '';

    switch (promptType) {
      case 'situation':
        systemPrompt = `Tu es un expert en génération vidéo IA pour Instagram Reels.

Analyse l'image fournie et génère un prompt vidéo ULTRA-DYNAMIQUE.

STYLE INSTAGRAM REELS :
- Mouvements de caméra RAPIDES (zoom punch, travelling rapide, rotation dynamique, dolly in brutal)
- Transitions BRUTALES et énergiques (cuts secs, jump cuts)
- Enchaînements de plans courts (2-3 secondes max par angle)
- Rythme soutenu et captivant dès la première seconde

Le video_prompt doit :
- Faire 200-250 caractères en FRANÇAIS
- Décrire le sujet visible + mouvements de caméra dynamiques
- Terminer TOUJOURS par "Sans son."
- PAS de hashtags ni de mots marketing
- NE PAS inclure de description de l'image, UNIQUEMENT les instructions pour la vidéo`;
        
        userPrompt = `Génère un prompt pour une vidéo en situation d'utilisation.
Contexte de marque : ${brandContext || 'Non spécifié'}`;
        break;

      case 'product':
        systemPrompt = `Tu es un expert en génération vidéo IA pour Instagram Reels.

Analyse le produit visible dans l'image et génère un prompt vidéo ULTRA-DYNAMIQUE.

STYLE INSTAGRAM REELS - PRODUIT :
- Mouvements RAPIDES (zoom burst sur les détails, rotation accélérée 360°, dolly punch)
- Transitions BRUTALES entre les angles (cuts secs, whip pan)
- Gros plans percutants sur textures et finitions
- Rythme soutenu avec cuts rapides toutes les 2 secondes

Le video_prompt doit :
- Faire 200-250 caractères en FRANÇAIS
- Décrire les mouvements de caméra dynamiques et premium
- Terminer TOUJOURS par "Sans son."
- PAS de hashtags ni de mots marketing
- NE PAS inclure de description du produit, UNIQUEMENT les instructions pour la vidéo`;
        
        userPrompt = `Génère un prompt pour une mise en avant produit premium.
Contexte de marque : ${brandContext || 'Non spécifié'}`;
        break;

      case 'testimonial':
        systemPrompt = `Tu es un expert en génération vidéo IA pour Instagram Reels.

Analyse l'image (personnage, expression, contexte) et génère un prompt vidéo ULTRA-DYNAMIQUE.

STYLE INSTAGRAM REELS - UNBOXING/TÉMOIGNAGE :
- Mouvements RAPIDES et spontanés (caméra portée énergique, shake effect)
- Transitions BRUTALES entre réaction et produit (jump cuts, whip pan)
- Zooms punch sur les émotions et le produit
- Rythme ultra-dynamique façon créateur de contenu TikTok/Reels

Le video_prompt doit :
- Faire 200-250 caractères en FRANÇAIS
- Décrire des actions rapides et authentiques
- Terminer TOUJOURS par "Sans son."
- PAS de hashtags ni de mots marketing
- NE PAS inclure de description du personnage, UNIQUEMENT les instructions pour la vidéo`;
        
        userPrompt = `Génère un prompt pour une vidéo témoignage/unboxing.
Contexte de marque : ${brandContext || 'Non spécifié'}`;
        break;

      default:
        systemPrompt = `Tu es un expert en génération vidéo IA pour Instagram Reels.

Analyse l'image fournie et génère un prompt vidéo ULTRA-DYNAMIQUE.

STYLE INSTAGRAM :
- Mouvements de caméra RAPIDES (zoom punch, cuts brutaux, travelling dynamique)
- Transitions énergiques et percutantes
- Rythme soutenu dès la première seconde

Le video_prompt doit :
- Faire 200-250 caractères en FRANÇAIS
- Terminer TOUJOURS par "Sans son."
- PAS de hashtags
- NE PAS inclure de description de l'image, UNIQUEMENT les instructions pour la vidéo`;
        
        userPrompt = `Génère un prompt ultra-dynamique pour Instagram Reels.
Contexte de marque : ${brandContext || 'Non spécifié'}`;
    }

    console.log('Calling Lovable AI with tool calling...', { promptType });

    // Appel Lovable AI avec tool calling pour séparer analyse et prompt final
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
        ],
        tools: tools,
        tool_choice: { type: "function", function: { name: "generate_video_prompt" } }
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Lovable AI error:', errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again later" }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add credits" }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
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
    console.log('AI response received');

    // Extraire la réponse du tool call
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall?.function?.name === "generate_video_prompt") {
      try {
        const args = JSON.parse(toolCall.function.arguments);
        
        // Log l'analyse pour debug (interne uniquement)
        console.log('Image analysis (internal):', args.image_analysis);
        console.log('Video prompt (final):', args.video_prompt);
        
        // Retourner UNIQUEMENT le prompt vidéo à l'utilisateur
        return new Response(
          JSON.stringify({ prompt: args.video_prompt }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (parseError) {
        console.error('Error parsing tool call arguments:', parseError);
      }
    }

    // Fallback: essayer d'extraire du contenu régulier
    const content = aiData.choices?.[0]?.message?.content;
    if (content) {
      console.log('Fallback to content:', content);
      return new Response(
        JSON.stringify({ prompt: content.trim() }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Ultimate fallback
    console.log('Using ultimate fallback prompt');
    return new Response(
      JSON.stringify({ 
        prompt: "Vidéo ultra-dynamique style Instagram Reels. Zoom rapide, cuts brutaux, transitions punch. Mouvements énergiques et captivants. Sans son.",
        fallback: true
      }),
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
