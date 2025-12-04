import { test, expect } from '@playwright/test';

/**
 * Tests du flow d'abonnement
 * Les tests nécessitant l'authentification sont skippés en CI
 */
test.describe('Subscription Flow', () => {
  
  test('should navigate to pricing page', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page).toHaveURL('/pricing');

    // Should display all three plan cards
    await expect(page.locator('text=Free')).toBeVisible();
    await expect(page.locator('text=Pro')).toBeVisible();
    await expect(page.locator('text=Business')).toBeVisible();
  });

  test('should show prices on pricing page', async ({ page }) => {
    await page.goto('/pricing');
    
    // Should show prices
    await expect(page.locator('text=100€')).toBeVisible(); // Pro price
    await expect(page.locator('text=350€')).toBeVisible(); // Business price
  });
});

test.describe('Subscription Flow - Authenticated', () => {
  // Skip tous les tests car ils nécessitent l'authentification
  test.skip(true, 'Ces tests nécessitent une authentification Google OAuth');

  test.beforeEach(async ({ page }) => {
    await page.goto('/app');
  });

  test('should display subscription counter in dashboard header', async ({ page }) => {
    await page.waitForSelector('[data-testid="subscription-counter"]', { timeout: 10000 });
    const counter = page.locator('[data-testid="subscription-counter"]');
    await expect(counter).toBeVisible();
  });

  test('should open quota exceeded dialog when quota is reached', async ({ page }) => {
    const generateButton = page.locator('button:has-text("Générer")').first();
    if (await generateButton.isVisible()) {
      await generateButton.click();
    }
    await expect(page.locator('text=Quota mensuel atteint')).toBeVisible({ timeout: 5000 });
  });
});
