import { test, expect } from '@playwright/test';
import { pathToFileURL } from 'node:url';

const mock = pathToFileURL('/docs/design/mocks/DS-007.html').href;

function contrastRatio(foreground, background) {
  const luminance = color => {
    const [red, green, blue] = color.match(/\d+/g).map(Number).map(value => value / 255).map(value =>
      value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
    );
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  };
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

test('shows exactly five statistics sections with the same content for both staff roles', async ({ page }, info) => {
  const mobile = info.project.name.startsWith('mobile');
  await page.setViewportSize(mobile ? { width: 320, height: 800 } : { width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(mock);
  if (info.project.name.endsWith('dark')) await page.getByLabel('Activează modul întunecat').click();

  const main = page.getByRole('main');
  await expect(page.getByRole('heading', { level: 1, name: 'Statistici' })).toBeVisible();
  await expect(main.locator('.section')).toHaveCount(5);
  await expect(main.locator('.section h2')).toHaveText([
    'Total documente în arhivă',
    'Documente digitalizate',
    'Documente pe tipuri',
    'Termene de păstrare',
    'Documente digitalizate recent',
  ]);
  await expect(main.locator('#type-list .type-row')).toHaveCount(10);
  await expect(main.locator('#recent-list .recent-row')).toHaveCount(5);

  const linkContrast = await page.locator('#type-list a').first().evaluate(element => ({
    foreground: getComputedStyle(element).color,
    background: getComputedStyle(element.closest('.section')).backgroundColor,
  }));
  expect(contrastRatio(linkContrast.foreground, linkContrast.background)).toBeGreaterThanOrEqual(4.5);
  const periodSelect = page.getByLabel('Perioadă');
  await periodSelect.focus();
  await expect(periodSelect).toHaveCSS('outline-style', 'solid');
  await expect(periodSelect).toHaveCSS('outline-width', '2px');
  if (mobile) {
    for (const link of await page.locator('#type-list a, .recent-title').all()) {
      expect((await link.boundingBox()).height).toBeGreaterThanOrEqual(44);
    }
    const firstType = page.locator('.type-row').first();
    const firstTypeLink = await firstType.locator('a').boundingBox();
    const firstTypeCount = await firstType.locator('.type-count').boundingBox();
    expect(Math.abs((firstTypeLink.y + firstTypeLink.height / 2) - (firstTypeCount.y + firstTypeCount.height / 2))).toBeLessThanOrEqual(2);
  }

  const adminContent = await main.innerText();
  await page.getByLabel('Rol').selectOption('arhivar');
  await expect(main).toHaveAttribute('data-role', 'arhivar');
  expect(await main.innerText()).toBe(adminContent);

  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => innerWidth));
  if (mobile) {
    await page.screenshot({ path: `/screens/DS-007.mobile-${info.project.name.endsWith('dark') ? 'dark' : 'light'}.png`, fullPage: true, scale: 'css' });
  } else if (info.project.name === 'desktop-light') {
    await page.screenshot({ path: '/screens/DS-007.light.png', fullPage: true, scale: 'css' });
    await page.getByLabel('Activează modul întunecat').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.screenshot({ path: '/screens/DS-007.dark.png', fullPage: true, scale: 'css' });
  }
});

test('links approved counts and periods to archive search and retention counters to DS-005', async ({ page }) => {
  await page.goto(mock);

  await expect(page.getByRole('link', { name: /Vezi toate documentele aprobate/ }).first()).toHaveAttribute('href', 'DS-001.html?status=approved');
  const period = page.getByLabel('Perioadă');
  const periodLink = page.getByRole('link', { name: /Vezi documentele perioadei/ });
  await expect(period).toHaveValue('this-month');
  await expect(periodLink).toHaveAttribute('href', /status=approved.*approved_period=this-month/);
  await period.selectOption('last-month');
  await expect(page.locator('#period-count')).toHaveText('38');
  await expect(periodLink).toHaveAttribute('href', /approved_period=last-month/);
  await period.selectOption('custom');
  await expect(page.getByLabel('De la')).toBeVisible();
  await expect(periodLink).toHaveAttribute('href', /approved_from=2026-10-01.*approved_to=2026-10-31/);
  await page.getByLabel('De la').fill('2026-09-02');
  await expect(periodLink).toHaveAttribute('href', /approved_from=2026-09-02/);

  const typeLinks = page.locator('#type-list a');
  await expect(typeLinks.first()).toHaveAttribute('href', 'DS-001.html?status=approved&type=Procur%C4%83');
  await expect(page.getByRole('link', { name: 'Vezi documentele cu termen de păstrare depășit' })).toHaveAttribute('href', 'DS-005.html?filter=overdue');
  await expect(page.getByRole('link', { name: 'Vezi documentele cu termen în următoarele 30 de zile' })).toHaveAttribute('href', 'DS-005.html?filter=next-30-days');
  await expect(page.locator('#recent-list a').first()).toHaveAttribute('href', 'DS-002.html?document=doc-184');
});

test('previews empty, loading, error, and long-name states', async ({ page }, info) => {
  await page.setViewportSize(info.project.name.startsWith('mobile') ? { width: 320, height: 800 } : { width: 1440, height: 900 });
  await page.goto(mock);
  const state = page.getByLabel('Stare');
  const main = page.getByRole('main');

  await state.selectOption('empty');
  await expect(main).toHaveAttribute('data-state', 'empty');
  await expect(page.locator('#period-count')).toHaveText('0');
  await expect(page.getByText('Nu există documente aprobate în arhivă.')).toBeVisible();
  await expect(page.locator('#recent-list')).toContainText('Documentele aprobate vor apărea aici.');

  await state.selectOption('loading');
  await expect(main).toHaveAttribute('data-state', 'loading');
  await expect(page.locator('#period-count .skeleton')).toBeVisible();
  await state.selectOption('error');
  await expect(page.getByText('Statisticile nu au putut fi încărcate. Încearcă din nou.')).toBeVisible();
  await state.selectOption('long');
  await expect(page.locator('.recent-title').first()).toContainText('referință arhivistică extinsă');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => innerWidth));
});
