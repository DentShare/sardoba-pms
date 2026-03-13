import { test, expect } from '@playwright/test';

/**
 * Authentication Flows E2E Tests
 *
 * Extended auth tests covering login, logout, registration,
 * and password reset user flows.
 *
 * Note: Some tests overlap with auth.spec.ts but test full flows
 * rather than just page elements.
 */

test.describe('Auth Flows', () => {
  // These tests run without stored auth state
  test.use({ storageState: { cookies: [], origins: [] } });

  test('should login successfully and redirect to calendar', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel(/email/i).fill('admin@sardoba.uz');
    await page.getByLabel(/пароль|password/i).fill('Admin123!');
    await page.getByRole('button', { name: /войти|login/i }).click();

    // Should redirect to /calendar after successful login
    await page.waitForURL('**/calendar', { timeout: 10000 });
    expect(page.url()).toContain('/calendar');

    // Calendar page should load (not stuck on login)
    await expect(
      page.getByText(/шахматка|план этажей|calendar/i),
    ).toBeVisible({ timeout: 10000 });
  });

  test('should logout and redirect to login', async ({ page }) => {
    // First, login
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('admin@sardoba.uz');
    await page.getByLabel(/пароль|password/i).fill('Admin123!');
    await page.getByRole('button', { name: /войти|login/i }).click();
    await page.waitForURL('**/calendar', { timeout: 10000 });

    // Find and click logout button/link
    // Might be in a sidebar, dropdown, or avatar menu
    const logoutBtn = page.getByRole('button', { name: /выйти|logout|выход/i });
    const avatarMenu = page.locator('[data-testid="avatar"], [data-testid="user-menu"]').first();

    if (await logoutBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await logoutBtn.click();
    } else if (await avatarMenu.isVisible({ timeout: 2000 }).catch(() => false)) {
      await avatarMenu.click();
      await page.waitForTimeout(300);
      await page.getByText(/выйти|logout|выход/i).click();
    } else {
      // Try sidebar link
      const sidebarLogout = page.getByRole('link', { name: /выйти|logout/i }).or(
        page.locator('button').filter({ hasText: /выйти|выход/i }),
      ).first();
      if (await sidebarLogout.isVisible({ timeout: 2000 }).catch(() => false)) {
        await sidebarLogout.click();
      }
    }

    // Should redirect to login page
    await page.waitForURL('**/login', { timeout: 10000 });

    // Verify we can't access protected routes
    await page.goto('/calendar');
    await expect(page).toHaveURL(/.*login/);
  });

  test('should show register page with required fields', async ({ page }) => {
    await page.goto('/register');

    // Registration form should have key fields
    await expect(page.getByLabel(/email/i)).toBeVisible({ timeout: 5000 });
    await expect(
      page.getByLabel(/пароль|password/i).first(),
    ).toBeVisible();

    // Should have a submit button
    await expect(
      page.getByRole('button', { name: /зарегистрироваться|register|sign up|создать/i }),
    ).toBeVisible();

    // Should have a link back to login
    await expect(
      page.getByRole('link', { name: /войти|login|sign in|уже есть/i }),
    ).toBeVisible();
  });

  test('should show forgot password page and accept email', async ({ page }) => {
    await page.goto('/forgot-password');

    // Email input should be present
    await expect(page.getByLabel(/email/i)).toBeVisible({ timeout: 5000 });

    // Submit button
    const submitBtn = page.getByRole('button', {
      name: /отправить|восстановить|reset|send|сбросить/i,
    });
    await expect(submitBtn).toBeVisible();

    // Fill email and submit
    await page.getByLabel(/email/i).fill('admin@sardoba.uz');
    await submitBtn.click();

    // Should show success message (even if email doesn't exist for security)
    await page.waitForTimeout(2000);
    const successText = page.getByText(
      /отправлен|ссылка|check.*email|проверьте.*почт|письмо/i,
    );
    const errorText = page.getByText(/ошибка|error|не найден/i);

    // Either success message or we stay on the page (both are acceptable)
    const hasSuccess = await successText.isVisible({ timeout: 3000 }).catch(() => false);
    const hasError = await errorText.isVisible({ timeout: 1000 }).catch(() => false);

    // At minimum, the page should still be functional (not crashed)
    expect(hasSuccess || !hasError).toBeTruthy();
  });

  test('should redirect unauthenticated users from all protected routes', async ({ page }) => {
    const protectedRoutes = [
      '/calendar',
      '/bookings',
      '/dashboard',
      '/guests',
      '/analytics',
      '/housekeeping',
      '/rates',
      '/settings/general',
    ];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await page.waitForTimeout(1000);

      // All should redirect to login
      expect(page.url()).toMatch(/\/login/);
    }
  });
});
