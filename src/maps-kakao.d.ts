// maps-kakao.js는 maps.js와 같은 공개 함수 모양을 가진다. 카카오 좌표→주소만 더 있다.
import type { Coords } from "./types.ts";
export * from "./maps.js";
export interface KakaoAddress {
  address?: { region_1depth_name: string; region_2depth_name: string; region_3depth_name: string };
  road_address?: { road_name: string } | null;
}
export function kakaoAddress(point: Coords): Promise<KakaoAddress | null>;
