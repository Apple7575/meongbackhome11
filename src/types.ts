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
  status: DogStatus;
  demo?: boolean;
  previewOnly?: boolean;
  canManage?: boolean;
  reunitedAt?: string;
  exampleProfile?: { feature: string; habit: string; focus: string };
}
export interface Message {
  text: string;
  time: string;
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
}
export interface Story {
  id: string;
  title: string;
  text: string;
  image?: string;
  time: string;
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
