import { test, expect } from '@playwright/test';
import { pathToFileURL } from 'node:url';

const mock = pathToFileURL('/docs/design/mocks/DS-006.html').href;

test('shows compact list-first sections and keeps the shared header in view', async ({ page }, info) => {
  const mobile = info.project.name.startsWith('mobile');
  await page.setViewportSize(mobile ? { width: 320, height: 800 } : { width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(mock);

  await expect(page.getByRole('navigation', { name: 'Navigare între machete de design' })).toBeVisible();
  await expect(page.getByText('Panou de previzualizare · numai pentru machetă')).toBeVisible();
  const header = page.locator('.viewer-header');
  await expect(header).toBeVisible();
  const headerBox = await header.boundingBox();
  expect(headerBox.y).toBeLessThan(await page.evaluate(() => innerHeight));
  await expect(page.getByRole('heading', { name: 'Administrare', level: 1 })).toBeVisible();
  await expect(page.locator('.page-heading p')).toHaveCount(0);
  const tabs = page.getByRole('tablist', { name: 'Secțiuni de administrare' });
  await expect(tabs.getByRole('tab')).toHaveCount(3);

  const accounts = page.getByRole('tabpanel', { name: 'Conturi' });
  await expect(accounts.getByRole('row')).toHaveCount(4);
  await expect(accounts.getByText('cont.arhiva')).toBeVisible();
  await expect(accounts.getByText('cont.consultare')).toBeVisible();
  await expect(accounts.getByText('arhivar', { exact: true })).toBeVisible();
  await expect(accounts.getByText('cititor', { exact: true })).toBeVisible();
  await expect(accounts.locator('form')).toHaveCount(0);
  await expect(accounts.getByRole('button', { name: 'Cont nou' })).toBeVisible();
  await expect(page.getByLabel('Mod întunecat')).toHaveCSS('min-height', '48px');

  if (mobile) {
    if (info.project.name.endsWith('dark')) await page.getByLabel('Mod întunecat').click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => innerWidth));
    await page.screenshot({ path: `/screens/DS-006.mobile-${info.project.name.endsWith('dark') ? 'dark' : 'light'}.png`, fullPage: true, scale: 'css' });
  } else if (info.project.name === 'desktop-light') {
    await page.screenshot({ path: '/screens/DS-006.light.png', fullPage: true, scale: 'css' });
    await page.getByLabel('Mod întunecat').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.screenshot({ path: '/screens/DS-006.dark.png', fullPage: true, scale: 'css' });
  }
});

test('opens account creation only on request and searches synthetic accounts', async ({ page }) => {
  await page.goto(mock);
  const accounts = page.getByRole('tabpanel', { name: 'Conturi' });
  await expect(accounts.locator('form')).toHaveCount(0);
  await accounts.getByRole('button', { name: 'Cont nou' }).click();
  const dialog = page.getByRole('dialog', { name: 'Cont nou' });
  await expect(dialog.getByLabel('Nume de utilizator')).toBeVisible();
  await expect(dialog.getByLabel('Parolă inițială')).toHaveAttribute('type', 'password');
  await expect(dialog.getByLabel('Rol', { exact: true })).toHaveText(/admin[\s\S]*arhivar[\s\S]*cititor/);
  await expect(dialog.getByRole('button', { name: 'Creează cont' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(accounts.getByRole('button', { name: 'Cont nou' })).toBeFocused();

  await accounts.getByRole('button', { name: 'Cont nou' }).click();
  const creation = page.getByRole('dialog', { name: 'Cont nou' });
  await creation.getByLabel('Nume de utilizator').fill('cititor.nou');
  await creation.getByLabel('Parolă inițială').fill('parola-sintetica');
  await creation.getByLabel('Rol', { exact: true }).selectOption('cititor');
  await creation.getByRole('button', { name: 'Creează cont' }).click();
  await expect(page.getByRole('status')).toHaveText('Modificarea este previzualizată; datele nu se salvează.');
  await expect(accounts.getByText('cititor.nou')).toHaveCount(0);

  const search = page.getByRole('searchbox', { name: 'Caută conturi' });
  await search.fill('cont.consultare');
  await expect(accounts.getByRole('row')).toHaveCount(2);
  await expect(accounts.getByRole('row').filter({ hasText: 'cont.arhiva' })).toBeHidden();
  await search.fill('necunoscut');
  await expect(page.getByText('Nu există conturi care să corespundă căutării.')).toBeVisible();
  await search.clear();
  await expect(accounts.getByRole('row')).toHaveCount(4);
  await accounts.getByRole('button', { name: 'Detalii', exact: true }).first().click();
  await expect(page.getByRole('dialog', { name: 'cont.arhiva' })).toContainText('Rol: arhivar');
});

test('preserves printed dossier numbers including duplicates and opens details on demand', async ({ page }) => {
  await page.goto(mock);
  const tabs = page.getByRole('tablist', { name: 'Secțiuni de administrare' });
  const dossierTab = tabs.getByRole('tab', { name: 'Dosare fizice' });
  await tabs.getByRole('tab', { name: 'Conturi' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(dossierTab).toBeFocused();
  await page.keyboard.press('Enter');
  const dossiers = page.getByRole('tabpanel', { name: 'Dosare fizice' });
  await expect(dossierTab).toHaveAttribute('aria-selected', 'true');
  await expect(dossiers.getByText('Dosar nr. 029/02014')).toBeVisible();
  await expect(dossiers.getByRole('cell', { name: 'Dosar nr. 004', exact: true })).toHaveCount(2);
  await dossiers.getByRole('button', { name: 'Detalii' }).nth(1).click();
  await expect(page.getByRole('dialog', { name: 'Dosar nr. 004 · Succesiuni · 2024' })).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText('Succesiuni · 2024');
  await page.getByRole('button', { name: 'Închide' }).click();
  const search = page.getByRole('searchbox', { name: 'Caută dosare fizice' });
  await search.fill('029/02014');
  await expect(dossiers.getByRole('row')).toHaveCount(2);
  await expect(dossiers.getByRole('row').nth(1)).toContainText('Dosar nr. 029/02014');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => innerWidth));
});

test('shows effective dossier access by selected role and explains precedence on demand', async ({ page }, info) => {
  await page.setViewportSize(info.project.name.startsWith('mobile') ? { width: 320, height: 800 } : { width: 1440, height: 900 });
  await page.goto(mock);
  const tabs = page.getByRole('tablist', { name: 'Secțiuni de administrare' });
  await tabs.getByRole('tab', { name: 'Permisiuni' }).click();
  const permissions = page.getByRole('tabpanel', { name: 'Permisiuni' });
  const account = permissions.getByLabel('Cont');
  const rows = permissions.getByRole('row');
  await expect(rows).toHaveCount(4);
  await expect(rows.nth(1)).toContainText('Dosar nr. 029/02014');
  await expect(rows.nth(1)).toContainText('Refuzat');
  await expect(rows.nth(2)).toContainText('Permis');
  await expect(permissions.getByText('Acces refuzat implicit', { exact: true })).toHaveCount(0);

  await rows.nth(1).getByRole('button', { name: 'Detalii' }).click();
  const detail = page.getByRole('dialog', { name: 'Dosar nr. 029/02014' });
  await expect(detail).toContainText('Accesul rolului');
  await expect(detail).toContainText('Permis · rol cititor');
  await expect(detail).toContainText('Permisiune individuală');
  await expect(detail).toContainText('Refuzat');
  await expect(detail).toContainText('Acces efectiv');
  if (info.project.name === 'desktop-light') await page.screenshot({ path: '/screens/DS-006.permission-detail.light.png', fullPage: true, scale: 'css' });
  await page.getByRole('button', { name: 'Închide' }).click();

  await account.selectOption('cont.arhiva');
  await expect(permissions.getByText('Acces nerestricționat · rol arhivar')).toBeVisible();
  await expect(rows.nth(1)).toContainText('Permis');
  await expect(rows.nth(1).getByRole('button', { name: 'Detalii' })).toHaveCount(0);
  await account.selectOption('notar.admin');
  await expect(permissions.getByText('Acces nerestricționat · rol admin')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => innerWidth));
});

test('captures dossier and permission list views in both themes', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop-light');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(mock);
  const tabs = page.getByRole('tablist', { name: 'Secțiuni de administrare' });
  await tabs.getByRole('tab', { name: 'Dosare fizice' }).click();
  await page.screenshot({ path: '/screens/DS-006.dossiers.light.png', fullPage: true, scale: 'css' });
  await tabs.getByRole('tab', { name: 'Permisiuni' }).click();
  await page.screenshot({ path: '/screens/DS-006.permissions.light.png', fullPage: true, scale: 'css' });
  await page.getByRole('row').nth(1).getByRole('button', { name: 'Detalii' }).click();
  await page.screenshot({ path: '/screens/DS-006.permission-detail.light.png', fullPage: true, scale: 'css' });

  await page.getByRole('button', { name: 'Închide' }).click();
  await page.getByLabel('Mod întunecat').click();
  await tabs.getByRole('tab', { name: 'Dosare fizice' }).click();
  await page.screenshot({ path: '/screens/DS-006.dossiers.dark.png', fullPage: true, scale: 'css' });
  await tabs.getByRole('tab', { name: 'Permisiuni' }).click();
  await page.screenshot({ path: '/screens/DS-006.permissions.dark.png', fullPage: true, scale: 'css' });
  await page.getByRole('row').nth(1).getByRole('button', { name: 'Detalii' }).click();
  await page.screenshot({ path: '/screens/DS-006.permission-detail.dark.png', fullPage: true, scale: 'css' });
});

test('previews empty, loading, error and success states without network or persistence', async ({ page }, info) => {
  const outgoing = [];
  page.on('request', request => { if (!request.url().startsWith('file:')) outgoing.push(request.url()); });
  await page.addInitScript(() => {
    window.fetch = () => { throw new Error('Unexpected network request'); };
    Storage.prototype.setItem = () => { throw new Error('Unexpected persistence'); };
  });
  await page.goto(mock);
  const state = page.getByLabel('Stare pentru previzualizare');
  const message = page.getByRole('status');
  for (const [value, copy] of [
    ['empty', 'Nu există înregistrări în această listă.'],
    ['loading', 'Se încarcă datele…'],
    ['error', 'Nu am putut actualiza lista. Verifică datele și încearcă din nou.'],
    ['success', 'Modificarea este previzualizată; datele nu se salvează.'],
    ['long', 'Utilizator_exemplu_cu_un_nume_extins_pentru_verificarea_adaptării'],
  ]) {
    await state.selectOption(value);
    await expect(page.getByRole('main')).toHaveAttribute('data-state', value);
    await expect(message).toContainText(copy);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => innerWidth));
    if (info.project.name === 'desktop-light' && ['empty', 'error', 'long'].includes(value)) {
      await page.screenshot({ path: `/screens/DS-006.${value}.light.png`, fullPage: true, scale: 'css' });
      await page.getByLabel('Mod întunecat').click();
      await page.screenshot({ path: `/screens/DS-006.${value}.dark.png`, fullPage: true, scale: 'css' });
      await page.getByLabel('Mod luminos').click();
    }
  }
  expect(outgoing).toEqual([]);
});
