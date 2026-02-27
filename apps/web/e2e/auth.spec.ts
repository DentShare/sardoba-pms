import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  // Reset auth state so these tests run as an unauthenticated user
  test.use({ storageState: { cookies: [], origins: [] } });

  test('should show login page with email and password fields', async ({ page }) => {
    await page.goto('/login');

    // Heading: "Вход в систему"
    await expect(
      page.getByRole('heading', { name: /вход|login/i }),
    ).toBeVisible();

    // Email input
    await expect(page.getByLabel(/email/i)).toBeVisible();

    // Password input ("Пароль")
    await expect(page.getByLabel(/пароль|password/i)).toBeVisible();

    // Submit button ("Войти")
    await expect(
      page.getByRole('button', { name: /войти|login/i }),
    ).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel(/email/i).fill('wrong@email.com');
    await page.getByLabel(/пароль|password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /войти|login/i }).click();

    // The login page shows "Неверный email или пароль" or a server-provided message
    await expect(
      page.getByText(/неверн|invalid|ошибка|error/i),
    ).toBeVisible({ timeout: 5000 });
  });

  test('should show validation when fields are empty', async ({ page }) => {
    await page.goto('/login');

    // Click submit without filling anything
    await page.getByRole('button', { name: /войти|login/i }).click();

    // The form sets error "Заполните все поля" when email/password are empty
    // However, the HTML inputs have `required`, so the browser may block submission.
    // We verify the user stays on the login page.
    await expect(page).toHaveURL(/.*login/);
  });

  test('should redirect unauthenticated user to login', async ({ page }) => {
    await page.goto('/calendar');
    await expect(page).toHaveURL(/.*login/);
  });

  test('should redirect unauthenticated user from bookings to login', async ({ page }) => {
    await page.goto('/bookings');
    await expect(page).toHaveURL(/.*login/);
  });

  test('should prevent open redirect after login', async ({ page }) => {
    // Attempt to inject an external redirect URL
    await page.goto('/login?redirect=https://evil.com');

    await page.getByLabel(/email/i).fill('admin@sardoba.uz');
    await page.getByLabel(/пароль|password/i).fill('Admin123!');
    await page.getByRole('button', { name: /войти|login/i }).click();

    // The app sanitizes the redirect: only paths starting with "/" (not "//") are allowed
    // Should redirect to /calendar, NOT to evil.com
    await page.waitForURL('**/calendar', { timeout: 10000 });
    expect(page.url()).not.toContain('evil.com');
  });

  test('should show forgot password link', async ({ page }) => {
    await page.goto('/login');

    const forgotLink = page.getByRole('link', { name: /забыли|forgot/i });
    await expect(forgotLink).toBeVisible();
    await expect(forgotLink).toHaveAttribute('href', '/forgot-password');
  });

  test('should show register link', async ({ page }) => {
    await page.goto('/login');

    const registerLink = page.getByRole('link', {
      name: /зарегистрироваться|register|sign up/i,
    });
    await expect(registerLink).toBeVisible();
    await expect(registerLink).toHaveAttribute('href', '/register');
  });
});
