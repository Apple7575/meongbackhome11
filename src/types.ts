// 서버 /api/state와 client-store의 read()가 돌려주는 데이터 모양.
export type Coords = [number, number];
export type DogStatus = "missing" | "reunited";
export type ReportStatus = "확인 전" | "확인 중" | "관련 목격" | "다른 강아지";
export type Connection = "loading" | "online" | "offline" | "reconnecting" | "unconfigured";

export interface Dog {
  id: string;
  name: string;
  breed: string;
  age?: string;
  sex?: string;
  color?: string;
  size?: string;
  accessory?: string;
  region: string;
  location: string;
  description?: string;
  time: string;
  coords: Coords;
  image?: string;
  // 대표 사진 말고 더 올린 사진(최대 2장)
  images?: string[];
  status: DogStatus;
  demo?: boolean;
  previewOnly?: boolean;
  canManage?: boolean;
  // 운영자가 숨긴 신고(운영자에게만 내려온다)
  hidden?: boolean;
  reunitedAt?: string;
  exampleProfile?: { feature: string; habit: string; focus: string };
}
export interface Message {
  text: string;
  time: string;
  // 서버가 붙이는 보낸 사람. 내 말풍선을 오른쪽에 보여줄 때 쓴다.
  senderId?: string;
}
export interface Report {
  id: string;
  dogId: string | null;
  kind: string;
  region?: string;
  coords: Coords;
  heading: number | null;
  stationary?: boolean;
  location: string;
  time: string;
  description?: string;
  image?: string;
  color?: string;
  size?: string;
  status: ReportStatus;
  messages?: Message[];
  demo?: boolean;
  previewOnly?: boolean;
  canManage?: boolean;
  canChat?: boolean;
  // 이 제보를 쓴 사람이면 지울 수 있다
  canDelete?: boolean;
  hidden?: boolean;
  exampleConversation?: { who: string; text: string }[];
}
export interface Candidate extends Report {
  distance: number;
}
export interface Notice {
  id: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
  dogId?: string | null;
  // 목격자가 골라 보낸 알림이면 그 제보를 바로 연다
  reportId?: string;
}
export interface Profile {
  id: string;
  name: string;
  breed: string;
  age?: string;
  sex?: string;
  color?: string;
  size?: string;
  description?: string;
  image?: string;
  images?: string[];
}
export interface Story {
  id: string;
  title: string;
  text: string;
  image?: string;
  time: string;
  canDelete?: boolean;
  hidden?: boolean;
}
export interface Update {
  id: string;
  dogId: string;
  text: string;
  time: string;
}
export interface Moderation {
  id: string;
  target: string;
  reason: string;
  time: string;
  resolved: boolean;
}
export interface User {
  id: string;
  name: string;
  registered: boolean;
  role?: string;
  email: string | null;
  verified: boolean;
  verificationRequired: boolean;
  // 카카오로만 로그인하는 계정은 비밀번호가 없다.
  hasPassword?: boolean;
  kakao?: boolean;
}
export interface Store {
  dogs: Dog[];
  reports: Report[];
  profiles: Profile[];
  stories: Story[];
  updates: Update[];
  moderation: Moderation[];
  notifications: Notice[];
  saved: string[];
  areas: string[];
  user: User | null;
  connection: Connection;
}
// 공공데이터에서 받아 온 개: 보호소에 들어온 개(shelter) 또는 다른 곳에 낸 분실 신고(lostext)
export interface PublicDog {
  id: string;
  source: "shelter" | "lostext";
  breed: string;
  color: string;
  sex: string;
  age: string;
  weight?: string;
  place: string;
  area: string;
  region: string;
  happenedAt: string | null;
  noticeNo?: string;
  noticeEnd?: string | null;
  state?: string;
  mark: string;
  photos: string[];
  care?: { name: string; tel: string; addr: string };
}
