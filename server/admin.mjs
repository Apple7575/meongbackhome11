import { DatabaseSync } from "node:sqlite";
const email = process.argv[2];
if (!email) {
  console.error("Usage: node server/admin.mjs registered-admin@example.com");
  process.exit(1);
}
const db = new DatabaseSync(
  process.env.DATABASE_PATH || "data/meongback.sqlite",
);
const result = db
  .prepare("UPDATE users SET role='admin' WHERE email=?")
  .run(email.toLowerCase());
console.log(
  result.changes === 1
    ? "운영자 권한을 부여했어요."
    : "등록된 계정을 찾을 수 없어요.",
);
db.close();
