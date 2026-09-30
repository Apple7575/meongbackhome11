import { useState } from "react";
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
  const [mode, setMode] = useState("login");
  const [values, setValues] = useState({ name: "", email: "", password: "", passwordConfirm: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const register = mode === "register";
  const field = (label: string, name: Field, type: string, extra: InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className={s.field}>
      <span className={s.label}>{label}</span>
      <input className={s.input} name={name} type={type} value={values[name]} required
        onChange={(e) => setValues((v) => ({ ...v, [name]: e.target.value }))} {...extra} />
    </label>
  );
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (register && values.password !== values.passwordConfirm) return setError("비밀번호가 서로 달라요. 다시 확인해주세요.");
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
          <p className={s.intro}>{after ? "작성한 신고는 이 기기에 저장돼 있어요. 로그인하면 이어서 등록하고, 처음이면 가입 후 메일 인증을 마치면 돼요." : "로그인하면 내 신고와 제보를 한곳에서 볼 수 있어요."}</p>
        </div>
        <div className={s.tabs} role="group" aria-label="로그인 또는 회원가입">
          {[["login", "로그인"], ["register", "회원가입"]].map(([m, label]) => (
            <button key={m} type="button" className={s.tab} data-auth-mode={m} aria-pressed={mode === m} onClick={() => { setMode(m); setError(""); }}>{label}</button>
          ))}
        </div>
        <form id="account-form" className={s.form} onSubmit={submit} noValidate>
          {register && field("닉네임", "name", "text", { maxLength: 30, autoComplete: "nickname", placeholder: "예: 보리 보호자" })}
          {field("이메일", "email", "email", { autoComplete: "email", inputMode: "email", placeholder: "이메일 주소" })}
          {field(register ? "비밀번호 (10자 이상)" : "비밀번호", "password", "password", { minLength: 10, maxLength: 200, autoComplete: register ? "new-password" : "current-password", placeholder: "비밀번호" })}
          {register && field("비밀번호 확인", "passwordConfirm", "password", { minLength: 10, maxLength: 200, autoComplete: "new-password", placeholder: "비밀번호 다시 입력" })}
          {error && <p className={`${s.error} form-error`} role="alert">{error}</p>}
          <Button type="submit" size="lg" full disabled={busy}>{busy ? (register ? "가입하고 있어요…" : "로그인하고 있어요…") : register ? "회원가입" : "로그인"}</Button>
        </form>
        {!register && <a className={s.link} href="#/account/forgot">비밀번호를 잊으셨나요?</a>}
      </div>
    </BottomSheet>
  );
}
