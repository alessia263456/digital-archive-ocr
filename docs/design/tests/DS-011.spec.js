import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const mock = pathToFileURL(resolve('../docs/design/mocks/DS-011.html')).href;
const saved = '?document=Procur%C4%83_exemplu.docx&reluare=1';
const steps = ['Date document', 'Corectare OCR', 'Anonimizare', 'Verificare finală'];
const workspace = page => page.getByRole('region', { name: 'Spațiu de lucru' });
const field = (page, name) => page.getByLabel(name, { exact: true });
const suggestion = (page, name) => workspace(page).getByRole('listitem').filter({ has: page.getByRole('button', { name, exact: true }) });
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
  await expect(workspace(page)).toContainText('0 sugerate');
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
  await expect(workspace(page)).toContainText('Anonimizat');
  await expect(workspace(page)).toContainText('De revizuit');
});

test('keeps working state across fixtures, retries a failed save, and rechecks a mapped correction', async ({ page }) => {
  await page.goto(mock + saved + '&stare=eroare-salvare');
  await step(page, 1);
  const ocr = field(page, 'Text OCR');
  await expect(ocr).toHaveCount(1);
  const corrected = (await ocr.inputValue()).replace('Persoană sintetică A.', 'Persoană sintetică revizuită.\nObservație sintetică.');
  await ocr.fill(corrected);
  await step(page, 3);
  const reviewText = field(page, 'Text OCR corectat');
  await expect(reviewText).toHaveValue(corrected);
  await expect(reviewText).toHaveAttribute('readonly', '');
  await expect(reviewText).toBeEnabled();
  await expect(workspace(page)).toContainText('De reverificat');
  await expect(workspace(page).getByText(/Revizuiește potrivirile/)).toBeVisible();
  await workspace(page).getByRole('link', { name: 'Verifică anonimizarea' }).click();
  await expect(workspace(page)).toContainText('Decizie anterioară: Anonimizat');
  await suggestion(page, 'Nume semnatar').getByRole('button', { name: 'Anonimizează' }).click();
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
  await expect(ocr).toHaveValue(corrected);
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
      style: `#scan { position: fixed; inset: 0 auto auto 0; width: ${width}px; margin: 0; z-index: 1; }
        #scan .mark-outline { visibility: hidden; }`,
    });
  };
  const originalPixels = await sourcePixels();
  const versions = page.getByRole('group', { name: 'Versiunea documentului' });
  await expect(versions.getByRole('button')).toHaveText(['Original', 'Anonimizat']);
  await expect(scan.locator('.mark-outline[data-mark="nume"]')).toBeVisible({ timeout: 1500 });
  await expect(page.getByRole('button', { name: 'Arată marcajele', exact: true })).toHaveCount(0);
  await anonymized.click();
  await expect(mark(page, 'nume')).toBeVisible();
  await page.getByRole('button', { name: 'Nume semnatar', exact: true }).click();
  await expect(scan.locator('.inspection')).toBeVisible();
  await expect(workspace(page).getByText(/TSV · Pagina/)).toBeHidden();
  const reference = suggestion(page, 'Posibil CUI/CIF');
  await reference.getByRole('button', { name: 'Anonimizează' }).click();
  await expect(mark(page, 'referinta')).toHaveCSS('background-color', 'rgb(0, 0, 0)');
  await scan.locator('[data-mark="referinta"]').click();
  await workspace(page).getByRole('button', { name: 'Elimină marcajul', exact: true }).click();
  await expect(reference).toContainText('Păstrat');
  await expect(mark(page, 'referinta')).toHaveCount(0);
  await page.getByText('Marcaje din textul OCR', { exact: true }).click();
  await field(page, 'Pasaj pentru marcaj manual').selectOption('adresa');
  await page.getByRole('button', { name: 'Marchează pasajul' }).click();
  await expect(mark(page, 'adresa')).toBeVisible();
  await original.click();
  await expect(scan.locator('.mark-outline[data-mark="nume"]')).toBeVisible();
  await expect(scan.locator('.mark-outline[data-mark="adresa"]')).toBeVisible();
  await expect(mark(page, 'adresa')).toHaveCount(0);
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

  const draw = async ([left, top, width, height]) => {
    await scan.scrollIntoViewIfNeeded();
    const frame = await scan.boundingBox();
    const x = frame.x + frame.width * left;
    const y = frame.y + frame.height * top;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + frame.width * width, y + frame.height * height, { steps: 4 });
    await page.mouse.up();
  };
  await page.getByRole('button', { name: 'Marchează zonă', exact: true }).click();
  await draw([0.13, 0.51, 0.26, 0.09]);
  const manual = mark(page, 'manual-1');
  await expect(manual).toBeVisible();
  const originalWidth = (await manual.boundingBox()).width;
  await scan.locator('[data-mark="manual-1"]').click();
  await expect(workspace(page)).toContainText('Zonă marcată · Pagina 2');
  await workspace(page).getByRole('button', { name: 'Ajustează zona', exact: true }).click();
  await draw([0.13, 0.51, 0.30, 0.09]);
  expect((await manual.boundingBox()).width).toBeGreaterThan(originalWidth);
  await scan.locator('[data-mark="manual-1"]').click();
  await workspace(page).getByRole('button', { name: 'Elimină marcajul', exact: true }).click();
  await expect(manual).toHaveCount(0);
  await workspace(page).getByRole('button', { name: 'Anulează eliminarea' }).click();
  await expect(manual).toBeVisible();
  await workspace(page).getByRole('button', { name: 'Elimină marcajul', exact: true }).click();
  await expect(manual).toHaveCount(0);
  const tool = page.getByRole('button', { name: 'Marchează zonă', exact: true });
  await tool.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#viewport')).toBeFocused();
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(manual).toBeVisible();
  await scan.locator('[data-mark="manual-1"]').click();
  await workspace(page).getByRole('button', { name: 'Elimină marcajul', exact: true }).click();
  await page.getByText('Marcaje din textul OCR', { exact: true }).click();
  await page.getByRole('button', { name: 'Marchează zona semnăturii' }).focus();
  await page.keyboard.press('Enter');
  await expect(mark(page, 'manual-1')).toBeVisible();
  await expectCovered(page, 'Semnătură A', 'manual-1');
  await original.click();
  await expect(page.getByText('Pagina 2 din 2')).toBeVisible();
  await expect(scan.locator('.mark-outline[data-mark="manual-1"]')).toBeVisible();
  await expect(mark(page, 'manual-1')).toHaveCount(0);

  await step(page, 3);
  await expect(anonymized).toHaveAttribute('aria-pressed', 'true');
  await expect(mark(page, 'manual-1')).toBeVisible();
  await original.click();
  await expect(original).toHaveAttribute('aria-pressed', 'true');
  await expect(scan.locator('.mark-outline')).toHaveCount(0);
  await expect(mark(page, 'manual-1')).toHaveCount(0);
  await expect(scan).toContainText('Semnătură A');
  await anonymized.click();
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

test('aligns Step 1 metadata labels and keeps fields usable at desktop and narrow widths', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(mock + '?document=Contract_exemplu.pdf');
  const names = [
    'Data actului', 'Numărul actului', 'Numărul dosarului fizic', 'Numărul de inventar',
    'Sumă', 'Etichete', 'Tip document', 'Subtip', 'Context arhivare', 'Indicativ arhivistic',
    'Data expirării contractului',
  ];
  const positions = async name => field(page, name).evaluate(control => {
    const label = control.labels[0].getBoundingClientRect();
    const input = control.getBoundingClientRect();
    return {
      labelRight: label.right, labelBottom: label.bottom, labelCenter: label.y + label.height / 2,
      inputX: input.x, inputY: input.y, inputCenter: input.y + input.height / 2,
      inputWidth: input.width, inputHeight: input.height,
    };
  });

  for (const width of [1440, 1024, 768, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const fields = await Promise.all(names.map(positions));
    for (const position of fields) {
      if (width === 320) {
        expect(position.labelBottom).toBeLessThanOrEqual(position.inputY);
        expect(position.inputHeight).toBeGreaterThanOrEqual(44);
      } else {
        expect(position.labelRight).toBeLessThanOrEqual(position.inputX);
        expect(Math.abs(position.labelCenter - position.inputCenter)).toBeLessThanOrEqual(1);
      }
    }
    const [date, number, dossier, inventory, amount, tags, ...classification] = fields;
    if (width === 1440) {
      expect(date.inputY).toBe(number.inputY);
      expect(dossier.inputY).toBe(inventory.inputY);
      expect(date.inputX).toBe(dossier.inputX);
      expect(number.inputX).toBe(inventory.inputX);
      expect(amount.inputWidth).toBeGreaterThan(number.inputWidth);
    }
    if (width === 1024 || width === 320) expect(date.inputY).toBeLessThan(number.inputY);
    for (const input of [tags, ...classification]) expect(input.inputX).toBe(amount.inputX);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }

  const date = field(page, 'Data actului');
  await date.focus();
  // Chromium can tab through the native date segments before leaving the field.
  for (let segment = 0; segment < 5 && await date.evaluate(input => input === document.activeElement); segment++) {
    await page.keyboard.press('Tab');
  }
  await expect(field(page, 'Numărul actului')).toBeFocused();
  await expect(field(page, 'Numărul actului')).toHaveCSS('outline-style', 'solid');
  await field(page, 'Tip document').focus();
  await page.keyboard.press('Tab');
  await expect(field(page, 'Subtip')).toBeFocused();
  await field(page, 'Subtip').selectOption({ label: 'Vânzare-cumpărare / schimb / donație / întreținere / rentă viageră' });
  await expect(field(page, 'Subtip')).toBeFocused();
  await expect(field(page, 'Indicativ arhivistic')).toHaveValue('IA 1');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
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
  await suggestion(page, 'Posibil CUI/CIF').getByRole('button', { name: 'Păstrează' }).click();
  await page.getByText('Marcaje din textul OCR', { exact: true }).click();
  await field(page, 'Pasaj pentru marcaj manual').selectOption('adresa');
  await page.getByRole('button', { name: 'Marchează pasajul' }).click();
  await page.getByRole('button', { name: 'Marchează zona semnăturii' }).click();
  await capture('marcaj-selectat');
  await step(page, 3);
  await capture('verificare-finala');
  await page.getByRole('button', { name: 'Pagina anterioară' }).click();
  await capture('verificare-finala-pagina-1');
  await page.getByRole('button', { name: 'Original', exact: true }).click();
  await capture('verificare-finala-original');
  await toggle.click();
  await page.getByRole('button', { name: 'Aprobă revizuirea' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await capture('confirmare');

  for (const [state, feedback] of [
    ['incarcare', 'Se încarcă documentul…'],
    ['gol', 'Nu există un document selectat.'],
    ['eroare', 'Nu am putut încărca documentul.'],
    ['lung', 'Dosar_sintetic_documente'],
    ['una', '1 rămasă'],
    ['multe', '5 rămase'],
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
      expect((await field(page, 'Text OCR').inputValue()).length).toBeGreaterThan(400);
      await capture('ocr-lung');
    }
    if (state === 'una') await expect(workspace(page).getByRole('list', { name: 'Sugestii PII' }).getByRole('listitem')).toHaveCount(1);
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

test('switches the header theme through all steps without replacing unsaved editing state', async ({ page, colorScheme }) => {
  await page.goto(mock + saved);
  const theme = page.getByRole('banner').getByRole('button', { name: /Mod (luminos|întunecat)/ });
  const html = page.locator('html');
  const other = colorScheme === 'dark' ? 'light' : 'dark';
  await expect(html).toHaveAttribute('data-theme', colorScheme);
  await step(page, 0);
  await field(page, 'Numărul actului').fill('83');
  await theme.click();
  await expect(html).toHaveAttribute('data-theme', other);
  await expect(field(page, 'Numărul actului')).toHaveValue('83');

  await step(page, 1);
  const ocr = field(page, 'Text OCR');
  const corrected = (await ocr.inputValue()) + '\n\nNotă sintetică adăugată.\nAl doilea rând.';
  await ocr.fill(corrected);
  await theme.focus();
  await page.keyboard.press('Enter');
  await expect(theme).toBeFocused();
  await expect(html).toHaveAttribute('data-theme', colorScheme);
  await expect(ocr).toHaveValue(corrected);

  await step(page, 2);
  const reference = suggestion(page, 'Posibil CUI/CIF');
  await reference.getByRole('button', { name: 'Păstrează' }).click();
  await page.getByRole('button', { name: 'Pagina următoare' }).click();
  await page.getByRole('button', { name: 'Mărește' }).click();
  await theme.click();
  await expect(html).toHaveAttribute('data-theme', other);
  await expect(reference).toContainText('Păstrat');
  await expect(page.getByText('Pagina 2 din 2')).toBeVisible();
  await expect(page.getByText('110%', { exact: true })).toBeVisible();

  await step(page, 3);
  await page.getByRole('button', { name: 'Original', exact: true }).click();
  await theme.click();
  await expect(html).toHaveAttribute('data-theme', colorScheme);
  await expect(page.getByRole('button', { name: 'Original', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(field(page, 'Text OCR corectat')).toHaveValue(corrected);
  await expect(workspace(page).getByText(/Confirmă metadatele/)).toBeVisible();
});

test('resumes an existing draft with separately saved OCR passages', async ({ page }) => {
  await page.goto(mock + saved);
  await page.evaluate(() => {
    const passages = ['Pasaj sintetic unu.', 'Pasaj sintetic doi.\nRândul următor.', 'Pasaj sintetic trei.'];
    localStorage.setItem('DS-011:Procură_exemplu.docx', JSON.stringify({
      step: 1, page: 1, zoom: 1, anonymized: false,
      metadata: { date: '2026-11-18', number: '77', dossier: '31/2026', inventory: '31/2026', amount: '', tags: '', expiry: '', type: 'Procură', subtype: 'procura-ia1', context: 'Act de sine stătător' },
      confirmed: true, source: passages, ocr: passages, detections: {}, reviewedText: {}, rectangles: [],
    }));
  });
  await page.reload();
  await expect(field(page, 'Text OCR')).toHaveValue('Pasaj sintetic unu.\n\nPasaj sintetic doi.\nRândul următor.\n\nPasaj sintetic trei.');
});
