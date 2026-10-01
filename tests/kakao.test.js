import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server/app.js';

// 카카오 서버 대신: 인가 코드 → 토큰 → 사용자 정보
function fakeKakao(users) {
  return async (url, options = {}) => {
    if (url.startsWith('https://kauth.kakao.com/oauth/token')) {
      const code = new URLSearchParams(String(options.body)).get('code');
      return Response.json(users[code] ? { access_token: `token-${code}` } : { error: 'invalid_grant' });
    }
    if (url.startsWith('https://kapi.kakao.com/v2/user/me')) {
      const code = options.headers.Authorization.replace('Bearer token-', '');
      return Response.json(users[code]);
    }
    throw new Error(`unexpected ${url}`);
  };
}
async function fixture(users) {
  const service = createApp({ databasePath: ':memory:', examples: false, oauthFetch: fakeKakao(users), kakaoEnv: { KAKAO_REST_KEY: 'rest-key', KAKAO_CLIENT_SECRET: 'secret' } });
  const server = service.app.listen(0, '127.0.0.1'); await new Promise(r => server.once('listening', r));
  const origin = `http://127.0.0.1:${server.address().port}`;
  // 브라우저처럼 쿠키를 들고 다니는 손님
  const visitor = () => {
    const jar = new Map();
    const store = res => { for (const c of res.headers.getSetCookie()) { const [pair] = c.split(';'); const [k, v] = pair.split('='); if (v) jar.set(k, v); else jar.delete(k); } };
    const cookie = () => [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
    return {
      async get(path) { const res = await fetch(origin + path, { redirect: 'manual', headers: { cookie: cookie() } }); store(res); return res; },
      async post(path, body) { const res = await fetch(origin + path, { method: 'POST', redirect: 'manual', headers: { cookie: cookie(), 'Content-Type': 'application/json', Origin: origin }, body: JSON.stringify(body) }); store(res); return res; },
      async state() { return (await (await this.get('/api/state')).json()).user; },
    };
  };
  // 카카오 로그인 한 번: 시작 → (카카오 동의) → 돌아오기
  const login = async (v, code, next = '/my') => {
    const start = await v.get(`/api/auth/kakao?next=${encodeURIComponent(next)}`);
    assert.equal(start.status, 302);
    const to = new URL(start.headers.get('location'));
    assert.equal(to.origin + to.pathname, 'https://kauth.kakao.com/oauth/authorize');
    assert.equal(to.searchParams.get('client_id'), 'rest-key');
    assert.equal(to.searchParams.get('redirect_uri'), `${origin}/api/auth/kakao/callback`);
    const back = await v.get(`/api/auth/kakao/callback?code=${code}&state=${to.searchParams.get('state')}`);
    return back.headers.get('location');
  };
  return { service, origin, visitor, login, async stop() { server.closeAllConnections(); await new Promise(r => server.close(r)); service.close(); } };
}

test('kakao login identifies people by their kakao id, needs no email or password, and resists forged callbacks', async () => {
  const f = await fixture({
    c1: { id: 1001, kakao_account: { profile: { nickname: '카카오보호자' } } },
    c2: { id: 1001, kakao_account: { profile: { nickname: '카카오보호자' } } },
    c3: { id: 2002, kakao_account: { profile: { nickname: '메일있음' }, email: 'Owner@Example.com', is_email_valid: true, is_email_verified: true } },
  });
  try {
    const a = f.visitor();
    assert.equal((await (await a.get('/api/auth/providers')).json()).kakao, true);
    // 다른 곳에서 만든 콜백(state 불일치)은 로그인하지 않는다.
    await a.get('/api/state');
    const forged = await a.get('/api/auth/kakao/callback?code=c1&state=forged');
    assert.match(forged.headers.get('location'), /login=cancelled$/);
    assert.equal((await a.state()).registered, false);
    // 이메일 없이 닉네임만 와도 계정이 생기고, 바로 신고할 수 있다(인증됨).
    assert.equal(await f.login(a, 'c1', '/report/new'), '/#/report/new?login=kakao');
    const user = await a.state();
    assert.deepEqual([user.registered, user.verified, user.email, user.kakao, user.hasPassword, user.name], [true, true, null, true, false, '카카오보호자']);
    // 다른 기기에서 같은 카카오 계정으로 들어오면 같은 사람이다.
    const b = f.visitor();
    await f.login(b, 'c2');
    assert.equal((await b.state()).id, user.id);
    // 비밀번호로는 들어올 수 없다.
    assert.equal((await b.post('/api/auth/login', { email: 'kakao-1001@kakao.invalid', password: 'whatever-password' })).status, 401);
    // 카카오가 인증한 이메일이 기존 계정과 같으면 그 계정에 잇는다.
    const c = f.visitor();
    assert.equal((await c.post('/api/auth/register', { email: 'owner@example.com', password: 'original-password-123', name: '기존보호자' })).status, 200);
    const existing = (await c.state()).id;
    const d = f.visitor();
    await f.login(d, 'c3');
    assert.equal((await d.state()).id, existing);
    // 비밀번호 없는 계정은 '삭제' 입력으로 지운다.
    assert.equal((await b.post('/api/auth/delete', {})).status, 400);
    assert.equal((await b.post('/api/auth/delete', { confirm: '삭제' })).status, 200);
    assert.equal(f.service.db.prepare('SELECT count(*) n FROM users WHERE id=?').get(user.id).n, 0);
  } finally {
    await f.stop();
  }
});

test('kakao login stays hidden and closed without a key', async () => {
  const service = createApp({ databasePath: ':memory:', examples: false, kakaoEnv: {} });
  const server = service.app.listen(0, '127.0.0.1'); await new Promise(r => server.once('listening', r));
  const origin = `http://127.0.0.1:${server.address().port}`;
  try {
    assert.equal((await (await fetch(`${origin}/api/auth/providers`)).json()).kakao, false);
    assert.equal((await fetch(`${origin}/api/auth/kakao`, { redirect: 'manual' })).status, 404);
  } finally {
    server.closeAllConnections(); await new Promise(r => server.close(r)); service.close();
  }
});
