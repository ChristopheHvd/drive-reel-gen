import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Image Upload Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Authentification Google (mock ou réel selon config)
    await page.goto('/auth');
    // Attendre redirection vers dashboard après auth
    // Note: En environnement de test, vous devrez configurer l'auth mock
  });

  test('should upload image automatically on file selection', async ({ page }) => {
    await page.goto('/app');
    
    // Attendre que le dashboard charge
    await expect(page.locator('h1')).toContainText('Daft Funk');
    
    // Préparer un fichier test
    const testImagePath = path.join(__dirname, '..', 'test-fixtures', 'test-image.jpg');
    
    // Sélectionner un fichier via l'input
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testImagePath);
    
    // Vérifier que l'upload démarre automatiquement
    await expect(page.getByText(/upload en cours/i)).toBeVisible({ timeout: 5000 });
    
    // Vérifier succès (toast ou message)
    await expect(page.getByText(/uploadée/i)).toBeVisible({ timeout: 15000 });
    
    // Vérifier que l'image apparaît dans la grid
    await expect(page.locator('[data-testid="image-card"]')).toBeVisible({ timeout: 5000 });
  });

  test('should support drag and drop upload', async ({ page }) => {
    await page.goto('/app');
    
    // Attendre que le dashboard charge
    await expect(page.locator('h1')).toContainText('Daft Funk');
    
    // Vérifier que la zone de drop est présente
    const dropZone = page.locator('text=Glissez vos images ici');
    await expect(dropZone).toBeVisible();
    
    // Note: Le test complet du drag'n'drop nécessiterait une configuration
    // plus avancée avec des fichiers DataTransfer en Playwright
  });
});
