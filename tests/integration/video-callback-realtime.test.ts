import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

/**
 * Tests d'intégration pour vérifier que le realtime fonctionne
 * sur la table videos après un callback de génération
 */
describe('Video Callback Realtime Integration', () => {
  let testUserId: string;
  let testTeamId: string;
  let testImageId: string;
  let testVideoId: string;

  beforeAll(async () => {
    // Créer un user de test
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: `test-video-callback-${Date.now()}@example.com`,
      password: 'testpassword123',
    });

    if (authError || !authData.user) {
      throw new Error('Failed to create test user');
    }

    testUserId = authData.user.id;

    // Créer une team de test
    const { data: teamData, error: teamError } = await supabase
      .from('teams')
      .insert({ name: 'Test Team Video Callback', owner_id: testUserId })
      .select()
      .single();

    if (teamError || !teamData) {
      throw new Error('Failed to create test team');
    }

    testTeamId = teamData.id;

    // Créer une image de test
    const { data: imageData, error: imageError } = await supabase
      .from('images')
      .insert({
        team_id: testTeamId,
        uploaded_by: testUserId,
        file_name: 'test-image.jpg',
        storage_path: 'test/path.jpg',
        file_size: 1024,
        mime_type: 'image/jpeg',
      })
      .select()
      .single();

    if (imageError || !imageData) {
      throw new Error('Failed to create test image');
    }

    testImageId = imageData.id;
  });

  afterAll(async () => {
    // Cleanup
    if (testVideoId) {
      await supabase.from('videos').delete().eq('id', testVideoId);
    }
    if (testImageId) {
      await supabase.from('images').delete().eq('id', testImageId);
    }
    if (testTeamId) {
      await supabase.from('teams').delete().eq('id', testTeamId);
    }
  });

  it('should receive realtime update when video status changes from pending to completed', async () => {
    // Créer une vidéo en status pending
    const { data: videoData, error: videoError } = await supabase
      .from('videos')
      .insert({
        team_id: testTeamId,
        image_id: testImageId,
        kie_task_id: 'test-task-' + Date.now(),
        mode: 'FIRST_AND_LAST_FRAME',
        prompt: 'Test prompt',
        aspect_ratio: '9:16',
        duration_seconds: 8,
        status: 'pending',
      })
      .select()
      .single();

    if (videoError || !videoData) {
      throw new Error('Failed to create test video');
    }

    testVideoId = videoData.id;

    // Vérifier que la vidéo est en pending
    expect(videoData.status).toBe('pending');

    // Créer une Promise pour attendre la mise à jour realtime
    const realtimeUpdateReceived = new Promise<boolean>((resolve) => {
      const channel = supabase
        .channel('test-video-callback')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'videos',
            filter: `id=eq.${testVideoId}`,
          },
          (payload) => {
            console.log('Realtime update received in test:', payload);
            if (payload.new && (payload.new as any).status === 'completed') {
              resolve(true);
            }
          }
        )
        .subscribe((status) => {
          console.log('Test subscription status:', status);
        });

      // Timeout après 10 secondes
      setTimeout(() => {
        supabase.removeChannel(channel);
        resolve(false);
      }, 10000);
    });

    // Attendre un peu pour que la souscription soit active
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Simuler le callback en mettant à jour le status
    const { error: updateError } = await supabase
      .from('videos')
      .update({
        status: 'completed',
        video_url: 'https://example.com/test-video.mp4',
        completed_at: new Date().toISOString(),
      })
      .eq('id', testVideoId);

    expect(updateError).toBeNull();

    // Attendre la notification realtime
    const receivedUpdate = await realtimeUpdateReceived;
    expect(receivedUpdate).toBe(true);

    // Vérifier que la vidéo est bien completed
    const { data: updatedVideo, error: fetchError } = await supabase
      .from('videos')
      .select('*')
      .eq('id', testVideoId)
      .single();

    expect(fetchError).toBeNull();
    expect(updatedVideo?.status).toBe('completed');
    expect(updatedVideo?.video_url).toBe('https://example.com/test-video.mp4');
  }, 15000); // Timeout de 15 secondes pour ce test

  it('should handle realtime updates for failed videos', async () => {
    // Créer une vidéo en status processing
    const { data: videoData, error: videoError } = await supabase
      .from('videos')
      .insert({
        team_id: testTeamId,
        image_id: testImageId,
        kie_task_id: 'test-task-failed-' + Date.now(),
        mode: 'FIRST_AND_LAST_FRAME',
        prompt: 'Test prompt for failure',
        aspect_ratio: '9:16',
        duration_seconds: 8,
        status: 'processing',
      })
      .select()
      .single();

    if (videoError || !videoData) {
      throw new Error('Failed to create test video');
    }

    const failedVideoId = videoData.id;

    // Créer une Promise pour attendre la mise à jour realtime
    const realtimeUpdateReceived = new Promise<boolean>((resolve) => {
      const channel = supabase
        .channel('test-video-failed')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'videos',
            filter: `id=eq.${failedVideoId}`,
          },
          (payload) => {
            if (payload.new && (payload.new as any).status === 'failed') {
              resolve(true);
            }
          }
        )
        .subscribe();

      setTimeout(() => {
        supabase.removeChannel(channel);
        resolve(false);
      }, 10000);
    });

    // Attendre que la souscription soit active
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Simuler un échec
    await supabase
      .from('videos')
      .update({
        status: 'failed',
        error_message: 'Test error message',
      })
      .eq('id', failedVideoId);

    // Attendre la notification realtime
    const receivedUpdate = await realtimeUpdateReceived;
    expect(receivedUpdate).toBe(true);

    // Cleanup
    await supabase.from('videos').delete().eq('id', failedVideoId);
  }, 15000);
});
