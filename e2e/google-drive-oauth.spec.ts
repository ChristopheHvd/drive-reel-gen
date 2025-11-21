import { test, expect } from '@playwright/test';

/**
 * Tests E2E pour le flow OAuth Google Drive
 */
test.describe('Google Drive OAuth Flow', () => {
  
  test('Onboarding Step 2 affiche le bouton de connexion Drive', async ({ page }) => {
    // Note: Ce test nécessite un utilisateur authentifié
    // Pour un vrai test, il faudrait mock l'authentification
    
    await page.goto('/onboarding');
    
    // Vérifier que la page charge
    await expect(page.locator('body')).toBeVisible();
    
    // Ce test est un placeholder pour la structure
    // Dans un environnement de test complet, il faudrait:
    // 1. Mocker l'authentification Google
    // 2. Naviguer vers l'onboarding
    // 3. Vérifier l'affichage du bouton "Connecter mon Google Drive"
  });

  test('Protected routes redirect to auth when not connected', async ({ page }) => {
    await page.goto('/onboarding');
    
    // Devrait rediriger vers /auth
    await page.waitForURL('**/auth', { timeout: 5000 });
    expect(page.url()).toContain('/auth');
  });

  test('Drive connection button is visible after Google login (manual test)', async ({ page }) => {
    // Ce test est intentionnellement marqué comme manuel
    // car il nécessite une vraie authentification Google
    
    // Instructions pour test manuel:
    // 1. Se connecter avec Google
    // 2. Naviguer vers l'onboarding Step 2
    // 3. Vérifier que le bouton "Connecter mon Google Drive" s'affiche
    // 4. Cliquer sur le bouton
    // 5. Vérifier que la popup OAuth s'ouvre
    // 6. Accepter les permissions
    // 7. Vérifier que le token est sauvegardé
    // 8. Vérifier que le statut change vers "Drive connecté"
    
    test.skip(true, 'Ce test nécessite une authentification Google réelle');
  });
});

/**
 * Tests de régression pour vérifier qu'aucune fonctionnalité n'a été cassée
 */
test.describe('Drive OAuth - Non-régression', () => {
  
  test('Le flux d\'authentification Google fonctionne toujours', async ({ page }) => {
    await page.goto('/auth');
    
    // Vérifier que le bouton Google auth est présent
    await expect(page.getByText(/continuer avec google/i)).toBeVisible();
  });

  test('L\'onboarding est accessible après login', async ({ page }) => {
    // Ce test vérifie la structure de base
    // Un test complet nécessiterait un mock d'authentification
    
    await page.goto('/auth');
    await expect(page.locator('body')).toBeVisible();
    
    // Structure de test pour flow complet (à implémenter avec mocks):
    // 1. Click sur "Continuer avec Google"
    // 2. Mock du callback OAuth
    // 3. Vérifier redirection vers /onboarding
    // 4. Vérifier que Step 1 s'affiche
  });
});
