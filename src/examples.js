import {seed} from './seed.js';

const sample=seed();
const extra=[
  ['demo-mochi','모찌',0,'인천','인천 연수구 송도 센트럴파크',[37.392,126.639]],
  ['demo-latte','라떼',1,'대구','대구 수성구 수성못 산책로',[35.828,128.617]],
  ['demo-haneul','하늘',2,'대전','대전 서구 한밭수목원',[36.369,127.388]],
  ['demo-cookie','쿠키',3,'제주','제주 제주시 한라수목원',[33.47,126.493]],
].map(([id,name,index,region,location,coords])=>({...sample.dogs[index],id,name,region,location,coords}));
const scenarios=[
  {places:['동호 산책로 벤치 옆','송파나루공원 북쪽 입구','송리단길 골목 입구','카페 거리 화단 옆','호수 방향 횡단보도 앞'],feature:'복숭아색 하네스, 왼쪽 앞발에 작은 연갈색 털이 있어요.',habit:'이름을 작게 부르면 고개를 돌려요. 큰 소리가 나면 몸을 낮추는 편이에요.',focus:'호수 북쪽 출입구와 송리단길 연결 골목'},
  {places:['남문 광장 산책로','공원 안내도 앞','장미광장 연결 길','나무 그늘 벤치 옆','공원 바깥 보행로'],feature:'초록색 목줄에 둥근 인식표가 있고, 귀 끝의 털이 짙어요.',habit:'사람에게 관심이 많지만 자전거가 지나가면 놀라요. 간식 봉지 소리에 반응해요.',focus:'남문 광장 주변과 장미광장 연결 산책로'},
  {places:['중앙공원 잔디광장','연못 옆 나무다리 입구','느티나무 산책길','공원 외곽 울타리 옆','주택가 연결 보행로'],feature:'오른쪽 귀에 베이지색 털이 있고 꼬리 끝은 하얘요. 목줄은 없어요.',habit:'낯선 사람과 거리를 두는 편이에요. 나무 그늘에서 쉬는 걸 좋아해요.',focus:'연못 주변과 공원 외곽 보행로'},
  {places:['해변공원 산책로','해변 방향 벤치 앞','광장 연결 보행로','화단 뒤 그늘','주택가 쪽 골목 입구'],feature:'등은 갈색, 가슴은 흰색이에요. 갈색 목줄과 짧은 꼬리가 특징이에요.',habit:'걸음이 빠르지 않고 벤치 주변 냄새를 오래 맡아요. 이름에 잘 반응해요.',focus:'해변공원 화단과 주택가 연결 골목'},
  {places:['공원 잔디마당 입구','수변 산책로 안내판','작은 다리 앞','산책로 그늘 벤치','공원 출입구 보행로'],feature:'크림빛 귀와 흰 몸통, 복숭아색 하네스가 특징이에요.',habit:'물가보다는 잔디 쪽을 좋아해요. 낯선 사람이 다가오면 한발 물러서요.',focus:'수변 산책로와 잔디마당 주변'},
  {places:['수성못 산책로 입구','데크길 안내도 옆','나무 사이 보행로','벤치 아래 그늘','상가 방향 보행로'],feature:'짙은 갈색 곱슬털, 초록색 목줄, 오른쪽 귀 끝의 짙은 털이 보여요.',habit:'벤치 아래에 들어가 쉬기도 해요. 부드럽게 이름을 부르면 반응해요.',focus:'데크길 벤치와 상가 방향 산책로'},
  {places:['수목원 입구 보행로','잔디광장 가장자리','나무 사이 산책길','쉼터 옆 화단','외곽 보행로 갈림길'],feature:'하얀 털과 쫑긋한 귀, 오른쪽 귀의 연한 베이지색 무늬가 특징이에요.',habit:'넓은 길보다 조용한 산책길을 좋아해요. 다른 강아지에게 관심을 보여요.',focus:'잔디광장 가장자리와 외곽 갈림길'},
  {places:['수목원 입구 산책로','안내판 옆 갈림길','나무 그늘 보행로','쉼터 벤치 옆','주차장 방향 산책길'],feature:'갈색 등과 하얀 가슴, 갈색 목줄, 짧은 다리가 특징이에요.',habit:'산책 중 자주 멈춰 냄새를 맡아요. 익숙한 이름을 들으면 귀를 세워요.',focus:'쉼터 주변과 주차장 방향 산책길'},
];
const stamp=hours=>new Date(Date.now()-hours*3600000).toISOString();
const dogs=[...sample.dogs,...extra].map((d,i)=>({...d,time:stamp(8+i*3),description:`${scenarios[i].feature} ${scenarios[i].habit}`,exampleProfile:scenarios[i],previewOnly:true,canManage:false}));
const offsets=[[.0007,.0004],[.0015,.0012],[.002,.0024],[.0024,.0031],[.0032,.0038]];
const headings=[35,90,135,null,70];
const observations=[
  '혼자 천천히 걸으며 주변 냄새를 맡고 있었어요. 잠깐 보여서 사진은 찍지 못했어요.',
  '털 색과 착용물이 신고 내용과 비슷했어요. 안내판 옆에서 잠시 멈췄다가 다시 걸었어요.',
  '보행로를 따라 이동하는 모습을 봤어요. 길 반대편에서 관찰해 인식표 글씨는 확인하지 못했어요.',
  '그늘에 머물러 쉬고 있었어요. 관찰하는 동안에는 다른 곳으로 이동하지 않았어요.',
  '갈림길에서 잠시 주위를 살핀 뒤 천천히 이동했어요. 주변에 동행하는 사람은 보이지 않았어요.',
];
const reports=dogs.flatMap((dog,i)=>scenarios[i].places.map((place,j)=>({
  id:`${dog.id}-sighting-${j+1}`,dogId:dog.id,kind:'목격',region:dog.region,
  coords:[dog.coords[0]+offsets[j][0],dog.coords[1]+offsets[j][1]],
  location:`${dog.region} · ${place}`,time:stamp([6,4,2.5,1,.35][j]+i*.08),heading:headings[j],stationary:j===3,
  status:['관련 목격','관련 목격','확인 중','관련 목격','확인 전'][j],
  description:observations[j],image:j===1||j===3?dog.image:'',
  color:dog.color,size:dog.size,demo:true,previewOnly:true,canManage:false,canChat:false,messages:[],
  exampleConversation:j===1?[
    {who:'보호자',text:`${dog.name}의 특징과 비슷해 보여요. 목줄이나 귀 색도 기억나시나요?`},
    {who:'제보자',text:scenarios[i].feature+' 가까이 다가가지는 않았어요.'},
    {who:'보호자',text:'알려주셔서 감사해요. 말씀해주신 장소 주변을 확인하고 있어요.'},
  ]:[],
})));
const candidates=dogs.map((dog,i)=>({id:`${dog.id}-candidate`,dogId:null,exampleFor:dog.id,kind:'목격',region:dog.region,coords:[dog.coords[0]-.001,dog.coords[1]+.002],location:`${dog.region} · ${scenarios[i].places[4]} 인근`,time:stamp(.7),heading:null,stationary:false,status:'확인 전',description:`${dog.color} 털의 ${dog.size} 강아지를 봤어요. 착용물은 확실하지 않아 사진과 특징을 추가로 비교하는 중이에요.`,color:dog.color,size:dog.size,demo:true,previewOnly:true,canManage:false,canChat:false,messages:[]}));
const updates=dogs.flatMap((dog,i)=>[
  {text:`최근 제보를 바탕으로 ${scenarios[i].focus}을 다시 확인하고 있어요. 가장 최근 제보는 아직 확인 전이에요.`,time:stamp(.2)},
  {text:`${scenarios[i].places[3]} 주변 수색을 마쳤어요. 머물러 있었다는 제보와 특징을 비교했고, 이후 이동 위치를 확인 중이에요.`,time:stamp(.8)},
  {text:`첫 목격 장소와 ${scenarios[i].places[1]} 주변을 확인했어요. 인근 안내소에 사진과 특징을 전달한 상황을 보여주는 예시예요.`,time:stamp(3)},
].map((u,j)=>({...u,id:`${dog.id}-update-${j}`,dogId:dog.id,demo:true,previewOnly:true})));

// Display fixtures never become real reports or replace server-owned records.
// 실제 신고가 이만큼 쌓이면 예시는 더 보여주지 않는다.
export const REAL_DOGS_TO_HIDE_EXAMPLES=10;
export function withExamples(state){
  const real=state.dogs.filter(d=>!d.demo&&!d.previewOnly);
  if(real.length>=REAL_DOGS_TO_HIDE_EXAMPLES)
    return {...state,dogs:real,reports:state.reports.filter(r=>!r.demo&&!r.previewOnly),updates:(state.updates||[]).filter(u=>!u.demo&&!u.previewOnly)};
  const existing=new Set(state.dogs.filter(d=>!d.previewOnly).map(d=>d.id));
  const added=dogs.filter(d=>!existing.has(d.id));
  const addedIds=new Set(added.map(d=>d.id));
  return {...state,
    dogs:[...state.dogs.filter(d=>!d.demo),...state.dogs.filter(d=>d.demo&&!d.previewOnly),...added],
    reports:[...state.reports.filter(r=>!r.previewOnly),...reports.filter(r=>addedIds.has(r.dogId)),...candidates.filter(r=>addedIds.has(r.exampleFor))],
    updates:[...(state.updates||[]).filter(u=>!u.previewOnly),...updates.filter(u=>addedIds.has(u.dogId))],
  };
}
