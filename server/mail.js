export function createMailer(env = process.env, request = fetch) {
  const configured = !!(env.RESEND_API_KEY && env.MAIL_FROM && env.PUBLIC_ORIGIN);
  return {
    configured,
    async send({to, subject, text, html, id}) {
      if (!configured) throw new Error('메일 발송 설정이 필요해요.');
      const response = await request('https://api.resend.com/emails', {
        method:'POST', signal:AbortSignal.timeout(10000),
        headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':id},
        body:JSON.stringify({from:env.MAIL_FROM,to:[to],subject,text,html}),
      });
      if (!response.ok) throw new Error('메일을 발송하지 못했어요. 잠시 후 다시 시도해주세요.');
    },
  };
}
