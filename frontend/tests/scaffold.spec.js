import { test, expect } from '@playwright/test';

const colors = {
  light: { background: 'rgb(250, 248, 245)', text: 'rgb(7, 45, 92)' },
  dark: { background: 'rgb(30, 41, 59)', text: 'rgb(248, 250, 252)' },
};

test('mounts the Romanian scaffold with the requested theme', async ({ page, colorScheme }, testInfo) => {
  await page.goto('/');
  const marker = page.getByRole('heading', { name: 'Arhivă digitală', exact: true });
  await expect(marker).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ro');
  await expect(page.locator('body')).toHaveCSS('background-color', colors[colorScheme].background);
  await expect(marker).toHaveCSS('color', colors[colorScheme].text);
  const fitsViewport = await page.evaluate(() =>
    document.documentElement.scrollWidth <= document.documentElement.clientWidth
  );
  expect(fitsViewport).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('scaffold.png') });
});
