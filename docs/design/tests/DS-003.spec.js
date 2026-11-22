import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const mock = pathToFileURL(resolve('../docs/design/mocks/DS-003.html')).href;
const file = name => ({ name, mimeType: 'application/octet-stream', buffer: Buffer.from('Exemplu sintetic') });

async function drop(page, names, type = 'application/octet-stream', target = page.getByTestId('dropzone')) {
  const dataTransfer = await page.evaluateHandle(({ names, type }) => {
    const transfer = new DataTransfer();
    for (const name of names) transfer.items.add(new File(['Exemplu sintetic'], name, { type }));
    return transfer;
  }, { names, type });
  await target.dispatchEvent('drop', { dataTransfer });
  await dataTransfer.dispose();
}

test('handles mixed independent uploads and moves completed OCR into review', async ({ page }) => {
  await page.clock.install();
  await page.goto(mock);
  await expect(page.getByRole('heading', { level: 1, name: 'Încărcare documente' })).toBeVisible();
  await page.locator('input[type=file]').setInputFiles(['duplicat.pdf', 'act.docx', 'gresit.txt', 'transfer.pdf'].map(file));
  await expect(page.getByText('Transfer în curs', { exact: true })).toBeVisible();
  await expect(page.getByText('Format neacceptat', { exact: false })).toBeVisible();
  const existing = page.getByRole('link', { name: 'Vezi documentul existent' });
  await expect(existing).toHaveAttribute('href', /ecran=DS-002/);
  await expect(page.getByText('Original DOCX păstrat')).toBeVisible();

  await drop(page, ['corupt.pdf', 'carantina.pdf', 'similar.pdf']);
  await page.clock.runFor(1100);
  const processing = page.getByRole('region', { name: 'În procesare' });
  await expect(processing.getByText('În așteptare', { exact: true }).first()).toBeVisible();
  await page.clock.runFor(5500);
  await expect(processing.getByText('OCR în curs', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reîncearcă transferul' })).toBeVisible();
  await expect(processing.getByText('OCR eșuat', { exact: true })).toBeVisible();
  await expect(processing.getByText('În carantină', { exact: true })).toBeVisible();
  await expect(processing.getByText(/Posibil duplicat după OCR/)).toBeVisible();

  await page.clock.runFor(12000);
  const drafts = page.getByRole('region', { name: 'Ciorne recente' });
  await expect(processing.getByText('similar.pdf')).toHaveCount(0);
  const similar = drafts.getByRole('listitem').filter({ hasText: 'similar.pdf' });
  await expect(similar.getByText('Nerevizuită')).toBeVisible();
  await similar.getByRole('link', { name: 'Începe revizuirea' }).click();
  await expect(page).toHaveURL(/ecran=DS-011.*ocr=1/);
  await expect(page.getByText(/Posibil duplicat după OCR/)).toBeVisible();

  await page.goto(mock + '?stare=succes');
  await page.getByRole('link', { name: 'Continuă revizuirea' }).click();
  await expect(page).toHaveURL(/ecran=DS-011.*reluare=1/);
  await page.goto(mock + '?stare=succes');
  await page.getByRole('link', { name: 'Deschide coada de revizuire' }).click();
  await expect(page).toHaveURL(/ecran=DS-004/);
});

test('organizes image pages and distinguishes exact matches from warnings', async ({ page }) => {
  await page.goto(mock);
  await page.getByRole('button', { name: 'Imagini (JPG / PNG)' }).click();
  const input = page.locator('input[type=file]');
  await expect(input).toHaveAttribute('multiple', '');
  await input.setInputFiles(['pagina-1.jpg', 'pagina-2.png', 'pagina-1.jpg'].map(file));
  const pages = page.getByRole('list', { name: 'Ordinea paginilor' });
  const save = page.getByRole('button', { name: 'Salvează și procesează' });
  await expect(pages.getByRole('listitem')).toHaveCount(3);
  await expect(save).toBeDisabled();
  await expect(page.getByText(/Aceeași succesiune/)).toBeVisible();

  const move = pages.getByRole('button', { name: /Mută pagina 2 mai sus/ });
  await move.focus();
  await page.keyboard.press('Enter');
  await expect(pages.getByRole('listitem').first()).toContainText('pagina-2.png');
  await expect(pages.getByRole('button', { name: /Mută pagina 1 mai jos/ })).toBeFocused();
  await expect(page.getByRole('status')).toContainText('poziția 1');
  await expect(page.getByText(/Aceleași pagini, în altă ordine/)).toBeVisible();
  await expect(save).toBeEnabled();

  await pages.getByRole('button', { name: /Elimină pagina 3/ }).click();
  await expect(pages.getByRole('listitem')).toHaveCount(2);
  await expect(pages.getByRole('button', { name: /Elimină pagina 2/ })).toBeFocused();
  await expect(page.getByText(/Aceleași pagini, în altă ordine/)).toHaveCount(0);
  await drop(page, ['pagina-3.png'], 'image/png');
  await expect(pages.getByRole('listitem')).toHaveCount(3);
  await page.clock.install();
  await save.click();
  await expect(page.getByText('Transfer în curs', { exact: true })).toBeVisible();
  await expect(pages.getByRole('listitem')).toHaveCount(0);
  await page.clock.runFor(18000);
  await expect(page.getByRole('region', { name: 'Ciorne recente' }).getByText('Document din 3 imagini')).toBeVisible();
});

for (const [state, text] of Object.entries({
  gol: 'Nu ai documente în procesare.',
  incarcare: 'Transfer în curs',
  eroare: 'În carantină',
  succes: 'Revizuire începută',
  lung: 'Revizuire începută',
})) {
  test(`renders the ${state} preview without horizontal overflow`, async ({ page, isMobile, colorScheme }, info) => {
    await page.setViewportSize(isMobile ? { width: 320, height: 800 } : { width: 1440, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(mock + '?stare=' + state);
    await expect(page.getByText(text, { exact: true }).first()).toBeVisible();
    await expect(page.locator('body')).toHaveCSS('background-color', colorScheme === 'dark' ? 'rgb(30, 41, 59)' : 'rgb(250, 248, 245)');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => innerWidth));
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus-visible')).toHaveCount(1);
    if (state === 'lung') {
      const name = page.getByText(/^Dosar_sintetic_.+\.docx$/).first();
      await expect(name).toBeVisible();
      await expect(name).toHaveAttribute('title', /^Dosar_sintetic_.+\.docx$/);
    }
    await page.locator(':focus').blur();
    await page.screenshot({ path: info.outputPath('DS-003.png'), fullPage: true });
    if (state === 'succes') {
      await page.getByRole('button', { name: 'Imagini (JPG / PNG)' }).click();
      await expect(page.getByRole('list', { name: 'Ordinea paginilor' }).getByRole('listitem')).toHaveCount(3);
      await page.screenshot({ path: info.outputPath('DS-003-imagini.png'), fullPage: true });
    }
  });
}
