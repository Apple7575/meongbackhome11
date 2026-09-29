import { ListRow, Thumb, Badge } from "../ui/index.jsx";
import { relativeTime } from "../format.js";
import s from "./screens.module.css";
export function DogBadge({ dog }) {
  if (dog.demo) return <Badge>예시</Badge>;
  return dog.status === "reunited" ? <Badge tone="green">집에 돌아왔어요</Badge> : <Badge tone="coral">찾고 있어요</Badge>;
}
export function DogRow({ dog, size = 56 }) {
  return (
    <ListRow
      href={`#/dog/${dog.id}`}
      data-dog-row=""
      left={<Thumb src={dog.image} size={size} />}
      title={<><span className={s.name}>{dog.name}</span><span className={s.breed}> · {dog.breed}</span></>}
      description={`${dog.location} · ${relativeTime(dog.time)}`}
      right={<DogBadge dog={dog} />}
    />
  );
}
