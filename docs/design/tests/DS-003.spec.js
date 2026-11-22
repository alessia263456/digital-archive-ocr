import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const mock = pathToFileURL(resolve('../docs/design/mocks/DS-003.html')).href;
const scenarios = [
  ['gol', 'Gol', 'Nu ai documente în procesare.'],
  ['pdf', 'PDF / DOCX', 'Trage aici fișierele PDF sau DOCX'],
  ['imagini', 'Asamblare imagini', '3 pagini'],
  ['incarcare', 'Se încarcă', 'Transfer în curs'],
  ['procesare', 'Procesare', 'OCR în curs'],
  ['gata', 'Gata de revizuit', 'Începe revizuirea'],
  ['ciorna', 'Ciornă salvată', 'Continuă revizuirea'],
  ['eroare', 'Eroare', 'OCR eșuat'],
  ['duplicat', 'Duplicat exact', 'Vezi documentul existent'],
  ['carantina', 'Carantină', 'În carantină'],
  ['lung', 'Nume lungi', 'Revizuire începută'],
];

test('keeps processing, ready documents and saved drafts in separate sections', async ({ page }) => {
  await page.goto(mock);
  const toolbar = page.getByRole('complementary', { name: 'Comenzi mock de test' });
  const processing = page.getByRole('region', { name: 'În procesare' });
  const ready = page.getByRole('region', { name: 'Gata de revizuit' });
  const saved = page.getByRole('region', { name: 'Ciorne salvate' });

  await toolbar.getByRole('button', { name: 'Procesare', exact: true }).click();
  await expect(processing.getByText('În așteptare', { exact: true })).toBeVisible();
  await expect(processing.getByText('OCR în curs', { exact: true })).toBeVisible();
  await toolbar.getByRole('button', { name: 'Gata de revizuit', exact: true }).click();
  await expect(ready.getByText('Contract_exemplu.pdf', { exact: true })).toBeVisible();
  await expect(ready.getByRole('listitem').filter({ hasText: 'Contract_exemplu.pdf' }).getByRole('link', { name: 'Începe revizuirea' })).toHaveAttribute('href', /ecran=DS-011/);
  await expect(saved.getByRole('listitem')).toHaveCount(0);
  await toolbar.getByRole('button', { name: 'Ciornă salvată', exact: true }).click();
  await expect(ready.getByText('Contract_exemplu.pdf', { exact: true })).toBeVisible();
  await expect(saved.getByText('Procură_exemplu.docx', { exact: true })).toBeVisible();
  const savedReview = saved.getByRole('listitem').filter({ hasText: 'Procură_exemplu.docx' }).getByRole('link', { name: 'Continuă revizuirea' });
  await expect(savedReview).toHaveAttribute('href', /ecran=DS-011.*reluare=1/);
  await expect(processing.getByText('Procură_exemplu.docx', { exact: true })).toHaveCount(0);
  await expect(ready.getByText('Procură_exemplu.docx', { exact: true })).toHaveCount(0);
  await expect(saved.getByText('Contract_exemplu.pdf', { exact: true })).toHaveCount(0);
  await savedReview.click();
  await expect(page.getByRole('heading', { name: 'Revizuire document · Simulare' })).toBeVisible();
  await expect(page.getByRole('main').getByText('Procură_exemplu.docx', { exact: true })).toBeVisible();
  await toolbar.getByRole('button', { name: 'Gol', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Încărcare documente' })).toBeVisible();
  await toolbar.getByRole('button', { name: 'Carantină', exact: true }).click();
  await expect(processing.getByRole('listitem')).toHaveCount(0);
  await expect(page.getByRole('list', { name: 'Documente trimise în carantină' })
    .getByRole('link', { name: 'Deschide coada de carantină' })).toBeVisible();
});

test('shows live section counts and the three latest saved drafts', async ({ page, isMobile, colorScheme }) => {
  await page.setViewportSize({ width: isMobile ? 320 : 1440, height: 1000 });
  await page.goto(mock);
  const processing = page.getByRole('region', { name: 'În procesare' });
  const ready = page.getByRole('region', { name: 'Gata de revizuit' });
  const saved = page.getByRole('region', { name: 'Ciorne salvate' });
  const toolbar = page.getByRole('complementary', { name: 'Comenzi mock de test' });
  for (const section of [processing, ready, saved]) {
    await expect(section.getByLabel('Număr documente')).toHaveText('0');
  }
  const neutral = colorScheme === 'dark' ? 'rgb(22, 32, 46)' : 'rgb(242, 239, 233)';
  await expect(ready.getByLabel('Număr documente')).toHaveCSS('background-color', neutral);
  await toolbar.getByRole('button', { name: 'Ciornă salvată', exact: true }).click();
  await expect(processing.getByLabel('Număr documente')).toHaveText('1');
  await expect(ready.getByLabel('Număr documente')).toHaveText('1');
  await expect(ready.getByLabel('Număr documente')).toHaveCSS('background-color',
    colorScheme === 'dark' ? 'rgb(229, 158, 91)' : 'rgb(206, 137, 70)');
  await expect(ready.locator('header')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(ready.locator('header')).toHaveCSS('box-shadow', 'none');
  await expect(saved.getByLabel('Număr documente')).toHaveText('5');
  const items = saved.getByRole('listitem');
  await expect(items).toHaveCount(3);
  await expect(items.first()).toContainText('Procură_exemplu.docx');
  await expect(items.nth(2)).toContainText('Certificat_exemplu.pdf');
  await expect(items.first()).toHaveCSS('border-top-style', 'solid');

  const [processingBox, readyBox, savedBox] = await Promise.all(
    [processing, ready, saved].map(section => section.boundingBox()),
  );
  if (isMobile) {
    expect(readyBox.x).toBe(processingBox.x);
    expect(readyBox.y).toBeGreaterThan(processingBox.y + processingBox.height);
  } else {
    expect(readyBox.x).toBeGreaterThan(processingBox.x + processingBox.width);
    expect(readyBox.y).toBe(processingBox.y);
  }
  expect(savedBox.y).toBeGreaterThan(Math.max(readyBox.y + readyBox.height, processingBox.y + processingBox.height));

  const all = saved.getByRole('button', { name: 'Vezi toate' });
  await all.focus();
  await page.keyboard.press('Enter');
  await expect(items).toHaveCount(5);
  await expect(saved.getByRole('button', { name: 'Arată mai puține' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(items).toHaveCount(3);
  await expect(all).toBeFocused();
});

test('switches selection cards and rearranges only synthetic pages', async ({ page, isMobile }) => {
  await page.goto(mock);
  const pdf = page.getByRole('button', { name: 'PDF / DOCX', exact: true }).last();
  const images = page.getByRole('button', { name: 'Imagini (JPG / PNG)', exact: true });
  await expect(pdf).toHaveAttribute('aria-pressed', 'true');
  const [pdfBox, imageBox] = await Promise.all([pdf.boundingBox(), images.boundingBox()]);
  expect(imageBox.x).toBe(pdfBox.x + pdfBox.width);
  await images.focus();
  await expect(images).toHaveCSS('outline-style', 'solid');
  await page.keyboard.press('Enter');
  await expect(images).toHaveAttribute('aria-pressed', 'true');
  await expect(images).toHaveCSS('background-color', 'rgb(70, 207, 195)');
  await expect(images).toHaveCSS('color', 'rgb(7, 45, 92)');
  await expect(images).toHaveCSS('box-shadow', 'none');
  await expect(images.getByText('Selectat')).toBeVisible();
  await expect(pdf).toHaveAttribute('aria-pressed', 'false');

  const pages = page.getByRole('list', { name: 'Ordinea paginilor' });
  const add = page.getByRole('button', { name: 'Adaugă imagini' });
  for (let count = 1; count <= 3; count++) {
    await add.click();
    await expect(pages.getByRole('listitem')).toHaveCount(count);
  }
  const actions = number => pages.getByRole('button', { name: 'Acțiuni pentru pagina ' + number });
  await actions(2).focus();
  await page.keyboard.press('Enter');
  await expect(actions(2)).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Tab');
  await expect(pages.getByRole('button', { name: 'Mută la stânga' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(pages.getByRole('listitem').first()).toContainText('pagina-2.png');
  await expect(actions(1)).toBeFocused();
  await expect(page.getByRole('status')).toContainText('poziția 1');

  await page.keyboard.press('Enter');
  await expect(pages.getByRole('button', { name: 'Mută la stânga' })).toBeDisabled();
  await expect(pages.getByRole('button', { name: 'Mută la dreapta' })).toBeEnabled();
  await page.keyboard.press('Escape');
  await expect(actions(1)).toHaveAttribute('aria-expanded', 'false');

  await actions(3).click();
  await pages.getByRole('button', { name: 'Elimină pagina' }).click();
  await expect(pages.getByRole('listitem')).toHaveCount(2);
  await expect(actions(2)).toBeFocused();
  await page.getByRole('button', { name: 'Anulează eliminarea paginii' }).click();
  await expect(pages.getByRole('listitem')).toHaveCount(3);
  if (isMobile) {
    await actions(3).tap();
    await pages.getByRole('button', { name: 'Mută la stânga' }).tap();
    await expect(pages.getByRole('listitem').nth(1)).toContainText('pagina-3.jpg');
  } else {
    await pages.locator('.drag-handle').last().dragTo(pages.getByRole('listitem').first());
    await expect(pages.getByRole('listitem').first()).toContainText('pagina-3.jpg');
  }
  await page.getByRole('button', { name: 'Salvează și procesează' }).click();
  await expect(page.getByText('Transfer în curs', { exact: true })).toHaveCount(0);
});

test('preview actions use no file ingestion, network, persistence or scheduled processing', async ({ page }) => {
  const outgoing = [];
  page.on('request', request => {
    if (!request.url().startsWith('file:')) outgoing.push(request.url());
  });
  await page.addInitScript(() => {
    const unexpected = name => () => { throw new Error('Unexpected prototype operation: ' + name); };
    window.fetch = unexpected('fetch');
    window.XMLHttpRequest = unexpected('XHR');
    window.setTimeout = unexpected('timer');
    window.setInterval = unexpected('interval');
    window.FileReader = unexpected('file reader');
    window.Worker = unexpected('worker');
    URL.createObjectURL = unexpected('object URL');
    Storage.prototype.setItem = unexpected('storage');
    IDBFactory.prototype.open = unexpected('database');
    SubtleCrypto.prototype.digest = unexpected('hash');
  });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(mock);
  await expect(page.locator('input[type=file], form')).toHaveCount(0);
  const zone = page.getByTestId('dropzone');
  const before = await page.getByRole('main').innerText();
  const dataTransfer = await page.evaluateHandle(() => {
    const transfer = new DataTransfer();
    transfer.items.add(new File(['exemplu'], 'intrare-externa.pdf'));
    return transfer;
  });
  await zone.dispatchEvent('drop', { dataTransfer, cancelable: true });
  await dataTransfer.dispose();
  expect(await page.getByRole('main').innerText()).toBe(before);
  await page.getByRole('button', { name: 'Alege fișiere' }).click();
  await expect(page.getByText('Contract_exemplu.pdf', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Se încarcă', exact: true }).click();
  const progress = page.getByRole('progressbar');
  await expect(progress).toHaveAttribute('value', '64');
  await expect(page.getByRole('button', { name: 'Imagini (JPG / PNG)', exact: true })).toBeDisabled();
  expect(errors).toEqual([]);
  expect(outgoing).toEqual([]);
});

test('switches the whole preview between themes by keyboard', async ({ page, colorScheme }) => {
  await page.goto(mock);
  const theme = page.getByRole('button', { name: 'Comută tema între luminos și întunecat' });
  const color = { light: 'rgb(250, 248, 245)', dark: 'rgb(30, 41, 59)' };
  await expect(page.locator('body')).toHaveCSS('background-color', color[colorScheme]);
  await theme.focus();
  await page.keyboard.press('Enter');
  const opposite = colorScheme === 'dark' ? 'light' : 'dark';
  await expect(page.locator('html')).toHaveAttribute('data-theme', opposite);
  await expect(page.locator('body')).toHaveCSS('background-color', color[opposite]);
  await expect(page.getByRole('region', { name: 'Adaugă documente' })).toHaveCSS('background-color',
    opposite === 'dark' ? 'rgb(40, 53, 72)' : 'rgb(255, 255, 255)');
  await page.keyboard.press('Space');
  await expect(page.locator('body')).toHaveCSS('background-color', color[colorScheme]);
});

test('captures each scenario at the supported widths with reduced motion', async ({ page, isMobile, colorScheme }, info) => {
  await page.setViewportSize(isMobile ? { width: 320, height: 800 } : { width: 1440, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(mock);
  const toolbar = page.getByRole('complementary', { name: 'Comenzi mock de test' });
  await page.keyboard.press('Tab');
  await expect(toolbar.getByRole('button', { name: 'Gol', exact: true })).toBeFocused();
  await expect(toolbar.getByRole('button', { name: 'Gol', exact: true })).toHaveCSS('transition-duration', '0s');
  for (const [id, label, content] of scenarios) {
    const button = toolbar.getByRole('button', { name: label, exact: true });
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(button).toHaveCSS('background-color',
      colorScheme === 'dark' ? 'rgb(96, 165, 250)' : 'rgb(7, 45, 92)');
    await expect(toolbar.locator('[data-scenario][aria-pressed=true]')).toHaveCount(1);
    await expect(page.locator('main').getByText(content, { exact: true }).first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => innerWidth));
    if (id === 'lung') {
      const name = page.getByText(/^Dosar_sintetic_.+\.docx$/);
      await expect(name).toHaveAttribute('title', /^Dosar_sintetic_.+\.docx$/);
      await expect(name).toHaveCSS('text-overflow', 'ellipsis');
      await expect(name).toHaveCSS('white-space', 'nowrap');
      expect(await name.evaluate(node => node.scrollWidth > node.clientWidth)).toBe(true);
    }
    await button.blur();
    await page.screenshot({ path: info.outputPath(id + '.png'), fullPage: true, scale: 'css' });
    if (id === 'imagini') {
      await page.getByRole('button', { name: 'Acțiuni pentru pagina 2' }).click();
      await page.screenshot({ path: info.outputPath('imagini-meniu.png'), fullPage: true, scale: 'css' });
    }
  }
});
