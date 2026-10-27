import test from 'node:test';
import assert from 'node:assert/strict';
import {generateChat} from './chat.mjs';
import {OFF_TOPIC_REPLY,parseChatReply} from './chat-policy.mjs';
test('out-of-scope responses always use the standard message and discard unrelated content',()=>{assert.equal(parseChatReply(JSON.stringify({scope:'out_of_scope',reply:'unrelated generated answer'})),OFF_TOPIC_REPLY);assert.throws(()=>parseChatReply('plain reply'));assert.throws(()=>parseChatReply(JSON.stringify({scope:'unknown',reply:'test'})));});
test('chat can explain verified descriptions without treating missing clearance as permission to practice',async()=>{
 const result=await generateChat({profile:{answers:{type:'Physical therapy',age:'30–44'}},messages:[{role:'user',text:'Explain Rock the Baby'}]},{env:{GEMINI_API_KEY:'test',GEMINI_MODEL:'test'},fetcher:async(url,request)=>{const body=JSON.parse(request.body);assert.equal(body.generationConfig.responseMimeType,'application/json');const prompt=body.systemInstruction.parts[0].text;assert.match(prompt,/referenceExercises/);assert.match(prompt,/Rock the Baby/);assert.match(prompt,/do not guide practice/);assert.match(prompt,/out_of_scope/);return {ok:true,json:async()=>({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({scope:'therapy',reply:'Source explanation for discussion with your clinician.'})}]}}]})};}});assert.match(result.reply,/Source explanation/);
});
