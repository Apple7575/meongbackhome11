import BottomSheet from "../../ui/BottomSheet.tsx";
import { ButtonLink } from "../../ui/index.tsx";
import Icon from "../../ui/Icon.tsx";
import { formatTime } from "../../format.ts";
import type { PublicDog } from "../../types.ts";
import s from "./sheets.module.css";
const day = (t?: string | null) => (t ? formatTime(t).replace(/ 오[전후].*$/, "") : "");
// 공공데이터 상세: 사진·발견 장소·공고 기간·특징, 보호소에 전화하기. 출처를 밝히고 원문 사이트로 연결한다.
export default function PublicDogSheet({ item, onClose }: { item: PublicDog; onClose: () => void }) {
  const shelter = item.source === "shelter";
  const rows: [string, string][] = ([
    [shelter ? "발견 장소" : "잃어버린 곳", [item.area, item.place].filter(Boolean).join(" · ")],
    [shelter ? "구조한 날" : "잃어버린 날", day(item.happenedAt)],
    ["공고 기간", shelter && item.noticeEnd ? `${day(item.noticeEnd)}까지` : ""],
    ["견종·색", [item.breed, item.color].filter(Boolean).join(" · ")],
    ["성별·나이", [item.sex, item.age, item.weight].filter(Boolean).join(" · ")],
    ["특징", item.mark],
    ["보호 중인 곳", item.care ? [item.care.name, item.care.addr].filter(Boolean).join(" · ") : ""],
    ["공고 번호", shelter ? item.noticeNo || "" : ""],
  ] as [string, string][]).filter(([, v]) => v);
  return (
    <BottomSheet open title={shelter ? "보호소에 들어온 아이" : "다른 곳에 신고된 실종견"} onClose={onClose}>
      <div className={s.body}>
        {item.photos.length > 0 && (
          <div className={s.publicPhotos}>
            {item.photos.map((src, i) => <img key={src} src={`${src}?w=640`} alt={`${item.breed} 사진 ${i + 1}`} loading={i ? "lazy" : "eager"} />)}
          </div>
        )}
        <dl className={s.facts}>
          {rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
        </dl>
        {shelter && item.care?.tel && (
          <ButtonLink href={`tel:${item.care.tel.replace(/[^\d+]/g, "")}`} size="lg" full><Icon name="Smartphone" size={20} />보호소에 전화하기</ButtonLink>
        )}
        {/* 보호동물 목록 주소는 그 사이트에 처음 들어가면 열리지 않아(쿠키 필요) 홈으로 보내고 공고 번호로 찾게 한다. */}
        <ButtonLink href={shelter ? "https://www.animal.go.kr/front/index.do" : "https://www.animal.go.kr/front/awtis/loss/lossList.do?menuNo=1000100000"}
          target="_blank" rel="noopener noreferrer" variant="weak" size="lg" full>국가동물보호정보시스템에서 보기</ButtonLink>
        <p className={s.intro}>출처: 국가동물보호정보시스템(농림축산검역본부). 매일 새로 받아와요.{shelter ? " 사이트에서는 '보호센터 보호동물'에서 공고 번호로 찾을 수 있어요." : " 신고한 분의 연락처는 원문에서 확인해주세요."}</p>
      </div>
    </BottomSheet>
  );
}
