// maps.js(JavaScript, Leaflet)의 공개 함수 모양. 새 코드가 쓰는 부분만 적는다.
import type { Coords, Report } from "./types.ts";
export interface MapHandle {
  remove(): void;
  setView(center: Coords, zoom: number): void;
  fitBounds(points: Coords[], options?: { paddingTopLeft?: [number, number]; paddingBottomRight?: [number, number]; maxZoom?: number }): void;
}
export interface MarkerHandle {
  bindPopup(html: string): MarkerHandle;
  on(event: "click", handler: () => void): MarkerHandle;
}
export function baseMap(element: HTMLElement, center?: Coords, zoom?: number): MapHandle;
export function marker(map: MapHandle, coords: Coords, label?: string, className?: string): MarkerHandle;
export interface PinItem { coords: Coords; onClick?: () => void; popup?: string; className?: string }
export function pins(map: MapHandle, items: PinItem[]): () => void;
export interface PlaceResult { name: string; address: string; coords: Coords }
export const canSearchPlaces: boolean;
export function searchPlaces(query: string, near?: Coords): Promise<PlaceResult[]>;
export function rangeCircle(map: MapHandle, center: Coords, km: number, padding?: { paddingTopLeft?: [number, number]; paddingBottomRight?: [number, number] }): void;
export function drawTimeline(map: MapHandle, reports: Report[], onSelect?: (id: string) => void): { select(id: string): void };
export function directionPicker(
  element: HTMLElement,
  coords: Coords,
  onChange: (point: Coords) => void,
): { map: MapHandle; set(point: Coords, heading: number | null): void };
