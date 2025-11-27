import { test, expect } from '@playwright/test';

/**
 * Tests E2E pour la sélection de durée vidéo
 * Note: Ces tests nécessitent une authentification complète
 */
test.describe('Video Duration Selection', () => {
  test.beforeEach(async ({ page }) => {
    // TODO: Implémenter l'authentification pour ces tests
    test.skip(true, 'Requires authentication setup');
  });

  test('should display duration options in advanced settings', async ({ page }) => {
    await page.goto('/app');
    
    // Ouvrir les options avancées
    await page.click('text=Options avancées');
    
    // Vérifier que les 3 options de durée sont présentes
    await expect(page.locator('text=8 secondes')).toBeVisible();
    await expect(page.locator('text=16 secondes')).toBeVisible();
    await expect(page.locator('text=24 secondes')).toBeVisible();
  });

  test('should persist duration selection in localStorage', async ({ page }) => {
    await page.goto('/app');
    
    // Sélectionner 16s
    await page.click('text=Options avancées');
    await page.click('text=16 secondes');
    
    // Vérifier localStorage
    const duration = await page.evaluate(() => {
      return localStorage.getItem('daftfunk-video-duration');
    });
    
    expect(duration).toBe('16');
  });

  test('should show quota warning for 16s option', async ({ page }) => {
    await page.goto('/app');
    
    await page.click('text=Options avancées');
    await page.hover('[value="16"]');
    
    // Vérifier le tooltip indiquant 2 crédits
    await expect(page.locator('text=/compte pour 2 vidéos/i')).toBeVisible();
  });

  test('should show quota warning for 24s option', async ({ page }) => {
    await page.goto('/app');
    
    await page.click('text=Options avancées');
    await page.hover('[value="24"]');
    
    // Vérifier le tooltip indiquant 3 crédits
    await expect(page.locator('text=/compte pour 3 vidéos/i')).toBeVisible();
  });

  test('should default to 8s when no localStorage value', async ({ page }) => {
    // Nettoyer localStorage
    await page.evaluate(() => {
      localStorage.removeItem('daftfunk-video-duration');
    });
    
    await page.goto('/app');
    
    // Vérifier que 8s est sélectionné par défaut
    await page.click('text=Options avancées');
    const selectedDuration = await page.locator('[name="duration"]:checked').getAttribute('value');
    
    expect(selectedDuration).toBe('8');
  });
});
