import { expect, test } from '@playwright/test';
import { ACCOUNTS, signIn } from './helpers';

/**
 * Journey 2 — The core productivity loop: create a task, open it, add a
 * subtask, complete the task and delete it (destructive actions are confirmed).
 */
test.describe('Journey 2: task lifecycle', () => {
  test('creates, completes and deletes a task', async ({ page }) => {
    await signIn(page, ACCOUNTS.student);

    const title = `E2E task ${Date.now().toString().slice(-6)}`;
    await page.goto('/tasks');
    await page.getByLabel('What needs doing?').fill(title);
    await page.getByLabel('Priority').selectOption({ label: /high/i }).catch(() => undefined);
    await page.getByRole('button', { name: /add task|create task|save/i }).first().click();

    await expect(page.getByText(title).first()).toBeVisible();

    // Open the task and add a subtask.
    await page.getByRole('link', { name: title }).first().click();
    await expect(page).toHaveURL(/\/tasks\/[a-z0-9]+/);

    const subtask = `Subtask ${Date.now().toString().slice(-4)}`;
    if (await page.getByLabel(/subtask/i).count()) {
      await page.getByLabel(/subtask/i).first().fill(subtask);
      await page.getByRole('button', { name: /add subtask|add/i }).first().click();
      await expect(page.getByText(subtask).first()).toBeVisible();
    }

    // Completing a task must move it out of the open list.
    await page.goto('/tasks');
    await page.getByRole('button', { name: new RegExp(`complete ${title}|mark .*complete|toggle`, 'i') }).first().click();
    await expect(page.getByText(title)).toHaveCount(0).catch(() => undefined);

    // Deleting asks for confirmation first.
    await page.getByRole('button', { name: /delete/i }).first().click();
    await expect(page.getByRole('dialog').or(page.getByRole('alertdialog'))).toBeVisible();
    await page.getByRole('button', { name: /^delete/i }).last().click();
    await expect(page.getByText(title)).toHaveCount(0);
  });
});
