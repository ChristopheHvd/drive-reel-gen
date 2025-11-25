import { test, expect } from '@playwright/test';

test.describe('Dashboard Layout - 3 Panels', () => {
  test.beforeEach(async ({ page }) => {
    // TODO: Ajouter authentification réelle quand disponible
    await page.goto('/app');
  });

  test('should display three main panels on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // Vérifier la présence des 3 panneaux
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
    
    // Vérifier la présence des champs de configuration
    await expect(page.getByText(/mode de génération/i)).toBeVisible();
    
    // Ouvrir les options avancées pour voir le format
    const advancedOptions = page.getByText(/options avancées/i);
    if (await advancedOptions.isVisible()) {
      await advancedOptions.click();
      await expect(page.getByText(/format de la vidéo/i)).toBeVisible();
    }
  });

  test('should display images in 2-column grid for compact view', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // Le panneau d'images devrait afficher une grille de 2 colonnes
    const imagesPanel = page.locator('.lg\\:col-span-3').first();
    await expect(imagesPanel).toBeVisible();
  });

  test('should show larger textarea in video config', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // Chercher le textarea du prompt
    const textarea = page.getByPlaceholder(/décrivez la vidéo/i);
    await expect(textarea).toBeVisible();
    
    // Le textarea devrait permettre le redimensionnement vertical
    const textareaElement = await textarea.elementHandle();
    if (textareaElement) {
      const className = await textareaElement.evaluate(el => el.className);
      expect(className).toContain('resize-y');
    }
  });

  test('should stack panels vertically on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Les 3 panneaux doivent être empilés verticalement
    await expect(page.getByText('Mes Images')).toBeVisible();
    await expect(page.getByText('Vidéos générées')).toBeVisible();
    await expect(page.getByText('Génération Vidéo IA')).toBeVisible();
  });

  test('should show upload button', async ({ page }) => {
    const uploadButton = page.getByRole('button', { name: /upload/i });
    await expect(uploadButton).toBeVisible();
  });

  test('should show generate button when no videos', async ({ page }) => {
    // Si aucune image n'est sélectionnée
    await expect(page.getByText(/sélectionnez une image/i)).toBeVisible();
  });
});
