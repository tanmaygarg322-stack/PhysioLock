import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {createDemoSessions,privateAddress} from './demo-session.mjs';
import {createHandler} from './index.mjs';
import {generateChat} from './chat.mjs';
test('stale local demo tokens request re-pairing while production still requires HTTPS',async()=>{
 for(const [demo,status,code] of [[createDemoSessions('new-server-code'),401,'demo_pairing_required'],[null,426,undefined]]){
  const server=http.createServer(createHandler({demo,env:{},auth:()=>assert.fail('Invalid HTTP requests must not authenticate')}));
  server.listen(0,'127.0.0.1');await once(server,'listening');
  try{
   const r=await fetch(`http://127.0.0.1:${server.address().port}/v1/plans/generate`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer previous-server-token'},body:JSON.stringify({consent:true,syntheticData:true})});
   assert.equal(r.status,status);assert.equal((await r.json()).code,code);
  }finally{server.close();server.closeAllConnections();}
 }
});
test('demo sessions require a code, private network, and expire',()=>{const sessions=createDemoSessions('test-pair-code');assert.equal(privateAddress('8.8.8.8'),false);assert.throws(()=>sessions.pair('test-pair-code','8.8.8.8'));assert.throws(()=>sessions.pair('wrong','127.0.0.1'));const paired=sessions.pair('test-pair-code','127.0.0.1');assert.equal(paired.syntheticOnly,true);assert.equal(sessions.authenticate('Bearer '+paired.token,'127.0.0.1').sub,'synthetic-demo');assert.equal(sessions.authenticate('Bearer '+paired.token,'8.8.8.8'),null);assert.equal(sessions.authenticate('Bearer made-up','127.0.0.1'),null);});
test('paired local requests must confirm fictional data and cannot access clinical adapter',async()=>{const demo=createDemoSessions('fixture-code');let called=false;const server=http.createServer(createHandler({demo,generate:async(_,{user,adapter})=>{called=true;assert.equal(user.demo,true);assert.equal(adapter,null);return {version:1};},adapter:{retrieve:()=>assert.fail('No clinical data in demo')}}));server.listen(0,'127.0.0.1');await once(server,'listening');const base=`http://127.0.0.1:${server.address().port}`;try{let r=await fetch(base+'/v1/demo/pair',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:'fixture-code',syntheticData:true})});assert.equal(r.status,200);const {token}=await r.json();r=await fetch(base+'/v1/plans/generate',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({consent:true})});assert.equal(r.status,400);r=await fetch(base+'/v1/plans/generate',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({consent:true,syntheticData:true})});assert.equal(r.status,200);assert.equal(called,true);}finally{server.close();server.closeAllConnections();}});
test('chat sends actual conversation to Gemini without provider key in URL',async()=>{const output=await generateChat({profile:{answers:{type:'Physical therapy',ptGoals:['Return to an activity I enjoy']}},messages:[{role:'user',text:'How can I organize my goals?'}]},{env:{GEMINI_API_KEY:'test-key',GEMINI_MODEL:'test-model'},fetcher:async(url,request)=>{assert(!url.includes('test-key'));const body=JSON.parse(request.body);assert.equal(body.contents[0].parts[0].text,'How can I organize my goals?');assert(body.systemInstruction.parts[0].text.includes('Return to an activity I enjoy'));return {ok:true,json:async()=>({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({scope:'therapy',reply:'A synthetic model reply.'})}]}}]})};}});assert.equal(output.reply,'A synthetic model reply.');});
