import { createElement } from "react";
import {
  Bell, ChevronDown, ChevronLeft, ChevronRight, Heart, House, List, Map, MapPin,
  Plus, Search, Settings, SlidersHorizontal, UserRound, Building2,
  Smartphone, Info, ShieldCheck, LogOut, Download, Send, Share2, QrCode, Flag, Pencil, Clock3, Camera, X, Copy,
} from "lucide";
import type { IconNode } from "lucide";
// lucide에는 HouseHeart가 없어 House를 그 이름으로 쓴다(제보 종류 아이콘 이름 유지).
const ICONS = {
  Bell, ChevronDown, ChevronLeft, ChevronRight, Heart, House, List, Map, MapPin,
  Plus, Search, Settings, SlidersHorizontal, UserRound, Building2, HouseHeart: House,
  Smartphone, Info, ShieldCheck, LogOut, Download, Send, Share2, QrCode, Flag, Pencil, Clock3, Camera, X, Copy,
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
}
export default function Icon({ name, size = 24, className }: IconProps) {
  const [, attrs, children = []] = ICONS[name];
  return (
    <svg {...camel(attrs)} width={size} height={size} strokeWidth={1.8} className={className} aria-hidden="true" focusable="false">
      {children.map(([tag, a], i) => createElement(tag, { ...camel(a), key: i }))}
    </svg>
  );
}
