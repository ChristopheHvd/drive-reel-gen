import { test, expect } from '@playwright/test';

test.describe('Invitation Email Pre-fill', () => {
  test('pre-fills email on auth page when coming from invitation link', async ({ page }) => {
    const invitedEmail = 'invited.user@example.com';
    const inviteToken = 'test-token-123';
    
    // Navigate to auth page with invite token and email
    await page.goto(`/auth?invite=${inviteToken}&email=${encodeURIComponent(invitedEmail)}`);
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Should show the invitation context message
    await expect(page.getByText(/invitation envoyée à/i)).toBeVisible();
    await expect(page.getByText(invitedEmail)).toBeVisible();
    
    // Should default to signup tab (shows "Nom complet" field)
    await expect(page.getByLabel(/nom complet/i)).toBeVisible();
    
    // Email field should be pre-filled and disabled
    const emailInput = page.getByLabel(/^email$/i);
    await expect(emailInput).toHaveValue(invitedEmail);
    await expect(emailInput).toBeDisabled();
    
    // Lock icon should be visible (the field should have readonly styling)
    await expect(emailInput).toHaveAttribute('readonly');
  });

  test('shows helper text explaining email is locked to invitation', async ({ page }) => {
    const invitedEmail = 'test@company.com';
    
    await page.goto(`/auth?invite=abc&email=${encodeURIComponent(invitedEmail)}`);
    await page.waitForLoadState('networkidle');
    
    // Should show helper text
    await expect(page.getByText(/l'invitation est liée à cet email/i)).toBeVisible();
  });

  test('allows normal email input when no invitation email provided', async ({ page }) => {
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');
    
    // Click on signup tab
    await page.getByRole('tab', { name: /inscription/i }).click();
    
    // Email field should be editable
    const emailInput = page.getByLabel(/^email$/i);
    await expect(emailInput).not.toBeDisabled();
    await expect(emailInput).not.toHaveAttribute('readonly');
    
    // Should be able to type in email
    await emailInput.fill('myemail@test.com');
    await expect(emailInput).toHaveValue('myemail@test.com');
  });

  test('login form also pre-fills email from invitation', async ({ page }) => {
    const invitedEmail = 'returning.user@example.com';
    
    await page.goto(`/auth?invite=token123&email=${encodeURIComponent(invitedEmail)}`);
    await page.waitForLoadState('networkidle');
    
    // Switch to login tab
    await page.getByRole('tab', { name: /connexion/i }).click();
    
    // Email field should be pre-filled and disabled on login form too
    const emailInput = page.getByLabel(/email/i);
    await expect(emailInput).toHaveValue(invitedEmail);
    await expect(emailInput).toBeDisabled();
  });

  test('shows "Rejoindre une équipe" title when invite token present', async ({ page }) => {
    await page.goto('/auth?invite=some-token');
    await page.waitForLoadState('networkidle');
    
    await expect(page.getByRole('heading', { name: /rejoindre une équipe/i })).toBeVisible();
  });

  test('shows "Bienvenue" title when no invite token', async ({ page }) => {
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');
    
    await expect(page.getByRole('heading', { name: /bienvenue/i })).toBeVisible();
  });
});
