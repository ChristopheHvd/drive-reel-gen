import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Checking video timeouts...');

    // Mettre à jour les vidéos en timeout
    const { data, error } = await supabase
      .from('videos')
      .update({ 
        status: 'timeout', 
        error_message: 'Génération expirée après 10 minutes' 
      })
      .in('status', ['pending', 'processing'])
      .lt('timeout_at', new Date().toISOString())
      .select();

    if (error) {
      console.error('Error updating timeouts:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const count = data?.length || 0;
    console.log(`Marked ${count} videos as timeout`);

    return new Response(
      JSON.stringify({ success: true, count }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
