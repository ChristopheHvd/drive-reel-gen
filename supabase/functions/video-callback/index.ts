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

      // Uploader vers Supabase Storage
      const storagePath = `${video.team_id}/${video.id}.mp4`;
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

      console.log('Video uploaded successfully');

      // Vérifier si extension nécessaire
      const targetDuration = video.target_duration_seconds || 8;
      const currentSegment = video.current_segment || 1;
      const segmentsNeeded = Math.ceil(targetDuration / 8);
      const segmentPrompts = video.segment_prompts || [video.prompt];

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
        const newTaskId = extendData.taskId || extendData.data?.taskId;

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

      // Toutes les extensions terminées -> marquer completed
      const { error: updateError } = await supabase
        .from('videos')
        .update({
          status: 'completed',
          video_url: storagePath,
          completed_at: new Date().toISOString(),
        })
        .eq('kie_task_id', taskId);

      if (updateError) {
        console.error('Update error:', updateError);
      }

      console.log('Video processing completed for:', video.id);

    } else {
      // Échec
      console.error('Kie.ai generation failed:', code, msg);
      await supabase
        .from('videos')
        .update({
          status: 'failed',
          error_message: msg || `Erreur code ${code}`,
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
