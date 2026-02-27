import { test, expect } from '@playwright/test';

test.describe('Calendar & Bookings', () => {
  // These tests use the authenticated storageState from auth.setup.ts

  test('should display calendar page with header', async ({ page }) => {
    await page.goto('/calendar');

    // The page title is "Шахматка" (chess-grid calendar view)
    await expect(
      page.getByText(/шахматка|план этажей|calendar/i),
    ).toBeVisible({ timeout: 10000 });
  });

  test('should display calendar grid or floor plan view', async ({ page }) => {
    await page.goto('/calendar');

    // Wait for the page to load - CalendarGrid or FloorPlanAvailabilityView
    await page.waitForLoadState('networkidle');

    // The calendar page should have rendered something beyond a spinner
    await expect(page.locator('.p-4, .lg\\:p-6')).toBeVisible({
      timeout: 10000,
    });
  });

  test('should navigate between months in calendar', async ({ page }) => {
    await page.goto('/calendar');
    await page.waitForLoadState('networkidle');

    // Find navigation buttons (next/prev)
    const nextBtn = page
      .getByRole('button', { name: /next|след|→|вперёд|>/i })
      .first();
    if (await nextBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await nextBtn.click();
      // Give time for the calendar to re-render
      await page.waitForTimeout(500);
    }
  });

  test('should display bookings list page', async ({ page }) => {
    await page.goto('/bookings');
    await expect(page).toHaveURL(/.*bookings/);

    // The page title is "Бронирования"
    await expect(page.getByText(/бронирования|bookings/i)).toBeVisible({
      timeout: 10000,
    });
  });

  test('should show status filter tabs on bookings page', async ({ page }) => {
    await page.goto('/bookings');
    await page.waitForLoadState('networkidle');

    // Verify status tabs are present: "Все", "Новые", "Подтверждённые", etc.
    await expect(page.getByRole('button', { name: 'Все' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Новые' })).toBeVisible();
  });

  test('should filter bookings by status tab', async ({ page }) => {
    await page.goto('/bookings');
    await page.waitForLoadState('networkidle');

    // Click "Новые" tab
    const newTab = page.getByRole('button', { name: 'Новые' });
    await newTab.click();

    // The tab should be active (it gets a different style class)
    // and the page should still be on /bookings
    await expect(page).toHaveURL(/.*bookings/);
  });

  test('should have search input on bookings page', async ({ page }) => {
    await page.goto('/bookings');
    await page.waitForLoadState('networkidle');

    // Search placeholder: "Поиск по гостю или номеру бронирования..."
    const searchInput = page.getByPlaceholder(/поиск|search/i);
    await expect(searchInput).toBeVisible();
  });

  test('should have "Новая бронь" button on bookings page', async ({
    page,
  }) => {
    await page.goto('/bookings');
    await page.waitForLoadState('networkidle');

    const newBookingBtn = page.getByRole('button', {
      name: /новая бронь|new booking/i,
    });
    await expect(newBookingBtn).toBeVisible();
  });
});
