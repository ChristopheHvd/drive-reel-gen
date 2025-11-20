import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Get the user from the auth header
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    console.log('💾 Attempting to save Drive token for user:', user.id);

    // Get the full user data with identities using admin API
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(user.id);
    
    if (userError || !userData?.user) {
      console.error('Error fetching user:', userError);
      throw new Error('Could not fetch user data');
    }

    console.log('👤 User data retrieved');
    console.log('📊 Number of identities:', userData.user.identities?.length || 0);

    // Find the Google identity
    const googleIdentity = userData.user.identities?.find(
      (identity) => identity.provider === 'google'
    );

    if (!googleIdentity) {
      console.error('❌ No Google identity found');
      throw new Error('No Google identity found');
    }

    console.log('✅ Google identity found:', googleIdentity.id);

    // Try to get refresh token from various locations
    let refreshToken: string | null = null;

    // 1. Check identity_data
    if (googleIdentity.identity_data?.provider_refresh_token) {
      refreshToken = googleIdentity.identity_data.provider_refresh_token;
      console.log('✅ Found refresh token in identity_data');
    }

    // 2. Check app_metadata
    if (!refreshToken && userData.user.app_metadata?.provider_refresh_token) {
      refreshToken = userData.user.app_metadata.provider_refresh_token;
      console.log('✅ Found refresh token in app_metadata');
    }

    // 3. Check user_metadata
    if (!refreshToken && userData.user.user_metadata?.provider_refresh_token) {
      refreshToken = userData.user.user_metadata.provider_refresh_token;
      console.log('✅ Found refresh token in user_metadata');
    }

    if (!refreshToken) {
      console.error('❌ No refresh token found in any location');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Token Google Drive non disponible. Veuillez vous déconnecter complètement et vous reconnecter en acceptant les permissions Google Drive.' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Save to drive_tokens table
    const { error: insertError } = await supabase
      .from('drive_tokens')
      .upsert(
        {
          user_id: user.id,
          refresh_token: refreshToken,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id',
        }
      );

    if (insertError) {
      console.error('Error saving token:', insertError);
      throw insertError;
    }

    console.log('✅ Token saved successfully to drive_tokens');

    return new Response(
      JSON.stringify({ success: true }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
