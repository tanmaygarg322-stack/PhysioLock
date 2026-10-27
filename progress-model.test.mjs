import test from 'node:test';
import assert from 'node:assert/strict';
import {localDate,weekDates,progressSummary,validateCheckin} from './progress-model.mjs';
const now=new Date(2026,9,28,12),profile={answers:{days:['Monday','Wednesday','Friday']}};
test('weeks use local Monday boundaries across month and year changes',()=>{
 assert.deepEqual(weekDates(new Date(2026,0,1,12)),['2025-12-29','2025-12-30','2025-12-31','2026-01-01','2026-01-02','2026-01-03','2026-01-04']);
 assert.equal(localDate('2026-02-30'),null);assert.ok(localDate('2024-02-29'));
});
test('weekly metrics count latest daily reports once and separate extra sessions from planned completion',()=>{
 const entries=[{id:'new',date:'2026-10-26',at:'2026-10-28T12:00:00Z',completion:'Partly completed',minutes:5},{id:'old',date:'2026-10-26',at:'2026-10-26T12:00:00Z',completion:'Completed',minutes:10},{id:'tue',date:'2026-10-27',at:'2026-10-27T12:00:00Z',completion:'Completed',minutes:8},{id:'wed',date:'2026-10-28',at:'2026-10-28T12:00:00Z',completion:'Completed',minutes:15}];
 const summary=progressSummary(profile,entries,now);assert.equal(summary.planned,3);assert.equal(summary.plannedDone,1);assert.equal(summary.completed,2);assert.equal(summary.minutes,28);assert.equal(summary.percent,33);assert.equal(summary.trend.at(-1).completed,2);
});
test('empty and legacy history work without inventing minutes or ratings',()=>{
 const empty=progressSummary({answers:{}},[],now);assert.equal(empty.percent,0);assert.equal(empty.minutes,0);assert.ok(empty.achievements.every(a=>!a.earned));
 const old=progressSummary(profile,[{id:'legacy',at:new Date(2026,9,26,12).toISOString(),completed:'Completed my approved routine'}],now);assert.equal(old.completed,1);assert.equal(old.minutes,0);assert.equal(old.achievements[0].earned,true);
});
test('check-ins validate actual time, past dates and optional discomfort and goals',()=>{
 const form={date:'2026-10-28',completion:'Completed',minutes:'12',difficulty:'Manageable',before:2,after:1,concerns:'None reported',goalRatings:{Walking:4}};
 assert.equal(validateCheckin(form,now).minutes,12);
 assert.equal(validateCheckin({...form,completion:'Skipped',minutes:'',difficulty:''},now).minutes,0);
 for(const patch of [{date:'2026-10-29'},{minutes:''},{minutes:'-2'},{minutes:'1.5'},{before:11},{after:-1},{difficulty:''},{concerns:''},{goalRatings:{Walking:6}}])assert.throws(()=>validateCheckin({...form,...patch},now));
 assert.equal(validateCheckin({...form,before:null,after:null},now).before,null);
});
