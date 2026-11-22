import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const mock = pathToFileURL(resolve('../docs/design/mocks/DS-011.html')).href;
const saved = '?document=Procur%C4%83_exemplu.docx&reluare=1';
const steps = ['Date document', 'Corectare OCR', 'Anonimizare', 'Verificare finală'];
const workspace = page => page.getByRole('region', { name: 'Spațiu de lucru' });
const field = (page, name) => page.getByLabel(name, { exact: true });
const mark = (page, id) => page.locator('[data-coverage="' + id + '"]');

async function expectCovered(page, text, id) {
  const ink = await page.locator('#scan').getByText(text, { exact: true }).evaluate(line => {
    const range = document.createRange();
    range.selectNodeContents(line);
    const { x, y, width, height } = range.getBoundingClientRect();
    return { x, y, width, height };
  });
  const box = await mark(page, id).boundingBox();
  expect(box.x).toBeLessThanOrEqual(ink.x);
  expect(box.y).toBeLessThanOrEqual(ink.y);
  expect(box.x + box.width).toBeGreaterThanOrEqual(ink.x + ink.width);
  expect(box.y + box.height).toBeGreaterThanOrEqual(ink.y + ink.height);
}

async function step(page, index) {
  const link = page.getByRole('navigation', { name: 'Pașii revizuirii' }).getByRole('link', { name: new RegExp(steps[index]) });
  await link.click();
  await expect(link).toHaveAttribute('aria-current', 'step');
  await expect(workspace(page).getByRole('heading', { name: steps[index], exact: true })).toBeFocused();
}

async function confirmMetadata(page) {
  await field(page, 'Data actului').fill('2026-11-20');
  await page.getByRole('button', { name: 'Confirmă metadatele' }).click();
}

test('opens both queue entries and requires explicit approval even for zero uncertain matches', async ({ page }) => {
  await page.goto(mock);
  const entry = page.getByRole('link', { name: 'Începe revizuirea' });
  await expect(entry).toHaveAttribute('href', /document=Contract_exemplu.pdf/);
  await entry.click();
  await expect(workspace(page).getByRole('heading', { name: steps[0] })).toBeVisible();
  await expect(field(page, 'Data actului')).toHaveValue('');
  await page.getByRole('button', { name: 'Continuă', exact: true }).click();
  await expect(workspace(page).getByRole('heading', { name: steps[1] })).toBeFocused();
  await workspace(page).getByRole('button', { name: 'Înapoi', exact: true }).click();
  await confirmMetadata(page);
  await step(page, 2);
  await expect(workspace(page)).toContainText('0 potriviri incerte');
  await step(page, 3);
  const approve = page.getByRole('button', { name: 'Aprobă revizuirea' });
  await approve.click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Renunță' }).click();
  await expect(approve).toBeFocused();
  await approve.click();
  await dialog.getByRole('button', { name: 'Confirmă aprobarea' }).click();
  await expect(page.getByRole('status')).toContainText('Revizuire aprobată în simulare');
  await expect(approve).toBeFocused();

  await page.getByRole('link', { name: 'Continuă revizuirea' }).click();
  await expect(page).toHaveURL(/reluare=1/);
  await expect(workspace(page).getByRole('heading', { name: steps[2] })).toBeVisible();
  await expect(workspace(page)).toContainText('Acceptat');
  await expect(workspace(page)).toContainText('De revizuit');
});

test('keeps working state across fixtures, retries a failed save, and rechecks a mapped correction', async ({ page }) => {
  await page.goto(mock + saved + '&stare=eroare-salvare');
  await step(page, 1);
  await field(page, 'Pasaj OCR 1').fill('Semnatar: Persoană sintetică revizuită.');
  await step(page, 3);
  await expect(workspace(page)).toContainText('De reverificat');
  await workspace(page).getByRole('link', { name: 'Verifică anonimizarea' }).click();
  await expect(workspace(page)).toContainText('Decizie anterioară: Acceptat');
  await page.getByRole('button', { name: 'Acceptă din nou' }).click();
  await expect(workspace(page)).not.toContainText('De reverificat');
  await step(page, 0);
  await field(page, 'Numărul actului').fill('78');
  await page.getByRole('link', { name: 'Începe revizuirea' }).click();
  await expect(field(page, 'Numărul actului')).not.toHaveValue('78');
  await page.getByRole('link', { name: 'Continuă revizuirea' }).click();
  await expect(field(page, 'Numărul actului')).toHaveValue('78');
  await step(page, 1);
  await page.getByRole('button', { name: 'Salvează ciorna' }).click();
  await expect(page.getByRole('alert')).toContainText('Nu am putut salva ciorna');
  await page.getByRole('button', { name: 'Reîncearcă salvarea' }).click();
  await expect(page.getByRole('status')).toContainText('Ciornă salvată');
  await page.reload();
  await expect(field(page, 'Pasaj OCR 1')).toHaveValue('Semnatar: Persoană sintetică revizuită.');
  await step(page, 0);
  await expect(field(page, 'Numărul actului')).toHaveValue('78');
});

test('renders draft and final coverage in scan coordinates while preserving the Original', async ({ page }) => {
  await page.goto(mock + saved);
  const scan = page.locator('#scan');
  const original = page.getByRole('button', { name: 'Original', exact: true });
  const anonymized = page.getByRole('button', { name: 'Anonimizat', exact: true });
  const sourcePixels = async () => {
    const { width } = await scan.boundingBox();
    // Capture the scan at the same pixel origin even when the viewer toolbar changes height.
    return scan.screenshot({
      scale: 'css',
      style: `#scan { position: fixed; inset: 0 auto auto 0; width: ${width}px; margin: 0; z-index: 1; }`,
    });
  };
  const originalPixels = await sourcePixels();
  await anonymized.click();
  await expect(mark(page, 'nume')).toBeVisible();
  await page.getByRole('button', { name: 'Arată numele în document' }).click();
  await expect(workspace(page)).toContainText('TSV');
  await page.getByRole('button', { name: 'Acceptă potrivirea de referință' }).click();
  await expect(mark(page, 'referinta')).toHaveCSS('background-color', 'rgb(0, 0, 0)');
  await page.getByRole('button', { name: 'Respinge potrivirea de referință' }).click();
  await expect(mark(page, 'referinta')).toHaveCount(0);
  await field(page, 'Pasaj pentru marcaj manual').selectOption('adresa');
  await page.getByRole('button', { name: 'Marchează pasajul' }).click();
  await expect(mark(page, 'adresa')).toBeVisible();
  await original.click();
  expect((await sourcePixels()).equals(originalPixels), 'Original after toggling').toBe(true);
  await step(page, 0);
  await expect(original).toBeHidden();
  expect((await sourcePixels()).equals(originalPixels), 'Original in Date document').toBe(true);
  await step(page, 1);
  await expect(anonymized).toBeHidden();
  expect((await sourcePixels()).equals(originalPixels), 'Original in Corectare OCR').toBe(true);
  await step(page, 2);
  await anonymized.click();
  const region = async () => mark(page, 'nume').evaluate(overlay => {
    const frame = overlay.parentElement.getBoundingClientRect();
    const box = overlay.getBoundingClientRect();
    return Math.round(100 * (box.left - frame.left) / frame.width);
  });
  const left = await region();
  await page.getByRole('button', { name: 'Mărește' }).click();
  expect(await region()).toBe(left);
  await expectCovered(page, 'Persoană sintetică A', 'nume');
  await expectCovered(page, 'Strada Exemplu, nr. XX', 'adresa');
  await page.getByRole('button', { name: 'Micșorează' }).click();
  await page.getByRole('button', { name: 'Pagina următoare' }).click();

  const canvas = await scan.boundingBox();
  const viewport = await page.locator('#viewport').boundingBox();
  await page.getByRole('button', { name: 'Desenează un dreptunghi' }).click();
  await scan.scrollIntoViewIfNeeded();
  const visibleScan = await scan.boundingBox();
  const x = visibleScan.x + canvas.width * 0.13;
  const y = visibleScan.y + canvas.height * 0.51;
  expect(x).toBeLessThan(viewport.x + viewport.width);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + canvas.width * 0.26, y + canvas.height * 0.09, { steps: 4 });
  await page.mouse.up();
  await expect(mark(page, 'manual-1')).toBeVisible();
  await page.getByRole('button', { name: 'Elimină dreptunghiul 1' }).click();
  await expect(mark(page, 'manual-1')).toHaveCount(0);
  await page.getByRole('button', { name: 'Marchează zona semnăturii' }).focus();
  await page.keyboard.press('Enter');
  await expect(mark(page, 'manual-1')).toBeVisible();
  await expectCovered(page, 'Semnătură A', 'manual-1');
  await original.click();
  await expect(page.getByText('Pagina 2 din 2')).toBeVisible();
  await expect(mark(page, 'manual-1')).toHaveCount(0);

  await step(page, 3);
  await expect(anonymized).toBeHidden();
  await expect(mark(page, 'manual-1')).toBeVisible();
  await expect(scan).toContainText('Notar public');
  await page.getByRole('button', { name: 'Pagina anterioară' }).click();
  await expect(mark(page, 'adresa')).toBeVisible();
});

test('derives classification and handles confirmed future, pending, and permanent retention', async ({ page }) => {
  await page.goto(mock + '?document=Contract_exemplu.pdf');
  await expect(field(page, 'Indicativ arhivistic')).toHaveValue('IA 20');
  await expect(field(page, 'Indicativ arhivistic')).toHaveAttribute('readonly', '');
  await expect(workspace(page)).toContainText('De la împlinirea termenului prevăzut în contract');
  await expect(field(page, 'Data expirării contractului')).toHaveValue('2031-11-20');
  await step(page, 3);
  await page.getByRole('button', { name: 'Aprobă revizuirea' }).click();
  await expect(page.getByRole('alert')).toContainText('Confirmă metadatele');
  await step(page, 0);
  await confirmMetadata(page);
  await step(page, 3);
  await expect(workspace(page)).toContainText('20.11.2031');
  await workspace(page).getByRole('link', { name: 'Verifică metadatele' }).click();
  await field(page, 'Data expirării contractului').fill('');
  await page.getByRole('button', { name: 'Confirmă metadatele' }).click();
  await step(page, 3);
  await expect(workspace(page)).toContainText('Dată de retenție în așteptare');
  await page.getByRole('button', { name: 'Aprobă revizuirea' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await step(page, 0);
  await field(page, 'Subtip').selectOption({ label: 'Vânzare-cumpărare / schimb / donație / întreținere / rentă viageră' });
  await expect(field(page, 'Indicativ arhivistic')).toHaveValue('IA 1');
  await expect(field(page, 'Data expirării contractului')).toBeHidden();
  await step(page, 3);
  await expect(workspace(page)).toContainText('Păstrare permanentă');
  await expect(workspace(page)).toContainText('Fără termen de distrugere');
});

test('covers review widths, accessibility states and captures each step', async ({ page, isMobile, colorScheme }, info) => {
  await page.setViewportSize({ width: isMobile ? 320 : 1440, height: isMobile ? 800 : 1000 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(mock + saved);
  await page.evaluate(() => document.fonts.ready);
  const capture = name => page.screenshot({ path: info.outputPath(name + '.png'), fullPage: true, scale: 'css' });
  await step(page, 0);
  await capture('date-document');
  await step(page, 1);
  await capture('corectare-ocr');
  await step(page, 2);
  await capture('original');
  const toggle = page.getByRole('button', { name: 'Anonimizat', exact: true });
  await toggle.focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(toggle).toHaveCSS('outline-style', 'solid');
  await expect(toggle).toHaveCSS('transition-duration', '0s');
  if (isMobile) {
    const button = await toggle.boundingBox();
    expect(button.width).toBeGreaterThanOrEqual(44);
    expect(button.height).toBeGreaterThanOrEqual(44);
    await expect(page.getByRole('link', { name: 'Sari la spațiul de lucru' })).toBeVisible();
  }
  await page.keyboard.press('Enter');
  const contrast = await page.evaluate(() => {
    const luminance = color => {
      const channels = color.match(/\d+/g).slice(0, 3).map(value => {
        const channel = Number(value) / 255;
        return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
      });
      return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
    };
    const ratio = (color, background) => {
      const pair = [luminance(color), luminance(background)].sort((a, b) => b - a);
      return (pair[0] + 0.05) / (pair[1] + 0.05);
    };
    const style = selector => getComputedStyle(document.querySelector(selector));
    const surface = style('#workspace').backgroundColor;
    const badge = style('.badge.warning');
    const selection = style('#anonymized');
    return {
      secondary: ratio(style('#step-intro').color, surface),
      warning: ratio(badge.color, badge.backgroundColor),
      selection: ratio(selection.color, selection.backgroundColor),
      focus: ratio(style('#anonymized').outlineColor, surface),
    };
  });
  expect(contrast.secondary).toBeGreaterThanOrEqual(4.5);
  expect(contrast.warning).toBeGreaterThanOrEqual(4.5);
  expect(contrast.selection).toBeGreaterThanOrEqual(4.5);
  expect(contrast.focus).toBeGreaterThanOrEqual(3);
  await toggle.blur();
  await page.evaluate(() => scrollTo(0, 0));
  await capture(isMobile ? 'anonimizat' : 'DS-011.' + colorScheme);
  await page.getByRole('button', { name: 'Respinge potrivirea de referință' }).click();
  await field(page, 'Pasaj pentru marcaj manual').selectOption('adresa');
  await page.getByRole('button', { name: 'Marchează pasajul' }).click();
  await page.getByRole('button', { name: 'Marchează zona semnăturii' }).click();
  await step(page, 3);
  await capture('verificare-finala');
  await page.getByRole('button', { name: 'Pagina anterioară' }).click();
  await capture('verificare-finala-pagina-1');
  await page.getByRole('button', { name: 'Aprobă revizuirea' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await capture('confirmare');

  for (const [state, feedback] of [
    ['incarcare', 'Se încarcă documentul…'],
    ['gol', 'Nu există un document selectat.'],
    ['eroare', 'Nu am putut încărca documentul.'],
    ['lung', 'Dosar_sintetic_documente'],
    ['una', '1 de revizuit'],
    ['multe', '5 de revizuit'],
  ]) {
    await page.goto(mock + saved + '&stare=' + state);
    await expect(page.getByText(feedback).first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => innerWidth));
    await capture('stare-' + state);
    if (state === 'lung') {
      await page.getByText('Numele complet al documentului', { exact: true }).click();
      await expect(page.locator('#full-name-value')).toHaveText(/Dosar_sintetic_documente.*Procură_exemplu.docx/);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => innerWidth));
      await step(page, 1);
      expect((await field(page, 'Pasaj OCR 3').inputValue()).length).toBeGreaterThan(400);
      await capture('ocr-lung');
    }
    if (state === 'una') await expect(workspace(page).getByRole('listitem')).toHaveCount(1);
    if (state === 'eroare') {
      await page.getByRole('button', { name: 'Reîncearcă încărcarea' }).click();
      await expect(workspace(page).getByRole('heading', { name: steps[2] })).toBeVisible();
    }
  }

  for (const [width, stacked] of [[768, true], [1024, false], [1440, false]]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    const viewer = await page.getByRole('region', { name: 'Vizualizare document' }).boundingBox();
    const panel = await workspace(page).boundingBox();
    expect(panel.y > viewer.y).toBe(stacked);
  }
});
