import fs from 'node:fs';
let s=fs.readFileSync('src/main.js','utf8');
s=s.replace('import { read, save, id, notify } from "./store.js";','import { read, save, id, notify, initialize, refresh, authenticate, enablePush } from "./client-store.js";\nimport { enhanceWizard, loadDraft, clearDraft } from "./wizard.js";\nimport { timelineExperience } from "./timeline.js";');
const start=s.indexOf('const persist = () => {');const end=s.indexOf('\nconst badge',start);s=s.slice(0,start)+`const persist = async () => {
  document.body.classList.add('is-saving');
  try { await save(); } finally { document.body.classList.remove('is-saving'); }
};`+s.slice(end);
s=s.replaceAll('persist();','await persist();').replaceAll('= (e) => {','= async (e) => {').replaceAll('= () => {','= async () => {');
// Only callbacks containing awaited persistence need async; async event callbacks are also safe.
s=s.replace('function notifications() {','async function notifications() {').replace('document.addEventListener("click", (e) => {','document.addEventListener("click", async (e) => {');
s=s.replaceAll('/assets/hero-home.png','/assets/mascot-home.webp').replaceAll('/assets/reunion.png','/assets/mascot-reunion.webp');
s=s.replaceAll('따뜻한 집 앞에서 기다리는 귀여운 두 강아지','코랄색 인식표를 한 멍백홈의 하얀 강아지').replaceAll('서로 기대고 있는 두 강아지','기쁘게 집으로 달려오는 멍백홈 강아지').replaceAll('다시 만나 서로 기대고 있는 두 강아지','집으로 달려오는 멍백홈 강아지');
s=s.replaceAll('db.dogs.filter((d) => !d.demo)','db.dogs.filter((d) => d.canManage)').replaceAll('d => !d.demo','d => d.canManage').replaceAll('!d.demo && d.id === r.dogId','d.canManage && d.id === r.dogId');
s=s.replaceAll('이 브라우저에 저장된 신고인지 확인해주세요.','링크가 올바른지 확인하거나 목록에서 다시 찾아주세요.');
s=s.replaceAll('체험 버전에서는 이 기기에 저장한 신고와 반려견 정보를 관리해요.','신고와 반려견 정보를 한곳에서 관리하고, 새 목격 소식을 확인하세요.');
s=s.replaceAll('체험 버전 · 예시 신고와 생성 이미지가 포함되어 있어요. 입력한 내용은 이 브라우저에만 저장돼요.','작은 관심이 소중한 재회로 · 예시 표시가 있는 신고는 실제 실종 신고가 아니에요.');
s=s.replaceAll('체험용 등록이에요. 실제 신고 접수나 외부 전송 없이 이 브라우저에만 저장돼요.','신고 사진과 목격 장소는 함께 찾는 이웃에게 공개돼요. 연락처는 게시글에 적지 말아주세요.');
s=s.replaceAll('체험 버전에서는 제보와 대화가 이 기기에만 저장돼요. 실제 보호자에게 전송되지 않아요.','제보가 등록되면 보호자에게 알림이 전달돼요. 보호 중인 정확한 위치와 대화는 당사자만 볼 수 있어요.');
s=s.replaceAll('대화 UI 체험이에요. 상대방에게 전송되지 않아요.','이 대화는 보호자와 제보자만 볼 수 있어요.');
s=s.replaceAll('체험용 관리','보호자 확인').replaceAll('작성한 후기는 이 브라우저에 저장돼요.','재회의 경험이 다른 보호자에게 큰 도움이 돼요.');
s=s.replaceAll('현재는 이 브라우저에서 등록한 관심 지역 신고만 알림함에 표시돼요. 웹 푸시·문자 알림은 아직 연결되지 않았어요.','새 실종 신고가 올라오면 알림함에서 바로 확인할 수 있어요. 브라우저 알림을 켜면 지원되는 기기에서 백그라운드 알림도 받을 수 있어요.');
s=s.replaceAll('현재 직접 등록한 신고는 이 브라우저에만 있어요. 다른 기기로 신고 내용을 공유하려면 서버 연동이 필요해요.','공유받은 사람은 가입 없이 신고를 확인하고 제보할 수 있어요. 재회하면 이 링크에도 완료 상태가 표시돼요.');
s=s.replaceAll('체험용 전단이에요. 새 신고의 QR 링크는 서버 연동 전까지 다른 기기에서 열리지 않아요.','QR은 이 신고의 최신 소식으로 연결돼요. 휴대폰으로 QR을 스캔해 확인할 수 있어요.');
s=s.replaceAll('체험용 전단 · 실제 배포 전 서버 연결 필요','멍백홈 · 소중한 관심에 감사합니다.');
s=s.replaceAll('신고가 재회 완료로 바뀌고, 이 브라우저의 알림함에<br>재회 소식이 남아요.','신고가 재회 완료로 바뀌고, 제보한 이웃과<br>소식을 저장한 분들에게 재회 알림이 전달돼요.');
s=s.replaceAll('이 브라우저에 신고를 저장했어요.','신고가 등록됐어요. 이제 이웃에게 알려주세요.').replaceAll('소중한 제보를 이 브라우저에 저장했어요.','소중한 제보가 전달됐어요. 감사합니다.');
s=s.replace('body = hero() + actionCards() + explorer(true) + communityBanner();','body = dashboard() + hero() + actionCards() + explorer(true) + communityBanner();');
s=s.replace('let maps = [],','let timelineCleanup = () => {}, pendingRefresh = false;\nlet maps = [],');
s=s.replace('function render() {','function render() {\n  timelineCleanup();');
const mapStart=s.indexOf('    const reports = read().reports.filter((r) => r.dogId === d.id);',s.indexOf('function render()'));
const mapEnd=s.indexOf('\n  }\n}',mapStart);
s=s.slice(0,mapStart)+`    const reports = read().reports.filter((r) => r.dogId === d.id);
    timelineCleanup = timelineExperience(m, reports, reportDetail);
    if (!reports.length) marker(m, d.coords, '♥');`+s.slice(mapEnd);
s=s.replace('function closeModal() {','function closeModal() {');
s=s.replace('  previousFocus?.focus?.();','  previousFocus?.focus?.();\n  if(pendingRefresh){pendingRefresh=false;refresh();}');
s=s.replace('if (!file) return fallback;','if (!file) return form._photo || fallback;');
s=s.replace('const url = await photoValue(form);','const url = await photoValue(form);\n      form._photo = url;');
s=s.replace('  const d = edit || profile || {};','  if(!profileOnly && !read().user?.registered){accountForm(() => dogForm({profile,edit,profileOnly}));return;}\n  const d = edit || profile || {};');
s=s.replace('  let coords = d.coords || COORDS[d.region || "서울"];\n  let picked = !!edit;','  const draftKey = profileOnly ? "profile" : `dog-${edit?.id || profile?.id || "new"}`;\n  const draft = loadDraft(draftKey);\n  let coords = draft?.extra?.coords || d.coords || COORDS[d.region || "서울"];\n  let picked = draft?.extra?.picked || !!edit;');
// Preserve precise map positions in drafts by providing live access to the closure.
let marker='  form.onsubmit = async (e) => {';
let idx=s.indexOf(marker,s.indexOf('function dogForm'));
s=s.slice(0,idx)+`  const wizard=enhanceWizard(form,{key:draftKey,kind:profileOnly?'profile':'dog',extra:()=>({coords,picked}),validate:step=>{if(!profileOnly&&step===1&&!picked)throw new Error('지도에서 목격 위치를 선택해주세요.');},onStep:()=>window.dispatchEvent(new Event('resize'))});
  const cleanup=modalCleanup;modalCleanup=()=>{wizard.dispose();cleanup();};
`+s.slice(idx);
s=s.replace('        await persist();\n        closeModal();','        await persist();\n        wizard.complete();\n        closeModal();');
s=s.replace('      await persist();\n      closeModal();\n      location.hash = "/my";','      await persist();\n      wizard.complete();\n      closeModal();\n      location.hash = "/my";');
s=s.replace('        toast(edit ? "신고를 수정했어요." : "신고가 등록됐어요. 이제 이웃에게 알려주세요.");','        toast(edit ? "신고를 수정했어요." : "신고가 등록됐어요. 이제 이웃에게 알려주세요.");');
// Restore report coordinates and direction before creating the map.
s=s.replace('function sightingForm(dogId) {','function sightingForm(dogId) {\n  const draftKey=`sighting-${dogId||"new"}`,draft=loadDraft(draftKey);');
s=s.replace('let coords = dog?.coords || COORDS.서울,\n    heading = null,\n    picked = false,','let coords = draft?.extra?.coords || dog?.coords || COORDS.서울,\n    heading = draft?.extra?.heading ?? null,\n    picked = draft?.extra?.picked || false,');
idx=s.indexOf(marker,s.indexOf('function sightingForm'));
s=s.slice(0,idx)+`  const wizard=enhanceWizard(form,{key:draftKey,kind:'sighting',extra:()=>({coords,picked,heading}),validate:step=>{if(step===0&&!picked)throw new Error('지도에서 목격 위치를 선택해주세요.');},onStep:()=>window.dispatchEvent(new Event('resize'))});
  if(heading!==null){document.querySelector('#direction-controls').hidden=false;setHeading(heading);}
  picker.set(coords,heading);
  const cleanup=modalCleanup;modalCleanup=()=>{wizard.dispose();cleanup();};
`+s.slice(idx);
const sfStart=s.indexOf('function sightingForm'),sfEnd=s.indexOf('function reportDetail',sfStart);let sf=s.slice(sfStart,sfEnd);sf=sf.replace('      await persist();\n      closeModal();','      await persist();\n      wizard.complete();\n      closeModal();');s=s.slice(0,sfStart)+sf+s.slice(sfEnd);
s=s.replace('    toast("제보 상태를 변경했어요.");','    reportDetail(r.id);\n    toast("제보 상태를 변경했어요.");');
s=s.replace('  app.innerHTML =','  app.innerHTML =');
s=s.replace('  refreshIcons();\n  initExploreMap();\n  const el','  refreshIcons();\n  decorateSession();\n  initExploreMap();\n  const el');
s=s.replace('  if (a === "close" || a === "close-link")','  if(a === "account") accountForm();\n  else if(a === "logout"){await authenticate("logout");render();toast("로그아웃했어요.");}\n  else if(a === "push"){try{await enablePush();toast("브라우저 알림을 켰어요.");}catch(err){toast(err.message);}}\n  else if(a === "refresh"){await refresh();render();}\n  else if (a === "close" || a === "close-link")');
// The main initial render stays immediate; server state replaces sample content once loaded.
s += `\nwindow.addEventListener('store-updated',()=>{if(!modalRoot.children.length)render();});
window.addEventListener('remote-change',()=>{if(modalRoot.children.length)pendingRefresh=true;else refresh();});
window.addEventListener('connection-change',()=>decorateSession());
window.addEventListener('unhandledrejection',e=>{e.preventDefault();toast(e.reason?.message||'처리하지 못했어요. 다시 시도해주세요.');});
window.addEventListener('online',()=>refresh());
initialize();\n`;
fs.writeFileSync('src/main.js',s);
let server=fs.readFileSync('server/app.js','utf8');server=server.replace("const old=get(c,v.id);if(old&&old.demo)","const old=get(c,v.id);if(old)for(const [key,value] of Object.entries(old))if(!(key in v))v[key]=value;if(old&&old.demo)");fs.writeFileSync('server/app.js',server);
