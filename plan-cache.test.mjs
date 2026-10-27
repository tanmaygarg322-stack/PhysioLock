import test from 'node:test';
import assert from 'node:assert/strict';
import {profileFrom} from './questionnaire.mjs';
import {restorePlan} from './plan-cache.mjs';
import {exerciseSchedule} from './exercise-schedule.mjs';
const profile={...profileFrom({type:'Physical therapy',age:'30–44',injuryAreas:['Head, face or neck'],days:['Monday','Wednesday','Friday'],'hour-Monday':'5 PM','duration-Monday':'10 minutes','hour-Wednesday':'6 PM','duration-Wednesday':'15 minutes','hour-Friday':'7 PM','duration-Friday':'20 minutes'}),followups:{reason:'Mobility',restrictions:'None reported',discomfort:'None reported',clearance:'Yes',supervision:'Independent practice permitted',concerns:'None reported'}};
const saved={profileFingerprint:JSON.stringify(profile),plan:{mode:'ai',routine:[],pending:[],catalogSuggestions:{ageGroup:'30–44',items:[{id:'pdf-neck-05'},{id:'pdf-neck-06'},{id:'pdf-neck-09'}]}}};
test('schedule edits retain exercise names, media and descriptions without another AI request',()=>{
 const edited={...profileFrom({...profile.answers,'hour-Monday':'8 AM','duration-Monday':'5 minutes'}),followups:profile.followups};
 const restored=restorePlan(edited,saved),schedule=exerciseSchedule(edited,restored.catalogSuggestions);
 assert.equal(schedule[0].activities.length,1);assert.equal(schedule[0].activities[0].start,'8:00 AM');
 assert.ok(schedule.every(d=>d.activities.every(a=>a.record.name&&a.record.description&&a.record.image)));
 assert.equal(restored.schedule[0].time,'8 AM');
});
test('age, symptoms, restrictions and region changes invalidate cached selections',()=>{
 for(const edited of [{...profile,answers:{...profile.answers,age:'Under 13'}},{...profile,answers:{...profile.answers,injuryAreas:['Ankle, foot or toes']}},{...profile,followups:{...profile.followups,concerns:'New or worsening symptoms'}},{...profile,followups:{...profile.followups,restrictions:'New restriction'}}])assert.equal(restorePlan(edited,saved).catalogSuggestions,undefined);
});
test('missing or corrupt saved profile cannot supply cached exercises',()=>{
 assert.equal(restorePlan(profile,null).catalogSuggestions,undefined);
 assert.equal(restorePlan(profile,{...saved,profileFingerprint:'bad json'}).catalogSuggestions,undefined);
 assert.deepEqual(restorePlan(profile,saved).catalogSuggestions,saved.plan.catalogSuggestions);
});
