import type { Coords } from "./types.ts";
export function groupByPixel<T extends { coords: Coords }>(items: T[], toPoint: (c: Coords) => { x: number; y: number }, radius?: number): T[][];
export function centerOf(items: { coords: Coords }[]): Coords;
export function samePlace(items: { coords: Coords }[]): boolean;
