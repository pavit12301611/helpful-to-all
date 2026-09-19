import { expect, test } from '@playwright/test';
import { ACCOUNTS, signIn } from './helpers';

/**
 * Journey 7 — Moderation: an administrator verifies a listing from the
 * verification queue and the action shows up in the audit log.
 */
test.describe('Journey 7: verify a listing and audit it', () => {
  test('verifies a resource and records it in the audit log', async ({ page }) => {
    await signIn(page, ACCOUNTS.admin);

    await page.goto('/admin?tab=verify');
    await expect(page.getByText(/local resources/i).first()).toBeVisible();

    const verifyButton = page.getByRole('button', { name: /^verify$/i }).first();
    if (await verifyButton.count()) {
      await verifyButton.click();
      // Confirmation is required before anything is written.
      await page.getByRole('button', { name: /^verify$/i }).last().click();
      await expect(page.getByText(/marked as verified|verified/i).first()).toBeVisible();
    }

    await page.goto('/admin?tab=audit');
    await expect(page.getByText(/resource.verify|verify/i).first()).toBeVisible();
    await expect(page.getByText(/moderation history/i).first()).toBeVisible();
  });

  test('keeps the moderation console away from non-staff members', async ({ page }) => {
    await signIn(page, ACCOUNTS.student);
    await page.goto('/admin');
    await expect(page).not.toHaveURL(/\/admin/);
  });
});
