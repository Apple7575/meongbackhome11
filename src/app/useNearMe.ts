// 이 기기의 현재 위치(내 근처 보기용). 위치는 거르기·정렬에만 쓰고 저장하지 않는다.
// - 이미 위치를 허용한 사람은 화면을 열자마자 내 근처로 보여준다(auto).
// - 권한을 거절하면 토스트 대신 화면 안 안내(denied)를 남긴다.
import { useState, useEffect, useCallback } from "react";
import { toast } from "./toast.ts";
import type { Coords } from "../types.ts";
export function useNearMe({ auto = false, onFound }: { auto?: boolean; onFound?: () => void } = {}) {
  const [here, setHere] = useState<Coords | null>(null);
  const [denied, setDenied] = useState(false);
  const locate = useCallback((quiet = false) => {
    if (!navigator.geolocation) return toast("이 브라우저에서는 위치를 가져올 수 없어요.");
    if (!quiet) toast("현재 위치를 확인하고 있어요.");
    navigator.geolocation.getCurrentPosition(
      (p) => { setDenied(false); setHere([p.coords.latitude, p.coords.longitude]); onFound?.(); },
      (e) => {
        if (e.code === e.PERMISSION_DENIED) setDenied(true);
        else if (!quiet) toast("위치를 찾지 못했어요. 잠시 뒤에 다시 시도해주세요.");
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 },
    );
  }, [onFound]);
  useEffect(() => {
    if (!auto || !navigator.permissions) return;
    let alive = true;
    navigator.permissions.query({ name: "geolocation" }).then((s) => { if (alive && s.state === "granted") locate(true); }).catch(() => {});
    return () => { alive = false; };
    // 화면을 열 때 한 번만 확인한다.
  }, []);
  const clear = useCallback(() => setHere(null), []);
  const dismiss = useCallback(() => setDenied(false), []);
  return { here, denied, locate, clear, dismiss };
}
