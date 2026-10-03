import { createElement } from "react";
import {
  Bell, ChevronDown, ChevronLeft, ChevronRight, Heart, House, List, Map, MapPin,
  Plus, Search, Settings, SlidersHorizontal, UserRound, Building2,
  Smartphone, Info, ShieldCheck, LogOut, Download, Send, Share2, QrCode, Flag, Pencil, Clock3, Camera, X, Copy, Minus, LocateFixed, Check, Moon, Trash2,
} from "lucide";
import type { IconNode } from "lucide";
// lucide에는 HouseHeart가 없어 House를 그 이름으로 쓴다(제보 종류 아이콘 이름 유지).
const ICONS = {
  Bell, ChevronDown, ChevronLeft, ChevronRight, Heart, House, List, Map, MapPin,
  Plus, Search, Settings, SlidersHorizontal, UserRound, Building2, HouseHeart: House,
  Smartphone, Info, ShieldCheck, LogOut, Download, Send, Share2, QrCode, Flag, Pencil, Clock3, Camera, X, Copy, Minus, LocateFixed, Check, Moon, Trash2,
} satisfies Record<string, IconNode>;
export type IconName = keyof typeof ICONS;
const camel = (attrs: Record<string, string | number>) =>
  Object.fromEntries(
    Object.entries(attrs).map(([k, v]) => [k.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase()), v]),
  );
export interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  // 선택된 상태(저장한 하트 등)는 안을 채운다.
  filled?: boolean;
}
export default function Icon({ name, size = 24, className, filled }: IconProps) {
  const [, attrs, children = []] = ICONS[name];
  return (
    <svg {...camel(attrs)} {...(filled ? { fill: "currentColor" } : {})} width={size} height={size} strokeWidth={1.8} className={className} aria-hidden="true" focusable="false">
      {children.map(([tag, a], i) => createElement(tag, { ...camel(a), key: i }))}
    </svg>
  );
}
