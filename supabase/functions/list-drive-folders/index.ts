import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { parentFolderId } = await req.json();
    console.log('Listing folders for parent:', parentFolderId, 'user:', user.id);

    // Récupérer le token Google Drive de l'utilisateur
    const { data: tokenData, error: tokenError } = await supabase
      .from('drive_tokens')
      .select('refresh_token')
      .eq('user_id', user.id)
      .single();

    if (tokenError || !tokenData?.refresh_token) {
      throw new Error('No Google Drive token found. Please reconnect your Google account.');
    }

    // Refresh access token
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
    
    if (!clientId || !clientSecret) {
      throw new Error('Google OAuth credentials not configured');
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: tokenData.refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token refresh error:', errorText);
      throw new Error('Failed to refresh Google token');
    }

    const { access_token } = await tokenResponse.json();

    // Lister les dossiers du parent spécifié
    const query = parentFolderId === 'root' 
      ? `mimeType='application/vnd.google-apps.folder' and 'root' in parents and trashed=false`
      : `mimeType='application/vnd.google-apps.folder' and '${parentFolderId}' in parents and trashed=false`;

    const driveResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)&orderBy=name`,
      {
        headers: {
          'Authorization': `Bearer ${access_token}`,
        },
      }
    );

    if (!driveResponse.ok) {
      const errorText = await driveResponse.text();
      console.error('Drive API error:', errorText);
      throw new Error('Failed to fetch folders from Google Drive');
    }

    const driveData = await driveResponse.json();
    console.log('Fetched folders:', driveData.files?.length || 0);

    return new Response(
      JSON.stringify({ folders: driveData.files || [] }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
