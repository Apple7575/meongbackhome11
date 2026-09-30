// 공유 링크 미리보기: 카카오톡·문자·SNS에 링크를 붙이면 강아지 사진과 이름이 카드로 보이게 한다.
// 화면은 해시 주소(#/dog/…)라 미리보기 로봇이 읽지 못하므로, /d/:id 가 미리보기 태그를 담은 작은 페이지를 주고
// 사람은 곧바로 상세 화면으로 옮겨 준다.
import sharp from 'sharp';
import { createHash } from 'node:crypto';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ID = /^[\w-]{1,80}$/;
const when = time => {
  const d = new Date(time);
  if (Number.isNaN(d.getTime())) return '';
  const k = new Date(d.getTime() + 9 * 3600000); // 한국 시간
  const h = k.getUTCHours(), m = String(k.getUTCMinutes()).padStart(2, '0');
  return `${k.getUTCMonth() + 1}월 ${k.getUTCDate()}일 ${h < 12 ? '오전' : '오후'} ${h % 12 || 12}:${m}`;
};
const place = (region, location) => region && String(location || '').startsWith(region) ? location : [region, location].filter(Boolean).join(' ');

// 이름 끝 글자에 받침이 있으면 '을', 없으면 '를'
const objectParticle = name => {
  const code = String(name).trim().slice(-1).charCodeAt(0) - 0xac00;
  return code >= 0 && code <= 11171 && code % 28 !== 0 ? '을' : '를';
};
export function shareText(dog) {
  const home = dog.status === 'reunited';
  const title = home ? `${dog.name}, 집에 돌아왔어요` : `${dog.name}${objectParticle(dog.name)} 찾고 있어요`;
  const lost = when(dog.time);
  const description = home
    ? `${[dog.breed, place(dog.region, dog.location)].filter(Boolean).join(' · ')} · 함께 찾아주셔서 고마워요.`
    : `${[dog.breed, dog.color].filter(Boolean).join(' · ')} · ${place(dog.region, dog.location)}${lost ? ` · ${lost}` : ''}에 잃어버렸어요. 보셨다면 알려주세요.`;
  return { title, description };
}

// getDog(id) → 공개해도 되는 강아지 신고, readImage(uri) → 사진 바이트(Buffer) 또는 null
export function installShare({ app, getDog, readImage }) {
  const origin = req => process.env.PUBLIC_ORIGIN || `${req.protocol}://${req.get('host')}`;
  const load = async id => {
    if (!ID.test(id)) return null;
    try { return await getDog(id); } catch { return null; }
  };
  app.get('/d/:id', async (req, res) => {
    const id = req.params.id;
    const dog = await load(id);
    const base = origin(req);
    const target = `/#/dog/${encodeURIComponent(id)}`;
    const { title, description } = dog ? shareText(dog) : { title: '멍백홈 — 다시, 따뜻한 집으로', description: '작은 목격이 소중한 재회로. 실종 강아지를 찾고, 주변의 목격 소식을 함께 나눠요.' };
    // 사진·그림 방식이 바뀌면 주소도 바뀌어 캐시된 옛 그림이 나오지 않는다.
    const version = dog?.image ? createHash("sha1").update(`og2:${dog.image}`).digest("hex").slice(0, 10) : "";
    const image = dog?.image ? `${base}/api/og/dog/${encodeURIComponent(id)}.jpg?v=${version}` : `${base}/og-home.png`;
    res.set('Cache-Control', 'public, max-age=300');
    res.type('html').send(`<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} · 멍백홈</title>
<meta name="description" content="${esc(description)}">
<meta property="og:type" content="article"><meta property="og:site_name" content="멍백홈">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(`${base}/d/${id}`)}"><meta property="og:image" content="${esc(image)}">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta http-equiv="refresh" content="0;url=${esc(target)}">
</head><body><script>location.replace(${JSON.stringify(target)})</script>
<p><a href="${esc(target)}">${esc(title)} — 멍백홈에서 보기</a></p></body></html>`);
  });
  app.get('/api/og/dog/:file', async (req, res) => {
    const id = req.params.file.replace(/\.jpg$/, '');
    const dog = await load(id);
    const bytes = dog?.image ? await readImage(dog.image).catch(() => null) : null;
    if (!bytes) return res.sendStatus(404);
    try {
      // 자동으로 자르면 강아지 대신 다른 물건을 고를 수 있어(실제 신고에서 확인) 사진 전체를 가운데에 두고,
      // 남는 양옆은 같은 사진을 흐리게 깔아 1200×630을 채운다.
      const photo = await sharp(bytes, { limitInputPixels: 40000000 }).rotate().toBuffer();
      const background = await sharp(photo).resize(1200, 630, { fit: 'cover' }).blur(28).modulate({ brightness: 0.85 }).toBuffer();
      const front = await sharp(photo).resize(1200, 630, { fit: 'inside' }).toBuffer();
      const jpg = await sharp(background).composite([{ input: front, gravity: 'center' }])
        .jpeg({ quality: 82, mozjpeg: true }).toBuffer();
      res.set('Cache-Control', 'public, max-age=3600');
      res.type('image/jpeg').send(jpg);
    } catch {
      res.sendStatus(404);
    }
  });
}

// 로컬(SQLite)·클라우드 공통: data URL 사진은 바로 풀어 쓴다.
export const dataUrlBytes = uri => {
  const m = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(uri || '');
  return m ? Buffer.from(m[2], 'base64') : null;
};
