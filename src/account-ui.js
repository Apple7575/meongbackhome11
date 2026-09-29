import {api,initialize,read} from './client-store.js';
import {escapeHTML as esc} from './domain.js';
let linkToken='';
export function accountPage(route) {
  const [path,query]=route.split('?');
  if(query) {
    linkToken=new URLSearchParams(query).get('token')||'';
    history.replaceState(null,'',`${location.pathname}${location.search}#${path}`);
  }
  const kind=path.split('/')[2];
  const titles={verify:'이메일 주소 확인',reset:'새 비밀번호 만들기',forgot:'비밀번호를 잊으셨나요?'};
  if(!titles[kind]) return '<p>올바르지 않은 계정 링크예요.</p>';
  return `<section class="account-page"><img src="/assets/mascot-home.webp" alt=""/><h1>${titles[kind]}</h1><p>${kind==='forgot'?'가입한 이메일로 재설정 링크를 보내드려요.':kind==='verify'?'아래 버튼을 누르면 이메일 인증이 완료돼요.':'다른 서비스에서 쓰지 않는 비밀번호를 설정해주세요.'}</p><form id="recovery-form" data-kind="${kind}">${kind==='forgot'?'<label>이메일<input type="email" name="email" required maxlength="200" autocomplete="email" inputmode="email"/></label>':kind==='reset'?'<label>새 비밀번호<input type="password" name="password" required minlength="10" maxlength="200" autocomplete="new-password"/></label><label>새 비밀번호 확인<input type="password" name="confirm" required minlength="10" maxlength="200" autocomplete="new-password"/></label>':''}<p class="recovery-status" role="status" aria-live="polite"></p><button class="button primary full" type="submit">${kind==='forgot'?'재설정 링크 받기':kind==='verify'?'이메일 인증 완료하기':'새 비밀번호 저장하기'}</button></form><a class="text-button" href="#/my">마이홈으로 돌아가기</a></section>`;
}
export function bindAccountPage() {
  const form=document.querySelector('#recovery-form');
  if(!form)return;
  form.onsubmit=async event=>{
    event.preventDefault();
    const values=Object.fromEntries(new FormData(form)),kind=form.dataset.kind;
    const status=form.querySelector('.recovery-status'),button=form.querySelector('button');
    if(kind==='reset'&&values.password!==values.confirm){status.textContent='두 비밀번호가 달라요. 다시 확인해주세요.';return;}
    button.disabled=true;
    try {
      const result=await api(`/api/auth/${kind}`,kind==='forgot'?{email:values.email}:{token:linkToken,password:values.password});
      if(kind==='forgot')status.textContent=result.message;
      else {
        linkToken='';
        form.innerHTML=`<p class="recovery-status" role="status">${kind==='verify'?'이메일 인증이 완료됐어요.':'비밀번호를 바꿨어요.'} 다시 로그인해주세요.</p><button type="button" class="button primary full" data-action="account">로그인하기</button>`;
        // Refresh session after the confirmation UI is stable, without destroying it.
        await initialize();
      }
    }catch(error){status.textContent=error.message;}
    finally{button.disabled=false;}
  };
}
export function verificationPanel() {
  const user=read().user;
  return `<div class="verification-panel"><strong>${user?.verified?'✓ 이메일 인증 완료':'이메일 주소를 확인해주세요'}</strong><p>${esc(user?.email||'')}</p>${user?.verified?'':`<p>인증 링크를 열고 다시 로그인하면 계정 확인이 완료돼요.</p><button class="button white full" data-action="verify-resend">인증 메일 다시 받기</button>`}<a class="text-button" href="#/account/forgot">비밀번호 재설정</a><button class="text-button" data-action="delete-account">계정 삭제</button></div>`;
}
