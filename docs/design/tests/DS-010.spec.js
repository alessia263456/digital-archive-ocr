import { test, expect } from '@playwright/test';
import { pathToFileURL } from 'node:url';

const mock = pathToFileURL('/docs/design/mocks/DS-010.html').href;

test('presents an unauthenticated header and switches the preview states', async ({ page }, info) => {
  await page.setViewportSize(info.project.name.startsWith('mobile') ? { width: 320, height: 800 } : { width: 1440, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(mock);

  const header = page.getByRole('banner');
  await expect(header.getByRole('heading', { name: 'Autentificare' })).toBeVisible();
  await expect(header.getByRole('link')).toHaveCount(0);
  await expect(header.getByRole('button')).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Navigare între machete de design' })).toBeVisible();
  await expect(page.getByText('Panou de previzualizare · numai pentru machetă')).toBeVisible();
  if (info.project.name.startsWith('mobile')) await page.screenshot({ path: info.outputPath('stare-implicita-mobil.png'), fullPage: true, scale: 'css' });
  await page.getByRole('link', { name: 'DS-001 · Căutare' }).click();
  await expect(page.getByRole('heading', { name: 'Căutare în arhivă' })).toBeVisible();
  await page.getByRole('link', { name: 'DS-006 · Administrare' }).click();
  await expect(page.getByRole('heading', { name: 'Administrare' })).toBeVisible();
  await page.getByRole('link', { name: 'DS-010 · Autentificare' }).click();
  await expect(page.getByRole('banner').getByRole('heading', { name: 'Autentificare' })).toBeVisible();

  const preview = page.getByLabel('Stare pentru previzualizare');
  await preview.focus();
  await expect(preview).toHaveCSS('outline-style', 'solid');
  const themeButton = page.getByLabel('Mod întunecat');
  const themeBounds = await themeButton.boundingBox();
  expect(themeBounds.height).toBeGreaterThanOrEqual(44);
  for (const [state, copy] of [
    ['empty', 'Completează câmpurile pentru a continua.'],
    ['loading', 'Se verifică datele introduse…'],
    ['error', 'Nu am putut verifica datele introduse. Încearcă din nou.'],
    ['success', 'Starea de succes a autentificării este doar pentru previzualizare.'],
    ['disabled', 'Autentificarea nu este disponibilă în previzualizare.'],
    ['long', 'Nume de utilizator foarte lung pentru verificarea adaptării vizuale'],
  ]) {
    await preview.selectOption(state);
    await expect(page.getByRole('main')).toHaveAttribute('data-state', state);
    await expect(page.getByRole('main')).toContainText(copy);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => innerWidth));
    if (state === 'error') await page.screenshot({ path: info.outputPath('eroare.png'), fullPage: true, scale: 'css' });
    if (info.project.name === 'desktop-light' && ['error', 'success', 'long'].includes(state)) {
      await page.screenshot({ path: `/screens/DS-010.${state}.light.png`, fullPage: true, scale: 'css' });
      await page.getByLabel('Mod întunecat').click();
      await page.screenshot({ path: `/screens/DS-010.${state}.dark.png`, fullPage: true, scale: 'css' });
      await page.getByLabel('Mod luminos').click();
    }
  }

  const password = page.getByLabel('Parolă');
  await preview.selectOption('default');
  await page.getByRole('button', { name: 'Autentificare' }).hover();
  await expect(page.getByRole('button', { name: 'Autentificare' })).toHaveCSS('text-decoration-line', 'underline');
  await page.getByLabel('Nume de utilizator').fill('utilizator.sintetic');
  await password.fill('parola-sintetica');
  await page.getByRole('button', { name: 'Autentificare' }).click();
  await expect(page.getByRole('status')).toContainText('Autentificarea nu este conectată; aceasta este doar o previzualizare.');
  await page.getByRole('button', { name: 'Arată parola' }).click();
  await expect(password).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: 'Ascunde parola' }).click();
  await expect(password).toHaveAttribute('type', 'password');
  await page.getByLabel('Mod întunecat').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  if (info.project.name === 'desktop-light') {
    await page.getByLabel('Stare pentru previzualizare').selectOption('default');
    await page.getByLabel('Nume de utilizator').fill('');
    await password.fill('');
    await expect(page.getByRole('status')).toHaveText('Folosește numele de utilizator și parola contului.');
    await page.evaluate(() => document.activeElement?.blur());
    await page.screenshot({ path: '/screens/DS-010.dark.png', fullPage: true, scale: 'css' });
    await page.getByLabel('Mod luminos').click();
    await page.evaluate(() => document.activeElement?.blur());
    await page.screenshot({ path: '/screens/DS-010.light.png', fullPage: true, scale: 'css' });
  }
});
