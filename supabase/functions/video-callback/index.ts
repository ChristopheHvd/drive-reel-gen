import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Fusionne plusieurs segments vidéo via fal.ai avec polling asynchrone
 */
async function mergeVideoSegments(
  supabase: any,
  video: any,
  segmentsCount: number
): Promise<string> {
  const falApiKey = Deno.env.get('FAL_API_KEY');
  if (!falApiKey) {
    throw new Error('FAL_API_KEY not configured');
  }

  console.log(`Merging ${segmentsCount} segments for video ${video.id}`);

  // Générer les signed URLs pour tous les segments
  const segmentUrls: string[] = [];
  for (let i = 1; i <= segmentsCount; i++) {
    const segmentPath = `${video.team_id}/${video.id}_segment_${i}.mp4`;
    const { data, error } = await supabase.storage
      .from('team-videos')
      .createSignedUrl(segmentPath, 3600);
    
    if (error || !data?.signedUrl) {
      throw new Error(`Failed to get signed URL for segment ${i}: ${error?.message}`);
    }
    
    segmentUrls.push(data.signedUrl);
  }

  console.log('Segment URLs ready, calling fal.ai merge API...');

  // Envoyer la requête à fal.ai queue
  const queueResponse = await fetch('https://queue.fal.run/fal-ai/ffmpeg-api/merge-videos', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${falApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      video_urls: segmentUrls,
    }),
  });

  if (!queueResponse.ok) {
    const errorText = await queueResponse.text();
    throw new Error(`fal.ai queue request failed: ${queueResponse.status} - ${errorText}`);
  }

  const queueResult = await queueResponse.json();
  console.log('fal.ai queue response:', JSON.stringify(queueResult));
  
  const responseUrl = queueResult.response_url;
  if (!responseUrl) {
    throw new Error('No response_url in fal.ai queue response');
  }

  // Polling jusqu'à completion
  const maxAttempts = 60;
  const pollInterval = 2000; // 2 secondes
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`Polling fal.ai merge status (attempt ${attempt}/${maxAttempts})...`);
    
    await new Promise(resolve => setTimeout(resolve, pollInterval));
    
    const statusResponse = await fetch(responseUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Key ${falApiKey}`,
      },
    });

    if (!statusResponse.ok) {
      console.error(`Status check failed: ${statusResponse.status}`);
      continue;
    }

    const result = await statusResponse.json();
    console.log(`Polling result (attempt ${attempt}):`, result.status);

    if (result.status === 'COMPLETED') {
      if (!result.video?.url) {
        throw new Error('No video URL in completed fal.ai response');
      }
      console.log('Merge completed, video URL:', result.video.url);
      return result.video.url;
    }

    if (result.status === 'FAILED') {
      throw new Error(`fal.ai merge failed: ${result.error || 'Unknown error'}`);
    }

    // Status IN_QUEUE or IN_PROGRESS → continue polling
  }

  throw new Error(`fal.ai merge timeout after ${maxAttempts} attempts (${maxAttempts * 2}s)`);
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

      // Tous les segments sont terminés
      let finalPath = storagePath; // Par défaut pour vidéo 8s

      if (segmentsNeeded > 1) {
        // Fusion nécessaire pour vidéos multi-segments
        console.log(`All ${segmentsNeeded} segments complete, starting merge...`);
        
        try {
          // Fusionner les segments via fal.ai
          const mergedVideoUrl = await mergeVideoSegments(supabase, video, segmentsNeeded);
          
          // Télécharger la vidéo fusionnée
          console.log('Downloading merged video from:', mergedVideoUrl);
          const mergedResponse = await fetch(mergedVideoUrl);
          if (!mergedResponse.ok) {
            throw new Error(`Failed to download merged video: ${mergedResponse.status}`);
          }
          
          const mergedBlob = await mergedResponse.blob();
          const mergedArrayBuffer = await mergedBlob.arrayBuffer();
          
          // Uploader la vidéo finale
          finalPath = `${video.team_id}/${video.id}.mp4`;
          console.log('Uploading merged video to:', finalPath);
          
          const { error: finalUploadError } = await supabase.storage
            .from('team-videos')
            .upload(finalPath, mergedArrayBuffer, {
              contentType: 'video/mp4',
              upsert: true,
            });
          
          if (finalUploadError) {
            throw new Error(`Failed to upload merged video: ${finalUploadError.message}`);
          }
          
          // Supprimer les segments individuels
          console.log('Cleaning up segment files...');
          for (let i = 1; i <= segmentsNeeded; i++) {
            const segmentPath = `${video.team_id}/${video.id}_segment_${i}.mp4`;
            await supabase.storage
              .from('team-videos')
              .remove([segmentPath]);
          }
          
          console.log('Merge completed successfully');
          
        } catch (mergeError) {
          console.error('Merge error:', mergeError);
          await supabase
            .from('videos')
            .update({
              status: 'failed',
              error_message: `Erreur fusion: ${(mergeError as Error).message}`,
            })
            .eq('id', video.id);
          
          return new Response(JSON.stringify({ error: 'Merge failed' }), {
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
