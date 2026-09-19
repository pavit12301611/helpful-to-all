import { expect, type Page } from '@playwright/test';

export const DEMO_PASSWORD = process.env.SEED_PASSWORD ?? 'OpenHub!2345';

export const ACCOUNTS = {
  admin: 'admin@openhub.test',
  student: 'priya@openhub.test',
  organiser: 'rahul@openhub.test',
} as const;

/** Sign in through the real login form (no token shortcuts). */
export async function signIn(page: Page, email: string, password = DEMO_PASSWORD) {
  await page.goto('/login');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

export async function signOut(page: Page) {
  await page.goto('/dashboard');
  await page.getByRole('button', { name: /sign out/i }).first().click();
  await expect(page).toHaveURL(/\/login$/);
}

/** Fill a labelled field without depending on element ids. */
export async function fillField(page: Page, label: string, value: string) {
  await page.getByLabel(label, { exact: false }).first().fill(value);
}

export async function chooseField(page: Page, label: string, option: string | RegExp) {
  await page.getByLabel(label, { exact: false }).first().selectOption({ label: option });
}
