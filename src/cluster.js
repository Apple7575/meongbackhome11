// 화면에서 가까이 겹치는 핀을 하나로 묶는다(지도 종류와 상관없이 화면 좌표만 쓴다).
// toPoint(coords) → {x, y}(화면 픽셀). 반경 안에 이미 묶음이 있으면 거기에 넣는다.
export function groupByPixel(items, toPoint, radius = 36) {
  const groups = [];
  for (const item of items) {
    const p = toPoint(item.coords);
    const g = groups.find((x) => Math.hypot(x.x - p.x, x.y - p.y) < radius);
    if (g) g.items.push(item);
    else groups.push({ x: p.x, y: p.y, items: [item] });
  }
  return groups.map((g) => g.items);
}
// 묶음의 가운데(평균 좌표)
export const centerOf = (items) => [
  items.reduce((s, i) => s + i.coords[0], 0) / items.length,
  items.reduce((s, i) => s + i.coords[1], 0) / items.length,
];
// 모두 사실상 같은 자리면 더 확대해도 갈라지지 않는다.
export const samePlace = (items) => items.every((i) => Math.abs(i.coords[0] - items[0].coords[0]) < 1e-5 && Math.abs(i.coords[1] - items[0].coords[1]) < 1e-5);
