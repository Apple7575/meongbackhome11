import {escapeHTML as esc,chronologicalSightings,haversine} from './domain.js';

export function exampleDetail(dog,state){
  if(!dog.previewOnly)return '';
  const reports=chronologicalSightings(state.reports.filter(r=>r.dogId===dog.id));
  const confirmed=reports.filter(r=>r.status==='관련 목격').length;
  const latest=reports.at(-1);
  const distance=Math.max(0,...reports.map(r=>haversine(dog.coords,r.coords)));
  const profile=dog.exampleProfile;
  return `<section class="example-overview" aria-label="예시 수색 현황">
    <div class="example-disclosure"><span class="subtle-tag">체험용 시나리오</span><p>사진·장소·목격 기록·대화는 서비스 이용을 보여주는 가상 예시예요. 실제 실종이나 수색 상황이 아니에요.</p></div>
    <details class="example-more"><summary>수색 현황 · 강아지 특징 더 보기</summary><div class="example-metrics">
      <div><span>접수된 목격</span><strong>${reports.length}<small>건</small></strong><p>시간순으로 확인할 단서</p></div>
      <div><span>보호자 확인</span><strong>${confirmed}<small>건</small></strong><p>관련 목격으로 확인한 제보</p></div>
      <div><span>최근 목격 시각</span><strong class="metric-time">${latest?new Date(latest.time).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit',hour12:false}):'—'}</strong><p>${latest?esc(new Date(latest.time).toLocaleDateString('ko-KR')):'아직 제보가 없어요'}</p></div>
      <div><span>가장 먼 목격 지점</span><strong>${Math.round(distance*1000)}<small>m</small></strong><p>실종 지점과의 직선거리</p></div>
    </div>
    <div class="example-profile"><div><span class="eyebrow">사진과 함께 비교해주세요</span><h3>${esc(dog.name)}를 알아보는 단서</h3><dl><dt>구별되는 특징</dt><dd>${esc(profile.feature)}</dd><dt>평소 행동</dt><dd>${esc(profile.habit)}</dd><dt>현재 확인 중인 구역</dt><dd>${esc(profile.focus)}</dd></dl></div><aside><span class="subtle-tag">최근 단서 · ${esc(latest?.status||'확인 전')}</span><h3>${esc(latest?.location||'목격 제보 대기')}</h3><p>${esc(latest?.description||'')}</p><small>확인 전 제보는 같은 강아지인지 아직 판단하지 않은 정보예요. 거리 수치는 실제 이동 거리나 수색 반경을 뜻하지 않아요.</small></aside></div>
    </details>
  </section>`;
}
