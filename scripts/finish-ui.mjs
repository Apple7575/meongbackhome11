import fs from 'node:fs';
let s=fs.readFileSync('src/main.js','utf8');
s=s.replaceAll('.filter((d) => !d.demo)','.filter((d) => d.canManage)').replaceAll('.filter((d) => d.status === "missing")','.filter((d) => d.status === "missing" && d.canManage)');
// The above only matches the multiline report-link choices, not inline global counts.
s=s.replaceAll('예시 제보예요. 상태 변경과 대화를 체험할 수 있어요.','예시 제보예요. 실제 제보의 상태 변경은 해당 보호자만 할 수 있어요.');
s=s.replaceAll('LOCAL PREVIEW','운영 관리').replaceAll('운영 화면 미리보기','접수된 신고 관리').replaceAll('실제 운영자 인증과 서버 권한 제어는 아직 연결되지 않았어요.','접수 내용을 확인하고 처리 상태를 기록해주세요. 모든 관리 요청은 서버에서 권한을 확인해요.');
s=s.replaceAll('체험 버전에서는 운영 화면에 접수 내역만 저장돼요.','접수된 내용은 운영자에게 전달돼요. 확인할 수 있는 내용을 구체적으로 적어주세요.');
s=s.replaceAll('현재는 기능과 디자인을 확인하는 모바일 웹 체험 버전이에요. 예시 신고의 사진은 AI로 생성되었고, 실제 실종 신고가 아니에요.','예시 표시가 있는 신고의 사진은 AI로 생성되었고, 실제 실종 신고가 아니에요. 직접 등록한 신고와 제보는 서버에 저장되어 다른 기기에서도 확인할 수 있어요.');
s=s.replaceAll('계정·서버 저장·외부 알림·실시간 대화·공공 데이터는 아직 연결되지 않았어요.','계정, 신고, 당사자 대화와 실시간 알림함을 사용할 수 있어요. 브라우저 푸시는 HTTPS와 발신 설정이 필요하며, 공공 보호 정보는 아직 연동 전이에요.');
s=s.replaceAll('체험 버전 개인정보 안내','개인정보와 위치 안내').replaceAll('등록한 사진, 장소, 제보, 대화는 이 브라우저의 로컬 저장소에 보관돼요. 멍백홈 서버로 전송하지 않아요.','등록한 신고·제보는 서버에 저장돼요. 작성 중인 초안은 이 기기에 7일 동안 보관되며 등록을 완료하면 지워져요. 대화와 보호 중인 정확한 위치는 당사자만 볼 수 있어요.').replaceAll('공용 기기에서는 실제 개인정보를 입력하지 마세요. 브라우저의 사이트 데이터 삭제 기능으로 저장한 내용을 지울 수 있어요.','공용 기기에서는 이용 후 로그아웃해주세요. 신고 설명이나 공개 사진에는 전화번호와 집 주소가 드러나지 않도록 확인해주세요.');
const pos=s.indexOf('\n}\nfunction regionModal()',s.indexOf('function reportDetail'));
s=s.slice(0,pos)+`\n  document.querySelector('#report-status').disabled=!r.canManage;
  if(!r.canChat){const chat=document.querySelector('.chat-section');chat.innerHTML='<p class="message-restricted">보호자와 이 제보를 작성한 이웃만 대화할 수 있어요.</p>';}
  if(link&&!read().dogs.some(d=>d.canManage&&d.status==='missing'))link.closest('label').hidden=true;`+s.slice(pos);
s=s.replace('        render();\n        toast(edit ?','        render();\n        if(!edit)setTimeout(()=>registeredNext(entry.id),80);\n        toast(edit ?');
s+=`\nfunction registeredNext(dogId){const d=read().dogs.find(d=>d.id===dogId);if(!d)return;openModal('이웃과 함께 찾을 준비가 됐어요',\`<div class="success-next"><img src="/assets/mascot-alert.webp" alt=""/><h3>\${esc(d.name)}의 소식을 알려주세요</h3><p>공유한 링크 하나가<br>소중한 목격 제보로 이어질 수 있어요.</p><button class="button primary full" data-action="share" data-id="\${dogId}">신고 링크 공유하기 →</button><button class="button white full" data-action="poster" data-id="\${dogId}">QR 전단 만들기</button><button class="text-button" data-action="close">신고 내용 먼저 확인하기</button></div>\`);}\n`;
fs.writeFileSync('src/main.js',s);
let seeds=fs.readFileSync('src/seed.js','utf8').replaceAll('.png','.webp');fs.writeFileSync('src/seed.js',seeds);
