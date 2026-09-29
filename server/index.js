import { createApp } from "./app.js";
import {runtimeConfig} from './runtime-config.js';
import {scheduleBackups} from './backups.js';
const config=runtimeConfig();
if(config.origin)process.env.PUBLIC_ORIGIN=config.origin;
const service = createApp({
  examples: process.env.SEED_EXAMPLES !== "false",
  databasePath: config.databasePath,
});
const stopBackups=process.env.NODE_ENV==='production'?scheduleBackups(service.db,config.backupDir,{hours:Number(process.env.BACKUP_INTERVAL_HOURS||24),keep:Number(process.env.BACKUP_KEEP||7)}):async()=>{};
const server = service.app.listen(
  config.port,
  "0.0.0.0",
  () =>
    console.log(
      "멍백홈 서버: http://localhost:" + config.port,
    ),
);
let stopping=false;
const stop = async () => {
  if(stopping)return;stopping=true;
  await stopBackups();
  service.close();
  server.closeAllConnections();
  server.close(() => process.exit(0));
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
