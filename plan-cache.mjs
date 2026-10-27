import {assemblePlan} from './plan-engine.mjs';
function canonical(value){if(Array.isArray(value))return value.map(canonical);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])]));return value;}
export function selectionFingerprint(profile){
 const answers=Object.fromEntries(Object.entries(profile?.answers||{}).filter(([key])=>!['days','name'].includes(key)&&!key.startsWith('hour-')&&!key.startsWith('duration-')));
 const followups={...(profile?.followups||{})};delete followups.sessionLength;
 return JSON.stringify(canonical({answers,followups}));
}
export function restorePlan(profile,saved){
 const records=[...(saved?.plan?.routine||[]),...(saved?.plan?.pending||[])];
 const local=assemblePlan(profile,{records,integrationStatus:saved?.plan?.integrationStatus});
 if(!saved?.plan)return local;
 let oldProfile;try{oldProfile=JSON.parse(saved.profileFingerprint);}catch{return local;}
 if(selectionFingerprint(oldProfile)!==selectionFingerprint(profile))return local;
 // Refresh schedule and safety from current answers; retain verified selections only
 // when all activity-relevant answers are unchanged.
 return {...local,catalogSuggestions:saved.plan.catalogSuggestions,providerContext:saved.plan.providerContext,mode:saved.plan.mode};
}
