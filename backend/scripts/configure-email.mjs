import { readFile } from 'node:fs/promises';
import { connect } from 'node:tls';
import { createInterface } from 'node:readline';
import { parseEnv } from './env.mjs';

const env = parseEnv(
  await readFile(new URL('../../.env', import.meta.url), 'utf8'),
);
const url = `https://api.supabase.com/v1/projects/${env.SUPABASE_PROJECT_ID}/config/auth`;
if (
  !/^[a-z]{20}$/.test(env.SUPABASE_PROJECT_ID || '') ||
  !env.SUPABASE_ACCESS_TOKEN
)
  throw new Error('Set the Supabase project ID and access token in root .env.');
const headers = {
  Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`,
  'Content-Type': 'application/json',
};
async function config(patch) {
  const response = await fetch(url, {
    headers,
    ...(patch ? { method: 'PATCH', body: JSON.stringify(patch) } : {}),
  });
  if (!response.ok)
    throw new Error(
      `Auth configuration failed (HTTP ${response.status}); credentials are not logged.`,
    );
  return response.json();
}
const args = new Set(process.argv.slice(2));
if (
  ![...args].every(arg =>
    ['--configure', '--test-delivery', '--enable'].includes(arg),
  )
)
  throw new Error(
    'Use --configure, --test-delivery or --enable. No flag prints safe status.',
  );
const current = await config();
if (!args.size) {
  console.log(
    JSON.stringify({
      emailConfirmationEnabled: !current.mailer_autoconfirm,
      customSmtpConfigured: !!current.smtp_host,
      emailCodeLength: current.mailer_otp_length,
      phoneEnabled: current.external_phone_enabled,
    }),
  );
  process.exit(0);
}
for (const key of [
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_ADMIN_EMAIL',
  'SMTP_SENDER_NAME',
])
  if (!env[key]) throw new Error(`Set ${key} in root .env.`);
if (env.SMTP_HOST !== 'smtp.gmail.com' || Number(env.SMTP_PORT) !== 465)
  throw new Error('This Gmail setup uses smtp.gmail.com with TLS port 465.');
if (
  !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.SMTP_ADMIN_EMAIL) ||
  env.SMTP_ADMIN_EMAIL !== env.SMTP_USER
)
  throw new Error(
    'Use the same Gmail address for SMTP_USER and SMTP_ADMIN_EMAIL.',
  );
const password = env.SMTP_PASS.replace(/\s/g, '');
if (!/^[a-z]{16}$/i.test(password))
  throw new Error(
    'SMTP_PASS must be the 16-letter Google app password, not your Google login password.',
  );

// Authenticate over verified TLS without writing credentials or server replies to logs.
async function checkSmtp(sendTest) {
  const socket = connect({
    host: env.SMTP_HOST,
    port: 465,
    servername: env.SMTP_HOST,
    rejectUnauthorized: true,
  });
  const lines = createInterface({ input: socket });
  const responses = [];
  let pending;
  const fail = () => {
    pending?.reject(
      new Error(
        'Gmail SMTP connection failed. Check the app password and network.',
      ),
    );
    pending = undefined;
  };
  socket.setTimeout(15000, () => {
    fail();
    socket.destroy();
  });
  socket.on('error', fail);
  socket.on('close', fail);
  lines.on('line', line => {
    if (!/^\d{3} /.test(line)) return;
    const code = Number(line.slice(0, 3));
    if (pending) {
      const next = pending;
      pending = undefined;
      next.resolve(code);
    } else responses.push(code);
  });
  const read = () =>
    responses.length
      ? Promise.resolve(responses.shift())
      : new Promise((resolve, reject) => {
          pending = { resolve, reject };
        });
  const expect = async (code, text) => {
    const reply = read();
    if (text !== undefined) socket.write(text + '\r\n');
    if ((await reply) !== code)
      throw new Error(
        'Gmail SMTP rejected the connection or message; check the app password and account settings.',
      );
  };
  try {
    await expect(220);
    await expect(250, 'EHLO conference');
    await expect(334, 'AUTH LOGIN');
    await expect(334, Buffer.from(env.SMTP_USER).toString('base64'));
    await expect(235, Buffer.from(password).toString('base64'));
    if (sendTest) {
      await expect(250, `MAIL FROM:<${env.SMTP_ADMIN_EMAIL}>`);
      await expect(250, `RCPT TO:<${env.SMTP_ADMIN_EMAIL}>`);
      await expect(354, 'DATA');
      await expect(
        250,
        `From: Conference <${env.SMTP_ADMIN_EMAIL}>\r\nTo: ${env.SMTP_ADMIN_EMAIL}\r\nSubject: Conference email delivery test\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\nGmail SMTP is connected for Conference. Please confirm this message arrived before enabling signup email verification.\r\n.`,
      );
    }
    await expect(221, 'QUIT');
  } finally {
    lines.close();
    socket.destroy();
  }
}
await checkSmtp(args.has('--test-delivery'));
console.log(
  args.has('--test-delivery')
    ? 'Gmail accepted the delivery test to the configured sender. Check its inbox; acceptance does not prove receipt.'
    : 'Gmail SMTP authentication verified over TLS.',
);
const desired = args.has('--configure')
  ? {
      smtp_host: env.SMTP_HOST,
      smtp_port: '465',
      smtp_user: env.SMTP_USER,
      smtp_pass: password,
      smtp_admin_email: env.SMTP_ADMIN_EMAIL,
      smtp_sender_name: env.SMTP_SENDER_NAME,
      mailer_otp_length: 8,
      mailer_otp_exp: 3600,
      rate_limit_email_sent: 30,
      mailer_subjects_confirmation: 'Your Conference email verification code',
      mailer_templates_confirmation_content:
        '<h2>Verify your Conference email</h2><p>Enter this code in the Conference app or website:</p><p style="font-size:28px;letter-spacing:4px"><strong>{{ .Token }}</strong></p><p>This code expires in one hour. Use only the most recent code. If you did not create an account, ignore this email.</p>',
    }
  : {};
if (args.has('--enable')) {
  if (
    !args.has('--configure') &&
    (!current.smtp_host ||
      current.mailer_otp_length !== 8 ||
      !current.mailer_templates_confirmation_content?.includes('{{ .Token }}'))
  )
    throw new Error(
      'Run --configure first. Confirm test email receipt before --enable.',
    );
  Object.assign(desired, {
    mailer_autoconfirm: false,
    external_email_enabled: true,
    external_phone_enabled: false,
    external_anonymous_users_enabled: true,
  });
}
if (Object.keys(desired).length) {
  await config(desired);
  const actual = await config();
  for (const [key, value] of Object.entries(desired)) {
    if (key === 'smtp_pass') continue;
    if (actual[key] !== value)
      throw new Error(`Email setting did not persist: ${key}`);
  }
  console.log(
    args.has('--enable')
      ? 'Email confirmation enabled; phone disabled; guest access preserved.'
      : 'SMTP and 8-digit confirmation template configured; current confirmation setting preserved.',
  );
}
