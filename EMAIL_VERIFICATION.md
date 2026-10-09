# Email verification

Status (9 October 2026): app implementation complete; updated web deployed to https://conference-79cf2.web.app and Android APK installed on the connected phone. Email verification activation and Gmail app-password setup are deferred at the user's request. Hosted email confirmation remains off; email/password registration and guest access continue to work. Phone verification remains disabled. The code and setup instructions are retained for later activation.

Validation: 38 native regression tests passed across the full suite and added screen tests; 12 browser regression tests passed (two opt-in hosted tests skipped), plus three verification UI checks against the deployed site with intercepted responses. TypeScript and Android/web builds passed. An isolated confirmed test fixture authenticated, then its session was revoked and the account deleted. None of these checks establishes actual Gmail delivery.

Web and Android use the same Supabase email/password signup with an 8-digit email code. Guest access remains available and phone sign-in stays disabled. Existing confirmed accounts continue to sign in normally. The server enforces confirmation; frontend flags cannot bypass it.

## Gmail setup

1. Enable Google 2-Step Verification, then open https://myaccount.google.com/apppasswords and create an app password named Conference. https://support.google.com/accounts/answer/185833
2. Fill root `.env`: `SMTP_USER` and `SMTP_ADMIN_EMAIL` are your Gmail address; `SMTP_PASS` is the 16-letter app password without spaces. Host `smtp.gmail.com`, TLS port `465`, sender name `Conference` are supplied. Never use your Google login password.
3. Run `node backend/scripts/configure-email.mjs --configure --test-delivery`. It verifies Gmail authentication over TLS, configures Supabase SMTP and the confirmation template, and sends one delivery test to the sender. It preserves the existing confirmation setting.
4. Confirm that the test arrived, including checking spam. Deploy the updated web build and install the updated Android APK before activation.
5. Run `node backend/scripts/configure-email.mjs --enable` after confirming receipt. This requires the correct template and SMTP setup, keeps guests enabled and phone disabled.
6. Register a new account on each platform, receive the code, enter it, and confirm login and invitation continuation. Check wrong/expired codes, resend, and returning from login for an unconfirmed account. Codes expire in one hour; resend waits 60 seconds after a successful request. Supabase rate limits remain authoritative.

`node backend/scripts/configure-email.mjs` reports only safe configuration status. SMTP passwords stay in root `.env` and Supabase Auth settings; configuration scripts never print them or ship them to clients. `configure-auth.mjs` preserves the confirmation setting.

Gmail is suitable for initial testing; sending limits and account policies apply. Consider a transactional email provider as usage grows. Supabase custom SMTP documentation: https://supabase.com/docs/guides/auth/auth-smtp

Password recovery and invitation email delivery are separate features; this change implements signup email verification only. Automated UI tests use intercepted test responses, not real email delivery.

Hosted media/push test fixtures now use server-only Admin-created confirmed example.com accounts, without sending signup emails or disabling the project confirmation setting. Their IDs are saved before login and existing cleanup revokes sessions and deletes only test accounts. These tests do not validate inbox delivery.
