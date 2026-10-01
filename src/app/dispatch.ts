// 버튼의 data-action(과 data-id·data-profile)을 한 곳에서 처리한다. 화면은 속성만 붙이면 된다.
import { read, api, enablePush, refresh } from "../client-store.js";
import { commit } from "./actions.ts";
import { openSheet } from "./sheets.ts";
import { nativeShare } from "../share.ts";
import { toast } from "./toast.ts";
import { errorText } from "../errors.ts";
import { takeInstallPrompt, isStandalone } from "./install.ts";

// 예시 신고에는 실제 제보·공유·저장을 막는다.
const PREVIEW_BLOCKED = new Set(["sighting", "save", "share", "poster", "flag", "update", "reunite"]);

async function run(action: string, button: HTMLElement) {
  const id = button.dataset.id ?? "";
  if (id && read().dogs.find((d) => d.id === id)?.previewOnly && PREVIEW_BLOCKED.has(action)) {
    toast("화면 안내용 예시예요. 실제 제보나 공유 대상이 아니에요.");
    return;
  }
  switch (action) {
    case "account":
      // 로그인한 사람의 계정 메뉴는 설정 화면이 맡는다.
      if (read().user?.registered) location.hash = "/my/settings";
      else openSheet("auth");
      return;
    case "report":
      location.hash = button.dataset.profile ? `/report/from/${button.dataset.profile}` : "/report/new";
      return;
    case "edit-dog":
      location.hash = `/report/edit/${id}`;
      return;
    case "profile":
      location.hash = "/profile/new";
      return;
    case "sighting":
      location.hash = id ? `/sighting/new/${id}` : "/sighting/new";
      return;
    case "report-detail":
      window.dispatchEvent(new CustomEvent("open-report", { detail: id }));
      return;
    case "save": {
      const saved = read().saved;
      const i = saved.indexOf(id);
      if (i >= 0) saved.splice(i, 1);
      else saved.push(id);
      await commit();
      toast(i >= 0 ? "저장을 취소했어요." : "소식을 저장했어요. 마이홈에서 다시 볼 수 있어요.");
      return;
    }
    case "logout":
      // 바로 나가지 않고 확인 시트에서 한 번 더 묻는다.
      openSheet("logout");
      return;
    case "push":
      await enablePush();
      toast("새 목격 소식 알림을 켰어요.");
      return;
    case "push-test":
      await api("/api/push/test", {});
      toast("테스트 알림을 요청했어요. 잠시 뒤 도착하는지 확인해주세요.");
      return;
    case "verify-resend":
      await api("/api/auth/resend", {});
      toast("인증 메일을 보냈어요. 스팸함도 확인해주세요.");
      return;
    case "refresh":
      await refresh({ force: true });
      return;
    case "install-app": {
      if (isStandalone()) return toast("이미 웹앱으로 쓰고 있어요.");
      const prompt = takeInstallPrompt();
      if (prompt) {
        await prompt.prompt();
        await prompt.userChoice;
        return;
      }
      openSheet("info", { kind: "install" });
      return;
    }
    case "areas":
    case "notifications":
    case "story":
    case "device-check":
    case "delete-account":
      openSheet(action === "device-check" ? "device" : action === "delete-account" ? "deleteAccount" : action);
      return;
    case "share": {
      const dog = read().dogs.find((d) => d.id === id);
      if (dog && (await nativeShare(dog))) return;
      openSheet("share", { dogId: id });
      return;
    }
    case "poster":
    case "update":
    case "reunite":
    case "flag":
      openSheet(action, { dogId: id });
      return;
    case "about":
    case "privacy":
    case "public-data":
      openSheet("info", { kind: action });
      return;
  }
}
export function installActions() {
  document.addEventListener("click", (e) => {
    const button = (e.target as Element | null)?.closest<HTMLElement>("[data-action]");
    if (!button?.dataset.action) return;
    const disable = button instanceof HTMLButtonElement;
    if (disable) button.disabled = true;
    run(button.dataset.action, button)
      .catch((err) => toast(errorText(err)))
      .finally(() => {
        if (disable) button.disabled = false;
      });
  });
}
