import { expect, test } from '@playwright/test';
const uid = '11111111-1111-4111-8111-111111111111';
for (const width of [390, 820, 1280])
  test(`dashboard and settings stay usable at ${width}px`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 1000 });
    const user = {
      id: uid,
      email: 'parity@example.com',
      is_anonymous: false,
      aud: 'authenticated',
      role: 'authenticated',
      user_metadata: { displayName: 'Parity User' },
      app_metadata: {},
      created_at: new Date().toISOString(),
    };
    const token = [
      Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString(
        'base64url',
      ),
      Buffer.from(
        JSON.stringify({
          sub: uid,
          exp: Math.floor(Date.now() / 1000) + 3600,
          role: 'authenticated',
        }),
      ).toString('base64url'),
      'test-signature',
    ].join('.');
    let invitationStatus = 'pending',
      read = false;
    const commands: string[] = [];
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
        body: JSON.stringify({ display_name: 'Parity User' }),
      }),
    );
    await page.route('**/functions/v1/conference-api', async route => {
      const { mode, action } = route.request().postDataJSON();
      if (mode === 'command') {
        commands.push(action);
        if (action === 'accept_invitation') invitationStatus = 'accepted';
        if (action === 'mark_all_notifications_read') read = true;
      }
      const data =
        action === 'invitations'
          ? [
              {
                id: 'invitation-1',
                meeting_id: 'meeting-1',
                meeting_title: 'Team planning',
                organizer_name: 'Host',
                role: 'guest',
                status: invitationStatus,
              },
            ]
          : action === 'notifications'
          ? [
              {
                id: 'notification-1',
                meeting_id: 'meeting-1',
                title: 'Meeting invitation',
                body: 'Join Team planning',
                kind: 'meeting_invitation',
                is_read: read,
                created_at: new Date().toISOString(),
              },
            ]
          : [];
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ data }),
      });
    });
    await page.routeWebSocket('**/realtime/v1/websocket**', socket =>
      socket.close(),
    );
    await page.goto('/');
    await page.getByLabel('Email address').fill(user.email);
    await page.getByLabel('Password', { exact: true }).fill('Test-password123');
    await page.getByRole('button', { name: 'Log in', exact: true }).click();
    const nav = page.getByRole('navigation', { name: 'Dashboard sections' });
    for (const name of ['Upcoming', 'Recent', 'Invitations', 'Notifications'])
      await expect(
        nav.getByRole('button', { name, exact: true }),
      ).toBeVisible();
    await nav.getByRole('button', { name: 'Invitations', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Team planning' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Accept', exact: true }).click();
    await expect(page.locator('.list-card')).toContainText('accepted');
    expect(commands).toContain('accept_invitation');
    await nav
      .getByRole('button', { name: 'Notifications', exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Mark all read', exact: true })
      .click();
    await expect(
      page.getByRole('button', { name: 'Read', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Open', exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    const settings = page.getByRole('dialog', { name: 'Settings' });
    await expect(settings).toContainText(user.email);
    await settings.getByRole('button', { name: 'Dark', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(
      settings.getByRole('button', { name: 'Dark', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(
      settings.getByRole('button', { name: 'Light', exact: true }),
    ).toHaveCSS('background-color', 'rgb(30, 41, 59)');
    await page.screenshot({
      path: `test-results/parity-${width}-dark.png`,
      animations: 'disabled',
    });
    expect(errors).toEqual([]);
    expect(
      await page.evaluate(
        () => getComputedStyle(document.documentElement).backgroundColor,
      ),
    ).toBe('rgb(15, 23, 42)');
    await expect(
      settings.getByRole('button', {
        name: 'Enable notifications',
        exact: true,
      }),
    ).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(settings).toHaveCount(0);
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
