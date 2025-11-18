import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
  webContentLink?: string;
  size?: string;
  createdTime: string;
  modifiedTime: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Verify user
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { folderId, folderName, action } = await req.json();

    if (action === 'connect') {
      // Get user's Google access token from session
      const { data: sessionData } = await supabase.auth.getSession();
      const providerToken = sessionData.session?.provider_token;
      const providerRefreshToken = sessionData.session?.provider_refresh_token;

      if (!providerToken) {
        throw new Error('No Google Drive access token found');
      }

      console.log('Connecting folder:', { folderId, folderName, userId: user.id });

      // Store refresh token securely
      if (providerRefreshToken) {
        await supabase
          .from('drive_tokens')
          .upsert({
            user_id: user.id,
            refresh_token: providerRefreshToken,
          });
      }

      // List images from the folder
      const driveResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+(mimeType+contains+'image/')&fields=files(id,name,mimeType,thumbnailLink,webContentLink,size,createdTime,modifiedTime)&pageSize=100`,
        {
          headers: {
            'Authorization': `Bearer ${providerToken}`,
          },
        }
      );

      if (!driveResponse.ok) {
        const errorText = await driveResponse.text();
        console.error('Google Drive API error:', errorText);
        throw new Error(`Failed to fetch files from Google Drive: ${driveResponse.status}`);
      }

      const driveData = await driveResponse.json();
      const files: GoogleDriveFile[] = driveData.files || [];

      console.log(`Found ${files.length} images in folder`);

      // Store folder info
      const { error: folderError } = await supabase
        .from('drive_folders')
        .upsert({
          user_id: user.id,
          folder_id: folderId,
          folder_name: folderName,
        });

      if (folderError) {
        console.error('Error storing folder:', folderError);
        throw folderError;
      }

      // Store images
      const imagesToInsert = files.map(file => ({
        user_id: user.id,
        drive_file_id: file.id,
        file_name: file.name,
        mime_type: file.mimeType,
        thumbnail_link: file.thumbnailLink,
        web_content_link: file.webContentLink,
        size: file.size ? parseInt(file.size) : null,
        created_time: file.createdTime,
        modified_time: file.modifiedTime,
      }));

      if (imagesToInsert.length > 0) {
        const { error: imagesError } = await supabase
          .from('drive_images')
          .upsert(imagesToInsert, {
            onConflict: 'drive_file_id',
            ignoreDuplicates: false,
          });

        if (imagesError) {
          console.error('Error storing images:', imagesError);
          throw imagesError;
        }
      }

      console.log(`Successfully synced ${imagesToInsert.length} images`);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Dossier connecté avec succès',
          imagesCount: imagesToInsert.length,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'sync') {
      // Get user's refresh token
      const { data: tokenData } = await supabase
        .from('drive_tokens')
        .select('refresh_token')
        .eq('user_id', user.id)
        .single();

      if (!tokenData) {
        throw new Error('No Google Drive token found. Please reconnect.');
      }

      // Get folder info
      const { data: folderData } = await supabase
        .from('drive_folders')
        .select('folder_id')
        .eq('user_id', user.id)
        .single();

      if (!folderData) {
        throw new Error('No folder configured');
      }

      // Refresh access token
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
          client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
          refresh_token: tokenData.refresh_token,
          grant_type: 'refresh_token',
        }),
      });

      if (!tokenResponse.ok) {
        throw new Error('Failed to refresh Google token');
      }

      const tokenJson = await tokenResponse.json();
      const accessToken = tokenJson.access_token;

      // List images from the folder
      const driveResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files?q='${folderData.folder_id}'+in+parents+and+(mimeType+contains+'image/')&fields=files(id,name,mimeType,thumbnailLink,webContentLink,size,createdTime,modifiedTime)&pageSize=100`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!driveResponse.ok) {
        throw new Error('Failed to fetch files from Google Drive');
      }

      const driveData = await driveResponse.json();
      const files: GoogleDriveFile[] = driveData.files || [];

      // Store images
      const imagesToInsert = files.map(file => ({
        user_id: user.id,
        drive_file_id: file.id,
        file_name: file.name,
        mime_type: file.mimeType,
        thumbnail_link: file.thumbnailLink,
        web_content_link: file.webContentLink,
        size: file.size ? parseInt(file.size) : null,
        created_time: file.createdTime,
        modified_time: file.modifiedTime,
      }));

      if (imagesToInsert.length > 0) {
        await supabase
          .from('drive_images')
          .upsert(imagesToInsert, {
            onConflict: 'drive_file_id',
            ignoreDuplicates: false,
          });
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Synchronisation réussie',
          imagesCount: imagesToInsert.length,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid action');

  } catch (error) {
    console.error('Error in sync-google-drive:', error);
    const errorMessage = error instanceof Error ? error.message : 'Une erreur est survenue';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});