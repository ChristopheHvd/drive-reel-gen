import { test, expect } from '@playwright/test';

/**
 * Tests du layout Dashboard
 * Ces tests nécessitent une authentification - skippés en CI
 * car l'auth Google OAuth ne peut pas être simulée facilement
 */
test.describe('Dashboard Layout - 3 Panels', () => {
  // Skip tous les tests car ils nécessitent l'authentification
  test.skip(true, 'Ces tests nécessitent une authentification Google OAuth');

  test.beforeEach(async ({ page }) => {
    await page.goto('/app');
  });

  test('should display three main panels on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.getByText('Mes Images')).toBeVisible();
    await expect(page.getByText('Vidéos générées')).toBeVisible();
    await expect(page.getByText('Génération Vidéo IA')).toBeVisible();
  });

  test('should show image grid in left panel', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    const leftPanel = page.locator('text=Mes Images').locator('..');
    await expect(leftPanel).toBeVisible();
  });

  test('should show video list in center panel', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    const centerPanel = page.locator('text=Vidéos générées').locator('..');
    await expect(centerPanel).toBeVisible();
  });

  test('should show config form in right panel', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    const rightPanel = page.locator('text=Génération Vidéo IA').locator('..');
    await expect(rightPanel).toBeVisible();
  });

  test('should stack panels vertically on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.getByText('Mes Images')).toBeVisible();
  });
});
