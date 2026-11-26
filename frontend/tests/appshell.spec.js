import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { test, expect } from '@playwright/test';

const screenshotDir = join(process.cwd(), 'test-results', 'design');
mkdirSync(screenshotDir, { recursive: true });

async function authenticatedPage(page, role = 'admin') {
  await page.route('**/api/user', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ id: 21, username: 'staff-test', role }),
  }));
  await page.route('**/api/drafts/queue', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ review: [], quarantine: [] }),
  }));
  await page.route('**/sanctum/csrf-cookie', (route) => route.fulfill({ status: 204 }));
  await page.goto('/');
  await expect(page.getByRole('application', { name: 'Arhivă digitală' })).toBeVisible();
}

test('matches DS-013 shell across viewport and theme projects', async ({ page, colorScheme }, testInfo) => {
  await authenticatedPage(page);
  const isMobile = testInfo.project.name.startsWith('mobile');
  const viewport = isMobile ? { width: 320, height: 740 } : { width: 1600, height: 900 };
  await page.setViewportSize(viewport);
  await expect(page.getByRole('banner')).toHaveCSS('background-color', colorScheme === 'dark' ? 'rgb(7, 45, 92)' : 'rgb(4, 87, 68)');
  await expect(page.locator('nav[aria-label="Navigare principală"] button')).toHaveCount(3);
  const fits = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
  expect(fits).toBe(true);
  await page.screenshot({ path: join(screenshotDir, `DS-013.integrated.${testInfo.project.name}.png`), fullPage: true });
});

test('keeps sidebar state while navigating and shows only implemented destinations for the role', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.startsWith('mobile'), 'The minimize control is a desktop interaction.');
  await authenticatedPage(page, 'arhivar');
  const shell = page.getByRole('application', { name: 'Arhivă digitală' });
  const nav = page.getByRole('navigation', { name: 'Navigare principală' });
  await page.getByRole('button', { name: 'Minimizează meniul' }).click();
  await expect(shell).toHaveAttribute('data-sidebar', 'minimized');
  await nav.getByRole('button', { name: 'Cozi de lucru' }).click();
  await expect(page.getByRole('heading', { name: 'Cozi de lucru' })).toBeVisible();
  await expect(shell).toHaveAttribute('data-sidebar', 'minimized');
  await expect(nav.getByRole('button', { name: 'Cozi de lucru' })).toHaveAttribute('aria-current', 'page');
  await expect(nav.getByRole('button', { name: 'Retenție și casare' })).toHaveCount(0);
  await expect(nav.getByRole('button', { name: 'Administrare' })).toHaveCount(0);
});

test('keeps the header and sidebar fixed while workspace content scrolls', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.startsWith('mobile'), 'The mobile sidebar is a fixed overlay.');
  await authenticatedPage(page);
  const workspace = page.locator('.app-workspace');
  await workspace.evaluate((element) => {
    const tallContent = document.createElement('div');
    tallContent.style.blockSize = '1600px';
    element.append(tallContent);
  });
  const header = page.locator('.app-header');
  const sidebar = page.locator('.app-sidebar');
  const headerTop = await header.evaluate((element) => element.getBoundingClientRect().top);
  const sidebarTop = await sidebar.evaluate((element) => element.getBoundingClientRect().top);
  await workspace.evaluate((element) => { element.scrollTop = 500; });
  await expect.poll(() => workspace.evaluate((element) => element.scrollTop)).toBe(500);
  await expect.poll(() => header.evaluate((element) => element.getBoundingClientRect().top)).toBe(headerTop);
  await expect.poll(() => sidebar.evaluate((element) => element.getBoundingClientRect().top)).toBe(sidebarTop);
});

test('cititor sees only archive navigation and the login screen remains outside the shell', async ({ page }) => {
  await authenticatedPage(page, 'cititor');
  if (await page.getByRole('button', { name: 'Deschide meniul' }).isVisible()) {
    await page.getByRole('button', { name: 'Deschide meniul' }).click();
  }
  const nav = page.getByRole('navigation', { name: 'Navigare principală' });
  await expect(nav.getByRole('button')).toHaveCount(1);
  await expect(nav.getByRole('button', { name: 'Căutare în arhivă' })).toHaveAttribute('aria-current', 'page');
  await expect(nav.getByRole('button', { name: 'Încărcare documente' })).toHaveCount(0);
});

test('opens and dismisses the mobile navigation drawer', async ({ page }) => {
  await authenticatedPage(page);
  await page.setViewportSize({ width: 320, height: 740 });
  const nav = page.getByRole('navigation', { name: 'Navigare principală' });
  await expect(nav).toBeHidden();
  await page.getByRole('button', { name: 'Deschide meniul' }).click();
  await expect(nav).toBeVisible();
  await page.locator('#app-sidebar').getByRole('button', { name: 'Închide meniul' }).click();
  await expect(nav).toBeHidden();
  await expect(page.locator('body')).toHaveJSProperty('scrollWidth', 320);
});
