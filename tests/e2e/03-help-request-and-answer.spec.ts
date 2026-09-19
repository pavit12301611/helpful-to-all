import { expect, test } from '@playwright/test';
import { ACCOUNTS, DEMO_PASSWORD, signIn } from './helpers';

/**
 * Journey 3 — Community help: ask a question, get an answer from another member,
 * accept the answer and mark the request solved.
 */
test.describe('Journey 3: ask, answer and solve', () => {
  test('posts a help request, answers it and accepts the answer', async ({ page, context }) => {
    await signIn(page, ACCOUNTS.student);

    const title = `E2E help ${Date.now().toString().slice(-6)}`;
    await page.goto('/help/new');
    await page.getByLabel('Title').fill(title);
    await page.getByLabel('Explain what you need').fill('Looking for someone who can explain how to file a simple return.');
    await page.getByLabel('Visibility').selectOption({ label: /public/i }).catch(() => undefined);
    await page.getByRole('button', { name: /post|publish|create/i }).first().click();

    await expect(page).toHaveURL(/\/help\/[a-z0-9]+/);
    await expect(page.getByText(title).first()).toBeVisible();

    // A second member answers the same request in a separate browser context.
    const other = await context.newPage();
    await other.goto('/login');
    await other.getByLabel('Email address').fill(ACCOUNTS.organiser);
    await other.getByLabel('Password').fill(DEMO_PASSWORD);
    await other.getByRole('button', { name: 'Sign in' }).click();

    const answer = 'You can file online; keep your salary slips handy.';
    await other.goto(page.url());
    await other.getByLabel('Your answer').fill(answer);
    await other.getByRole('button', { name: /post answer|answer|submit/i }).first().click();
    await expect(other.getByText(answer).first()).toBeVisible();

    // Back as the author: accept the answer, which marks the request solved.
    await page.reload();
    await page.getByRole('button', { name: /accept/i }).first().click();
    await expect(page.getByText(/solved/i).first()).toBeVisible();
  });
});
