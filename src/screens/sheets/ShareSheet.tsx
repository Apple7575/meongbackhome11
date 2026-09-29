import BottomSheet from "../../ui/BottomSheet.tsx";
import { Button } from "../../ui/index.tsx";
import Icon from "../../ui/Icon.tsx";
import { useStore } from "../../app/useStore.ts";
import { toast } from "../../app/toast.ts";
import { openSheet } from "../../app/sheets.ts";
import s from "./sheets.module.css";
export default function ShareSheet({ dogId, onClose }: { dogId: string; onClose: () => void }) {
  const dog = useStore().dogs.find((d) => d.id === dogId);
  if (!dog) return null;
  const url = `${location.origin}${location.pathname}#/dog/${dogId}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast("링크를 복사했어요.");
    } catch {
      document.querySelector<HTMLInputElement>("#share-url")?.select();
      toast("링크를 선택했어요. 직접 복사해주세요.");
    }
  };
  const share = async () => {
    if (!navigator.share) return toast("이 브라우저에서는 링크 복사를 이용해주세요.");
    try {
      await navigator.share({ title: `${dog.name}의 가족을 찾아주세요 · 멍백홈`, text: dog.location, url });
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) toast("공유 메뉴를 열지 못했어요. 링크를 복사해주세요.");
    }
  };
  return (
    <BottomSheet open title="소식을 함께 나눠주세요" onClose={onClose}>
      <div className={s.body}>
        <p className={s.intro}>{dog.name}의 소식이 더 많은 이웃에게 닿을 수 있게요. 받은 사람은 가입 없이 보고 제보할 수 있어요.</p>
        <label className={s.field}>
          <span className={s.label}>신고 링크</span>
          <input id="share-url" className={s.input} readOnly value={url} />
        </label>
        <Button size="lg" full onClick={copy}><Icon name="Copy" size={20} />링크 복사</Button>
        <div className={s.pair}>
          <Button variant="weak" onClick={share}><Icon name="Share2" size={20} />공유 메뉴</Button>
          <Button variant="weak" onClick={() => { onClose(); openSheet("poster", { dogId }); }}><Icon name="QrCode" size={20} />QR 전단</Button>
        </div>
      </div>
    </BottomSheet>
  );
}
