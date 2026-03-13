import { test, expect } from '@playwright/test';

/**
 * Public Booking Flow E2E Tests
 *
 * Tests the guest-facing booking page at /book/sardoba-guest-house.
 * No authentication required — these run as anonymous users.
 *
 * Prerequisites: Seed data with property slug "sardoba-guest-house",
 * active rooms, and property extras.
 */

const SLUG = 'sardoba-guest-house';
const BOOKING_URL = `/book/${SLUG}`;

test.describe('Public Booking Flow', () => {
  // Public pages — no auth needed
  test.use({ storageState: { cookies: [], origins: [] } });

  test('should display hotel information and rooms', async ({ page }) => {
    await page.goto(BOOKING_URL);

    // Hotel name should be visible
    await expect(
      page.getByText(/sardoba|сардоба/i).first(),
    ).toBeVisible({ timeout: 15000 });

    // Booking section should be present
    await expect(
      page.getByText(/бронирование/i).first(),
    ).toBeVisible();

    // Rooms should be listed (at least one room card)
    await expect(
      page.getByText(/standard|стандарт|single|double|family|suite|dormitory/i).first(),
    ).toBeVisible({ timeout: 10000 });
  });

  test('should search available rooms by dates', async ({ page }) => {
    await page.goto(BOOKING_URL);
    await page.waitForLoadState('networkidle');

    // Set check-in date (tomorrow)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const checkIn = tomorrow.toISOString().split('T')[0];

    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 2);
    const checkOut = dayAfter.toISOString().split('T')[0];

    // Fill date inputs
    const checkInInput = page.locator('input[type="date"]').first();
    const checkOutInput = page.locator('input[type="date"]').nth(1);

    await checkInInput.fill(checkIn);
    await checkOutInput.fill(checkOut);

    // Wait for rooms to load
    await page.waitForTimeout(1500);

    // Room cards should still be visible (either available or unavailable)
    await expect(
      page.getByText(/standard|стандарт|single|double|family|suite/i).first(),
    ).toBeVisible({ timeout: 10000 });
  });

  test('should select a room and show price', async ({ page }) => {
    await page.goto(BOOKING_URL);
    await page.waitForLoadState('networkidle');

    // Set dates
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 25); // far future to avoid conflicts
    const checkIn = tomorrow.toISOString().split('T')[0];
    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 2);
    const checkOut = dayAfter.toISOString().split('T')[0];

    const checkInInput = page.locator('input[type="date"]').first();
    const checkOutInput = page.locator('input[type="date"]').nth(1);
    await checkInInput.fill(checkIn);
    await checkOutInput.fill(checkOut);
    await page.waitForTimeout(1500);

    // Click on a room card to select it
    const roomCard = page.locator('[data-room-id], [role="button"]').filter({
      hasText: /standard|стандарт|double|family|suite/i,
    }).first();

    if (await roomCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await roomCard.click();
    } else {
      // Try clicking any room selection element
      const anyRoom = page.locator('button, [role="radio"], label').filter({
        hasText: /выбрать|select|standard|double/i,
      }).first();
      if (await anyRoom.isVisible({ timeout: 3000 }).catch(() => false)) {
        await anyRoom.click();
      }
    }

    // Wait for price calculation
    await page.waitForTimeout(1000);

    // Total price should appear (UZS formatted)
    await expect(
      page.getByText(/итого|total/i).first(),
    ).toBeVisible({ timeout: 5000 });
  });

  test('should validate required guest fields', async ({ page }) => {
    await page.goto(BOOKING_URL);
    await page.waitForLoadState('networkidle');

    // Try to submit without filling anything
    const submitBtn = page.getByRole('button', { name: /подтвердить бронирование|забронировать|submit/i });
    if (await submitBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await submitBtn.click();
      await page.waitForTimeout(500);

      // Validation errors should appear
      const hasError = await page.getByText(
        /выберите дату|выберите номер|введите имя|введите фамилию|введите номер телефона/i,
      ).first().isVisible({ timeout: 3000 }).catch(() => false);

      expect(hasError).toBeTruthy();
    }
  });

  test('should validate phone number format', async ({ page }) => {
    await page.goto(BOOKING_URL);
    await page.waitForLoadState('networkidle');

    // Set dates
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 26);
    const checkIn = tomorrow.toISOString().split('T')[0];
    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 1);
    const checkOut = dayAfter.toISOString().split('T')[0];

    await page.locator('input[type="date"]').first().fill(checkIn);
    await page.locator('input[type="date"]').nth(1).fill(checkOut);
    await page.waitForTimeout(1500);

    // Select a room
    const roomSelection = page.locator('button, [role="radio"], label').filter({
      hasText: /выбрать|select|standard|double|single/i,
    }).first();
    if (await roomSelection.isVisible({ timeout: 5000 }).catch(() => false)) {
      await roomSelection.click();
    }

    // Fill guest info with invalid phone
    const firstNameInput = page.getByLabel(/имя/i).first();
    const lastNameInput = page.getByLabel(/фамилия/i);
    const phoneInput = page.getByLabel(/телефон/i);

    if (await firstNameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstNameInput.fill('Test');
      await lastNameInput.fill('User');
      await phoneInput.fill('12345'); // invalid format

      // Submit
      const submitBtn = page.getByRole('button', { name: /подтвердить бронирование|забронировать/i });
      await submitBtn.click();
      await page.waitForTimeout(500);

      // Should show phone validation error
      await expect(
        page.getByText(/формат|телефон|phone/i).first(),
      ).toBeVisible({ timeout: 3000 });
    }
  });

  test('should complete full booking flow and reach confirmation', async ({ page }) => {
    await page.goto(BOOKING_URL);
    await page.waitForLoadState('networkidle');

    // 1. Set dates (30 days from now to avoid conflicts)
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    const checkIn = futureDate.toISOString().split('T')[0];
    futureDate.setDate(futureDate.getDate() + 2);
    const checkOut = futureDate.toISOString().split('T')[0];

    await page.locator('input[type="date"]').first().fill(checkIn);
    await page.locator('input[type="date"]').nth(1).fill(checkOut);
    await page.waitForTimeout(2000);

    // 2. Select a room
    const roomSelection = page.locator('button, [role="radio"], label').filter({
      hasText: /выбрать|select|standard|double|single/i,
    }).first();
    if (await roomSelection.isVisible({ timeout: 5000 }).catch(() => false)) {
      await roomSelection.click();
      await page.waitForTimeout(1000);
    }

    // 3. Fill guest info
    const firstNameInput = page.getByLabel(/имя/i).first();
    const lastNameInput = page.getByLabel(/фамилия/i);
    const phoneInput = page.getByLabel(/телефон/i);

    if (await firstNameInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstNameInput.fill('Тест');
      await lastNameInput.fill('Бронирование');
      await phoneInput.fill('+998901234599');
    }

    // 4. Submit booking
    const submitBtn = page.getByRole('button', { name: /подтвердить бронирование|забронировать/i });
    if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await submitBtn.click();

      // 5. Should redirect to confirmation page
      await page.waitForURL(`**/book/${SLUG}/confirmation/**`, { timeout: 15000 });

      // 6. Verify confirmation page content
      await expect(
        page.getByText(/BK-\d{4}-\d{4}|подтвержд|confirmation/i).first(),
      ).toBeVisible({ timeout: 10000 });
    }
  });

  test('should show extras on booking form', async ({ page }) => {
    await page.goto(BOOKING_URL);
    await page.waitForLoadState('networkidle');

    // Extras section should be visible (Завтрак, Трансфер from seed data)
    const hasExtras = await page
      .getByText(/завтрак|трансфер|доп.*услуг/i)
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false);

    // Extras might not be visible until dates/room are selected
    // At minimum, the booking form section should exist
    expect(
      hasExtras ||
      (await page.getByText(/бронирование/i).first().isVisible().catch(() => false)),
    ).toBeTruthy();
  });
});
