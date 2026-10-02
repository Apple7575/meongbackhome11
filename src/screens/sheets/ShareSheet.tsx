import BottomSheet from "../../ui/BottomSheet.tsx";
import { Button } from "../../ui/index.tsx";
import Icon from "../../ui/Icon.tsx";
import { useStore } from "../../app/useStore.ts";
import { toast } from "../../app/toast.ts";
import { openSheet } from "../../app/sheets.ts";
import { shareUrl, shareTitle } from "../../share.ts";
import { kakaoShareReady, shareToKakao } from "../../kakaoShare.ts";
import { useEffect, useState } from "react";
import { thumbSrc } from "../../thumb.ts";
import s from "./sheets.module.css";
export default function ShareSheet({ dogId, onClose }: { dogId: string; onClose: () => void }) {
  const dog = useStore().dogs.find((d) => d.id === dogId);
  const [kakao, setKakao] = useState(false);
  useEffect(() => {
    let alive = true;
    kakaoShareReady().then((ok) => { if (alive) setKakao(ok); });
    return () => { alive = false; };
  }, []);
  if (!dog) return null;
  const url = shareUrl(dogId);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast("링크를 복사했어요.");
    } catch {
      // 클립보드 권한이 없으면 숨겨 둔 입력칸으로 복사한다.
      const input = document.querySelector<HTMLInputElement>("#share-url");
      input?.select();
      toast(document.execCommand?.("copy") ? "링크를 복사했어요." : "링크를 복사하지 못했어요. 공유하기를 이용해주세요.");
    }
  };
  const share = async () => {
    if (!navigator.share) return toast("이 브라우저에서는 링크 복사를 이용해주세요.");
    try {
      await navigator.share({ title: `${shareTitle(dog)} · 멍백홈`, text: dog.location, url });
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) toast("공유 메뉴를 열지 못했어요. 링크를 복사해주세요.");
    }
  };
  return (
    <BottomSheet open title="소식을 함께 나눠주세요" onClose={onClose}>
      <div className={s.body}>
        <p className={s.intro}>받은 사람은 가입 없이 보고 바로 제보할 수 있어요.</p>
        <div className={s.preview}>
          <img src={thumbSrc(dog.image)} alt="" />
          <div>
            <strong>{shareTitle(dog)}</strong>
            <span>{[dog.breed, dog.location].filter(Boolean).join(" · ")}</span>
            <small>meongbackhome.com</small>
          </div>
        </div>
        <input id="share-url" className={s.srOnly} readOnly value={url} tabIndex={-1} aria-label="신고 링크" />
        {kakao && (
          <button type="button" className={s.kakao} onClick={async () => { if (!(await shareToKakao(dog))) toast("카카오톡을 열지 못했어요. 링크를 복사해 보내주세요."); }}>
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="#000" d="M12 3C6.5 3 2 6.6 2 11c0 2.8 1.8 5.3 4.6 6.7l-1 3.6c-.1.3.3.6.6.4l4.3-2.8c.5.1 1 .1 1.5.1 5.5 0 10-3.6 10-8S17.5 3 12 3z"/></svg>
            카카오톡으로 보내기
          </button>
        )}
        <Button size="lg" full variant={kakao ? "weak" : "fill"} onClick={copy}><Icon name="Copy" size={20} />링크 복사</Button>
        <div className={s.pair}>
          <Button variant="weak" onClick={share}><Icon name="Share2" size={20} />공유하기</Button>
          <Button variant="weak" onClick={() => { onClose(); openSheet("poster", { dogId }); }}><Icon name="QrCode" size={20} />QR 전단</Button>
        </div>
      </div>
    </BottomSheet>
  );
}
