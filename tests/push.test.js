import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, createVerify } from "node:crypto";
import { createFcmSender, serviceAccount, nativeSubscription } from "../server/push.js";

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const account = { project_id: "meongback-test", client_email: "push@meongback-test.iam.gserviceaccount.com", private_key: privateKey.export({ type: "pkcs8", format: "pem" }), token_uri: "https://oauth2.googleapis.com/token" };

test("service account is read from raw or base64 JSON", () => {
  assert.equal(serviceAccount({ FIREBASE_SERVICE_ACCOUNT: JSON.stringify(account) }).project_id, "meongback-test");
  assert.equal(serviceAccount({ FIREBASE_SERVICE_ACCOUNT: Buffer.from(JSON.stringify(account)).toString("base64") }).project_id, "meongback-test");
  assert.equal(serviceAccount({ FIREBASE_SERVICE_ACCOUNT: "nope" }), null);
  assert.equal(serviceAccount({}), null);
});

test("native subscriptions only accept FCM-looking tokens on android or ios", () => {
  const token = "abc:APA91b" + "x".repeat(30);
  assert.deepEqual(nativeSubscription({ token, platform: "ios" }), { endpoint: `fcm:${token}`, json: { type: "fcm", token, platform: "ios" } });
  assert.equal(nativeSubscription({ token: "<script>", platform: "ios" }), null);
  assert.equal(nativeSubscription({ token, platform: "web" }), null);
});

test("FCM sender signs a JWT once, sends the notification, and marks unregistered tokens as gone", async () => {
  const calls = [];
  let send = 0;
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    if (url === account.token_uri) {
      const assertion = new URLSearchParams(init.body).get("assertion");
      const [head, claims, sig] = assertion.split(".");
      assert.ok(createVerify("RSA-SHA256").update(`${head}.${claims}`).verify(publicKey, sig, "base64url"));
      assert.equal(JSON.parse(Buffer.from(claims, "base64url")).scope, "https://www.googleapis.com/auth/firebase.messaging");
      return Response.json({ access_token: "ya29.test", expires_in: 3600 });
    }
    send++;
    if (send === 2) return Response.json({ error: { status: "NOT_FOUND", details: [{ errorCode: "UNREGISTERED" }] } }, { status: 404 });
    return Response.json({ name: "projects/meongback-test/messages/1" });
  };
  const sendFcm = createFcmSender({ env: { FIREBASE_SERVICE_ACCOUNT: JSON.stringify(account) }, fetchImpl });
  await sendFcm("device-token", JSON.stringify({ title: "새 목격 제보", body: "보리를 봤어요", url: "/#/dog/d1" }));
  const message = JSON.parse(calls[1].init.body).message;
  assert.equal(calls[1].url, "https://fcm.googleapis.com/v1/projects/meongback-test/messages:send");
  assert.equal(calls[1].init.headers.authorization, "Bearer ya29.test");
  assert.deepEqual(message.notification, { title: "새 목격 제보", body: "보리를 봤어요" });
  assert.deepEqual(message.data, { url: "/#/dog/d1" });
  await assert.rejects(sendFcm("old-token", JSON.stringify({ title: "t", body: "b" })), (e) => e.statusCode === 410);
  // 접근 토큰은 한 번만 받는다.
  assert.equal(calls.filter((c) => c.url === account.token_uri).length, 1);
});
