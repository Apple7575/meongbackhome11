function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function accountEmail({ origin, token, purpose }) {
  const verify = purpose === 'verify';
  const title = verify ? '이메일 주소를 확인해주세요' : '비밀번호를 다시 설정해주세요';
  const intro = verify
    ? '멍백홈 계정을 안전하게 사용하려면 이메일 인증이 필요해요.'
    : '비밀번호 재설정을 요청하셨다면 아래 버튼을 눌러 새 비밀번호를 설정해주세요.';
  const button = verify ? '이메일 인증하기' : '비밀번호 재설정하기';
  const expires = verify ? '24시간' : '30분';
  const link = `${origin}/#/account/${purpose}?token=${encodeURIComponent(token)}`;
  const safeLink = escapeHtml(link);
  const text = `${title}\n\n${intro}\n\n${link}\n\n이 링크는 ${expires} 동안 사용할 수 있어요. 요청하지 않았다면 이 메일을 무시해주세요.`;
  const html = `<!doctype html><html lang="ko"><body style="margin:0;background:#f5f7f1;color:#263126;font-family:Arial,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;"><div style="padding:32px 16px;"><div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e4e9df;border-radius:24px;overflow:hidden;"><div style="padding:28px 30px;background:#eaf2e5;"><div style="font-size:14px;font-weight:700;letter-spacing:.08em;color:#62765b;">MEONGBACK HOME</div><div style="margin-top:14px;font-size:30px;line-height:1;">🐾</div></div><div style="padding:32px 30px 30px;"><h1 style="margin:0 0 14px;font-size:24px;line-height:1.35;color:#273328;">${title}</h1><p style="margin:0;color:#637064;font-size:15px;line-height:1.75;">${intro}</p><div style="padding:22px 0 26px;text-align:center;"><a href="${safeLink}" style="display:inline-block;padding:15px 24px;border-radius:12px;background:#3f6848;color:#fff;text-decoration:none;font-size:15px;font-weight:700;">${button}</a></div><p style="margin:0;color:#879187;font-size:13px;line-height:1.7;">버튼이 열리지 않으면 아래 링크를 눌러주세요.<br><a href="${safeLink}" style="color:#3f6848;word-break:break-all;">${safeLink}</a></p><div style="height:1px;background:#edf0eb;margin:26px 0 18px;"></div><p style="margin:0;color:#9aa39b;font-size:12px;line-height:1.7;">이 링크는 ${expires} 동안 사용할 수 있어요.<br>본인이 요청하지 않았다면 이 메일을 무시해주세요.</p></div></div><p style="max-width:560px;margin:18px auto 0;text-align:center;color:#9aa39b;font-size:12px;">잃어버린 강아지가 집으로 돌아오는 길, 멍백홈</p></div></body></html>`;
  return { text, html };
}
