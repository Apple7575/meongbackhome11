import BottomSheet from "../../ui/BottomSheet.tsx";
import { ButtonLink } from "../../ui/index.tsx";
import s from "./sheets.module.css";
type Kind = "about" | "privacy" | "public-data" | "install";
const PAGES: Record<Kind, { title: string; image?: string; lines: string[]; link?: { href: string; label: string } }> = {
  about: {
    title: "멍백홈 안내",
    image: "/assets/mascot-reunion.webp",
    lines: [
      "멍백홈은 강아지를 잃어버린 보호자와 주변에서 강아지를 본 이웃을 이어주는 서비스예요.",
      "'예시' 표시가 있는 신고의 사진은 AI로 만들었고, 실제 실종 신고가 아니에요. 직접 등록한 신고와 제보는 서버에 저장돼 다른 기기에서도 볼 수 있어요.",
      "새 목격 소식 알림을 받으려면 설정에서 알림을 켜주세요. 아이폰은 홈 화면에 추가한 뒤에 받을 수 있어요.",
    ],
  },
  privacy: {
    title: "개인정보와 위치 안내",
    lines: [
      "등록한 신고·제보는 서버에 저장돼요. 작성 중인 내용은 이 기기에 7일 동안 보관되고, 등록하면 지워져요. 대화와 보호 중인 정확한 위치는 당사자만 볼 수 있어요.",
      "지도를 열면 OpenStreetMap에서 지도 이미지를 불러오고, 신고할 때 고른 핀 위치로 OpenStreetMap에서 주소를 찾아요. 현재 위치와 나침반은 버튼을 누르고 허용했을 때만 써요.",
      "여러 사람이 쓰는 기기에서는 쓰고 나서 로그아웃해주세요. 신고 설명과 사진에 전화번호·집 주소가 드러나지 않게 확인해주세요.",
    ],
  },
  "public-data": {
    title: "보호소 공고도 확인해 보세요",
    lines: [
      "보호소에 들어온 아이일 수도 있어요. 국가동물보호정보시스템(animal.go.kr)에서 보호 중인 동물 공고를 확인해 보세요.",
      "보호소 공고는 매일 새로 올라와요. 잃어버린 지역과 날짜로 찾아보세요.",
    ],
    link: { href: "https://www.animal.go.kr/front/awtis/protection/protectionList.do", label: "보호소 공고 보러 가기" },
  },
  install: {
    title: "홈 화면에 추가하기",
    image: "/assets/mascot-home.webp",
    lines: [
      "아이폰: Safari 아래쪽 공유 버튼을 누르고 '홈 화면에 추가'를 골라주세요.",
      "안드로이드: 브라우저 메뉴에서 '앱 설치' 또는 '홈 화면에 추가'를 골라주세요.",
      "추가하지 않아도 신고·목격 제보·대화를 모두 쓸 수 있어요.",
    ],
  },
};
export default function InfoSheet({ kind, onClose }: { kind: Kind; onClose: () => void }) {
  const page = PAGES[kind];
  return (
    <BottomSheet open title={page.title} onClose={onClose}>
      <div className={s.body}>
        {page.image && <img className={s.mascot} src={page.image} alt="" />}
        {page.lines.map((line) => <p key={line} className={s.paragraph}>{line}</p>)}
        {page.link && <ButtonLink href={page.link.href} target="_blank" rel="noopener noreferrer" size="lg" full>{page.link.label}</ButtonLink>}
      </div>
    </BottomSheet>
  );
}
