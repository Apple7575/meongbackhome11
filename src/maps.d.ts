// maps.js(JavaScript, Leaflet)의 공개 함수 모양. 새 코드가 쓰는 부분만 적는다.
import type { Coords, Report } from "./types.ts";
export interface MapHandle {
  remove(): void;
  setView(center: Coords, zoom: number): void;
}
export interface MarkerHandle {
  bindPopup(html: string): MarkerHandle;
}
export function baseMap(element: HTMLElement, center?: Coords, zoom?: number): MapHandle;
export function marker(map: MapHandle, coords: Coords, label?: string, className?: string): MarkerHandle;
export function drawTimeline(map: MapHandle, reports: Report[], onSelect?: (id: string) => void): { select(id: string): void };
export function directionPicker(
  element: HTMLElement,
  coords: Coords,
  onChange: (point: Coords) => void,
): { map: MapHandle; set(point: Coords, heading: number | null): void };
