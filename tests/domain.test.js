import test from 'node:test';
import assert from 'node:assert/strict';
import { chronologicalSightings, headingLabel, haversine, filterDogs, matchCandidates, arrowEnd, escapeHTML } from '../src/domain.js';
import { relativeTime, dayGroup, objectParticle } from '../src/format.js';

test('relative time, day groups and Korean object particle', () => {
  const now = new Date(2026, 8, 29, 16, 0).getTime();
  assert.equal(relativeTime(now - 30_000, now), '방금 전');
  assert.equal(relativeTime(now - 8 * 60_000, now), '8분 전');
  assert.equal(relativeTime(now - 3 * 3600_000, now), '3시간 전');
  assert.equal(dayGroup(new Date(2026, 8, 29, 1).getTime(), now), '오늘');
  assert.equal(dayGroup(new Date(2026, 8, 28, 23).getTime(), now), '어제');
  assert.equal(dayGroup(new Date(2026, 8, 25).getTime(), now), '이번 주');
  assert.equal(dayGroup(new Date(2026, 8, 1).getTime(), now), '이전');
  assert.equal(objectParticle('보리'), '를');
  assert.equal(objectParticle('초콩'), '을');
});

test('timeline orders by sighting time without mutating source and excludes unrelated reports',()=>{
  const source=[{id:'late',time:'2026-09-08T03:00Z',status:'확인 전'},{id:'wrong',time:'2026-09-08T01:00Z',status:'다른 강아지'},{id:'early',time:'2026-09-08T02:00Z',status:'관련 목격'}];
  assert.deepEqual(chronologicalSightings(source).map(x=>x.id),['early','late']);
  assert.equal(source[0].id,'late');
});
test('north is a valid zero heading, unknown stays distinct and headings wrap',()=>{
  assert.equal(headingLabel(0),'북쪽');assert.equal(headingLabel(null),'방향 모름');assert.equal(headingLabel(90),'동쪽');assert.equal(headingLabel(359),'북쪽');assert.equal(headingLabel(-90),'서쪽');
});
test('arrows point away from each sighting, independent of neighboring sightings',()=>{
  const p=[37.51,127.1],north=arrowEnd(p,0),east=arrowEnd(p,90);
  assert.ok(north[0]>p[0]);assert.equal(north[1],p[1]);assert.ok(east[1]>p[1]);assert.ok(Math.abs(haversine(p,north)-.065)<.002);
});
test('search combines region, color, size, accessory and reunion filters',()=>{
  const dogs=[{id:'a',name:'보리',breed:'말티즈',region:'서울',color:'흰색',size:'소형',accessory:'하네스',status:'missing'},{id:'b',name:'보리',breed:'말티즈',region:'부산',color:'흰색',size:'소형',accessory:'하네스',status:'reunited'}];
  assert.deepEqual(filterDogs(dogs,{region:'서울',query:' 말티즈 ',color:'흰색',size:'소형',accessory:'하네스',status:'missing'}).map(d=>d.id),['a']);
  assert.equal(filterDogs(dogs,{status:'reunited'}).length,1);assert.equal(filterDogs(dogs,{color:'검정색'}).length,0);
});
test('candidate matching excludes old, distant, linked and rejected sightings',()=>{
  const d={coords:[37.5,127.1],time:'2026-09-08T02:00Z',color:'흰색',size:'소형'};
  const base={coords:[37.51,127.1],time:'2026-09-08T03:00Z',color:'흰색',size:'소형',status:'확인 전'};
  const reports=[{...base,id:'match'},{...base,id:'old',time:'2026-09-07T03:00Z'},{...base,id:'far',coords:[35.1,129.1]},{...base,id:'linked',dogId:'a'},{...base,id:'wrong',status:'다른 강아지'}];
  assert.deepEqual(matchCandidates(d,reports).map(r=>r.id),['match']);
});
test('user-controlled text cannot inject HTML attributes or markup',()=>{
  assert.equal(escapeHTML('<img src="x" onerror=\'alert(1)\'>'),'&lt;img src=&quot;x&quot; onerror=&#39;alert(1)&#39;&gt;');
});
