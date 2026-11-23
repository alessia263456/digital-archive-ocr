import { test, expect } from '@playwright/test';
import { pathToFileURL } from 'node:url';

const mock = pathToFileURL('/docs/design/mocks/DS-001.html').href;

test('switches browse modes, approved roles, and preview states', async ({ page }, info) => {
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
  for (const name of ['Dosar fizic', 'Tip de document', 'An']) {
    await page.getByRole('tab', { name }).click();
    await expect(page.getByRole('tab', { name })).toHaveAttribute('aria-selected', 'true');
  }
  await page.getByRole('tab', { name: 'Dosar fizic' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Tip de document' })).toBeFocused();

  const role = page.getByLabel('Rol pentru previzualizare');
  for (const [value, copy] of [
    ['admin', 'Căutarea numelor din acte este disponibilă.'],
    ['arhivar', 'Căutarea numelor din acte este disponibilă.'],
    ['cititor', 'Rezultatele sunt aprobate și anonimizate pentru dosarele permise.'],
  ]) {
    await role.selectOption(value);
    await expect(page.getByRole('main')).toHaveAttribute('data-role', value);
    await expect(page.getByRole('status')).toContainText(copy);
  }

  const state = preview;
  for (const [value, copy] of [
    ['default', 'Dosar nr. 29/2014'],
    ['one', '1 rezultat'],
    ['many', '12 rezultate'],
    ['empty', 'Nu au fost găsite documente.'],
    ['denied', 'Nu ai acces la acest dosar fizic.'],
    ['loading', 'Se caută în arhivă…'],
    ['error', 'Căutarea nu a putut fi finalizată. Încearcă din nou.'],
    ['success', 'Starea de succes a căutării este doar demonstrativă.'],
    ['long', 'Dosar_exemplu_cu_un_numar_lung_si_detalii_arhivistice_suplimentare'],
  ]) {
    await state.selectOption(value);
    await expect(page.getByRole('main')).toHaveAttribute('data-state', value);
    await expect(page.getByRole('main')).toContainText(copy);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => innerWidth));
    if (value === 'denied') await page.screenshot({ path: info.outputPath('dosar-refuzat.png'), fullPage: true, scale: 'css' });
    if (value === 'empty') await page.screenshot({ path: info.outputPath('fara-rezultate.png'), fullPage: true, scale: 'css' });
    if (info.project.name === 'desktop-light' && ['one', 'many', 'empty', 'denied', 'long'].includes(value)) {
      await page.screenshot({ path: `/screens/DS-001.${value}.light.png`, fullPage: true, scale: 'css' });
      await page.getByLabel('Mod întunecat').click();
      await page.screenshot({ path: `/screens/DS-001.${value}.dark.png`, fullPage: true, scale: 'css' });
      await page.getByLabel('Mod luminos').click();
    }
  }

  await preview.selectOption('default');
  await page.getByLabel('Text de căutare').fill('contract');
  await page.getByRole('button', { name: 'Caută' }).hover();
  await expect(page.getByRole('button', { name: 'Caută' })).toHaveCSS('text-decoration-line', 'underline');
  await page.getByRole('button', { name: 'Caută' }).click();
  await expect(page.getByRole('main')).toHaveAttribute('data-state', 'success');
  await expect(page.getByRole('main')).toContainText('Starea de succes a căutării este doar demonstrativă.');
  await page.getByLabel('Mod întunecat').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  if (info.project.name === 'desktop-light') {
    await state.selectOption('default');
    await role.selectOption('admin');
    await page.getByLabel('Text de căutare').fill('');
    await page.getByRole('tab', { name: 'Dosar fizic' }).click();
    await expect(page.getByRole('main')).toContainText('Dosar nr. 29/2014');
    await page.evaluate(() => document.activeElement?.blur());
    await page.screenshot({ path: '/screens/DS-001.dark.png', fullPage: true, scale: 'css' });
    await page.getByLabel('Mod luminos').click();
    await page.evaluate(() => document.activeElement?.blur());
    await page.screenshot({ path: '/screens/DS-001.light.png', fullPage: true, scale: 'css' });
  }
});
