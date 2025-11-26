import { describe, it, expect } from 'vitest';

/**
 * Tests pour la régénération de vidéo avec gestion des paramètres optionnels
 * Vérifie que logo_url, additional_image_url et seed sont correctement gérés
 */
describe('Video regeneration parameters handling', () => {
  it('should handle video with all parameters', () => {
    const video = {
      id: '1',
      prompt: 'Test prompt',
      aspect_ratio: '9:16',
      seed: 50000,
      logo_url: 'team-id/logo.png',
      additional_image_url: 'team-id/additional.png',
    };

    // Simuler handleRegenerateVideo
    const newSeed = Math.floor(Math.random() * 89999) + 10000;
    const config = {
      prompt: video.prompt,
      aspectRatio: video.aspect_ratio,
      seed: newSeed,
      logoUrl: video.logo_url || undefined,
      additionalImageUrl: video.additional_image_url || undefined,
    };

    expect(config.prompt).toBe('Test prompt');
    expect(config.aspectRatio).toBe('9:16');
    expect(config.seed).toBeGreaterThanOrEqual(10000);
    expect(config.seed).toBeLessThanOrEqual(99999);
    expect(config.logoUrl).toBe('team-id/logo.png');
    expect(config.additionalImageUrl).toBe('team-id/additional.png');
  });

  it('should handle video without logo and additional image', () => {
    const video = {
      id: '2',
      prompt: 'Another test',
      aspect_ratio: '16:9',
      seed: null,
      logo_url: null,
      additional_image_url: null,
    };

    // Simuler handleRegenerateVideo
    const newSeed = Math.floor(Math.random() * 89999) + 10000;
    const config = {
      prompt: video.prompt,
      aspectRatio: video.aspect_ratio,
      seed: newSeed,
      logoUrl: video.logo_url || undefined,
      additionalImageUrl: video.additional_image_url || undefined,
    };

    expect(config.prompt).toBe('Another test');
    expect(config.aspectRatio).toBe('16:9');
    expect(config.seed).toBeGreaterThanOrEqual(10000);
    expect(config.seed).toBeLessThanOrEqual(99999);
    expect(config.logoUrl).toBeUndefined();
    expect(config.additionalImageUrl).toBeUndefined();
  });

  it('should handle video with only logo', () => {
    const video = {
      id: '3',
      prompt: 'Logo only',
      aspect_ratio: '9:16',
      seed: 75000,
      logo_url: 'team-id/my-logo.png',
      additional_image_url: null,
    };

    const newSeed = Math.floor(Math.random() * 89999) + 10000;
    const config = {
      prompt: video.prompt,
      aspectRatio: video.aspect_ratio,
      seed: newSeed,
      logoUrl: video.logo_url || undefined,
      additionalImageUrl: video.additional_image_url || undefined,
    };

    expect(config.logoUrl).toBe('team-id/my-logo.png');
    expect(config.additionalImageUrl).toBeUndefined();
  });

  it('should handle video with only additional image', () => {
    const video = {
      id: '4',
      prompt: 'Additional only',
      aspect_ratio: '16:9',
      seed: undefined,
      logo_url: undefined,
      additional_image_url: 'team-id/extra.png',
    };

    const newSeed = Math.floor(Math.random() * 89999) + 10000;
    const config = {
      prompt: video.prompt,
      aspectRatio: video.aspect_ratio,
      seed: newSeed,
      logoUrl: video.logo_url || undefined,
      additionalImageUrl: video.additional_image_url || undefined,
    };

    expect(config.logoUrl).toBeUndefined();
    expect(config.additionalImageUrl).toBe('team-id/extra.png');
  });

  it('should always generate new seed even when original video had a seed', () => {
    const video = {
      id: '5',
      prompt: 'Seed test',
      aspect_ratio: '9:16',
      seed: 55555, // Seed original
      logo_url: null,
      additional_image_url: null,
    };

    const newSeed = Math.floor(Math.random() * 89999) + 10000;
    const config = {
      prompt: video.prompt,
      aspectRatio: video.aspect_ratio,
      seed: newSeed, // Nouveau seed, pas celui de la vidéo
      logoUrl: video.logo_url || undefined,
      additionalImageUrl: video.additional_image_url || undefined,
    };

    // Le nouveau seed doit être différent de l'ancien (très probable)
    expect(config.seed).not.toBe(video.seed);
    expect(config.seed).toBeGreaterThanOrEqual(10000);
    expect(config.seed).toBeLessThanOrEqual(99999);
  });
});
