import test from 'node:test';
import assert from 'node:assert/strict';
import {notificationItems} from './notifications-model.mjs';
const profile={answers:{type:'Physical therapy',age:'30–44',days:['Monday','Wednesday','Friday'],'hour-Monday':'5 PM','duration-Monday':'10 minutes','hour-Wednesday':'6 PM','duration-Wednesday':'15 minutes','hour-Friday':'7 AM','duration-Friday':'20 minutes'},followups:{concerns:'None reported'}};
const now=new Date(2026,9,26,12);
test('appointments use saved providers and local times, exclude past dates, and sort by time',()=>{
 const items=notificationItems(profile,{appointments:[{id:'past',date:'2026-10-26',minutes:540,physician:'Past'},{id:'future',date:'2026-10-28',minutes:540,physician:'Lee'},{id:'today',date:'2026-10-26',minutes:780,physician:'Chen'}]},now).filter(i=>i.category==='Appointments');
 assert.equal(items.length,2);assert.equal(items[0].title,'Appointment with Chen');assert.equal(new Date(items[0].at).getHours(),13);assert.equal(items[1].title,'Appointment with Lee');
});
test('exercise reminders use each selected day and time, and hide during a safety pause',()=>{
 const items=notificationItems(profile,{},now).filter(i=>i.category==='Exercises');assert.equal(items.length,3);assert.deepEqual(items.map(i=>new Date(i.at).getHours()),[17,18,7]);
 const paused=notificationItems({...profile,followups:{concerns:'Possible emergency symptoms'}},{},now);assert.ok(!paused.some(i=>i.category==='Exercises'));assert.equal(paused[0].title,'Review your symptom report');assert.ok(paused[0].text);
});
test('check-ins suppress daily prompts, no appointments are invented, and IDs remain stable',()=>{
 const entries={progress:[{date:'2026-10-26',at:now.toISOString(),completion:'Skipped'}]};const items=notificationItems(profile,entries,now);
 assert.ok(!items.some(i=>i.id==='checkin-2026-10-26'));assert.ok(items.some(i=>i.id==='weekly-2026-10-26'));assert.ok(!items.some(i=>i.category==='Appointments'));
 assert.deepEqual(items.map(i=>i.id),notificationItems(profile,entries,now).map(i=>i.id));
});
