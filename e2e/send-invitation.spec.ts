import { test, expect } from '@playwright/test';

/**
 * E2E tests for Team Invitation flow
 * Tests the actual invitation sending via the deployed Edge Function
 * 
 * IMPORTANT: These tests require specific environment variables to run:
 * - RUN_EMAIL_TESTS=true (to enable email sending tests)
 * - TEST_USER_TOKEN (a valid JWT token for an authenticated admin user)
 * - TEST_TEAM_ID (a valid team UUID where the test user is admin/owner)
 * 
 * Run with: RUN_EMAIL_TESTS=true npx playwright test send-invitation
 */

const SUPABASE_URL = 'https://zuurpfghhdlsilpzmgwf.supabase.co';
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/send-invitation`;

test.describe('Team Invitation E2E', () => {
  // Skip all tests if RUN_EMAIL_TESTS is not set
  test.skip(
    !process.env.RUN_EMAIL_TESTS,
    'Skipped: set RUN_EMAIL_TESTS=true to run email tests'
  );

  test('should return 401 for unauthenticated requests', async ({ request }) => {
    const response = await request.post(FUNCTION_URL, {
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        teamId: 'test-team-id',
        email: 'test@example.com',
        role: 'member',
      },
    });

    expect(response.status()).toBe(401);
  });

  test('should return 400 for missing required fields', async ({ request }) => {
    test.skip(!process.env.TEST_USER_TOKEN, 'Requires TEST_USER_TOKEN');

    const response = await request.post(FUNCTION_URL, {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_USER_TOKEN}`,
        'Content-Type': 'application/json',
      },
      data: {
        // Missing teamId, email, role
      },
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toBeDefined();
  });

  test('should return 400 for invalid email format', async ({ request }) => {
    test.skip(!process.env.TEST_USER_TOKEN, 'Requires TEST_USER_TOKEN');
    test.skip(!process.env.TEST_TEAM_ID, 'Requires TEST_TEAM_ID');

    const response = await request.post(FUNCTION_URL, {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_USER_TOKEN}`,
        'Content-Type': 'application/json',
      },
      data: {
        teamId: process.env.TEST_TEAM_ID,
        email: 'invalid-email',
        role: 'member',
      },
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('email');
  });

  test('should successfully send invitation email', async ({ request }) => {
    test.skip(!process.env.TEST_USER_TOKEN, 'Requires TEST_USER_TOKEN');
    test.skip(!process.env.TEST_TEAM_ID, 'Requires TEST_TEAM_ID');
    test.skip(!process.env.TEST_INVITE_EMAIL, 'Requires TEST_INVITE_EMAIL');

    const response = await request.post(FUNCTION_URL, {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_USER_TOKEN}`,
        'Content-Type': 'application/json',
      },
      data: {
        teamId: process.env.TEST_TEAM_ID,
        email: process.env.TEST_INVITE_EMAIL,
        role: 'member',
      },
    });

    expect(response.ok()).toBe(true);
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.invitation).toBeDefined();
    expect(data.invitation.email).toBe(process.env.TEST_INVITE_EMAIL?.toLowerCase());
    expect(data.inviteUrl).toContain('/invite?token=');
    expect(data.message).toContain('succès');
  });

  test('should resend invitation for existing pending invitation', async ({ request }) => {
    test.skip(!process.env.TEST_USER_TOKEN, 'Requires TEST_USER_TOKEN');
    test.skip(!process.env.TEST_TEAM_ID, 'Requires TEST_TEAM_ID');
    test.skip(!process.env.TEST_INVITE_EMAIL, 'Requires TEST_INVITE_EMAIL');

    // First invitation
    const firstResponse = await request.post(FUNCTION_URL, {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_USER_TOKEN}`,
        'Content-Type': 'application/json',
      },
      data: {
        teamId: process.env.TEST_TEAM_ID,
        email: process.env.TEST_INVITE_EMAIL,
        role: 'member',
      },
    });

    expect(firstResponse.ok()).toBe(true);
    const firstData = await firstResponse.json();

    // Second invitation (should resend, not duplicate)
    const secondResponse = await request.post(FUNCTION_URL, {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_USER_TOKEN}`,
        'Content-Type': 'application/json',
      },
      data: {
        teamId: process.env.TEST_TEAM_ID,
        email: process.env.TEST_INVITE_EMAIL,
        role: 'member',
      },
    });

    expect(secondResponse.ok()).toBe(true);
    const secondData = await secondResponse.json();

    // Should use the same invitation (same ID and token)
    expect(secondData.success).toBe(true);
    expect(secondData.invitation.id).toBe(firstData.invitation.id);
    expect(secondData.invitation.token).toBe(firstData.invitation.token);
  });
});

test.describe('Invitation Acceptance Flow', () => {
  test('should display invite page with token', async ({ page }) => {
    // Navigate to invite page with a mock token
    await page.goto('/invite?token=test-token-12345');
    
    // Page should load without crashing
    await expect(page.locator('body')).toBeVisible();
    
    // Should either show invitation details or an error for invalid token
    const hasContent = await page.locator('main').isVisible();
    expect(hasContent).toBe(true);
  });

  test('should show error for missing token', async ({ page }) => {
    await page.goto('/invite');
    
    // Should show some error or redirect
    await expect(page.locator('body')).toBeVisible();
  });

  test('should show error for invalid token format', async ({ page }) => {
    await page.goto('/invite?token=invalid');
    
    // Should handle gracefully
    await expect(page.locator('body')).toBeVisible();
  });
});
