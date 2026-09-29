// 이 휴대폰에서 기능 확인 · 계정 삭제 · 신고 등록 완료 안내.
import { useState } from "react";
import type { FormEvent } from "react";
import BottomSheet from "../../ui/BottomSheet.tsx";
import { Button } from "../../ui/index.tsx";
import { useStore } from "../../app/useStore.ts";
import { toast } from "../../app/toast.ts";
import { isStandalone } from "../../app/install.ts";
import { api, initialize } from "../../client-store.js";
import { clearAllDrafts } from "../../drafts.ts";
import { errorText } from "../../errors.ts";
import s from "./sheets.module.css";
const PERMISSION: Record<NotificationPermission, string> = { granted: "허용됨", denied: "차단됨", default: "아직 요청하지 않음" };
export function DeviceSheet({ onClose }: { onClose: () => void }) {
  const [gps, setGps] = useState("");
  const checkGps = () => {
    if (!navigator.geolocation || !isSecureContext) return setGps("HTTPS 연결과 위치 기능이 필요해요.");
    setGps("위치를 확인하고 있어요…");
    navigator.geolocation.getCurrentPosition(
      (p) => setGps(`위치를 확인했어요. 기기가 알려준 오차는 약 ${Math.round(p.coords.accuracy)}m예요.`),
      (e) => setGps(e.code === 1 ? "위치 권한이 꺼져 있어요. 브라우저 설정에서 허용해주세요." : "위치를 확인하지 못했어요. 밖에서 다시 해보세요."),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  };
  const rows: [string, string][] = [
    ["안전한 연결", isSecureContext ? "사용 가능" : "HTTPS 주소로 들어와주세요"],
    ["웹앱 실행", isStandalone() ? "홈 화면에서 실행 중" : "브라우저에서 이용 중"],
    ["알림 권한", "Notification" in window ? PERMISSION[Notification.permission] : "홈 화면에 추가한 뒤 확인해주세요"],
  ];
  return (
    <BottomSheet open title="이 휴대폰에서 기능 확인" onClose={onClose}>
      <div className={s.body}>
        <dl className={s.facts}>
          {rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
        </dl>
        <Button variant="weak" full onClick={checkGps}>현재 위치 확인</Button>
        <p id="gps-status" className={s.intro} role="status">{gps}</p>
        <p className={s.intro}>현재 위치는 이 화면에서만 확인하고 저장하지 않아요. 나침반은 목격 제보의 방향 단계에서 현장 방향과 비교해보세요.</p>
        <Button size="lg" full data-action="push">새 목격 소식 알림 받기</Button>
        <Button variant="weak" full data-action="push-test">테스트 알림 받기</Button>
      </div>
    </BottomSheet>
  );
}
export function DeleteAccountSheet({ onClose }: { onClose: () => void }) {
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/api/auth/delete", { password });
      clearAllDrafts();
      onClose();
      location.hash = "/";
      await initialize();
      toast("계정과 등록한 기록을 삭제했어요.");
    } catch (err) {
      setStatus(errorText(err));
      setBusy(false);
    }
  };
  return (
    <BottomSheet open title="계정 삭제" onClose={onClose}>
      <form id="delete-account-form" className={`${s.body} ${s.form}`} onSubmit={submit} noValidate>
        <p className={s.intro}>계정과 직접 등록한 신고·사진·제보·이야기가 모두 지워지고 되돌릴 수 없어요.</p>
        <label className={s.field}>
          <span className={s.label}>현재 비밀번호</span>
          <input className={s.input} type="password" name="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {status && <p className={s.error} role="alert">{status}</p>}
        <Button type="submit" size="lg" full disabled={busy || !password}>계정과 내 기록 삭제하기</Button>
      </form>
    </BottomSheet>
  );
}
// 신고를 등록한 직후: 공유를 가장 먼저 권하고(코랄 하나), 전단·알림은 연한 버튼으로.
export function SuccessSheet({ dogId, onClose }: { dogId: string; onClose: () => void }) {
  const dog = useStore().dogs.find((d) => d.id === dogId);
  if (!dog) return null;
  return (
    <BottomSheet open title="이웃과 함께 찾을 준비가 됐어요" onClose={onClose}>
      <div className={`${s.body} success-next`}>
        <div className={s.center}>
          <img src="/assets/mascot-alert.webp" alt="" />
          <h3>{dog.name}의 소식을 알려주세요</h3>
          <p className={s.intro}>공유한 링크 하나가 목격 제보로 이어질 수 있어요.</p>
        </div>
        <Button size="lg" full data-action="share" data-id={dogId}>신고 링크 공유하기</Button>
        <Button variant="weak" full data-action="poster" data-id={dogId}>QR 전단 만들기</Button>
        <Button variant="weak" full data-action="push">새 목격 제보 알림 받기</Button>
        <p className={s.intro}>{dog.name} 목격 제보가 오면 바로 알려드려요. 나중에 설정에서 켜도 돼요.</p>
        <button type="button" className={s.link} onClick={onClose}>신고 내용 먼저 확인하기</button>
      </div>
    </BottomSheet>
  );
}
