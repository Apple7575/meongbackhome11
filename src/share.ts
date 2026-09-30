// 공유용 주소. /d/:id 는 서버가 사진·이름이 담긴 미리보기 카드를 보여주고 상세 화면으로 옮겨 준다.
export const shareUrl = (dogId: string) => `${location.origin}/d/${encodeURIComponent(dogId)}`;
