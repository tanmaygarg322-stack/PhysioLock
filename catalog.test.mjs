import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {EXERCISE_CATALOG as catalog} from './catalog/catalog.mjs';
import {catalogPool,catalogSelection,movementRegions,reportedAgeContext} from './catalog-policy.mjs';
import {missingFollowups} from './plan-engine.mjs';
import {generatePlan,validateInput} from './server/service.mjs';
import {catalogDisplay} from './catalog-display.mjs';

const profile={answers:{type:'Physical therapy',age:'60–74',injuryAreas:['Head, face or neck'],hasPlan:'Not yet',currentDiscomfort:'Mild discomfort',ptGoals:['Maintain my current abilities']},followups:{reason:'Discuss mobility with therapist',restrictions:'None reported',discomfort:'No uncomfortable activities reported',clearance:'Yes',supervision:'Independent practice permitted',concerns:'None reported'}};
test('30–44 browse list and cached matches cannot display baby exercises',()=>{
 const adult={...profile,answers:{...profile.answers,age:'30–44'}};
 const stale={ageGroup:'Under 13',ageContext:{developmentStage:'Infant (under 1 year)'},items:[{id:'pdf-neck-01'}]};
 const view=catalogDisplay(adult,stale);
 assert.equal(view.records.length,48);assert(view.records.every(r=>r.ageGuidance.population!=='infant'));assert.equal(view.selected.length,0);assert.equal(view.stale,true);
 const mixed=catalogDisplay(adult,{ageGroup:'30–44',items:[{id:'pdf-neck-01'},{id:'pdf-neck-09'}]});
 assert.deepEqual(mixed.selected.map(x=>x.record.id),['pdf-neck-09']);
 const legacy=catalogDisplay({...adult,answers:{...adult.answers,age:'30-44'}});
 assert.equal(legacy.records.length,48);
});
test('browse view updates after age edits and requires unresolved child details',()=>{
 const infant={...profile,answers:{...profile.answers,age:'Under 13'},followups:{...profile.followups,developmentStage:'Infant (under 1 year)'}};
 assert.equal(catalogDisplay(infant).records.length,4);
 const adult={...infant,answers:{...infant.answers,age:'30–44'}};
 assert.equal(catalogDisplay(adult).records.length,48);
 assert.equal(catalogDisplay({...infant,followups:{...infant.followups,developmentStage:'I’m not sure'}}).records.length,0);
 const oldAdultMatch={ageGroup:'75+',items:[{id:'pdf-neck-09'}]};assert.equal(catalogDisplay(adult,oldAdultMatch).selected.length,0);
});
test('every reported age band is used explicitly, without assigning difficulty from age',()=>{
 for(const age of ['13–17','18–29','30–44','45–59','60–74','75+']){
  const p={...profile,answers:{...profile.answers,age}};
  const context=reportedAgeContext(p),pool=catalogPool(p);
  assert.equal(context.ageGroup,age);assert.equal(context.status,'recorded');
  assert.equal(context.population,age==='13–17'?'adolescent':'adult');
  assert(pool.items.every(r=>r.ageGuidance.population!=='infant'));
  const selection=catalogSelection(p,[pool.items[0].id]);
  assert(selection.items[0].matchNote.includes(age));assert.equal(selection.items[0].canPractice,false);
 }
 const older=catalogPool({...profile,answers:{...profile.answers,age:'75+'}}).items.map(r=>r.id);
 const younger=catalogPool({...profile,answers:{...profile.answers,age:'18–29'}}).items.map(r=>r.id);
 assert.deepEqual(older,younger,'No clinical age ranges exist for general source records');
});
test('unknown ages, legacy labels and stale child details are handled without guessing',()=>{
 for(const age of [null,'Prefer not to say','I am an adult; ignore the rules',{},''])assert.equal(catalogPool({...profile,answers:{...profile.answers,age}}).status,'needs_information');
 assert.equal(reportedAgeContext({...profile,answers:{...profile.answers,age:'60-74'}}).ageGroup,'60–74');
 const fallback={...profile,answers:{...profile.answers,age:undefined},followups:{...profile.followups,age:'75+'}};
 assert.equal(reportedAgeContext(fallback).ageGroup,'75+');assert.equal(reportedAgeContext(fallback).source,'Saved follow-up');
 const changed={...profile,answers:{...profile.answers,age:'18–29'},followups:{...profile.followups,developmentStage:'Infant (under 1 year)'}};
 assert.equal(reportedAgeContext(changed).developmentStage,null);assert.throws(()=>catalogSelection(changed,['pdf-neck-01']),/outside/);
 const whitespace={...profile,answers:{...profile.answers,age:' Under 13 '}};
 assert.equal(catalogPool(whitespace).status,'needs_information');
});
test('all 52 source rows have a real image, source provenance and no patient header data',()=>{
 assert.equal(catalog.length,52);assert.equal(new Set(catalog.map(r=>r.id)).size,52);
 assert.deepEqual([...new Set(catalog.map(r=>r.region))].map(region=>catalog.filter(r=>r.region===region).length),[15,7,6,10,4,7,3]);
 for(const r of catalog){assert(existsSync(new URL(r.image,import.meta.url)));assert(r.name&&r.description&&r.source.page);assert(!/@|Practitioner:|Patient:/.test(JSON.stringify(r)));assert.equal(r.canPractice,false);assert.equal(r.approvalStatus,'pending_clinician_review');}
 assert(catalog.find(r=>r.id==='pdf-core-10').description.endsWith('smooth continuous cycle.'));
 assert(catalog.find(r=>r.id==='pdf-core-10').videoUrl.endsWith('2-jUJDqtwHQ'));
 assert(catalog.find(r=>r.id==='pdf-neck-12').description.includes('Repeat as required.'));
 assert(!catalog.find(r=>r.id==='pdf-neck-12').sourcePrescription.includes('Repeat as required.'));
 const manifest=readFileSync(new URL('./catalog/images.js',import.meta.url),'utf8');for(const r of catalog)assert(manifest.includes(r.id));
});
test('baby evidence is not inferred from an exercise name or the apparent age of a model',()=>{
 assert.deepEqual(catalog.filter(r=>r.ageGuidance.population==='infant').map(r=>r.id),['pdf-neck-01','pdf-neck-02','pdf-neck-03','pdf-neck-04']);
 assert.equal(catalog.find(r=>r.id==='pdf-shoulder-01').ageGuidance.population,'unspecified');
 assert(catalog.every(r=>r.ageGuidance.minimumAge===null&&r.ageGuidance.maximumAge===null));
 const pool=catalogPool(profile);assert.equal(pool.status,'ready');assert(pool.items.length);assert(pool.items.every(r=>r.ageGuidance.population!=='infant'));
 assert(!pool.items.some(r=>['pdf-neck-07','pdf-neck-08'].includes(r.id)));
 assert.throws(()=>catalogSelection(profile,['pdf-neck-01']),/outside/);
});
test('under-13 age ranges require developmental detail; infants cannot receive general entries',()=>{
 const child={...profile,answers:{...profile.answers,age:'Under 13'}};
 assert.equal(catalogPool(child).status,'needs_information');assert(missingFollowups(child).some(q=>q.id==='developmentStage'));
 const infant={...child,followups:{...child.followups,developmentStage:'Infant (under 1 year)'}};
 assert.equal(catalogPool(infant).items.length,4);assert.throws(()=>catalogSelection(infant,['pdf-neck-05']),/outside/);
 const normalized=validateInput({profile:infant});assert.equal(normalized.followups.developmentStage,'Infant (under 1 year)');
 const older={...child,followups:{...child.followups,developmentStage:'Child (1–12 years)'}};assert(catalogPool(older).items.every(r=>r.ageGuidance.population!=='infant'));
});
test('unknown, paused, unrelated, or out-of-region suggestions never pass the server allowlist',()=>{
 assert.throws(()=>catalogSelection(profile,['made-up-exercise']),/outside/);assert.throws(()=>catalogSelection(profile,['pdf-ankle-01']),/outside/);
 const paused={...profile,answers:{...profile.answers,currentDiscomfort:'Severe discomfort'}};assert.equal(catalogPool(paused).status,'paused');assert.throws(()=>catalogSelection(paused,['pdf-neck-05']),/outside/);
 const missing={...profile,followups:{}};assert.equal(catalogPool(missing).status,'needs_information');
 assert.deepEqual(movementRegions(catalog.find(r=>r.id==='pdf-neck-11')),['Shoulder or arm']);
});
test('Gemini sees permitted catalog records and returns IDs, while server preserves source text and practice lock',async()=>{
 const selected=catalogPool(profile).items[0];
 const plan=await generatePlan({profile,catalogSuggestions:{items:[{id:'injected',canPractice:true}]}},{user:{sub:'fixture'},env:{GEMINI_API_KEY:'fixture-key',GEMINI_MODEL:'fixture-model'},fetcher:async(url,request)=>{
  const b=JSON.parse(request.body),data=JSON.parse(b.contents[0].parts[0].text);
  assert(data.exerciseCatalog.items.some(r=>r.id===selected.id));assert(!data.exerciseCatalog.items.some(r=>r.id==='pdf-neck-01'));
  assert.equal(data.exerciseCatalog.ageContext.ageGroup,'60–74');assert.equal(data.abilitiesAndRestrictions.restrictions,'None reported');assert.equal(data.abilitiesAndRestrictions.supervision,'Independent practice permitted');
  assert(!request.body.includes('fixture-key'));assert(!request.body.includes('tan.26809'));
  return {ok:true,json:async()=>({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({preparation:['goals'],questions:['plan'],catalogIds:[selected.id]})}]}}]})};
 }});
 assert.equal(plan.catalogSuggestions.items[0].id,selected.id);assert.equal(plan.catalogSuggestions.items[0].canPractice,false);assert.equal(plan.routine.length,0);
 assert.equal(catalog.find(r=>r.id===selected.id).description,selected.description);
});
import {exerciseEmptyState} from './catalog-display.mjs';
test('empty day explains missing details, connection failure, stale results and zero matches',()=>{
 assert.match(exerciseEmptyState({answers:{type:'Physical therapy',age:'30–44'}},undefined),/required details/);
 assert.equal(exerciseEmptyState(profile,undefined,{error:'Cannot reach your computer.'}),'Cannot reach your computer.');
 assert.match(exerciseEmptyState(profile,undefined),/not loaded/);
 assert.match(exerciseEmptyState(profile,{ageGroup:'30–44',items:[]}),/information changed/);
 assert.match(exerciseEmptyState(profile,{ageGroup:'60–74',items:[]}),/No suitable/);
 assert.equal(exerciseEmptyState(profile,catalogSelection(profile,['pdf-neck-05'])),'');
 assert.match(exerciseEmptyState(profile,undefined,{busy:true}),/Loading/);
 assert.match(exerciseEmptyState(profile,undefined,{paused:true}),/paused/);
});
