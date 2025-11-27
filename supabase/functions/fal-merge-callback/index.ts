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
    // Le videoId est passé en query parameter
    const url = new URL(req.url);
    const videoId = url.searchParams.get('videoId');
    
    if (!videoId) {
      return new Response(JSON.stringify({ error: 'Missing videoId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body = await req.json();
    console.log('fal.ai merge webhook received:', JSON.stringify(body));

    // Format webhook fal.ai :
    // { request_id, status: "OK"|"ERROR", payload: { video: { url } }, error? }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Récupérer la vidéo
    const { data: video, error: fetchError } = await supabase
      .from('videos')
      .select('*')
      .eq('id', videoId)
      .single();

    if (fetchError || !video) {
      console.error('Video not found:', videoId);
      return new Response(JSON.stringify({ error: 'Video not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Vérifier le statut
    if (body.status !== 'OK') {
      console.error('fal.ai merge failed:', body.error);
      await supabase
        .from('videos')
        .update({
          status: 'failed',
          error_message: `Erreur fusion: ${body.error || 'Unknown error'}`,
        })
        .eq('id', videoId);
      
      return new Response(JSON.stringify({ success: false }), {
        status: 200, // On retourne 200 pour que fal.ai ne retry pas
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Extraire l'URL de la vidéo fusionnée
    const mergedVideoUrl = body.payload?.video?.url;
    if (!mergedVideoUrl) {
      console.error('No video URL in payload:', body.payload);
      await supabase
        .from('videos')
        .update({
          status: 'failed',
          error_message: 'Aucune URL vidéo dans la réponse fal.ai',
        })
        .eq('id', videoId);
      
      return new Response(JSON.stringify({ success: false }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Télécharger la vidéo fusionnée
    console.log('Downloading merged video from:', mergedVideoUrl);
    const mergedResponse = await fetch(mergedVideoUrl);
    if (!mergedResponse.ok) {
      throw new Error(`Failed to download merged video: ${mergedResponse.status}`);
    }

    const mergedBlob = await mergedResponse.blob();
    const mergedArrayBuffer = await mergedBlob.arrayBuffer();

    // Uploader la vidéo finale
    const finalPath = `${video.team_id}/${videoId}.mp4`;
    console.log('Uploading merged video to:', finalPath);

    const { error: uploadError } = await supabase.storage
      .from('team-videos')
      .upload(finalPath, mergedArrayBuffer, {
        contentType: 'video/mp4',
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Failed to upload merged video: ${uploadError.message}`);
    }

    // Calculer le nombre de segments et nettoyer
    const segmentsNeeded = Math.ceil((video.target_duration_seconds || 8) / 8);
    console.log(`Cleaning up ${segmentsNeeded} segment files...`);
    
    for (let i = 1; i <= segmentsNeeded; i++) {
      const segmentPath = `${video.team_id}/${videoId}_segment_${i}.mp4`;
      await supabase.storage
        .from('team-videos')
        .remove([segmentPath]);
    }

    // Marquer comme completed
    const { error: updateError } = await supabase
      .from('videos')
      .update({
        status: 'completed',
        video_url: finalPath,
        completed_at: new Date().toISOString(),
      })
      .eq('id', videoId);

    if (updateError) {
      console.error('Update error:', updateError);
    }

    console.log('Video merge completed successfully for:', videoId);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('fal-merge-callback error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
