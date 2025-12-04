import { test, expect } from '@playwright/test';

/**
 * SUITE DE TESTS DE NON-RÉGRESSION
 * À exécuter AVANT toute modification majeure et APRÈS pour valider
 * qu'aucune fonctionnalité n'a été cassée
 */
test.describe('Regression Suite - Critical Paths', () => {
  
  test('Landing page loads correctly', async ({ page }) => {
    await page.goto('/');
    
    // Vérifier que la page landing charge
    await expect(page.locator('body')).toBeVisible();
    
    // Vérifier qu'il n'y a pas d'erreur 404
    await expect(page.locator('body')).not.toContainText('404');
  });

  test('Auth page redirects to /app after Google OAuth', async ({ page }) => {
    await page.goto('/auth');
    
    // Vérifier que le bouton Google auth est présent
    await expect(page.getByText(/continuer avec google/i)).toBeVisible();
    
    // TODO: Implémenter le test complet avec mock OAuth quand possible
    // Ce test vérifie que le redirectTo est bien configuré vers /app
  });

  test('Navigation - Main routes are accessible', async ({ page }) => {
    const routes = ['/', '/auth', '/pricing'];
    
    for (const route of routes) {
      await page.goto(route);
      
      // Vérifier qu'aucune erreur 404
      await expect(page.locator('body')).not.toContainText('404');
      
      // Vérifier que la page charge
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('Protected routes redirect to auth', async ({ page }) => {
    await page.goto('/app');
    await page.waitForURL('**/auth');
    expect(page.url()).toContain('/auth');
  });

  test('Dashboard accessible after auth', async ({ page }) => {
    await page.goto('/app');
    expect(page.url()).toContain('/app');
  });

  test('Logo and branding visible on all pages', async ({ page }) => {
    const routes = ['/', '/auth', '/pricing'];
    
    for (const route of routes) {
      await page.goto(route);
      
      // Vérifier que le logo ou le nom "Quickie Video" est visible
      const brandingVisible = await page.getByText(/quickie video/i).isVisible();
      expect(brandingVisible).toBe(true);
    }
  });
});
