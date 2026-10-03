import { useEffect, useState } from "react";
import { providers } from "../../app/providers.ts";
import BottomSheet from "../../ui/BottomSheet.tsx";
import { Button } from "../../ui/index.tsx";
import { authenticate } from "../../client-store.js";
import { toast } from "../../app/toast.ts";
import s from "./sheets.module.css";
import type { FormEvent, InputHTMLAttributes } from "react";
import { errorText } from "../../errors.ts";
type Field = "name" | "email" | "password" | "passwordConfirm";
// 로그인·회원가입. after가 있으면 로그인 뒤 이어서 할 일(예: 작성한 신고 등록)을 실행한다.
// 테스트가 쓰는 id·class(account-form, auth-intro, data-auth-mode)는 옛 팝업과 같게 둔다.
export default function AuthSheet({ after, onClose }: { after?: () => void; onClose: () => void }) {
  // 카카오 로그인은 서버에 키가 있을 때만 보여준다.
  const [kakao, setKakao] = useState(false);
  useEffect(() => {
    providers().then((p) => setKakao(!!p.kakao));
  }, []);
  const [mode, setMode] = useState("login");
  const [values, setValues] = useState({ name: "", email: "", password: "", passwordConfirm: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [invalid, setInvalid] = useState<Partial<Record<Field, string>>>({});
  const register = mode === "register";
  const field = (label: string, name: Field, type: string, extra: InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className={s.field}>
      <span className={s.label}>{label}</span>
      <input className={s.input} name={name} type={type} value={values[name]} required
        aria-invalid={invalid[name] ? true : undefined} aria-describedby={invalid[name] ? `${name}-error` : undefined}
        onChange={(e) => { setValues((v) => ({ ...v, [name]: e.target.value })); setInvalid((m) => ({ ...m, [name]: undefined })); }} {...extra} />
      {invalid[name] && <span id={`${name}-error`} className={s.fieldError}>{invalid[name]}</span>}
    </label>
  );
  // 서버는 어느 칸이 틀렸는지 알려주지 않으므로, 보내기 전에 칸마다 무엇을 고칠지 바로 옆에 알려준다.
  const check = () => {
    const m: Partial<Record<Field, string>> = {};
    if (register && !values.name.trim()) m.name = "닉네임을 적어주세요.";
    if (!values.email.trim()) m.email = "이메일을 적어주세요.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) m.email = "이메일 주소 형식을 확인해주세요. 예: bori@example.com";
    if (!values.password) m.password = "비밀번호를 적어주세요.";
    else if (register && values.password.length < 10) m.password = "비밀번호는 10자 이상이어야 해요.";
    if (register && values.password && values.password !== values.passwordConfirm) m.passwordConfirm = "비밀번호가 서로 달라요. 다시 확인해주세요.";
    return m;
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const problems = check();
    setInvalid(problems);
    const first = (Object.keys(problems) as Field[])[0];
    if (first) {
      setError("");
      (e.currentTarget as HTMLFormElement).querySelector<HTMLInputElement>(`input[name=${first}]`)?.focus();
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { passwordConfirm, ...rest } = values;
      const result = await authenticate(mode, register ? { ...rest, passwordConfirm } : { email: rest.email, password: rest.password });
      onClose();
      // 인증·비밀번호 화면에서 로그인했다면 그 화면에 머물 이유가 없으니 마이홈으로 보낸다.
      if (location.hash.startsWith("#/account/")) location.hash = "/my";
      if (after) {
        after();
        if (result.emailDelivery === "sent") toast("받은 메일에서 이메일을 인증하면 작성한 신고를 바로 등록할 수 있어요.");
      } else toast(result.emailDelivery === "sent" ? "가입했어요. 받은 메일에서 이메일을 인증해주세요." : register ? "가입했어요." : "로그인했어요.");
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <BottomSheet open title={register ? "회원가입" : "로그인"} onClose={onClose}>
      <div className={s.body}>
        <div className="auth-intro">
          {/* 신고를 다 쓰고 등록하려는 순간: 쓴 내용이 남아 있고, 카카오는 메일 인증 없이 바로 이어진다는 걸 먼저 말한다. */}
          <p className={s.intro}>{!after ? "로그인하면 내 신고와 제보를 한곳에서 볼 수 있어요."
            : kakao ? "작성한 신고는 이 기기에 저장돼 있어요. 카카오로 시작하면 메일 인증 없이 바로 등록돼요."
            : "작성한 신고는 이 기기에 저장돼 있어요. 로그인하면 이어서 등록하고, 처음이면 가입 후 메일 인증을 마치면 돼요."}</p>
        </div>
        {kakao && (
          <>
            <a className={s.kakao} href={`/api/auth/kakao?next=${encodeURIComponent(location.hash.slice(1) || "/my")}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="#000" d="M12 3C6.5 3 2 6.6 2 11c0 2.8 1.8 5.3 4.6 6.7l-1 3.6c-.1.3.3.6.6.4l4.3-2.8c.5.1 1 .1 1.5.1 5.5 0 10-3.6 10-8S17.5 3 12 3z"/></svg>
              카카오로 3초 만에 시작하기
            </a>
            <p className={s.consent}>카카오로 시작하면 <a href="#/privacy" onClick={onClose}>개인정보처리방침</a>에 동의하는 것으로 봐요.</p>
            <p className={s.or}>또는 이메일로</p>
          </>
        )}
        <div className={s.tabs} role="group" aria-label="로그인 또는 회원가입">
          {[["login", "로그인"], ["register", "회원가입"]].map(([m, label]) => (
            <button key={m} type="button" className={s.tab} data-auth-mode={m} aria-pressed={mode === m} onClick={() => { setMode(m); setError(""); setInvalid({}); }}>{label}</button>
          ))}
        </div>
        <form id="account-form" className={s.form} onSubmit={submit} noValidate>
          {register && field("닉네임", "name", "text", { maxLength: 30, autoComplete: "nickname", placeholder: "예: 보리 보호자" })}
          {field("이메일", "email", "email", { autoComplete: "email", inputMode: "email", placeholder: "이메일 주소" })}
          {field(register ? "비밀번호 (10자 이상)" : "비밀번호", "password", "password", { minLength: 10, maxLength: 200, autoComplete: register ? "new-password" : "current-password", placeholder: "비밀번호" })}
          {register && field("비밀번호 확인", "passwordConfirm", "password", { minLength: 10, maxLength: 200, autoComplete: "new-password", placeholder: "비밀번호 다시 입력" })}
          {error && <p className={`${s.error} form-error`} role="alert">{error}</p>}
          <Button type="submit" size="lg" full disabled={busy}>{busy ? (register ? "가입하고 있어요…" : "로그인하고 있어요…") : register ? "회원가입" : "로그인"}</Button>
                  {register && <p className={s.consent}>가입하면 <a href="#/privacy" onClick={onClose}>개인정보처리방침</a>에 동의하는 것으로 봐요.</p>}
        </form>
        {!register && <a className={s.link} href="#/account/forgot">비밀번호를 잊으셨나요?</a>}
      </div>
    </BottomSheet>
  );
}
