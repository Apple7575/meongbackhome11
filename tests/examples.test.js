import test from 'node:test';
import assert from 'node:assert/strict';
import {withExamples,REAL_DOGS_TO_HIDE_EXAMPLES} from '../src/examples.js';
const realDog=i=>({id:`real-${i}`,name:`실제${i}`,status:'missing'});
const empty={dogs:[],reports:[],updates:[]};
test('examples show until 10 real reports exist, then every example dog, sighting and update is hidden',()=>{
  const few=withExamples({...empty,dogs:Array.from({length:REAL_DOGS_TO_HIDE_EXAMPLES-1},(_,i)=>realDog(i))});
  assert.ok(few.dogs.some(d=>d.previewOnly));
  assert.ok(few.reports.some(r=>r.previewOnly));
  const enough=withExamples({...empty,dogs:Array.from({length:REAL_DOGS_TO_HIDE_EXAMPLES},(_,i)=>realDog(i)),reports:[{id:'r',dogId:'real-0'},{id:'d',demo:true}],updates:[{id:'u',demo:true}]});
  assert.equal(enough.dogs.length,REAL_DOGS_TO_HIDE_EXAMPLES);
  assert.ok(enough.dogs.every(d=>!d.previewOnly&&!d.demo));
  assert.deepEqual(enough.reports.map(r=>r.id),['r']);
  assert.equal(enough.updates.length,0);
});
