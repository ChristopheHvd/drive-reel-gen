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

  test('Auth page loads correctly', async ({ page }) => {
    await page.goto('/auth');
    
    // Vérifier que le bouton Google auth est présent
    await expect(page.getByText(/continuer avec google/i)).toBeVisible();
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
    // Essayer d'accéder au dashboard sans être connecté
    await page.goto('/app');
    
    // Devrait rediriger vers /auth
    await page.waitForURL('**/auth');
    expect(page.url()).toContain('/auth');
  });

  test('Logo and branding visible on all pages', async ({ page }) => {
    const routes = ['/', '/auth', '/pricing'];
    
    for (const route of routes) {
      await page.goto(route);
      
      // Vérifier que le logo ou le nom "Daft Funk" est visible
      const brandingVisible = await page.getByText(/daft funk/i).isVisible();
      expect(brandingVisible).toBe(true);
    }
  });
});
