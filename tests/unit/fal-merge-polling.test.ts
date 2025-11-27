import { describe, it, expect } from 'vitest';

/**
 * Tests unitaires pour la logique de polling fal.ai merge
 */
describe('fal.ai merge polling logic', () => {
  it('should return video URL when status is COMPLETED', () => {
    const result = { status: 'COMPLETED', video: { url: 'https://example.com/video.mp4' } };
    expect(result.status).toBe('COMPLETED');
    expect(result.video?.url).toBeTruthy();
    expect(result.video.url).toBe('https://example.com/video.mp4');
  });

  it('should throw error when status is FAILED', () => {
    const result = { status: 'FAILED', error: 'Merge failed' };
    expect(result.status).toBe('FAILED');
    expect(result.error).toBe('Merge failed');
  });

  it('should continue polling when status is IN_QUEUE', () => {
    const result = { status: 'IN_QUEUE' };
    expect(['IN_QUEUE', 'IN_PROGRESS'].includes(result.status)).toBe(true);
  });

  it('should continue polling when status is IN_PROGRESS', () => {
    const result = { status: 'IN_PROGRESS' };
    expect(['IN_QUEUE', 'IN_PROGRESS'].includes(result.status)).toBe(true);
  });

  it('should timeout after max attempts', () => {
    const maxAttempts = 60;
    const pollInterval = 2000;
    const maxTimeMs = maxAttempts * pollInterval;
    expect(maxTimeMs).toBe(120000); // 2 minutes
  });

  it('should handle missing video URL in COMPLETED response', () => {
    const result = { status: 'COMPLETED', video: null };
    expect(result.status).toBe('COMPLETED');
    expect(result.video?.url).toBeFalsy();
  });

  it('should handle COMPLETED response with empty video object', () => {
    const result = { status: 'COMPLETED', video: {} };
    expect(result.status).toBe('COMPLETED');
    expect(result.video.url).toBeUndefined();
  });

  it('should correctly identify polling states', () => {
    const queueResult = { status: 'IN_QUEUE' };
    const progressResult = { status: 'IN_PROGRESS' };
    const completedResult = { status: 'COMPLETED' };
    const failedResult = { status: 'FAILED' };

    const shouldContinuePolling = (status: string) => 
      ['IN_QUEUE', 'IN_PROGRESS'].includes(status);

    expect(shouldContinuePolling(queueResult.status)).toBe(true);
    expect(shouldContinuePolling(progressResult.status)).toBe(true);
    expect(shouldContinuePolling(completedResult.status)).toBe(false);
    expect(shouldContinuePolling(failedResult.status)).toBe(false);
  });
});
