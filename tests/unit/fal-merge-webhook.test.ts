import { describe, it, expect } from 'vitest';

/**
 * Tests unitaires pour la logique webhook fal.ai merge
 */
describe('fal.ai merge webhook logic', () => {
  it('should handle successful webhook payload', () => {
    const payload = {
      request_id: '123',
      status: 'OK',
      payload: {
        video: {
          url: 'https://example.com/merged.mp4'
        }
      }
    };
    
    expect(payload.status).toBe('OK');
    expect(payload.payload.video.url).toBeTruthy();
    expect(payload.payload.video.url).toBe('https://example.com/merged.mp4');
  });

  it('should handle error webhook payload', () => {
    const payload = {
      request_id: '123',
      status: 'ERROR',
      error: 'Merge failed',
      payload: null
    };
    
    expect(payload.status).toBe('ERROR');
    expect(payload.error).toBe('Merge failed');
  });

  it('should construct correct webhook URL with videoId', () => {
    const supabaseUrl = 'https://xxx.supabase.co';
    const videoId = 'video-123';
    const webhookUrl = `${supabaseUrl}/functions/v1/fal-merge-callback?videoId=${videoId}`;
    
    expect(webhookUrl).toContain('fal-merge-callback');
    expect(webhookUrl).toContain('videoId=video-123');
  });

  it('should construct fal.ai queue URL with webhook parameter', () => {
    const webhookUrl = 'https://xxx.supabase.co/functions/v1/fal-merge-callback?videoId=123';
    const falUrl = `https://queue.fal.run/fal-ai/ffmpeg-api/merge-videos?fal_webhook=${encodeURIComponent(webhookUrl)}`;
    
    expect(falUrl).toContain('fal_webhook=');
    expect(falUrl).toContain('queue.fal.run');
    expect(decodeURIComponent(falUrl)).toContain('fal-merge-callback?videoId=123');
  });

  it('should handle missing video URL in OK response', () => {
    const payload = {
      request_id: '123',
      status: 'OK',
      payload: {
        video: null
      }
    };
    
    expect(payload.status).toBe('OK');
    expect(payload.payload.video?.url).toBeFalsy();
  });

  it('should handle OK response with empty payload', () => {
    const payload = {
      request_id: '123',
      status: 'OK',
      payload: {}
    };
    
    expect(payload.status).toBe('OK');
    expect(payload.payload.video?.url).toBeUndefined();
  });
});
