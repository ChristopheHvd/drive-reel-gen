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

    // Récupérer les données utilisateur complètes avec identities
    console.log('🔍 Phase 1: Fetching user data with identities...');
    const { data: userData, error: userDataError } = await supabase.auth.admin.getUserById(user.id);

    if (userDataError || !userData?.user) {
      console.error('❌ Failed to get user data:', userDataError);
      throw new Error('Impossible de récupérer les informations utilisateur');
    }

    console.log('✅ User data retrieved');
    console.log('📊 Number of identities:', userData.user.identities?.length || 0);
    console.log('📊 App metadata keys:', Object.keys(userData.user.app_metadata || {}));
    console.log('📊 User metadata keys:', Object.keys(userData.user.user_metadata || {}));

    // Chercher l'identity Google
    const googleIdentity = userData.user.identities?.find(
      (identity: any) => identity.provider === 'google'
    );

    if (!googleIdentity) {
      console.error('❌ No Google identity found');
      throw new Error('Aucune connexion Google trouvée. Veuillez vous reconnecter avec Google.');
    }

    console.log('✅ Google identity found:', googleIdentity.id);
    console.log('📊 Identity data keys:', Object.keys(googleIdentity.identity_data || {}));

    // Tenter de récupérer le refresh token
    let refreshToken: string | null = null;
    let tokenSource = '';

    // Option A : Dans identity_data
    if (googleIdentity.identity_data?.provider_refresh_token) {
      refreshToken = googleIdentity.identity_data.provider_refresh_token;
      tokenSource = 'identity_data.provider_refresh_token';
      console.log('✅ Found refresh token in identity_data');
    }

    // Option B : Dans app_metadata
    if (!refreshToken && userData.user.app_metadata?.provider_refresh_token) {
      refreshToken = userData.user.app_metadata.provider_refresh_token;
      tokenSource = 'app_metadata.provider_refresh_token';
      console.log('✅ Found refresh token in app_metadata');
    }

    // Option C : Dans user_metadata
    if (!refreshToken && userData.user.user_metadata?.provider_refresh_token) {
      refreshToken = userData.user.user_metadata.provider_refresh_token;
      tokenSource = 'user_metadata.provider_refresh_token';
      console.log('✅ Found refresh token in user_metadata');
    }

    // Option D : Chercher dans drive_tokens en fallback
    if (!refreshToken) {
      console.log('🔍 Phase 2: No refresh token in auth data, checking drive_tokens table...');
      const { data: tokenData } = await supabase
        .from('drive_tokens')
        .select('refresh_token')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (tokenData?.refresh_token) {
        refreshToken = tokenData.refresh_token;
        tokenSource = 'drive_tokens table';
        console.log('✅ Found refresh token in drive_tokens table');
      }
    }

    if (!refreshToken) {
      console.error('❌ No valid refresh token found in any location');
      console.error('Checked locations: identity_data, app_metadata, user_metadata, drive_tokens');
      throw new Error('Token Google Drive introuvable. Veuillez vous reconnecter avec Google en activant les permissions Google Drive.');
    }

    console.log('✅ Using refresh token from:', tokenSource);

    // Sauvegarder dans drive_tokens pour cache si pas déjà là
    if (tokenSource !== 'drive_tokens table') {
      try {
        console.log('💾 Caching refresh token in drive_tokens...');
        await supabase.from('drive_tokens').upsert({
          user_id: user.id,
          refresh_token: refreshToken,
        });
        console.log('✅ Cached refresh token in drive_tokens');
      } catch (saveError) {
        console.error('⚠️ Failed to cache token:', saveError);
        // Non bloquant
      }
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
        refresh_token: refreshToken,
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
