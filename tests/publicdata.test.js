import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { createApp } from '../server/app.js';
import { normalizeShelter, normalizeLost, shelterScore, colorTags } from '../server/publicdata.js';

const shelterItem = (no, extra = {}) => ({
  desertionNo: String(no), happenDt: '20261001', happenPlace: '석촌호수 산책로', kindNm: '말티즈', colorCd: '흰색', age: '2023(년생)', weight: '3(Kg)',
  noticeNo: `서울-송파-${no}`, noticeEdt: '20261012', popfile1: `http://openapi.animal.go.kr/openapi/service/rest/fileDownloadSrvc/files/shelter/2026/09/${no}.jpg`,
  processState: '보호중', sexCd: 'F', specialMark: '분홍 하네스', careNm: '송파구 동물보호센터', careTel: '02-000-0000', careAddr: '서울특별시 송파구',
  orgNm: '서울특별시 송파구', rfidCd: '410000000000001', ...extra,
});
const lostItem = { happenDt: '2026-09-24 02:00:00.0', happenAddr: '서울특별시 송파구 올림픽로', happenAddrDtl: '공원 입구', happenPlace: '분수대', orgNm: '서울특별시 송파구',
  popfile: 'http://openapi.animal.go.kr/openapi/service/rest/fileDownloadSrvc/files/loss/2026/09/1.jpg', kindCd: '푸들', colorCd: '갈색', sexCd: 'M', age: '3살', specialMark: '빨간 목줄',
  callName: '홍길동', callTel: '010-1234-5678' };
const page = list => ({ response: { header: { resultCode: '00' }, body: { items: { item: list }, totalCount: list.length } } });

test('public data is normalised without reporter contact details and colours are mapped to ours', () => {
  const s = normalizeShelter(shelterItem(1));
  assert.equal(s.id, 's-1'); assert.equal(s.region, '서울'); assert.equal(s.sex, '암컷'); assert.equal(s.age, '2023년생');
  assert.equal(s.happenedAt, '2026-09-30T15:00:00.000Z'); assert.equal(s.photos.length, 1);
  const l = normalizeLost(lostItem);
  assert.equal(l.region, '서울'); assert.equal(l.sex, '수컷');
  assert.ok(!JSON.stringify(l).includes('010-1234-5678') && !JSON.stringify(l).includes('홍길동'));
  assert.equal(normalizeShelter(shelterItem(2, { orgNm: '경상북도 울진군' })).region, '경북');
  assert.deepEqual(colorTags('호반색(호랑이무늬)'), ['얼룩']);
  assert.deepEqual(colorTags('흰색&갈색'), ['흰색', '갈색']);
  const dog = { region: '서울', time: '2026-09-29T00:00:00Z', color: '흰색', sex: '암컷', breed: '말티즈' };
  assert.ok(shelterScore(dog, s) >= 3);
  assert.equal(shelterScore({ ...dog, color: '검정색' }, s), 0);
  assert.equal(shelterScore({ ...dog, sex: '수컷' }, s), 0);
  assert.equal(shelterScore({ ...dog, region: '부산' }, s), 0);
  assert.equal(shelterScore({ ...dog, time: '2026-10-05T00:00:00Z' }, s), 0);
});

test('sync stores shelter dogs and outside lost reports, serves them by region, alerts the owner once and drops dogs that left', async () => {
  const previous = process.env.DATA_GO_KR_KEY; process.env.DATA_GO_KR_KEY = 'test-key';
  let shelter = [shelterItem(10), shelterItem(11, { orgNm: '부산광역시 수영구', careAddr: '부산' })];
  const png = await sharp({ create: { width: 1200, height: 900, channels: 3, background: '#ccc' } }).png().toBuffer();
  const calls = [];
  const publicFetch = async (url) => {
    calls.push(url);
    if (url.includes('fileDownloadSrvc')) return new Response(png, { status: 200 });
    if (url.includes('abandonmentPublic_v2')) return Response.json(page(url.includes('state=notice') ? shelter : []));
    return Response.json(page([lostItem]));
  };
  const service = createApp({ databasePath: ':memory:', examples: false, publicFetch });
  const server = service.app.listen(0, '127.0.0.1'); await new Promise(r => server.once('listening', r));
  const origin = `http://127.0.0.1:${server.address().port}`;
  try {
    // 서울 송파에서 9월 29일에 잃어버린 흰색 말티즈(암컷) 신고
    service.db.prepare('INSERT INTO docs VALUES(?,?,?,?,?)').run('dogs', 'dog-1', 'owner-1', 1, JSON.stringify({ id: 'dog-1', name: '보리', breed: '말티즈', color: '흰색', sex: '암컷', region: '서울', status: 'missing', time: '2026-09-29T00:00:00Z', coords: [37.5, 127.1] }));
    const first = await service.publicData.sync({ force: true });
    assert.deepEqual([first.shelter, first.lost, first.alerted], [2, 1, 1]);
    assert.ok(calls.every(u => u.includes('serviceKey=test-key')));
    const list = await (await fetch(`${origin}/api/public/shelter?region=서울`)).json();
    assert.equal(list.total, 1);
    assert.equal(list.items[0].care.name, '송파구 동물보호센터');
    assert.equal(list.items[0].rfid, undefined);
    assert.equal(list.items[0].photos[0], '/api/public/photo/s-10/0');
    const similar = await (await fetch(`${origin}/api/public/similar/dog-1`)).json();
    assert.deepEqual(similar.items.map(i => i.id), ['s-10']);
    const notices = service.db.prepare("SELECT json FROM notices WHERE user_id='owner-1'").all().map(r => JSON.parse(r.json));
    assert.equal(notices.length, 1);
    assert.equal(notices[0].title, '보호소에 비슷한 아이가 들어왔어요');
    // 사진은 줄여서 주고 CDN에 맡긴다.
    const photo = await fetch(`${origin}/api/public/photo/s-10/0?w=192`);
    assert.equal(photo.headers.get('content-type'), 'image/webp');
    assert.match(photo.headers.get('cache-control'), /s-maxage=604800/);
    const meta = await sharp(Buffer.from(await photo.arrayBuffer())).metadata();
    assert.equal(Math.max(meta.width, meta.height), 192);
    // 다음 동기화: 서울 아이가 공고 끝(목록에서 빠짐) → 지운다. 같은 알림은 다시 보내지 않는다.
    shelter = [shelterItem(11, { orgNm: '부산광역시 수영구' })];
    const second = await service.publicData.sync({ force: true });
    assert.equal(second.alerted, 0);
    assert.equal((await (await fetch(`${origin}/api/public/shelter?region=서울`)).json()).total, 0);
    // 6시간 안에는 다시 받지 않는다.
    assert.equal((await service.publicData.sync()).skipped, 'fresh');
    assert.equal((await fetch(`${origin}/api/public/photo/x-1/0`)).status, 404);
  } finally {
    if (previous === undefined) delete process.env.DATA_GO_KR_KEY; else process.env.DATA_GO_KR_KEY = previous;
    server.closeAllConnections(); await new Promise(r => server.close(r)); service.close();
  }
});
