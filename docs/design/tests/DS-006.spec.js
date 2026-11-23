import { test, expect } from '@playwright/test';
import { pathToFileURL } from 'node:url';

const mock = pathToFileURL('/docs/design/mocks/DS-006.html').href;

test('switches admin forms and their visual preview states', async ({ page }, info) => {
  await page.setViewportSize(info.project.name.startsWith('mobile') ? { width: 320, height: 800 } : { width: 1440, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(mock);

  await expect(page.getByRole('navigation', { name: 'Navigare între machete de design' })).toBeVisible();
  await expect(page.getByText('Panou de previzualizare · numai pentru machetă')).toBeVisible();
  if (info.project.name.startsWith('mobile')) await page.screenshot({ path: info.outputPath('stare-implicita-mobil.png'), fullPage: true, scale: 'css' });
  const preview = page.getByLabel('Stare pentru previzualizare');
  await preview.focus();
  await expect(preview).toHaveCSS('outline-style', 'solid');
  const themeBounds = await page.getByLabel('Mod întunecat').boundingBox();
  expect(themeBounds.height).toBeGreaterThanOrEqual(44);
  const tabs = page.getByRole('tablist', { name: 'Formulare de administrare' });
  for (const name of ['Conturi', 'Dosare fizice', 'Permisiuni']) {
    await tabs.getByRole('tab', { name }).click();
    await expect(tabs.getByRole('tab', { name })).toHaveAttribute('aria-selected', 'true');
  }

  const state = preview;
  for (const [value, copy] of [
    ['default', 'Acces refuzat implicit'],
    ['empty', 'Nu există înregistrări în această listă.'],
    ['loading', 'Se încarcă datele…'],
    ['error', 'Nu am putut salva modificările. Verifică datele și încearcă din nou.'],
    ['success', 'Confirmare vizuală; datele nu se salvează.'],
    ['disabled', 'Salvarea nu este disponibilă în previzualizare.'],
    ['long', 'Utilizator_exemplu_cu_un_nume_extins_pentru_verificarea_adaptării'],
  ]) {
    await state.selectOption(value);
    await expect(page.getByRole('main')).toHaveAttribute('data-state', value);
    await expect(page.getByRole('main')).toContainText(copy);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => innerWidth));
    if (value === 'error') await page.screenshot({ path: info.outputPath('eroare-salvare.png'), fullPage: true, scale: 'css' });
    if (info.project.name === 'desktop-light' && ['empty', 'error', 'long'].includes(value)) {
      await page.screenshot({ path: `/screens/DS-006.${value}.light.png`, fullPage: true, scale: 'css' });
      await page.getByLabel('Mod întunecat').click();
      await page.screenshot({ path: `/screens/DS-006.${value}.dark.png`, fullPage: true, scale: 'css' });
      await page.getByLabel('Mod luminos').click();
    }
  }

  await state.selectOption('default');
  const previewAction = page.getByRole('button', { name: 'Previzualizează modificarea' });
  await previewAction.hover();
  await expect(previewAction).toHaveCSS('text-decoration-line', 'underline');
  await previewAction.click();
  await expect(page.getByRole('main')).toHaveAttribute('data-state', 'success');
  await expect(page.getByRole('status')).toHaveText('Confirmare vizuală; datele nu se salvează.');
  await state.selectOption('default');
  await tabs.getByRole('tab', { name: 'Conturi' }).click();
  await page.getByLabel('Mod întunecat').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  if (info.project.name === 'desktop-light') {
    await state.selectOption('default');
    await page.evaluate(() => document.activeElement?.blur());
    await page.screenshot({ path: '/screens/DS-006.dark.png', fullPage: true, scale: 'css' });
    await page.getByLabel('Mod luminos').click();
    await page.evaluate(() => document.activeElement?.blur());
    await page.screenshot({ path: '/screens/DS-006.light.png', fullPage: true, scale: 'css' });
  }
});
