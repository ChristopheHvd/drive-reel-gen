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
    const kieApiKey = Deno.env.get("KIE_API_KEY")!;

    // Créer client Supabase avec service role pour bypass RLS
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
    const { 
      imageId, 
      prompt, 
      aspectRatio = "9:16", 
      durationSeconds = 8,
      seed,
      logoUrl,
      additionalImageUrl,
    } = await req.json();

    if (!imageId) {
      return new Response(JSON.stringify({ error: "imageId requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Récupérer le team_id de l'utilisateur
    const { data: teamMember, error: teamError } = await supabase
      .from("team_members")
      .select("team_id")
      .eq("user_id", user.id)
      .single();

    if (teamError || !teamMember) {
      console.error("Team error:", teamError);
      return new Response(JSON.stringify({ error: "Équipe non trouvée" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const teamId = teamMember.team_id;

    // Vérifier le quota
    const { data: subscription, error: subError } = await supabase
      .from("user_subscriptions")
      .select("plan_type, video_limit, videos_generated_this_month")
      .eq("user_id", user.id)
      .single();

    if (subError || !subscription) {
      console.error("Subscription error:", subError);
      return new Response(JSON.stringify({ error: "Abonnement non trouvé" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (subscription.videos_generated_this_month >= subscription.video_limit) {
      return new Response(
        JSON.stringify({
          error: "Quota dépassé",
          currentUsage: subscription.videos_generated_this_month,
          limit: subscription.video_limit,
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Récupérer l'image
    const { data: image, error: imageError } = await supabase
      .from("images")
      .select("*")
      .eq("id", imageId)
      .eq("team_id", teamId)
      .single();

    if (imageError || !image) {
      console.error("Image error:", imageError);
      return new Response(JSON.stringify({ error: "Image non trouvée" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Générer signed URL pour l'image (valide 2h)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("team-images")
      .createSignedUrl(image.storage_path, 7200); // 2 heures

    if (signedUrlError || !signedUrlData) {
      console.error("Signed URL error:", signedUrlError);
      return new Response(JSON.stringify({ error: "Impossible de générer l'URL de l'image" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const imageSignedUrl = signedUrlData.signedUrl;

    // Générer prompt par défaut si absent
    const finalPrompt = prompt || "Génère une vidéo sympa, très dynamique, respectant les codes d'Instagram";

    // Générer seed si absent
    const finalSeed = seed || Math.floor(Math.random() * 1000000);

    // Déterminer le generationType et les imageUrls
    let generationType = "FIRST_AND_LAST_FRAMES_2_VIDEO";
    const imageUrls = [imageSignedUrl];
    let targetAspectRatio = aspectRatio;
    let willBeCropped = false;

    // Si logo ou image additionnelle, passer en REFERENCE_2_VIDEO
    if (logoUrl || additionalImageUrl) {
      generationType = "REFERENCE_2_VIDEO";
      
      // Ajouter les URLs signées pour logo et image additionnelle
      if (logoUrl) {
        const { data: logoSignedData } = await supabase.storage
          .from("team-images")
          .createSignedUrl(logoUrl, 7200);
        if (logoSignedData) imageUrls.push(logoSignedData.signedUrl);
      }
      
      if (additionalImageUrl) {
        const { data: additionalSignedData } = await supabase.storage
          .from("team-images")
          .createSignedUrl(additionalImageUrl, 7200);
        if (additionalSignedData) imageUrls.push(additionalSignedData.signedUrl);
      }

      // Si 9:16 demandé, générer en 16:9 puis on recadrera
      if (aspectRatio === "9:16") {
        targetAspectRatio = "16:9";
        willBeCropped = true;
      }
    }

    // Appel API Kie.ai
    console.log("Calling Kie.ai API...", { generationType, imageUrls: imageUrls.length, aspectRatio: targetAspectRatio });
    const kieResponse = await fetch("https://api.kie.ai/api/v1/veo/generate", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${kieApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: finalPrompt,
        generationType,
        imageUrls,
        aspectRatio: targetAspectRatio,
        callBackUrl: `${supabaseUrl}/functions/v1/video-callback`,
        model: "veo3_fast",
        seeds: [finalSeed],
      }),
    });

    if (!kieResponse.ok) {
      const errorText = await kieResponse.text();
      console.error("Kie.ai error:", errorText);
      return new Response(JSON.stringify({ error: "Erreur API Kie.ai", details: errorText }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const kieData = await kieResponse.json();
    const taskId = kieData.taskId || kieData.data?.taskId;

    if (!taskId) {
      console.error("No taskId in Kie.ai response:", kieData);
      return new Response(JSON.stringify({ error: "Pas de taskId dans la réponse Kie.ai" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Kie.ai taskId:", taskId);

    // Créer entrée DB
    const { data: video, error: videoError } = await supabase
      .from("videos")
      .insert({
        image_id: imageId,
        team_id: teamId,
        kie_task_id: taskId,
        mode: "packshot", // Mode legacy pour compatibilité DB
        prompt: finalPrompt,
        aspect_ratio: aspectRatio,
        duration_seconds: durationSeconds,
        status: "pending",
        seed: finalSeed,
        logo_url: logoUrl,
        additional_image_url: additionalImageUrl,
        generation_type: generationType,
        was_cropped: willBeCropped,
      })
      .select()
      .single();

    if (videoError) {
      console.error("Video insert error:", videoError);
      return new Response(JSON.stringify({ error: "Erreur création vidéo en DB", details: videoError }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Incrémenter quota
    const { error: quotaError } = await supabase
      .from("user_subscriptions")
      .update({ videos_generated_this_month: subscription.videos_generated_this_month + 1 })
      .eq("user_id", user.id);

    if (quotaError) {
      console.error("Quota update error:", quotaError);
    }

    console.log("Video generation initiated:", video.id);

    return new Response(
      JSON.stringify({
        videoId: video.id,
        kieTaskId: taskId,
        status: "pending",
        estimatedTimeSeconds: 120,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
