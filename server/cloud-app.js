import express from "express";
import { createPostgres } from "./postgres.js";
import { randomUUID, randomBytes, scryptSync, timingSafeEqual, createHash } from "node:crypto";
import {installMedia,createStorage} from './media.js';
import {installShare,dataUrlBytes} from './share.js';
import {similarDogs,similarNotice} from './match.js';
import {remindStale} from './stale.js';
import {installSuggest} from './suggest.js';
import {installPublicData} from './publicdata.js';
import {installKakao} from './kakao.js';
import path from "node:path";
import webpush from "web-push";
import { seed } from "../src/seed.js";
import { REGIONS, REPORT_STATUSES } from "../src/domain.js";
import { createMailer } from './mail.js';
import { installAccount } from './cloud-account.js';
const fail = (status, message) => {
  throw Object.assign(new Error(message), {
    status
  });
};
const now = () => new Date().toISOString();
const hash = v => createHash("sha256").update(v).digest("hex");
const text = (v, max = 1000, required = false) => {
  if (typeof v !== "string" || v.length > max || required && !v.trim()) fail(400, "입력 내용을 확인해주세요.");
  return v.trim();
};
function point(v) {
  if (!Array.isArray(v) || v.length !== 2 || v.some(x => !Number.isFinite(x)) || v[0] < -90 || v[0] > 90 || v[1] < -180 || v[1] > 180) fail(400, "유효한 위치를 선택해주세요.");
  return v;
}
function time(v) {
  if (!v || !Number.isFinite(Date.parse(v)) || Date.parse(v) > Date.now() + 60000) fail(400, "날짜와 시간을 확인해주세요.");
  return new Date(v).toISOString();
}
function photo(v) {
  if (!v) return "";
  if (typeof v !== "string" || v.length > 1800000) fail(400, "사진 크기가 너무 커요.");
  if (/^\/assets\/[\w.-]+\.(png|webp|jpg)$/.test(v)) return v;
  if (/^\/api\/media\/[a-f0-9-]{36}$/.test(v)) return v;
  if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(v)) fail(400, "지원하지 않는 사진 형식이에요.");
  return v;
}
function selected(obj, keys) {
  return Object.fromEntries(keys.filter(k => obj[k] !== undefined).map(k => [k, obj[k]]));
}
const collections = ["dogs", "reports", "profiles", "stories", "updates", "moderation"];
// 글쓴이가 지우거나 운영자가 숨길 수 있는 공개 글
const publicCollections = ["dogs", "reports", "stories"];
// 요청한 사람의 IP. Vercel은 x-real-ip·x-forwarded-for(첫 칸)를 자기가 다시 채우므로 믿을 수 있다.
// 다른 곳에서는 위조할 수 있는 머리글이라 쓰지 않고 Express의 req.ip(TRUST_PROXY 설정을 따름)를 쓴다.
export function clientIp(req, env = process.env) {
  const forwarded = env.VERCEL ? req.get("x-real-ip") || req.get("x-forwarded-for")?.split(",")[0] : "";
  return forwarded?.trim() || req.ip || "unknown";
}
// 쿠키 없이 읽기만 하는 손님. 쓰기를 할 때에만 익명 계정을 만든다(identify).
const guest = () => ({ id: "", name: "이웃", email: null, password: null, role: "user", verified_at: null });
export async function createApp({
  publicFetch = fetch,
  oauthFetch = fetch,
  database,
  storage,
  defer = promise => promise.catch(() => {}),
  examples = false,
  pushSender,
  secure = process.env.NODE_ENV === "production",
  mailer = createMailer(),
  publicOrigin = process.env.PUBLIC_ORIGIN || '',
  requireVerification = secure,
  // 공개 쓰기의 IP별 제한(10분). 끄는 건 여러 번 쓰는 브라우저 테스트용이다.
  ipRateLimit = true
} = {}) {
  const db = database || createPostgres();
  const rows = async c => (await db.prepare("SELECT * FROM docs WHERE collection=?").all(c)).map(row => ({
    ...JSON.parse(row.json),
    id: row.id,
    ownerId: row.owner,
    revision: row.revision
  }));
  const get = async (c, id) => {
    const r = await db.prepare("SELECT * FROM docs WHERE collection=? AND id=?").get(c, id || "");
    return r ? {
      ...JSON.parse(r.json),
      id: r.id,
      ownerId: r.owner,
      revision: r.revision
    } : null;
  };
  const put = async (c, v, owner) => {
    const previous = await get(c, v.id);
    const revision = (previous?.revision || 0) + 1;
    const clean = {
      ...v
    };
    delete clean.ownerId;
    delete clean.revision;
    delete clean.canManage;
    delete clean.canChat;
    delete clean.canDelete;
    // 운영자가 숨긴 글은 글쓴이가 고쳐도 숨김이 풀리지 않는다.
    if (previous?.hidden) clean.hidden = true;
    await db.prepare("INSERT INTO docs(collection,id,owner,revision,json) VALUES(?,?,?,?,?) ON CONFLICT(collection,id) DO UPDATE SET revision=excluded.revision,json=excluded.json").run(c, v.id, owner, revision, JSON.stringify(clean));
  };
  if (examples && !(await db.prepare("SELECT 1 FROM config WHERE key='seeded'").get())) {
    const data = seed();
    for (const c of ["dogs", "reports"]) for (const v of data[c]) await put(c, v, "example");
    await db.prepare("INSERT INTO config VALUES('seeded','1')").run();
  }
  let keys = JSON.parse((await db.prepare("SELECT value FROM config WHERE key='vapid'").get())?.value || "null");
  if (!keys) {
    keys = webpush.generateVAPIDKeys();
    await db.prepare("INSERT INTO config VALUES('vapid',?) ON CONFLICT(key) DO NOTHING").run(JSON.stringify(keys));
    keys=JSON.parse((await db.prepare("SELECT value FROM config WHERE key='vapid'").get()).value);
  }
  const app = express();
  app.disable("x-powered-by");
  app.use(db.middleware);
  if (process.env.TRUST_PROXY === '1') app.set('trust proxy', 1);
  const prefs = async uid => JSON.parse((await db.prepare("SELECT json FROM prefs WHERE user_id=?").get(uid))?.json || '{"saved":[],"areas":[]}');
  async function notify(uid, title, body, dogId, reportId) {
    if (!uid || uid === "example") return;
    const n = {
      id: randomUUID(),
      title,
      body,
      dogId,
      ...(reportId ? { reportId } : {}),
      time: now(),
      read: false
    };
    await db.prepare("INSERT INTO notices(id,user_id,json) VALUES(?,?,?)").run(n.id, uid, JSON.stringify(n));
    for (const s of await db.prepare("SELECT * FROM subscriptions WHERE user_id=?").all(uid)) await db.prepare("INSERT INTO outbox VALUES(?,?,?,?,?)").run(randomUUID(), s.endpoint, JSON.stringify({
      title,
      body,
      url: dogId ? `/#/dog/${dogId}${reportId ? `?report=${reportId}` : ""}` : "/#/my"
    }), 0, Date.now());
  }
  async function snapshot(user) {
    const all = {};
    for (const c of collections) all[c] = await rows(c);
    // 운영자가 숨긴 글은 운영자에게만 보인다(운영자 화면에서 다시 보이게 할 수 있게).
    if (user.role !== "admin") for (const c of publicCollections) all[c] = all[c].filter(v => !v.hidden);
    const canSee = r => r.ownerId === user.id || all.dogs.find(d => d.id === r.dogId)?.ownerId === user.id;
    return {
      ...all,
      user: {
        id: user.id,
        name: user.name,
        registered: !!user.email,
        // 카카오 계정은 비밀번호가 없고, 이메일이 없으면 내부 주소를 쓰므로 화면에는 숨긴다.
        hasPassword: !!user.password,
        kakao: !!user.email && user.email.endsWith("@kakao.invalid"),
        role: user.role,
        email: user.email && !user.email.endsWith("@kakao.invalid") ? user.email : null,
        verified: !!user.verified_at,
        verificationRequired: requireVerification
      },
      dogs: all.dogs.map(d => ({
        ...d,
        canManage: d.ownerId === user.id
      })),
      reports: all.reports.map(r => {
        const priv = canSee(r),
          owner = all.dogs.find(d => d.id === r.dogId)?.ownerId === user.id;
        const v = {
          ...r,
          messages: priv ? r.messages || [] : [],
          canChat: priv,
          canManage: owner,
          // 제보를 쓴 사람만 지울 수 있다(손님은 id가 비어 있어 해당 없음).
          canDelete: !!user.id && r.ownerId === user.id
        };
        if (!priv && r.kind !== "목격") {
          v.coords = r.coords.map(x => Math.round(x * 100) / 100);
          v.location = `${r.region || "지역"} · 보호 위치 비공개`;
          v.description = "안전하게 보호·인계 중이에요. 정확한 위치는 당사자에게만 공개돼요.";
          v.image = "";
          v.approximate = true;
          v.heading = null;
        }
        return v;
      }),
      stories: all.stories.map(st => ({ ...st, canDelete: !!user.id && st.ownerId === user.id })),
      profiles: all.profiles.filter(p => p.ownerId === user.id),
      moderation: all.moderation.filter(m => user.role === "admin" || m.ownerId === user.id),
      ...(user.id ? await prefs(user.id) : { saved: [], areas: [] }),
      notifications: user.id ? (await db.prepare("SELECT json FROM notices WHERE user_id=? ORDER BY rowid DESC LIMIT 100").all(user.id)).map(r => JSON.parse(r.json)) : [],
      connection: "online",
      realtimeMode: "poll",
      storageMode: "supabase"
    };
  }
  app.use((req, res, next) => {
    res.set({
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "X-Frame-Options": "DENY"
    });
    if (req.path.startsWith("/api/")) res.set("Cache-Control", "no-store");
    next();
  });
  app.use("/api", (req, res, next) => {
    if (!["GET", "HEAD"].includes(req.method)) {
      const origin = req.get("origin");
      const allowed = process.env.PUBLIC_ORIGIN || `${req.protocol}://${req.get("host")}`;
      if (origin && origin !== allowed && new URL(origin).host !== req.get("host")) return res.status(403).json({
        error: "허용되지 않은 요청이에요."
      });
      if (!req.is("application/json")) return res.status(415).json({
        error: "JSON 요청이 필요해요."
      });
    }
    next();
  });
  app.use(express.json({
    limit: "3mb"
  }));
  // Load balancer probes must not create anonymous accounts or sessions.
  app.get('/api/health', (req, res) => res.json({
    ok: true
  }));
  // 공공데이터(보호소에 들어온 개·다른 곳의 분실 신고): 로그인·세션 없이 읽는다.
  const publicData = installPublicData({ app, db, rows, notify, defer, fetchImpl: publicFetch });
  const bucket = storage || createStorage();
  // 공유 링크 미리보기는 로그인·세션 없이 읽기만 한다.
  installShare({
    app,
    // 운영자가 숨긴 신고는 공유 미리보기·사이트맵에도 내보내지 않는다.
    listDogs: async () => (await db.prepare("SELECT json FROM docs WHERE collection='dogs'").all()).map(row => typeof row.json === "string" ? JSON.parse(row.json) : row.json).filter(d => !d.hidden),
    getDog: async id => {
      const row = await db.prepare("SELECT json FROM docs WHERE collection='dogs' AND id=?").get(id);
      const dog = row ? (typeof row.json === "string" ? JSON.parse(row.json) : row.json) : null;
      return dog?.hidden ? null : dog;
    },
    readImage: async uri => {
      const inline = dataUrlBytes(uri);
      if (inline) return inline;
      const id = /^\/api\/media\/([a-f0-9-]{36})$/.exec(uri || "")?.[1];
      const row = id && await db.prepare("SELECT path FROM media WHERE id=?").get(id);
      if (!row) return null;
      const { data, error } = await bucket.download(row.path);
      return error ? null : Buffer.from(await data.arrayBuffer());
    }
  });
  async function session(res, uid) {
    const token = randomBytes(32).toString("hex");
    await db.prepare("INSERT INTO sessions VALUES(?,?,?)").run(hash(token), uid, Date.now() + 30 * 86400000);
    res.cookie("mb_session", token, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      maxAge: 30 * 86400000,
      path: "/"
    });
  }
  app.use("/api", async (req, res, next) => {
    try {
      req.clientIp = clientIp(req);
      const token = req.headers.cookie?.match(/(?:^|;\s*)mb_session=([a-f0-9]{64})(?:;|$)/)?.[1];
      const sess = token && (await db.prepare("SELECT user_id FROM sessions WHERE token=? AND expires>?").get(hash(token), Date.now()));
      const user = sess && (await db.prepare("SELECT * FROM users WHERE id=?").get(sess.user_id));
      // 쿠키가 없으면 손님으로 읽기만 한다. 예전처럼 요청마다 익명 계정·세션을 만들면 DB가 계속 불어난다.
      req.user = user || guest();
      req.token = token;
      next();
    } catch (e) {
      next(e);
    }
  });
  // window(ms) 동안 key마다 max번까지. 여러 서버 인스턴스가 나눠 쓰도록 DB에 센다.
  const rate = async (key, max, window = 60000) => {
    const r = await db.prepare("INSERT INTO rate_limits(key,count,reset_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN meongback.rate_limits.reset_at<? THEN 1 ELSE meongback.rate_limits.count+1 END,reset_at=CASE WHEN meongback.rate_limits.reset_at<? THEN EXCLUDED.reset_at ELSE meongback.rate_limits.reset_at END RETURNING count").get(hash(key), Date.now() + window, Date.now(), Date.now());
    if (r.count > max) fail(429, "잠시 후 다시 시도해주세요.");
  };
  // 쿠키를 지우면 새 익명 계정이 되므로 사용자별 제한만으로는 막지 못한다. 공개 쓰기는 IP로도 센다(10분).
  const IP_LIMITS = { sighting: 10, photo: 20, story: 5, flag: 5, message: 60, anon: 30 };
  const ipRate = async (req, kind) => {
    if (ipRateLimit) await rate(`ip-${kind}:${req.clientIp}`, IP_LIMITS[kind], 600000);
  };
  // 사용자별 제한의 열쇠. 손님은 id가 없으니 IP로 센다(모든 손님이 한 칸을 나눠 쓰지 않게).
  const who = req => req.user.id || `ip:${req.clientIp}`;
  // 쓰기를 하는 손님에게 그때 익명 계정을 만든다. withSession=false면 계정만 만든다(가입처럼 곧바로 새 세션을 주는 곳).
  async function identify(req, res, { withSession = true } = {}) {
    if (req.user.id) return req.user;
    await ipRate(req, "anon");
    const uid = randomUUID();
    await db.prepare("INSERT INTO users(id,name) VALUES(?,?)").run(uid, "이웃");
    if (withSession) await session(res, uid);
    req.user = await db.prepare("SELECT * FROM users WHERE id=?").get(uid);
    return req.user;
  }
  const media=installMedia({app,db,storage:bucket,rate,ipRate,identify,who});
  // 손님이 처음 쓰기 전에 익명 계정을 먼저 받는다. 사진 여러 장을 동시에 올려도 한 계정이 되고,
  // 응답이 늦어 다시 보내도 같은 계정이라 같은 글로 알아본다.
  app.post("/api/session", async (req, res) => {
    await identify(req, res);
    res.json({ ok: true });
  });
  app.use('/api', (req,res,next)=>{res.on('finish',()=>{if(res.statusCode<400)defer(flushPush().catch(()=>{}));});next();});
  app.get("/api/state", async (req, res) => res.json(await snapshot(req.user)));
  installSuggest({ app, get, notify, db, rate, fail });
  installKakao({ app, db, session, secure, fetchImpl: oauthFetch });
  app.post('/api/push/test', async (req, res) => {
    await rate(`push-test:${who(req)}`, 2);
    if (!process.env.PUSH_SUBJECT && !pushSender) fail(503, '서버의 알림 발신 설정이 필요해요.');
    if (!(await db.prepare('SELECT 1 FROM subscriptions WHERE user_id=?').get(req.user.id))) fail(400, '먼저 이 기기에서 알림을 켜주세요.');
    await notify(req.user.id, '멍백홈 알림이 연결됐어요', '이 알림이 휴대폰에 도착했다면 알림 설정이 완료됐어요.');

    res.json({
      ok: true
    });
  });
  const accounts = await installAccount({
    app,
    db,
    rate,
    mailer,

    defer,
    signIn: session,
    origin: publicOrigin.replace(/\/$/, ''),
    async invalidate(uid) {
      await db.prepare('DELETE FROM sessions WHERE user_id=?').run(uid);
      await db.prepare('DELETE FROM outbox WHERE endpoint IN (SELECT endpoint FROM subscriptions WHERE user_id=?)').run(uid);
      await db.prepare('DELETE FROM subscriptions WHERE user_id=?').run(uid);

    }
  });
  app.post("/api/auth/:mode", async (req, res) => {
    await rate(`auth:${req.clientIp}`, 12);
    const mode = req.params.mode;
    if (mode === "logout") {
      if (req.token) await db.prepare("DELETE FROM sessions WHERE token=?").run(hash(req.token));
      res.clearCookie("mb_session", {
        path: "/"
      });
      return res.json({
        ok: true
      });
    }
    const email = text(req.body.email, 200, true).toLowerCase(),
      password = text(req.body.password, 200, true);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 10) fail(400, "이메일과 10자 이상의 비밀번호를 입력해주세요.");
    if (mode === "register") {
      if(requireVerification&&!accounts.configured)fail(503,'회원가입용 인증 메일을 준비 중이에요. 아직 가입할 수 없어요.');
      if (req.user.email) fail(409, "이미 로그인되어 있어요.");
      if (await db.prepare("SELECT 1 FROM users WHERE email=?").get(email)) fail(409, "이미 사용 중인 이메일이에요.");
      // 손님이면 계정만 먼저 만든다(세션은 아래에서 새로 준다).
      await identify(req, res, { withSession: false });
      const salt = randomBytes(16).toString("hex"),
        digest = scryptSync(password, salt, 64).toString("hex");
      await db.exec('BEGIN IMMEDIATE');
      try {
        const current=await db.prepare('SELECT email FROM users WHERE id=? FOR UPDATE').get(req.user.id);
        if(!current||current.email)fail(409,'이미 계정이 연결됐어요. 다시 로그인해주세요.');
        await db.prepare("UPDATE users SET email=?,password=?,name=? WHERE id=?").run(email, `${salt}:${digest}`, text(req.body.name || "보호자", 30, true), req.user.id);
        await db.prepare("DELETE FROM sessions WHERE user_id=?").run(req.user.id);
        await session(res, req.user.id);
        await db.exec('COMMIT');
      }catch(error){await db.exec('ROLLBACK');throw error;}
      let emailDelivery = 'unconfigured';
      if (accounts.configured) {
        try {
          await accounts.issue(await db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id), 'verify');
          emailDelivery = 'sent';
        } catch {
          emailDelivery = 'failed';
        }
      }
      return res.json({
        ok: true,
        emailDelivery
      });
    }
    if (mode !== "login") fail(404, "경로를 찾을 수 없어요.");
    const user = await db.prepare("SELECT * FROM users WHERE email=?").get(email),
      [salt, digest] = (user?.password || "missing:" + "0".repeat(128)).split(":");
    const actual = scryptSync(password, salt, 64);
    if (!user || !timingSafeEqual(actual, Buffer.from(digest, "hex"))) fail(401, "이메일 또는 비밀번호를 확인해주세요.");
    if (req.token) await db.prepare("DELETE FROM sessions WHERE token=?").run(hash(req.token));
    await session(res, user.id);
    res.json({
      ok: true
    });
  });
  app.get("/api/events", (req,res)=>res.status(200).json({mode:"poll"}));
  app.post("/api/changes", async (req, res) => {
    if (!Array.isArray(req.body.operations) || req.body.operations.length > 50) fail(400, "저장할 내용을 확인해주세요.");
    await identify(req, res);
    await rate(`write:${req.user.id}`, 60);
    // 직렬화 실패면 거래를 다시 하므로, 요청 값은 매번 새로 복사해서 쓴다.
    await db.transaction(async () => {
      const operations = structuredClone(req.body.operations);
      for (const op of operations) {
        const c = op.collection;
        if (!collections.includes(c)) fail(400, "허용되지 않은 항목이에요.");
        const v = op.value;
        if (!v || typeof v.id !== "string" || !/^[\w-]{1,80}$/.test(v.id)) fail(400, "잘못된 식별자예요.");
        const old = await get(c, v.id);
        // 응답이 늦어 같은 글을 다시 보낸 경우(같은 id·같은 사람, 새 글로 보냄): 이미 저장됐으니 그대로 두고 알림도 다시 보내지 않는다.
        if (old && old.ownerId === req.user.id && op.revision === undefined) continue;
        if (old) for (const [key, value] of Object.entries(old)) if (!(key in v)) v[key] = value;
        if (old && old.demo) fail(403, "예시 신고는 수정할 수 없어요. 직접 신고를 등록해주세요.");
        if (old && op.revision !== old.revision) fail(409, "다른 기기에서 내용이 바뀌었어요. 새로고침 후 다시 확인해주세요.");
        await media.validate(v.image,req.user.id,old?.image);
        if (Array.isArray(v.images)) for (const extra of v.images.slice(0, 2)) await media.validate(extra, req.user.id, old?.images?.includes(extra) ? extra : old?.image);
        let clean;
        if (c === "dogs" || c === "profiles") {
          if (old && old.ownerId !== req.user.id) fail(403, "내 반려견 정보만 수정할 수 있어요.");
          clean = {
            id: v.id,
            name: text(v.name, 30, true),
            breed: text(v.breed, 40, true),
            age: text(v.age || "", 20),
            sex: text(v.sex || "모름", 10),
            // 털 색은 여러 개·기타를 쉼표로 이어 저장해서 넉넉히 받는다.
            color: text(v.color, 80, true),
            size: text(v.size, 10, true),
            description: text(v.description || ""),
            image: photo(v.image),
            // 대표 사진 말고 더 올린 사진(최대 2장)
            images: Array.isArray(v.images) ? v.images.slice(0, 2).map(photo).filter(Boolean) : []
          };
          if (!clean.image) fail(400, "강아지 사진이 필요해요.");
          if (c === "dogs") {
            if (!req.user.email) fail(401, "실종 신고를 등록하려면 계정을 연결해주세요.");
            if (requireVerification && !req.user.verified_at) fail(403, '이메일 인증 후 실종 신고를 등록할 수 있어요. 내 계정에서 인증 메일을 요청해주세요.');
            if (!REGIONS.includes(v.region)) fail(400, "지역을 확인해주세요.");
            Object.assign(clean, {
              region: v.region,
              location: text(v.location, 150, true),
              coords: point(v.coords),
              time: time(v.time),
              accessory: text(v.accessory || "없음", 80),
              status: old ? v.status : "missing"
            });
            if (!["missing", "reunited"].includes(clean.status)) fail(400, "신고 상태를 확인해주세요.");
            if (old?.status === "missing" && clean.status === "reunited") {
              clean.reunitedAt = now();
              const recipients = new Set([req.user.id, ...(await rows("reports")).filter(r => r.dogId === v.id).map(r => r.ownerId), ...(await db.prepare("SELECT * FROM prefs").all()).filter(p => JSON.parse(p.json).saved?.includes(v.id)).map(p => p.user_id)]);
              for (const uid of recipients) await notify(uid, `${clean.name}가 가족의 품으로 돌아왔어요`, "함께 찾아주셔서 감사해요. 수색이 종료되었어요.", v.id);
            }
            if (!old) for (const p of await db.prepare("SELECT * FROM prefs").all()) if (JSON.parse(p.json).areas?.includes(v.region)) await notify(p.user_id, "우리 동네에 새 실종 소식이 있어요", `${v.region} · ${clean.name}`, v.id);
          }
        } else if (c === "reports") {
          const dog = v.dogId ? await get("dogs", v.dogId) : null;
          if (v.dogId && !dog) fail(400, "연결할 신고를 찾을 수 없어요.");
          if (!old) {
            await ipRate(req, "sighting");
            if (dog?.status === "reunited") fail(409, "이미 재회한 신고예요.");
            if (!["목격", "보호 중", "기관 인계"].includes(v.kind)) fail(400, "발견 상태를 확인해주세요.");
            if (v.heading !== null && v.heading !== undefined && (!Number.isFinite(v.heading) || v.heading < 0 || v.heading >= 360)) fail(400, "방향을 확인해주세요.");
            clean = {
              id: v.id,
              dogId: dog?.id || null,
              kind: v.kind,
              region: text(v.region, 20, true),
              coords: point(v.coords),
              location: text(v.location, 150, true),
              time: time(v.time),
              heading: v.stationary ? null : v.heading ?? null,
              stationary: !!v.stationary,
              description: text(v.description || ""),
              image: photo(v.image),
              color: text(v.color || "모름", 20),
              size: text(v.size || "모름", 10),
              status: "확인 전",
              messages: []
            };
            if (dog) await notify(dog.ownerId, "새로운 목격 제보가 도착했어요", `${dog.name} · ${clean.location}`, dog.id);
            // 어느 신고에도 연결되지 않은 제보는 근처의 비슷한 실종 신고 보호자에게 알린다.
            else for (const { dog: d, km } of similarDogs({ ...clean, ownerId: req.user.id }, (await rows("dogs")).filter(d => !d.hidden))) {
              const n = similarNotice(d, clean, km);
              await notify(d.ownerId, n.title, n.body, d.id);
            }
          } else {
            const dogOwner = (await get("dogs", old.dogId))?.ownerId;
            const party = old.ownerId === req.user.id || dogOwner === req.user.id;
            clean = {
              ...old
            };
            const changes = Object.keys(v).filter(k => JSON.stringify(v[k]) !== JSON.stringify(old[k]) && !["canChat", "canManage", "canDelete", "hidden", "ownerId", "revision", "approximate"].includes(k));
            for (const key of changes) {
              if (key === "messages") {
                if (!party) fail(403, "보호자와 제보자만 대화할 수 있어요.");
                await ipRate(req, "message");
                if (!Array.isArray(v.messages) || v.messages.length !== old.messages.length + 1 || JSON.stringify(v.messages.slice(0, -1)) !== JSON.stringify(old.messages)) fail(409, "대화가 업데이트되었어요. 다시 확인해주세요.");
                const m = {
                  id: randomUUID(),
                  text: text(v.messages.at(-1).text, 1000, true),
                  time: now(),
                  senderId: req.user.id
                };
                clean.messages = [...old.messages, m];
                await notify(old.ownerId === req.user.id ? dogOwner : old.ownerId, "새로운 메시지가 도착했어요", "목격 제보의 대화를 확인해주세요.", old.dogId);
              } else if (key === "status") {
                if (dogOwner !== req.user.id) fail(403, "보호자만 제보 상태를 바꿀 수 있어요.");
                if (!REPORT_STATUSES.includes(v.status)) fail(400, "제보 상태를 확인해주세요.");
                clean.status = v.status;
              } else if (key === "dogId") {
                if (old.dogId || !dog || dog.ownerId !== req.user.id) fail(403, "내 실종 신고에만 연결할 수 있어요.");
                clean.dogId = dog.id;
                await notify(old.ownerId, "발견 제보가 실종 신고에 연결됐어요", `${dog.name}의 보호자가 제보를 확인했어요.`, dog.id);
              } else fail(403, "변경할 수 없는 제보 항목이에요.");
            }
          }
        } else if (c === "updates") {
          const dog = await get("dogs", v.dogId);
          if (!dog || dog.ownerId !== req.user.id || old) fail(403, "보호자만 수색 상황을 남길 수 있어요.");
          clean = {
            id: v.id,
            dogId: dog.id,
            text: text(v.text, 1000, true),
            time: now()
          };
        } else if (c === "stories") {
          if (old && old.ownerId !== req.user.id) fail(403, "내 후기만 수정할 수 있어요.");
          if (!old) await ipRate(req, "story");
          clean = {
            id: v.id,
            title: text(v.title, 100, true),
            text: text(v.text, 3000, true),
            image: photo(v.image),
            time: old?.time || now()
          };
        } else if (c === "moderation") {
          if (old) {
            if (req.user.role !== "admin") fail(403, "운영자 권한이 필요해요.");
            clean = {
              ...old,
              resolved: !!v.resolved
            };
          } else {
            await ipRate(req, "flag");
            clean = {
            id: v.id,
            target: text(v.target, 80, true),
            reason: text(v.reason, 1200, true),
            time: now(),
            resolved: false
            };
          }
        }
        await put(c, clean, old?.ownerId || req.user.id);
      }
      if (req.body.preferences) {
        const p = req.body.preferences;
        if (!Array.isArray(p.saved) || p.saved.length > 300 || p.saved.some(v => typeof v !== "string" || v.length > 80) || !Array.isArray(p.areas) || p.areas.some(a => !REGIONS.includes(a))) fail(400, "관심 지역과 저장 목록을 확인해주세요.");
        await db.prepare("INSERT INTO prefs VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET json=excluded.json").run(req.user.id, JSON.stringify(selected(p, ["saved", "areas"])));
      }
      for (const nid of req.body.readNotifications || []) {
        const row = await db.prepare("SELECT json FROM notices WHERE id=? AND user_id=?").get(nid, req.user.id);
        if (row) {
          const n = JSON.parse(row.json);
          n.read = true;
          await db.prepare("UPDATE notices SET json=? WHERE id=?").run(JSON.stringify(n), nid);
        }
      }
    });
    res.json(await snapshot(req.user));
  });
  // 내가 올린 실종 신고·목격 제보·이야기를 지운다. 제보 안의 대화도 함께 지워지고,
  // 더 쓰이지 않는 사진은 하루 뒤 정리(media.cleanup)에서 지운다.
  app.post("/api/docs/delete", async (req, res) => {
    await rate(`delete:${who(req)}`, 30);
    const c = req.body.collection, id = req.body.id;
    if (!publicCollections.includes(c) || typeof id !== "string") fail(400, "지울 글을 확인해주세요.");
    await db.transaction(async () => {
      const doc = await get(c, id);
      if (!doc) fail(404, "이미 지워졌거나 찾을 수 없는 글이에요.");
      if (!req.user.id || doc.ownerId !== req.user.id) fail(403, "내가 올린 글만 지울 수 있어요.");
      await db.prepare("DELETE FROM docs WHERE collection=? AND id=?").run(c, id);
      if (c === "dogs") {
        // 계정 삭제와 같게: 수색 상황은 함께 지우고, 이웃의 제보는 남기되 연결만 끊는다.
        await db.prepare("DELETE FROM docs WHERE collection='updates' AND json::jsonb->>'dogId'=?").run(id);
        for (const row of await db.prepare("SELECT id,json FROM docs WHERE collection='reports' AND json::jsonb->>'dogId'=?").all(id))
          await db.prepare("UPDATE docs SET json=?,revision=revision+1 WHERE collection='reports' AND id=?").run(JSON.stringify({ ...JSON.parse(row.json), dogId: null }), row.id);
      }
    });
    res.json(await snapshot(req.user));
  });
  // 운영자: 문제 있는 글을 숨기거나 다시 보이게 한다. 지우지 않고 문서 안의 hidden 표시만 바꾼다(되돌릴 수 있게).
  app.post("/api/admin/hide", async (req, res) => {
    if (req.user.role !== "admin") fail(403, "운영자 권한이 필요해요.");
    const c = req.body.collection, id = req.body.id;
    if (!publicCollections.includes(c) || typeof id !== "string") fail(400, "숨길 글을 확인해주세요.");
    const doc = await get(c, id);
    if (!doc) fail(404, "글을 찾을 수 없어요.");
    const { ownerId: _o, revision: _r, ...data } = doc;
    if (req.body.hidden) data.hidden = true;
    else delete data.hidden;
    await db.prepare("UPDATE docs SET json=?,revision=revision+1 WHERE collection=? AND id=?").run(JSON.stringify(data), c, id);
    res.json(await snapshot(req.user));
  });
  app.get("/api/push/key", (req, res) => res.json({
    publicKey: keys.publicKey,
    configured: !!process.env.PUSH_SUBJECT
  }));
  app.post("/api/push/subscribe", async (req, res) => {
    const s = req.body;
    let url;
    try {
      url = new URL(s.endpoint);
    } catch {
      fail(400, "잘못된 알림 주소예요.");
    }
    if (url.protocol !== "https:" || !["fcm.googleapis.com", "updates.push.services.mozilla.com", "web.push.apple.com", "wns2-par02p.notify.windows.com"].some(host => url.hostname === host || url.hostname.endsWith("." + host)) || url.port || url.username || url.password) fail(400, "지원하지 않는 푸시 제공자예요.");
    text(s.keys?.p256dh, 200, true);
    text(s.keys?.auth, 100, true);
    await identify(req, res);
    await db.prepare("INSERT INTO subscriptions VALUES(?,?,?) ON CONFLICT(endpoint) DO UPDATE SET user_id=excluded.user_id,json=excluded.json").run(s.endpoint, req.user.id, JSON.stringify(s));
    res.json({
      ok: true
    });
  });
  app.post("/api/push/unsubscribe", async (req, res) => {
    await db.prepare("DELETE FROM subscriptions WHERE user_id=? AND endpoint=?").run(req.user.id, text(req.body.endpoint, 2000, true));
    res.json({
      ok: true
    });
  });
  let processing = false;
  async function flushPush() {
    if (processing || !pushSender && !process.env.PUSH_SUBJECT) return;
    processing = true;
    try {
      const deadline=Date.now()+40000;
      while(Date.now()<deadline){
        const jobs=await db.prepare("UPDATE outbox SET next_at=? WHERE id IN (SELECT id FROM outbox WHERE next_at<=? ORDER BY next_at LIMIT 4 FOR UPDATE SKIP LOCKED) RETURNING *").all(Date.now()+120000,Date.now());
        if(!jobs.length)break;
        await Promise.all(jobs.map(async job=>{
        const s = await db.prepare("SELECT json FROM subscriptions WHERE endpoint=?").get(job.endpoint);
        if (!s) {
          await db.prepare("DELETE FROM outbox WHERE id=?").run(job.id);
          return;
        }
        try {
          await (pushSender || ((sub, payload) => webpush.sendNotification(sub, payload, {
            vapidDetails: {
              subject: process.env.PUSH_SUBJECT,
              ...keys
            },
            TTL: 3600,
            timeout: 8000
          })))(JSON.parse(s.json), job.payload);
          await db.prepare("DELETE FROM outbox WHERE id=?").run(job.id);
        } catch (e) {
          if ([404, 410].includes(e.statusCode)) {
            await db.prepare("DELETE FROM subscriptions WHERE endpoint=?").run(job.endpoint);
            await db.prepare("DELETE FROM outbox WHERE endpoint=?").run(job.endpoint);
          } else if (job.attempt >= 5) {
            await db.prepare("DELETE FROM outbox WHERE id=?").run(job.id);
          } else await db.prepare("UPDATE outbox SET attempt=attempt+1,next_at=? WHERE id=?").run(Date.now() + Math.min(3600000, 10000 * 2 ** job.attempt), job.id);
        }
        }));
      }
    } finally {
      processing = false;
    }
  }
  // 쓸모없어진 익명 계정 정리: 로그인 수단(이메일·카카오·비밀번호)이 없고, 세션이 다 끝났고,
  // 남긴 글·사진·알림 구독이 없는 계정. 대화는 내 제보 안에만 쓸 수 있어 글이 없으면 대화도 없다. 한 번에 500개씩.
  async function removeIdleAnonymous(){
    let removed=0;
    for(let round=0;round<10;round++){
      const ids=(await db.prepare(`SELECT id FROM users u WHERE email IS NULL AND password IS NULL AND COALESCE(role,'user')='user'
        AND NOT EXISTS (SELECT 1 FROM sessions s WHERE s.user_id=u.id) AND NOT EXISTS (SELECT 1 FROM docs d WHERE d.owner=u.id)
        AND NOT EXISTS (SELECT 1 FROM media m WHERE m.owner=u.id) AND NOT EXISTS (SELECT 1 FROM subscriptions p WHERE p.user_id=u.id) LIMIT 500`).all()).map(r=>r.id);
      if(!ids.length)break;
      for(const table of ['notices','prefs','account_tokens'])await db.prepare(`DELETE FROM ${table} WHERE user_id=ANY(?::text[])`).run(ids);
      removed+=(await db.prepare('DELETE FROM users WHERE id=ANY(?::text[]) AND email IS NULL AND password IS NULL AND NOT EXISTS (SELECT 1 FROM sessions s WHERE s.user_id=users.id)').run(ids)).changes;
      if(ids.length<500)break;
    }
    return removed;
  }
  app.get('/api/maintenance',async(req,res)=>{
    if(!process.env.CRON_SECRET||req.get('authorization')!==`Bearer ${process.env.CRON_SECRET}`)return res.sendStatus(403);
    // 2주 넘게 '찾고 있어요'인 신고의 보호자에게 아직 찾고 있는지 묻는다(알림은 바로 아래에서 보낸다).
    const reminded=await remindStale({db,dogs:await rows('dogs'),notify});
    // 공공데이터를 하루 한 번은 꼭 새로 받는다(실패해도 다른 정리는 계속).
    const publicSync=await publicData.sync({force:true}).catch(e=>({error:e.message}));
    await flushPush();
    await media.cleanup();
    await db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());
    await db.prepare('DELETE FROM account_tokens WHERE expires<?').run(Date.now());
    await db.prepare('DELETE FROM rate_limits WHERE reset_at<?').run(Date.now()-86400000);
    const anonymous=await removeIdleAnonymous();
    res.json({ok:true,reminded,publicSync,anonymous});
  });
  app.use("/api", (req, res) => res.status(404).json({
    error: "API 경로를 찾을 수 없어요."
  }));
  app.use(express.static(path.resolve("dist"), {
    maxAge: "1h",
    setHeaders(res, file) {
      if (file.endsWith("sw.js") || file.endsWith("index.html")) res.setHeader("Cache-Control", "no-cache");
    }
  }));
  app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);
    if(['40001','40P01','23505'].includes(err.code)){err.status=409;err.message='다른 요청과 겹쳤어요. 새로고침 후 다시 시도해주세요.';}
    res.status(err.status || 500).json({
      error: err.status ? err.message : "서버에서 처리하지 못했어요. 잠시 후 다시 시도해주세요."
    });
    // 원인을 찾을 수 있게 경로·메시지·스택을 남긴다. 요청 본문·쿠키·쿼리(토큰이 들어갈 수 있음)는 남기지 않는다.
    if (!err.status) console.error('Cloud request failed', {method:req.method,path:req.path,code:err.code||'internal',message:err.message,stack:err.stack});
  });
  return {
    app,
    db,
    flushPush,
    publicData,
    async close() {

      await db.close();
    }
  };
}
