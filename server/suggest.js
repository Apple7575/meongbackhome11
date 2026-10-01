// 목격자가 "이 아이 같아요"라고 고른 실종 신고의 보호자에게만 알린다.
// 자동 알림(match.js)보다 정확한 신호라 따로 알린다. 같은 제보·신고 쌍은 한 번만 알린다.
import { haversine } from '../src/domain.js';
import { withParticle } from './match.js';

// get(collection, id) → ownerId가 붙은 문서, notify(uid, title, body, dogId, reportId), db: config 테이블, fail(status, message)
export function installSuggest({ app, get, notify, db, rate, fail }) {
  app.post('/api/reports/:id/suggest', async (req, res) => {
    if (rate) await rate(`suggest:${req.user.id}`, 20);
    const report = await get('reports', req.params.id);
    if (!report || report.ownerId !== req.user.id) fail(404, '제보를 찾을 수 없어요.');
    if (report.dogId) fail(409, '이미 실종 신고에 연결된 제보예요.');
    const ids = [...new Set(Array.isArray(req.body?.dogIds) ? req.body.dogIds : [])].filter(x => typeof x === 'string').slice(0, 3);
    if (!ids.length) fail(400, '알릴 실종 신고를 골라주세요.');
    let sent = 0;
    for (const id of ids) {
      const dog = await get('dogs', id);
      // 찾고 있는 실제 신고이고, 내 신고가 아니며, 제보 위치에서 20km 안인 경우만
      if (!dog || dog.status !== 'missing' || dog.demo || dog.ownerId === req.user.id || !Array.isArray(dog.coords)) continue;
      if (!Array.isArray(report.coords) || haversine(dog.coords, report.coords) > 20) continue;
      const key = `suggest:${report.id}:${dog.id}`;
      if (await db.prepare('SELECT 1 FROM config WHERE key=?').get(key)) continue;
      await db.prepare('INSERT INTO config(key,value) VALUES(?,?)').run(key, String(Date.now()));
      await notify(dog.ownerId, '목격자가 우리 아이 같다고 알려줬어요',
        `${report.location}에서 본 강아지가 ${withParticle(dog.name)} 닮았대요. 사진을 확인해주세요.`, dog.id, report.id);
      sent++;
    }
    res.json({ sent });
  });
}
