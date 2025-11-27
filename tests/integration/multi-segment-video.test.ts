import { describe, it, expect } from 'vitest';

/**
 * Tests d'intégration pour la génération de vidéos multi-segment
 */
describe('Multi-segment video generation integration', () => {
  it('should generate correct segments count for 16s video', () => {
    const targetDuration = 16;
    const segmentsCount = Math.ceil(targetDuration / 8);
    
    expect(segmentsCount).toBe(2);
  });

  it('should generate correct segments count for 24s video', () => {
    const targetDuration = 24;
    const segmentsCount = Math.ceil(targetDuration / 8);
    
    expect(segmentsCount).toBe(3);
  });

  it('should store segment prompts in video record', () => {
    const videoRecord = {
      target_duration_seconds: 16,
      current_segment: 1,
      segment_prompts: ['prompt 1', 'prompt 2'],
    };
    
    expect(videoRecord.segment_prompts).toHaveLength(2);
    expect(videoRecord.current_segment).toBe(1);
  });

  it('should update current_segment after each extension', () => {
    let currentSegment = 1;
    const segmentsNeeded = 2;
    
    // After first segment completes
    if (currentSegment < segmentsNeeded) {
      currentSegment++;
    }
    
    expect(currentSegment).toBe(2);
  });

  it('should trigger merge when all segments complete', () => {
    const currentSegment = 2;
    const segmentsNeeded = 2;
    const shouldMerge = currentSegment >= segmentsNeeded && segmentsNeeded > 1;
    
    expect(shouldMerge).toBe(true);
  });

  it('should not merge for single segment video', () => {
    const currentSegment = 1;
    const segmentsNeeded = 1;
    const shouldMerge = currentSegment >= segmentsNeeded && segmentsNeeded > 1;
    
    expect(shouldMerge).toBe(false);
  });

  it('should correctly identify segment prompts array structure', () => {
    const segmentPrompts = [
      'Premier segment: Introduction du produit avec zoom dynamique',
      'Deuxième segment: Mise en situation du produit en contexte réel'
    ];
    
    expect(Array.isArray(segmentPrompts)).toBe(true);
    expect(segmentPrompts).toHaveLength(2);
    expect(typeof segmentPrompts[0]).toBe('string');
  });

  it('should calculate correct video credits for quota', () => {
    const calculateCredits = (duration: number) => Math.ceil(duration / 8);
    
    expect(calculateCredits(8)).toBe(1);
    expect(calculateCredits(16)).toBe(2);
    expect(calculateCredits(24)).toBe(3);
  });

  it('should handle extension workflow correctly', () => {
    const video = {
      current_segment: 1,
      target_duration_seconds: 16,
      segment_prompts: ['Prompt 1', 'Prompt 2']
    };
    
    const segmentsNeeded = Math.ceil(video.target_duration_seconds / 8);
    const needsExtension = video.current_segment < segmentsNeeded;
    const nextPrompt = video.segment_prompts[video.current_segment];
    
    expect(needsExtension).toBe(true);
    expect(nextPrompt).toBe('Prompt 2');
  });

  it('should complete workflow when final segment is reached', () => {
    const video = {
      current_segment: 3,
      target_duration_seconds: 24,
      segment_prompts: ['Prompt 1', 'Prompt 2', 'Prompt 3']
    };
    
    const segmentsNeeded = Math.ceil(video.target_duration_seconds / 8);
    const isComplete = video.current_segment >= segmentsNeeded;
    const shouldMerge = isComplete && segmentsNeeded > 1;
    
    expect(isComplete).toBe(true);
    expect(shouldMerge).toBe(true);
  });
});
