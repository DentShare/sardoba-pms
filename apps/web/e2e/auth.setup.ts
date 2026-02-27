import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '.auth/user.json');

setup('authenticate', async ({ page }) => {
  // Navigate to login page
  await page.goto('/login');

  // Fill login form (labels: "Email" and "Пароль")
  await page.getByLabel(/email/i).fill('admin@sardoba.uz');
  await page.getByLabel(/пароль|password/i).fill('Admin123!');
  await page.getByRole('button', { name: /войти|login/i }).click();

  // Wait for redirect to dashboard calendar
  await page.waitForURL('**/calendar', { timeout: 10000 });

  // Save authentication state (cookies + localStorage)
  await page.context().storageState({ path: authFile });
});
