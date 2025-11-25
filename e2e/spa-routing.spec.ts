import { test, expect } from '@playwright/test';

/**
 * Tests de Non-Régression pour le Routing SPA avec BrowserRouter
 * Vérifie que toutes les routes fonctionnent correctement au refresh
 * et lors d'un accès direct via URL
 */
test.describe('SPA Routing - BrowserRouter No 404', () => {
  
  test('should load home page on direct access', async ({ page }) => {
    await page.goto('/');
    
    // Vérifier qu'on n'a pas de 404
    await expect(page.locator('body')).not.toContainText('404');
    
    // Vérifier que la page charge correctement
    await expect(page.locator('main')).toBeVisible();
  });

  test('should load pricing page on direct access', async ({ page }) => {
    await page.goto('/pricing');
    
    // Vérifier qu'on n'a pas de 404
    await expect(page.locator('body')).not.toContainText('404');
    expect(page.url()).toContain('/pricing');
    
    // Vérifier que la page charge correctement
    await expect(page.locator('main')).toBeVisible();
  });

  test('should redirect to auth when accessing /app without login', async ({ page }) => {
    await page.goto('/app');
    
    // Devrait rediriger vers /auth (car non authentifié)
    await page.waitForURL(/\/auth/);
    
    // Vérifier qu'on n'a pas de 404
    await expect(page.locator('body')).not.toContainText('404');
  });

  test('should load auth page on direct access', async ({ page }) => {
    await page.goto('/auth');
    
    // Vérifier qu'on n'a pas de 404
    await expect(page.locator('body')).not.toContainText('404');
    expect(page.url()).toContain('/auth');
    
    // Vérifier que la page d'auth charge
    await expect(page.locator('main')).toBeVisible();
  });

  test('should show NotFound component for invalid route', async ({ page }) => {
    await page.goto('/route-inexistante-xyz');
    
    // Doit afficher le composant NotFound (pas un 404 serveur)
    // Le composant NotFound doit être rendu par React Router
    await expect(page.locator('main')).toBeVisible();
    
    // Vérifier que c'est bien le composant NotFound React
    // et non une erreur 404 du serveur (BrowserRouter + vercel.json = toujours index.html)
    const response = await page.goto('/route-inexistante-xyz');
    expect(response?.status()).toBe(200); // Serveur retourne 200 car index.html
  });

  test('should handle page refresh on /pricing', async ({ page }) => {
    // Naviguer vers pricing
    await page.goto('/pricing');
    await expect(page.locator('main')).toBeVisible();
    
    // Refresh la page
    await page.reload();
    
    // Vérifier que la page charge toujours correctement
    await expect(page.locator('body')).not.toContainText('404');
    await expect(page.locator('main')).toBeVisible();
    expect(page.url()).toContain('/pricing');
  });

  test('should handle navigation between routes', async ({ page }) => {
    // Démarrer sur home
    await page.goto('/');
    await expect(page.locator('main')).toBeVisible();
    
    // Naviguer vers pricing via lien
    await page.click('a[href="/pricing"]');
    await page.waitForURL(/\/pricing/);
    expect(page.url()).toContain('/pricing');
    
    // Vérifier qu'aucune erreur 404
    await expect(page.locator('body')).not.toContainText('404');
  });
});
