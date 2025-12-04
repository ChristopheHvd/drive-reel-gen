import { test, expect } from '@playwright/test';

/**
 * Tests du flow d'upload d'images
 * Ces tests nécessitent une authentification - skippés en CI
 */
test.describe('Image Upload Flow', () => {
  // Skip tous les tests car ils nécessitent l'authentification
  test.skip(true, 'Ces tests nécessitent une authentification Google OAuth');

  test.beforeEach(async ({ page }) => {
    await page.goto('/app');
  });

  test('should upload image automatically on file selection', async ({ page }) => {
    // Vérifier que le dashboard charge
    await expect(page.getByText('Mes Images')).toBeVisible();
    
    // Sélectionner un fichier via l'input
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeVisible();
  });

  test('should support drag and drop upload', async ({ page }) => {
    // Vérifier que le dashboard charge
    await expect(page.getByText('Mes Images')).toBeVisible();
    
    // Vérifier que la zone d'upload est présente
    const uploadArea = page.locator('[data-testid="image-uploader"]');
    await expect(uploadArea).toBeVisible();
  });
});
