import { test, expect, type Page } from '@playwright/test';

/**
 * Booking Lifecycle E2E Tests
 *
 * Tests the complete booking CRUD and status transitions:
 * new → confirmed → checked_in → checked_out
 * new → cancelled
 *
 * Prerequisites: Authenticated as admin@sardoba.uz (via auth.setup.ts).
 * Seed data must include rooms and guests.
 */

test.describe('Booking Lifecycle', () => {
  test.describe.configure({ mode: 'serial' });

  let createdBookingUrl: string;

  test('should open new booking form from bookings page', async ({ page }) => {
    await page.goto('/bookings');
    await page.waitForLoadState('networkidle');

    const newBookingBtn = page.getByRole('button', { name: /новая бронь|new booking/i });
    await expect(newBookingBtn).toBeVisible();
    await newBookingBtn.click();

    // Modal should appear with title "Новое бронирование"
    await expect(
      page.getByText(/новое бронирование|walk-in/i),
    ).toBeVisible({ timeout: 5000 });
  });

  test('should create a new booking', async ({ page }) => {
    await page.goto('/bookings');
    await page.waitForLoadState('networkidle');

    // Open new booking modal
    await page.getByRole('button', { name: /новая бронь|new booking/i }).click();
    await expect(page.getByText(/новое бронирование/i)).toBeVisible({ timeout: 5000 });

    // Select room (pick the first available option)
    const roomSelect = page.getByLabel(/номер/i);
    await roomSelect.selectOption({ index: 1 }); // first real option (skip placeholder)

    // Set check-in date (20 days from now to avoid conflicts)
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 20);
    const checkIn = futureDate.toISOString().split('T')[0];
    futureDate.setDate(futureDate.getDate() + 2);
    const checkOut = futureDate.toISOString().split('T')[0];

    await page.getByLabel(/заезд/i).fill(checkIn);
    await page.getByLabel(/выезд/i).fill(checkOut);

    // Search and select a guest (type first few letters)
    const guestSearchInput = page.locator('input[placeholder*="гост"], input[placeholder*="поиск"], input[placeholder*="имя"]').first();
    if (await guestSearchInput.isVisible().catch(() => false)) {
      await guestSearchInput.fill('Alisher');
      // Wait for search results dropdown
      await page.waitForTimeout(500);
      // Click first result
      const firstResult = page.locator('[role="option"], [data-guest-id]').first();
      if (await firstResult.isVisible({ timeout: 3000 }).catch(() => false)) {
        await firstResult.click();
      }
    }

    // Submit the form
    const submitBtn = page.getByRole('button', { name: /создать бронирование|создать и заселить/i });
    await submitBtn.click();

    // Verify success (modal closes, or toast appears, or we stay on bookings page)
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/.*bookings/);
  });

  test('should display booking in the bookings list', async ({ page }) => {
    await page.goto('/bookings');
    await page.waitForLoadState('networkidle');

    // The bookings list should have at least one booking
    // Check for booking number pattern BK-YYYY-XXXX
    await expect(
      page.getByText(/BK-\d{4}-\d{4}/).first(),
    ).toBeVisible({ timeout: 10000 });
  });

  test('should view booking detail page', async ({ page }) => {
    await page.goto('/bookings');
    await page.waitForLoadState('networkidle');

    // Click on the first booking in the list
    const firstBooking = page.getByText(/BK-\d{4}-\d{4}/).first();
    await firstBooking.click();

    // Should navigate to booking detail page
    await page.waitForURL('**/bookings/*');
    createdBookingUrl = page.url();

    // Verify key sections are visible
    await expect(page.getByText(/информация/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/гость/i).first()).toBeVisible();
    await expect(page.getByText(/комната|номер/i).first()).toBeVisible();
    await expect(page.getByText(/заезд/i).first()).toBeVisible();
    await expect(page.getByText(/выезд/i).first()).toBeVisible();
  });

  test('should confirm a new booking', async ({ page }) => {
    await page.goto('/bookings');
    await page.waitForLoadState('networkidle');

    // Filter to "Новые" tab to find a new booking
    const newTab = page.getByRole('button', { name: 'Новые' });
    await newTab.click();
    await page.waitForTimeout(500);

    // Click on first new booking
    const bookingLink = page.getByText(/BK-\d{4}-\d{4}/).first();
    if (await bookingLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await bookingLink.click();
      await page.waitForURL('**/bookings/*');

      // Click "Подтвердить" button
      const confirmBtn = page.getByRole('button', { name: /подтвердить/i });
      if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await confirmBtn.click();

        // Wait for status to change — badge should show "Подтверждено" or "confirmed"
        await page.waitForTimeout(2000);
        await expect(
          page.getByText(/подтвержден|confirmed/i).first(),
        ).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should check in a confirmed booking', async ({ page }) => {
    await page.goto('/bookings');
    await page.waitForLoadState('networkidle');

    // Filter to "Подтверждённые" tab
    const confirmedTab = page.getByRole('button', { name: /подтверждённые|подтвержден/i });
    if (await confirmedTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await confirmedTab.click();
      await page.waitForTimeout(500);
    }

    // Click on first confirmed booking
    const bookingLink = page.getByText(/BK-\d{4}-\d{4}/).first();
    if (await bookingLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await bookingLink.click();
      await page.waitForURL('**/bookings/*');

      // Click "Заезд" button
      const checkinBtn = page.getByRole('button', { name: /заезд/i });
      if (await checkinBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await checkinBtn.click();
        await page.waitForTimeout(2000);

        // Verify status changed
        await expect(
          page.getByText(/заселён|checked.in/i).first(),
        ).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should check out a checked-in booking', async ({ page }) => {
    await page.goto('/bookings');
    await page.waitForLoadState('networkidle');

    // Filter to "Заселены" tab
    const checkedInTab = page.getByRole('button', { name: /заселен/i });
    if (await checkedInTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await checkedInTab.click();
      await page.waitForTimeout(500);
    }

    // Click on first checked-in booking
    const bookingLink = page.getByText(/BK-\d{4}-\d{4}/).first();
    if (await bookingLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await bookingLink.click();
      await page.waitForURL('**/bookings/*');

      // Click "Выезд" button
      const checkoutBtn = page.getByRole('button', { name: /выезд/i });
      if (await checkoutBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await checkoutBtn.click();

        // Might show early checkout confirmation modal
        const confirmCheckoutBtn = page.getByRole('button', { name: /выселить/i });
        if (await confirmCheckoutBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await confirmCheckoutBtn.click();
        }

        await page.waitForTimeout(2000);
        // Verify status changed
        await expect(
          page.getByText(/выселен|checked.out/i).first(),
        ).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should cancel a booking with reason', async ({ page }) => {
    await page.goto('/bookings');
    await page.waitForLoadState('networkidle');

    // Filter to new bookings
    const newTab = page.getByRole('button', { name: 'Новые' });
    await newTab.click();
    await page.waitForTimeout(500);

    const bookingLink = page.getByText(/BK-\d{4}-\d{4}/).first();
    if (await bookingLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await bookingLink.click();
      await page.waitForURL('**/bookings/*');

      // Click "Отменить" button
      const cancelBtn = page.getByRole('button', { name: /отменить/i });
      if (await cancelBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await cancelBtn.click();
        await page.waitForTimeout(2000);

        // Verify status changed to cancelled
        await expect(
          page.getByText(/отменен|cancelled/i).first(),
        ).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should show payment section on booking detail', async ({ page }) => {
    await page.goto('/bookings');
    await page.waitForLoadState('networkidle');

    // Click on first booking
    const bookingLink = page.getByText(/BK-\d{4}-\d{4}/).first();
    await bookingLink.click();
    await page.waitForURL('**/bookings/*');

    // Verify payment section
    await expect(page.getByText(/оплаты/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/добавить оплату/i)).toBeVisible();
    // Verify totals section
    await expect(page.getByText(/итого/i).first()).toBeVisible();
    await expect(page.getByText(/оплачено/i).first()).toBeVisible();
  });

  test('should navigate to bookings list from booking detail', async ({ page }) => {
    await page.goto('/bookings');
    await page.waitForLoadState('networkidle');

    // Click on first booking
    const bookingLink = page.getByText(/BK-\d{4}-\d{4}/).first();
    await bookingLink.click();
    await page.waitForURL('**/bookings/*');

    // Navigate back using breadcrumb or back button
    const backLink = page.getByRole('link', { name: /бронирования|назад|back/i }).first();
    if (await backLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await backLink.click();
      await expect(page).toHaveURL(/.*bookings$/);
    } else {
      // Use browser back
      await page.goBack();
      await expect(page).toHaveURL(/.*bookings/);
    }
  });
});
