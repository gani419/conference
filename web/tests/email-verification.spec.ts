import { test, expect, type Page } from '@playwright/test';
async function mockAuth(page: Page) {
  const user = {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'verify@example.com',
    aud: 'authenticated',
    role: 'authenticated',
    is_anonymous: false,
    user_metadata: { displayName: 'Verified User' },
    app_metadata: {},
    created_at: new Date().toISOString(),
  };
  let verified = false,
    resendFails = true;
  const requests: { path: string; body: any }[] = [];
  await page.route('**/auth/v1/**', async route => {
    const path = new URL(route.request().url()).pathname;
    const body = route.request().postData()
      ? route.request().postDataJSON()
      : {};
    requests.push({ path, body });
    let status = 200,
      data: any;
    if (path.endsWith('/signup')) data = user;
    else if (path.endsWith('/token')) {
      status = 400;
      data = { code: 'email_not_confirmed', msg: 'Email not confirmed' };
    } else if (path.endsWith('/resend')) {
      if (resendFails) {
        status = 429;
        data = {
          code: 'over_email_send_rate_limit',
          msg: 'Email rate limit exceeded',
        };
        resendFails = false;
      } else data = {};
    } else if (path.endsWith('/verify') && body.token !== '12345678') {
      status = 403;
      data = { code: 'otp_expired', msg: 'Token has expired or is invalid' };
    } else if (path.endsWith('/verify')) {
      verified = true;
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
      data = {
        access_token: token,
        refresh_token: 'test-refresh',
        token_type: 'bearer',
        expires_in: 3600,
        user: { ...user, email_confirmed_at: new Date().toISOString() },
      };
    } else
      data = {
        ...user,
        email_confirmed_at: verified ? new Date().toISOString() : undefined,
      };
    await route.fulfill({
      status,
      headers: { 'x-supabase-api-version': '2024-01-01', 'access-control-expose-headers': 'X-Supabase-Api-Version' },
      contentType: 'application/json',
      body: JSON.stringify({ ...data, ...(data.code ? { error_code: data.code } : {}) }),
    });
  });
  await page.route('**/rest/v1/profiles**', route =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ display_name: 'Verified User' }),
    }),
  );
  await page.route('**/functions/v1/conference-api', route =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    }),
  );
  await page.routeWebSocket('**/realtime/v1/websocket**', socket =>
    socket.close(),
  );
  return requests;
}
for (const width of [390, 1280])
  test(`pending signup, resend errors and verification at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const requests = await mockAuth(page);
    await page.goto('/?join=ABC123');
    await page
      .getByRole('button', { name: 'Create an account', exact: true })
      .click();
    await page.getByLabel('Display name').fill('Verified User');
    await page.getByLabel('Email address').fill('verify@example.com');
    await page.getByLabel('Password', { exact: true }).fill('Test-password123');
    await page
      .getByRole('button', { name: 'Create account', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Verify your email' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: '+ New meeting', exact: true }),
    ).toHaveCount(0);
    await page.reload();
    await expect(
      page.getByRole('heading', { name: 'Verify your email' }),
    ).toBeVisible();
    expect(new URL(page.url()).searchParams.get('join')).toBe('ABC123');
    await page.getByLabel('Email verification code').fill('00000000');
    await page
      .getByRole('button', { name: 'Verify email', exact: true })
      .click();
    await expect(page.getByRole('alert')).toContainText('expired');
    await page
      .getByRole('button', { name: 'Resend code', exact: true })
      .click();
    await expect(page.getByRole('alert')).toContainText('rate limit');
    await expect(
      page.getByRole('button', { name: 'Resend code', exact: true }),
    ).toBeEnabled();
    await page
      .getByRole('button', { name: 'Resend code', exact: true })
      .click();
    await expect(
      page.getByRole('button', { name: /Resend code in/ }),
    ).toBeDisabled();
    await expect(page.getByLabel('Email verification code')).toHaveValue('');
    await page.getByLabel('Email verification code').fill('12345678');
    await page
      .getByRole('button', { name: 'Verify email', exact: true })
      .click();
    await expect(
      page.getByRole('button', { name: '+ New meeting', exact: true }),
    ).toBeVisible();
    expect(
      requests.find(
        r => r.path.endsWith('/verify') && r.body.token === '12345678',
      )?.body,
    ).toMatchObject({ email: 'verify@example.com', type: 'email' });
    expect(
      await page.evaluate(() =>
        sessionStorage.getItem('conference-pending-email'),
      ),
    ).toBeNull();
  });
test('unconfirmed login offers verification and back permits guest access', async ({
  page,
}) => {
  await mockAuth(page);
  await page.goto('/');
  await page.getByLabel('Email address').fill('verify@example.com');
  await page.getByLabel('Password', { exact: true }).fill('Test-password123');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Verify your email' }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Back to login', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Continue as guest', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Continue as guest' }),
  ).toBeVisible();
  expect(
    await page.evaluate(() =>
      sessionStorage.getItem('conference-pending-email'),
    ),
  ).toBeNull();
});
