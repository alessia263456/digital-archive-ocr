import { test, expect } from '@playwright/test';

test.skip(!process.env.VITE_BACKEND_URL, 'Set VITE_BACKEND_URL to run against the local Laravel API.');

test('uses the real same-origin Sanctum proxy and rejects invalid credentials safely', async ({ page, context }) => {
  let loginHeaders;
  page.on('request', async (request) => {
    if (new URL(request.url()).pathname === '/api/login') {
      loginHeaders = await request.allHeaders();
    }
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Autentificare', exact: true })).toBeVisible();

  await page.getByLabel('Nume de utilizator').fill('utilizator-inexistent-pentru-test');
  await page.getByLabel('Parolă').fill('parola-incorecta-pentru-test');
  await page.getByRole('button', { name: 'Autentificare' }).click();
  await expect(page.getByRole('status')).toHaveText('Nume de utilizator sau parolă incorecte.');
  const cookies = await context.cookies();
  expect(loginHeaders?.['x-xsrf-token']).toBeTruthy();

  expect(cookies.some((cookie) => cookie.name === 'XSRF-TOKEN' && !cookie.httpOnly)).toBe(true);
  expect(cookies.some((cookie) => cookie.name.endsWith('-session') && cookie.httpOnly && cookie.sameSite === 'Lax')).toBe(true);
});
