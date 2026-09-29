export const REGIONS = ['전국', '서울', '경기', '인천', '부산', '대구', '대전', '광주', '울산', '세종', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'];
export const COORDS = { 서울:[37.5145,127.1059], 경기:[37.2636,127.0286], 인천:[37.4563,126.7052], 부산:[35.1796,129.0756], 대구:[35.8714,128.6014], 대전:[36.3504,127.3845], 광주:[35.1595,126.8526], 울산:[35.5384,129.3114], 세종:[36.48,127.289], 강원:[37.8813,127.7298], 충북:[36.6424,127.489], 충남:[36.6588,126.6728], 전북:[35.8242,127.148], 전남:[34.816,126.463], 경북:[36.019,129.343], 경남:[35.228,128.681], 제주:[33.4996,126.5312] };
export const REPORT_STATUSES = ['확인 전', '확인 중', '관련 목격', '다른 강아지'];
export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const chronologicalSightings = sightings => [...sightings].filter(s => s.status !== '다른 강아지').sort((a,b) => new Date(a.time) - new Date(b.time));
export function headingLabel(value) {
  if (value === null || value === undefined || value === '') return '방향 모름';
  return ['북쪽','북동쪽','동쪽','남동쪽','남쪽','남서쪽','서쪽','북서쪽'][Math.round(((Number(value)%360+360)%360)/45)%8];
}
export function haversine(a,b) {
  const r = Math.PI/180, dLat=(b[0]-a[0])*r, dLng=(b[1]-a[1])*r;
  const h=Math.sin(dLat/2)**2+Math.cos(a[0]*r)*Math.cos(b[0]*r)*Math.sin(dLng/2)**2;
  return 6371*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));
}
export function matchCandidates(dog,reports) {
  return reports.filter(r=>!r.dogId && !!r.demo===!!dog.demo && (!r.exampleFor||r.exampleFor===dog.id) && r.status!=='다른 강아지' && new Date(r.time)>=new Date(dog.time)).map(r=>({ ...r, distance:haversine(dog.coords,r.coords), score:(r.color===dog.color?3:0)+(r.size===dog.size?2:0)+Math.max(0,3-haversine(dog.coords,r.coords)/5) })).filter(r=>r.distance<50).sort((a,b)=>b.score-a.score);
}
export function filterDogs(dogs,{region='전국',query='',color='',size='',accessory='',status='all'}={}) {
  const q=query.trim().toLocaleLowerCase();
  return dogs.filter(d=>(region==='전국'||d.region===region)&&(!q||[d.name,d.breed,d.location,d.description].join(' ').toLocaleLowerCase().includes(q))&&(!color||d.color===color)&&(!size||d.size===size)&&(!accessory||d.accessory===accessory)&&(status==='all'||d.status===status));
}
export function arrowEnd(coords,heading,meters=65) {
  const rad=Number(heading)*Math.PI/180;
  return [coords[0]+Math.cos(rad)*meters/111320,coords[1]+Math.sin(rad)*meters/(111320*Math.cos(coords[0]*Math.PI/180))];
}
