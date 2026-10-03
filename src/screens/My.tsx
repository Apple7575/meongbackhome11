import { Fragment } from "react";
import { useStore } from "../app/useStore.ts";
import { Top, ListHeader, ListRow, Button, ButtonLink, Badge, Divider, Thumb, IconCircle, EmptyState } from "../ui/index.tsx";
import { DogBadge, DogRow } from "./shared.tsx";
import s from "./screens.module.css";
export default function My() {
  const db = useStore();
  const user = db.user;
  if (!user?.registered)
    return (
      <div className={s.screen}>
        <Top title="마이홈" />
        <EmptyState
          image="/assets/mascot-home.webp"
          title="로그인하면 내 신고와 제보를 한곳에서 볼 수 있어요"
          description="둘러보기와 목격 제보는 로그인 없이 할 수 있어요"
          action={<Button data-action="account">로그인</Button>}
        />
      </div>
    );
  const mine = db.dogs.filter((d) => d.canManage);
  const saved = db.dogs.filter((d) => db.saved.includes(d.id));
  const unreadFor = (id: string) => db.notifications.filter((n) => !n.read && n.dogId === id).length;
  return (
    <div className={s.screen}>
      <Top
        title={`${user.name} 님`}
        subtitle={<>{user.email || (user.kakao ? "카카오 계정" : "")}<Badge tone={user.verified ? "green" : "grey"}>{user.verified ? "인증 완료" : "인증 전"}</Badge></>}
      />
      {user.verificationRequired && !user.verified && (
        <div className={s.notice}>
          <p>이메일 인증을 마쳐야 신고를 등록할 수 있어요</p>
          <Button variant="weak" size="sm" data-action="verify-resend">메일 다시 받기</Button>
        </div>
      )}
      <ListHeader title="내 신고" />
      {mine.length ? (
        mine.map((d) => (
          <Fragment key={d.id}>
            <ListRow
              href={`#/dog/${d.id}`}
              left={<Thumb src={d.image} />}
              title={d.name}
              description={d.location}
              right={<>{unreadFor(d.id) > 0 && <span className={s.count}>새 제보 {unreadFor(d.id)}</span>}<DogBadge dog={d} /></>}
            />
            <div className={s.rowActions}>
              <Button variant="weak" size="sm" data-action="edit-dog" data-id={d.id}>수정</Button>
              {d.status !== "reunited" && <Button variant="weak" size="sm" data-action="reunite" data-id={d.id}>찾았어요</Button>}
            </div>
          </Fragment>
        ))
      ) : (
        <div className={s.emptyAction}>
          <p>등록한 신고가 없어요</p>
          <Button variant="weak" size="sm" data-action="report">신고하기</Button>
        </div>
      )}
      <Divider />
      <ListHeader title="우리 집 강아지" />
      {db.profiles.map((p) => (
        <ListRow
          key={p.id}
          left={<Thumb src={p.image} />}
          title={p.name}
          description={[p.breed, p.age].filter(Boolean).join(" · ")}
          right={<Button variant="weak" size="sm" data-action="report" data-profile={p.id}>이 정보로 신고</Button>}
        />
      ))}
      <ListRow as="button" data-action="profile" left={<IconCircle name="Plus" />} title="강아지 등록하기" description="미리 저장해두면 빠르게 신고할 수 있어요" />
      <Divider />
      <ListHeader title={saved.length ? `저장한 소식 ${saved.length}` : "저장한 소식"} />
      {saved.length ? saved.map((d) => <DogRow key={d.id} dog={d} />) : (
        <div className={s.emptyAction}>
          <p>하트를 누른 강아지가 여기에 모여요</p>
          <ButtonLink variant="weak" size="sm" href="#/explore">강아지 찾아보기</ButtonLink>
        </div>
      )}
    </div>
  );
}
