// 앱(Android·iOS) 알림: 기기 FCM 토큰을 웹 푸시 구독과 같은 표(subscriptions)에 'fcm:<토큰>' 주소로 저장하고,
// 발송 큐(outbox)에서 꺼낼 때 Firebase Cloud Messaging HTTP v1로 보낸다. 웹 푸시는 그대로 web-push로 보낸다.
import { createSign } from 'node:crypto';

const SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
// FIREBASE_SERVICE_ACCOUNT: 서비스 계정 키 JSON(그대로 또는 base64).
export function serviceAccount(env = process.env) {
  const raw = env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  try {
    const text = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
    const account = JSON.parse(text);
    return account.client_email && account.private_key && account.project_id ? account : null;
  } catch {
    return null;
  }
}
export const fcmConfigured = (env = process.env) => !!serviceAccount(env);
export const nativeEndpoint = token => `fcm:${token}`;
// 앱이 보내는 토큰: FCM 토큰은 영문·숫자·_-: 로 된 수백 자 문자열이다.
export function nativeSubscription(body) {
  const token = typeof body?.token === 'string' ? body.token.trim() : '';
  if (!/^[\w:-]{20,4096}$/.test(token)) return null;
  const platform = body?.platform === 'ios' ? 'ios' : body?.platform === 'android' ? 'android' : null;
  if (!platform) return null;
  return { endpoint: nativeEndpoint(token), json: { type: 'fcm', token, platform } };
}
const base64url = value => Buffer.from(value).toString('base64url');
// 서비스 계정으로 1시간짜리 접근 토큰을 받아 두고, 끝나기 1분 전에 새로 받는다.
export function createFcmSender({ env = process.env, fetchImpl = fetch, now = () => Date.now() } = {}) {
  let cached = null;
  async function accessToken(account) {
    if (cached && cached.until > now()) return cached.token;
    const iat = Math.floor(now() / 1000);
    const head = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const claims = base64url(JSON.stringify({ iss: account.client_email, scope: SCOPE, aud: account.token_uri || 'https://oauth2.googleapis.com/token', iat, exp: iat + 3600 }));
    const signature = createSign('RSA-SHA256').update(`${head}.${claims}`).sign(account.private_key, 'base64url');
    const res = await fetchImpl(account.token_uri || 'https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${head}.${claims}.${signature}` }),
    });
    if (!res.ok) throw Object.assign(new Error(`FCM 인증 실패 ${res.status}`), { statusCode: 500 });
    const data = await res.json();
    cached = { token: data.access_token, until: now() + (Number(data.expires_in) || 3600) * 1000 - 60000 };
    return cached.token;
  }
  // payload: 발송 큐에 담긴 JSON 문자열 { title, body, url }
  return async function sendFcm(token, payload) {
    const account = serviceAccount(env);
    if (!account) throw Object.assign(new Error('FCM 설정이 없어요'), { statusCode: 503 });
    const { title = '멍백홈', body = '', url = '/#/my' } = JSON.parse(payload);
    const res = await fetchImpl(`https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`, {
      method: 'POST',
      headers: { authorization: `Bearer ${await accessToken(account)}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        message: {
          token,
          notification: { title, body },
          data: { url },
          android: { priority: 'high', notification: { sound: 'default' } },
          apns: { payload: { aps: { sound: 'default' } } },
        },
      }),
    });
    if (res.ok) return;
    const error = await res.json().catch(() => ({}));
    const reason = error?.error?.details?.find?.(d => d.errorCode)?.errorCode || error?.error?.status;
    // 앱을 지웠거나 토큰이 바뀐 기기: 웹 푸시의 410처럼 구독을 지운다.
    const gone = res.status === 404 || reason === 'UNREGISTERED' || (res.status === 400 && reason === 'INVALID_ARGUMENT');
    if (res.status === 401) cached = null;
    throw Object.assign(new Error(`FCM ${res.status} ${reason || ''}`), { statusCode: gone ? 410 : res.status });
  };
}
// 구독 하나로 보낸다: 앱 기기는 FCM, 나머지는 웹 푸시.
export const pushVia = ({ fcm, web }) => (sub, payload) => (sub.type === 'fcm' ? fcm(sub.token, payload) : web(sub, payload));
