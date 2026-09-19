import { expect, test } from '@playwright/test';
import { ACCOUNTS, signIn } from './helpers';

/**
 * Journey 6 — Small business: create an invoice with a line item and open its
 * PDF. The PDF route is owner-only, which this journey also checks.
 */
test.describe('Journey 6: invoice and PDF export', () => {
  test('creates an invoice and downloads the PDF', async ({ page, context }) => {
    await signIn(page, ACCOUNTS.organiser);

    await page.goto('/business?tab=invoices');

    const description = `E2E line ${Date.now().toString().slice(-6)}`;
    await page.getByPlaceholder('Description').first().fill(description);
    await page.getByLabel('Quantity').first().fill('2');
    await page.getByLabel(/unit price/i).first().fill('15000');
    await page.getByRole('button', { name: /create invoice/i }).click();

    await expect(page.getByText(/invoice created|INV-/i).first()).toBeVisible();

    // The row links to the PDF.
    const pdfLink = page.locator('a[href*="/api/invoices/"][href*="/pdf"]').first();
    await expect(pdfLink).toBeVisible();
    const href = await pdfLink.getAttribute('href');
    expect(href).toContain('/pdf');

    // Owner can fetch it.
    const pdfResponse = await page.request.get(href ?? '');
    expect(pdfResponse.status()).toBe(200);
    expect(pdfResponse.headers()['content-type']).toContain('application/pdf');

    // Somebody else cannot.
    const intruder = await context.newPage();
    await intruder.goto('/login');
    await intruder.getByLabel('Email address').fill(ACCOUNTS.student);
    await intruder.getByLabel('Password').fill(process.env.SEED_PASSWORD ?? 'OpenHub!2345');
    await intruder.getByRole('button', { name: 'Sign in' }).click();
    const denied = await intruder.request.get(href ?? '');
    expect([403, 404]).toContain(denied.status());
  });
});
