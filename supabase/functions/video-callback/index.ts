import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Traduit les erreurs Kie.ai en messages utilisateur explicites
 * Priorité : code HTTP > détection par mot-clé
 */
function translateKieError(code: number, msg: string): string {
  // Priorité 1: Codes d'erreur HTTP spécifiques
  if (code === 422) {
    // Validation Error - souvent lié au rejet par le modèle Google
    return "Désolé, votre image a été rejetée par les filtres de sécurité de Google. Google applique une politique stricte concernant les images pouvant contenir de la nudité, du contenu potentiellement violent, ou d'autres éléments sensibles. Veuillez essayer avec une autre image.";
  }

  // Priorité 2: Code 400 - détection par mot-clé
  if (code === 400) {
    const lowerMsg = (msg || '').toLowerCase();
    
    if (lowerMsg.includes('unsafe image') || lowerMsg.includes('safety') || lowerMsg.includes('moderation')) {
      return "Désolé, votre image a été rejetée par les filtres de sécurité de Google. Google applique une politique stricte concernant les images pouvant contenir de la nudité, du contenu potentiellement violent, ou d'autres éléments sensibles. Veuillez essayer avec une autre image.";
    }
    
    if (lowerMsg.includes('failed to fetch') || lowerMsg.includes('download') || lowerMsg.includes('access')) {
      return "Erreur technique : impossible d'accéder à votre image. Veuillez réessayer ou uploader une nouvelle image.";
    }
  }

  // Priorité 3: Autres codes d'erreur avec détection par mot-clé
  const lowerMsg = (msg || '').toLowerCase();
  
  if (lowerMsg.includes('timeout') || lowerMsg.includes('timed out')) {
    return "La génération a pris trop de temps et a été interrompue. Veuillez réessayer.";
  }
  
  if (lowerMsg.includes('quota') || lowerMsg.includes('limit')) {
    return "Limite de génération atteinte. Veuillez réessayer plus tard.";
  }

  // Message générique avec le message original pour debug
  return `Erreur lors de la génération (code ${code}). ${msg ? `Détails : ${msg}` : 'Veuillez réessayer.'}`;
}

/**
 * Déclenche la fusion des segments via fal.ai avec webhook callback
 * Retourne immédiatement - le résultat sera reçu par fal-merge-callback
 */
async function triggerMergeWithWebhook(
  supabase: any,
  video: any,
  segmentsCount: number
): Promise<void> {
  const falApiKey = Deno.env.get('FAL_API_KEY');
  if (!falApiKey) {
    throw new Error('FAL_API_KEY not configured');
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL not configured');
  }

  console.log(`Triggering merge for ${segmentsCount} segments, video ${video.id}`);

  // Générer les signed URLs pour tous les segments
  const segmentUrls: string[] = [];
  for (let i = 1; i <= segmentsCount; i++) {
    const segmentPath = `${video.team_id}/${video.id}_segment_${i}.mp4`;
    const { data, error } = await supabase.storage
      .from('team-videos')
      .createSignedUrl(segmentPath, 3600); // 1h de validité
    
    if (error || !data?.signedUrl) {
      throw new Error(`Failed to get signed URL for segment ${i}: ${error?.message}`);
    }
    
    segmentUrls.push(data.signedUrl);
  }

  // URL du webhook avec videoId en paramètre
  const webhookUrl = `${supabaseUrl}/functions/v1/fal-merge-callback?videoId=${video.id}`;
  
  console.log('Calling fal.ai merge with webhook:', webhookUrl);

  // Appeler fal.ai avec le webhook
  const response = await fetch(
    `https://queue.fal.run/fal-ai/ffmpeg-api/merge-videos?fal_webhook=${encodeURIComponent(webhookUrl)}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Key ${falApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        video_urls: segmentUrls,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`fal.ai queue request failed: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  console.log('fal.ai merge queued:', JSON.stringify(result));
  // result: { request_id, gateway_request_id }
  
  // On retourne immédiatement - fal.ai appellera fal-merge-callback
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parser le webhook Kie.ai
    const webhook = await req.json();
    console.log('Received Kie.ai webhook:', JSON.stringify(webhook));

    const { code, msg, data } = webhook;
    const taskId = data?.taskId;

    if (!taskId) {
      console.error('No taskId in webhook');
      return new Response(JSON.stringify({ error: 'No taskId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Trouver la vidéo dans DB
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('*, images(storage_path, team_id)')
      .eq('kie_task_id', taskId)
      .single();

    if (videoError || !video) {
      console.error('Video not found for taskId:', taskId, videoError);
      return new Response(JSON.stringify({ error: 'Video not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Found video:', video.id);

    // Selon le code de statut
    if (code === 200) {
      // Succès
      const resultUrls = data?.info?.resultUrls || [];
      if (resultUrls.length === 0) {
        console.error('No result URLs in webhook');
        await supabase
          .from('videos')
          .update({
            status: 'failed',
            error_message: 'Aucune URL de résultat reçue',
          })
          .eq('kie_task_id', taskId);

        return new Response(JSON.stringify({ error: 'No result URLs' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const videoUrl = resultUrls[0];
      console.log('Downloading video from:', videoUrl);

      // Télécharger la vidéo
      const videoResponse = await fetch(videoUrl);
      if (!videoResponse.ok) {
        console.error('Failed to download video:', videoResponse.status);
        await supabase
          .from('videos')
          .update({
            status: 'failed',
            error_message: `Échec téléchargement vidéo: ${videoResponse.status}`,
          })
          .eq('kie_task_id', taskId);

        return new Response(JSON.stringify({ error: 'Download failed' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const videoBlob = await videoResponse.blob();
      const videoArrayBuffer = await videoBlob.arrayBuffer();

      // Vérifier si extension nécessaire
      const targetDuration = video.target_duration_seconds || 8;
      const currentSegment = video.current_segment || 1;
      const segmentsNeeded = Math.ceil(targetDuration / 8);
      const segmentPrompts = video.segment_prompts || [video.prompt];

      // Stocker le segment (ou vidéo complète si 8s)
      const storagePath = segmentsNeeded > 1 
        ? `${video.team_id}/${video.id}_segment_${currentSegment}.mp4`
        : `${video.team_id}/${video.id}.mp4`;
      
      console.log('Uploading video to:', storagePath);

      const { error: uploadError } = await supabase.storage
        .from('team-videos')
        .upload(storagePath, videoArrayBuffer, {
          contentType: 'video/mp4',
          upsert: true,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        await supabase
          .from('videos')
          .update({
            status: 'failed',
            error_message: `Erreur upload: ${uploadError.message}`,
          })
          .eq('kie_task_id', taskId);

        return new Response(JSON.stringify({ error: 'Upload failed' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      console.log('Video segment uploaded successfully');

      if (currentSegment < segmentsNeeded) {
        // Extension nécessaire
        const nextPrompt = segmentPrompts[currentSegment]; // Index 1 pour segment 2, etc.
        console.log(`Extension needed: segment ${currentSegment + 1}/${segmentsNeeded} with prompt: ${nextPrompt}`);
        
        const kieApiKey = Deno.env.get('KIE_API_KEY')!;
        
        // Appeler API Kie.ai extend
        const extendResponse = await fetch("https://api.kie.ai/api/v1/veo/extend", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${kieApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            taskId: taskId,
            prompt: nextPrompt,
            seeds: video.seed,
            watermark: "",
            callBackUrl: `${supabaseUrl}/functions/v1/video-callback`,
          }),
        });

        if (!extendResponse.ok) {
          const errorText = await extendResponse.text();
          console.error('Kie.ai extend error:', errorText);
          await supabase
            .from('videos')
            .update({
              status: 'failed',
              error_message: `Erreur extension: ${errorText}`,
            })
            .eq('id', video.id);
          
          return new Response(JSON.stringify({ error: 'Extend failed' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const extendData = await extendResponse.json();
        console.log('Kie.ai extend response:', JSON.stringify(extendData));

        // Vérifier le code interne de l'API
        if (extendData.code !== 200) {
          console.error('Kie.ai extend API error:', extendData.code, extendData.msg);
          await supabase
            .from('videos')
            .update({
              status: 'failed',
              error_message: `Erreur API extend: ${extendData.msg || extendData.code}`,
            })
            .eq('id', video.id);
          
          return new Response(JSON.stringify({ error: 'Extend API error' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const newTaskId = extendData.data?.taskId;

        if (!newTaskId) {
          console.error('No taskId in extend response');
          await supabase
            .from('videos')
            .update({
              status: 'failed',
              error_message: 'Pas de taskId dans la réponse extend',
            })
            .eq('id', video.id);
          
          return new Response(JSON.stringify({ error: 'No taskId in extend' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Mettre à jour pour le prochain segment
        const { error: updateError } = await supabase
          .from('videos')
          .update({
            kie_task_id: newTaskId,
            current_segment: currentSegment + 1,
            status: 'processing',
          })
          .eq('id', video.id);

        if (updateError) {
          console.error('Update error:', updateError);
        }

        console.log(`Extension started with new taskId: ${newTaskId} for segment ${currentSegment + 1}`);
        
        return new Response(JSON.stringify({ success: true, extended: true }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Tous les segments sont terminés
      let finalPath = storagePath; // Par défaut pour vidéo 8s

      if (segmentsNeeded > 1) {
        // Fusion nécessaire pour vidéos multi-segments
        console.log(`All ${segmentsNeeded} segments complete, starting merge...`);
        
        // Mettre à jour le statut pour indiquer la fusion
        await supabase
          .from('videos')
          .update({ status: 'merging' })
          .eq('id', video.id);
        
        try {
          // Déclencher la fusion avec webhook (retourne immédiatement)
          await triggerMergeWithWebhook(supabase, video, segmentsNeeded);
          
          // On retourne 200 à Kie.ai - le reste sera géré par fal-merge-callback
          return new Response(JSON.stringify({ success: true, merging: true }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
          
        } catch (mergeError) {
          console.error('Merge trigger error:', mergeError);
          await supabase
            .from('videos')
            .update({
              status: 'failed',
              error_message: `Erreur déclenchement fusion: ${(mergeError as Error).message}`,
            })
            .eq('id', video.id);
          
          return new Response(JSON.stringify({ error: 'Merge trigger failed' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      // Marquer comme completed
      const { error: updateError } = await supabase
        .from('videos')
        .update({
          status: 'completed',
          video_url: finalPath,
          completed_at: new Date().toISOString(),
        })
        .eq('id', video.id);

      if (updateError) {
        console.error('Update error:', updateError);
      }

      console.log('Video processing completed for:', video.id);

    } else {
      // Échec - utiliser la traduction d'erreur
      const userMessage = translateKieError(code, msg);
      console.error('Kie.ai generation failed:', code, msg, '-> User message:', userMessage);
      
      await supabase
        .from('videos')
        .update({
          status: 'failed',
          error_message: userMessage,
        })
        .eq('kie_task_id', taskId);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
