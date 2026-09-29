import { createElement } from "react";
import {
  Bell, ChevronDown, ChevronLeft, ChevronRight, Heart, House, List, Map, MapPin,
  Plus, Search, Settings, SlidersHorizontal, UserRound, Building2,
  Smartphone, Info, ShieldCheck, LogOut, Download, Send, Share2, QrCode, Flag, Pencil, Clock3, Camera, X,
} from "lucide";
// lucide에는 HouseHeart가 없어 기존 main.js처럼 House를 그 이름으로 쓴다.
const ICONS = {
  Bell, ChevronDown, ChevronLeft, ChevronRight, Heart, House, List, Map, MapPin,
  Plus, Search, Settings, SlidersHorizontal, UserRound, Building2, HouseHeart: House,
  Smartphone, Info, ShieldCheck, LogOut, Download, Send, Share2, QrCode, Flag, Pencil, Clock3, Camera, X,
};
const camel = (attrs) =>
  Object.fromEntries(
    Object.entries(attrs).map(([k, v]) => [k.replace(/-([a-z])/g, (_, c) => c.toUpperCase()), v]),
  );
export default function Icon({ name, size = 24, className }) {
  const [, attrs, children] = ICONS[name];
  return (
    <svg {...camel(attrs)} width={size} height={size} strokeWidth={1.8} className={className} aria-hidden="true" focusable="false">
      {children.map(([tag, a], i) => createElement(tag, { ...camel(a), key: i }))}
    </svg>
  );
}
