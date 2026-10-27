import test from 'node:test';
import assert from 'node:assert/strict';
import {resetDemoAnswers} from './reset-demo.mjs';
test('requested reset clears only demo answers, plan and progress once',async()=>{
 const deleted=[];let marker=null;
 const storage={getItem:async()=>marker,setItem:async(_key,value)=>{marker=value;},deleteItem:async key=>deleted.push(key),deleteRecord:async key=>deleted.push(key)};
 assert.equal(await resetDemoAnswers(storage),true);
 assert.deepEqual(deleted,['physiolock.profile','physiolock.plan','physiolock.progress','physiolock-onboarding-v2']);
 assert.equal(await resetDemoAnswers(storage),false);assert.equal(deleted.length,4);
});
test('reset failure does not mark incomplete deletion as complete',async()=>{
 let committed=false;
 await assert.rejects(resetDemoAnswers({getItem:async()=>null,setItem:async()=>{committed=true;},deleteRecord:async()=>{throw new Error('storage failure');}}));
 assert.equal(committed,false);
});
