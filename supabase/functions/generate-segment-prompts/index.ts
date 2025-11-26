import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authentifier l'utilisateur
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));

    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(JSON.stringify({ error: "Authentification invalide" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parser le body
    const { originalPrompt, targetDuration, imageId } = await req.json();

    if (!originalPrompt || !targetDuration) {
      return new Response(JSON.stringify({ error: "originalPrompt et targetDuration requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const segmentsCount = Math.ceil(targetDuration / 8);

    // Si 8s, pas besoin de segmenter
    if (segmentsCount === 1) {
      return new Response(
        JSON.stringify({ prompts: [originalPrompt] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generating ${segmentsCount} segment prompts for duration ${targetDuration}s`);

    // Appel Lovable AI (Gemini 2.5 Flash)
    const systemPrompt = `Tu es un expert en création de vidéos courtes pour Instagram.
L'utilisateur te donne un prompt pour une vidéo et une durée cible.
Tu dois découper ce prompt en ${segmentsCount} prompts cohérents de 8 secondes chacun.

Règles importantes :
- Chaque prompt doit être autonome mais s'enchaîner naturellement avec le précédent
- Le premier prompt doit introduire le sujet
- Les prompts suivants doivent développer/continuer l'action de façon fluide
- Maintenir le style, le ton et l'esthétique du prompt original
- Assurer une transition fluide entre chaque segment
- Répondre UNIQUEMENT en JSON strict : { "prompts": ["prompt 1", "prompt 2", ...] }
- Ne pas ajouter de texte avant ou après le JSON`;

    const userPrompt = `Prompt original : "${originalPrompt}"
Durée cible : ${targetDuration} secondes (${segmentsCount} segments de 8 secondes chacun)

Génère ${segmentsCount} prompts qui s'enchaînent naturellement.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("Lovable AI error:", errorText);
      return new Response(JSON.stringify({ error: "Erreur Lovable AI", details: errorText }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      console.error("No content in AI response");
      return new Response(JSON.stringify({ error: "Pas de réponse de l'IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fonction pour extraire le JSON des backticks markdown
    const extractJsonFromMarkdown = (text: string): string => {
      const jsonBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/;
      const match = text.match(jsonBlockRegex);
      return match && match[1] ? match[1].trim() : text.trim();
    };

    // Parser le JSON (en nettoyant les éventuels backticks markdown)
    let parsedResponse;
    try {
      const cleanedContent = extractJsonFromMarkdown(content);
      parsedResponse = JSON.parse(cleanedContent);
    } catch (e) {
      console.error("Failed to parse AI response:", content);
      return new Response(JSON.stringify({ error: "Format de réponse invalide", details: content }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompts = parsedResponse.prompts;

    if (!Array.isArray(prompts) || prompts.length !== segmentsCount) {
      console.error("Invalid prompts array:", prompts);
      return new Response(
        JSON.stringify({
          error: `Nombre de prompts invalide (attendu: ${segmentsCount}, reçu: ${prompts?.length || 0})`,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Generated segment prompts:", prompts);

    return new Response(
      JSON.stringify({ prompts }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
