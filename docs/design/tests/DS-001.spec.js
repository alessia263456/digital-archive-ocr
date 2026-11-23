import { test, expect } from '@playwright/test';
import { pathToFileURL } from 'node:url';

const mock = pathToFileURL('/docs/design/mocks/DS-001.html').href;

test('browses four archive sections, searches matching records, and previews approved roles and states', async ({ page }, info) => {
  const mobile = info.project.name.startsWith('mobile');
  await page.setViewportSize(mobile ? { width: 320, height: 800 } : { width: 1440, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(mock);
  if (info.project.name.endsWith('-dark')) await page.getByLabel('Mod întunecat').click();

  const main = page.getByRole('main');
  const searchInput = page.getByLabel('Text de căutare');
  const home = page.locator('#home-sections');
  const filters = page.getByRole('complementary', { name: 'Filtre de arhivă' });
  await expect(page.getByRole('navigation', { name: 'Navigare între machete de design' })).toBeVisible();
  await expect(page.getByText('Panou de previzualizare · numai pentru machetă')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: 'Căutare în arhivă' })).toBeVisible();
  await expect(searchInput).toBeVisible();
  await expect(filters).toBeVisible();

  const sectionNames = ['După tipul documentului', 'După dosar fizic', 'După an', 'Adăugate recent'];
  await expect(home.locator('.browse-section')).toHaveCount(4);
  await expect(home.locator('.browse-section h2')).toHaveText(sectionNames);
  for (const section of await home.locator('.browse-section').all()) {
    const itemCount = await section.locator('.browse-item:not([hidden])').count();
    expect(itemCount).toBeGreaterThanOrEqual(3);
    expect(itemCount).toBeLessThanOrEqual(4);
    const expand = section.getByRole('button', { name: 'Vezi toate' });
    await expect(expand).toHaveAttribute('aria-expanded', 'false');
    await expand.click();
    await expect(section.getByRole('button', { name: 'Vezi mai puține' })).toHaveAttribute('aria-expanded', 'true');
    expect(await section.locator('.browse-item:not([hidden])').count()).toBeGreaterThan(itemCount);
    await section.getByRole('button', { name: 'Vezi mai puține' }).click();
    await expect(section.getByRole('button', { name: 'Vezi toate' })).toHaveAttribute('aria-expanded', 'false');
  }

  const recentDates = await page.locator('#recent-documents [data-added-date]').evaluateAll(items => items.map(item => item.dataset.addedDate));
  expect(recentDates).toEqual([...recentDates].sort((a, b) => b.localeCompare(a)));
  const dossierCards = page.locator('#dossier-folders .folder-number');
  await expect(dossierCards.filter({ hasText: 'Dosar nr. 004' })).toHaveCount(2);
  await expect(page.locator('#dossier-folders [data-folder-id="dossier-004-procura"] .folder-number')).toHaveText('Dosar nr. 004');
  await expect(page.locator('#dossier-folders [data-folder-id="dossier-004-succesiune"] .folder-number')).toHaveText('Dosar nr. 004');

  if (mobile) {
    const filterBounds = await filters.boundingBox();
    const contentBounds = await page.locator('.content-column').boundingBox();
    expect(filterBounds.y).toBeLessThan(contentBounds.y);
    await page.screenshot({ path: info.outputPath('stare-implicita-mobil.png'), fullPage: true, scale: 'css' });
    if (info.project.name === 'mobile-light') await page.screenshot({ path: '/screens/DS-001.mobile-light.png', fullPage: true, scale: 'css' });
    if (info.project.name === 'mobile-dark') await page.screenshot({ path: '/screens/DS-001.mobile-dark.png', fullPage: true, scale: 'css' });
  } else {
    const filterBounds = await filters.boundingBox();
    const contentBounds = await page.locator('.content-column').boundingBox();
    expect(filterBounds.x).toBeLessThan(contentBounds.x);
    await page.screenshot({ path: '/screens/DS-001.light.png', fullPage: true, scale: 'css' });
  }

  await page.locator('#type-folders [data-folder-id="type-procuri"]').click();
  await expect(home).toBeHidden();
  await expect(page.locator('#folder-view')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Procuri' })).toBeVisible();
  await expect(page.locator('#folder-documents .document-card')).toHaveCount(2);
  await expect(page.locator('#folder-documents .dossier-number')).toHaveCount(2);
  if (info.project.name === 'desktop-light') {
    await page.evaluate(() => document.activeElement?.blur());
    await page.screenshot({ path: '/screens/DS-001.folder.light.png', fullPage: true, scale: 'css' });
    await page.getByLabel('Mod întunecat').click();
    await page.evaluate(() => document.activeElement?.blur());
    await page.screenshot({ path: '/screens/DS-001.folder.dark.png', fullPage: true, scale: 'css' });
    await page.getByLabel('Mod luminos').click();
  }
  await page.getByRole('button', { name: 'Înapoi la arhivă' }).click();
  await expect(home).toBeVisible();

  await page.locator('#dossier-folders [data-folder-id="dossier-004-succesiune"]').click();
  await expect(page.getByRole('heading', { name: 'Dosar nr. 004' })).toBeVisible();
  await expect(page.locator('#folder-documents .document-card')).toHaveCount(1);
  await expect(page.locator('#folder-documents .dossier-number')).toHaveText('Dosar nr. 004');
  await page.getByRole('button', { name: 'Înapoi la arhivă' }).click();
  await page.locator('#year-folders [data-folder-id="year-2026"]').click();
  await expect(page.getByRole('heading', { name: '2026' })).toBeVisible();
  await expect(page.locator('#folder-documents .document-metadata')).toContainText('12.05.2026');
  await page.getByRole('button', { name: 'Înapoi la arhivă' }).click();

  await searchInput.fill('procură');
  await page.getByRole('button', { name: 'Caută' }).click();
  await expect(home).toBeHidden();
  await expect(page.locator('#search-view')).toBeVisible();
  await expect(searchInput).toHaveValue('procură');
  await expect(filters).toBeVisible();
  const results = page.locator('#search-results .document-card');
  await expect(results).toHaveCount(2);
  for (const card of await results.all()) {
    await expect(card.locator('h3')).toContainText('Procură');
    await expect(card.locator('.dossier-number')).toBeVisible();
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => innerWidth));
  if (info.project.name === 'desktop-light') {
    await page.evaluate(() => document.activeElement?.blur());
    await page.screenshot({ path: '/screens/DS-001.search.light.png', fullPage: true, scale: 'css' });
    await page.getByLabel('Mod întunecat').click();
    await page.evaluate(() => document.activeElement?.blur());
    await page.screenshot({ path: '/screens/DS-001.search.dark.png', fullPage: true, scale: 'css' });
    await page.getByLabel('Mod luminos').click();
  }
  await page.getByRole('button', { name: 'Șterge căutarea' }).click();
  await expect(home).toBeVisible();
  await expect(page.locator('#search-view')).toBeHidden();

  const previewRole = page.getByLabel('Rol pentru previzualizare');
  await previewRole.selectOption('cititor');
  await expect(page.locator('#party-search')).toBeHidden();
  await expect(page.getByRole('status', { name: 'Diferențe de previzualizare' })).toContainText('aprobate și anonimizate');
  await searchInput.fill('procură');
  await page.getByRole('button', { name: 'Caută' }).click();
  await expect(page.locator('#search-results .document-card')).toHaveCount(1);
  await expect(page.locator('#search-results [data-reader-excerpt]')).toBeVisible();
  await expect(page.locator('#search-results [data-admin-excerpt]')).toBeHidden();
  if (info.project.name === 'desktop-light') {
    await page.evaluate(() => document.activeElement?.blur());
    await page.screenshot({ path: '/screens/DS-001.cititor.light.png', fullPage: true, scale: 'css' });
    await page.getByLabel('Mod întunecat').click();
    await page.evaluate(() => document.activeElement?.blur());
    await page.screenshot({ path: '/screens/DS-001.cititor.dark.png', fullPage: true, scale: 'css' });
    await page.getByLabel('Mod luminos').click();
  }
  await page.getByRole('button', { name: 'Șterge căutarea' }).click();
  await previewRole.selectOption('admin');

  const preview = page.getByLabel('Stare pentru previzualizare');
  await preview.focus();
  await expect(preview).toHaveCSS('outline-style', 'solid');
  const themeBounds = await page.getByRole('button', { name: /^Mod (întunecat|luminos)$/ }).boundingBox();
  expect(themeBounds.height).toBeGreaterThanOrEqual(44);
  for (const [value, copy] of [
    ['one', '1 rezultat'],
    ['many', 'Multe rezultate demonstrative'],
    ['empty', 'Nu au fost găsite documente.'],
    ['denied', 'Nu ai acces la acest dosar fizic.'],
    ['loading', 'Se caută în arhivă…'],
    ['error', 'Căutarea nu a putut fi finalizată. Încearcă din nou.'],
    ['success', 'Starea de succes a căutării este doar demonstrativă.'],
    ['long', 'Dosar de arhivă cu un nume intenționat lung'],
  ]) {
    await preview.selectOption(value);
    await expect(main).toHaveAttribute('data-state', value);
    if (value === 'one' || value === 'many') await expect(page.locator('#search-results')).toBeVisible();
    else await expect(page.getByRole('status', { name: 'Stare rezultate' })).toContainText(copy);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => innerWidth));
    if (['empty', 'denied'].includes(value)) await page.screenshot({ path: info.outputPath(`${value}.png`), fullPage: true, scale: 'css' });
    if (info.project.name === 'desktop-light' && ['one', 'many', 'empty', 'denied', 'long'].includes(value)) {
      await page.evaluate(() => document.activeElement?.blur());
      await page.screenshot({ path: `/screens/DS-001.${value}.light.png`, fullPage: true, scale: 'css' });
      await page.getByLabel('Mod întunecat').click();
      await page.evaluate(() => document.activeElement?.blur());
      await page.screenshot({ path: `/screens/DS-001.${value}.dark.png`, fullPage: true, scale: 'css' });
      await page.getByLabel('Mod luminos').click();
    }
  }

  await preview.selectOption('default');
  await expect(home).toBeVisible();
  await page.locator('#browse-type .expand-button').click();
  if (info.project.name === 'desktop-light') {
    await page.evaluate(() => document.activeElement?.blur());
    await page.screenshot({ path: '/screens/DS-001.expanded.light.png', fullPage: true, scale: 'css' });
    await page.getByLabel('Mod întunecat').click();
    await page.evaluate(() => document.activeElement?.blur());
    await page.screenshot({ path: '/screens/DS-001.expanded.dark.png', fullPage: true, scale: 'css' });
    await page.getByLabel('Mod luminos').click();
  }
  await page.locator('#browse-type .expand-button').click();
  if (await page.locator('html').getAttribute('data-theme') !== 'dark') await page.getByLabel('Mod întunecat').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  if (info.project.name === 'desktop-light') {
    await page.evaluate(() => document.activeElement?.blur());
    await page.screenshot({ path: '/screens/DS-001.dark.png', fullPage: true, scale: 'css' });
    await page.getByLabel('Mod luminos').click();
    await page.evaluate(() => document.activeElement?.blur());
    await page.screenshot({ path: '/screens/DS-001.light.png', fullPage: true, scale: 'css' });
  }
});
