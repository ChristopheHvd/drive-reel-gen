import { test, expect } from '@playwright/test';

/**
 * Tests E2E pour la sélection de durée vidéo
 * Note: Ces tests nécessitent une authentification complète - skippés en CI
 */
test.describe.skip('Video Duration Selection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app');
  });

  test('should display duration options in advanced settings', async ({ page }) => {
    // Ouvrir les options avancées
    await page.click('text=Options avancées');
    
    // Vérifier que les 3 options de durée sont présentes
    await expect(page.locator('text=8 secondes')).toBeVisible();
    await expect(page.locator('text=16 secondes')).toBeVisible();
    await expect(page.locator('text=24 secondes')).toBeVisible();
  });

  test('should persist duration selection in localStorage', async ({ page }) => {
    // Sélectionner 16s
    await page.click('text=Options avancées');
    await page.click('text=16 secondes');
    
    // Vérifier localStorage
    const duration = await page.evaluate(() => {
      return localStorage.getItem('daftfunk-video-duration');
    });
    
    expect(duration).toBe('16');
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
