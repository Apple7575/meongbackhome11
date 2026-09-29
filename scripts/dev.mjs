import {spawn} from 'node:child_process';
const children=[spawn(process.execPath,['--watch','--env-file-if-exists=.env','server/index.js'],{stdio:'inherit',windowsHide:true}),spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','0.0.0.0',...process.argv.slice(2)],{stdio:'inherit',windowsHide:true})];
let stopping=false;const stop=()=>{if(stopping)return;stopping=true;children.forEach(c=>c.kill());};process.on('SIGINT',stop);process.on('SIGTERM',stop);children.forEach(c=>c.on('exit',code=>{if(!stopping){stop();process.exitCode=code||0;}}));
