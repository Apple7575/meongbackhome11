import { DatabaseSync, backup } from "node:sqlite";
import { mkdirSync } from "node:fs";
mkdirSync("data/backups", { recursive: true });
const file = `data/backups/meongback-${new Date().toISOString().replace(/[:.]/g, "-")}.sqlite`;
const db = new DatabaseSync(
  process.env.DATABASE_PATH || "data/meongback.sqlite",
);
await backup(db, file);
db.close();
console.log("Backup saved:", file);
