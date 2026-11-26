import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const mock = pathToFileURL(resolve('../docs/design/mocks/DS-013.html')).href;

test('shows role-specific navigation and read-only retention copy', async ({ page, colorScheme }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(mock);
  const sidebar = page.getByRole('navigation', { name: 'Navigare principală' });
  const labels = await sidebar.getByRole('link').allTextContents();
  expect(labels.map(label => label.trim())).toEqual([
    'Căutare în arhivă', 'Încărcare documente', 'Cozi de lucru',
    'Retenție și casare', 'Statistici', 'Jurnal de audit',
    'Nomenclator arhivistic', 'Administrare',
  ]);
  await page.getByLabel('Rol demonstrat').selectOption('arhivar');
  await expect(sidebar.getByRole('link', { name: 'Retenție și casare' })).toHaveAttribute('aria-description', 'Acces doar pentru vizualizare și filtrare');
  await expect(sidebar.getByRole('link', { name: 'Administrare' })).toHaveCount(0);
  const retentionLink = sidebar.getByRole('link', { name: 'Retenție și casare' });
  await retentionLink.hover();
  await expect(retentionLink).toHaveCSS('background-color', colorScheme === 'dark' ? 'rgb(22, 32, 46)' : 'rgb(242, 239, 233)');
  await page.getByLabel('Rol demonstrat').selectOption('cititor');
  await expect(sidebar.getByRole('link')).toHaveCount(1);
  await expect(sidebar.getByRole('link', { name: 'Căutare în arhivă' })).toBeVisible();
});

test('toggles desktop sidebar and exposes labels when minimized', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(mock);
  const shell = page.getByRole('application', { name: 'Arhivă digitală' });
  const toggle = page.getByRole('button', { name: 'Minimizează meniul' });
  await toggle.click();
  await expect(shell).toHaveAttribute('data-sidebar', 'minimized');
  await expect(page.getByRole('link', { name: 'Căutare în arhivă' })).toHaveAttribute('title', 'Căutare în arhivă');
  await page.getByRole('button', { name: 'Extinde meniul' }).click();
  await expect(shell).toHaveAttribute('data-sidebar', 'expanded');
});

test('opens and dismisses the mobile navigation panel', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto(mock);
  await page.getByRole('button', { name: 'Deschide meniul' }).click();
  await expect(page.getByRole('navigation', { name: 'Navigare principală' })).toBeVisible();
  await page.locator('#mobile-menu-close').click();
  await expect(page.getByRole('navigation', { name: 'Navigare principală' })).toBeHidden();
  await expect(page.locator('body')).toHaveJSProperty('scrollWidth', 320);
});

test('switches theme and keeps controls keyboard accessible', async ({ page, colorScheme }) => {
  await page.goto(mock);
  const root = page.locator('html');
  await expect(root).toHaveAttribute('data-theme', colorScheme);
  const theme = page.getByRole('button', { name: /Activează tema/ });
  await theme.focus();
  await expect(theme).toHaveCSS('outline-style', 'solid');
  await page.keyboard.press('Enter');
  await expect(root).toHaveAttribute('data-theme', colorScheme === 'dark' ? 'light' : 'dark');
});

test('loads in all projects without horizontal overflow at narrow width', async ({ page, isMobile, colorScheme }) => {
  await page.setViewportSize({ width: isMobile ? 320 : 1600, height: 900 });
  await page.goto(mock);
  await expect(page.locator('html')).toHaveAttribute('data-theme', colorScheme);
  await expect(page.locator('body')).toHaveJSProperty('scrollWidth', isMobile ? 320 : 1600);
  if (process.env.DS013_SCREENSHOT_DIR) {
    const suffix = isMobile ? `mobile-${colorScheme}` : colorScheme;
    await page.screenshot({ path: `${process.env.DS013_SCREENSHOT_DIR}/DS-013.${suffix}.png`, fullPage: true });
  }
});
