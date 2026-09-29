import type { Connection } from "../types.ts";
import s from "./Frame.module.css";
const MESSAGES: Partial<Record<Connection, [string, string?]>> = {
  unconfigured: ["서비스 저장소를 준비하고 있어요. 지금은 예시만 볼 수 있고, 가입·신고·제보 저장은 아직 쓸 수 없어요.", "다시 확인"],
  offline: ["서버에 연결하지 못했어요. 작성 중인 내용은 이 기기에 보관해요.", "다시 연결"],
  reconnecting: ["연결을 다시 확인하고 있어요. 잠시만 기다려주세요."],
};
// 연결이 정상이거나 처음 불러오는 중이면 숨긴다. id는 테스트와 이전 구조를 위해 유지.
export default function ConnectionBanner({ connection }: { connection: Connection }) {
  const message = MESSAGES[connection];
  return (
    <div id="connection-banner" className={s.banner} hidden={!message} role={message ? "status" : undefined}>
      {message?.[0]}
      {message?.[1] && (
        <button type="button" className={s.bannerButton} data-action="refresh">{message[1]}</button>
      )}
    </div>
  );
}
