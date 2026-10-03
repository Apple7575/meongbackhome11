import {createApp} from '../server/app.js';
export async function startTestServer(){
const mailbox=[];
// 테스트용 공공데이터: 서울 송파 보호소의 흰색 말티즈, 서울의 분실 신고 하나
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=','base64');
const sample={desertionNo:'e2e1',happenDt:new Date().toISOString().slice(0,10).replace(/-/g,''),happenPlace:'석촌호수 산책로',kindNm:'말티즈',colorCd:'흰색',age:'2023(년생)',weight:'3(Kg)',noticeNo:'서울-송파-e2e',noticeEdt:'20991231',popfile1:'http://openapi.animal.go.kr/openapi/service/rest/fileDownloadSrvc/files/shelter/e2e.jpg',processState:'보호중',sexCd:'F',specialMark:'분홍 하네스',careNm:'송파구 동물보호센터',careTel:'02-000-0000',careAddr:'서울특별시 송파구',orgNm:'서울특별시 송파구'};
const lost={happenDt:'2026-09-24 02:00:00.0',happenAddr:'서울특별시 송파구 올림픽로',happenPlace:'분수대',orgNm:'서울특별시 송파구',popfile:'http://openapi.animal.go.kr/openapi/service/rest/fileDownloadSrvc/files/loss/e2e.jpg',kindCd:'푸들',colorCd:'갈색',sexCd:'M',age:'3살',specialMark:'빨간 목줄',callName:'비공개',callTel:'010-0000-0000'};
const page=list=>({response:{header:{resultCode:'00'},body:{items:{item:list},totalCount:list.length}}});
const publicFetch=async url=>url.includes('fileDownloadSrvc')?new Response(png):Response.json(page(url.includes('abandonment')?(url.includes('state=notice')?[sample]:[]):[lost]));
process.env.DATA_GO_KR_KEY||='e2e-key';
const options={publicFetch,databasePath:':memory:',examples:true,publicOrigin:'http://127.0.0.1:5174',authRateLimit:1000,ipRateLimit:false,mailer:{configured:true,send:async mail=>mailbox.push(mail)}};
const service=process.env.CLOUD_TEST==='1'?await (await import('../tests/cloud-fixture.js')).createCloudFixture(options):createApp(options);
// Local test fixture only; this route is never mounted by the production server.
service.app.get('/__test/public-sync',async(req,res)=>res.json(await service.publicData.sync({force:true})));
service.app.get('/__test/mail',(req,res)=>res.json(mailbox.filter(mail=>mail.to===req.query.to)));
const server=service.app.listen(5174,'127.0.0.1');
return {server,async close(){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));await service.close();}};
}
