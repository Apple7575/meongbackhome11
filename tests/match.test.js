import test from 'node:test';
import assert from 'node:assert/strict';
import {similarDogs,similarNotice} from '../server/match.js';
const base={id:'d',ownerId:'o',name:'보리',status:'missing',color:'흰색, 갈색',size:'소형',coords:[37.51,127.1],time:'2026-09-29T10:00:00Z'};
const seen={dogId:null,ownerId:'w',color:'갈색',size:'소형',coords:[37.52,127.1],time:'2026-09-29T12:00:00Z',location:'공원'};
test('similar dogs: nearby, lost before the sighting, matching colour and size, never the reporter or reunited/demo dogs',()=>{
  assert.equal(similarDogs(seen,[base]).length,1);
  assert.equal(similarDogs({...seen,time:'2026-09-29T09:00:00Z'},[base]).length,0);
  assert.equal(similarDogs({...seen,size:'대형'},[base]).length,0);
  assert.equal(similarDogs(seen,[{...base,status:'reunited'},{...base,id:'x',demo:true},{...base,id:'y',ownerId:'w'}]).length,0);
  assert.equal(similarDogs({...seen,dogId:'d'},[base]).length,0);
  // 색·크기를 모르면 2km 안만
  assert.equal(similarDogs({...seen,color:'모름',size:'모름',coords:[37.54,127.1]},[base]).length,0);
  assert.equal(similarDogs({...seen,color:'모름',size:'모름'},[base]).length,1);
});
test('similar notice uses the right particle and a readable distance',()=>{
  assert.equal(similarNotice({name:'보리'},{location:'공원'},0.43).body,'보리와 비슷한 강아지를 400m 떨어진 공원에서 봤다는 제보가 있어요.');
  assert.equal(similarNotice({name:'감자탕'},{location:'역 앞'},2.34).body,'감자탕과 비슷한 강아지를 2.3km 떨어진 역 앞에서 봤다는 제보가 있어요.');
});
