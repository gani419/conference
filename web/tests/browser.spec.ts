import { expect, test } from '@playwright/test';
test('authentication layout supports narrow screens and preserves a join link', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?join=TESTCODE');
  await expect(
    page.getByRole('heading', { name: 'Welcome back' }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Continue as guest', exact: true })
    .click();
  await expect(page.getByLabel('Display name')).toBeVisible();
  await expect(page.getByLabel('Email address')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Continue as guest', exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
test('authentication failure shows an error without entering the dashboard', async ({
  page,
}) => {
  await page.route('**/auth/v1/token**', route =>
    route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({
        error: 'invalid_grant',
        error_description: 'Invalid login credentials',
      }),
    }),
  );
  await page.goto('/');
  await page.getByLabel('Email address').fill('invalid@example.com');
  await page.getByLabel('Password', { exact: true }).fill('invalid-password');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText(
    'Invalid login credentials',
  );
  await expect(
    page.getByRole('heading', { name: 'Welcome back' }),
  ).toBeVisible();
});
