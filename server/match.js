// 어떤 신고에도 연결되지 않은 목격 제보가 들어오면, 비슷한 실종 신고의 보호자에게 "혹시 우리 아이일까요?" 알림을 보낸다.
// 비교 기준: 거리(5km 안), 시간(잃어버린 뒤에 본 것), 털 색·크기(모르면 통과). 둘 다 모르면 2km 안만.
import { haversine, sharesValue } from '../src/domain.js';

const known = v => v && v !== '모름';
export function similarDogs(report, dogs, { maxKm = 5, limit = 5 } = {}) {
  if (report.dogId || !Array.isArray(report.coords)) return [];
  const colorKnown = known(report.color), sizeKnown = known(report.size);
  const radius = colorKnown || sizeKnown ? maxKm : 2;
  const seen = new Date(report.time).getTime();
  return dogs
    .filter(d => d.status === 'missing' && !d.demo && !d.previewOnly && d.ownerId && d.ownerId !== report.ownerId && Array.isArray(d.coords))
    .filter(d => !(new Date(d.time).getTime() > seen))
    .filter(d => (!colorKnown || sharesValue(report.color, d.color)) && (!sizeKnown || report.size === d.size))
    .map(d => ({ dog: d, km: haversine(d.coords, report.coords) }))
    .filter(m => m.km <= radius)
    .sort((a, b) => a.km - b.km)
    .slice(0, limit);
}

// 이름 끝 글자에 받침이 있으면 '과', 없으면 '와'
const withParticle = name => {
  const code = String(name).trim().slice(-1).charCodeAt(0) - 0xac00;
  return `${name}${code >= 0 && code <= 11171 && code % 28 !== 0 ? '과' : '와'}`;
};
export function similarNotice(dog, report, km) {
  const where = km < 1 ? `${Math.max(100, Math.round(km * 10) * 100)}m` : `${km.toFixed(1)}km`;
  return {
    title: '혹시 우리 아이일까요?',
    body: `${withParticle(dog.name)} 비슷한 강아지를 ${where} 떨어진 ${report.location}에서 봤다는 제보가 있어요.`,
  };
}
