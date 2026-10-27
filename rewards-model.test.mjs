import test from 'node:test';
import assert from 'node:assert/strict';
import {rewardState} from './rewards-model.mjs';
const now=new Date(2026,9,28,12),profile={answers:{days:['Monday','Wednesday','Friday']}};
const log=(date,completion='Completed',extra={})=>({date,at:date+'T12:00:00Z',completion,...extra});
test('points have a daily cap and rest days receive the same award as completed sessions',()=>{
 const data=rewardState(profile,[log('2026-10-26','Skipped'),log('2026-10-26','Completed',{minutes:200,before:10,after:0}),log('2026-10-28','Partly completed')],{},now);
 assert.equal(data.points,20);assert.equal(data.weeklyLogged,2);assert.equal(data.weeklyTarget,3);
 assert.equal(rewardState(profile,[log('2026-10-26','Skipped')],{},now).points,10);
});
test('ledger retains earned participation across gaps and does not double-award on reload',()=>{
 const a=rewardState(profile,[log('2026-09-07'),log('2026-10-26')],{},now);
 const b=rewardState(profile,[log('2026-10-26')],a.ledger,now);assert.equal(a.points,b.points);assert.equal(b.weeks,2);assert.equal(b.recentWeeks.filter(w=>w.participated).length,1);
});
test('badge milestones use distinct days and reflections, not pain improvement',()=>{
 const entries=['2026-10-01','2026-10-05','2026-10-06','2026-10-07','2026-10-12','2026-10-26'].map(d=>log(d));entries[0].goalRatings={Walking:1};
 const data=rewardState(profile,entries,{},now);assert.ok(data.badges.every(b=>b.earned));assert.equal(data.points,60);
});
test('future entries and invalid dates do not earn rewards; locked styles cannot be applied',()=>{
 const data=rewardState(profile,[log('2026-10-30'),log('2026-02-30')],{themeId:'sunshine',avatarId:'mountain'},now);assert.equal(data.points,0);assert.equal(data.ledger.themeId,'teal');assert.equal(data.ledger.avatarId,'initials');
 const unlocked=rewardState(profile,['2026-10-01','2026-10-05','2026-10-06'].map(d=>log(d)),{themeId:'lavender',avatarId:'seedling'},now);assert.equal(unlocked.ledger.themeId,'lavender');assert.equal(unlocked.ledger.avatarId,'seedling');
});
