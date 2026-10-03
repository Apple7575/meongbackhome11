// 카카오 로그인(REST API, 인가 코드 방식).
// - 사람 구분은 카카오 회원번호로 한다(config 'kakao:<회원번호>' → 우리 사용자 id). 닉네임만 와도 같은 사람이면 같은 계정이다.
// - 카카오가 인증한 이메일이 오고 같은 이메일 계정이 있으면 그 계정에 잇는다. 이메일이 없으면 보내지 않는 내부 주소를 둔다.
// - 카카오가 이미 본인을 확인했으므로 이메일 인증 없이 바로 신고할 수 있다(verified_at 설정). 비밀번호는 없다.
// - KAKAO_REST_KEY가 없으면 버튼도 경로도 꺼져 있다.
import { randomBytes, randomUUID } from 'node:crypto';

const AUTHORIZE = 'https://kauth.kakao.com/oauth/authorize';
const TOKEN = 'https://kauth.kakao.com/oauth/token';
const ME = 'https://kapi.kakao.com/v2/user/me';
export const kakaoEmail = id => `kakao-${id}@kakao.invalid`;
// 돌아갈 화면은 앱 안의 해시 경로만 허용한다.
const safeNext = v => (typeof v === 'string' && /^\/[\w\-/?=&%.]{0,180}$/.test(v) && !v.startsWith('//') ? v : '/my');
const readCookie = (req, name) => req.headers.cookie?.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`))?.[1];

// session(res, uid): 로그인 쿠키를 만든다. db: prepare(sql).get/run(동기·비동기 모두)
export function installKakao({ app, db, session, secure, fetchImpl = fetch, env = process.env }) {
  const enabled = () => !!env.KAKAO_REST_KEY;
  const origin = req => env.PUBLIC_ORIGIN || `${req.protocol}://${req.get('host')}`;
  const redirectUri = req => `${origin(req)}/api/auth/kakao/callback`;
  // kakaoMapKey: 카카오맵 JavaScript 키(브라우저에 공개되는 키, 카카오 콘솔에 등록한 사이트 주소에서만 동작한다)
  app.get('/api/auth/providers', (req, res) => res.json({ kakao: enabled(), kakaoMapKey: env.KAKAO_JS_KEY || null }));
  app.get('/api/auth/kakao', (req, res) => {
    if (!enabled()) return res.status(404).json({ error: '카카오 로그인을 준비 중이에요.' });
    const state = randomBytes(16).toString('hex');
    res.cookie('mb_oauth', `${state}.${safeNext(req.query.next)}`, { httpOnly: true, sameSite: 'lax', secure, maxAge: 10 * 60000, path: '/api/auth/kakao' });
    const q = new URLSearchParams({ client_id: env.KAKAO_REST_KEY, redirect_uri: redirectUri(req), response_type: 'code', state });
    res.redirect(302, `${AUTHORIZE}?${q}`);
  });
  app.get('/api/auth/kakao/callback', async (req, res) => {
    let saved = '';
    try { saved = decodeURIComponent(readCookie(req, 'mb_oauth') || ''); } catch { saved = ''; }
    const dot = saved.indexOf('.');
    const state = dot > 0 ? saved.slice(0, dot) : '';
    const next = safeNext(dot > 0 ? saved.slice(dot + 1) : '');
    res.clearCookie('mb_oauth', { path: '/api/auth/kakao' });
    const back = result => res.redirect(302, `/#${next}${next.includes('?') ? '&' : '?'}login=${result}`);
    // 사용자가 동의를 취소했거나, 다른 곳에서 만든 요청(state 불일치)이면 로그인하지 않는다.
    if (!enabled() || !state || req.query.state !== state || typeof req.query.code !== 'string') return back('cancelled');
    let me;
    try {
      const body = new URLSearchParams({ grant_type: 'authorization_code', client_id: env.KAKAO_REST_KEY, redirect_uri: redirectUri(req), code: req.query.code });
      if (env.KAKAO_CLIENT_SECRET) body.set('client_secret', env.KAKAO_CLIENT_SECRET);
      const token = await (await fetchImpl(TOKEN, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' }, body, signal: AbortSignal.timeout(10000) })).json();
      if (!token.access_token) return back('failed');
      me = await (await fetchImpl(ME, { headers: { Authorization: `Bearer ${token.access_token}` }, signal: AbortSignal.timeout(10000) })).json();
    } catch {
      return back('failed');
    }
    const kid = String(me?.id || '');
    if (!/^\d+$/.test(kid)) return back('failed');
    const account = me.kakao_account || {};
    const nickname = String(account.profile?.nickname || me.properties?.nickname || '보호자').slice(0, 30);
    const email = account.email && account.is_email_valid !== false && account.is_email_verified ? String(account.email).toLowerCase() : null;
    const now = Date.now();
    const key = `kakao:${kid}`;
    let uid = (await db.prepare('SELECT value FROM config WHERE key=?').get(key))?.value;
    if (uid && !(await db.prepare('SELECT 1 FROM users WHERE id=?').get(uid))) uid = undefined; // 탈퇴한 계정
    if (!uid && email) uid = (await db.prepare('SELECT id FROM users WHERE email=?').get(email))?.id;
    if (!uid && req.user?.email) uid = req.user.id; // 이미 로그인한 계정에 카카오를 잇는다
    if (!uid) {
      // 지금 쓰던 익명 계정(작성 중이던 제보 등)을 그대로 카카오 계정으로 바꾼다.
      // 쿠키 없이 온 손님(클라우드는 익명 계정을 미리 만들지 않는다)이면 새 계정을 만든다.
      uid = req.user?.id;
      if (!uid) {
        uid = randomUUID();
        await db.prepare('INSERT INTO users(id,name) VALUES(?,?)').run(uid, nickname);
      }
      await db.prepare('UPDATE users SET email=?,password=NULL,name=?,verified_at=? WHERE id=?').run(email || kakaoEmail(kid), nickname, now, uid);
    } else {
      await db.prepare('UPDATE users SET verified_at=COALESCE(verified_at,?) WHERE id=?').run(now, uid);
    }
    await db.prepare('INSERT INTO config(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key, uid);
    await session(res, uid);
    back('kakao');
  });
}
