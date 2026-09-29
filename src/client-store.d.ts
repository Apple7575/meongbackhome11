// client-store.js(JavaScript)의 공개 함수 모양. TypeScript 코드가 이 선언을 쓴다.
import type { Store } from "./types.ts";
export function read(): Store;
export function id(prefix: string): string;
export function save(): Promise<boolean>;
export function initialize(): Promise<void>;
export function refresh(options?: { force?: boolean }): Promise<boolean | undefined>;
export function api<T = any>(url: string, body?: unknown): Promise<T>;
export function authenticate(mode: string, values?: Record<string, string>): Promise<{ emailDelivery?: string; message?: string }>;
export function enablePush(): Promise<void>;
