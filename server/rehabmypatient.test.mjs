import test from 'node:test';
import assert from 'node:assert/strict';
import {createRehabMyPatient} from './rehabmypatient.mjs';
import {generateChat} from './chat.mjs';
import {generatePlan} from './service.mjs';
const env={RMP_API_KEY:'fixture-provider-key',RMP_PATIENT_LINKS:JSON.stringify({'synthetic-demo':{patientId:'123',synthetic:true}}),AI_PROVIDER:'gemini',GEMINI_API_KEY:'fixture-gemini',GEMINI_MODEL:'fixture'};
const listing={plans:[{id:'7',patient_id:'123'},{id:'8',patient_id:'999'}]};
const detail={plan:{id:'7',patient_id:'123',notes:'PRIVATE NOTES',practitioner_name:'PRIVATE NAME'},exercises:[{name:'Fixture assigned exercise',desc:'Exact therapist wording. 3 sets. 12 repetitions.'}]};
const providerFetch=async(url,options)=>{
 assert.equal(options.method,'GET');assert.equal(options.redirect,'error');assert.equal(options.headers['RMP-API-KEY'],env.RMP_API_KEY);assert(!url.includes(env.RMP_API_KEY));
 assert(['/patientPlans/123','/patientPlan/7'].some(path=>url==='https://www.rehabmypatient.com/apiV2'+path));
 return {ok:true,text:async()=>JSON.stringify(url.endsWith('/patientPlan/7')?detail:listing)};
};
test('RMP reads only server-linked plans and preserves instructions without approval or media',async()=>{
 const context=await createRehabMyPatient({env,fetcher:providerFetch}).context({sub:'synthetic-demo',demo:true});
 assert.equal(context.status,'connected');assert.equal(context.plans.length,1);
 assert.equal(context.plans[0].exercises[0].instructions,detail.exercises[0].desc);
 assert(!JSON.stringify(context).includes('PRIVATE'));assert(!JSON.stringify(context).includes('patient_id'));
 assert.match(context.plans[0].approvalStatus,/not verified/);
});
test('unlinked users and unconfirmed demo mappings make no provider request',async()=>{
 const fetcher=()=>assert.fail('No account-wide fallback');
 assert.equal((await createRehabMyPatient({env,fetcher}).context({sub:'other'})).status,'not_linked');
 const settings={...env,RMP_PATIENT_LINKS:JSON.stringify({'synthetic-demo':{patientId:'123'}})};
 assert.equal((await createRehabMyPatient({env:settings,fetcher}).context({sub:'synthetic-demo',demo:true})).status,'not_linked');
});
test('wrong-patient detail and provider failures return no content',async()=>{
 for(const failure of ['mismatch','http']){
  const fetcher=async url=>({ok:failure!=='http',text:async()=>JSON.stringify(url.includes('patientPlans')?listing:{...detail,plan:{id:'7',patient_id:'999'}})});
  const result=await createRehabMyPatient({env,fetcher}).context({sub:'synthetic-demo',demo:true});assert.equal(result.status,'unavailable');assert.deepEqual(result.plans,[]);
 }
});
test('chat receives verified server context and no provider secret',async()=>{
 const rehab=createRehabMyPatient({env,fetcher:providerFetch});
 await generateChat({profile:{answers:{}},messages:[{role:'user',text:'What instructions were assigned?'}]}, {env,user:{sub:'synthetic-demo',demo:true},rehab,fetcher:async(_url,options)=>{
  assert(options.body.includes(detail.exercises[0].desc));assert(!options.body.includes(env.RMP_API_KEY));assert(!options.body.includes('PRIVATE NOTES'));
  return {ok:true,json:async()=>({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({scope:'therapy',reply:'Fixture response'})}]}}]})};
 }});
});
test('plan generator receives provider context but never converts imports into approved routine',async()=>{
 const rehab=createRehabMyPatient({env,fetcher:providerFetch});
 const plan=await generatePlan({profile:{answers:{type:'Physical therapy'}}},{env,user:{sub:'synthetic-demo',demo:true},rehab,fetcher:async(_url,options)=>{
  assert(options.body.includes(detail.exercises[0].desc));assert(!options.body.includes(env.RMP_API_KEY));
  return {ok:true,json:async()=>({candidates:[{finishReason:'STOP',content:{parts:[{text:'{"preparation":["gather"],"questions":["plan"]}'}]}}]})};
 }});
 assert.equal(plan.providerContext.status,'connected');assert.equal(plan.routine.length,0);assert.equal(plan.pending.length,0);
});
