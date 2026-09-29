import {createApp} from '../server/app.js';
export async function startTestServer(){
const mailbox=[];
const options={databasePath:':memory:',examples:true,publicOrigin:'http://127.0.0.1:5174',mailer:{configured:true,send:async mail=>mailbox.push(mail)}};
const service=process.env.CLOUD_TEST==='1'?await (await import('../tests/cloud-fixture.js')).createCloudFixture(options):createApp(options);
// Local test fixture only; this route is never mounted by the production server.
service.app.get('/__test/mail',(req,res)=>res.json(mailbox.filter(mail=>mail.to===req.query.to)));
const server=service.app.listen(5174,'127.0.0.1');
return {server,async close(){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));await service.close();}};
}
