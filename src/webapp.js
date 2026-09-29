export function setupWebApp({openModal,toast}) {
  let installPrompt;
  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;});
  if(isSecureContext&&'serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(()=>{});
  document.addEventListener('click',async event=>{
    const action=event.target.closest('[data-action]')?.dataset.action;
    if(action==='install-app') {
      if(matchMedia('(display-mode: standalone)').matches||navigator.standalone){toast('이미 웹앱으로 사용하고 있어요.');return;}
      if(installPrompt){await installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;return;}
      openModal('홈 화면에서 바로 만나세요','<div class="info-content"><img src="/assets/mascot-home.webp" alt=""/><p>아이폰에서는 Safari의 공유 메뉴에서 <strong>홈 화면에 추가</strong>를 선택해주세요.</p><p>안드로이드에서는 브라우저 메뉴의 <strong>앱 설치</strong> 또는 <strong>홈 화면에 추가</strong>를 선택해주세요.</p><p>설치 없이도 신고·목격 제보·대화를 사용할 수 있어요.</p></div>');
    }
    if(action==='device-check') {
      openModal('이 휴대폰에서 확인하기',`<div class="device-check"><p>현재 위치는 이 화면에서만 확인하고 저장하지 않아요.</p><dl><dt>안전한 연결</dt><dd>${isSecureContext?'사용 가능':'HTTPS 주소로 접속해주세요'}</dd><dt>웹앱 실행</dt><dd>${matchMedia('(display-mode: standalone)').matches||navigator.standalone?'홈 화면에서 실행 중':'브라우저에서 이용 중'}</dd><dt>알림 권한</dt><dd>${'Notification' in window?({'granted':'허용됨','denied':'차단됨','default':'아직 요청하지 않음'}[Notification.permission]):'홈 화면에 추가한 뒤 확인해주세요'}</dd></dl><button class="button white full" id="check-gps">현재 위치 확인</button><p id="gps-status" role="status"></p><p>나침반은 목격 제보에서 휴대폰 방향을 가져온 뒤 현장의 실제 방향과 비교해주세요.</p><button class="button primary full" data-action="push">알림 권한 설정</button><button class="button white full" data-action="push-test">테스트 알림 받기</button><button class="text-button" data-action="install-app">홈 화면에 추가하기</button></div>`);
      document.querySelector('#check-gps').onclick=()=>{
        const status=document.querySelector('#gps-status');
        if(!navigator.geolocation||!isSecureContext){status.textContent='HTTPS 연결과 위치 기능이 필요해요.';return;}
        status.textContent='위치를 확인하고 있어요…';
        navigator.geolocation.getCurrentPosition(position=>{status.textContent=`위치를 확인했어요. 기기에서 보고한 오차 범위는 약 ${Math.round(position.coords.accuracy)}m예요.`;},error=>{status.textContent=error.code===1?'위치 권한이 꺼져 있어요. 브라우저 설정에서 허용해주세요.':'위치를 확인하지 못했어요. 야외에서 다시 시도해주세요.';},{enableHighAccuracy:true,timeout:12000,maximumAge:0});
      };
    }
  });
  const viewport=window.visualViewport;
  const resize=()=>document.documentElement.style.setProperty('--visible-height',`${viewport?.height||innerHeight}px`);
  viewport?.addEventListener('resize',resize);resize();
}
