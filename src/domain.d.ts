// domain.js(JavaScript)의 공개 함수 모양.
import type { Candidate, Coords, Dog, Report, ReportStatus } from "./types.ts";
export const REGIONS: string[];
export const COORDS: Record<string, Coords>;
export const REPORT_STATUSES: ReportStatus[];
export function escapeHTML(value: unknown): string;
export function chronologicalSightings(reports: Report[]): Report[];
export function headingLabel(value: number | null | undefined | ""): string;
export function haversine(a: Coords, b: Coords): number;
export function matchCandidates(dog: Dog, reports: Report[]): Candidate[];
export interface DogFilter {
  region?: string;
  query?: string;
  color?: string;
  size?: string;
  accessory?: string;
  status?: string;
}
export function valuesOf(value: string | null | undefined): string[];
export function joinValues(values: string[]): string;
export function sharesValue(a: string | null | undefined, b: string | null | undefined): boolean;
export function nearestRegion(point: Coords): string;
export function filterDogs(dogs: Dog[], filter?: DogFilter): Dog[];
export function arrowEnd(coords: Coords, heading: number, meters?: number): Coords;
