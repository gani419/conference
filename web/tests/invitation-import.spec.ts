import { expect, test, type Page } from '@playwright/test';
async function openForm(page: Page) {
  const user = {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'import-test@example.com',
    is_anonymous: false,
    aud: 'authenticated',
    role: 'authenticated',
    user_metadata: { displayName: 'Import Host' },
    app_metadata: {},
    created_at: new Date().toISOString(),
  };
  const token = [
    Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString(
      'base64url',
    ),
    Buffer.from(
      JSON.stringify({
        sub: user.id,
        exp: Math.floor(Date.now() / 1000) + 3600,
        role: 'authenticated',
      }),
    ).toString('base64url'),
    'test-signature',
  ].join('.');
  const commands: { action: string; payload: any }[] = [];
  await page.route('**/auth/v1/**', route =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(
        route.request().url().includes('/user')
          ? user
          : {
              access_token: token,
              refresh_token: 'test-refresh',
              token_type: 'bearer',
              expires_in: 3600,
              user,
            },
      ),
    }),
  );
  await page.route('**/rest/v1/profiles**', route =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ display_name: 'Import Host' }),
    }),
  );
  await page.route('**/functions/v1/conference-api', async route => {
    const body = route.request().postDataJSON();
    if (body.mode === 'command') {
      commands.push(body);
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Test intercepted the save; no meeting was created.',
        }),
      });
    } else
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      });
  });
  await page.routeWebSocket('**/realtime/v1/websocket**', socket =>
    socket.close(),
  );
  await page.goto('/');
  await page.getByLabel('Email address').fill(user.email);
  await page.getByLabel('Password', { exact: true }).fill('Test-password123');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await page
    .getByRole('button', { name: '+ New meeting', exact: true })
    .click();
  return commands;
}
const csvFile = (text: string) => ({
  name: 'invitees.csv',
  mimeType: 'text/csv',
  buffer: Buffer.from(text),
});
for (const width of [390, 1280])
  test(`CSV review validates, deduplicates and submits roles at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    const commands = await openForm(page);
    await expect(
      page.getByRole('button', { name: 'Import contacts', exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByText('Contact picking is unavailable in this browser.'),
    ).toBeVisible();
    await page
      .getByRole('button', { name: 'Add invitee', exact: true })
      .click();
    await page.getByLabel('Invitee 1 name').fill('Existing');
    await page.getByLabel('Invitee 1 email').fill('existing@example.com');
    await page
      .getByLabel('Invitation CSV file')
      .setInputFiles(
        csvFile(
          '\uFEFFdisplay_name,email,role\r\n"Taylor, Kim",TAYLOR@EXAMPLE.COM,co-host\r\nPriya,priya@example.com,\r\nAgain,taylor@example.com,guest\r\nExisting,EXISTING@example.com,guest\r\nInvalid,not-an-email,guest\r\nNo Email,,guest\r\nBad Role,bad-role@example.com,admin',
        ),
      );
    const preview = page.getByRole('region', {
      name: 'Invitation import preview',
    });
    await expect(preview).toContainText('2 ready to add · 5 skipped');
    await expect(preview).toContainText('Taylor, Kim');
    expect(commands).toHaveLength(0);
    await expect(
      page.getByRole('button', { name: 'Create meeting', exact: true }),
    ).toBeDisabled();
    await page
      .getByRole('button', { name: 'Add 2 invitees', exact: true })
      .click();
    await expect(page.getByLabel('Invitee 2 email')).toHaveValue(
      'taylor@example.com',
    );
    await expect(page.getByLabel('Invitee 2 role')).toHaveValue('co_host');
    await expect(page.getByLabel('Invitee 3 role')).toHaveValue('guest');
    await page
      .getByLabel('Invitation CSV file')
      .setInputFiles(csvFile('name,email\nTaylor,taylor@example.com'));
    await expect(preview).toContainText('0 ready to add · 1 skipped');
    await expect(
      page.getByRole('button', { name: 'Add 0 invitees', exact: true }),
    ).toBeDisabled();
    await page
      .getByRole('button', { name: 'Cancel import', exact: true })
      .click();
    const download = page.waitForEvent('download');
    await page.getByRole('link', { name: 'Download sample' }).click();
    expect((await download).suggestedFilename()).toBe(
      'conference-invitees.csv',
    );
    await page.getByLabel('Meeting title').fill('CSV meeting');
    await page
      .getByRole('button', { name: 'Create meeting', exact: true })
      .click();
    await expect.poll(() => commands.length).toBe(1);
    expect(
      commands[0].payload.invitees.map((i: any) => [i.email, i.role]),
    ).toEqual([
      ['existing@example.com', 'guest'],
      ['taylor@example.com', 'co_host'],
      ['priya@example.com', 'guest'],
    ]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/invitation-import-${width}.png`,
      animations: 'disabled',
    });
  });
test('malformed, oversized and excessive CSV imports do not add invitees', async ({
  page,
}) => {
  await openForm(page);
  const input = page.getByLabel('Invitation CSV file');
  await input.setInputFiles(csvFile('name,phone\nAlex,+12345678'));
  await expect(page.getByRole('alert')).toContainText('CSV needs name');
  await input.setInputFiles(
    csvFile('name,email\n"Missing quote,alex@example.com'),
  );
  await expect(page.getByRole('alert')).toContainText('quotation marks');
  await input.setInputFiles(
    csvFile(
      'name,email\n' +
        Array.from(
          { length: 501 },
          (_, i) => `User ${i},user${i}@example.com`,
        ).join('\n'),
    ),
  );
  await expect(page.getByRole('alert')).toContainText('500 rows');
  await input.setInputFiles(csvFile('x'.repeat(1024 * 1024 + 1)));
  await expect(page.getByRole('alert')).toContainText('1 MB');
  await expect(page.getByLabel('Invitee 1 email')).toHaveCount(0);
});
test('supported contact picker imports selected emails only and handles cancellation', async ({
  page,
}) => {
  await page.addInitScript(() => {
    (window as any).contactCalls = [];
    (window as any).contactCancelled = false;
    Object.defineProperty(navigator, 'contacts', {
      value: {
        getProperties: async () => ['name', 'email', 'tel'],
        select: async (properties: string[], options: object) => {
          (window as any).contactCalls.push({ properties, options });
          if ((window as any).contactCancelled)
            throw new DOMException('Cancelled', 'AbortError');
          return [
            {
              name: ['Selected Person'],
              email: ['selected@example.com', 'second@example.com'],
            },
            { name: ['Phone Only'], email: [] },
            { name: ['Duplicate'], email: ['SELECTED@example.com'] },
          ];
        },
      },
    });
  });
  await openForm(page);
  const button = page.getByRole('button', {
    name: 'Import contacts',
    exact: true,
  });
  await expect(button).toBeEnabled();
  await button.click();
  await expect(
    page.getByRole('region', { name: 'Invitation import preview' }),
  ).toContainText('2 ready to add · 2 skipped');
  expect(await page.evaluate(() => (window as any).contactCalls)).toEqual([
    { properties: ['name', 'email'], options: { multiple: true } },
  ]);
  await page
    .getByRole('button', { name: 'Add 2 invitees', exact: true })
    .click();
  await expect(page.getByLabel('Invitee 2 email')).toHaveValue(
    'second@example.com',
  );
  await page.evaluate(() => ((window as any).contactCancelled = true));
  await button.click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByLabel('Invitee 1 email')).toHaveValue(
    'selected@example.com',
  );
});
