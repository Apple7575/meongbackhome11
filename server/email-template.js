function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

// 앱과 같은 규칙: 흰 바탕 · 회색 글자 · 코랄 버튼 하나 · 짧은 해요체 문구.
// 메일 앱은 외부 CSS·웹폰트를 막는 경우가 많아 인라인 스타일과 시스템 글꼴만 쓴다.
const COLOR = { page: '#f9fafb', card: '#ffffff', title: '#191f28', body: '#4e5968', muted: '#8b95a1', line: '#e5e8eb', brand: '#b8553a' };
const FONT = "-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Pretendard','Malgun Gothic',sans-serif";

export function accountEmail({ origin, token, purpose }) {
  const verify = purpose === 'verify';
  const title = verify ? '이메일 인증을 마쳐주세요' : '새 비밀번호를 만들어주세요';
  const intro = verify
    ? '아래 버튼을 누르면 인증이 끝나고 바로 멍백홈을 쓸 수 있어요.'
    : '비밀번호를 바꾸려면 아래 버튼을 눌러주세요. 모든 기기에서 다시 로그인하게 돼요.';
  const button = verify ? '이메일 인증하기' : '새 비밀번호 만들기';
  const expires = verify ? '24시간' : '30분';
  const link = `${origin}/#/account/${purpose}?token=${encodeURIComponent(token)}`;
  const safeLink = escapeHtml(link);
  const logo = `${escapeHtml(origin)}/icons/apple-touch-icon.png`;
  const text = `${title}\n\n${intro}\n\n${link}\n\n이 링크는 ${expires} 동안 한 번만 쓸 수 있어요. 요청하지 않았다면 이 메일은 무시해도 돼요.`;
  const html = `<!doctype html><html lang="ko"><head><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"></head><body style="margin:0;background:${COLOR.page};font-family:${FONT};">
<div style="padding:40px 16px;">
<div style="max-width:480px;margin:0 auto;background:${COLOR.card};border-radius:20px;padding:36px 28px 32px;">
<div style="margin-bottom:28px;"><img src="${logo}" width="28" height="28" alt="" style="border-radius:8px;vertical-align:middle;"><span style="margin-left:8px;font-size:17px;font-weight:700;color:${COLOR.title};vertical-align:middle;">멍백홈</span></div>
<h1 style="margin:0 0 10px;font-size:24px;line-height:1.4;font-weight:700;color:${COLOR.title};letter-spacing:-0.02em;">${title}</h1>
<p style="margin:0 0 28px;font-size:16px;line-height:1.6;color:${COLOR.body};">${intro}</p>
<a href="${safeLink}" style="display:block;text-align:center;padding:16px 20px;border-radius:12px;background:${COLOR.brand};color:#ffffff;text-decoration:none;font-size:17px;font-weight:700;">${button}</a>
<p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:${COLOR.muted};">버튼이 열리지 않으면 이 주소를 눌러주세요.<br><a href="${safeLink}" style="color:${COLOR.body};word-break:break-all;">${safeLink}</a></p>
<div style="height:1px;background:${COLOR.line};margin:24px 0 16px;"></div>
<p style="margin:0;font-size:13px;line-height:1.6;color:${COLOR.muted};">이 링크는 ${expires} 동안 한 번만 쓸 수 있어요. 요청하지 않았다면 이 메일은 무시해도 돼요.</p>
</div>
<p style="max-width:480px;margin:16px auto 0;text-align:center;font-size:13px;color:${COLOR.muted};">잃어버린 강아지가 집으로 돌아오는 길, 멍백홈</p>
</div></body></html>`;
  return { text, html };
}
