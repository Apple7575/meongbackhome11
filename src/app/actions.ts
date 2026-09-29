import { save } from "../client-store.js";
// save()는 저장 후 화면 갱신 신호를 보내지 않으므로, React 화면에서 저장할 때는 이 함수를 쓴다.
export async function commit() {
  document.body.classList.add("is-saving");
  try {
    await save();
  } finally {
    document.body.classList.remove("is-saving");
    window.dispatchEvent(new Event("store-updated"));
  }
}
