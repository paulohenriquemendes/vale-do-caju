import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { writeFileSync, mkdirSync } from 'node:fs';
import { sectors, buyers } from '../shared/game';
const base = process.env.SMOKE_URL;
if (!base || !base.startsWith('https://')) throw Error('Set SMOKE_URL to the hosted HTTPS origin.');
const ids: string[] = [];
function client() {
  let cookie = '';
  return async (path: string, body?: unknown, expected = 200) => {
    const response = await fetch(`${base}/api/${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { cookie, Origin: base!, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    cookie = response.headers.get('set-cookie')?.split(';')[0] || cookie;
    const data = await response.json();
    assert.equal(response.status, expected, JSON.stringify(data));
    return data;
  };
}
try {
  const page = await fetch(base);
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.match(html, /Vale do Caju Farm/);
  const bundle = html.match(/src="([^" ]+\.js)"/)?.[1];
  assert.ok(bundle);
  assert.equal((await fetch(new URL(bundle, base))).status, 200);
  for (const asset of ['farm-retro.png', 'family-retro.png', 'farmer-retro.png', 'ground-expanded.png']) {
    const response = await fetch(`${base}/assets/${asset}`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') || '', /image\/png/);
    assert.ok((await response.arrayBuffer()).byteLength > 10000);
  }
  const a = client(), b = client();
  await a('me', undefined, 401);
  for (const request of [a, b]) ids.push((await request('guest', {})).id);
  assert.notEqual(ids[0], ids[1]);
  let state = await a('save');
  const initialMoney = state.money;
  async function action(value: unknown) {
    state = await a('action', { id: randomUUID(), version: state.version, action: value });
  }
  await action({ kind: 'move', ...sectors.feijao[9] });
  await action({ kind: 'pickup', item: 'feijao', target: 9 });
  assert.equal(state.delivery.quantity, 3);
  assert.equal((await a('save')).delivery.deadline, state.delivery.deadline);
  await action({ kind: 'move', ...buyers.feijao });
  const command = { id: randomUUID(), version: state.version, action: { kind: 'deliver' } };
  state = await a('action', command);
  assert.equal(state.money, initialMoney + 24);
  assert.equal((await a('action', command)).money, state.money);
  assert.equal((await a('save')).money, state.money);
  assert.equal((await b('save')).money, initialMoney);
  for (const request of [a, b]) await request('family/heartbeat', { x: 1200, y: 1300, location: 'farm', role: 'rocado' });
  const family = await a('family/heartbeat', { x: 1200, y: 1300, location: 'farm', role: 'rocado' });
  assert.ok(ids.every(id => family.members.some((member: any) => member.id === id)));
  for (const request of [a, b]) { await request('family/leave', {}); await request('logout', {}); }
  await a('save', undefined, 401);
  console.log('PASS: hosted page, JS, four textures, guest sessions, persistent delivery, idempotency, account isolation, two online siblings and logout.');
} finally {
  mkdirSync('.data', { recursive: true });
  writeFileSync('.data/hosted-smoke-users.json', JSON.stringify(ids));
  console.log('QA guest IDs:', JSON.stringify(ids));
}
