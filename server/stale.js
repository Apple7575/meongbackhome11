// 오래된 신고 확인: 올린 지 2주가 지나도 '찾고 있어요'인 신고의 보호자에게 아직 찾고 있는지 묻는다.
// 찾은 아이가 계속 '찾고 있어요'로 남아 이웃의 수고가 헛되지 않게 한다. 같은 신고에는 2주에 한 번만 묻는다.
export const STALE_DAYS = 14;
const DAY = 86400000;
// 이름 끝 글자에 받침이 있으면 '은', 없으면 '는'
const topic = name => {
  const code = String(name).trim().slice(-1).charCodeAt(0) - 0xac00;
  return `${name}${code >= 0 && code <= 11171 && code % 28 !== 0 ? '은' : '는'}`;
};
export function staleNotice(dog) {
  return {
    title: `${topic(dog.name)} 아직 찾고 있나요?`,
    body: "집에 돌아왔다면 '찾았어요'를 눌러 알려주세요. 아직이라면 공유를 한 번 더 부탁드려요.",
  };
}
// db: prepare(sql).get/run(Promise 또는 값), dogs: ownerId가 붙은 신고 목록, notify(uid, title, body, dogId)
export async function remindStale({ db, dogs, notify, now = Date.now() }) {
  let sent = 0;
  for (const d of dogs) {
    if (d.status !== 'missing' || d.demo || !d.ownerId) continue;
    if (now - new Date(d.time).getTime() < STALE_DAYS * DAY) continue;
    const key = `stale-reminder:${d.id}`;
    const last = await db.prepare('SELECT value FROM config WHERE key=?').get(key);
    if (last && now - Number(last.value) < STALE_DAYS * DAY) continue;
    const n = staleNotice(d);
    await notify(d.ownerId, n.title, n.body, d.id);
    await db.prepare('INSERT INTO config(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key, String(now));
    sent++;
  }
  return sent;
}
