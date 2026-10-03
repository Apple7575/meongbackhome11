import { useSyncExternalStore } from "react";
import type { Connection } from "../types.ts";
import s from "./Frame.module.css";
const MESSAGES: Partial<Record<Connection, [string, string?]>> = {
  unconfigured: ["서비스 저장소를 준비하고 있어요. 지금은 예시만 볼 수 있고, 가입·신고·제보 저장은 아직 쓸 수 없어요.", "다시 확인"],
  offline: ["서버에 연결하지 못했어요. 작성 중인 내용은 이 기기에 보관해요.", "다시 연결"],
  reconnecting: ["연결을 다시 확인하고 있어요. 잠시만 기다려주세요."],
};
// 서버 요청이 실패해야 바뀌는 연결 상태와 달리, 휴대폰이 인터넷에서 끊기면 바로 알린다.
// 다시 연결되면 boot.ts의 online 처리가 새로 불러온다.
const subscribe = (notify: () => void) => {
  addEventListener("online", notify);
  addEventListener("offline", notify);
  return () => {
    removeEventListener("online", notify);
    removeEventListener("offline", notify);
  };
};
const useOnline = () => useSyncExternalStore(subscribe, () => navigator.onLine);
// 연결이 정상이거나 처음 불러오는 중이면 숨긴다. id는 테스트와 이전 구조를 위해 유지.
export default function ConnectionBanner({ connection }: { connection: Connection }) {
  const online = useOnline();
  const message: [string, string?] | undefined = online ? MESSAGES[connection] : ["인터넷 연결이 끊겼어요. 다시 연결되면 자동으로 이어져요."];
  return (
    <div id="connection-banner" className={s.banner} hidden={!message} role={message ? "status" : undefined}>
      {message?.[0]}
      {message?.[1] && (
        <button type="button" className={s.bannerButton} data-action="refresh">{message[1]}</button>
      )}
    </div>
  );
}
