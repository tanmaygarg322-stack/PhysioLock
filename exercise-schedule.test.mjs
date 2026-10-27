import test from 'node:test';
import assert from 'node:assert/strict';
import {exerciseSchedule} from './exercise-schedule.mjs';
const suggestions={ageGroup:'30–44',items:['05','06','09','10','15'].map(n=>({id:`pdf-neck-${n}`}))};
const profile={answers:{type:'Physical therapy',age:'30–44',days:['Monday','Wednesday','Friday','Sunday'],'hour-Monday':'5 AM','duration-Monday':'5 minutes','hour-Wednesday':'12 PM','duration-Wednesday':'10 minutes','hour-Friday':'9 PM','duration-Friday':'15 minutes','hour-Sunday':'11 AM','duration-Sunday':'20 minutes'}};
test('each saved day uses its own time and length, rotates matches and never overfills',()=>{
 const days=exerciseSchedule(profile,suggestions);
 assert.deepEqual(days.map(d=>d.activities.length),[1,3,5,5]);
 assert.deepEqual(days.map(d=>d.unusedMinutes),[2,1,0,5]);
 assert.deepEqual(days.map(d=>d.start),['5:00 AM','12:00 PM','9:00 PM','11:00 AM']);
 assert.equal(days[1].activities[0].record.id,'pdf-neck-06');
 assert.equal(days[1].activities[2].end,'12:09 PM');
 assert.equal(days[2].activities[0].record.id,'pdf-neck-15');
 assert.equal(days[2].activities[4].end,'9:15 PM');
 for(const day of days){assert.equal(new Set(day.activities.map(a=>a.record.id)).size,day.activities.length);assert.ok(day.activities.length*3<=day.durationMinutes);assert.ok(day.activities.every(a=>a.canPractice===false));}
});
test('missing and invalid values do not invent slots; preference edits immediately recompute',()=>{
 const p=structuredClone(profile);delete p.answers['hour-Monday'];p.answers['duration-Wednesday']='30 minutes';p.answers['hour-Friday']='13 PM';p.answers['duration-Sunday']='5 minutes';
 const days=exerciseSchedule(p,suggestions);
 assert.ok(days.slice(0,3).every(d=>d.status==='missing_information'&&!d.activities.length));
 assert.equal(days[3].activities.length,1);assert.equal(days[3].end,'11:05 AM');
});
test('paused, stale age, infant matches and empty results never get scheduled',()=>{
 assert.ok(exerciseSchedule(profile,suggestions,true).every(d=>d.status==='paused'&&!d.activities.length));
 assert.ok(exerciseSchedule(profile,{...suggestions,ageGroup:'75+'}).every(d=>!d.activities.length));
 assert.ok(exerciseSchedule(profile,{...suggestions,items:[{id:'pdf-neck-01'}]}).every(d=>!d.activities.length));
 assert.ok(exerciseSchedule(profile,undefined).every(d=>d.status==='awaiting_matches'));
});
test('duplicate candidates do not fill a day and source records are not changed',()=>{
 const before=JSON.stringify(suggestions);
 const days=exerciseSchedule(profile,{...suggestions,items:[suggestions.items[0],suggestions.items[0]]});
 assert.ok(days.every(d=>d.activities.length===1));assert.equal(JSON.stringify(suggestions),before);
 assert.deepEqual(exerciseSchedule({},suggestions),[]);
});
