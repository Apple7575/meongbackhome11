import {spawn} from 'node:child_process';
import {startTestServer} from './e2e-server.mjs';
if(process.argv.includes('--cloud')){process.env.CLOUD_TEST='1';process.argv.splice(process.argv.indexOf('--cloud'),1);}
const fixture=await startTestServer();
await new Promise(resolve=>fixture.server.once('listening',resolve));
const child=spawn(process.execPath,['node_modules/@playwright/test/cli.js','test',...process.argv.slice(2)],{stdio:'inherit',windowsHide:true});
process.on('SIGINT',()=>child.kill());
process.on('SIGTERM',()=>child.kill());
try{process.exitCode=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',code=>resolve(code??1));});}
finally{await fixture.close();}
