import { useStore } from "../app/useStore.ts";
import { openSheet } from "../app/sheets.ts";
import { Top, ListHeader, BottomCTA, EmptyState } from "../ui/index.tsx";
import { DogRow } from "./shared.tsx";
import { formatTime } from "../format.ts";
import s from "./stories.module.css";
export default function Stories() {
  const db = useStore();
  const home = db.dogs.filter((d) => d.status === "reunited");
  return (
    <div className={s.screen}>
      <Top title="집에 돌아온 아이들" subtitle="함께 찾아서 다시 만났어요" />
      {/* '0마리'와 빈 이야기를 따로 보여주지 않고, 아무것도 없으면 안내 하나로 합친다. */}
      {!home.length && !db.stories.length ? (
        <EmptyState image="/assets/mascot-reunion.webp" title="아직 돌아온 소식이 없어요"
          description="다시 만났다면 그 순간과 도움이 된 경험을 나눠주세요. 찾고 있는 보호자에게 큰 힘이 돼요." />
      ) : (
        <>
          {home.length > 0 && (
            <>
              <ListHeader title={`돌아온 아이들 ${home.length}`} />
              {home.map((d) => <DogRow key={d.id} dog={d} />)}
            </>
          )}
          <ListHeader title="재회 이야기" />
          {db.stories.length ? (
            db.stories.map((st) => (
              <article key={st.id} className={s.story}>
                <img src={st.image || "/assets/mascot-reunion.webp"} alt="재회 이야기 사진" loading="lazy" />
                <h2>{st.title}</h2>
                <p>{st.text}</p>
                <small>{formatTime(st.time)}</small>
              </article>
            ))
          ) : (
            <EmptyState image="/assets/mascot-reunion.webp" title="첫 번째 이야기를 기다려요" description="다시 만난 순간과 도움이 된 경험을 나눠주세요." />
          )}
        </>
      )}
      <BottomCTA onClick={() => openSheet("story")}>우리의 재회 이야기 쓰기</BottomCTA>
    </div>
  );
}
