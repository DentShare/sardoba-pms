import { test, expect } from '@playwright/test';

test.describe('Public Booking Page', () => {
  // Public booking pages do not require authentication
  test.use({ storageState: { cookies: [], origins: [] } });

  test('should show 404 or error for non-existent hotel slug', async ({
    page,
  }) => {
    const response = await page.goto('/book/non-existent-hotel-slug');

    // The page should indicate the hotel was not found.
    // This could be a 404 status, or an in-page "not found" message.
    const notFoundVisible = await page
      .getByText(/not found|не найден|404|ошибка/i)
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    if (!notFoundVisible) {
      // If no in-page message, verify the HTTP status is 404
      expect(response?.status()).toBe(404);
    }
  });

  test('should allow access to /book path without authentication', async ({
    page,
  }) => {
    // The middleware matcher excludes /book/* from auth redirects
    await page.goto('/book/test-hotel');

    // Should NOT be redirected to /login
    expect(page.url()).not.toMatch(/\/login/);
  });
});
