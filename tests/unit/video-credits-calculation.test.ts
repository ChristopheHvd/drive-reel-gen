import { describe, it, expect } from 'vitest';

/**
 * Tests unitaires pour le calcul des crédits vidéo
 * Règle: 1 crédit = 8 secondes de vidéo
 */
describe('Video credits calculation', () => {
  const calculateVideoCredits = (targetDurationSeconds: number) => 
    Math.ceil(targetDurationSeconds / 8);

  const canGenerateWithQuota = (
    targetDurationSeconds: number,
    videosGeneratedThisMonth: number,
    videoLimit: number
  ) => {
    const creditsNeeded = calculateVideoCredits(targetDurationSeconds);
    return videosGeneratedThisMonth + creditsNeeded <= videoLimit;
  };

  it('should cost 1 credit for 8s video', () => {
    expect(calculateVideoCredits(8)).toBe(1);
  });

  it('should cost 2 credits for 16s video', () => {
    expect(calculateVideoCredits(16)).toBe(2);
  });

  it('should cost 3 credits for 24s video', () => {
    expect(calculateVideoCredits(24)).toBe(3);
  });

  it('should cost 1 credit for 1s video (edge case)', () => {
    expect(calculateVideoCredits(1)).toBe(1);
  });

  it('should cost 2 credits for 9s video (rounding up)', () => {
    expect(calculateVideoCredits(9)).toBe(2);
  });

  it('should cost 3 credits for 17s video (rounding up)', () => {
    expect(calculateVideoCredits(17)).toBe(3);
  });

  it('should allow 24s video (3 credits) when 3 credits remain', () => {
    expect(canGenerateWithQuota(24, 3, 6)).toBe(true);
  });

  it('should block 24s video (3 credits) when only 2 credits remain', () => {
    expect(canGenerateWithQuota(24, 4, 6)).toBe(false);
  });
});
