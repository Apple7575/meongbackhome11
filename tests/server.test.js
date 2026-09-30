import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../server/app.js";
import { randomUUID } from "node:crypto";
const photo =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=";
async function fixture(options = {}) {
  const service = createApp({
    databasePath: ":memory:",
    examples: false,
    ...options,
  });
  const server = service.app.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const client = () => {
    let cookie = "";
    return {
      async request(path, body) {
        const res = await fetch(origin + path, {
          method: body ? "POST" : "GET",
          headers: {
            ...(body ? { "Content-Type": "application/json" } : {}),
            Cookie: cookie,
            Origin: origin,
          },
          body: body ? JSON.stringify(body) : undefined,
        });
        if (res.headers.get("set-cookie"))
          cookie = res.headers.getSetCookie().at(-1).split(";")[0];
        return { status: res.status, data: await res.json() };
      },
      get cookie() {
        return cookie;
      },
    };
  };
  return {
    ...service,
    server,
    origin,
    client,
    async stop() {
      service.close();
      await new Promise((r) => server.close(r));
    },
  };
}
const register = async (c, email = `${randomUUID()}@example.com`) => {
  const r = await c.request("/api/auth/register", {
    email,
    password: "test-password-123",
    name: "보리 보호자",
  });
  assert.equal(r.status, 200);
  return email;
};
const dog = () => ({
  id: randomUUID(),
  name: "보리",
  breed: "말티즈",
  age: "3살",
  sex: "여아",
  color: "흰색",
  size: "소형",
  description: "하네스",
  image: photo,
  region: "서울",
  location: "송파구 석촌호수",
  coords: [37.51, 127.1],
  time: new Date(Date.now() - 3600000).toISOString(),
  accessory: "하네스",
  status: "missing",
});
const report = (d) => ({
  id: randomUUID(),
  dogId: d.id,
  kind: "목격",
  region: "서울",
  coords: [37.512, 127.11],
  location: "송리단길",
  time: new Date().toISOString(),
  heading: 90,
  description: "동쪽으로 갔어요",
  color: "흰색",
  size: "소형",
});
const change = (c, collection, value, revision) =>
  c.request("/api/changes", { operations: [{ collection, value, revision }] });
test("registered owner shares report with a second device; only owner can edit; revision protects concurrent changes", async () => {
  const f = await fixture();
  try {
    const a = f.client(),
      b = f.client();
    const email = await register(a);
    const d = dog();
    assert.equal((await change(a, "dogs", d)).status, 200);
    let other = (await b.request("/api/state")).data;
    assert.equal(other.dogs[0].name, "보리");
    assert.equal(other.dogs[0].canManage, false);
    assert.equal(
      (await change(b, "dogs", { id: d.id, name: "탈취" }, 1)).status,
      403,
    );
    const second = f.client();
    assert.equal(
      (
        await second.request("/api/auth/login", {
          email,
          password: "test-password-123",
        })
      ).status,
      200,
    );
    assert.equal(
      (await second.request("/api/state")).data.dogs[0].canManage,
      true,
    );
    assert.equal(
      (await change(a, "dogs", { id: d.id, name: "보리 수정" }, 1)).status,
      200,
    );
    assert.equal(
      (await change(second, "dogs", { id: d.id, name: "이전 수정" }, 1)).status,
      409,
    );
  } finally {
    await f.stop();
  }
});
test("an unlinked sighting alerts owners of similar missing dogs nearby, not far or different ones", async () => {
  const f = await fixture();
  try {
    const owner = f.client(), far = f.client(), witness = f.client();
    await register(owner);
    await register(far);
    const near = dog();
    assert.equal((await change(owner, "dogs", near)).status, 200);
    // 부산에서 잃어버린 흰색 소형견 보호자는 서울 목격 제보 알림을 받지 않는다.
    assert.equal((await change(far, "dogs", { ...dog(), name: "초코", region: "부산", location: "수영구", coords: [35.15, 129.11] })).status, 200);
    // 다른 색 강아지 목격은 알리지 않는다.
    assert.equal((await change(witness, "reports", { ...report(near), dogId: null, color: "검정색" })).status, 200);
    assert.equal((await owner.request("/api/state")).data.notifications.length, 0);
    assert.equal((await change(witness, "reports", { ...report(near), dogId: null })).status, 200);
    const notices = (await owner.request("/api/state")).data.notifications;
    assert.equal(notices.length, 1);
    assert.equal(notices[0].title, "혹시 우리 아이일까요?");
    assert.match(notices[0].body, /^보리와 비슷한 강아지를 \d+m 떨어진 송리단길에서 봤다는 제보가 있어요\.$/);
    assert.equal(notices[0].dogId, near.id);
    assert.equal((await far.request("/api/state")).data.notifications.length, 0);
  } finally {
    await f.stop();
  }
});
test("witness → owner notification → private chat → reunion notifications reach witness and follower", async () => {
  const f = await fixture();
  try {
    const a = f.client(),
      b = f.client(),
      c = f.client();
    await register(a);
    const d = dog();
    await change(a, "dogs", d);
    await c.request("/api/changes", {
      operations: [],
      preferences: { saved: [d.id], areas: ["서울"] },
    });
    const r = report(d);
    assert.equal((await change(b, "reports", r)).status, 200);
    let owner = (await a.request("/api/state")).data;
    assert.equal(owner.notifications[0].title, "새로운 목격 제보가 도착했어요");
    assert.equal(owner.reports[0].canChat, true);
    const update = await change(
      a,
      "reports",
      { id: r.id, messages: [{ text: "사진의 아이가 맞아요" }] },
      1,
    );
    assert.equal(update.status, 200);
    const witness = (await b.request("/api/state")).data;
    assert.equal(witness.reports[0].messages[0].text, "사진의 아이가 맞아요");
    const stranger = (await c.request("/api/state")).data;
    assert.equal(stranger.reports[0].messages.length, 0);
    assert.equal(stranger.reports[0].canChat, false);
    assert.equal(
      (await change(c, "reports", { id: r.id, status: "다른 강아지" }, 2))
        .status,
      403,
    );
    assert.equal(
      (await change(a, "dogs", { id: d.id, status: "reunited" }, 1)).status,
      200,
    );
    for (const client of [a, b, c])
      assert.ok(
        (await client.request("/api/state")).data.notifications.some((n) =>
          n.title.includes("가족의 품"),
        ),
      );
  } finally {
    await f.stop();
  }
});
test("protected-location reports redact precise coordinates and text for unrelated users", async () => {
  const f = await fixture();
  try {
    const a = f.client(),
      b = f.client(),
      c = f.client();
    await register(a);
    const d = dog();
    await change(a, "dogs", d);
    const r = {
      ...report(d),
      kind: "보호 중",
      coords: [37.512345, 127.112345],
      location: "비공개 집주소",
      description: "비공개 상세",
      image: photo,
    };
    await change(b, "reports", r);
    const stranger = (await c.request("/api/state")).data.reports[0];
    assert.notEqual(stranger.location, r.location);
    assert.notDeepEqual(stranger.coords, r.coords);
    assert.equal(stranger.image, "");
    assert.equal(stranger.heading, null);
    assert.equal(
      (await a.request("/api/state")).data.reports[0].location,
      r.location,
    );
  } finally {
    await f.stop();
  }
});
test("API rejects unsafe photos, invalid locations, forged admin updates and cross-origin writes", async () => {
  const f = await fixture();
  try {
    const a = f.client();
    await register(a);
    assert.equal(
      (await change(a, "dogs", { ...dog(), coords: [200, 300] })).status,
      400,
    );
    assert.equal(
      (await change(a, "dogs", { ...dog(), image: "javascript:alert(1)" }))
        .status,
      400,
    );
    const m = { id: randomUUID(), target: "id", reason: "허위 신고" };
    await change(a, "moderation", m);
    assert.equal(
      (await change(a, "moderation", { id: m.id, resolved: true }, 1)).status,
      403,
    );
    const r = await fetch(f.origin + "/api/changes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://evil.example",
      },
      body: '{"operations":[]}',
    });
    assert.equal(r.status, 403);
  } finally {
    await f.stop();
  }
});
test("push jobs survive retry and expired endpoints are removed without leaking notifications", async () => {
  let calls = 0;
  const f = await fixture({
    pushSender: async () => {
      calls++;
      if (calls === 1)
        throw Object.assign(new Error("temporary"), { statusCode: 503 });
    },
  });
  try {
    const a = f.client(),
      b = f.client();
    await register(a);
    await a.request("/api/push/subscribe", {
      endpoint: "https://fcm.googleapis.com/fcm/send/test-token",
      keys: { p256dh: "test", auth: "test" },
    });
    const d = dog();
    await change(a, "dogs", d);
    await change(b, "reports", report(d));
    await f.flushPush();
    assert.equal(f.db.prepare("SELECT attempt FROM outbox").get().attempt, 1);
    f.db.prepare("UPDATE outbox SET next_at=0").run();
    await f.flushPush();
    assert.equal(calls, 2);
    assert.equal(f.db.prepare("SELECT count(*) AS n FROM outbox").get().n, 0);
    assert.equal(
      (
        await a.request("/api/push/subscribe", {
          endpoint: "https://127.0.0.1/private",
          keys: { p256dh: "a", auth: "b" },
        })
      ).status,
      400,
    );
  } finally {
    await f.stop();
  }
});
test("SSE signals a new witness report to the owner without polling", async () => {
  const f = await fixture();
  const abort = new AbortController();
  try {
    const a = f.client(),
      b = f.client();
    await register(a);
    const d = dog();
    await change(a, "dogs", d);
    const stream = await fetch(f.origin + "/api/events", {
      headers: { Cookie: a.cookie },
      signal: abort.signal,
    });
    const reader = stream.body.getReader();
    await reader.read();
    await change(b, "reports", report(d));
    const event = await Promise.race([
      reader.read(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("No live event")), 2500),
      ),
    ]);
    assert.match(new TextDecoder().decode(event.value), /event: change/);
    abort.abort();
  } finally {
    abort.abort();
    await f.stop();
  }
});
test("database preserves records across a server restart", async () => {
  const file = `test-results/persistence-${randomUUID()}.sqlite`;
  let f = await fixture({ databasePath: file });
  const a = f.client(),
    email = await register(a),
    d = dog();
  await change(a, "dogs", d);
  await f.stop();
  f = await fixture({ databasePath: file });
  try {
    const b = f.client();
    await b.request("/api/auth/login", {
      email,
      password: "test-password-123",
    });
    const state = (await b.request("/api/state")).data;
    assert.equal(state.dogs[0].id, d.id);
    assert.equal(state.dogs[0].canManage, true);
  } finally {
    await f.stop();
  }
});
