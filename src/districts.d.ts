export const DISTRICTS: Record<string, string[]>;
export function splitRegion(value?: string): [string, string];
export function inDistrict(text: string | undefined, district: string): boolean;
export function withDistrict(text: string, district: string | undefined): string;
export function inRegion(itemRegion: string | undefined, text: string | undefined, value: string): boolean;
