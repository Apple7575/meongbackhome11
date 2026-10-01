// 공공데이터(농림축산검역본부) 연동: 보호소에 들어온 개(구조동물)와 다른 곳에 낸 분실 신고를 우리 DB에 저장해 둔다.
// - 화면은 공공 API를 직접 부르지 않고 우리 DB만 읽는다. 동기화는 매일 정리 작업 + 6시간이 지나면 조회 때 한 번.
// - 저장 위치: docs 테이블. collection='shelter'|'lostext', owner='public:<지역>', revision=동기화 회차.
// - 분실 신고의 신고자 이름·전화번호(callName·callTel)는 받더라도 저장하지 않는다.
// - 원본 사진(약 700KB)은 우리 서버가 줄여서 주고, CDN이 일주일 동안 보관한다.
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { regionFromAddress, valuesOf } from '../src/domain.js';

const BASE = 'https://apis.data.go.kr/1543061';
export const SHELTER = 'shelter', LOSTEXT = 'lostext';
const SYNC_EVERY = 6 * 3600000;
const DAY = 86400000;
const SEX = { M: '수컷', F: '암컷', Q: '모름' };
const PHOTO = /^https?:\/\/openapi\.animal\.go\.kr\/[\w./-]+\.(jpe?g|png|gif)$/i;
const s = v => String(v ?? '').trim();
const ymd = t => new Date(t + 9 * 3600000).toISOString().slice(0, 10).replace(/-/g, '');
// 20261001 → 2026-10-01T00:00:00+09:00, '2026-09-24 02:00:00.0' → 2026-09-24T02:00:00+09:00
const kst = v => {
  const t = s(v);
  const m = /^(\d{4})-?(\d{2})-?(\d{2})(?:[ T](\d{2}):(\d{2}))?/.exec(t);
  return m ? new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4] || '00'}:${m[5] || '00'}:00+09:00`).toISOString() : null;
};
const regionOf = orgNm => regionFromAddress(s(orgNm).split(/\s+/)[0]);

// 공공 데이터의 자유로운 색 표현을 우리 색 이름으로 옮긴다(비교용).
const COLOR_WORDS = [
  ['흰색', /흰|백색|화이트|하양/], ['크림', /크림|아이보리/], ['갈색', /갈|브라운|초코|밤색|적색|레드/],
  ['검정색', /검|블랙|흑/], ['회색', /회|그레이|은색|실버/], ['황색', /황|노랑|베이지|살구|탄/],
  ['얼룩', /얼룩|점박|호반|호랑|바둑|삼색|혼합|믹스|섞|무늬/],
];
export const colorTags = text => COLOR_WORDS.filter(([, re]) => re.test(s(text))).map(([name]) => name);

export function normalizeShelter(a) {
  const photos = Array.from({ length: 8 }, (_, i) => s(a[`popfile${i + 1}`])).filter(u => PHOTO.test(u));
  return {
    id: `s-${s(a.desertionNo)}`, source: SHELTER,
    breed: s(a.kindNm) || '모름', color: s(a.colorCd), sex: SEX[s(a.sexCd)] || '모름',
    age: s(a.age).replace('(년생)', '년생'), weight: s(a.weight).replace('(Kg)', 'kg'),
    place: s(a.happenPlace), area: s(a.orgNm), region: regionOf(a.orgNm),
    happenedAt: kst(a.happenDt), noticeNo: s(a.noticeNo), noticeEnd: kst(a.noticeEdt), state: s(a.processState),
    mark: s(a.specialMark), photos,
    care: { name: s(a.careNm), tel: s(a.careTel), addr: s(a.careAddr) },
    rfid: s(a.rfidCd) || undefined,
  };
}
export function normalizeLost(a) {
  const photo = s(a.popfile);
  const key = photo || `${s(a.happenDt)}|${s(a.happenAddr)}|${s(a.specialMark)}`;
  return {
    id: `l-${createHash('sha1').update(key).digest('hex').slice(0, 16)}`, source: LOSTEXT,
    breed: s(a.kindCd) || '모름', color: s(a.colorCd), sex: SEX[s(a.sexCd)] || '모름', age: s(a.age),
    place: [s(a.happenAddr), s(a.happenAddrDtl), s(a.happenPlace)].filter(Boolean).join(' · '),
    area: s(a.orgNm), region: regionOf(a.orgNm), happenedAt: kst(a.happenDt), mark: s(a.specialMark),
    photos: PHOTO.test(photo) ? [photo] : [],
  };
}
const items = json => {
  const it = json?.response?.body?.items?.item;
  return Array.isArray(it) ? it : it ? [it] : [];
};
// 한 API를 끝 페이지까지 받는다(한 번에 1000건).
async function fetchAll(fetchImpl, path, params) {
  const out = [];
  for (let page = 1; page <= 20; page++) {
    const q = new URLSearchParams({ ...params, _type: 'json', numOfRows: '1000', pageNo: String(page) });
    const res = await fetchImpl(`${BASE}/${path}?${q}`, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error(`public api ${res.status}`);
    const json = await res.json();
    const header = json?.response?.header;
    if (header && header.resultCode && header.resultCode !== '00') throw new Error(`public api ${header.resultCode}`);
    const got = items(json);
    out.push(...got);
    const total = Number(json?.response?.body?.totalCount || 0);
    if (!got.length || out.length >= total) break;
  }
  return out;
}

// 실종 신고와 보호소에 들어온 개가 닮았는지: 같은 시·도, 잃어버린 뒤(하루 여유)에 구조, 털 색이 겹치고, 성별이 어긋나지 않고, 견종이 비슷(믹스는 통과).
const compact = v => s(v).replace(/\s|견$/g, '');
export function shelterScore(dog, rec) {
  if (!dog || !rec || dog.region !== rec.region) return 0;
  if (new Date(rec.happenedAt).getTime() < new Date(dog.time).getTime() - DAY) return 0;
  const ours = valuesOf(dog.color);
  const theirs = colorTags(rec.color);
  if (ours.length && theirs.length && !ours.some(c => theirs.includes(c))) return 0;
  const dogSex = { 여아: '암컷', 남아: '수컷' }[dog.sex] || dog.sex;
  if (dogSex && dogSex !== '모름' && rec.sex !== '모름' && dogSex !== rec.sex) return 0;
  const a = compact(dog.breed), b = compact(rec.breed);
  const mixed = /믹스|모름|기타/.test(a) || /믹스|모름|기타/.test(b);
  if (!mixed && !(a.includes(b) || b.includes(a))) return 0;
  return 1 + (mixed ? 0 : 2) + (theirs.length ? 1 : 0);
}
// 화면에 보낼 모양(내부용 rfid는 빼고, 사진은 우리 서버 주소로)
export const publicView = rec => ({
  ...rec, rfid: undefined,
  photos: rec.photos.map((_, i) => `/api/public/photo/${rec.id}/${i}`),
});

// db: prepare(sql).get/all/run(동기·비동기 모두), rows(collection) → ownerId가 붙은 문서, notify(uid,title,body,dogId)
export function installPublicData({ app, db, rows, notify, defer = p => p.catch(() => {}), fetchImpl = fetch, key = () => process.env.DATA_GO_KR_KEY }) {
  const config = async k => (await db.prepare('SELECT value FROM config WHERE key=?').get(k))?.value;
  const setConfig = (k, v) => db.prepare('INSERT INTO config(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(k, String(v));
  const load = async (collection, region) => (await db.prepare('SELECT id,json FROM docs WHERE collection=? AND owner=?').all(collection, `public:${region}`)).map(r => JSON.parse(r.json));
  const save = async (collection, records, stamp) => {
    for (let i = 0; i < records.length; i += 100) {
      const chunk = records.slice(i, i + 100);
      const values = chunk.map(() => '(?,?,?,?,?)').join(',');
      await db.prepare(`INSERT INTO docs(collection,id,owner,revision,json) VALUES ${values} ON CONFLICT(collection,id) DO UPDATE SET owner=excluded.owner,revision=excluded.revision,json=excluded.json`)
        .run(...chunk.flatMap(r => [collection, r.id, `public:${r.region || '기타'}`, stamp, JSON.stringify(r)]));
    }
    // 이번 동기화에 없는 것(반환·입양 등으로 공고가 끝난 아이, 60일 지난 분실 신고)은 지운다.
    await db.prepare('DELETE FROM docs WHERE collection=? AND revision<>?').run(collection, stamp);
  };
  async function sync({ force = false, now = Date.now() } = {}) {
    const serviceKey = key();
    if (!serviceKey) return { skipped: 'no key' };
    const last = Number(await config('public-sync-at')) || 0;
    if (!force && now - last < SYNC_EVERY) return { skipped: 'fresh' };
    await setConfig('public-sync-at', now);
    const before = new Set((await db.prepare('SELECT id FROM docs WHERE collection=?').all(SHELTER)).map(r => r.id));
    const raw = [
      ...await fetchAll(fetchImpl, 'abandonmentPublicService_v2/abandonmentPublic_v2', { serviceKey, upkind: '417000', state: 'notice' }),
      ...await fetchAll(fetchImpl, 'abandonmentPublicService_v2/abandonmentPublic_v2', { serviceKey, upkind: '417000', state: 'protect' }),
    ];
    const shelter = [...new Map(raw.map(normalizeShelter).filter(r => r.region).map(r => [r.id, r])).values()];
    const lost = [...new Map((await fetchAll(fetchImpl, 'lossInfoService/lossInfo', { serviceKey, upkind: '417000', bgnde: ymd(now - 60 * DAY), ended: ymd(now) }))
      .map(normalizeLost).filter(r => r.region).map(r => [r.id, r])).values()];
    const stamp = (Number(await config('public-sync-stamp')) || 0) + 1;
    await save(SHELTER, shelter, stamp);
    await save(LOSTEXT, lost, stamp);
    await setConfig('public-sync-stamp', stamp);
    // 새로 들어온 아이가 실종 신고와 닮았으면 보호자에게 알린다(같은 쌍은 한 번만, 신고마다 한 번에 최대 3건).
    let alerted = 0;
    const added = shelter.filter(r => !before.has(r.id));
    if (added.length) {
      const dogs = (await rows('dogs')).filter(d => d.status === 'missing' && !d.demo && d.ownerId);
      for (const dog of dogs) {
        const hits = added.map(r => [r, shelterScore(dog, r)]).filter(([, score]) => score >= 3).sort((a, b) => b[1] - a[1]).slice(0, 3);
        for (const [rec] of hits) {
          const k = `shelter-alert:${rec.id}:${dog.id}`;
          if (await config(k)) continue;
          await setConfig(k, now);
          await notify(dog.ownerId, '보호소에 비슷한 아이가 들어왔어요', `${rec.area} ${rec.care.name}에 ${rec.breed}·${rec.color} 아이가 공고됐어요. 사진을 확인해주세요.`, dog.id);
          alerted++;
        }
      }
    }
    return { shelter: shelter.length, lost: lost.length, added: added.length, alerted };
  }
  // 조회할 때 오래됐으면 뒤에서 한 번 새로 받는다(응답은 기다리지 않는다).
  const refresh = () => defer(sync().catch(() => {}));
  const json = res => { res.set('Cache-Control', 'public, max-age=300'); return res; };

  // 지역별 보호소에 있는 개(최근 구조 순)
  app.get('/api/public/shelter', async (req, res) => {
    refresh();
    const region = s(req.query.region);
    const list = (await load(SHELTER, region)).sort((a, b) => String(b.happenedAt).localeCompare(String(a.happenedAt)));
    const offset = Math.max(0, Number(req.query.offset) || 0), limit = Math.min(50, Number(req.query.limit) || 20);
    json(res).json({ total: list.length, items: list.slice(offset, offset + limit).map(publicView), syncedAt: Number(await config('public-sync-at')) || null });
  });
  // 지역별 다른 곳(국가동물보호정보시스템)에 낸 분실 신고(최근 분실 순). 신고자 연락처는 애초에 저장하지 않는다.
  app.get('/api/public/lost', async (req, res) => {
    refresh();
    const region = s(req.query.region);
    const list = (await load(LOSTEXT, region)).sort((a, b) => String(b.happenedAt).localeCompare(String(a.happenedAt)));
    const offset = Math.max(0, Number(req.query.offset) || 0), limit = Math.min(50, Number(req.query.limit) || 20);
    json(res).json({ total: list.length, items: list.slice(offset, offset + limit).map(publicView) });
  });
  // 내 실종 신고와 닮은, 보호소에 들어온 개
  app.get('/api/public/similar/:dogId', async (req, res) => {
    refresh();
    const dog = (await rows('dogs')).find(d => d.id === req.params.dogId);
    if (!dog) return json(res).json({ items: [] });
    const items = (await load(SHELTER, dog.region)).map(r => [r, shelterScore(dog, r)]).filter(([, score]) => score > 0)
      .sort((a, b) => b[1] - a[1] || String(b[0].happenedAt).localeCompare(String(a[0].happenedAt))).slice(0, 10).map(([r]) => publicView(r));
    json(res).json({ items });
  });
  // 사진: 공공 원본(약 700KB)을 받아 줄인 뒤 CDN에 일주일 맡긴다.
  app.get('/api/public/photo/:id/:n', async (req, res) => {
    const id = s(req.params.id);
    if (!/^[sl]-[\w]{1,40}$/.test(id)) return res.sendStatus(404);
    const row = await db.prepare('SELECT json FROM docs WHERE collection=? AND id=?').get(id.startsWith('s-') ? SHELTER : LOSTEXT, id);
    const url = row && JSON.parse(row.json).photos?.[Number(req.params.n) || 0];
    if (!url || !PHOTO.test(url)) return res.sendStatus(404);
    const width = Number(req.query.w) === 640 ? 640 : 192;
    try {
      const got = await fetchImpl(url.replace(/^http:/, 'https:'), { signal: AbortSignal.timeout(10000) });
      if (!got.ok) return res.sendStatus(404);
      const bytes = await sharp(Buffer.from(await got.arrayBuffer()), { limitInputPixels: 40000000 }).rotate()
        .resize(width, width, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 72 }).toBuffer();
      res.set('Cache-Control', 'public, max-age=86400, s-maxage=604800');
      res.type('image/webp').send(bytes);
    } catch {
      res.sendStatus(404);
    }
  });
  return { sync };
}
