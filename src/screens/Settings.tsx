import { useStore } from "../app/useStore.ts";
import { useState } from "react";
import { OptionSheet } from "./shared.tsx";
import { THEMES, getTheme, setTheme } from "../app/theme.ts";
import type { Theme } from "../app/theme.ts";
import { Top, ListHeader, ListRow, Divider, IconCircle, Badge } from "../ui/index.tsx";
import s from "./screens.module.css";
export default function Settings() {
  const [theme, setThemeState] = useState<Theme>(getTheme());
  const [sheet, setSheet] = useState(false);
  const pick = (value: string) => { setTheme(value as Theme); setThemeState(value as Theme); };
  const db = useStore();
  const user = db.user;
  // 이 휴대폰에서 알림을 허용했는지(허용했으면 서버 구독도 함께 켜 둔다)
  const pushOn = typeof Notification !== "undefined" && Notification.permission === "granted";
  return (
    <div className={s.screen}>
      <Top title="설정" />
      <ListHeader title="알림" />
      <ListRow as="button" data-action="push" left={<IconCircle name="Bell" />} title="새 목격 소식 알림" description="내 신고에 제보가 오면 바로 알려드려요"
        right={<Badge tone={pushOn ? "coral" : "grey"}>{pushOn ? "켜짐" : "꺼짐"}</Badge>} />
      <ListRow as="button" data-action="areas" left={<IconCircle name="MapPin" />} title="관심 지역" description={db.areas.length ? db.areas.join(", ") : "새 실종 소식을 받을 동네를 골라요"} />
      <Divider />
      <ListHeader title="화면" />
      <ListRow as="button" left={<IconCircle name="Moon" />} title="화면 테마" description={THEMES.find(([v]) => v === theme)?.[1]} onClick={() => setSheet(true)} />
      <Divider />
      <ListHeader title="이 휴대폰" />
      <ListRow as="button" data-action="device-check" left={<IconCircle name="Smartphone" />} title="이 휴대폰에서 기능 확인" description="위치와 알림이 잘 되는지 확인해요" />
      <ListRow as="button" data-action="install-app" left={<IconCircle name="Download" />} title="홈 화면에 추가하기" description="앱처럼 바로 열 수 있어요" />
      <Divider />
      <ListHeader title="안내" />
      <ListRow as="button" data-action="about" left={<IconCircle name="Info" />} title="서비스 안내" />
      <ListRow as="button" data-action="privacy" left={<IconCircle name="ShieldCheck" />} title="개인정보 안내" />
      {user?.role === "admin" && <ListRow href="#/admin" left={<IconCircle name="Building2" />} title="운영 화면" />}
      {user?.registered && (
        <>
          <Divider />
          <ListRow as="button" data-action="logout" title="로그아웃" right={null} />
          <ListRow as="button" data-action="delete-account" title="계정 삭제" tone="muted" />
        </>
      )}
      <OptionSheet open={sheet} title="화면 테마" options={THEMES} value={theme} onSelect={pick} onClose={() => setSheet(false)} />
    </div>
  );
}
