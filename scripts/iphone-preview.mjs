import {createApp} from '../server/app.js';
// Separate persistent preview database: do not expose development/test accounts.
const service=createApp({databasePath:'data/iphone-preview.sqlite',examples:true,secure:true,requireVerification:false});
const server=service.app.listen(3100,'127.0.0.1',()=>console.log('iPhone preview backend: http://127.0.0.1:3100'));
const stop=()=>{service.close();server.closeAllConnections();server.close(()=>process.exit(0));};
process.on('SIGINT',stop);process.on('SIGTERM',stop);
