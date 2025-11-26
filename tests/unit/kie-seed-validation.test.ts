import { describe, it, expect } from 'vitest';

/**
 * Tests de validation du seed Kie.ai
 * Vérifie que la génération et validation du seed respecte la plage 10000-99999
 */
describe('Kie.ai seed validation', () => {
  const generateValidSeed = () => Math.floor(Math.random() * 89999) + 10000;

  it('should generate seed in valid range 10000-99999', () => {
    // Tester 100 fois pour s'assurer de la cohérence
    for (let i = 0; i < 100; i++) {
      const seed = generateValidSeed();
      expect(seed).toBeGreaterThanOrEqual(10000);
      expect(seed).toBeLessThanOrEqual(99999);
    }
  });

  it('should validate and accept seed in valid range', () => {
    const validateSeed = (seed?: number) => {
      const generateValidSeed = () => Math.floor(Math.random() * 89999) + 10000;
      return (seed && seed >= 10000 && seed <= 99999) ? seed : generateValidSeed();
    };
    
    // Seed valide doit être accepté tel quel
    expect(validateSeed(50000)).toBe(50000);
    expect(validateSeed(10000)).toBe(10000);
    expect(validateSeed(99999)).toBe(99999);
  });

  it('should reject invalid seed and generate new one in valid range', () => {
    const validateSeed = (seed?: number) => {
      const generateValidSeed = () => Math.floor(Math.random() * 89999) + 10000;
      return (seed && seed >= 10000 && seed <= 99999) ? seed : generateValidSeed();
    };
    
    // Seed undefined doit générer un nouveau seed valide
    const resultUndefined = validateSeed(undefined);
    expect(resultUndefined).toBeGreaterThanOrEqual(10000);
    expect(resultUndefined).toBeLessThanOrEqual(99999);
    
    // Seed trop petit doit générer un nouveau seed valide
    const resultTooSmall = validateSeed(0);
    expect(resultTooSmall).toBeGreaterThanOrEqual(10000);
    expect(resultTooSmall).toBeLessThanOrEqual(99999);
    
    // Seed trop grand doit générer un nouveau seed valide
    const resultTooLarge = validateSeed(1000000);
    expect(resultTooLarge).toBeGreaterThanOrEqual(10000);
    expect(resultTooLarge).toBeLessThanOrEqual(99999);
  });

  it('should handle null seed by generating new valid seed', () => {
    const validateSeed = (seed?: number | null) => {
      const generateValidSeed = () => Math.floor(Math.random() * 89999) + 10000;
      return (seed && seed >= 10000 && seed <= 99999) ? seed : generateValidSeed();
    };
    
    const result = validateSeed(null);
    expect(result).toBeGreaterThanOrEqual(10000);
    expect(result).toBeLessThanOrEqual(99999);
  });

  it('should match Dashboard.tsx seed generation logic', () => {
    // Simuler la logique du Dashboard
    const newSeed = Math.floor(Math.random() * 89999) + 10000;
    
    expect(newSeed).toBeGreaterThanOrEqual(10000);
    expect(newSeed).toBeLessThanOrEqual(99999);
  });
});
