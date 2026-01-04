import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Tool definition for structured output - 2-step process: analyze then generate
const tools = [
  {
    type: "function",
    function: {
      name: "generate_video_prompt",
      description: "PROCESSUS EN 2 ÉTAPES : 1) Analyse l'image en détail, 2) Génère un prompt vidéo BASÉ SUR cette analyse",
      parameters: {
        type: "object",
        properties: {
          image_analysis: {
            type: "string",
            description: "ÉTAPE 1 : Description détaillée de ce qui est visible (personnage: genre/tenue/posture, objets, produit, contexte, couleurs, ambiance). Cette analyse sera utilisée pour créer le video_prompt."
          },
          video_prompt: {
            type: "string",
            description: "ÉTAPE 2 : Prompt vidéo BASÉ SUR image_analysis. DOIT mentionner le sujet identifié dans l'analyse + mouvements de caméra dynamiques. 200-250 caractères en français, termine par 'Sans son.'"
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

PROCESSUS EN 2 ÉTAPES OBLIGATOIRES :

ÉTAPE 1 - image_analysis :
Décris en détail ce que tu vois : personnage (genre, posture, tenue, expression), objets, contexte, couleurs, ambiance.

ÉTAPE 2 - video_prompt :
EN TE BASANT SUR TON ANALYSE, génère un prompt qui :
- MENTIONNE le sujet principal identifié (ex: "Femme en robe rouge", "Homme avec casque")
- Décrit une mise en situation dynamique de CE sujet
- Utilise des mouvements RAPIDES : zoom punch, travelling rapide, rotation dynamique
- Transitions BRUTALES : cuts secs, jump cuts
- Termine TOUJOURS par "Sans son."

EXEMPLE :
- image_analysis: "Femme blonde en bikini bleu tenant un vélo sur une plage ensoleillée"  
- video_prompt: "Femme en bikini sur la plage, zoom punch sur son sourire. Elle enfourche le vélo, travelling rapide. Cut brutal vers roue qui tourne. Sans son."

RÈGLES video_prompt :
- 200-250 caractères en FRANÇAIS
- Le SUJET de l'image DOIT apparaître dans le prompt
- PAS de hashtags ni de mots marketing`;
        
        userPrompt = `Analyse cette image puis génère un prompt vidéo en situation d'utilisation.
Contexte de marque : ${brandContext || 'Non spécifié'}`;
        break;

      case 'product':
        systemPrompt = `Tu es un expert en génération vidéo IA pour Instagram Reels.

PROCESSUS EN 2 ÉTAPES OBLIGATOIRES :

ÉTAPE 1 - image_analysis :
Décris le produit visible : forme, couleur, matériaux, détails, textures, contexte de présentation.

ÉTAPE 2 - video_prompt :
EN TE BASANT SUR TON ANALYSE, génère un prompt qui :
- MENTIONNE le produit identifié avec ses caractéristiques visuelles
- Met en valeur CE produit avec des mouvements premium
- Zoom burst sur les détails identifiés, rotation 360°
- Transitions BRUTALES : cuts secs, whip pan
- Termine TOUJOURS par "Sans son."

EXEMPLE :
- image_analysis: "Montre argentée avec bracelet en acier, cadran noir, posée sur surface en marbre"
- video_prompt: "Montre argentée sur marbre, zoom burst sur le cadran noir. Rotation 360° révélant le bracelet acier. Reflets dynamiques, cuts brutaux. Sans son."

RÈGLES video_prompt :
- 200-250 caractères en FRANÇAIS  
- Le PRODUIT décrit DOIT apparaître dans le prompt
- PAS de hashtags ni de mots marketing`;
        
        userPrompt = `Analyse ce produit puis génère un prompt pour une mise en avant premium.
Contexte de marque : ${brandContext || 'Non spécifié'}`;
        break;

      case 'testimonial':
        systemPrompt = `Tu es un expert en génération vidéo IA pour Instagram Reels.

PROCESSUS EN 2 ÉTAPES OBLIGATOIRES :

ÉTAPE 1 - image_analysis :
Décris ce que tu vois : personnage (genre, expression, posture), objet tenu, contexte, ambiance.

ÉTAPE 2 - video_prompt :
EN TE BASANT SUR TON ANALYSE, génère un prompt qui :
- MENTIONNE le personnage et l'objet identifiés
- Crée une interaction dynamique entre le personnage et l'objet
- Mouvements SPONTANÉS : caméra portée, shake effect
- Transitions BRUTALES : jump cuts, whip pan  
- Termine TOUJOURS par "Sans son."

EXEMPLE :
- image_analysis: "Jeune homme souriant tenant un colis ouvert, expression de surprise, salon moderne"
- video_prompt: "Homme surpris ouvrant le colis, zoom punch sur son visage. Cut brutal vers le produit révélé, rotation rapide. Réaction authentique. Sans son."

RÈGLES video_prompt :
- 200-250 caractères en FRANÇAIS
- Le PERSONNAGE et L'OBJET doivent apparaître dans le prompt
- PAS de hashtags ni de mots marketing`;
        
        userPrompt = `Analyse cette image puis génère un prompt pour une vidéo témoignage/unboxing.
Contexte de marque : ${brandContext || 'Non spécifié'}`;
        break;

      default:
        systemPrompt = `Tu es un expert en génération vidéo IA pour Instagram Reels.

PROCESSUS EN 2 ÉTAPES OBLIGATOIRES :

ÉTAPE 1 - image_analysis :
Décris en détail ce que tu vois dans l'image.

ÉTAPE 2 - video_prompt :
EN TE BASANT SUR TON ANALYSE, génère un prompt qui :
- MENTIONNE le sujet principal identifié
- Décrit des mouvements de caméra RAPIDES autour de CE sujet
- Termine TOUJOURS par "Sans son."

RÈGLES video_prompt :
- 200-250 caractères en FRANÇAIS
- Le sujet de l'image DOIT apparaître`;
        
        userPrompt = `Analyse cette image puis génère un prompt ultra-dynamique pour Instagram Reels.
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
