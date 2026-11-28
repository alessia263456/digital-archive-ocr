import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { test, expect } from '@playwright/test';
import { mockEmptyArchiveBrowse } from './test-helpers.js';

const screenshotDir = join(process.cwd(), 'test-results', 'design');
mkdirSync(screenshotDir, { recursive: true });

async function unauthenticatedPage(page) {
  await mockEmptyArchiveBrowse(page);
  await page.route('**/api/user', (route) => route.fulfill({
    status: 401,
    contentType: 'application/json',
    body: JSON.stringify({ eroare: 'Autentificarea este necesară.' }),
  }));
  await page.route('**/sanctum/csrf-cookie', (route) => route.fulfill({
    status: 204,
    headers: { 'set-cookie': 'XSRF-TOKEN=synthetic-csrf-token; Path=/; SameSite=Lax' },
  }));
}

function screenshotPath(testInfo, screen) {
  return join(screenshotDir, `${screen}.${testInfo.project.name}.png`);
}

test('shows the approved Romanian login Screen and accepts keyboard input', async ({ page }, testInfo) => {
  await unauthenticatedPage(page);
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Autentificare', exact: true })).toBeVisible();
  await expect(page.getByLabel('Nume de utilizator')).toBeVisible();
  await expect(page.getByLabel('Parolă')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Autentificare' })).toBeEnabled();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Nume de utilizator')).toBeFocused();
  await page.getByLabel('Nume de utilizator').blur();
  await page.screenshot({ path: screenshotPath(testInfo, 'DS-010') });
});

test('shows credential errors, disables fields while loading, and reveals the password', async ({ page }) => {
  await unauthenticatedPage(page);
  let releaseLogin;
  let loginRequestStarted;
  const requestStarted = new Promise((resolve) => { loginRequestStarted = resolve; });
  await page.route('**/api/login', async (route) => {
    expect(route.request().headers()['x-xsrf-token']).toBe('synthetic-csrf-token');
    await new Promise((resolve) => {
      releaseLogin = resolve;
      loginRequestStarted();
    });
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ eroare: 'Nume de utilizator sau parolă incorecte.' }),
    });
  });
  await page.goto('/');
  await page.getByLabel('Nume de utilizator').fill('utilizator-test');
  await page.getByLabel('Parolă').fill('parola-test');
  await page.getByRole('button', { name: 'Arată parola' }).click();
  await expect(page.getByLabel('Parolă')).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: 'Autentificare' }).click();
  await expect(page.getByRole('button', { name: 'Se verifică…' })).toBeDisabled();
  await expect(page.getByLabel('Nume de utilizator')).toBeDisabled();
  await requestStarted;
  releaseLogin();
  await expect(page.getByRole('status')).toHaveText('Nume de utilizator sau parolă incorecte.');
});

test('shows an expired-session message after the current-user check', async ({ page }) => {
  await page.route('**/api/user', (route) => route.fulfill({
    status: 401,
    contentType: 'application/json',
    body: JSON.stringify({ eroare: 'Sesiunea a expirat. Autentificați-vă din nou.' }),
  }));
  await page.goto('/');
  await expect(page.getByRole('status')).toHaveText('Sesiunea a expirat. Autentificați-vă din nou.');
});

test('opens the true empty archive state after login and returns to login on logout', async ({ page }, testInfo) => {
  await unauthenticatedPage(page);
  await page.route('**/api/login', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ user: { id: 17, username: 'admin-test', role: 'admin' } }),
  }));
  await page.route('**/api/logout', (route) => route.fulfill({ status: 204 }));

  await page.goto('/');
  await page.getByLabel('Nume de utilizator').fill('admin-test');
  await page.getByLabel('Parolă').fill('parola-test');
  await page.getByRole('button', { name: 'Autentificare' }).click();
  await expect(page.getByRole('heading', { name: 'Arhiva este goală' })).toBeVisible();
  await expect(page.getByText('Documentele aprobate vor apărea aici după ce sunt adăugate în arhivă.')).toBeVisible();
  await expect(page.getByText(/Act nr\./)).toHaveCount(0);
  const browserStorageLengths = await page.evaluate(() => [localStorage.length, sessionStorage.length]);
  expect(browserStorageLengths).toEqual([0, 0]);
  await page.screenshot({ path: screenshotPath(testInfo, 'DS-001') });
  if (testInfo.project.name.startsWith('desktop-')) {
    for (const viewport of [{ width: 320, height: 740 }, { width: 1600, height: 900 }]) {
      await page.setViewportSize(viewport);
      await expect(page.getByRole('heading', { name: 'Arhiva este goală' })).toBeVisible();
      const fits = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
      expect(fits).toBe(true);
      await page.screenshot({ path: join(screenshotDir, `DS-001.${viewport.width}x${viewport.height}.${testInfo.project.name}.png`) });
    }
  }
  await page.getByRole('button', { name: 'Deconectare' }).click();
  await expect(page.getByRole('heading', { name: 'Autentificare', exact: true })).toBeVisible();
});

test('fits the smallest and largest supported viewports without horizontal scroll', async ({ page }, testInfo) => {
  await unauthenticatedPage(page);
  await page.goto('/');
  for (const viewport of [{ width: 320, height: 740 }, { width: 1600, height: 900 }]) {
    await page.setViewportSize(viewport);
    await expect(page.getByRole('heading', { name: 'Autentificare', exact: true })).toBeVisible();
    const fits = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
    expect(fits).toBe(true);
    await page.screenshot({ path: join(screenshotDir, `DS-010.${viewport.width}x${viewport.height}.${testInfo.project.name}.png`) });
  }
});

test('wraps a long account name on a narrow authenticated header', async ({ page }) => {
  const username = 'arhivar-cu-nume-lung-'.repeat(4);
  await unauthenticatedPage(page);
  await page.route('**/api/login', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ user: { id: 18, username, role: 'arhivar' } }),
  }));
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/');
  await page.getByLabel('Nume de utilizator').fill(username);
  await page.getByLabel('Parolă').fill('parola-test');
  await page.getByRole('button', { name: 'Autentificare' }).click();
  await expect(page.locator('.app-account-actions .screen-reader-only')).toHaveText(`Cont: ${username}, rol arhivar.`);
  const fits = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
  expect(fits).toBe(true);
});
