import test from 'node:test';
import assert from 'node:assert/strict';
import {profileAfterCheckin} from './checkin-profile.mjs';
import {assemblePlan,safetyState} from './plan-engine.mjs';
import {restorePlan} from './plan-cache.mjs';
const profile={answers:{type:'Physical therapy',age:'30–44'},followups:{concerns:'Possible emergency symptoms',clearance:'Yes',restrictions:'None reported'}};
test('an explicitly saved correction replaces the emergency answer and stale plan pause',()=>{
 const old=assemblePlan(profile);assert.equal(old.safety.paused,true);
 const corrected=profileAfterCheckin(profile,{concerns:'None reported',discomfort:'None reported'});
 const reloaded=JSON.parse(JSON.stringify(corrected));
 assert.equal(reloaded.followups.concerns,'None reported');
 assert.equal(safetyState(reloaded).paused,false);
 assert.equal(restorePlan(reloaded,{plan:old,profileFingerprint:JSON.stringify(profile)}).safety.paused,false);
 assert.equal(profile.followups.concerns,'Possible emergency symptoms');
 assert.equal(corrected.followups.clearance,'Yes');
});
test('worsening discomfort, severe discomfort and remaining concerns retain the pause',()=>{
 const worse=profileAfterCheckin(profile,{concerns:'None reported',discomfort:'More than usual'});
 assert.equal(worse.followups.concerns,'New or worsening symptoms');assert.equal(safetyState(worse).paused,true);
 for(const concerns of ['Possible emergency symptoms','I’m not sure','New or worsening symptoms'])assert.equal(safetyState(profileAfterCheckin(profile,{concerns,discomfort:'None reported'})).paused,true);
 const severe=profileAfterCheckin({...profile,answers:{...profile.answers,currentDiscomfort:'Severe discomfort'}},{concerns:'None reported',discomfort:'None reported'});
 assert.equal(safetyState(severe).paused,true);
 assert.throws(()=>profileAfterCheckin(profile,{}));
});
