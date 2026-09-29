import { useEffect, useState } from "react";
import { api, initialize } from "../client-store.js";
import { Button, ButtonLink, EmptyState } from "../ui/index.tsx";
import s from "./sheets/sheets.module.css";
import type { FormEvent, InputHTMLAttributes } from "react";
import { errorText } from "../errors.ts";
type Kind = "verify" | "reset" | "forgot";
type Field = "email" | "password" | "confirm";
const PAGES: Record<Kind, [string, string, string]> = {
  verify: ["이메일 주소 확인", "아래 버튼을 누르면 이메일 인증이 끝나요.", "이메일 인증 완료하기"],
  reset: ["새 비밀번호 만들기", "다른 서비스에서 쓰지 않는 비밀번호로 정해주세요.", "새 비밀번호 저장하기"],
  forgot: ["비밀번호를 잊으셨나요?", "가입한 이메일로 재설정 링크를 보내드려요.", "재설정 링크 받기"],
};
// 메일 링크의 토큰은 처음 한 번 읽어 메모리에만 두고, 화면을 그린 뒤 주소에서 지운다.
export default function AccountPage({ kind, query }: { kind: string; query?: string }) {
  const [linkToken, setLinkToken] = useState(() => new URLSearchParams(query || "").get("token") || "");
  useEffect(() => {
    if (query) history.replaceState(null, "", `${location.pathname}${location.search}#/account/${kind}`);
  }, [query, kind]);
  const [values, setValues] = useState({ email: "", password: "", confirm: "" });
  const [status, setStatus] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const page = PAGES[kind as Kind];
  if (!page) return <EmptyState title="올바르지 않은 계정 링크예요" description="메일의 링크를 다시 열어주세요." />;
  const [title, intro, action] = page;
  const input = (label: string, name: Field, type: string, extra: InputHTMLAttributes<HTMLInputElement>) => (
    <label className={s.field}>
      <span className={s.label}>{label}</span>
      <input className={s.input} name={name} type={type} value={values[name]} required
        onChange={(e) => setValues((v) => ({ ...v, [name]: e.target.value }))} {...extra} />
    </label>
  );
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (kind === "reset" && values.password !== values.confirm) return setStatus("두 비밀번호가 달라요. 다시 확인해주세요.");
    setBusy(true);
    try {
      const result = await api<{ message: string }>(`/api/auth/${kind}`, kind === "forgot" ? { email: values.email } : { token: linkToken, password: values.password });
      if (kind === "forgot") setStatus(result.message);
      else {
        setLinkToken("");
        setDone(true);
        // 인증은 링크를 연 이 기기를 바로 로그인시킨다. 비밀번호 재설정은 모든 기기에서 다시 로그인해야 한다.
        setStatus(kind === "verify" ? "이메일 인증이 완료됐어요. 바로 시작할 수 있어요." : "비밀번호를 바꿨어요. 새 비밀번호로 로그인해주세요.");
        await initialize();
      }
    } catch (err) {
      setStatus(errorText(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className={s.page}>
      <img src="/assets/mascot-home.webp" alt="" />
      <h1>{title}</h1>
      <p className={s.intro}>{intro}</p>
      {done ? (
        <>
          <p className={`${s.status} recovery-status`} role="status">{status}</p>
          {kind === "verify" ? (
            <ButtonLink href="#/my" size="lg" full>마이홈으로</ButtonLink>
          ) : (
            <Button size="lg" full data-action="account">로그인하기</Button>
          )}
        </>
      ) : (
        <form id="recovery-form" className={s.form} onSubmit={submit} noValidate>
          {kind === "forgot" && input("이메일", "email", "email", { maxLength: 200, autoComplete: "email", inputMode: "email" })}
          {kind === "reset" && input("새 비밀번호", "password", "password", { minLength: 10, maxLength: 200, autoComplete: "new-password" })}
          {kind === "reset" && input("새 비밀번호 확인", "confirm", "password", { minLength: 10, maxLength: 200, autoComplete: "new-password" })}
          <p className={`${s.status} recovery-status`} role="status" aria-live="polite">{status}</p>
          <Button type="submit" size="lg" full disabled={busy}>{action}</Button>
        </form>
      )}
      <a className={s.link} href="#/my">마이홈으로 돌아가기</a>
    </section>
  );
}
