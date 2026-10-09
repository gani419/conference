import { createConfirmedTestAccount } from '../../backend/scripts/test-accounts.mjs';
// Development-only Android integration checks. Test credentials remain in an ignored .env.
import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { randomBytes, createHmac } from 'node:crypto';
import { parseEnv } from '../../backend/scripts/env.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const env = parseEnv(readFileSync(resolve(root, '.env'), 'utf8'));
const stateFile = resolve(root, 'mobile/.env.device-test');
const state = existsSync(stateFile) ? JSON.parse(parseEnv(readFileSync(stateFile, 'utf8')).DEVICE_TEST_STATE) : {};
const save = () => writeFileSync(stateFile, `DEVICE_TEST_STATE='${JSON.stringify(state)}'\n`);
const [action, serial, argument, extra] = process.argv.slice(2);
const adb = (...args) => execFileSync('adb', args, { encoding: 'utf8', timeout: 30000 });
async function api(path, body, token) {
  const response = await fetch(`${env.SUPABASE_URL}/${path}`, { method: 'POST', headers: {
    apikey: env.SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
  const responseText = await response.text(); const json = responseText ? JSON.parse(responseText) : {};
  if (!response.ok) throw new Error(`Request failed (${response.status}): ${json.error || json.message || json.msg || 'backend error'}`);
  return json;
}
async function command(action, payload, mode = 'command') {
  if (!state.host?.access_token) throw new Error('Run setup first');
  return (await api('functions/v1/conference-api', { mode, action, payload }, state.host.access_token)).data;
}
function nodes(device) {
  const folder = resolve(root, 'android/app/build/device-test');
  mkdirSync(folder, { recursive: true });
  const xmlPath = resolve(folder, `${device}.xml`);
  const dump = adb('-s', device, 'shell', 'uiautomator', 'dump', '/sdcard/conference-device-test.xml');
  if (!dump.includes('UI hierchary dumped')) throw new Error('Screen is changing; use a current screenshot instead of stale UI data');
  adb('-s', device, 'pull', '/sdcard/conference-device-test.xml', xmlPath);
  return [...readFileSync(xmlPath, 'utf8').matchAll(/<node\s+([^>]+)>/g)].map(match =>
    Object.fromEntries([...match[1].matchAll(/([\w-]+)="([^"]*)"/g)].map(([, key, value]) =>
      [key, value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;/g, "'")])));
}
function tapNode(device, node) {
  if (!node) throw new Error('Requested control is not visible');
  const bounds = node.bounds.match(/\d+/g).map(Number);
  adb('-s', device, 'shell', 'input', 'tap', String(Math.floor((bounds[0] + bounds[2]) / 2)), String(Math.floor((bounds[1] + bounds[3]) / 2)));
}
if (action === 'setup') {
  if (state.host) throw new Error('A test account already exists; reuse it or run cleanup first');
  const tag = randomBytes(5).toString('hex');
  state.email = `device-test-${tag}@example.com`;
  state.password = randomBytes(24).toString('base64url');
  state.hostName = `DeviceHost${tag}`;
  state.guestName = `DeviceGuest${tag}`;
  state.host = await createConfirmedTestAccount(env, { email: state.email, password: state.password, displayName: state.hostName }, id => { state.host = { user: { id } }; save(); });
  save();
  if (!state.host.access_token) throw new Error('Signup did not produce an immediate session');
  state.meeting = await command('create_meeting', { title: `Device call check ${tag}`, description: 'Temporary device integration check', timing: { kind: 'instant' }, guestAccess: true,
    defaultPermissions: { microphone: true, camera: true, screenShare: true, chat: true }, invitees: [] });
  save(); console.log('Temporary host and meeting created. Credentials stay in the ignored test .env.');
} else if (action === 'ui') {
  console.log(JSON.stringify(nodes(serial).filter(n => n.package === 'com.conference' || /permissioncontroller/.test(n.package))
    .filter(n => n.text || n['content-desc'] || n.class === 'android.widget.EditText')
    .map(n => ({ text: n.password === 'true' ? '[redacted]' : n.text, label: n['content-desc'], bounds: n.bounds, class: n.class, checked: n.checked })), null, 2));
} else if (action === 'tap') {
  tapNode(serial, nodes(serial).find(n => n['content-desc'] === argument || n.text === argument));
  console.log('Tapped requested control.');
} else if (action === 'input') {
  const value = state[extra];
  if (typeof value !== 'string' || !/^[a-zA-Z0-9@._-]+$/.test(value)) throw new Error('Invalid test input');
  tapNode(serial, nodes(serial).filter(n => n.class === 'android.widget.EditText')[Number(argument)]);
  adb('-s', serial, 'shell', 'input', 'text', value); adb('-s', serial, 'shell', 'input', 'keyevent', '4');
  console.log('Entered test value without logging it.');
} else if (action === 'join') {
  adb('-s', serial, 'shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', `conference://join/${state.meeting.code}`, 'com.conference');
  console.log('Opened test meeting link.');
} else if (action === 'participants') {
  const participants = await command('participants', { meetingId: state.meeting.id }, 'read');
  console.log(JSON.stringify(participants.map(p => ({ id: p.id, userId: p.user_id, role: p.role, status: p.status, permissions: p.permissions })), null, 2));
} else if (action === 'read') {
  if (!['chat', 'meeting_details', 'permission_requests', 'attendance'].includes(serial)) throw new Error('Invalid test read');
  console.log(JSON.stringify(await command(serial, { meetingId: state.meeting.id }, 'read'), null, 2));
} else if (action === 'media') {
  const now = Math.floor(Date.now() / 1000);
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const content = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ iss: env.LIVEKIT_API_KEY, nbf: now - 5, exp: now + 60, video: { roomAdmin: true, room: state.meeting.id } })}`;
  const jwt = `${content}.${createHmac('sha256', env.LIVEKIT_API_SECRET).update(content).digest('base64url')}`;
  const response = await fetch(`${env.LIVEKIT_URL.replace(/^wss:/, 'https:')}/twirp/livekit.RoomService/ListParticipants`, {
    method: 'POST', headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ room: state.meeting.id }) });
  if (!response.ok) throw new Error(`Media verification failed (${response.status})`);
  const result = await response.json();
  console.log(JSON.stringify((result.participants || []).map(p => ({ identity: p.identity, state: p.state,
    tracks: (p.tracks || []).map(t => ({ type: t.type, source: t.source, muted: t.muted, width: t.width, height: t.height })) })), null, 2));
} else if (action === 'cleanup') {
  if (!env.SUPABASE_ACCESS_TOKEN) throw new Error('Management token required for test cleanup');
  if (state.meeting) {
    const meeting = await command('meeting_details', { meetingId: state.meeting.id }, 'read');
    if (meeting.status === 'live') await command('end_meeting', { meetingId: state.meeting.id });
  }
  if (state.host.access_token) await api('auth/v1/logout?scope=global', undefined, state.host.access_token);
  const id = state.host.user.id;
  if (!/^[0-9a-f-]{36}$/i.test(id) || (state.meeting && !/^[0-9a-f-]{36}$/i.test(state.meeting.id))) throw new Error('Invalid test identifiers');
  const query = `${state.meeting ? `delete from public.meetings where id='${state.meeting.id}'::uuid;` : ''} delete from auth.users where id='${id}'::uuid;`;
  const response = await fetch(`https://api.supabase.com/v1/projects/${env.SUPABASE_PROJECT_ID}/database/query`, {
    method: 'POST', headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) });
  if (!response.ok) throw new Error(`Temporary data cleanup failed (${response.status})`);
  unlinkSync(stateFile); console.log('Temporary meeting, host account, and local credentials removed. Existing device accounts were preserved.');
} else { throw new Error('Choose setup, ui, tap, input, join, participants, media, or cleanup'); }