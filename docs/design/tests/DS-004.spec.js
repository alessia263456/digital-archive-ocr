import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const mock = pathToFileURL(resolve('../docs/design/mocks/DS-004.html')).href;

test('opens each private draft in the editor, including one with zero uncertain matches', async ({ page }) => {
  await page.goto(mock);
  const review = page.getByRole('tabpanel', { name: 'Revizuire' });
  const fresh = review.getByRole('listitem').filter({ hasText: 'Contract_exemplu.pdf' });
  await expect(fresh).toContainText('0 potriviri PII incerte');
  await expect(fresh).toContainText('Revizuirea umană este obligatorie înainte de aprobare.');
  await fresh.getByRole('link', { name: 'Începe revizuirea' }).click();
  await expect(page.getByRole('heading', { name: 'Revizuire document · Simulare' })).toBeVisible();
  await expect(page.getByRole('main')).toContainText('Contract_exemplu.pdf');
  await page.goBack();

  await review.getByRole('link', { name: 'Continuă revizuirea' }).click();
  await expect(page).toHaveURL(/ecran=DS-011.*reluare=1/);
  await expect(page.getByRole('main')).toContainText('Procură_exemplu.docx');
});

test('shows the approved OCR attempt count and confirms the permanent failure status', async ({ page }) => {
  await page.goto(mock + '?carantina=1');
  const quarantine = page.getByRole('tabpanel', { name: 'Carantină' });
  const failure = quarantine.getByRole('listitem').filter({ hasText: 'Scanare_deteriorată.pdf' });
  await expect(failure).toContainText('4 încercări de OCR eșuate: încercarea inițială și 3 reîncercări.');
  const mark = failure.getByRole('button', { name: 'Marchează ca eșuat definitiv' });
  await mark.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Starea documentului devine „Eșuat definitiv”. Fișierul rămâne păstrat.');
  await dialog.getByRole('button', { name: 'Renunță' }).click();
  await expect(mark).toBeFocused();
  await mark.click();
  await dialog.getByRole('button', { name: 'Confirmă schimbarea stării' }).click();
  await expect(quarantine.getByRole('status')).toHaveText('Stare actualizată: Eșuat definitiv.');

  await page.goto(mock + '?carantina=1&stare=eroare-actiune');
  await failure.getByRole('button', { name: 'Reîncearcă procesarea' }).click();
  await expect(quarantine.getByRole('alert')).toContainText('Nu am putut trimite documentul la procesare.');
  await failure.getByRole('button', { name: 'Reîncearcă procesarea' }).click();
  await expect(quarantine.getByRole('status')).toHaveText('Documentul a fost trimis din nou la procesare.');
});

test('checks the header and captures both queues at the review widths', async ({ page, isMobile, colorScheme }, info) => {
  await page.setViewportSize(isMobile ? { width: 320, height: 800 } : { width: 1440, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(mock);
  await page.evaluate(() => document.fonts.ready);
  const header = page.getByRole('banner');
  const title = header.getByRole('heading', { name: 'Cozi de lucru' });
  await expect(header).toHaveCSS('height', '54px');
  await expect(header).toHaveCSS('padding-inline-start', '16px');
  await expect(header).toHaveCSS('background-color', colorScheme === 'dark' ? 'rgb(40, 53, 72)' : 'rgb(255, 255, 255)');
  await expect(title).toHaveCSS('font-size', '16px');
  await expect(title).toHaveCSS('font-weight', '600');
  await expect(title).toHaveCSS('line-height', '24px');
  await page.screenshot({ path: info.outputPath('revizuire.png'), fullPage: true, scale: 'css' });

  await page.getByRole('tab', { name: 'Revizuire' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Carantină' })).toBeFocused();
  await expect(page.getByRole('tabpanel', { name: 'Carantină' })).toBeVisible();
  await page.getByRole('tabpanel', { name: 'Carantină' }).focus();
  await page.screenshot({ path: info.outputPath('carantina.png'), fullPage: true, scale: 'css' });

  for (const [state, text] of [
    ['gol', 'Nu sunt documente în carantină.'],
    ['incarcare', 'Se încarcă documentele…'],
    ['eroare', 'Nu am putut încărca documentele.'],
    ['lung', 'Dosar_sintetic_documente_justificative_documente_justificative_documente_justificative_exemplu.pdf'],
  ]) {
    await page.goto(mock + '?carantina=1&stare=' + state);
    await expect(page.getByRole('tabpanel', { name: 'Carantină' }).getByText(text, { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => innerWidth));
  }
});
