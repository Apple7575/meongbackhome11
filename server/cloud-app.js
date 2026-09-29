import express from "express";
import { createPostgres } from "./postgres.js";
import { randomUUID, randomBytes, scryptSync, timingSafeEqual, createHash } from "node:crypto";
import {installMedia,createStorage} from './media.js';
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
export async function createApp({
  database,
  storage,
  defer = promise => promise.catch(() => {}),
  examples = false,
  pushSender,
  secure = process.env.NODE_ENV === "production",
  mailer = createMailer(),
  publicOrigin = process.env.PUBLIC_ORIGIN || '',
  requireVerification = secure
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
    const revision = ((await get(c, v.id))?.revision || 0) + 1;
    const clean = {
      ...v
    };
    delete clean.ownerId;
    delete clean.revision;
    delete clean.canManage;
    delete clean.canChat;
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
  async function notify(uid, title, body, dogId) {
    if (!uid || uid === "example") return;
    const n = {
      id: randomUUID(),
      title,
      body,
      dogId,
      time: now(),
      read: false
    };
    await db.prepare("INSERT INTO notices(id,user_id,json) VALUES(?,?,?)").run(n.id, uid, JSON.stringify(n));
    for (const s of await db.prepare("SELECT * FROM subscriptions WHERE user_id=?").all(uid)) await db.prepare("INSERT INTO outbox VALUES(?,?,?,?,?)").run(randomUUID(), s.endpoint, JSON.stringify({
      title,
      body,
      url: dogId ? `/#/dog/${dogId}` : "/#/my"
    }), 0, Date.now());
  }
  async function snapshot(user) {
    const all = {};
    for (const c of collections) all[c] = await rows(c);
    const canSee = r => r.ownerId === user.id || all.dogs.find(d => d.id === r.dogId)?.ownerId === user.id;
    return {
      ...all,
      user: {
        id: user.id,
        name: user.name,
        registered: !!user.email,
        role: user.role,
        email: user.email || null,
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
          canManage: owner
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
      profiles: all.profiles.filter(p => p.ownerId === user.id),
      moderation: all.moderation.filter(m => user.role === "admin" || m.ownerId === user.id),
      ...(await prefs(user.id)),
      notifications: (await db.prepare("SELECT json FROM notices WHERE user_id=? ORDER BY rowid DESC LIMIT 100").all(user.id)).map(r => JSON.parse(r.json)),
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
      const token = req.headers.cookie?.match(/(?:^|;\s*)mb_session=([a-f0-9]{64})(?:;|$)/)?.[1];
      const sess = token && (await db.prepare("SELECT user_id FROM sessions WHERE token=? AND expires>?").get(hash(token), Date.now()));
      let user = sess && (await db.prepare("SELECT * FROM users WHERE id=?").get(sess.user_id));
      if (!user) {
        const uid = randomUUID();
        await db.prepare("INSERT INTO users(id,name) VALUES(?,?)").run(uid, "이웃");
        user = await db.prepare("SELECT * FROM users WHERE id=?").get(uid);
        await session(res, uid);
      }
      req.user = user;
      req.token = token;
      next();
    } catch (e) {
      next(e);
    }
  });
  const rate = async (key, max) => {
    const r = await db.prepare("INSERT INTO rate_limits(key,count,reset_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN meongback.rate_limits.reset_at<? THEN 1 ELSE meongback.rate_limits.count+1 END,reset_at=CASE WHEN meongback.rate_limits.reset_at<? THEN EXCLUDED.reset_at ELSE meongback.rate_limits.reset_at END RETURNING count").get(hash(key), Date.now() + 60000, Date.now(), Date.now());
    if (r.count > max) fail(429, "잠시 후 다시 시도해주세요.");
  };
  const media=installMedia({app,db,storage:storage||createStorage(),rate});
  app.use('/api', (req,res,next)=>{res.on('finish',()=>{if(res.statusCode<400)defer(flushPush().catch(()=>{}));});next();});
  app.get("/api/state", async (req, res) => res.json(await snapshot(req.user)));
  app.post('/api/push/test', async (req, res) => {
    await rate(`push-test:${req.user.id}`, 2);
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
    origin: publicOrigin.replace(/\/$/, ''),
    async invalidate(uid) {
      await db.prepare('DELETE FROM sessions WHERE user_id=?').run(uid);
      await db.prepare('DELETE FROM outbox WHERE endpoint IN (SELECT endpoint FROM subscriptions WHERE user_id=?)').run(uid);
      await db.prepare('DELETE FROM subscriptions WHERE user_id=?').run(uid);

    }
  });
  app.post("/api/auth/:mode", async (req, res) => {
    await rate(`auth:${req.ip}`, 12);
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
    await rate(`write:${req.user.id}`, 60);
    const operations = req.body.operations;
    if (!Array.isArray(operations) || operations.length > 50) fail(400, "저장할 내용을 확인해주세요.");
    await db.exec("BEGIN IMMEDIATE");
    try {
      for (const op of operations) {
        const c = op.collection;
        if (!collections.includes(c)) fail(400, "허용되지 않은 항목이에요.");
        const v = op.value;
        if (!v || typeof v.id !== "string" || !/^[\w-]{1,80}$/.test(v.id)) fail(400, "잘못된 식별자예요.");
        const old = await get(c, v.id);
        if (old) for (const [key, value] of Object.entries(old)) if (!(key in v)) v[key] = value;
        if (old && old.demo) fail(403, "예시 신고는 수정할 수 없어요. 직접 신고를 등록해주세요.");
        if (old && op.revision !== old.revision) fail(409, "다른 기기에서 내용이 바뀌었어요. 새로고침 후 다시 확인해주세요.");
        await media.validate(v.image,req.user.id,old?.image);
        let clean;
        if (c === "dogs" || c === "profiles") {
          if (old && old.ownerId !== req.user.id) fail(403, "내 반려견 정보만 수정할 수 있어요.");
          clean = {
            id: v.id,
            name: text(v.name, 30, true),
            breed: text(v.breed, 40, true),
            age: text(v.age || "", 20),
            sex: text(v.sex || "모름", 10),
            color: text(v.color, 20, true),
            size: text(v.size, 10, true),
            description: text(v.description || ""),
            image: photo(v.image)
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
              accessory: text(v.accessory || "없음", 20),
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
          } else {
            const dogOwner = (await get("dogs", old.dogId))?.ownerId;
            const party = old.ownerId === req.user.id || dogOwner === req.user.id;
            clean = {
              ...old
            };
            const changes = Object.keys(v).filter(k => JSON.stringify(v[k]) !== JSON.stringify(old[k]) && !["canChat", "canManage", "ownerId", "revision", "approximate"].includes(k));
            for (const key of changes) {
              if (key === "messages") {
                if (!party) fail(403, "보호자와 제보자만 대화할 수 있어요.");
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
          } else clean = {
            id: v.id,
            target: text(v.target, 80, true),
            reason: text(v.reason, 1200, true),
            time: now(),
            resolved: false
          };
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
      await db.exec("COMMIT");
      res.json(await snapshot(req.user));

    } catch (e) {
      await db.exec("ROLLBACK");
      throw e;
    }
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
  app.get('/api/maintenance',async(req,res)=>{
    if(!process.env.CRON_SECRET||req.get('authorization')!==`Bearer ${process.env.CRON_SECRET}`)return res.sendStatus(403);
    await flushPush();
    await media.cleanup();
    await db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());
    await db.prepare('DELETE FROM account_tokens WHERE expires<?').run(Date.now());
    await db.prepare('DELETE FROM rate_limits WHERE reset_at<?').run(Date.now()-86400000);
    res.json({ok:true});
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
    if (!err.status) console.error('Cloud request failed', {code:err.code||'internal'});
  });
  return {
    app,
    db,
    flushPush,
    async close() {

      await db.close();
    }
  };
}
