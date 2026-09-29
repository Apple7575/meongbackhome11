import { useStore } from "../app/useStore.js";
import { openSheet } from "../app/sheets.js";
import { Top, ListHeader, BottomCTA, EmptyState } from "../ui/index.jsx";
import { DogRow } from "./shared.jsx";
import { formatTime } from "../format.js";
import s from "./stories.module.css";
export default function Stories() {
  const db = useStore();
  const home = db.dogs.filter((d) => d.status === "reunited");
  return (
    <div className={s.screen}>
      <Top title="집에 돌아온 아이들" subtitle="함께 찾아서 다시 만났어요" />
      <ListHeader title={`돌아온 아이들 ${home.length}`} />
      {home.length ? home.map((d) => <DogRow key={d.id} dog={d} />) : <p className={s.empty}>아직 돌아온 아이가 없어요. 곧 좋은 소식이 올 거예요.</p>}
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
      <BottomCTA onClick={() => openSheet("story")}>우리의 재회 이야기 쓰기</BottomCTA>
    </div>
  );
}
